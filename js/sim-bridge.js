import { buildAutoTestbench, buildSimulationPayload, parseVerilogDesign, vcdToProjectOutputs } from "./sim.js";
import { formatVectorValue, normalizeVectorValue } from "./model.js";

const DEFAULT_SOURCE = `module counter(
  input clk,
  input rst_n,
  input en,
  output [3:0] q
);
  reg [3:0] q;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
      q <= 4'd0;
    else if (en)
      q <= q + 4'd1;
  end
endmodule`;

const state = {
  files: [{ id: "file0", name: "counter.sv", content: DEFAULT_SOURCE }],
  active: 0,
  design: null,
  outputs: [],
  lastTestbench: "",
  lastBindings: [],
  readyTimer: null,
  ready: false
};

const refs = {};

// 原版 WavePaint 的 Bit 值数字编码（window.__wpConstants.WaveValue 默认值）：
//   0=低, 1=高, -1=未定义(x), 2=高阻(z), 3=上拉(u), 4=下拉(d)
// 原版渲染 Bit 波形时只识别这些数字；若 values 是字符串 "0"/"1" 等，
// 会被当作无效值而不绘制（波形空白）。
function toNativeBitValue(value) {
  const t = String(value ?? "").trim().toLowerCase();
  if (t === "0") return 0;
  if (t === "1") return 1;
  if (t === "z") return 2;
  if (t === "u") return 3;
  if (t === "d") return 4;
  return -1; // x / 未知 → UNDEFINED
}

// 反向：原版数字编码 → 字符串（供仿真/项目模型使用）
function fromNativeBitValue(value) {
  const n = Number(value);
  if (Number.isFinite(n)) {
    if (n === 0) return "0";
    if (n === 1) return "1";
    if (n === 2) return "z";
    if (n === 3) return "u";
    if (n === 4) return "d";
    if (n === -1) return "x";
  }
  return String(value ?? "").trim();
}

