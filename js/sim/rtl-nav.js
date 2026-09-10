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
      result.push({
        file: file.name,
        fileIndex,
        name: mod.name,
        moduleLine: lineNumberOf(content, moduleStart),
        ports,
        parameters,
        instances,
        portCount: ports.length,
        instanceCount: instances.length
      });
    }
  });
  return result;
}
