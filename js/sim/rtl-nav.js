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
      const instances = (mod.instances || []).map((inst) => ({
        moduleName: inst.moduleName,
        instanceName: inst.instanceName,
        line: locateLine(blanked, content, moduleStart, headerEnd, moduleEnd, "instance", inst.instanceName)
      }));
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
