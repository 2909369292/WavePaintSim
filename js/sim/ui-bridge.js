import { buildAutoTestbench, buildSimulationPayload, createPortStimulus, createSignalFromPort, diagnoseSimulation, parseVerilogDesign, vcdToProjectOutputs } from "./engine.js";
import { formatVectorValue, normalizeVectorValue } from "./project-model.js";
import { buildRtlNav } from "./rtl-nav.js";
import { buildVcdHierarchy } from "./vcd-index.js";
import { installCodeEditor, renderRtlTree, renderVcdTree } from "./rtl-panel.js";

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
  selectedTop: null, // 多模块设计时用户选定的顶层模块名（null = 自动检测）
  outputs: [],
  lastTestbench: "",
  lastBindings: [],
  readyTimer: null,
  ready: false,
  vcd: null // #75 P0：最近一次成功仿真解析出的 VCD（parseVcd 产物），供 VCD 层次树使用
};

const refs = {};
let sourceCodeView = null;      // #75 P0：CodeMirror 6 控制器（installCodeEditor 返回值）
let rtlRefreshTimer = null;     // 编辑后防抖刷新 RTL 树

// WavePaint 核心的 Bit 值数字编码（window.__wpConstants.WaveValue 默认值）：
//   0=低, 1=高, -1=未定义(x), 2=高阻(z), 3=上拉(u), 4=下拉(d)
// 核心渲染 Bit 波形时只识别这些数字；若 values 是字符串 "0"/"1" 等，
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

// 总线标签统一不带 0x/0b 前缀（与 core/wpf.js 的 busRadixLabel 口径一致）
function busLabel(value, width, radix) {
  return String(formatVectorValue(value, width, radix || "hexadecimal")).replace(/^0[xXbB]/, "");
}

// 反向：核心数字编码 → 字符串（供仿真/项目模型使用）
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
// 单信号 divisor：与 core/wpf.js 的 wpf.divisorOf 同口径 —— 信号带私有 subSteps
// （>0）时用自己的（子步+1），否则跟随全局。私有行 values 长度 = 主步数 × 私有
// divisor，若按全局 stride 采样会取错列（波形错位、TB 时序错）。
function signalDivisor(sig) {
  const own = Number(sig?.subSteps);
  return (Number.isFinite(own) && own > 0) ? own + 1 : canvasSubSteps() + 1;
}

function canvasTimeSteps() {
  const spinEl = document.querySelector("#sample-spin");
  const spinValue = spinEl ? Number(spinEl.value) : NaN;
  const dw = window.document_wave;
  // 回退值按数据模型换算回主步数（values 长度 = 主步数 × (子步+1)）。
  // 私有 subSteps 信号按自己的 divisor 换算，勿用全局 stride（会算错主步数）。
  const existingMax = (Array.isArray(dw?.m_signals) ? dw.m_signals : [])
    .reduce((max, sig) => Math.max(max, Array.isArray(sig?.values) ? Math.floor(sig.values.length / signalDivisor(sig)) : 0), 0);
  const steps = (Number.isFinite(spinValue) && spinValue > 0 ? spinValue : 0)
    || Number(dw?.m_sampleCount || 0)
    || existingMax
    || 24;
  return Math.max(4, steps);
}

// 画布有效采样数 = 主步数 × (子步+1)，与 WavePaint 核心数据模型一致：
// 每个时间步在 values 中占 (子步+1) 个下标，主值为该步第 1 个值。
//
// ⚠ 口径必须与 core/wpf.js 的 wpf.subSteps() 完全一致（允许 0）。
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

