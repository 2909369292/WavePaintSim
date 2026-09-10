// js/sim/rtl-nav.js —— RTL 结构树数据源（#75 P0）
// ----------------------------------------------------------------
// 职责：
//   1. 复用 engine.parseVerilogDesign() 的 module/port/parameter/instance 解析结果；
//   2. 为每个树节点定位「所在文件 + 行号」，供代码视图跳转。
// 关键约束：
//   · 不改动 engine.js（仿真链路最易碎区，能不动就不动）；
//   · 行号以「原始文件文本」为准（注释被抹成等长空格，行号不漂移），
//     因此 CodeMirror 显示的行号与跳转目标严格一致；
//   · 纯函数、无 DOM 依赖，可在 regression.mjs 中直接单测。
import { parseVerilogDesign } from "./engine.js";

// 抹掉注释但保留所有换行：//… 换成等长空格（不含 \n），/*…*/ 换行保留、其余换成空格。
// 这样后续所有 regex 行号计算都基于与原文同行的文本。
export function blankComments(source) {
  return String(source || "")
    .replace(/\/\/[^\r\n]*/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\r\n]/g, " "));
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 从 from 开始找第一个匹配，返回原文下标（找不到 -1）
function searchFrom(source, from, re) {
  re.lastIndex = Math.max(0, Number(from) || 0);
  const match = re.exec(source);
  return match ? match.index : -1;
}

