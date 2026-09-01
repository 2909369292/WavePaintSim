import { buildAutoTestbench, buildSimulationPayload, createPortStimulus, createSignalFromPort, diagnoseSimulation, parseVerilogDesign, vcdToProjectOutputs } from "./sim.js";
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

// 总线标签统一不带 0x/0b 前缀（与 feature-common 的 busRadixLabel 口径一致）
function busLabel(value, width, radix) {
  return String(formatVectorValue(value, width, radix || "hexadecimal")).replace(/^0[xXbB]/, "");
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
    __simInjected: false
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
  return signal;
}

function signalNameKey(signal) {
  return String(signal?.name || "").trim().toLowerCase();
}

// 画布步数（用户设定的长度）：优先读步数输入框 #sample-spin（用户设定的画布长度），
// 回退到 document_wave.m_sampleCount，再回退到已有信号最大长度。
// 确保添加的端口信号长度始终与画布一致，而不是沿用已有信号的旧长度（如 15）。
function canvasTimeSteps() {
  const spinEl = document.querySelector("#sample-spin");
  const spinValue = spinEl ? Number(spinEl.value) : NaN;
  const dw = window.document_wave;
  // 回退值按数据模型换算回主步数（values 长度 = 主步数 × (子步+1)）
  const stride = canvasSubSteps() + 1;
  const existingMax = (Array.isArray(dw?.m_signals) ? dw.m_signals : [])
    .reduce((max, sig) => Math.max(max, Array.isArray(sig?.values) ? Math.floor(sig.values.length / stride) : 0), 0);
  const steps = (Number.isFinite(spinValue) && spinValue > 0 ? spinValue : 0)
    || Number(dw?.m_sampleCount || 0)
    || existingMax
    || 24;
  return Math.max(4, steps);
}

// 画布有效采样数 = 主步数 × (子步+1)，与 WavePaint 原版数据模型一致：
// 每个时间步在 values 中占 (子步+1) 个下标，主值为该步第 1 个值。
//
// ⚠ 口径必须与 feature-common.js 的 wpf.subSteps() 完全一致（允许 0）。
// 旧实现用 Math.max(1, ...) 把子步数 0 当成 1，导致：
//   canvasEffectiveCount() 把新建信号撑成主步数的 2 倍 →
//   用户绘制（writeValue 用 stride=1）只写满前半段，后半段留 x →
//   仿真按 stride=2 采样时后半段全采到未绘制的 x → 激励几乎全 x → 输出恒 0/恒 x。
function canvasSubSteps() {
  const dw = window.document_wave;
  return Math.max(0, Number(dw?.m_subStepCount) || 0);
}

function canvasEffectiveCount() {
  return canvasTimeSteps() * (canvasSubSteps() + 1);
}