// 创建核心 Signal（new window.Signal）。length 为画布有效长度（主步数 × (子步+1)）；
// output.values 按主步给出（长度 = 主步数），这里按模型铺开：每个主步的
// (子步+1) 个格子都填该步的主值，与核心绘制/导出/仿真采样语义一致。
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
  refs.cmHost = el("verilog-cm-host");
  refs.rtlTree = el("rtl-tree");
  refs.vcdTree = el("vcd-tree");
  refs.portPreview = el("port-preview");
  refs.modulePreview = el("module-preview");
  refs.status = el("sim-status");
  refs.addFile = el("sim-addfile");
  refs.removeFile = el("sim-removefile");
  refs.parseBtn = el("sim-parse");
  refs.topRow = el("sim-top-row");
  refs.topSelect = el("sim-top-select");
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
    setStatus("没有可复制的 testbench，请先点「生成 TB」或「运行仿真」。");
    return;
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard.writeText(text)
      .then(() => setStatus("TB 已复制到剪贴板。"))
      .catch(() => setStatus("复制失败，请手动选择文本复制。"));
  } else {
    setStatus("当前环境剪贴板不可用。");
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

// #75 P0：把 CodeMirror 6 挂到 .cm-host。可用时隐藏 textarea（仍保留为数据镜像，
// syncEditor 等旧读路径继续读 .value）；bundle 缺失则降级回纯 textarea。
function initSourceCodeView() {
  if (!refs.cmHost || !refs.sourceEditor) return;
  sourceCodeView = installCodeEditor({
    host: refs.cmHost,
    textarea: refs.sourceEditor,
    doc: currentFile()?.content || "",
    onChange: (text) => {
      // 用户编辑：与旧 textarea input 处理一致（存回文件 + 重绘 + 防抖刷新结构树）
      void text;
      syncEditor();
      render();
      scheduleRtlTreeRefresh();
    }
  });
  const usingCm = !!sourceCodeView.active;
  refs.cmHost.style.display = usingCm ? "block" : "none";
  refs.sourceEditor.style.display = usingCm ? "none" : "";
}

// 程序性写入当前源码（切文件/新建/载入）。CM 可用时由控制器同步并重建文档；
// 否则直接写 textarea。永远不同时写两处（textarea 由 CM 控制器镜像）。
function setEditorText(text) {
  const value = String(text || "");
  if (sourceCodeView?.active) {
    sourceCodeView.setText(value);
  } else if (refs.sourceEditor) {
    refs.sourceEditor.value = value;
  }
}

function jumpToEditorLine(line) {
  if (sourceCodeView?.active) {
    sourceCodeView.jumpToLine(line);
    return;
  }
  // 无 CM 时跳到 textarea（尽量定位行首）
  refs.sourceEditor?.focus();
}

// 防抖：用户连续编辑时只在停顿 350ms 后重建一次 RTL 树（避免每键全量重排 DOM）
function scheduleRtlTreeRefresh() {
  if (rtlRefreshTimer) clearTimeout(rtlRefreshTimer);
  rtlRefreshTimer = window.setTimeout(() => {
    rtlRefreshTimer = null;
    refreshStructureTrees();
  }, 350);
}

function refreshVcdTree() {
  if (!refs.vcdTree) return;
  const index = state.vcd ? buildVcdHierarchy(state.vcd) : null;
  renderVcdTree(refs.vcdTree, index, (path) => {
    setStatus(`VCD 信号完整路径：${path}`);
  });
}

// 重建 RTL 结构树（纯数据 buildRtlNav 从 state.files 现算，不依赖 state.design）。
// 点击节点：若在其它文件先切换标签页，再跳到对应源码行。
function refreshStructureTrees() {
  if (!refs.rtlTree && !refs.vcdTree) return;
  if (refs.rtlTree) {
    const nav = buildRtlNav(state.files);
    renderRtlTree(refs.rtlTree, nav, (target) => {
      if (!target) return;
      if (typeof target.fileIndex === "number" && target.fileIndex !== state.active) {
        syncEditor();
        state.active = target.fileIndex;
        renderFileTabs();
      }
      if (Number(target.line) > 0) jumpToEditorLine(target.line);
      if (target.kind === "module" && target.name) {
        setStatus(`已定位到 module ${target.name}（第 ${target.line} 行）。`);
      }
    });
  }
  refreshVcdTree();
}

function readWaveDocument() {
  const dw = window.document_wave;
  const signals = stripInjectedSignals(dw?.m_signals || []);
  const timeSteps = canvasTimeSteps();
  // 数据模型采样：每个主步占 (子步+1) 个 values 下标，主值 = 该步第 1 个值。
  // 旧数据（长度恰好 = 主步数）按下标直取，保证向后兼容。
  // ⚠ 带私有 subSteps 的信号按自己的 divisor 采样（signalDivisor）。

  return {
    name: "WavePaintClean",
    timeSteps,
    subSteps: canvasSubSteps(),
    zoom: 1,
    selectedSignalId: null,
    signals: signals.map((sig, index) => {
      const rawValues = Array.isArray(sig?.values) ? sig.values : [];
      // 私有 subSteps 行按自己的 divisor 采样与驱动（勿用全局 stride，会错位）
      const ownDivisor = signalDivisor(sig);
      const width = inferWidth(sig, rawValues);
      // 位宽 1 的信号一律按「每格序列」传给 buildAutoTestbench，由 TB 用分数时间
      // 逐格驱动（每格 1/divisor 时间单位，一个主步内完成翻转 → 每主步一个上升沿）。
      // ⚠ 不再要求 isClockPattern/kind=clock：导入的 JSON（WaveDrom）信号可能
      //    没有该标记（如 clk 在 JSON 里用 'p' 半周期脉冲表示，展开后无 isClockPattern），
      //    否则 TB 退回「主步整值驱动」→ 主步内 clk 不翻转 → 无上升沿 → 输出恒 0
      //    （用户实测：导入波形文件后仿真全 0，TB 中 clock 错误）。
      //    逐格驱动忠实地反映画布真实波形——对交替数据信号反而比主步采样更正确。
      const clockCells = width <= 1 && rawValues.length >= 2
        ? rawValues.map(fromNativeBitValue) : undefined;
      const values = Array.from({ length: timeSteps }, (_, cell) => {
        // 兜底采样：主值（每步第 1 个）优先；若主值为 x/空，取该主步内第一个确定值。
        // 解决“用户画在子步下标（奇数）时仿真采不到”导致的恒 0 问题。
        const raw = sampleMainValue(rawValues, ownDivisor, cell, timeSteps);
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
        // 逐格驱动的时间基准：该信号每主步占几个格子（私有 subSteps 行与全局不同）
        cellStride: ownDivisor,
        labels: Array.from({ length: timeSteps }, (_, cell) => width > 1 ? busLabel(values[cell], width, "hexadecimal") : "")
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

// 多模块设计：按用户选定（或自动检测）的顶层产出可用于 TB 生成的 design 视图
function effectiveDesign() {
  const design = state.design;
  if (!design || !state.selectedTop || design.topName === state.selectedTop) return design;
  const top = (design.modules || []).find((m) => m.name === state.selectedTop);
  if (!top) return design;
  return { ...design, topModule: top, topName: top.name };
}

// 解析后填充顶层模块选择器（多模块时显示；单模块隐藏）
function syncTopSelector() {
  const design = state.design;
  if (!refs.topRow || !refs.topSelect) return;
  if (!design || !design.moduleCount || design.moduleCount < 2) {
    refs.topRow.style.display = "none";
    state.selectedTop = null;
    return;
  }
  refs.topRow.style.display = "flex";
  refs.topSelect.innerHTML = "";
  for (const m of design.modules) {
    const opt = document.createElement("option");
    opt.value = m.name;
    opt.textContent = `${m.name}（端口 ${m.ports.length}）`;
    refs.topSelect.appendChild(opt);
  }
  refs.topSelect.value = design.topName;
  state.selectedTop = design.topName;
}

function parseDesign() {
  onWavepaintReady();
  syncEditor();
  const design = parseVerilogDesign(sourceText());
  state.design = design;
  if (!design.modules || !design.modules.length) {
    refs.portPreview.textContent = "⚠ 未识别到任何 module。请检查 RTL 语法：module/endmodule 是否匹配、模块名是否合法。";
    refs.modulePreview.textContent = "解析失败：未找到 module。";
    setStatus("解析失败：未找到 module。");
    refreshStructureTrees();
    render();
    return;
  }
  const topPorts = design.topModule?.ports || [];
  refs.portPreview.textContent = topPorts.length
    ? `${design.topName}: ${topPorts.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
    : `⚠ ${design.topName} 未解析到端口。请检查端口声明写法（ANSI 或非 ANSI 均可）。`;
  refs.modulePreview.textContent = [
    `模块数：${design.moduleCount}`,
    ...design.modules.map((moduleInfo) => `${moduleInfo.name}：端口 ${moduleInfo.ports.length} 个，实例 ${moduleInfo.instances.length} 个`)
  ].join("\n");
  setStatus(`已解析 ${design.moduleCount} 个模块。`);
  syncTopSelector();
  refreshStructureTrees();
  render();
}

function buildTbPreview() {
  onWavepaintReady();
  syncEditor();
  const design = effectiveDesign() || parseVerilogDesign(sourceText());
  state.design = design;
  syncTopSelector();
  const project = readWaveDocument();
  const result = buildAutoTestbench(design, project);
  if (!result.ok) {
    refs.modulePreview.textContent = result.error;
    setStatus("TB 生成失败：" + result.error);
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
  state.lastTestbench = result.source;
  state.lastBindings = result.bindings;
  updateTbViewer();
  const notes = diagnoseSimulation([], result.bindings);
  refs.modulePreview.textContent = [
    `端口绑定 ${result.bindings.length} 条：`,
    ...result.bindings.map((binding) => `${binding.port.name} → ${binding.signal ? binding.signal.name : "（未绑定）"} [${binding.strategy}]`),
    ...(notes.length ? ["", ...notes] : [])
  ].join("\n");
  setStatus(notes.length
    ? `已为 ${design.topName} 生成 TB，有 ${notes.length} 条提醒，请查看详情。`
    : `已为 ${design.topName} 生成 TB。`);
  render();
}

async function runSimulation() {
  onWavepaintReady();
  // ⚠ 核心未就绪时旧实现静默跑出一次「全 0 激励的空仿真」，用户以为仿真坏了。
  // 这里显式拦截并提示（2026-09-04）。
  if (!wavepaintReady()) {
    setStatus("画布尚未就绪，请稍候 1 秒再点「运行仿真」。");
    return;
  }
  syncEditor();
  // 新一轮仿真开始前清空旧的 VCD 层次（失败时保持「暂无」占位，避免展示过期结果）
  state.vcd = null;
  refreshVcdTree();
  // 读画布 → 生成 TB 若抛异常会导致 sim 按钮静默无响应（用户反馈"第二次仿真失效"）。
  // 这里显式捕获并展示，让问题可定位。
  let design, project, tbResult;
  try {
    design = effectiveDesign() || parseVerilogDesign(sourceText());
    state.design = design;
    project = readWaveDocument();
    tbResult = buildAutoTestbench(design, project);
  } catch (error) {
    const detail = String(error && error.stack ? error.stack : error);
    refs.modulePreview.textContent = "TB 生成失败：" + detail.slice(0, 500);
    setStatus("TB 生成失败：" + String(error).slice(0, 200));
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

  setStatus(`正在为 ${design.topName} 运行仿真...`);
  refs.modulePreview.textContent = "正在运行真实仿真（iverilog）...";
  const payload = buildSimulationPayload(state.files, tbResult.source);

  try {
    const response = await fetch("/api/sim", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: payload
    });
    // ⚠ 旧实现不检查 response.ok：服务端 500 + 空 body 时会「正常走完」vcdToProjectOutputs("")
    // 显示「仿真完成：0 个输出信号」，掩盖真实故障（2026-09-04 修）。
    if (!response.ok) {
      throw new Error(`本地仿真服务返回 HTTP ${response.status}`);
    }
    const text = await response.text();
    if (/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):/.test(text)) {
      const error = text.replace(/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):\s*/, "").trim();
      refs.modulePreview.textContent = error || "仿真失败。";
      state.outputs = [];
      render();
      setStatus(error || "仿真失败。");
      return;
    }

    const { parsed, outputs } = vcdToProjectOutputs(text, project);
    state.outputs = outputs;
    state.vcd = parsed;
    replaceInjectedOutputs(outputs);
    state.lastTestbench = tbResult.source;
    state.lastBindings = tbResult.bindings;
    updateTbViewer();
    // 结果诊断：输出全 0 / 全 x 或存在未绑定端口时，直接给出可操作的提示，
    // 避免用户面对「静默的全 0」无从下手。
    const notes = diagnoseSimulation(outputs, tbResult.bindings);
    refs.modulePreview.textContent = [
      `仿真完成：${outputs.length} 个输出信号，时长 tmax ${parsed.tmax}`,
      `末值：${summarizeOutputs(outputs)}`,
      ...(notes.length ? ["", ...notes] : [])
    ].join("\n");
    render();
    refreshStructureTrees();
    setStatus(notes.length
      ? `仿真完成：${outputs.length} 个输出信号，但有 ${notes.length} 条提醒，请查看详情。`
      : `仿真完成：${outputs.length} 个输出信号。`);
  } catch (error) {
    const message = String(error);
    const friendly = /fetch/i.test(message)
      ? "仿真请求失败：本地仿真服务无响应（Failed to fetch）。\n"
        + "可能原因：\n"
        + "  1. 应用进程已退出（窗口检测或异常导致）\n"
        + "  2. iverilog 编译/仿真卡死或超时\n"
        + "  3. RTL 含导致 iverilog 崩溃的内容\n"
        + "请重启应用，或查看日志：%TEMP%\\WavePaintClean_sim.log"
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
  const design = effectiveDesign() || parseVerilogDesign(sourceText());
  state.design = design;
  const ports = design?.topModule?.ports || [];
  if (!ports.length) {
    setStatus(`在 ${design.topName || "设计"} 中未找到端口，请先「解析 RTL」。`);
    return;
  }
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) {
    setStatus("画布尚未就绪，请稍后再试。");
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
    ? `已添加 ${added} 个端口信号到画布${skipped ? `，跳过 ${skipped} 个（输出/已存在）。` : "。"}`
    : `没有新添加的信号（跳过 ${skipped} 个）。`);
}

function summarizeOutputs(outputs) {
  if (!Array.isArray(outputs) || !outputs.length) return "（无）";
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
  setStatus(outputCount ? `${outputCount} 个输出信号已就绪。` : "暂无输出信号，点「运行仿真」后回填。");
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
      setEditorText(currentFile()?.content || "");
      renderFileTabs();
    });
    return chip;
  }));
  setEditorText(currentFile()?.content || "");
  scheduleRtlTreeRefresh();
}

function addFile() {
  const name = prompt("源文件名", `file_${state.files.length + 1}.sv`);
  if (!name) return;
  syncEditor();
  state.files.push({ id: `file_${state.files.length}`, name, content: "" });
  state.active = state.files.length - 1;
  renderFileTabs();
  setStatus(`已添加 ${name}。`);
  render();
}

function removeFile() {
  if (state.files.length <= 1) return;
  syncEditor();
  state.files.splice(state.active, 1);
  state.active = Math.max(0, state.active - 1);
  renderFileTabs();
  setStatus("已移除当前文件。");
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
  refs.topSelect?.addEventListener("change", () => {
    state.selectedTop = refs.topSelect.value || null;
    const design = effectiveDesign();
    const ports = design?.topModule?.ports || [];
    refs.portPreview.textContent = ports.length
      ? `${design.topName}: ${ports.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
      : `⚠ ${design.topName} 未解析到端口。`;
    setStatus(`顶层模块已切换为 ${design.topName}，点「自动加信号」或「生成 TB」生效。`);
  });
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
  initSourceCodeView();
  bindEvents();
  renderFileTabs();
  refreshStructureTrees();
  document.body.classList.add("sim-open");
  onWavepaintReady();
  if (!state.readyTimer) {
    state.readyTimer = window.setInterval(onWavepaintReady, 100);
  }
  showAppVersion();
}

// 版本显示（批次10）：读取构建时内嵌的 /version.txt（构建时间 + git 短哈希），
// 展示在仿真面板头部。用户可自查「是不是旧 exe」——历史事故：误启旧副本
// 表现为「修复没生效」。开发服务器下 version.txt 可能不存在，静默留空。
function showAppVersion() {
  const elVer = document.getElementById("app-version");
  if (!elVer) return;
  fetch("version.txt", { cache: "no-store" })
    .then((r) => (r.ok ? r.text() : ""))
    .then((t) => {
      const text = String(t || "").replace(/^\uFEFF/, "").trim();
      if (text) {
        elVer.textContent = text;
        elVer.title = text;
        console.info("[WavePaint] " + text);
      }
    })
    .catch(() => { /* 无版本文件（如 dev-server）：留空 */ });
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
