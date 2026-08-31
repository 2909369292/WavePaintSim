import { formatVectorValue, normalizeVectorValue } from "./model.js";

// 总线标签统一不带 0x/0b 前缀（需求：进制显示不带前缀）。
// formatVectorValue 的 hex 分支会返回 "0x..."，这里剥掉，供仿真结果标签使用。
export function formatBusLabel(value, width, radix = "hexadecimal") {
  return String(formatVectorValue(value, width, radix)).replace(/^0[xXbB]/, "");
}

function stripComments(source) {
  return String(source || "")
    .replace(/\/\/.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

function normalizeWhitespace(source) {
  return String(source || "").replace(/\s+/g, " ").trim();
}

function lowerName(name) {
  return String(name || "").trim().toLowerCase();
}

function isClockName(name) {
  const n = lowerName(name);
  // 时钟名规范：clk 或 clkCore（目前仅这两种可能）。
  // 保留对 *_clk*、*clock* 等命名的兼容（未来可通过读取 always 块敏感信号列表扩展，暂不做）。
  return n === "clk" || n === "clkcore" || /\bclk\b|(^|_)clk(_|$)|clock/.test(n);
}


function normalizeSignalValues(values, width, timeSteps) {
  const source = Array.isArray(values) ? values : [];
  return Array.from({ length: timeSteps }, (_, index) => normalizeVectorValue(source[index], width));
}

function inferSignalWidth(signal) {
  const explicitWidth = Number(signal?.width);
  if (Number.isFinite(explicitWidth) && explicitWidth > 1) return Math.floor(explicitWidth);
  const values = Array.isArray(signal?.values) ? signal.values : [];
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (/^[01xz]+$/i.test(text) && text.length > 1) return text.length;
  }
  return 1;
}

function inferPortKind(port, existingSignal) {
  if (Number(port?.width) > 1) return "vector";
  if (existingSignal?.kind === "clock") return "clock";
  if (isClockName(port?.name)) return "clock";
  return "logic";
}

// 激励端口初始值：统一为“空白/未定义”（x），不预置任何波形图案（时钟/复位/使能等），
// 由用户自行绘制激励波形——功能纯粹，无隐藏的默认值逻辑。
function defaultInputValues(port, kind, timeSteps) {
  const width = Math.max(1, Number(port?.width) || 1);
  const fill = width > 1 ? "x".repeat(width) : "x";
  return Array.from({ length: timeSteps }, () => fill);
}

function defaultOutputValues(port, timeSteps) {
  const width = Math.max(1, Number(port?.width) || 1);
  return Array.from({ length: timeSteps }, () => (width > 1 ? "0".repeat(width) : "0"));
}

export function createSignalFromPort(port, existingSignal, role, timeSteps) {
  const width = Math.max(1, Number(port?.width) || inferSignalWidth(existingSignal));
  const kind = inferPortKind(port, existingSignal);
  const name = port?.name || existingSignal?.name || "signal";
  const values = Array.isArray(existingSignal?.values) && existingSignal.values.length
    ? normalizeSignalValues(existingSignal.values, width, timeSteps)
    : (role === "result" ? defaultOutputValues(port, timeSteps) : defaultInputValues(port, kind, timeSteps));
  return {
    id: existingSignal?.id || `sig_${Math.random().toString(36).slice(2, 8)}`,
    name,
    role,
    kind,
    width,
    msb: port?.msb || existingSignal?.msb || (width > 1 ? String(width - 1) : ""),
    lsb: port?.lsb || existingSignal?.lsb || (width > 1 ? "0" : ""),
    radix: existingSignal?.radix || "hexadecimal",
    values,
    labels: Array.from({ length: timeSteps }, (_, index) => width > 1
      ? formatVectorValue(values[index], width, existingSignal?.radix || "hexadecimal")
      : "")
  };
}

export function syncProjectSignalsToDesign(project, design) {
  const ports = design?.topModule?.ports || [];
  const timeSteps = Math.max(1, Number(project?.timeSteps) || 24);
  const existingSignals = [...(project?.signals || []), ...(project?.outputs || [])];
  const selectedSignal = existingSignals.find((signal) => signal?.id === project?.selectedSignalId) || null;
  const selectedName = selectedSignal ? normalizeSignalName(selectedSignal.name) : "";
  const consumed = new Set();
  const signals = [];
  const outputs = [];

  for (const port of ports) {
    const exact = existingSignals.find((signal) => {
      if (!signal || consumed.has(signal.id)) return false;
      return normalizeSignalName(signal.name) === normalizeSignalName(port.name);
    }) || null;
    if (exact?.id) consumed.add(exact.id);
    const role = port.direction === "output" || port.direction === "inout" ? "result" : "stimulus";
    const signal = createSignalFromPort(port, exact, role, timeSteps);
    if (role === "result") outputs.push(signal);
    else signals.push(signal);
  }

  const selectedMatch = selectedName
    ? [...signals, ...outputs].find((signal) => normalizeSignalName(signal.name) === selectedName)
    : null;

  return {
    signals,
    outputs,
    selectedSignalId: selectedMatch?.id || signals[0]?.id || outputs[0]?.id || null
  };
}

export function buildPlaceholderOutputsFromPorts(ports, timeSteps) {
  const count = Math.max(1, Number(timeSteps) || 24);
  return (ports || [])
    .filter((port) => port.direction === "output" || port.direction === "inout")
    .map((port, index) => {
      const width = Math.max(1, Number(port?.width) || 1);
      return {
        id: `out_${index}_${String(port.name || "signal").replace(/[^a-z0-9_]/gi, "_")}`,
        name: port.name || "signal",
        role: "result",
        kind: width > 1 ? "vector" : "logic",
        width,
        msb: port.msb || (width > 1 ? String(width - 1) : ""),
        lsb: port.lsb || (width > 1 ? "0" : ""),
        radix: "hexadecimal",
        values: Array.from({ length: count }, () => (width > 1 ? "0".repeat(width) : "0")),
        labels: Array.from({ length: count }, (_, index) => width > 1 ? formatVectorValue("0".repeat(width), width, "hexadecimal") : "")
      };
    });
}

function parseRange(text) {
  const match = /\[(.*?)\]/.exec(text || "");
  if (!match) return { msb: "", lsb: "", width: 1 };
  const range = match[1].replace(/\s+/g, "");
  const parts = range.split(":");
  if (parts.length !== 2) return { msb: "", lsb: "", width: 1 };
  const msb = parts[0];
  const lsb = parts[1];
  const a = Number(msb);
  const b = Number(lsb);
  return {
    msb,
    lsb,
    width: Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) + 1 : 1
  };
}

