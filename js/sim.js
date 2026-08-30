import { formatVectorValue, normalizeVectorValue } from "./model.js";

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
  return /\bclk\b|(^|_)clk(_|$)|clock/.test(lowerName(name));
}

function isResetName(name) {
  return /\b(rst|reset|clr|clear)\b|(^|_)(rst|reset|clr|clear)(_|\b)/.test(lowerName(name));
}

function isEnableName(name) {
  return /\b(en|enable)\b|(^|_)(en|enable)(_|\b)/.test(lowerName(name));
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

function defaultInputValues(port, kind, timeSteps) {
  const width = Math.max(1, Number(port?.width) || 1);
  const name = lowerName(port?.name);
  if (kind === "vector") return Array.from({ length: timeSteps }, () => "0".repeat(width));
  if (kind === "clock") {
    return Array.from({ length: timeSteps }, (_, index) => (index % 2 === 0 ? "0" : "1"));
  }
  if (isResetName(name)) {
    const activeLow = /(^|_)rst_n(_|$)|(^|_)reset_n(_|$)|(_n$)/.test(name);
    return Array.from({ length: timeSteps }, (_, index) => (index < 2 ? (activeLow ? "0" : "1") : (activeLow ? "1" : "0")));
  }
  if (isEnableName(name)) {
    return Array.from({ length: timeSteps }, (_, index) => (index % 8 >= 4 ? "1" : "0"));
  }
  return Array.from({ length: timeSteps }, () => (width > 1 ? "0".repeat(width) : "0"));
}

function defaultOutputValues(port, timeSteps) {
  const width = Math.max(1, Number(port?.width) || 1);
  return Array.from({ length: timeSteps }, () => (width > 1 ? "0".repeat(width) : "0"));
}

function createSignalFromPort(port, existingSignal, role, timeSteps) {
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

function uniqueByName(items) {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const key = normalizeSignalName(item?.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
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
      if (rangeMatch) currentRange = parseRange(rangeMatch[0]);
    }
    if (!currentDirection) {
      const interfaceMatch = /^([A-Za-z_][A-Za-z0-9_$.]*)\s+([A-Za-z_][A-Za-z0-9_$,\s]*)$/.exec(item);
      if (interfaceMatch && !/^(logic|reg|wire|bit|signed|unsigned|var|const|ref|event|shortint|int|integer|time|string|byte)$/i.test(interfaceMatch[1])) {
        const interfaceType = interfaceMatch[1];
        const interfaceNames = parseListIdentifiers(interfaceMatch[2]);
        for (const name of interfaceNames) {
          ports.push({
            direction: "interface",
            interfaceType,
            name,
            msb: "",
            lsb: "",
            width: 1
          });
        }
      }
      continue;
    }
    const rangeMatch = /\[[^\]]*\]/.exec(item);
    const widthInfo = rangeMatch ? parseRange(rangeMatch[0]) : currentRange;
    const namesSection = item.replace(/\[[^\]]*\]/g, " ").replace(/^(?:logic|reg|wire|bit|signed|unsigned)\b/g, " ");
    const names = parseListIdentifiers(namesSection);
    if (rangeMatch) currentRange = widthInfo;
    const interfaceMatch = /^([A-Za-z_][A-Za-z0-9_$.]*)\s+([A-Za-z_][A-Za-z0-9_$,\s]*)$/.exec(item);
    if (!rangeMatch && names.length === 1 && interfaceMatch && !/^(logic|reg|wire|bit|signed|unsigned|var|const|ref|event|shortint|int|integer|time|string|byte)$/i.test(interfaceMatch[1])) {
      ports.push({
        direction: currentDirection || "interface",
        interfaceType: interfaceMatch[1],
        name: names[0],
        msb: "",
        lsb: "",
        width: 1
      });
      continue;
    }
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

function parseInterfaceMembers(body) {
  const members = [];
  for (const port of parseDirectionDeclarations(body)) {
    members.push({ ...port, kind: "port" });
  }
  for (const decl of parseDeclarations(body)) {
    members.push({
      direction: "signal",
      name: decl.name,
      msb: decl.msb,
      lsb: decl.lsb,
      width: decl.width,
      kind: decl.kind
    });
  }
  return uniqueByName(members);
}

function parseInterfaceDeclarations(source) {
  const interfaces = {};
  const text = stripComments(source);
  const pattern = /\binterface\s+([A-Za-z_][A-Za-z0-9_$]*)\b(?:\s*#\s*\([^;{}]*?\))?(?:\s*\([^;{}]*?\))?\s*;([\s\S]*?)\bendinterface\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1];
    const body = match[2] || "";
    interfaces[name] = {
      name,
      members: parseInterfaceMembers(body)
    };
  }
  return interfaces;
}

function parseModuleHeader(header) {
  const trimmed = normalizeWhitespace(header);
  const nameMatch = /^module\s+([A-Za-z_][A-Za-z0-9_$]*)/.exec(trimmed);
  const name = nameMatch ? nameMatch[1] : "top";
  const paramBlock = /#\s*\((.*)\)\s*\(/.exec(trimmed);
  const portBlock = /\((.*)\)\s*;?$/.exec(trimmed);
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
  const interfaces = parseInterfaceDeclarations(text);
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
    interfaces,
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
    interfaces: design.interfaces || {},
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

export function matchSignalsToPorts(signals, ports) {
  const signalMap = new Map();
  for (const signal of signals || []) {
    signalMap.set(normalizeSignalName(signal.name), signal);
  }

  return (ports || []).map((port) => {
    const exact = signalMap.get(normalizeSignalName(port.name));
    if (exact) return { port, signal: exact, matched: true, strategy: "name" };
    const fallback = (signals || []).find((signal) => signal.role !== "result") || null;
    return { port, signal: fallback, matched: false, strategy: fallback ? "fallback" : "none" };
  });
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

  const interfacePorts = (top.ports || []).filter((port) => port.direction === "interface" || port.interfaceType);
  if (interfacePorts.length) {
    return {
      ok: false,
      error: `Interface ports detected: ${interfacePorts.map((port) => port.name).join(", ")}.`,
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
  const inputBindings = bindings.filter((b) => b.signal && b.port.direction !== "output" && b.port.direction !== "inout");
  const events = [];
  for (const binding of inputBindings) {
    const signal = binding.signal;
    const rawValues = Array.isArray(signal.values) ? signal.values : [];
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
        labels: Array.from({ length: timeSteps }, (_, index) => formatVectorValue(values[index], signal.width > 1 ? signal.width : 1, "hexadecimal"))
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