// 1-based 行号（index 是原文下标）
function lineNumberOf(source, index) {
  if (index < 0) return -1;
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

// 在 [from, to) 范围内找第一个匹配下标；超界或未命中返回 -1
function findInRange(source, from, to, re) {
  re.lastIndex = Math.max(0, from);
  const match = re.exec(source);
  if (!match) return -1;
  if (match.index >= to) return -1;
  return match.index;
}

function rangeLabel(msb, lsb, width) {
  const m = String(msb || "");
  const l = String(lsb || "");
  if (m && l && m !== l) return `[${m}:${l}]`;
  const w = Math.max(1, Number(width) || 1);
  return w > 1 ? `[${w - 1}:0]` : "";
}

// ---------------------------------------------------------------------------
// #86 A1：实例化语句扫描（源码级导航专用，与 engine.parseInstances 相互补充）
// ---------------------------------------------------------------------------
// 为什么另写一份、而不是直接用 engine.parseInstances：
//   · engine.parseInstances 走 `([^;]*?)` 的懒匹配，遇到「一条语句例化多个实例」
//     （`sub u1(a), u2(b);`）会把 u2 吞进 u1 的连接表里 → 只认出一个实例；
//   · 它的正则要求「模块名 + 实例名」之间必须有空白，`mod#(.P(1)) u(…)` 这类
//     参数覆盖紧贴模块名的写法识别不到；
//   · 行号靠「模块内首次出现该标识符」的启发式推断（locateLine），当实例名与
//     某个信号/端口同名时会定位到错误的行。
// 本扫描器按字符流做平衡括号匹配，实例名/语句位置都取自真实下标 → 行号精确；
// 覆盖参数化例化、命名/位置端口连接、generate 内例化、多实例同语句。
// ⚠ 引擎侧（仿真链路）口径保持不变，这里只服务于 RTL 结构树与「实例→定义」跳转。

// 不可能作为「被例化模块名」的关键字：语句关键字 + 声明/类型关键字 + 门原语。
const MODULE_NAME_KEYWORDS = new Set([
  // 语句 / 过程块
  "if", "else", "for", "while", "repeat", "forever", "do", "case", "casex", "casez", "endcase",
  "begin", "end", "fork", "join", "join_any", "join_none", "always", "always_comb", "always_ff",
  "always_latch", "initial", "final", "assign", "deassign", "force", "release", "wait", "disable",
  "return", "break", "continue", "generate", "endgenerate", "genvar", "defparam", "specify",
  "endspecify", "table", "endtable", "modport", "clocking", "endclocking", "default",
  // 声明 / 类型
  "module", "endmodule", "macromodule", "primitive", "endprimitive", "package", "endpackage",
  "class", "endclass", "interface", "endinterface", "program", "endprogram", "checker",
  "function", "endfunction", "task", "endtask", "typedef", "import", "export", "extends",
  "implements", "const", "localparam", "parameter", "specparam", "input", "output", "inout",
  "wire", "reg", "logic", "bit", "byte", "shortint", "int", "longint", "integer", "real",
  "shortreal", "realtime", "time", "string", "chandle", "event", "struct", "union", "enum",
  "packed", "signed", "unsigned", "void", "var", "static", "automatic", "virtual", "pure",
  "extern", "rand", "randc", "constraint", "covergroup", "endcovergroup", "coverpoint",
  "property", "endproperty", "sequence", "endsequence", "assert", "assume", "cover", "expect",
  "alias", "let", "nettype", "interconnect", "type", "ref", "new", "super", "this", "null",
  "unique", "unique0", "priority", "inside", "with", "matches", "tagged",
  // 门 / 开关原语（属于例化语法，但不是「模块定义」语义，导航上排除）
  "and", "or", "nand", "nor", "xor", "xnor", "not", "buf", "bufif0", "bufif1", "notif0",
  "notif1", "nmos", "pmos", "cmos", "rnmos", "rpmos", "rcmos", "tran", "rtran", "tranif0",
  "tranif1", "rtranif0", "rtranif1", "pullup", "pulldown", "supply0", "supply1", "tri",
  "triand", "trior", "tri0", "tri1", "trireg", "uwire", "wand", "wor", "wire"
]);

// 时间单位 / 边沿等修饰字（出现则不是模块名）
const MODULE_NAME_KEYWORDS_EXTRA = new Set(["posedge", "negedge", "edge", "scalared", "vectored", "timeunit", "timeprecision"]);

function isReservedName(name) {
  const n = String(name || "").toLowerCase();
  return MODULE_NAME_KEYWORDS.has(n) || MODULE_NAME_KEYWORDS_EXTRA.has(n);
}

// 把字符串字面量内容替换成等长空格（保留引号与换行）：长度不变 → 下标/行号不漂移，
// 同时避免字符串里的 `(`、`mod u(1);` 之类文本干扰实例扫描。
export function maskStrings(source) {
  const text = String(source || "");
  let out = "";
  let index = 0;
  while (index < text.length) {
    if (text[index] !== '"') {
      out += text[index];
      index += 1;
      continue;
    }
    let scan = index + 1;
    let closed = false;
    while (scan < text.length) {
      if (text[scan] === "\\") { scan += 2; continue; }
      if (text[scan] === '"') { closed = true; break; }
      if (text[scan] === "\n") break;
      scan += 1;
    }
    const end = closed ? scan + 1 : scan;   // 未闭合的字符串只抹到行尾（换行本身留给下一轮原样输出）
    const inner = Math.max(0, scan - index - 1);
    out += '"' + " ".repeat(inner) + (closed ? '"' : "");
    index = end;
  }
  return out;
}

function readIdentifier(text, index) {
  const match = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(text.slice(index, index + 256));
  if (!match) return null;
  return { name: match[0], start: index, end: index + match[0].length };
}

function skipWhitespace(text, index) {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

// 返回与 openIndex（必须指向 '('）配对的 ')' 下标；未闭合返回 -1。
function matchParen(text, openIndex) {
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

function parseConnectionList(text) {
  const connections = [];
  let depth = 0;
  let current = "";
  const push = () => {
    const item = current.trim();
    current = "";
    if (!item) return;
    const named = /^\.([A-Za-z_][A-Za-z0-9_$]*)\s*\(\s*([\s\S]*?)\s*\)$/.exec(item);
    if (named) connections.push({ port: named[1], signal: named[2].trim(), type: "named" });
    else connections.push({ port: "", signal: item, type: "ordered" });
  };
  for (const ch of String(text || "")) {
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) { push(); continue; }
    current += ch;
  }
  push();
  return connections;
}

// 解析「实例名 (端口列表)」，成功返回 { instanceName, connectionText, nameStart, end }。
function parseInstanceTail(text, index, limit) {
  const nameStart = skipWhitespace(text, index);
  const name = readIdentifier(text, nameStart);
  if (!name) return null;
  if (isReservedName(name.name)) return null;
  const open = skipWhitespace(text, name.end);
  if (text[open] !== "(") return null;          // 实例名后必须紧跟端口列表
  if (open > limit) return null;
  const close = matchParen(text, open);
  if (close < 0 || close > limit) return null;
  return {
    instanceName: name.name,
    connectionText: text.slice(open + 1, close),
    nameStart,
    end: close + 1
  };
}

// 从 start（指向模块名标识符）尝试解析一条实例化语句。
// 成功返回 { moduleName, parameterOverride, items:[{instanceName,connectionText,nameStart}], end }。
function tryParseInstantiation(text, start, limit) {
  const moduleIdent = readIdentifier(text, start);
  if (!moduleIdent) return null;
  const prev = start > 0 ? text[start - 1] : "";
  // 排除：成员访问 a.b、系统任务 $display、宏 `MY_MOD、作用域 pkg::mod
  if (prev === "." || prev === "$" || prev === "`" || prev === ":") return null;
  if (isReservedName(moduleIdent.name)) return null;

  let cursor = moduleIdent.end;
  const afterModule = skipWhitespace(text, cursor);
  let parameterOverride = "";
  if (text[afterModule] === "#") {
    const open = skipWhitespace(text, afterModule + 1);
    if (text[open] !== "(") return null;
    const close = matchParen(text, open);
    if (close < 0 || close > limit) return null;
    parameterOverride = text.slice(afterModule, close + 1);
    cursor = close + 1;
  } else {
    if (afterModule === cursor) return null;    // 模块名与实例名之间必须有空白
    cursor = afterModule;
  }

  const items = [];
  let tail = parseInstanceTail(text, cursor, limit);
  if (!tail) return null;
  for (;;) {
    items.push({ instanceName: tail.instanceName, connectionText: tail.connectionText, nameStart: tail.nameStart });
    let after = skipWhitespace(text, tail.end);
    if (text[after] !== ",") { cursor = after; break; }
    // 多实例同语句：`sub u1(a), u2(b), u3(c);`
    const next = parseInstanceTail(text, after + 1, limit);
    if (!next) { cursor = after; break; }
    tail = next;
  }
  // 语句必须以 `;` 收尾（避免把 `a b(...)` 这种非法/其它语义片段误判为实例）
  if (text[cursor] !== ";") return null;
  return { moduleName: moduleIdent.name, parameterOverride, items, end: cursor + 1 };
}

// 扫描 [from, to) 区间内全部实例化语句；返回按出现顺序排列的条目数组。
export function scanInstances(text, from, to, lineOf) {
  const limit = Math.min(Number(to) || text.length, text.length);
  const out = [];
  let i = Math.max(0, Number(from) || 0);
  while (i < limit) {
    const ident = readIdentifier(text, i);
    if (!ident) { i += 1; continue; }
    const parsed = tryParseInstantiation(text, ident.start, limit);
    if (!parsed) { i = ident.end; continue; }
    for (const item of parsed.items) {
      out.push({
        moduleName: parsed.moduleName,
        instanceName: item.instanceName,
        parameterOverride: parsed.parameterOverride,
        connections: parseConnectionList(item.connectionText),
        line: typeof lineOf === "function" ? lineOf(item.nameStart) : -1
      });
    }
    i = Math.max(parsed.end, ident.end);
  }
  return out;
}

// 合并「扫描器结果」与「engine 解析结果」：扫描器结果优先（行号精确、覆盖多实例），
// engine 结果兜底（语法更奇怪时至少不丢信息）。key = moduleName|instanceName。
function mergeInstances(scanned, fromEngine) {
  const byKey = new Map();
  const normalize = (entry) => ({
    moduleName: String(entry?.moduleName || ""),
    instanceName: String(entry?.instanceName || ""),
    parameterOverride: String(entry?.parameterOverride || ""),
    connections: Array.isArray(entry?.connections) ? entry.connections : [],
    line: Number(entry?.line) || -1
  });
  for (const entry of scanned) {
    const item = normalize(entry);
    const key = `${item.moduleName.toLowerCase()}|${item.instanceName}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  for (const entry of fromEngine) {
    const item = normalize(entry);
    const key = `${item.moduleName.toLowerCase()}|${item.instanceName}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()].sort((a, b) => (a.line - b.line) || a.instanceName.localeCompare(b.instanceName));
}

// ---------------------------------------------------------------------------
// #76 B1：模块体内符号索引（点代码变量 → 波形 / 双向跳转的底座）
// ---------------------------------------------------------------------------
// buildRtlNav 原先只覆盖「模块头（端口/参数）+ 实例」；这里补上**模块体内声明**：
//   reg / wire / logic / bit / int / integer / time / real / genvar / tri … 数据声明、
//   非 ANSI 写法下的 input/output/inout 方向声明、体内 parameter/localparam，
//   外加「实例名」本身 —— 每条都带**精确行号 + 位宽区间**。
// 安全口径与实例扫描完全一致：注释先抹白 → 字符串内容抹成等长空格 →
// function/task/specify/table 块整体抹白（块内局部变量不属于模块作用域，
// 且这类块里 `input a` 是子程序形参、不是模块端口）；行号一律用**原文**下标计算，
// 因此与 CodeMirror 显示的行号严格一致。
// 已知边界（有意为之，避免过度解析）：不索引 assign 产生的隐式 net、
// 不索引用户自定义类型声明的变量、不索引嵌套块（named begin）内的局部变量。
const DATA_DECL_KEYWORDS = [
  "wire", "reg", "logic", "bit", "byte", "shortint", "longint", "integer", "int", "time",
  "real", "shortreal", "realtime", "genvar", "var", "tri", "tri0", "tri1", "triand", "trior",
  "trireg", "wand", "wor", "supply0", "supply1", "uwire"
];

// 无显式位宽时的隐含位宽（对齐 Verilog/SV 语义；未列出的默认 1 位）
const IMPLICIT_WIDTHS = { integer: 32, int: 32, time: 64, longint: 64, shortint: 16, byte: 8, real: 64, realtime: 64, shortreal: 32 };

// 声明语句里「关键字之后还可能继续出现」的类型词（`input wire signed [7:0] b`）
const DECL_TYPE_WORDS = new Set([...DATA_DECL_KEYWORDS, "input", "output", "inout", "signed", "unsigned"]);

const DECL_SCAN_KEYWORDS = [...DATA_DECL_KEYWORDS, "input", "output", "inout", "parameter", "localparam"];

// 子程序/约束块整体抹白（等长、保留换行 → 行号不漂移）
function blankInnerScopes(text) {
  return String(text || "").replace(
    /\b(?:function|task|specify|table)\b[\s\S]*?\b(?:endfunction|endtask|endspecify|endtable)\b/g,
    (block) => block.replace(/[^\r\n]/g, " ")
  );
}

// `[7:0]` / `[WIDTH-1:0]` / `[3]` → { msb, lsb, width, range }；width=0 表示「位宽不可静态求值」
function declRangeInfo(rangeText) {
  const text = String(rangeText || "").trim();
  if (!text) return { msb: "", lsb: "", width: 0, range: "" };
  const inner = text.replace(/^\[/, "").replace(/\]$/, "");
  const parts = inner.split(":");
  const msb = String(parts[0] || "").trim();
  const lsb = String(parts[1] || "").trim();
  let width = 0;
  if (/^\d+$/.test(msb) && /^\d+$/.test(lsb)) width = Math.abs(Number(msb) - Number(lsb)) + 1;
  else if (/^\d+$/.test(msb) && !parts[1]) width = Number(msb) + 1;
  return { msb, lsb, width, range: text };
}

// 从 from 起找深度 0 的 `;`（括号/方括号/花括号内的分号不算）
function findStatementEnd(text, from, limit) {
  let depth = 0;
  for (let i = Math.max(0, from); i < limit; i += 1) {
    const ch = text[i];
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) return i;
  }
  return -1;
}

// 逗号切分声明列表（括号/方括号/花括号内的逗号不算：`wire [1:0] a, b` 与 `#(.P(1))` 都安全）
function splitDeclItems(listText) {
  const items = [];
  let depth = 0;
  let current = "";
  for (const ch of String(listText || "")) {
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) { items.push(current); current = ""; continue; }
    current += ch;
  }
  items.push(current);
  return items.map((item) => item.trim()).filter(Boolean);
}