function parseListIdentifiers(text) {
  return String(text || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\[[^\]]*\]/g, ""))
    .map((part) => part.replace(/=.*$/, "").trim())
    .filter(Boolean);
}

function splitTopLevelCommas(text) {
  const items = [];
  let depth = 0;
  let current = "";
  for (const char of String(text || "")) {
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      if (current.trim()) items.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

function parseAnsiPortList(block) {
  const ports = [];
  let currentDirection = "";
  let currentRange = { msb: "", lsb: "", width: 1 };
  for (let item of splitTopLevelCommas(block)) {
    item = normalizeWhitespace(item);
    if (!item) continue;
    const directionMatch = /^(input|output|inout)\b/.exec(item);
    if (directionMatch) {
      currentDirection = directionMatch[1];
      item = item.slice(directionMatch[0].length).trim();
      const rangeMatch = /\[[^\]]*\]/.exec(item);
      // 新端口条目：有显式位宽则继承，否则重置为 1 位（避免错误继承上一端口的位宽，
      // 如 `input [7:0] data_in, input en` 中 en 应为 1 位；而 `input [7:0] a, b` 中 b 仍共享位宽）
      currentRange = rangeMatch ? parseRange(rangeMatch[0]) : { msb: "", lsb: "", width: 1 };
    }
    if (!currentDirection) continue;
    const rangeMatch = /\[[^\]]*\]/.exec(item);
    const widthInfo = rangeMatch ? parseRange(rangeMatch[0]) : currentRange;
    const namesSection = item.replace(/\[[^\]]*\]/g, " ").replace(/^(?:logic|reg|wire|bit|signed|unsigned)\b/g, " ");
    const names = parseListIdentifiers(namesSection);
    if (rangeMatch) currentRange = widthInfo;
    for (const name of names) {
      ports.push({
        direction: currentDirection,
        name,
        msb: widthInfo.msb,
        lsb: widthInfo.lsb,
        width: widthInfo.width
      });
    }
  }
  return ports;
}

function parseModuleHeader(header) {
  const trimmed = normalizeWhitespace(header);
  const nameMatch = /^module\s+([A-Za-z_][A-Za-z0-9_$]*)/.exec(trimmed);
  const name = nameMatch ? nameMatch[1] : "top";
  const paramBlock = /#\s*\(([\s\S]*)\)\s*\(/.exec(trimmed);
  let portBlock = null;
  if (paramBlock) {
    // 带 parameter 的模块：端口列表在参数块之后，从参数块最后的 '(' 开始解析，
    // 避免贪婪匹配把 "#(...) (ports)" 混在一起导致端口全部丢失。
    const afterParam = trimmed.slice(paramBlock.index + paramBlock[0].length - 1);
    portBlock = /\(([\s\S]*)\)\s*;?$/.exec(afterParam);
  } else {
    portBlock = /\((.*)\)\s*;?$/.exec(trimmed);
  }
  return {
    name,
    parameters: paramBlock ? paramBlock[1] : "",
    portBlock: portBlock ? portBlock[1] : ""
  };
}