// 取某主步的有效值（兜底采样）：主值（每步第 1 个下标）优先；
// 若主值为 x/未定义，则取该主步内第一个确定值；否则返回 -1(x)。
// 解决"用户画在子步下标（奇数）时仿真采不到"导致的恒 0 问题。
function sampleMainValue(rawValues, stride, mainStep, timeSteps) {
  if (!Array.isArray(rawValues) || !rawValues.length) return -1;
  // 旧信号（长度≈主步数）按下标直取
  if (rawValues.length <= timeSteps) {
    const v = rawValues[mainStep];
    return (v === -1 || v === undefined || /^x+$/i.test(String(v ?? "").trim())) ? -1 : v;
  }
  const isX = (v) => (v === -1 || v === undefined || /^x+$/i.test(String(v ?? "").trim()));
  const start = mainStep * stride;
  let fallback = -1;
  for (let k = 0; k < stride; k += 1) {
    const idx = start + k;
    if (idx >= rawValues.length) break;
    const v = rawValues[idx];
    if (isX(v)) continue;
    if (k === 0) return v;          // 主值确定
    if (fallback === -1) fallback = v; // 子步兜底
  }
  return fallback;
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

// 创建原版 Signal。length 为画布有效长度（主步数 × (子步+1)）；
// output.values 按主步给出（长度 = 主步数），这里按模型铺开：每个主步的
// (子步+1) 个格子都填该步的主值，与原版绘制/导出/仿真采样语义一致。
function toNativeSignal(output, index, template, effectiveCount, options = {}) {
  const width = Math.max(1, Number(output?.width) || 1);
  const SignalCtor = window.Signal;
  const base = SignalCtor
    ? new SignalCtor(output?.name || `signal_${index + 1}`, normalizeSignalType(width), effectiveCount)
    : (cloneNativeSignal(template) || createWavePaintSignal(output?.name || `signal_${index + 1}`, [], normalizeSignalType(width), width > 1 ? "vector" : "logic", width));
  const stride = Math.max(1, Number(options.stride) || (canvasSubSteps() + 1));
  const sourceValues = Array.isArray(output?.values) ? output.values : [];
  const rawValues = Array.from({ length: effectiveCount }, (_, cell) => {
    const mainStep = Math.min(Math.floor(cell / stride), Math.max(0, sourceValues.length - 1));
    return normalizeVectorValue(sourceValues[Math.max(0, mainStep)], width);
  });
  const values = width > 1 ? rawValues : rawValues.map(toNativeBitValue);
  const labels = Array.from({ length: effectiveCount }, (_, cell) => width > 1 ? busLabel(rawValues[cell], width, output?.radix || "hexadecimal") : "");
  const kind = options.kind || (width > 1 ? "vector" : "logic");
  base.id = output?.id || `sim_${index}`;
  base.name = output?.name || `signal_${index + 1}`;
  base.type = normalizeSignalType(width);
  base.kind = kind;
  base.width = width;
  base.msb = width > 1 ? String(width - 1) : "";
  base.lsb = width > 1 ? "0" : "";
  base.values = values;
  base.labels = labels;
  base.segmentStyles = Array.from({ length: effectiveCount }, () => ({ color: null, hatched: false, fill: null }));
  base.driveStrengths = Array.from({ length: effectiveCount }, () => (window.DriveStrength?.Strong ?? 0));
  base.clockMarkers = Array.from({ length: effectiveCount }, () => false);
  base.waveDromColorCodes = Array.from({ length: effectiveCount }, () => null);
  base.edgeArrow = null;
  base.riseTime = null;
  base.fallTime = null;
  // 与画布保持同一口径（旧实现硬编码 1，导致注入信号长度比原生信号多一倍）
  base.subSteps = canvasSubSteps();
  base.isClockPattern = kind === "clock";
  base.clockHighSamples = 1;
  base.clockLowSamples = 1;
  base.showClockMarkers = false;
  base.uiRowHeightHint = 0;
  // 去掉自动添加的 SIM 分组：仿真输出信号默认不分组（与激励信号一致）
  base.groupName = options.groupName ?? null;
  base.groupColor = options.groupColor ?? null;
  base.groupPath = options.groupPath ?? null;
  base.__simInjected = options.injected ?? true;
  return base;
}

function replaceInjectedOutputs(outputs) {
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) return;
  const baseSignals = stripInjectedSignals(dw.m_signals);
  // 输出信号 values 长度对齐数据模型：主步数 × (子步+1)
  const effectiveCount = Math.max(4, canvasEffectiveCount());
  const template = baseSignals[0] || null;
  const injected = (Array.isArray(outputs) ? outputs : []).map((output, index) => toNativeSignal(output, index, template, effectiveCount));
  dw.m_signals = [...baseSignals, ...injected];
  // m_sampleCount 语义是主步数，不能被有效长度污染
  dw.m_sampleCount = Math.max(dw.m_sampleCount || 0, canvasTimeSteps());
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
  refs.addSignals = el("sim-addsignals");
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
  const timeSteps = canvasTimeSteps();
  // 数据模型采样：每个主步占 (子步+1) 个 values 下标，主值 = 该步第 1 个值。
  // 旧数据（长度恰好 = 主步数）按下标直取，保证向后兼容。
  const stride = canvasSubSteps() + 1;

  return {
    name: "WavePaintSim",
    timeSteps,
    subSteps: canvasSubSteps(),
    zoom: 1,
    selectedSignalId: null,
    signals: signals.map((sig, index) => {
      const rawValues = Array.isArray(sig?.values) ? sig.values : [];
      const width = inferWidth(sig, rawValues);
      // 时钟信号总是按「每格序列」传给 buildAutoTestbench，由 TB 用分数时间逐格驱动
      // （每格 1/stride 时间单位，一个主步内完成翻转 → 每主步一个上升沿）。
      // ⚠ 不能要求 isAlternatingCells（整条完美交替）：用户修改激励后 clk 未必还是
      //    1,0,1,0…，若此时退回「主步整值驱动」，主步内无翻转 → 无上升沿 →
      //    输出恒 0（用户实测：第一次 sim 后修改激励/结果波形再 sim，结果恒 0）。
      //    逐格驱动忠实地反映画布真实波形，无论 clk 画成交替还是任意形状。
      const isClock = !!sig.isClockPattern || sig.kind === "clock";
      const clockCells = width <= 1 && isClock && rawValues.length >= 2
        ? rawValues.map(fromNativeBitValue) : undefined;
      const values = Array.from({ length: timeSteps }, (_, cell) => {
        // 兜底采样：主值（每步第 1 个）优先；若主值为 x/空，取该主步内第一个确定值。
        // 解决“用户画在子步下标（奇数）时仿真采不到”导致的恒 0 问题。
        const raw = sampleMainValue(rawValues, stride, cell, timeSteps);
        return width <= 1 ? fromNativeBitValue(raw) : normalizeVectorValue(raw, width);
      });
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
        clockCells,
        labels: Array.from({ length: timeSteps }, (_, cell) => width > 1 ? busLabel(values[cell], width, "hexadecimal") : "")
      };
    }),
    outputs: []
  };
}