function createWavePaintSignal(name, values, type, kind, width = 1) {
  const safeValues = Array.isArray(values) ? values.slice() : [];
  const nativeValues = width > 1 ? safeValues : safeValues.map(toNativeBitValue);
  const SignalCtor = window.Signal;
  const signal = SignalCtor ? new SignalCtor(name, type, safeValues.length || 24) : {
    id: `seed_${name}`,
    name,
    type,
    kind,
    width,
    msb: width > 1 ? String(width - 1) : "",
    lsb: width > 1 ? "0" : "",
    color: null,
    fill: null,
    values: nativeValues,
    labels: Array.from({ length: safeValues.length }, (_, index) => width > 1 ? safeValues[index] : ""),
    segmentStyles: Array.from({ length: safeValues.length }, () => ({ color: null, hatched: false, fill: null })),
    driveStrengths: Array.from({ length: safeValues.length }, () => 0),
    clockMarkers: Array.from({ length: safeValues.length }, () => false),
    waveDromColorCodes: Array.from({ length: safeValues.length }, () => null),
    edgeArrow: null,
    riseTime: null,
    fallTime: null,
    subSteps: 1,
    isClockPattern: kind === "clock",
    clockHighSamples: 1,
    clockLowSamples: 1,
    showClockMarkers: false,
    uiRowHeightHint: 0,
    groupName: null,
    groupColor: null,
    groupPath: null,
    __simInjected: false,
    __simAutoStimulus: false,
    __simDefaultStimulus: false
  };
  signal.id ||= `seed_${name}`;
  signal.name = name;
  signal.type = type;
  signal.kind = kind;
  signal.width = width;
  signal.msb = width > 1 ? String(width - 1) : "";
  signal.lsb = width > 1 ? "0" : "";
  signal.color = null;
  signal.fill = null;
  signal.values = nativeValues;
  signal.labels = Array.from({ length: safeValues.length }, (_, index) => width > 1 ? safeValues[index] : "");
  signal.segmentStyles = Array.from({ length: safeValues.length }, () => ({ color: null, hatched: false, fill: null }));
  signal.driveStrengths = Array.from({ length: safeValues.length }, () => 0);
  signal.clockMarkers = Array.from({ length: safeValues.length }, () => false);
  signal.waveDromColorCodes = Array.from({ length: safeValues.length }, () => null);
  signal.edgeArrow = null;
  signal.riseTime = null;
  signal.fallTime = null;
  signal.subSteps = 1;
  signal.isClockPattern = kind === "clock";
  signal.clockHighSamples = 1;
  signal.clockLowSamples = 1;
  signal.showClockMarkers = false;
  signal.uiRowHeightHint = 0;
  signal.groupName = null;
  signal.groupColor = null;
  signal.groupPath = null;
  signal.__simInjected = false;
  signal.__simAutoStimulus = false;
  signal.__simDefaultStimulus = false;
  return signal;
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

function isClockPortName(name) {
  return /\bclk\b|(^|_)clk(_|$)|clock/.test(normalizeSignalName(name));
}

function isResetPortName(name) {
  return /\b(rst|reset|clr|clear)\b|(^|_)(rst|reset|clr|clear)(_|\b)/.test(normalizeSignalName(name));
}

function isEnablePortName(name) {
  return /\b(en|enable)\b|(^|_)(en|enable)(_|\b)/.test(normalizeSignalName(name));
}

function isAutoSeedSignal(signal) {
  return !!signal?.__simAutoStimulus || !!signal?.__simDefaultStimulus;
}

function signalKey(signal) {
  return normalizeSignalName(signal?.name);
}

function createDefaultPortStimulus(port, timeSteps) {
  const width = Math.max(1, Number(port?.width) || 1);
  const name = port?.name || "signal";
  const key = normalizeSignalName(name);
  let kind = width > 1 ? "vector" : "logic";
  let values;

  if (isClockPortName(key)) {
    kind = "clock";
    values = Array.from({ length: timeSteps }, (_, index) => (index % 2 === 0 ? "0" : "1"));
  } else if (isResetPortName(key)) {
    const activeLow = /(^|_)rst_n(_|$)|(^|_)reset_n(_|$)|(_n$)/.test(key);
    values = Array.from({ length: timeSteps }, (_, index) => (index < 2 ? (activeLow ? "0" : "1") : (activeLow ? "1" : "0")));
  } else if (isEnablePortName(key)) {
    values = Array.from({ length: timeSteps }, (_, index) => (index % 8 >= 4 ? "1" : "0"));
  } else if (width > 1) {
    values = Array.from({ length: timeSteps }, () => "0".repeat(width));
  } else {
    values = Array.from({ length: timeSteps }, () => "0");
  }

  const signal = createWavePaintSignal(name, values, width > 1 ? 1 : 0, kind, width);
  signal.role = "stimulus";
  signal.kind = kind;
  signal.width = width;
  signal.msb = width > 1 ? String(width - 1) : "";
  signal.lsb = width > 1 ? "0" : "";
  signal.__simAutoStimulus = true;
  signal.__simDefaultStimulus = false;
  signal.groupName = "rtl";
  signal.groupColor = "#2563eb";
  signal.groupPath = "sim.inputs";
  return signal;
}

function normalizeSignalLengths(signal, timeSteps) {
  const width = Math.max(1, Number(signal?.width) || 1);
  const values = Array.isArray(signal?.values) ? signal.values : [];
  signal.values = Array.from({ length: timeSteps }, (_, index) => normalizeVectorValue(values[index], width));
  signal.labels = Array.from({ length: timeSteps }, (_, index) => width > 1 ? formatVectorValue(signal.values[index], width, signal.radix || "hexadecimal") : "");
  signal.segmentStyles = Array.from({ length: timeSteps }, (_, index) => signal.segmentStyles?.[index] ? { ...signal.segmentStyles[index] } : { color: null, hatched: false, fill: null });
  signal.driveStrengths = Array.from({ length: timeSteps }, (_, index) => signal.driveStrengths?.[index] ?? (window.DriveStrength?.Strong ?? 0));
  signal.clockMarkers = Array.from({ length: timeSteps }, (_, index) => !!signal.clockMarkers?.[index]);
}

function syncDesignStimuliToWaveDocument(design) {
  const dw = window.document_wave;
  const ports = design?.topModule?.ports || [];
  if (!dw || !Array.isArray(dw.m_signals) || !ports.length) return false;

  const current = Array.isArray(dw.m_signals) ? dw.m_signals : [];
  const timeSteps = Math.max(
    4,
    Number(dw?.m_sampleCount || dw?.m_timeSteps || 0) ||
      current.reduce((max, sig) => Math.max(max, Array.isArray(sig?.values) ? sig.values.length : 0), 0) ||
      24
  );

  const usedIds = new Set();
  const resolvedPorts = [];

  for (const port of ports) {
    if (port.direction === "output" || port.direction === "inout") continue;
    const exact = current.find((signal) => {
      if (!signal || usedIds.has(signal.id)) return false;
      return signalKey(signal) === normalizeSignalName(port.name);
    }) || null;
    if (exact?.id) {
      usedIds.add(exact.id);
      exact.role = "stimulus";
      exact.width = Math.max(1, Number(port.width) || exact.width || 1);
      exact.kind = exact.width > 1 ? "vector" : (isClockPortName(port.name) ? "clock" : "logic");
      exact.msb = exact.width > 1 ? String(port.msb ?? exact.width - 1) : "";
      exact.lsb = exact.width > 1 ? String(port.lsb ?? 0) : "";
      exact.radix = exact.radix || "hexadecimal";
      normalizeSignalLengths(exact, timeSteps);
      if (isAutoSeedSignal(exact)) {
        exact.__simAutoStimulus = true;
        exact.__simDefaultStimulus = false;
        exact.groupName = "rtl";
        exact.groupColor = "#2563eb";
        exact.groupPath = "sim.inputs";
      }
      resolvedPorts.push(exact);
      continue;
    }
    resolvedPorts.push(createDefaultPortStimulus(port, timeSteps));
  }

  const keptManualSignals = current.filter((signal) => {
    if (!signal || usedIds.has(signal.id)) return false;
    if (signal.__simInjected) return false;
    if (signal.__simAutoStimulus || signal.__simDefaultStimulus) return false;
    return true;
  });

  const nextSignals = [...keptManualSignals, ...resolvedPorts];
  const changed =
    nextSignals.length !== current.length ||
    nextSignals.some((signal, index) => signal !== current[index]);

  if (changed) {
    dw.m_signals = nextSignals;
    dw.m_sampleCount = Math.max(24, timeSteps, ...nextSignals.map((signal) => Array.isArray(signal?.values) ? signal.values.length : 0));
    window.drawWaveform?.();
    window.updateSidePanels?.();
  }
  return changed;
}

function defaultStimulusSpecs() {
  const SignalType = window.SignalType || { Bit: 0, Vector: 1 };
  return [
    // 时钟默认“先高后低”（与原版 WavePaint 的时钟约定一致），上升沿落在偶数格子边界。
  // 忠实时序（buildAutoTestbench）：1 格子 ≡ 1 时间单位，值在格子边界生效，clk 上升沿
  // 采到“当前格”的数据值（当前格语义）。默认 en="0111..." 使每个 clk 上升沿格子
  // （2,6,10,...）的 en 为 1 而 4,8,12,... 的 en 为 0，从而驱动计数 q=6。
    Object.assign(createWavePaintSignal("clk", "101010101010101010101010".split(""), SignalType.Bit, "clock", 1), { __simDefaultStimulus: true, groupName: "default", groupColor: "#2563eb", groupPath: "sim.inputs" }),
    Object.assign(createWavePaintSignal("rst_n", "001111111111111111111111".split(""), SignalType.Bit, "logic", 1), { __simDefaultStimulus: true, groupName: "default", groupColor: "#2563eb", groupPath: "sim.inputs" }),
    Object.assign(createWavePaintSignal("en", "011101110111011101110111".split(""), SignalType.Bit, "logic", 1), { __simDefaultStimulus: true, groupName: "default", groupColor: "#2563eb", groupPath: "sim.inputs" })
  ];
}

function signalNameKey(signal) {
  return String(signal?.name || "").trim().toLowerCase();
}

function ensureDefaultStimuli() {
  const dw = window.document_wave;
  if (!dw) return;
  const current = Array.isArray(dw.m_signals) ? dw.m_signals : [];
  const defaults = defaultStimulusSpecs();
  const names = new Set(current.map(signalNameKey));
  const merged = [...current];
  for (const signal of defaults) {
    if (names.has(signalNameKey(signal))) continue;
    merged.push(signal);
  }
  if (!merged.length) return;
  dw.m_signals = merged;
  dw.m_sampleCount = Math.max(24, ...merged.map((signal) => Array.isArray(signal?.values) ? signal.values.length : 0));
  dw.m_subStepCount = Math.max(1, Number(dw.m_subStepCount || 1) || 1);
  window.drawWaveform?.();
  window.updateSidePanels?.();
}

function wavepaintReady() {
  return !!(window.document_wave && typeof window.drawWaveform === "function" && typeof window.updateSidePanels === "function");
}

function onWavepaintReady() {
  if (state.ready) return;
  if (!wavepaintReady()) return;
  state.ready = true;
  if (state.readyTimer) {
    clearInterval(state.readyTimer);
    state.readyTimer = null;
  }
  ensureDefaultStimuli();
  render();
}

function isInjectedSignal(signal) {
  return !!signal?.__simInjected;
}

function stripInjectedSignals(signals) {
  return (Array.isArray(signals) ? signals : []).filter((signal) => !isInjectedSignal(signal));
}

function cloneNativeSignal(signal) {
  if (!signal || typeof signal !== "object") return null;
  if (typeof structuredClone === "function") return structuredClone(signal);
  return JSON.parse(JSON.stringify(signal));
}

function normalizeSignalType(width) {
  const SignalType = window.SignalType || { Bit: 0, Vector: 1 };
  return width > 1 ? SignalType.Vector : SignalType.Bit;
}

function toNativeSignal(output, index, template, timeSteps) {
  const width = Math.max(1, Number(output?.width) || 1);
  const SignalCtor = window.Signal;
  const base = SignalCtor
    ? new SignalCtor(output?.name || `signal_${index + 1}`, normalizeSignalType(width), timeSteps)
    : (cloneNativeSignal(template) || createWavePaintSignal(output?.name || `signal_${index + 1}`, [], normalizeSignalType(width), width > 1 ? "vector" : "logic", width));
  const rawValues = Array.from({ length: timeSteps }, (_, cell) => normalizeVectorValue(output?.values?.[cell], width));
  const values = width > 1 ? rawValues : rawValues.map(toNativeBitValue);
  const labels = Array.from({ length: timeSteps }, (_, cell) => width > 1 ? formatVectorValue(rawValues[cell], width, output?.radix || "hexadecimal") : "");
  base.id = output?.id || `sim_${index}`;
  base.name = output?.name || `signal_${index + 1}`;
  base.type = normalizeSignalType(width);
  base.kind = width > 1 ? "vector" : "logic";
  base.width = width;
  base.msb = width > 1 ? String(width - 1) : "";
  base.lsb = width > 1 ? "0" : "";
  base.values = values;
  base.labels = labels;
  base.segmentStyles = Array.from({ length: timeSteps }, () => ({ color: null, hatched: false, fill: null }));
  base.driveStrengths = Array.from({ length: timeSteps }, () => (window.DriveStrength?.Strong ?? 0));
  base.clockMarkers = Array.from({ length: timeSteps }, () => false);
  base.waveDromColorCodes = Array.from({ length: timeSteps }, () => null);
  base.edgeArrow = null;
  base.riseTime = null;
  base.fallTime = null;
  base.subSteps = 1;
  base.isClockPattern = false;
  base.clockHighSamples = 1;
  base.clockLowSamples = 1;
  base.showClockMarkers = false;
  base.uiRowHeightHint = 0;
  base.groupName = "sim";
  base.groupColor = "#0f766e";
  base.groupPath = "sim.outputs";
  base.__simInjected = true;
  return base;
}

function replaceInjectedOutputs(outputs) {
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) return;
  const baseSignals = stripInjectedSignals(dw.m_signals);
  const timeSteps = Math.max(
    4,
    Number(dw?.m_sampleCount || dw?.m_timeSteps || 0) ||
      baseSignals.reduce((max, sig) => Math.max(max, Array.isArray(sig?.values) ? sig.values.length : 0), 0) ||
      24
  );
  const template = baseSignals[0] || null;
  const injected = (Array.isArray(outputs) ? outputs : []).map((output, index) => toNativeSignal(output, index, template, timeSteps));
  dw.m_signals = [...baseSignals, ...injected];
  dw.m_sampleCount = Math.max(dw.m_sampleCount || 0, timeSteps);
}