function parseDeclarations(body) {
  const declarations = [];
  const declPattern = /\b(?:logic|reg|wire|bit|int|byte|shortint|integer|time)\b\s*(?:signed\s*)?(\[[^\]]*\])?\s*([^;]+);/g;
  let match;
  while ((match = declPattern.exec(body)) !== null) {
    const range = parseRange(match[1] || "");
    for (const name of parseListIdentifiers(match[2])) {
      declarations.push({
        name,
        msb: range.msb,
        lsb: range.lsb,
        width: range.width,
        kind: "net"
      });
    }
  }
  return declarations;
}

function parseDirectionDeclarations(body) {
  const ports = [];
  const declPattern = /\b(input|output|inout)\b\s*(?:reg|wire|logic|bit)?\s*(?:signed\s*)?(\[[^\]]*\])?\s*([^;]+);/g;
  let match;
  while ((match = declPattern.exec(body)) !== null) {
    const direction = match[1];
    const range = parseRange(match[2] || "");
    for (const name of parseListIdentifiers(match[3])) {
      ports.push({
        direction,
        name,
        msb: range.msb,
        lsb: range.lsb,
        width: range.width
      });
    }
  }
  return ports;
}

function parseParameters(body) {
  const parameters = [];
  const paramPattern = /\b(?:localparam|parameter)\b\s*(?:type\s+)?([^;]+);/g;
  let match;
  while ((match = paramPattern.exec(body)) !== null) {
    const entries = String(match[1] || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    for (const entry of entries) {
      const assign = /(?:type\s+)?([A-Za-z_][A-Za-z0-9_$]*)\s*=\s*(.*)$/.exec(entry);
      if (assign) parameters.push({ name: assign[1], value: assign[2].trim() });
    }
  }
  return parameters;
}

function parseInstances(body) {
  const instances = [];
  const instancePattern = /\b([A-Za-z_][A-Za-z0-9_$]*)\b\s*(#\s*\([^;{}]*?\))?\s+([A-Za-z_][A-Za-z0-9_$]*)\s*\(([^;]*?)\)\s*;/gs;
  let match;
  while ((match = instancePattern.exec(body)) !== null) {
    const moduleName = match[1];
    const parameterOverride = match[2] || "";
    const instanceName = match[3];
    const connectionText = match[4] || "";
    if (/^(assign|if|for|case|always|initial|begin|end|function|task|module|typedef|import|export|class|interface|package|return)$/i.test(moduleName)) {
      continue;
    }
    const connections = connectionText
      .split(/,(?![^()]*\))/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const named = /^\.(\w+)\s*\(\s*([^)]*?)\s*\)$/.exec(item);
        if (named) return { port: named[1], signal: named[2].trim(), type: "named" };
        return { port: "", signal: item.replace(/^\(|\)$/g, "").trim(), type: "ordered" };
      });
    instances.push({
      moduleName,
      instanceName,
      parameterOverride,
      connections
    });
  }
  return instances;
}

export function parseVerilogDesign(source) {
  const text = stripComments(source);
  const modules = [];
  const modulePattern = /\bmodule\s+[A-Za-z_][A-Za-z0-9_$]*[\s\S]*?endmodule\b/g;
  let match;
  while ((match = modulePattern.exec(text)) !== null) {
    const block = match[0];
    const headerEnd = block.indexOf(";");
    if (headerEnd < 0) continue;
  const header = block.slice(0, headerEnd + 1);
  const body = block.slice(headerEnd + 1, block.length - "endmodule".length);
  const parsedHeader = parseModuleHeader(header);
    const ansiPorts = parseAnsiPortList(parsedHeader.portBlock);
    const ports = ansiPorts.length ? ansiPorts : parseDirectionDeclarations(body);
  const parameters = parseParameters(body);
  const declarations = parseDeclarations(body);
  const instances = parseInstances(body);
    modules.push({
      name: parsedHeader.name,
      header,
      body,
      ports,
      parameters,
      declarations,
      instances
    });
  }

  const instantiatedModules = new Set();
  for (const moduleInfo of modules) {
    for (const instance of moduleInfo.instances || []) {
      if (instance?.moduleName) instantiatedModules.add(instance.moduleName);
    }
  }
  let topModule = null;
  for (let index = modules.length - 1; index >= 0; index -= 1) {
    if (!instantiatedModules.has(modules[index].name)) {
      topModule = modules[index];
      break;
    }
  }
  if (!topModule) topModule = modules[modules.length - 1] || null;
  return {
    source: text,
    modules,
    topModule,
    moduleCount: modules.length,
    topName: topModule ? topModule.name : "top"
  };
}

export function parseVerilogPorts(source) {
  const design = parseVerilogDesign(source);
  const top = design.topModule;
  return {
    moduleName: design.topName,
    ports: top ? top.ports : [],
    modules: design.modules,
    topModule: top,
    instances: top ? top.instances : [],
    moduleCount: design.moduleCount
  };
}

function normalizeSignalName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/^i_?/, "")
    .replace(/^o_?/, "")
    .replace(/^in_?/, "")
    .replace(/^out_?/, "")
    .replace(/_i$/, "")
    .replace(/_o$/, "")
    .replace(/_n$/, "_n");
}