// 单个声明项 → { name, ownRange, value }
// `a` / `a = 1` / `[3:0] b` / `[3:0] b = 2` / `y[0]`（数组/位选）都能取出主标识符
function declItemInfo(item) {
  const text = String(item || "").trim();
  if (!text) return null;
  let ownRange = "";
  const rangeMatch = /^(\[[^\]]*\])\s*/.exec(text);
  let rest = text;
  if (rangeMatch) {
    ownRange = rangeMatch[1];
    rest = text.slice(rangeMatch[0].length).trim();
  }
  const eqIndex = rest.indexOf("=");
  const head = eqIndex >= 0 ? rest.slice(0, eqIndex) : rest;
  const value = eqIndex >= 0 ? rest.slice(eqIndex + 1).trim() : "";
  const nameMatch = /[A-Za-z_][A-Za-z0-9_$]*/.exec(head);
  if (!nameMatch) return null;
  return { name: nameMatch[0], ownRange, value };
}

// 解析一条声明语句：返回 { names:[{name,ownRange,value}], rangeText, end }
// 失败返回 null（调用方只需把扫描指针推进到关键字之后）。
function readDeclStatement(text, afterKeyword, limit) {
  let cursor = afterKeyword;
  // `parameter type T = logic;` 是类型参数，不是信号符号 → 直接放弃
  if (/^\s*type\b/.test(text.slice(cursor, cursor + 8))) return null;
  // 吞掉后续类型词/符号修饰词：`input wire signed [7:0] b`
  for (let guard = 0; guard < 8; guard += 1) {
    const wordMatch = /^\s*([A-Za-z_][A-Za-z0-9_$]*)/.exec(text.slice(cursor, cursor + 64));
    if (!wordMatch) break;
    if (!DECL_TYPE_WORDS.has(wordMatch[1].toLowerCase())) break;
    cursor += wordMatch[0].length;
  }
  let rangeText = "";
  const rangeMatch = /^\s*(\[[^\[\]]*\])/.exec(text.slice(cursor, cursor + 160));
  if (rangeMatch) {
    rangeText = rangeMatch[1];
    cursor += rangeMatch[0].length;
  }
  const end = findStatementEnd(text, cursor, limit);
  if (end < 0) return null;
  const names = splitDeclItems(text.slice(cursor, end)).map(declItemInfo).filter(Boolean);
  if (!names.length) return null;
  return { names, rangeText, end };
}