function el(id) {
  return document.getElementById(id);
}

function initRefs() {
  refs.panel = el("sim-panel");
  refs.toggleBtn = el("sim-toggle-btn");
  refs.header = el("sim-panel-header");
  refs.waveView = el("wave-view");
  refs.waveCanvas = el("wave-canvas");
  refs.sourceFiles = el("source-files");
  refs.sourceEditor = el("verilog-source");
  refs.portPreview = el("port-preview");
  refs.modulePreview = el("module-preview");
  refs.status = el("sim-status");
  refs.addFile = el("sim-addfile");
  refs.removeFile = el("sim-removefile");
  refs.parseBtn = el("sim-parse");
  refs.tbBtn = el("sim-tb");
  refs.runBtn = el("sim-run");
  refs.collapseBtn = el("sim-collapse");
  refs.tbSource = el("tb-source");
  refs.tbCopy = el("sim-tb-copy");
}

function updateTbViewer() {
  if (refs.tbSource) {
    refs.tbSource.value = state.lastTestbench || "";
  }
}

function copyTb() {
  const text = state.lastTestbench || (refs.tbSource && refs.tbSource.value) || "";
  if (!text) {
    setStatus("No testbench to copy.");
    return;
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard.writeText(text)
      .then(() => setStatus("TB copied to clipboard."))
      .catch(() => setStatus("Copy failed."));
  } else {
    setStatus("Clipboard not available.");
  }
}