function parseVcdReference(referenceText) {
  const reference = String(referenceText || "").trim();
  if (!reference) return { name: "", range: "" };
  const rangeMatch = /\s*(\[[^\]]*\])$/.exec(reference);
  if (!rangeMatch) return { name: reference, range: "" };
  return {
    name: reference.slice(0, rangeMatch.index).trimEnd(),
    range: rangeMatch[1]
  };
}

function signalScore(signal, expectedName) {
  const normalizedName = normalizeSignalName(signal?.name);
  const expected = normalizeSignalName(expectedName);
  let score = 0;
  if (expected && normalizedName === expected) score += 1000;
  const scope = String(signal?.scope || "");
  if (!scope) score += 120;
  else if (scope === "tb") score += 60;
  else if (scope.startsWith("tb.dut")) score += 180;
  else if (scope.startsWith("tb.")) score += 100;
  else score += Math.max(0, 40 - scope.split(".").length * 6);
  if (signal?.width > 1) score += 10;
  if (/^(tb|testbench|dut|uut)$/i.test(normalizedName)) score -= 500;
  return score;
}

function pickPreferredSignals(parsedSignals, project) {
  const expectedNames = Array.from(
    new Set((project?.outputs || [])
      .map((signal) => normalizeSignalName(signal?.name))
      .filter(Boolean))
  );
  const candidates = (parsedSignals || []).filter((signal) => !/^(tb|testbench|dut|uut)$/i.test(normalizeSignalName(signal?.name)));

  if (!expectedNames.length) {
    return candidates.filter((signal) => !signal.scope || signal.scope === "tb");
  }

  const selected = [];
  const usedIds = new Set();
  for (const expectedName of expectedNames) {
    let best = null;
    let bestScore = -Infinity;
    for (const signal of candidates) {
      if (usedIds.has(signal.id)) continue;
      if (normalizeSignalName(signal.name) !== expectedName) continue;
      const score = signalScore(signal, expectedName);
      if (score > bestScore) {
        best = signal;
        bestScore = score;
      }
    }
    if (best) {
      usedIds.add(best.id);
      selected.push(best);
    }
  }

  if (selected.length) return selected;
  return candidates.filter((signal) => !signal.scope || signal.scope === "tb");
}

function formatVerilogValue(value, width) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const normalized = String(value ?? "").trim().replace(/\s+/g, "").replace(/_/g, "");
  if (safeWidth > 1) {
    const bits = normalizeVectorValue(normalized, safeWidth);
    return `${safeWidth}'b${bits}`;
  }
  const bit = /[01xz]/i.exec(normalized);
  return `1'b${bit ? bit[0].toLowerCase() : "0"}`;
}

// ---------------------------------------------------------------------------
// 复位端口识别：返回 "low"（低有效，如 rst_n / nreset）| "high"（高有效，如 rst）
// | null（不是复位端口）。
// 复位是时序电路进入已知状态的唯一途径，必须单独对待，不能按普通数据端口处理。
// ---------------------------------------------------------------------------
function resetPolarity(name) {
  const n = String(name || "").toLowerCase().replace(/\s+/g, "");
  if (!/(rst|reset)/.test(n)) return null;
  // 低有效的常见写法：rst_n / reset_n / rst_b / rstn / nreset / n_rst
  if (/_n$|_b$|^n_|nreset|nrst|rstn/.test(n)) return "low";
  return "high";
}

// 复位端口的「无效（释放）」电平：低有效复位释放时为 1，高有效复位释放时为 0。
function resetInactiveLevel(name) {
  return resetPolarity(name) === "low" ? "1" : "0";
}

// ---------------------------------------------------------------------------
// 时序电路初始化：若复位信号从未被拉到有效电平，在开头补一段复位脉冲。
//
// 原因：DUT 的 reg 无初值时保持 x，而 x 会自我传播（x + 1 === x）。
// 没有复位沿，计数器/状态机永远出不了 x，用户看到的就是「输出恒 0 / 恒 x / 空白」。
// 用户画了复位沿时完全尊重原波形，不做任何改动。
// ---------------------------------------------------------------------------
function ensureResetPulse(values, portName) {
  const polarity = resetPolarity(portName);
  if (!polarity) return values;
  const activeLevel = polarity === "low" ? "0" : "1";
  const inactiveLevel = polarity === "low" ? "1" : "0";
  const source = Array.isArray(values) ? values : [];
  if (!source.length) return values;
  const hasActive = source.some((v) => String(v).trim().toLowerCase() === activeLevel);
  if (hasActive) return values; // 用户已画出复位沿
  // 前 2 格拉到有效电平（复位），其余释放。宽度 > 1 时按位重复。
  return source.map((v, index) => {
    const level = index < 2 ? activeLevel : inactiveLevel;
    const width = String(v ?? "").length > 1 ? String(v).length : 1;
    return width > 1 ? level.repeat(width) : level;
  });
}