// 检测「每一格都与前一格相反」的交替位串（子步级时钟，1,0,1,0…）。
// 只由 readWaveDocument 在对 isClockPattern 信号检查时使用，避免误伤普通数据信号。
function isAlternatingCells(values) {
  if (!Array.isArray(values) || values.length < 2) return false;
  let prev = fromNativeBitValue(values[0]);
  for (let i = 1; i < values.length; i += 1) {
    const cur = fromNativeBitValue(values[i]);
    if (cur === prev) return false;
    prev = cur;
  }
  return true;
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
  if (!design.modules || !design.modules.length) {
    refs.portPreview.textContent = "⚠ 未识别到任何 module。请检查 RTL 语法：module/endmodule 是否匹配、模块名是否合法。";
    refs.modulePreview.textContent = "Parse failed: no module found.";
    setStatus("Parse failed: no module found.");
    render();
    return;
  }
  const topPorts = design.topModule?.ports || [];
  refs.portPreview.textContent = topPorts.length
    ? `${design.topName}: ${topPorts.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
    : `⚠ ${design.topName} 未解析到端口。请检查端口声明写法（ANSI 或非 ANSI 均可）。`;
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
  const notes = diagnoseSimulation([], result.bindings);
  refs.modulePreview.textContent = [
    `bindings: ${result.bindings.length}`,
    ...result.bindings.map((binding) => `${binding.port.name} -> ${binding.signal ? binding.signal.name : "<unbound>"} (${binding.strategy})`),
    ...(notes.length ? ["", ...notes] : [])
  ].join("\n");
  setStatus(notes.length
    ? `Built TB for ${design.topName}（有 ${notes.length} 条提醒，见详情）`
    : `Built TB for ${design.topName}.`);
  render();
}

async function runSimulation() {
  onWavepaintReady();
  syncEditor();
  // 读画布 → 生成 TB 若抛异常会导致 sim 按钮静默无响应（用户反馈"第二次仿真失效"）。
  // 这里显式捕获并展示，让问题可定位。
  let design, project, tbResult;
  try {
    design = state.design || parseVerilogDesign(sourceText());
    state.design = design;
    project = readWaveDocument();
    tbResult = buildAutoTestbench(design, project);
  } catch (error) {
    const detail = String(error && error.stack ? error.stack : error);
    refs.modulePreview.textContent = "Testbench generation failed: " + detail.slice(0, 500);
    setStatus("Testbench generation failed: " + String(error).slice(0, 200));
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
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
    // 结果诊断：输出全 0 / 全 x 或存在未绑定端口时，直接给出可操作的提示，
    // 避免用户面对「静默的全 0」无从下手。
    const notes = diagnoseSimulation(outputs, tbResult.bindings);
    refs.modulePreview.textContent = [
      `Simulation done: ${outputs.length} signals, tmax ${parsed.tmax}`,
      `Final: ${summarizeOutputs(outputs)}`,
      ...(notes.length ? ["", ...notes] : [])
    ].join("\n");
    render();
    setStatus(notes.length
      ? `Done: ${outputs.length} signal(s)，但有 ${notes.length} 条提醒，请查看详情。`
      : `Done: ${outputs.length} signal(s).`);
  } catch (error) {
    const message = String(error);
    const friendly = /fetch/i.test(message)
      ? "仿真请求失败：本地仿真服务无响应（Failed to fetch）。\n"
        + "可能原因：\n"
        + "  1. 应用进程已退出（窗口检测或异常导致）\n"
        + "  2. iverilog 编译/仿真卡死或超时\n"
        + "  3. RTL 含导致 iverilog 崩溃的内容\n"
        + "请重启 WavePaintSim，或查看日志：%TEMP%\\WavePaintSim_sim.log"
      : message;
    refs.modulePreview.textContent = friendly;
    setStatus(friendly);
  }
}

// 自动识别 RTL top module 的端口信号并添加到绘图区，方便用户直接绘制激励波形。
// - input / inout 端口 → 作为激励信号添加到画布（可绘制，kind 保留 clock/logic/vector）
// - output 端口 → 跳过（仿真后由仿真结果自动回填，避免与回填信号重名冲突）
// - 画布上已存在同名信号 → 跳过（保留用户已绘制的波形）
function addPortSignalsToCanvas() {
  onWavepaintReady();
  syncEditor();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  const ports = design?.topModule?.ports || [];
  if (!ports.length) {
    setStatus(`No ports found in ${design.topName || "design"}.`);
    return;
  }
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) {
    setStatus("Canvas not ready.");
    return;
  }
  const existing = dw.m_signals;
  const names = new Set(existing.map((sig) => signalNameKey(sig)));
  const timeSteps = canvasTimeSteps();              // 主步数（用于 project 模型信号）
  const effectiveCount = canvasEffectiveCount();    // 画布 values 长度 = 主步数 × (子步+1)
  const template = existing[0] || null;
  let added = 0;
  let skipped = 0;
  const baseCount = existing.length;
  for (let index = 0; index < ports.length; index += 1) {
    const port = ports[index];
    if (port.direction === "output") { skipped += 1; continue; } // 输出由仿真回填
    const key = signalNameKey(port);
    if (!key || names.has(key)) { skipped += 1; continue; }
    // 时钟/复位这类通用信号由 createPortStimulus 预填典型波形，其余保持未定义(x)
    const signal = createPortStimulus(port, timeSteps);
    const native = toNativeSignal(signal, baseCount + added, template, effectiveCount, {
      kind: signal.kind,
      injected: false,
      groupName: null,
      groupColor: null,
      groupPath: null
    });
    // 时钟按「子步粒度」翻转、从 1 开始：每个格子 1,0,1,0,1,0...
    // （readWaveDocument 对 isClockPattern 的交替时钟做主步重建，仿真仍能拿到时钟沿；
    //   只影响自动添加的时钟预填，不动用户已画好的波形。）
    if (signal.kind === "clock" && Array.isArray(native.values)) {
      for (let i = 0; i < native.values.length; i += 1) native.values[i] = (i % 2 === 0) ? 1 : 0;
      if (Array.isArray(native.labels)) native.labels.fill("");
    }
    existing.push(native);
    names.add(key);
    added += 1;
  }
  dw.m_sampleCount = Math.max(dw.m_sampleCount || 0, timeSteps);
  window.drawWaveform?.();
  window.updateSidePanels?.();
  render();
  setStatus(added
    ? `Added ${added} port signal(s) to canvas${skipped ? `, skipped ${skipped} (output/existing).` : "."}`
    : `No new signals added (${skipped} skipped).`);
}

function summarizeOutputs(outputs) {
  if (!Array.isArray(outputs) || !outputs.length) return "none";
  return outputs.map((signal) => {
    const width = Math.max(1, Number(signal.width) || 1);
    const finalValue = signal.values?.[signal.values.length - 1];
    const formatted = width > 1
      ? busLabel(finalValue, width, "hexadecimal")
      : normalizeVectorValue(finalValue, 1);
    return `${signal.name}=${formatted}`;
  }).join("; ");
}

function render() {
  if (!wavepaintReady()) return;
  const project = readWaveDocument();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  replaceInjectedOutputs(state.outputs);
  window.drawWaveform?.();
  window.updateSidePanels?.();
  const outputCount = state.outputs && state.outputs.length ? state.outputs.length : 0;
  setStatus(outputCount ? `${outputCount} output signal(s) ready.` : "No output signals.");
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
  refs.addSignals?.addEventListener("click", addPortSignalsToCanvas);
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