// 扫描模块体内的声明符号。content = 原文（只用于算行号）；blanked = 注释抹白后的文本；
// [from, to) = 模块体区间（headerEnd+1 → endmodule）。
export function scanModuleSymbols(content, blanked, from, to) {
  const text = blankInnerScopes(maskStrings(blanked));
  const limit = Math.min(Number(to) || text.length, text.length);
  const out = [];
  const re = new RegExp(`\\b(${DECL_SCAN_KEYWORDS.join("|")})\\b`, "g");
  re.lastIndex = Math.max(0, Number(from) || 0);
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index >= limit) break;
    const start = match.index;
    const keyword = match[1].toLowerCase();
    const prev = start > 0 ? text[start - 1] : "";
    // 排除成员访问 `.wire(...)`、系统任务 `$time`、宏 `` `logic ``
    if (prev === "." || prev === "$" || prev === "`") continue;
    const decl = readDeclStatement(text, re.lastIndex, limit);
    if (!decl) continue;
    const base = declRangeInfo(decl.rangeText);
    const direction = (keyword === "input" || keyword === "output" || keyword === "inout") ? keyword : "";
    const kind = direction ? "port" : keyword;
    for (const item of decl.names) {
      const info = item.ownRange ? declRangeInfo(item.ownRange) : base;
      const implicit = IMPLICIT_WIDTHS[keyword] || 1;
      out.push({
        name: item.name,
        kind,
        direction,
        width: Math.max(1, info.width || implicit),
        msb: info.msb,
        lsb: info.lsb,
        range: info.range,
        value: item.value || "",
        line: lineNumberOf(content, start)
      });
    }
    re.lastIndex = decl.end + 1;   // 跳过整条语句，避免把 `input wire …` 里的 wire 再算一遍
  }
  return out;
}