// ---------------------------------------------------------------------------
// 常见信号的典型波形：添加端口信号到画布时直接预填，省去从零绘制，
// 也顺带避免「激励全 x → 输出恒 x/恒 0」这个最容易踩的坑。
//
// 只覆盖公认的通用信号（时钟 / 复位），其余一律返回 null 保持未定义(x)，
// 不臆造任何用户数据——数据类端口该长什么样只有用户知道。
//
//   clock                → 方波 0101...（半周期 1 个时间单位，占空比 50%）
//   低有效复位 rst_n     → 前 2 格 0（复位），之后 1（释放）
//   高有效复位 rst       → 前 2 格 1（复位），之后 0（释放）
// ---------------------------------------------------------------------------
export function typicalWaveform(port, timeSteps) {
  const steps = Math.max(1, Number(timeSteps) || 24);
  const width = Math.max(1, Number(port?.width) || 1);
  const fill = (ch) => (width > 1 ? ch.repeat(width) : ch);
  const name = String(port?.name || "");

  const polarity = resetPolarity(name);
  if (polarity) {
    const active = polarity === "low" ? "0" : "1";
    const idle = polarity === "low" ? "1" : "0";
    return Array.from({ length: steps }, (_, index) => fill(index < 2 ? active : idle));
  }
  if (isClockName(name)) {
    return Array.from({ length: steps }, (_, index) => fill(index % 2 === 1 ? "1" : "0"));
  }
  return null;
}

// 创建「端口 → 画布激励信号」，并对时钟/复位这类通用信号预填典型波形。
// 单一真相源：addPortSignalsToCanvas 与 tools/e2e-sim.mjs 的用例模拟都走这里，
// 避免两边逻辑漂移导致测试测了个寂寞。
export function createPortStimulus(port, timeSteps) {
  const signal = createSignalFromPort(port, null, "stimulus", timeSteps);
  const typical = typicalWaveform(port, timeSteps);
  if (typical) signal.values = typical;
  return signal;
}

// ---------------------------------------------------------------------------
// 仿真结果诊断：把「静默跑出全 0 / 全 x」变成可操作的提示。
// 返回若干条中文说明；没有问题则返回空数组。
// ---------------------------------------------------------------------------
const isAllZero = (sig) => Array.isArray(sig?.values) && sig.values.length
  && sig.values.every((v) => /^0+$/.test(String(v).trim()));
const isAllX = (sig) => Array.isArray(sig?.values) && sig.values.length
  && sig.values.every((v) => /^x+$/i.test(String(v).trim()));

export function diagnoseSimulation(outputs, bindings) {
  const notes = [];
  const list = Array.isArray(bindings) ? bindings : [];
  const inputs = list.filter((b) => b?.port && b.port.direction !== "output" && b.port.direction !== "inout");

  const unbound = inputs.filter((b) => b.strategy === "unbound" || b.strategy === "unbound-default");
  if (unbound.length) {
    notes.push(`⚠ 未绑定输入端口：${unbound.map((b) => b.port.name).join(", ")}`
      + ` —— 已按默认电平驱动（低有效复位=1，其余=0）。若结果不符预期，`
      + `请在画布添加同名信号并绘制波形。`);
  }

  const blank = inputs.filter((b) => b.signal && isAllX(b.signal));
  if (blank.length) {
    notes.push(`⚠ 激励未绘制（全 x）：${blank.map((b) => b.signal.name).join(", ")}`
      + ` —— DUT 输入为 x 时输出通常也是 x 或 0。`);
  }

  const outs = Array.isArray(outputs) ? outputs : [];
  const zero = outs.filter(isAllZero);
  const unknown = outs.filter(isAllX);
  if (zero.length) {
    notes.push(`⚠ 输出恒为 0：${zero.map((o) => o.name).join(", ")}`
      + ` —— 常见原因是复位一直有效（低有效复位被驱动为 0），或使能/数据未给出有效值。`);
  }
  if (unknown.length) {
    notes.push(`⚠ 输出恒为 x：${unknown.map((o) => o.name).join(", ")}`
      + ` —— 常见原因是缺少复位释放沿。请把复位信号画成「前 2 格有效、之后释放」，`
      + `并确认时钟已绘制。`);
  }
  return notes;
}