function currentFile() {
  return state.files[state.active] || state.files[0] || null;
}

function syncEditor() {
  const file = currentFile();
  if (!file || !refs.sourceEditor) return;
  file.content = String(refs.sourceEditor.value || "");
  state.design = null;
  state.outputs = [];
  state.lastTestbench = "";
  updateTbViewer();
}

function readWaveDocument() {
  const dw = window.document_wave;
  const signals = stripInjectedSignals(dw?.m_signals || []);
  const timeSteps = Math.max(
    4,
    Number(dw?.m_sampleCount || dw?.m_timeSteps || 0) ||
      signals.reduce((max, sig) => Math.max(max, Array.isArray(sig?.values) ? sig.values.length : 0), 0) ||
      24
  );

  return {
    name: "WavePaintSim",
    timeSteps,
    subSteps: Math.max(1, Number(dw?.m_subStepCount || 1) || 1),
    zoom: 1,
    selectedSignalId: null,
    signals: signals.map((sig, index) => {
      const rawValues = Array.isArray(sig?.values) ? sig.values : [];
      const width = inferWidth(sig, rawValues);
      const values = Array.from({ length: timeSteps }, (_, cell) => width <= 1 ? fromNativeBitValue(rawValues[cell]) : normalizeVectorValue(rawValues[cell], width));
      return {
        id: sig?.id || `sig_${index}`,
        name: sig?.name || `signal_${index + 1}`,
        role: "stimulus",
        kind: inferKind(sig, width),
        width,
        msb: width > 1 ? String(width - 1) : "",
        lsb: width > 1 ? "0" : "",
        radix: "hexadecimal",
        values,
        labels: Array.from({ length: timeSteps }, (_, cell) => width > 1 ? formatVectorValue(values[cell], width, "hexadecimal") : "")
      };
    }),
    outputs: []
  };
}