// 合并多组符号：同名同行只留优先级最高的一条，最后按行号排序（稳定的 sort 保证同一行内
// 仍是「端口 → 体内声明 → 模块头参数 → 实例名」的相对顺序），于是 symbols 就是代码顺序。
// 组序说明：体内声明排在模块头参数之前 —— 头部 parameter 只可能出现在头部区间、体内扫描
// 只覆盖 `headerEnd+1 → endmodule`，两者本不重叠；唯一重叠的是「体内 localparam」，
// 此时体内扫描读到的关键字更准确（localparam ≠ parameter），所以让它优先。
function mergeSymbols(groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const symbol of (Array.isArray(group) ? group : [])) {
      const key = `${symbol.name}|${symbol.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(symbol);
    }
  }
  return out.sort((a, b) => (Number(a.line) || 0) - (Number(b.line) || 0));
}

// ---------------------------------------------------------------------------
// #86 A1：模块定义索引（实例 → 模块定义源码跳转的查表底座）
// ---------------------------------------------------------------------------
// buildRtlNav 的输出是「按文件顺序的模块列表」，这里再压平成「模块名 → 定义候选」，
// 供交互层回答三件事：
//   · 这个模块名有没有源码定义？（黑盒/外部模块 → 无候选）
//   · 有几处定义？（多文件同名模块 → 歧义，需要让用户感知）
//   · 该跳哪一个？（优先同文件，其次第一个；大小写不完全一致时用 fuzzy 标记）
export function collectModuleDefs(modules) {
  return (Array.isArray(modules) ? modules : []).map((mod) => ({
    name: String(mod?.name || ""),
    file: String(mod?.file || ""),
    fileIndex: Number(mod?.fileIndex) || 0,
    line: Math.max(1, Number(mod?.moduleLine) || 1),
    portCount: Number(mod?.portCount) || 0,
    parameterCount: Array.isArray(mod?.parameters) ? mod.parameters.length : 0,
    instanceCount: Number(mod?.instanceCount) || 0
  })).filter((def) => !!def.name);
}

export function findModuleDefCandidates(defs, moduleName) {
  const list = Array.isArray(defs) ? defs : [];
  const name = String(moduleName || "").trim();
  if (!name) return { candidates: [], fuzzy: false };
  const exact = list.filter((def) => def.name === name);
  if (exact.length) return { candidates: exact, fuzzy: false };
  const lower = name.toLowerCase();
  const insensitive = list.filter((def) => def.name.toLowerCase() === lower);
  return { candidates: insensitive, fuzzy: insensitive.length > 0 };
}

// preferFileIndex：例化点所在文件下标 —— 同名模块多处定义时优先同文件（最常见且最符合直觉）。
export function resolveModuleDef(defs, moduleName, preferFileIndex) {
  const { candidates, fuzzy } = findModuleDefCandidates(defs, moduleName);
  if (!candidates.length) return { def: null, candidates: [], fuzzy: false };
  const preferred = Number.isFinite(Number(preferFileIndex))
    ? candidates.filter((def) => def.fileIndex === Number(preferFileIndex))
    : [];
  const pool = preferred.length ? preferred : candidates;
  return { def: pool[0], candidates, fuzzy };
}

// 定位模块内某个「声明元素」的行号。
// kind: "module" | "port" | "parameter" | "instance"
function locateLine(blanked, content, moduleStart, headerEnd, moduleEnd, kind, name, extra) {
  const word = escapeRegExp(name);
  const firstOccurrence = (from, to) => findInRange(blanked, from, to, new RegExp(`\\b${word}\\b`, "g"));
  if (kind === "module") return lineNumberOf(content, moduleStart);

  if (kind === "port") {
    const direction = String(extra || "").toLowerCase();
    // 1) ANSI 头部端口列表：列表内该端口名的首次出现即其声明位置。
    //    「列表开括号」= 头部最后一个 '('（参数块之后的那一个，通常是模块头收尾的 `(`）。
    //    注释已抹成等长空格，行号与原文逐行一致；每行一个方向关键字时逐行精确命中，
    //    共享方向的多端口列表（`input a, b`）也各自落在自己的行。
    const listOpen = blanked.lastIndexOf("(", headerEnd - 1);
    if (listOpen >= moduleStart) {
      const interior = blanked.slice(listOpen + 1, headerEnd);
      if (/\b(?:input|output|inout)\b/i.test(interior)) {
        const listHit = findInRange(blanked, listOpen + 1, headerEnd, new RegExp(`\\b${word}\\b`, "g"));
        if (listHit >= 0) return lineNumberOf(content, listHit);
      }
    }
    // 2) 非 ANSI：方向关键字与该端口名出现在同一声明行（`input … name;`）
    const dirRe = new RegExp(`\\b${escapeRegExp(direction)}\\b[^\\r\\n]{0,200}\\b${word}\\b`);
    const dirHit = findInRange(blanked, moduleStart, moduleEnd, dirRe);
    if (dirHit >= 0) return lineNumberOf(content, dirHit);
    // 3) 头部端口列表区兜底
    const headerHit = firstOccurrence(moduleStart, headerEnd);
    if (headerHit >= 0) return lineNumberOf(content, headerHit);
    // 4) 兜底：模块内首次出现
    const anyHit = firstOccurrence(moduleStart, moduleEnd);
    return lineNumberOf(content, anyHit);
  }

  if (kind === "parameter") {
    // 1) 头部 #(parameter WIDTH = 8, …) 内出现
    const headerHit = firstOccurrence(moduleStart, headerEnd);
    if (headerHit >= 0) return lineNumberOf(content, headerHit);
    // 2) 模块体 parameter/localparam 声明行
    const bodyRe = new RegExp(`\\b(?:parameter|localparam)\\b[^;\\r\\n]{0,200}\\b${word}\\b`);
    const bodyHit = findInRange(blanked, headerEnd + 1, moduleEnd, bodyRe);
    if (bodyHit >= 0) return lineNumberOf(content, bodyHit);
    const anyHit = firstOccurrence(moduleStart, moduleEnd);
    return lineNumberOf(content, anyHit);
  }

  if (kind === "instance") {
    // 实例化点：`<instanceName> (…);`（排除端口声明/信号使用等其它同名出现）
    const instRe = new RegExp(`\\b${word}\\b\\s*\\(`);
    const hit = findInRange(blanked, headerEnd + 1, moduleEnd, instRe);
    if (hit >= 0) return lineNumberOf(content, hit);
    const anyHit = firstOccurrence(moduleStart, moduleEnd);
    return lineNumberOf(content, anyHit);
  }

  return -1;
}

// 汇总多文件工程的 RTL 结构索引：
//   files: [{ name, content }]
// 返回按文件顺序排列的模块列表，每个模块带 ports/parameters/instances 的行号。
export function buildRtlNav(files) {
  const result = [];
  (Array.isArray(files) ? files : []).forEach((file, fileIndex) => {
    const content = String(file?.content || "");
    if (!content.trim()) return;
    const blanked = blankComments(content);
    let design;
    try {
      design = parseVerilogDesign(content);
    } catch (error) {
      // 单文件解析失败不阻断整个树：其余文件仍可展示
      design = { modules: [] };
    }
    for (const mod of design.modules || []) {
      const moduleRe = new RegExp(`\\bmodule\\s+${escapeRegExp(mod.name)}\\b`);
      const moduleStart = searchFrom(blanked, 0, moduleRe);
      if (moduleStart < 0) continue;
      const headerEnd = searchFrom(blanked, moduleStart, /[;]/);
      const moduleEnd = searchFrom(blanked, moduleStart, /\bendmodule\b/);
      if (headerEnd < 0 || moduleEnd < 0) continue;
      const ports = (mod.ports || []).map((port) => ({
        direction: port.direction,
        name: port.name,
        width: Math.max(1, Number(port.width) || 1),
        msb: port.msb,
        lsb: port.lsb,
        range: rangeLabel(port.msb, port.lsb, port.width),
        line: locateLine(blanked, content, moduleStart, headerEnd, moduleEnd, "port", port.name, port.direction)
      }));
      const parameters = (mod.paramDefs || []).map((param) => ({
        name: param.name,
        value: String(param.value || ""),
        line: locateLine(blanked, content, moduleStart, headerEnd, moduleEnd, "parameter", param.name)
      }));
      // #86 A1：实例化识别以「源码扫描器」为主（行号取自真实下标；覆盖参数化例化
      // `#(.p(v))`、命名/位置端口连接、generate 内例化、多实例同语句
      // `sub u1(a), u2(b);`），engine 的解析结果仅作兜底（写法更冷门时至少不丢实例）。
      // 字符串字面量先抹成等长空格，避免 `$display("mod u(x);")` 之类的文本误判。
      const masked = maskStrings(blanked);
      const scanned = scanInstances(masked, headerEnd + 1, moduleEnd, (i) => lineNumberOf(content, i));
      // 引擎兜底条目要过两道闸，才允许补进结果：
      //   ① 关键字过滤 —— engine.parseInstances 的正则会把门/开关原语（`and g1 (o,a,b);`）
      //      当成模块例化，导航上应排除；
      //   ② 抹白文本里必须真的存在 `<instanceName> (` —— engine 是在**原始文本**上跑正则的，
      //      字符串字面量里的 `"mod u(x);"` 也会被它当成例化；扫描器用的是抹白后的文本，
      //      因此以抹白文本做「真实性」判定，字符串里的假例化会被这一步挡掉。
      const fromEngine = (mod.instances || [])
        .filter((inst) => !isReservedName(inst.moduleName))
        .filter((inst) => {
          const name = String(inst?.instanceName || "");
          if (!name) return false;
          const re = new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`, "g");
          return findInRange(masked, headerEnd + 1, moduleEnd, re) >= 0;
        })
        .map((inst) => ({
          moduleName: inst.moduleName,
          instanceName: inst.instanceName,
          parameterOverride: "",
          connections: [],
          line: locateLine(blanked, content, moduleStart, headerEnd, moduleEnd, "instance", inst.instanceName)
        }));
      const instances = mergeInstances(scanned, fromEngine);
      // #76 B1：模块体内符号索引 —— 模块头端口/参数 + 体内声明 + 实例名，
      // 每条带精确行号与位宽，供「代码点变量加波形 / 双向跳转」查表。
      // 只读计算，不改变 ports/parameters/instances 的既有语义（RTL 树仍只渲染层级）。
      const portSymbols = ports.map((port) => ({
          name: port.name,
          kind: "port",
          direction: String(port.direction || "").toLowerCase(),
          width: port.width,
          msb: String(port.msb ?? ""),
          lsb: String(port.lsb ?? ""),
          range: port.range,
          value: "",
          line: port.line
        }));
      const parameterSymbols = parameters.map((param) => ({
          name: param.name,
          kind: "parameter",
          direction: "",
          width: 1,
          msb: "",
          lsb: "",
          range: "",
          value: String(param.value || ""),
          line: param.line
        }));
      const bodySymbols = scanModuleSymbols(content, blanked, headerEnd + 1, moduleEnd);
      const instanceSymbols = instances.map((inst) => ({
        name: inst.instanceName,
        kind: "instance",
        direction: "",
        width: 1,
        msb: "",
        lsb: "",
        range: "",
        value: "",
        line: inst.line,
        moduleName: inst.moduleName
      }));
      const symbols = mergeSymbols([portSymbols, bodySymbols, parameterSymbols, instanceSymbols]);
      result.push({
        file: file.name,
        fileIndex,
        name: mod.name,
        moduleLine: lineNumberOf(content, moduleStart),
        endLine: lineNumberOf(content, moduleEnd),
        ports,
        parameters,
        instances,
        symbols,
        portCount: ports.length,
        instanceCount: instances.length
      });
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// #76 B1：模块例化路径（符号 → VCD 点分 scope 的映射底座）
// ---------------------------------------------------------------------------
// VCD 里的信号全路径 = 「例化路径 + 信号名」，例如默认工程顶层 counter 的 q 是
//   tb.dut.q
// （tb = engine.buildAutoTestbench 生成的 TB 模块名，dut = 它例化顶层模块用的实例名；
//  见 engine.js 里 `lines.push(\`  ${top.name} dut (\`)`）。
// 因此要把「代码里的符号」映射到 VCD，必须先把每个模块定义反推出它在层次里的
// 全部例化路径 —— 同名模块被例化 N 次就有 N 条路径（歧义要交给用户选，见 B4）。

function defKeyOf(def) {
  return `${Number(def?.fileIndex) || 0}:${String(def?.name || "")}`;
}

// 取同名模块的全部定义候选（精确优先，大小写不一致时退化为不敏感匹配）
function defsByName(defs, name) {
  const target = String(name || "").trim();
  if (!target) return [];
  const exact = defs.filter((def) => def.name === target);
  if (exact.length) return exact;
  const lower = target.toLowerCase();
  return defs.filter((def) => def.name.toLowerCase() === lower);
}

// 自动判顶层：没有任何模块例化过的模块 = 层次根。多根时全部作为根（例如 TB + 被测模块并存）。
function autoTopNames(defs, nav) {
  const instantiated = new Set();
  for (const mod of (Array.isArray(nav) ? nav : [])) {
    for (const inst of (mod?.instances || [])) {
      instantiated.add(String(inst?.moduleName || "").toLowerCase());
    }
  }
  const roots = defs.filter((def) => !instantiated.has(def.name.toLowerCase()));
  if (roots.length) return [...new Set(roots.map((def) => def.name))];
  return defs.length ? [defs[0].name] : [];
}

// 计算「模块定义 → 例化路径」全集。
//   nav: buildRtlNav(files)
//   options: { topName，tbScope='tb'，topInstance='dut'，maxDepth=32 }
// 返回 { topName, topNames, paths:[{ moduleName, file, fileIndex, line, path, depth }] }
// path 是 **不含信号名** 的作用域前缀（如 "tb.dut"、"tb.dut.u_sub"）。
export function buildInstancePaths(nav, options = {}) {
  const defs = collectModuleDefs(nav);
  const paths = [];
  if (!defs.length) return { topName: "", topNames: [], paths };
  const byKey = new Map(defs.map((def) => [defKeyOf(def), def]));
  const instancesByKey = new Map();
  for (const mod of (Array.isArray(nav) ? nav : [])) {
    instancesByKey.set(`${Number(mod?.fileIndex) || 0}:${String(mod?.name || "")}`,
      Array.isArray(mod?.instances) ? mod.instances : []);
  }

  const requested = String(options.topName || "").trim();
  const requestedDefs = requested ? defsByName(defs, requested) : [];
  const topNames = requestedDefs.length ? [requestedDefs[0].name] : autoTopNames(defs, nav);
  const tbScope = options.tbScope === undefined ? "tb" : String(options.tbScope || "");
  const topInstance = String(options.topInstance || "dut");
  const maxDepth = Math.max(1, Math.min(64, Number(options.maxDepth) || 32));

  const seen = new Set();
  const stack = new Set();
  const walk = (key, path, depth) => {
    if (depth > maxDepth || stack.has(key)) return;   // 例化环保护（模块例化自己是非法写法，但不能挂）
    const def = byKey.get(key);
    if (!def) return;
    const visitKey = `${key}|${path}`;
    if (!seen.has(visitKey)) {
      seen.add(visitKey);
      paths.push({ moduleName: def.name, file: def.file, fileIndex: def.fileIndex, line: def.line, path, depth });
    }
    stack.add(key);
    for (const inst of (instancesByKey.get(key) || [])) {
      const instanceName = String(inst?.instanceName || "");
      if (!instanceName) continue;
      for (const child of defsByName(defs, inst?.moduleName)) {
        walk(defKeyOf(child), `${path}.${instanceName}`, depth + 1);
      }
    }
    stack.delete(key);
  };

  for (const name of topNames) {
    for (const def of defsByName(defs, name)) {
      walk(defKeyOf(def), tbScope ? `${tbScope}.${topInstance}` : topInstance, 0);
    }
  }
  return { topName: topNames[0] || "", topNames, paths };
}

// 汇总「符号索引 + 例化路径」= 点代码变量 → 波形所需的全部查表数据（纯函数、无 DOM）。
export function buildSymbolIndex(nav, options = {}) {
  const scope = buildInstancePaths(nav, options);
  const modules = [];
  const symbols = [];
  for (const mod of (Array.isArray(nav) ? nav : [])) {
    const moduleLine = Math.max(1, Number(mod?.moduleLine) || 1);
    const entry = {
      name: String(mod?.name || ""),
      file: String(mod?.file || ""),
      fileIndex: Number(mod?.fileIndex) || 0,
      line: moduleLine,
      endLine: Math.max(moduleLine, Number(mod?.endLine) || moduleLine),
      symbolCount: Array.isArray(mod?.symbols) ? mod.symbols.length : 0,
      symbols: []
    };
    for (const symbol of (Array.isArray(mod?.symbols) ? mod.symbols : [])) {
      const item = { ...symbol, moduleName: entry.name, file: entry.file, fileIndex: entry.fileIndex };
      entry.symbols.push(item);
      symbols.push(item);
    }
    modules.push(entry);
  }
  return { topName: scope.topName, topNames: scope.topNames, modules, symbols, instancePaths: scope.paths };
}

// 行号 → 所属模块（B4 点代码变量时先用它定位模块；嵌套/并列时取包含该行的最外层模块）。
export function moduleAtLine(index, fileIndex, line) {
  const n = Number(line) || 0;
  const target = Number(fileIndex);
  const hits = (index?.modules || []).filter((mod) =>
    mod.fileIndex === target && n >= mod.line && n <= mod.endLine);
  if (!hits.length) return null;
  return hits.sort((a, b) => a.line - b.line)[0];
}

// 按名字查符号。options: { moduleName, fileIndex, line } 逐级收窄（能收窄才收窄，收窄后为空则忽略该条件）。
// 返回 { hits, fuzzy }：fuzzy=true 表示只有大小写不一致的匹配。
export function findSymbols(index, name, options = {}) {
  const target = String(name || "").trim();
  if (!target) return { hits: [], fuzzy: false };
  const all = Array.isArray(index?.symbols) ? index.symbols : [];
  let fuzzy = false;
  let hits = all.filter((symbol) => symbol.name === target);
  if (!hits.length) {
    const lower = target.toLowerCase();
    hits = all.filter((symbol) => symbol.name.toLowerCase() === lower);
    fuzzy = hits.length > 0;
  }
  const narrow = (predicate) => {
    const filtered = hits.filter(predicate);
    if (filtered.length) hits = filtered;
  };
  const moduleName = String(options.moduleName || "").trim();
  if (moduleName) narrow((symbol) => symbol.moduleName === moduleName);
  if (Number.isFinite(Number(options.fileIndex))) {
    const fileIndex = Number(options.fileIndex);
    narrow((symbol) => symbol.fileIndex === fileIndex);
  }
  const line = Number(options.line);
  if (Number.isFinite(line) && line > 0) narrow((symbol) => symbol.line === line);
  return { hits, fuzzy };
}

// 符号 → VCD 全路径候选（同名模块多次例化 → 多条候选，交给 B4 的选择器 / ui-bridge 兜底）。
// 返回 { paths:["tb.dut.q", …], hits:[符号…], fuzzy }
export function resolveSymbolVcdPaths(index, name, options = {}) {
  const { hits, fuzzy } = findSymbols(index, name, options);
  const scopes = Array.isArray(index?.instancePaths) ? index.instancePaths : [];
  const paths = [];
  for (const hit of hits) {
    for (const entry of scopes) {
      if (entry.moduleName !== hit.moduleName) continue;
      const full = `${entry.path}.${hit.name}`;
      if (!paths.includes(full)) paths.push(full);
    }
  }
  return { paths, hits, fuzzy };
}