// 端口 ↔ 画布信号绑定。分两轮：先精确匹配，再克制的模糊匹配。
//
// 模糊匹配只用来消化命名风格差异（rst_n <-> rstn、sys_clk <-> clk、enable <-> en），
// 因此加了三重约束，避免误配：
//   1. 单个字符的端口名（d / q 等）不参与模糊匹配 —— 否则 data/addr/valid 都会被 d 命中；
//   2. 两者长度比过低时不配对 —— 避免 clk 之类的短名混进长信号名；
//   3. 每个信号只能被一个端口占用（一对一），且在所有候选中取最相似者，
//      而不是像旧实现那样简单地 find 第一个。
export function matchSignalsToPorts(signals, ports) {
  const list = Array.isArray(signals) ? signals : [];
  const signalMap = new Map();
  for (const signal of list) {
    signalMap.set(normalizeSignalName(signal.name), signal);
  }

  const claimed = new Set(); // 已占用的信号，保证一对一
  const bindings = (Array.isArray(ports) ? ports : []).map((port) => {
    const exact = signalMap.get(normalizeSignalName(port.name));
    if (exact) {
      claimed.add(exact);
      return { port, signal: exact, matched: true, strategy: "name" };
    }
    return { port, signal: null, matched: false, strategy: "unbound" };
  });

  for (const binding of bindings) {
    if (binding.matched) continue;
    const target = normalizeSignalName(binding.port.name);
    if (!target) continue;
    let best = null;
    let bestScore = 0;
    for (const signal of list) {
      if (signal.role === "result" || claimed.has(signal)) continue;
      const candidate = normalizeSignalName(signal.name);
      if (!candidate) continue;
      const shorter = Math.min(candidate.length, target.length);
      const longer = Math.max(candidate.length, target.length);
      if (shorter < 2) continue;          // 约束 1：单字符不模糊匹配
      if (shorter / longer < 0.3) continue; // 约束 2：长度差距过大
      if (!(candidate.includes(target) || target.includes(candidate))) continue;
      const score = shorter / longer;
      if (score > bestScore) { bestScore = score; best = signal; } // 约束 3：取最相似
    }
    if (best) {
      claimed.add(best);
      binding.signal = best;
      binding.matched = true;
      binding.strategy = "fuzzy";
    }
  }
  return bindings;
}

export function buildAutoTestbench(design, project = {}) {
  const top = design?.topModule;
  if (!top) {
    return {
      ok: false,
      error: "No module found.",
      source: ""
    };
  }

  const bindings = matchSignalsToPorts(project.signals || [], top.ports || []);
  const timeStep = Math.max(1, Number(project.timeSteps) || 24);
  const timeUnit = project.timeUnit || "1ns/1ps";
  const lines = [];
  lines.push(`\`timescale ${timeUnit}`);
  lines.push("module tb;");

  for (const binding of bindings) {
    const width = binding.port.width > 1 ? `[${binding.port.msb || binding.port.width - 1}:${binding.port.lsb || 0}] ` : "";
    if (binding.port.direction === "output" || binding.port.direction === "inout") {
      lines.push(`  wire ${width}${binding.port.name};`);
    } else {
      lines.push(`  reg ${width}${binding.port.name};`);
    }
  }

  lines.push("");
  lines.push(`  ${top.name} dut (`);
  top.ports.forEach((port, index) => {
    const comma = index === top.ports.length - 1 ? "" : ",";
    lines.push(`    .${port.name}(${port.name})${comma}`);
  });
  lines.push("  );");

  lines.push("");
  lines.push("  initial begin");
  lines.push("    $dumpfile(\"wave_out.vcd\");");
  lines.push("    $dumpvars(0, tb);");
  // ── 激励生成：1 格子 ≡ 1 时间单位，值在格子边界 (t=index) 生效 ──
  // 忠实反映画布波形：零偏移、零采样、零“建立时间”臆造。
  // 同一时刻多信号变化时先更新 clock、再更新其他信号（同刻用 #0 增量保持同一时刻），
  // 使 clk 上升沿先发生，数据/复位后更新。
  // 激励信号：已绑定信号 + 未绑定输入端口（生成独立全 0 默认激励，避免共用/保持 x）
  const inputBindings = [];
  for (const binding of bindings) {
    if (binding.port.direction === "output" || binding.port.direction === "inout") continue;
    let signal = binding.signal;
    if (!signal) {
      const defaultSignal = createSignalFromPort(binding.port, null, "stimulus", Math.max(1, Number(project.timeSteps) || 24));
      const defWidth = Math.max(1, Number(defaultSignal.width) || 1);
      // 按端口语义取「无效电平」：低有效复位给 1（释放复位），其余给 0。
      // 旧实现一律给 0，会让 rst_n 恒有效，复位一直拉住 DUT，输出恒 0。
      const idle = resetInactiveLevel(binding.port.name);
      signal = {
        ...defaultSignal,
        values: Array.from({ length: defaultSignal.values.length }, () => (defWidth > 1 ? idle.repeat(defWidth) : idle))
      };
      binding.signal = signal;
      binding.strategy = "unbound-default";
    }
    inputBindings.push({ ...binding, signal });
  }
  const events = [];
  for (const binding of inputBindings) {
    const signal = binding.signal;
    // 时钟按子步粒度翻转（readWaveDocument 传来的每格序列）：用分数时间驱动，
    // 使仿真频率与画布显示一致（每格 1/stride 个时间单位，一个主步内完成 1→0 翻转
    // → 每主步一个上升沿）。普通时钟/其它信号仍走主步整值驱动。
    const clockCells = (signal.kind === "clock"
      && Array.isArray(signal.clockCells) && signal.clockCells.length >= 2)
      ? signal.clockCells : null;
    if (clockCells) {
      const stride = Math.max(1, Number(project.subSteps) + 1);
      let previous = formatVerilogValue(clockCells[0], binding.port.width);
      events.push({ time: 0, clock: true, text: `${binding.port.name} = ${previous};` });
      for (let k = 1; k < clockCells.length; k += 1) {
        const current = formatVerilogValue(clockCells[k], binding.port.width);
        if (current === previous) continue;
        events.push({ time: k / stride, clock: true, text: `${binding.port.name} = ${current};` });
        previous = current;
      }
      continue;
    }
    // 复位端口补齐上电复位脉冲（仅当用户从未画出复位沿时）。
    // 注意：只影响生成的 TB，不改动画布上的原始波形。
    const rawValues = ensureResetPulse(Array.isArray(signal.values) ? signal.values : [], binding.port.name);
    const isClock = signal.kind === "clock";
    let previous = formatVerilogValue(rawValues[0], binding.port.width);
    events.push({ time: 0, clock: isClock, text: `${binding.port.name} = ${previous};` });
    for (let index = 1; index < rawValues.length; index += 1) {
      const current = formatVerilogValue(rawValues[index], binding.port.width);
      if (current === previous) continue;
      events.push({ time: index, clock: isClock, text: `${binding.port.name} = ${current};` });
      previous = current;
    }
  }
  // 同一时刻：clock 先更新（上升沿先发生），其他信号后更新
  events.sort((a, b) => a.time - b.time || Number(b.clock) - Number(a.clock));
  let prevTime = 0;
  let firstGroup = true;
  for (let ei = 0; ei < events.length; ) {
    const groupTime = events[ei].time;
    const group = [];
    while (ei < events.length && events[ei].time === groupTime) group.push(events[ei++]);
    if (firstGroup) {
      for (const ev of group) lines.push(`    ${ev.text}`);
      firstGroup = false;
    } else {
      lines.push(`    #${groupTime - prevTime} ${group[0].text}`);
      for (let gi = 1; gi < group.length; gi += 1) lines.push(`    #0 ${group[gi].text}`);
    }
    prevTime = groupTime;
  }
  lines.push(`    #${Math.max(1, timeStep - prevTime)} $finish;`);
  lines.push("  end");

  lines.push("endmodule");
  return {
    ok: true,
    source: lines.join("\n"),
    bindings
  };
}