function inferWidth(sig, values) {
  if (Number(sig?.width) > 1) return Math.max(1, Math.floor(Number(sig.width)));
  for (const value of values || []) {
    const text = String(value ?? "").trim();
    if (/^[01xz]+$/i.test(text) && text.length > 1) return text.length;
  }
  return 1;
}

function inferKind(sig, width) {
  if (sig?.isClockPattern) return "clock";
  return width > 1 ? "vector" : "logic";
}

function sourceText() {
  return state.files.map((file) => `// file: ${file.name}\n${file.content || ""}`).join("\n\n");
}

function parseDesign() {
  onWavepaintReady();
  syncEditor();
  const design = parseVerilogDesign(sourceText());
  state.design = design;
  refs.portPreview.textContent = design.topModule?.ports?.length
    ? `${design.topName}: ${design.topModule.ports.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
    : `No ports found in ${design.topName}.`;
  refs.modulePreview.textContent = [
    `modules: ${design.moduleCount}`,
    ...design.modules.map((moduleInfo) => `${moduleInfo.name}: ${moduleInfo.ports.length} ports, ${moduleInfo.instances.length} instances`)
  ].join("\n");
  setStatus(`Parsed ${design.moduleCount} module(s).`);
  render();
}

function buildTbPreview() {
  onWavepaintReady();
  syncEditor();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  const project = readWaveDocument();
  const result = buildAutoTestbench(design, project);
  if (!result.ok) {
    refs.modulePreview.textContent = result.error;
    setStatus(result.error);
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
  state.lastTestbench = result.source;
  state.lastBindings = result.bindings;
  updateTbViewer();
  refs.modulePreview.textContent = [
    `bindings: ${result.bindings.length}`,
    ...result.bindings.map((binding) => `${binding.port.name} -> ${binding.signal ? binding.signal.name : "<unbound>"} (${binding.strategy})`)
  ].join("\n");
  setStatus(`Built TB for ${design.topName}.`);
  render();
}

async function runSimulation() {
  onWavepaintReady();
  syncEditor();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  const project = readWaveDocument();
  const tbResult = buildAutoTestbench(design, project);
  if (!tbResult.ok) {
    refs.modulePreview.textContent = tbResult.error;
    setStatus(tbResult.error);
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
  state.lastTestbench = tbResult.source;
  updateTbViewer();

  setStatus(`Running simulation for ${design.topName}...`);
  refs.modulePreview.textContent = "Running real simulation...";
  const payload = buildSimulationPayload(state.files, tbResult.source);

  try {
    const response = await fetch("/api/sim", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: payload
    });
    const text = await response.text();
    if (/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):/.test(text)) {
      const error = text.replace(/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):\s*/, "").trim();
      refs.modulePreview.textContent = error || "Simulation failed.";
      state.outputs = [];
      render();
      setStatus(error || "Simulation failed.");
      return;
    }

    const { parsed, outputs } = vcdToProjectOutputs(text, project);
    state.outputs = outputs;
    replaceInjectedOutputs(outputs);
    state.lastTestbench = tbResult.source;
    state.lastBindings = tbResult.bindings;
    updateTbViewer();
    refs.modulePreview.textContent = [
      `Simulation done: ${outputs.length} signals, tmax ${parsed.tmax}`,
      `Final: ${summarizeOutputs(outputs)}`
    ].join("\n");
    render();
    setStatus(`Done: ${outputs.length} signal(s).`);
  } catch (error) {
    refs.modulePreview.textContent = String(error);
    setStatus(String(error));
  }
}

function summarizeOutputs(outputs) {
  if (!Array.isArray(outputs) || !outputs.length) return "none";
  return outputs.map((signal) => {
    const width = Math.max(1, Number(signal.width) || 1);
    const finalValue = signal.values?.[signal.values.length - 1];
    const formatted = width > 1
      ? formatVectorValue(finalValue, width, "hexadecimal")
      : normalizeVectorValue(finalValue, 1);
    return `${signal.name}=${formatted}`;
  }).join("; ");
}

function render() {
  if (!wavepaintReady()) return;
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  const autoSynced = syncDesignStimuliToWaveDocument(design);
  replaceInjectedOutputs(state.outputs);
  window.drawWaveform?.();
  window.updateSidePanels?.();
  const outputCount = state.outputs && state.outputs.length ? state.outputs.length : 0;
  setStatus(`${autoSynced ? "RTL inputs added. " : ""}${outputCount ? `${outputCount} output signal(s) ready.` : "No output signals."}`);
  if (refs.toggleBtn) refs.toggleBtn.style.display = refs.panel?.classList.contains("collapsed") ? "block" : "none";
}

function setStatus(text) {
  if (refs.status) refs.status.textContent = String(text || "");
}

function renderFileTabs() {
  if (!refs.sourceFiles) return;
  refs.sourceFiles.replaceChildren(...state.files.map((file, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "source-chip" + (index === state.active ? " active" : "");
    chip.textContent = file.name || `file_${index + 1}`;
    chip.addEventListener("click", () => {
      syncEditor();
      state.active = index;
      refs.sourceEditor.value = currentFile()?.content || "";
      renderFileTabs();
    });
    return chip;
  }));
  if (refs.sourceEditor) refs.sourceEditor.value = currentFile()?.content || "";
}

function addFile() {
  const name = prompt("Source file name", `file_${state.files.length + 1}.sv`);
  if (!name) return;
  syncEditor();
  state.files.push({ id: `file_${state.files.length}`, name, content: "" });
  state.active = state.files.length - 1;
  renderFileTabs();
  setStatus(`Added ${name}.`);
  render();
}

function removeFile() {
  if (state.files.length <= 1) return;
  syncEditor();
  state.files.splice(state.active, 1);
  state.active = Math.max(0, state.active - 1);
  renderFileTabs();
  setStatus("Removed file.");
  render();
}

function bindEvents() {
  refs.toggleBtn?.addEventListener("click", () => {
    refs.panel.classList.remove("collapsed");
    document.body.classList.add("sim-open");
    render();
  });
  refs.header?.addEventListener("click", () => {
    refs.panel.classList.add("collapsed");
    document.body.classList.remove("sim-open");
    render();
  });
  refs.collapseBtn?.addEventListener("click", () => {
    refs.panel.classList.add("collapsed");
    document.body.classList.remove("sim-open");
    render();
  });
  refs.addFile?.addEventListener("click", addFile);
  refs.removeFile?.addEventListener("click", removeFile);
  refs.parseBtn?.addEventListener("click", parseDesign);
  refs.tbBtn?.addEventListener("click", buildTbPreview);
  refs.runBtn?.addEventListener("click", runSimulation);
  refs.tbCopy?.addEventListener("click", copyTb);
  refs.sourceEditor?.addEventListener("input", () => {
    syncEditor();
    render();
  });
}

function init() {
  initRefs();
  if (!refs.panel || !refs.sourceEditor) return;
  bindEvents();
  renderFileTabs();
  document.body.classList.add("sim-open");
  onWavepaintReady();
  if (!state.readyTimer) {
    state.readyTimer = window.setInterval(onWavepaintReady, 100);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