export function buildDemoOutputs(project) {
  const first = project.signals[0]?.values || [];
  const second = project.signals[1]?.values || [];
  const outputs = [];
  const width = project.timeSteps;

  const andValues = [];
  const orValues = [];
  const xorValues = [];
  const notValues = [];
  for (let index = 0; index < width; index += 1) {
    const a = first[index] === "1" ? 1 : 0;
    const b = second[index] === "1" ? 1 : 0;
    andValues.push(a & b ? "1" : "0");
    orValues.push(a | b ? "1" : "0");
    xorValues.push(a ^ b ? "1" : "0");
    notValues.push(a ? "0" : "1");
  }

  outputs.push({ id: "out_and", name: "and_y", role: "result", kind: "logic", values: andValues });
  outputs.push({ id: "out_or", name: "or_y", role: "result", kind: "logic", values: orValues });
  outputs.push({ id: "out_xor", name: "xor_y", role: "result", kind: "logic", values: xorValues });
  outputs.push({ id: "out_not", name: "not_a", role: "result", kind: "logic", values: notValues });
  return outputs;
}

export function buildSimulationPayload(sourceFiles, testbench) {
  const files = Array.isArray(sourceFiles) ? sourceFiles : [{ name: "dut.sv", content: String(sourceFiles || "") }];
  const lines = ["@@FILE:tb.v", testbench, "@@END"];
  files.forEach((file, index) => {
    const rawName = String(file?.name || `dut_${index + 1}.sv`).trim() || `dut_${index + 1}.sv`;
    const payloadName = rawName.replace(/[\\/]/g, "_").replace(/^\.+/, "") || `dut_${index + 1}.sv`;
    const finalName = /\.[^.]+$/.test(payloadName) ? payloadName : `${payloadName}.sv`;
    lines.push(`@@FILE:${finalName}`);
    lines.push(String(file?.content || ""));
    lines.push("@@END");
  });
  return lines.join("\n");
}

export function parseVcd(vcdText) {
  const result = { tmax: 0, signals: [] };
  const lines = String(vcdText || "").split(/\r?\n/);
  const byId = new Map();
  let time = 0;
  const scopes = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("$scope")) {
      const scopeMatch = /^\$scope\s+\S+\s+([^\s]+)\s+\$end/.exec(line);
      if (scopeMatch) scopes.push(scopeMatch[1]);
      continue;
    }
    if (line.startsWith("$upscope")) {
      scopes.pop();
      continue;
    }
    if (line.startsWith("$var")) {
      const match = /^\$var\s+\S+\s+(\d+)\s+(\S+)\s+(.+?)\s+\$end$/.exec(line);
      if (match) {
        const reference = match[3].trim();
        const parsedReference = parseVcdReference(reference);
        const signal = {
          width: Number(match[1]) || 1,
          id: match[2],
          name: parsedReference.name || reference,
          reference,
          scope: scopes.join("."),
          steps: []
        };
        // iverilog 会对不同作用域中“电气上相同”的信号复用同一个 VCD id
        // （如 tb.clk 与 tb.dut.clk 同为 id '"'，tb.y 与 dut.y 同为 id '!'）。
        // 因此 id 必须映射到所有共享它的信号，值变化行要应用到每一个，
        // 否则先声明的信号（如 tb 作用域）会被后声明者覆盖而丢失全部数据。
        const shared = byId.get(signal.id) || [];
        shared.push(signal);
        byId.set(signal.id, shared);
        result.signals.push(signal);
      }
      continue;
    }
    if (line.startsWith("#")) {
      time = Number(line.slice(1)) || 0;
      result.tmax = Math.max(result.tmax, time);
      continue;
    }
    if (line[0] === "b" || line[0] === "B") {
      const spaceIndex = line.indexOf(" ");
      if (spaceIndex < 0) continue;
      const value = line.slice(1, spaceIndex).trim();
      const id = line.slice(spaceIndex + 1).trim();
      const sharedSignals = byId.get(id);
      if (!sharedSignals) continue;
      for (const sharedSignal of sharedSignals) {
        if (!sharedSignal.steps.length || sharedSignal.steps[sharedSignal.steps.length - 1][1] !== value) {
          sharedSignal.steps.push([time, value]);
        }
      }
      continue;
    }
    const id = line.slice(1).trim();
    const value = line[0];
    const sharedSignals = byId.get(id);
    if (!sharedSignals) continue;
    for (const sharedSignal of sharedSignals) {
      if (!sharedSignal.steps.length || sharedSignal.steps[sharedSignal.steps.length - 1][1] !== value) {
        sharedSignal.steps.push([time, value]);
      }
    }
  }

  for (const signal of result.signals) {
    if (!signal.steps.length) signal.steps.push([0, "0"]);
    if (signal.steps[signal.steps.length - 1][0] < result.tmax) {
      signal.steps.push([result.tmax, signal.steps[signal.steps.length - 1][1]]);
    }
  }

  return result;
}

export function vcdToProjectOutputs(vcdText, project) {
  const parsed = parseVcd(vcdText);
  const timeSteps = Math.max(1, Number(project?.timeSteps) || 24);
  const excludedSignals = new Set((project?.signals || []).map((signal) => normalizeSignalName(signal?.name)));
  // 忠实回填：1 格子 ≡ 1 时间单位，TB 总时长恰为 timeSteps 个单位（VCD tmax 即总时长）。
  // 格子 i ↔ VCD 时间 i * (tmax / timeSteps)——仅 VCD 时间单位换算，无偏移、无采样。
  // 输出信号 q 在 t=i 的 clk 上升沿更新（非阻塞赋值）后，格子 i 即显示新值。
  const totalTime = Math.max(1, parsed.tmax || 0);
  const sampleTimes = Array.from({ length: timeSteps }, (_, index) => Math.round((index * totalTime) / timeSteps));
  const buildOutputs = (candidates) => {
    const signals = [];
    for (const signal of candidates) {
      const normalizedName = normalizeSignalName(signal.name);
      if (excludedSignals.has(normalizedName)) continue;
      if (/^(tb|testbench|dut|uut)$/i.test(normalizedName)) continue;
      const values = Array.from({ length: timeSteps }, () => "0");
      let stepCursor = 0;
      for (let index = 0; index < timeSteps; index += 1) {
        const sampleTime = sampleTimes[index];
        while (stepCursor + 1 < signal.steps.length && signal.steps[stepCursor + 1][0] <= sampleTime) {
          stepCursor += 1;
        }
        const current = signal.steps[stepCursor]?.[1] || "0";
        values[index] = signal.width > 1
          ? normalizeVectorValue(current, signal.width)
          : normalizeVectorValue(current, 1);
      }
      signals.push({
        id: signal.id || `vcd_${signals.length}`,
        name: signal.name,
        role: "result",
        kind: signal.width > 1 ? "vector" : "logic",
        width: signal.width > 1 ? signal.width : 1,
        msb: signal.width > 1 ? String(signal.width - 1) : "",
        lsb: signal.width > 1 ? "0" : "",
        radix: "hexadecimal",
        scope: signal.scope || "",
        values,
        labels: Array.from({ length: timeSteps }, (_, index) =>
          formatBusLabel(values[index], signal.width > 1 ? signal.width : 1, "hexadecimal"))
      });
    }
    return signals;
  };

  const preferredSignals = pickPreferredSignals(parsed.signals, project);
  let signals = buildOutputs(preferredSignals.length ? preferredSignals : parsed.signals);
  if (!signals.length && preferredSignals.length && parsed.signals.length > preferredSignals.length) {
    signals = buildOutputs(parsed.signals);
  }

  return { parsed, outputs: signals };
}
