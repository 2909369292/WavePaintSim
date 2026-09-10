import { buildAutoTestbench, buildSimulationPayload, createPortStimulus, createSignalFromPort, diagnoseSimulation, parseVerilogDesign, vcdToProjectOutputs } from "./engine.js";
import { formatVectorValue, normalizeVectorValue } from "./project-model.js";
import { buildRtlNav, buildSymbolIndex, collectModuleDefs, moduleAtLine, resolveModuleDef, resolveSymbolVcdPaths } from "./rtl-nav.js";
import { buildVcdHierarchy, findVcdPathsByName } from "./vcd-index.js";
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
  vcd: null, // #75 P0：最近一次成功仿真解析出的 VCD（parseVcd 产物），供 VCD 层次树使用
  simWatches: [] // #85：VCD 树点信号加入画布的「观察行」登记（{path,name,width,reference}）
};

const refs = {};
let sourceCodeView = null;      // #75 P0：CodeMirror 6 控制器（installCodeEditor 返回值）
let rtlRefreshTimer = null;     // 编辑后防抖刷新 RTL 树
let simAutoRetried = false;     // Bug1：/api/sim 网络失败后最多自动重试一次（用户重新点击时复位）
// #86：服务自愈到「另一个回环端口」时把 /api/sim 指向那里（服务端对回环 origin 放行
// CORS，且 text/plain 属简单请求不触发预检）。空串 = 同源（绝大多数情况）。
let simApiBase = "";
const SIM_REQUEST_TIMEOUT_MS = 45000; // 兜底：iverilog 卡死/服务假死时提示超时，避免无限「正在运行...」

function simApiUrl(path) { return (simApiBase || "") + path; }

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

// #85：观察行（VCD 树点信号 → 加入画布）------------------------------------
// 全路径键与 VCD 树/层次索引口径一致：scope 点分 path + '.' + signal.name
// （state.vcd = parseVcd 产物，每条含 scope/name/reference/width/steps）。
function vcdSignalByFullPath(path) {
  const signals = state.vcd?.signals || [];
  return signals.find((signal) => {
    const scope = String(signal?.scope || "");
    const full = scope ? `${scope}.${signal.name}` : String(signal?.name || "");
    return full === path;
  }) || null;
}

// 按主步采样 VCD steps → values[]（口径复制 engine.vcdToProjectOutputs 内部
// buildOutputs：格子 i ↔ VCD 时间 round(i * tmax / timeSteps)，游标推进到
// 最后一个 ≤ 采样点的变化，vector 用 normalizeVectorValue 补位宽）。
function sampleVcdMainValues(vcdSignal, timeSteps) {
  const totalTime = Math.max(1, Number(state.vcd?.tmax) || 0);
  const steps = Array.isArray(vcdSignal?.steps) ? vcdSignal.steps : [];
  const width = Math.max(1, Number(vcdSignal?.width) || 1);
  const values = [];
  let cursor = 0;
  for (let index = 0; index < timeSteps; index += 1) {
    const sampleTime = Math.round((index * totalTime) / timeSteps);
    while (cursor + 1 < steps.length && steps[cursor + 1][0] <= sampleTime) cursor += 1;
    const current = steps[cursor]?.[1] || "0";
    values.push(normalizeVectorValue(current, width));
  }
  return values;
}

// 构建观察行（__simInjected:true + __simWatchPath），replaceInjectedOutputs 与
// 点击加入共用同一口径。state.vcd 无该路径数据时返回 null（调用方跳过）。
function buildWatchSignal(watch, index, template, effectiveCount) {
  const vcdSignal = vcdSignalByFullPath(watch?.path);
  if (!vcdSignal) return null;
  const width = Math.max(1, Number(vcdSignal.width) || 1);
  const output = {
    id: `watch_${index}`,
    name: watch?.path || vcdSignal.name,
    role: "result",
    kind: width > 1 ? "vector" : "logic",
    width,
    msb: width > 1 ? String(width - 1) : "",
    lsb: width > 1 ? "0" : "",
    radix: "hexadecimal",
    values: sampleVcdMainValues(vcdSignal, canvasTimeSteps())
  };
  const row = toNativeSignal(output, index, template, effectiveCount, {
    kind: width > 1 ? "vector" : "logic",
    injected: true,
    groupName: null,
    groupColor: null,
    groupPath: null
  });
  row.__simWatchPath = watch?.path;
  return row;
}

// 滚动 #wave-view 到指定观察行：画布每行高 40、首行起点 y=40（clean.js drawWaveform
// 的 v5=40/v6=40），行 i 起点 = i*40+40，故 scrollTop = i*40 即把该行顶到可视区。
function scrollWaveToWatchPath(path) {
  const dw = window.document_wave;
  const view = refs.waveView || el("wave-view");
  if (!dw || !view) return;
  const index = (Array.isArray(dw.m_signals) ? dw.m_signals : [])
    .findIndex((signal) => !!signal && signal.__simWatchPath === path);
  if (index >= 0) view.scrollTop = Math.max(0, index * 40);
}

// #76 B4：仿真结果的「画布口径」——只重建**用户主动加入的观察行**（state.simWatches），
// 不再把 VCD 里的输出/内部信号整批灌进画布（用户明确要求：仿真后不要"把所有可看的变量
// 全都添加上去"；加信号统一走「代码里点/选中变量」，见 addSymbolFromCode）。
// state.outputs 仍保留（状态栏统计 / 诊断 / 观察行取数），只是不再落到画布上。
function syncSimRows() {
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) return;
  const currentRows = dw.m_signals;
  // #85：观察行只保留当前画布仍存在的行（用户删行后不复活；想再要可重新点 VCD 行）。
  // 注意要在 strip 之前看原数组 —— 观察行都是 __simInjected，重建后才判断
  // 会把自己误判成“已删除”。
  state.simWatches = (Array.isArray(state.simWatches) ? state.simWatches : []).filter((watch) =>
    !!watch?.path && currentRows.some((signal) => !!signal && signal.__simWatchPath === watch.path)
  );
  const baseSignals = stripInjectedSignals(currentRows);
  // 观察行 values 长度对齐数据模型：主步数 × (子步+1)
  const effectiveCount = Math.max(4, canvasEffectiveCount());
  const template = baseSignals[0] || null;
  const watchRows = state.simWatches
    .map((watch, index) => buildWatchSignal(watch, index, template, effectiveCount))
    .filter((row) => !!row);
  dw.m_signals = [...baseSignals, ...watchRows];
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
  refs.recoverBtn = el("sim-recover"); // 服务彻底死亡时的手动自愈入口（index.html 默认隐藏）
  refs.addFile = el("sim-addfile");
  refs.importFile = el("sim-import");
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
    },
    // #76 B4：代码区取词触发（双击变量名 / 右键菜单 / Ctrl+Alt+W）→ 加波形。
    // rtl-panel 只负责取词与触发，映射与画布落点在这里（见 addSymbolFromCode）。
    onAddSymbol: (context) => addSymbolFromCode(context)
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

// #85：VCD 树信号行 → 加入画布「观察行」。
// - 已在画布（存在同 path 的 __simWatchPath 行）→ 提示 + 滚动定位，不重复加入；
// - 不在画布 → 登记 state.simWatches 并把行立即挂进 m_signals（否则随后
//   render→replaceInjectedOutputs 的“存活同步”会把它当已删除摘掉），render 会按
//   登记统一重放；新一轮仿真后按 VCD 路径自动刷新；用户手动删行会被同步摘除，
//   再次点击可重新加入。
// 观察行带 __simInjected:true：不进 readWaveDocument，绝不参与生成 TB/激励。
function pickVcdSignalIntoWave(path) {
  onWavepaintReady();
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) {
    setStatus("画布尚未就绪，请稍后再试。");
    return;
  }
  const vcdSignal = vcdSignalByFullPath(path);
  if (!vcdSignal) {
    setStatus(state.vcd
      ? `未找到 ${path} 的 VCD 数据（该信号可能未 dump，请检查 TB）。`
      : "暂无 VCD 数据，请先点「运行仿真」再添加信号。");
    return;
  }
  const liveIndex = dw.m_signals.findIndex((signal) => !!signal && signal.__simWatchPath === path);
  if (liveIndex >= 0) {
    setStatus(`信号 ${path} 已在波形中，已滚动定位。`);
    scrollWaveToWatchPath(path);
    return;
  }
  state.simWatches = Array.isArray(state.simWatches) ? state.simWatches : [];
  if (!state.simWatches.some((watch) => watch.path === path)) {
    state.simWatches.push({
      path,
      name: vcdSignal.name,
      width: Math.max(1, Number(vcdSignal.width) || 1),
      reference: vcdSignal.reference || ""
    });
  }
  const watch = state.simWatches.find((entry) => entry.path === path);
  const effectiveCount = Math.max(4, canvasEffectiveCount());
  const template = dw.m_signals[0] || null;
  const row = buildWatchSignal(watch, state.simWatches.length - 1, template, effectiveCount);
  if (row) {
    dw.m_signals.push(row);
    dw.m_sampleCount = Math.max(dw.m_sampleCount || 0, canvasTimeSteps());
  }
  render();
  scrollWaveToWatchPath(path);
  setStatus(`已将 ${path} 加入波形。`);
}

function refreshVcdTree() {
  if (!refs.vcdTree) return;
  const index = state.vcd ? buildVcdHierarchy(state.vcd) : null;
  renderVcdTree(refs.vcdTree, index, (path) => pickVcdSignalIntoWave(path));
}

// #76 B1：当前工程的「模块体内符号索引 + 例化路径」——纯计算、无副作用、不碰画布。
// 顶层优先用用户选定的模块（多模块工程），否则交给自动判顶层（没有被例化过的模块）。
// B4（代码内点变量 → 加波形）与 B3（代码 → 树反向定位）都从这里取数据。
function currentSymbolIndex() {
  const topName = state.selectedTop || state.design?.topModule?.name || "";
  return buildSymbolIndex(buildRtlNav(state.files), { topName });
}

// ---------------------------------------------------------------------------
// #76 B4：代码内「点/选中变量 → 加波形」（Verdi「中追」式，唯一加信号主路径）
// ---------------------------------------------------------------------------
// 分工：rtl-panel 负责**取词与触发**（双击 / 右键 / Ctrl+Alt+W → symbolNameAt）；
// 这里负责**符号 → VCD 全路径 → 画布观察行**：
//   1) B1 符号索引 + 例化路径给出候选（resolveSymbolVcdPaths，按模块/文件/行收窄）；
//   2) **仅在 1) 为空时**才用名称兜底 findVcdPathsByName（隐式 net / TB 本地信号 /
//      未在 RTL 声明的名字）。⚠ 不能无条件并入：那样点 q 会同时列出 DUT 内部
//      tb.dut.q 与 TB 侧连接线 tb.q，把「唯一候选直接加入」降级成每次都要点选。
//   3) 唯一候选 → 直接 pickVcdSignalIntoWave；多候选 → 代码区旁的**轻量选择器**
//      （不是侧栏面板、不显示 RTL 层级树 —— 用户明确要求）；无候选 → 中文提示。
// 观察行走 state.simWatches（#85 链路）：不进 readWaveDocument、不生成激励。

// 轻量候选选择器（单例）。挂在 document.body 上绝对定位，点击项 = 加入波形，
// 点击别处 / Esc = 关闭。
let symbolPicker = null;

function closeSymbolPicker() {
  if (!symbolPicker) return;
  if (symbolPicker.teardown) symbolPicker.teardown();
  if (symbolPicker.node?.parentNode) symbolPicker.node.parentNode.removeChild(symbolPicker.node);
  symbolPicker = null;
}

function showSymbolPicker(name, paths, anchor) {
  closeSymbolPicker();
  const box = document.createElement("div");
  box.className = "sim-symbol-picker";
  box.setAttribute("role", "listbox");
  const title = document.createElement("div");
  title.className = "sim-symbol-picker-title";
  title.textContent = `${name} 匹配到 ${paths.length} 个信号，点一个加入波形：`;
  box.appendChild(title);
  for (const path of paths) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "sim-symbol-picker-item";
    item.textContent = path;
    item.title = `加入波形：${path}`;
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeSymbolPicker();
      pickVcdSignalIntoWave(path);
    });
    box.appendChild(item);
  }
  document.body.appendChild(box);
  // 定位：优先贴触发点（鼠标位置），否则贴代码区；再夹进视口内。
  const rect = box.getBoundingClientRect();
  const hostRect = refs.cmHost?.getBoundingClientRect?.();
  const baseX = Number(anchor?.x) > 0 ? Number(anchor.x) : (hostRect ? hostRect.left + 16 : 40);
  const baseY = Number(anchor?.y) > 0 ? Number(anchor.y) : (hostRect ? hostRect.top + 24 : 80);
  const maxX = Math.max(8, (window.innerWidth || 800) - rect.width - 8);
  const maxY = Math.max(8, (window.innerHeight || 600) - rect.height - 8);
  box.style.left = `${Math.round(Math.min(Math.max(8, baseX), maxX))}px`;
  box.style.top = `${Math.round(Math.min(Math.max(8, baseY), maxY))}px`;
  const onDocDown = (event) => { if (!box.contains(event.target)) closeSymbolPicker(); };
  const onKeyDown = (event) => { if (String(event.key) === "Escape") closeSymbolPicker(); };
  document.addEventListener("mousedown", onDocDown, true);
  window.addEventListener("keydown", onKeyDown, true);
  symbolPicker = {
    node: box,
    teardown() {
      document.removeEventListener("mousedown", onDocDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    }
  };
  box.querySelector(".sim-symbol-picker-item")?.focus?.();
}

// context：{ name, line, fileIndex?, selection?, exact?, via?, anchor? }
// rtl-panel 传的是 {name, line, selection, exact, source, via, anchor}（无 fileIndex
// —— 代码区当前必然显示 state.active 那个文件）；自动化入口可显式传 fileIndex。
function addSymbolFromCode(context) {
  onWavepaintReady();
  const info = context || {};
  const name = String(info.name || "").trim();
  if (!name) {
    setStatus("未选中变量名：把光标放到信号名上（或选中它）再按 Ctrl+Alt+W。");
    return;
  }
  const fileIndex = Number.isFinite(Number(info.fileIndex)) ? Number(info.fileIndex) : state.active;
  const line = Number(info.line) > 0 ? Number(info.line) : 0;
  const index = currentSymbolIndex();
  // 用「光标所在行 → 所属模块」收窄，比直接用行号更稳（光标行通常不是声明行）：
  // 命中多个模块同名信号时优先当前模块；收窄后为空则 resolveSymbolVcdPaths 自动忽略条件。
  const moduleName = String(moduleAtLine(index, fileIndex, line)?.name || "");
  const resolved = resolveSymbolVcdPaths(index, name, { moduleName, fileIndex, line });
  const paths = resolved.paths.slice();
  if (!paths.length) {
    for (const path of findVcdPathsByName(state.vcd, name)) {
      if (!paths.includes(path)) paths.push(path);
    }
  }
  if (!paths.length) {
    setStatus(state.vcd
      ? `未在 VCD 中找到信号 ${name}（可能未被 dump，或该名字不是信号）。`
      : "暂无 VCD 数据，请先点「运行仿真」再添加信号。");
    return;
  }
  if (paths.length === 1) {
    pickVcdSignalIntoWave(paths[0]);
    if (resolved.fuzzy) setStatus(`已将 ${paths[0]} 加入波形（注意：大小写与 RTL 声明不完全一致）。`);
    return;
  }
  showSymbolPicker(name, paths, info.anchor);
  setStatus(`${name} 有 ${paths.length} 个候选信号，请在代码区旁的选择器里点选。`);
}

// 切到目标文件并跳到目标行（跨文件先同步当前编辑内容，再切标签页）。
function gotoSource(fileIndex, line) {
  if (typeof fileIndex === "number" && fileIndex !== state.active && state.files[fileIndex]) {
    syncEditor();
    state.active = fileIndex;
    renderFileTabs();
  }
  if (Number(line) > 0) jumpToEditorLine(Number(line));
}

// 重建 RTL 结构树（纯数据 buildRtlNav 从 state.files 现算，不依赖 state.design）。
// 点击语义（#86 A2，仿 Verdi nTrace）：
//   · 模块行  → 跳到该 module 的定义行；
//   · 实例行  → 按 moduleName 查「模块定义候选」，同文件直跳 / 跨文件先切 tab 再跳；
//              无定义（黑盒 / 外部 IP）→ 中文提示并退回例化点；
//              同名多处定义 → 优先同文件，并在状态栏说明候选数；
//   · 实例行右键 / Alt+左键 → 跳到**例化点行**（次入口，保留原有能力）。
function refreshStructureTrees() {
  if (!refs.rtlTree && !refs.vcdTree) return;
  if (refs.rtlTree) {
    const nav = buildRtlNav(state.files);
    const defs = collectModuleDefs(nav);
    renderRtlTree(refs.rtlTree, nav, (target) => {
      if (!target) return;
      if (target.kind === "instance") {
        const moduleName = String(target.moduleName || "");
        const { def, candidates, fuzzy } = resolveModuleDef(defs, moduleName, target.fileIndex);
        if (!def) {
          gotoSource(target.fileIndex, target.line);
          setStatus(`未找到模块 ${moduleName} 的源码定义（可能是黑盒或外部 IP），已定位到例化点第 ${target.line} 行。`);
          return;
        }
        gotoSource(def.fileIndex, def.line);
        const where = `${def.file}:${def.line}`;
        const extras = [];
        if (fuzzy) extras.push(`注意：定义名大小写与 ${moduleName} 不完全一致`);
        if (candidates.length > 1) extras.push(`同名模块共 ${candidates.length} 处定义，已跳到${def.fileIndex === target.fileIndex ? "同文件" : "第一处"}候选`);
        setStatus(`已定位到 module ${def.name} 的定义（${where}）${extras.length ? "　" + extras.join("；") + "。" : "。"}`);
        return;
      }
      // "instanceSite"（次入口）：实例化语句所在行
      gotoSource(target.fileIndex, target.line);
      if (target.kind === "instanceSite") {
        setStatus(`已定位到 ${target.moduleName || ""} 的例化点（第 ${target.line} 行）。`);
      } else if (target.kind === "module" && target.name) {
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

// Bug1：探活 —— 快速 GET api/ping（带超时）。用于区分「服务进程已死」与
// 「服务瞬时重启/自愈中」：后者 ping 能在几百 ms 内成功，前者会失败。
// 2026-09-10 根治「点仿真无响应」：优先用 WPServiceGuard 的「带身份标识」判活
// （PING_TAG），避免把「占用同一端口的第三方服务」误判成本应用在线；
// 同时保留裸 api/ping 兜底 —— dev-server / 旧 exe 只回 "OK"，没有标识行。
function probePlainPing(timeoutMs = 800) {
  return new Promise((resolve) => {
    const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (controller) { try { controller.abort(); } catch (e) { /* ignore */ } }
      resolve(false);
    }, timeoutMs);
    fetch("api/ping", {
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    }).then((response) => {
      clearTimeout(timer);
      resolve(!!(response && response.ok));
    }).catch(() => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function probeServerAlive(timeoutMs = 800) {
  const guard = window.WPServiceGuard;
  const tagged = (guard && typeof guard.ping === "function")
    ? guard.ping(timeoutMs).then((found) => !!found).catch(() => false)
    : Promise.resolve(false);
  const plain = probePlainPing(timeoutMs);
  // 已经切到别的回环 origin 时，也要把它算进去（否则会误判离线反复触发自愈）
  const relocated = (simApiBase && guard && typeof guard.pingOrigin === "function")
    ? guard.pingOrigin(simApiBase, timeoutMs).then((found) => !!found).catch(() => false)
    : Promise.resolve(false);
  return Promise.all([tagged, plain, relocated]).then((list) => list.some(Boolean));
}

// 服务自愈：把「服务无响应」变成「可用」。依赖 js/core/service-guard.js。
//   alive / restarted → 服务已可用（同源），调用方可直接重试 /api/sim
//   elsewhere         → 服务在「另一个」回环端口上：只把 simApiBase 指过去（不跳转，
//                       跳转会把用户未保存的画布内容全丢掉）
//   dead              → 自动恢复失败，需给出「手动拉起 / 重启应用」指引
// WPServiceGuard 缺失时（旧 exe 内嵌旧页面 / 极端降级）返回 dead，行为退回旧提示。
async function recoverService(options) {
  const guard = window.WPServiceGuard;
  if (!guard || typeof guard.recover !== "function") return { state: "dead" };
  try {
    return await guard.recover(options || {});
  } catch (error) {
    return { state: "dead" };
  }
}

// 自动恢复失败时的兜底：展示可操作指引 + 亮出手动「启动本地仿真服务」按钮。
function showRecoverHint() {
  const message = "本地仿真服务无响应，自动恢复失败。\n"
    + "  1. 点下方「启动本地仿真服务」再试（首次浏览器会问是否允许打开 wavepaint:，请选择允许）\n"
    + "  2. 仍失败时：手动双击应用目录下的 WavePaintClean.exe 重新打开\n"
    + "  3. 排查日志：%TEMP%\\WavePaintClean_sim.log";
  refs.modulePreview.textContent = message;
  setStatus("本地仿真服务无响应，请点下方按钮重试或重启应用。");
  if (refs.recoverBtn) refs.recoverBtn.style.display = "block";
}

// 自动恢复进行中：先把手动入口亮出来（用户可立即点，不必干等），但文案**不说**
// 「失败」——旧实现先弹「自动恢复失败」再继续尝试自动拉起，字样一闪而过很误导。
function showRecoverPending() {
  refs.modulePreview.textContent = "本地仿真服务无响应，正在自动恢复（重连 / 重新拉起服务）...\n"
    + "  也可以立即点下方「启动本地仿真服务」手动拉起。";
  setStatus("本地仿真服务无响应，正在自动恢复...");
  if (refs.recoverBtn) refs.recoverBtn.style.display = "block";
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

  const simAbort = (typeof AbortController !== "undefined") ? new AbortController() : null;
  const simTimeoutId = simAbort
    ? setTimeout(() => { try { simAbort.abort(); } catch (e) { /* ignore */ } }, SIM_REQUEST_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(simApiUrl("/api/sim"), {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: payload,
      signal: simAbort ? simAbort.signal : undefined
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
    // #76 B4：输出不再整批灌进画布；只按 VCD 路径重建用户已加入的观察行。
    syncSimRows();
    state.lastTestbench = tbResult.source;
    state.lastBindings = tbResult.bindings;
    updateTbViewer();
    // 结果诊断：输出全 0 / 全 x 或存在未绑定端口时，直接给出可操作的提示，
    // 避免用户面对「静默的全 0」无从下手。
    const notes = diagnoseSimulation(outputs, tbResult.bindings);
    refs.modulePreview.textContent = [
      `仿真完成：${outputs.length} 个输出信号，时长 tmax ${parsed.tmax}`,
      "加信号：在左侧代码里双击变量名（或选中后按 Ctrl+Alt+W / 右键）即可加入波形。",
      `末值：${summarizeOutputs(outputs)}`,
      ...(notes.length ? ["", ...notes] : [])
    ].join("\n");
    render();
    refreshStructureTrees();
    if (refs.recoverBtn) refs.recoverBtn.style.display = "none"; // 仿真成功 → 收起自愈入口
    setStatus(notes.length
      ? `仿真完成：${outputs.length} 个输出信号，但有 ${notes.length} 条提醒，请查看详情。在代码里双击变量名可加入波形。`
      : `仿真完成：${outputs.length} 个输出信号。在代码里双击变量名（或 Ctrl+Alt+W）即可加入波形。`);
  } catch (error) {
    // Bug1（2026-09-09）：失败要区分「服务进程已死」与「服务瞬时重启/自愈中」。
    // 旧实现任何 fetch 失败都只提示“请重启应用” —— launcher 的 AcceptLoop 异常自愈
    // （RestartServer 同端口重绑）会造成几秒窗口内请求被丢弃，但服务其实马上恢复，
    // 用户再点一次就成功；旧提示会让用户误以为服务永久离线。这里先探活：
    //   探活成功 + 未自动重试过 → 静默自动重试一次（绝大多数自愈场景一次即成功）；
    //   探活成功 + 已重试过    → 服务在线但请求没完成（iverilog 卡死等），给准确定位；
    //   探活失败              → 服务进程真的不在了，保留“重启应用”指引。
    const raw = String(error && error.message ? error.message : error);
    const isTimeout = /abort/i.test(raw);
    const isNetworkFailure = /fetch|abort|networkerror|network error|failed to fetch|connection/i.test(raw);
    if (isNetworkFailure) {
      const alive = await probeServerAlive();
      if (alive && !simAutoRetried && !isTimeout) {
        simAutoRetried = true;
        refs.modulePreview.textContent = "检测到仿真服务瞬时不可达，正在自动重试（1/1）...";
        setStatus("本地服务短暂重启中，自动重试一次...");
        setTimeout(runSimulation, 600);
        return;
      }
      if (alive) {
        // 服务在线但本次请求没完成：多为 iverilog 卡死/超时，或请求被丢弃。
        const friendly = "仿真请求失败：本地服务在线，但本次请求未完成。\n"
          + (isTimeout
            ? `  1. iverilog 编译/仿真耗时超过 ${SIM_REQUEST_TIMEOUT_MS / 1000} 秒，已自动放弃\n`
            : "  1. 请求被丢弃（服务可能正在重启，或上一次仿真尚未结束）\n")
          + "  2. 可再点一次「运行仿真」重试\n"
          + "若反复失败请查看日志：%TEMP%\\WavePaintClean_sim.log";
        refs.modulePreview.textContent = friendly;
        setStatus(friendly);
        return;
      }
      // 服务不在线（进程已退出 / 换端口 / 端口被占）→ 主动自愈，而不是只提示重启：
      //   ① 快速发现（~1s，不重拉）：服务还在、只是换了回环端口 → 记下 origin 直接重试；
      //   ② 进程真的没了 → 立刻亮出「启动本地仿真服务」按钮（用户可马上手动救），
      //      同时后台尽力用 wavepaint: 协议自动重拉（本次点击带来的用户手势可能仍有效）；
      //      重拉成功 → 自动重试仿真；失败 → 保留按钮 + 手动指引。
      refs.modulePreview.textContent = "本地仿真服务无响应，正在自动恢复（重新连接 / 拉起服务）...";
      setStatus("本地仿真服务无响应，正在自动恢复...");
      const located = await recoverService({ allowRelaunch: false });
      if (located.state === "alive" || located.state === "elsewhere") {
        simApiBase = located.state === "elsewhere" ? located.origin : "";
        if (!simAutoRetried) {
          simAutoRetried = true;
          refs.modulePreview.textContent = "已重新连接本地仿真服务，正在自动重试（1/1）...";
          setStatus("已重新连接本地仿真服务，自动重试一次...");
          setTimeout(runSimulation, 600);
          return;
        }
        refs.modulePreview.textContent = "本地仿真服务已重连，请再点一次「运行仿真」。";
        setStatus("本地仿真服务已重连，请再点一次「运行仿真」。");
        return;
      }
      // 进程确实不在了：先给手动入口（用户可立即操作），再后台尝试自动重拉
      showRecoverPending();
      const relaunched = await recoverService({ allowRelaunch: true, waitMs: 15000 });
      if (relaunched.state === "restarted" || relaunched.state === "alive" || relaunched.state === "elsewhere") {
        if (relaunched.state === "elsewhere") simApiBase = relaunched.origin;
        if (refs.recoverBtn) refs.recoverBtn.style.display = "none";
        if (!simAutoRetried) {
          simAutoRetried = true;
          refs.modulePreview.textContent = "已重新启动本地仿真服务，正在自动重试（1/1）...";
          setStatus("已重新启动本地仿真服务，自动重试一次...");
          setTimeout(runSimulation, 600);
          return;
        }
        refs.modulePreview.textContent = "本地仿真服务已重启，请再点一次「运行仿真」。";
        setStatus("本地仿真服务已重启，请再点一次「运行仿真」。");
        return;
      }
      showRecoverHint();
      return;
    }
    refs.modulePreview.textContent = raw || String(error);
    setStatus(raw || String(error));
  } finally {
    if (simTimeoutId) clearTimeout(simTimeoutId);
  }
}

// 自动识别 RTL top module 的端口信号并添加到绘图区，方便用户直接绘制激励波形。
// - input / inout 端口 → 作为激励信号添加到画布（可绘制，kind 保留 clock/logic/vector）
// - output 端口 → 跳过（输出不是激励；仿真后在代码里点选同名信号加入波形即可，见 B4）
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
    if (port.direction === "output") { skipped += 1; continue; } // 输出不是激励（仿真后在代码里点选）
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
  syncSimRows();
  window.drawWaveform?.();
  window.updateSidePanels?.();
  const outputCount = state.outputs && state.outputs.length ? state.outputs.length : 0;
  const watchCount = Array.isArray(state.simWatches) ? state.simWatches.length : 0;
  setStatus(outputCount
    ? (watchCount
      ? `波形中已有 ${watchCount} 个仿真信号（本次仿真共 ${outputCount} 个输出）。在代码里双击变量名可继续添加。`
      : `仿真已就绪（${outputCount} 个输出信号）。在代码里双击变量名（或 Ctrl+Alt+W）即可加入波形。`)
    : "暂无仿真结果，点「运行仿真」；加信号请在代码里双击变量名。");
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

// ---------------------------------------------------------------------------
// #86 A3：从磁盘导入源码文件（= Verdi filelist 的本地等价；不做全盘扫盘）
// ---------------------------------------------------------------------------
// 读到的文本直接进 state.files（保留真实文件名），随后自动 parseDesign + 刷新 RTL 树。
// 优先 File System Access API（可多选、可记住最近目录）；不可用时回退隐藏 <input type=file>。
const SOURCE_FILE_ACCEPT = [".v", ".sv", ".vh", ".svh"];

function readSourceFilesViaInput() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = SOURCE_FILE_ACCEPT.join(",");
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => { try { document.body.removeChild(input); } catch (error) { /* 已移除 */ } };
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      cleanup();
      try {
        resolve(await Promise.all(files.map(async (file) => ({ name: file.name, content: await file.text() }))));
      } catch (error) {
        reject(error);
      }
    });
    // 注：用户取消选择时浏览器不派发 change（且可能派发 cancel，各家不一），
    // 此时 Promise 保持挂起但不持有 DOM（input 仅在被取消后残留，由下次导入覆盖）——
    // 不影响功能，也不阻塞后续导入。
    input.click();
  });
}

async function pickSourceFilesFromDisk() {
  if (typeof window.showOpenFilePicker === "function") {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [{ description: "Verilog / SystemVerilog 源码", accept: { "text/plain": SOURCE_FILE_ACCEPT } }]
    });
    return Promise.all((handles || []).map(async (handle) => {
      const file = await handle.getFile();
      return { name: file.name, content: await file.text() };
    }));
  }
  return readSourceFilesViaInput();
}

// 同名去重：已存在同名文件时在扩展名前追加 `_2` / `_3`…（并回报给用户，不静默覆盖）。
function uniqueSourceFileName(name) {
  const base = String(name || "imported.sv").trim() || "imported.sv";
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let candidate = base;
  let n = 2;
  while (state.files.some((file) => file.name === candidate)) {
    candidate = `${stem}_${n}${ext}`;
    n += 1;
  }
  return candidate;
}

async function importSourceFiles() {
  let picked = [];
  try {
    picked = await pickSourceFilesFromDisk();
  } catch (error) {
    if (error && error.name === "AbortError") { setStatus("已取消导入。"); return; }
    setStatus(`导入源码失败：${(error && error.message) || error}`);
    return;
  }
  const valid = (picked || []).filter((item) => item && String(item.name || "").trim());
  if (!valid.length) return;
  syncEditor();
  const renamed = [];
  const firstIndex = state.files.length;
  for (const item of valid) {
    const name = uniqueSourceFileName(item.name);
    if (name !== item.name) renamed.push(`${item.name} → ${name}`);
    state.files.push({ id: `file_${state.files.length}`, name, content: String(item.content || "") });
  }
  state.active = firstIndex;
  renderFileTabs();
  parseDesign();   // 自动解析 + 刷新 RTL 结构树（parseDesign 内部已 refreshStructureTrees）
  const renameNote = renamed.length ? `　同名文件已重命名：${renamed.join("、")}。` : "";
  setStatus(`已导入 ${valid.length} 个源码文件并自动解析。${renameNote}`);
}

// ---------------------------------------------------------------------------
// #86 A4：源码文件集合随 .wp 工程存档 / 恢复
// ---------------------------------------------------------------------------
// 口径：**不改核心**（js/wavepaint.clean.js 是解混淆产物，改一行都要背上回归风险），
// 改用「包裹核心两个顶层函数」给工程 JSON 追加 `sourceFiles` + `activeSourceIndex`：
//   · `buildDocumentJson` —— 保存 / 分享链接共用；核心内部是 `buildDocumentJson(item)`
//     动态查表（classic script 的顶层 function 声明即全局对象属性），所以包裹
//     `window.buildDocumentJson` 对 `saveToFile` / `createShareLink` 一并生效；
//   · `loadFromFileContent` —— 覆盖「打开 / 载入示例 / 分享链接(#d=)」全部载入路径。
// 注入方式用**文本拼接**而不是二次 JSON.parse+stringify：波形文档可能很大，
// 保存时不该把整份文档再解析一遍（JSON.stringify 才是耗时大头）。
// 旧工程没有这两个字段 → 保持当前源码集合不动（向后兼容）。
let archiveBridgeInstalled = false;

function indentBlock(text, indent) {
  const pad = " ".repeat(indent);
  return String(text).split("\n").map((line) => pad + line).join("\n");
}

// 把 { sourceFiles, activeSourceIndex } 追加进核心产物 JSON 的末尾。
// 核心产物形如 `{\n  "sampleCount": 30,\n  …\n}`（JSON.stringify(val, null, 2)），
// 因此在最后一个 `}` 之前插入即可 —— 不解析、不重排，只做一次字符串拼接。
function injectArchiveSourceFiles(json, files, activeIndex) {
  const text = String(json || "");
  const braceAt = text.lastIndexOf("}");
  if (braceAt < 0) return text;
  const head = text.slice(0, braceAt).replace(/[\s,]+$/, "");
  const tail = text.slice(braceAt);
  if (!/\{/.test(head)) return text;             // 不是对象字面量（异常输入）→ 原样返回
  const block = [
    `"sourceFiles": ${JSON.stringify(files, null, 2)}`,
    `"activeSourceIndex": ${Math.max(0, Number(activeIndex) || 0)}`
  ].join(",\n");
  const comma = head.endsWith("{") ? "" : ",";   // 空文档 `{}` 不能多一个逗号
  return `${head}${comma}\n${indentBlock(block, 2)}\n${tail}`;
}

// 把编辑器里「尚未回写」的当前文件内容同步进 state.files（只做这一件事：
// 不能用 syncEditor()，它会顺带清空 design / outputs / TB，保存时不该有副作用）。
function flushEditorIntoSourceFiles() {
  const file = currentFile();
  if (file && refs.sourceEditor) file.content = String(refs.sourceEditor.value || "");
}

function archiveSourceFiles() {
  flushEditorIntoSourceFiles();
  return state.files.map((file) => ({ name: String(file.name || ""), content: String(file.content || "") }));
}

function installProjectArchiveBridge() {
  if (archiveBridgeInstalled) return true;
  if (typeof window.buildDocumentJson !== "function" || typeof window.loadFromFileContent !== "function") {
    // 核心未按预期暴露顶层函数（结构变了）→ 静默降级：工程仍可存取，只是不带源码集合。
    console.warn("[WavePaint] 源码存档桥未安装：核心未暴露 buildDocumentJson / loadFromFileContent。");
    return false;
  }
  const originalBuild = window.buildDocumentJson;
  const originalLoad = window.loadFromFileContent;
  window.buildDocumentJson = function (item) {
    const json = originalBuild.apply(this, arguments);
    try {
      return injectArchiveSourceFiles(json, archiveSourceFiles(), state.active);
    } catch (error) {
      console.warn("[WavePaint] 注入源码集合失败（工程本身仍正常保存）：", error);
      return json;
    }
  };
  window.loadFromFileContent = function (item, text) {
    const ok = originalLoad.apply(this, arguments);
    if (ok) {
      try {
        applyArchivedSourceFiles(text);
      } catch (error) {
        console.warn("[WavePaint] 恢复源码集合失败（波形本身已载入）：", error);
      }
    }
    return ok;
  };
  archiveBridgeInstalled = true;
  return true;
}

// 工程里带 sourceFiles → 整体替换源码集合（并刷新标签页/RTL 树）；
// 不带（旧工程）→ 保持现状，避免把用户正在编辑的源码清掉。
function applyArchivedSourceFiles(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || ""));
  } catch (error) {
    return;   // 分享链接的压缩载荷等场景：解析不了就跳过（波形载入不受影响）
  }
  const raw = Array.isArray(parsed?.sourceFiles) ? parsed.sourceFiles : null;
  if (!raw || !raw.length) return;
  const files = raw
    .filter((file) => file && typeof file.name === "string" && file.name.trim())
    .map((file) => ({ name: String(file.name), content: String(file.content ?? "") }));
  if (!files.length) return;
  state.files = files;
  state.active = Math.max(0, Math.min(files.length - 1, Number(parsed.activeSourceIndex) || 0));
  if (!refs.sourceFiles) return;   // 面板尚未就绪（如启动即带 #d= 链接）：init() 会用新的 state.files 渲染
  renderFileTabs();   // 必须先切编辑器文本，再 parseDesign（否则 syncEditor 会把旧文本回写进新文件）
  parseDesign();      // 重新解析 + 刷新 RTL 结构树
  setStatus(`已从工程恢复 ${files.length} 个源码文件并自动解析。`);
}

// 新建工程：源码集合一并复位为「一个空标签页」（与 C12 的「新建就地重置」口径一致）。
function resetSourceFiles() {
  state.files = [{ id: "file0", name: "design.sv", content: "" }];
  state.active = 0;
  state.design = null;
  refs.sourceFiles && renderFileTabs();
  refs.rtlTree && refreshStructureTrees();
}

// 整体替换源码集合（自动化/探针入口；也供将来「打开 filelist」复用）。
function setSourceFiles(files) {
  const list = (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file.name === "string" && file.name.trim())
    .map((file, index) => ({ id: `file_${index}`, name: String(file.name), content: String(file.content ?? "") }));
  state.files = list.length ? list : [{ id: "file0", name: "design.sv", content: "" }];
  state.active = 0;
  state.design = null;
  state.outputs = [];
  state.lastTestbench = "";
  updateTbViewer();
  if (!refs.sourceFiles) return;
  renderFileTabs();
  parseDesign();
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
  refs.importFile?.addEventListener("click", importSourceFiles);
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
  refs.runBtn?.addEventListener("click", () => {
    simAutoRetried = false; // Bug1：每次用户手动点击都重新允许一次自动重试
    if (refs.recoverBtn) refs.recoverBtn.style.display = "none"; // 手动重试时收起自愈入口
    runSimulation();
  });
  refs.tbCopy?.addEventListener("click", copyTb);
  // 服务彻底死亡时的手动自愈入口：点击即用 wavepaint: 协议拉起 exe 并等服务上线。
  // 必须由用户点击触发，浏览器才允许启动外部协议（自动恢复路径只能尽力而为）。
  refs.recoverBtn?.addEventListener("click", async () => {
    refs.recoverBtn.disabled = true;
    refs.recoverBtn.style.display = "none";
    refs.modulePreview.textContent = "正在拉起本地仿真服务（首次会询问是否允许打开 wavepaint:，请选择允许）...";
    setStatus("正在启动本地仿真服务...");
    const recovery = await recoverService({ allowRelaunch: true, waitMs: 20000 });
    refs.recoverBtn.disabled = false;
    if (recovery.state === "restarted" || recovery.state === "alive" || recovery.state === "elsewhere") {
      simApiBase = recovery.state === "elsewhere" ? recovery.origin : "";
      simAutoRetried = false;
      setStatus("本地仿真服务已就绪，正在重试仿真...");
      runSimulation();
      return;
    }
    showRecoverHint();
  });
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

// #86 A4：存档桥必须尽早安装 —— 分享链接（#d=/#j=）的自动载入发生在核心初始化阶段，
// 装晚了就会漏掉那一次「载入 → 恢复源码集合」。模块求值时机早于 DOMContentLoaded。
installProjectArchiveBridge();

// 调试 / 自动化测试入口（e2e 探针用；不参与产品逻辑，不写入全局状态）。
window.__wpsim = {
  get sourceFiles() { return state.files.map((file) => ({ name: file.name, content: file.content })); },
  get active() { return state.active; },
  get archiveInstalled() { return archiveBridgeInstalled; },
  // #76 B1：符号索引 / 例化路径 / 符号 → VCD 全路径候选（供 e2e 核验与后续 B3/B4 接线复用）
  get symbolIndex() {
    const index = currentSymbolIndex();
    return {
      topName: index.topName,
      topNames: index.topNames,
      moduleCount: index.modules.length,
      symbolCount: index.symbols.length,
      instancePaths: index.instancePaths
    };
  },
  symbolsOf(fileIndex) {
    return currentSymbolIndex().symbols.filter((symbol) => symbol.fileIndex === Number(fileIndex));
  },
  symbolVcdPaths(name, options) {
    return resolveSymbolVcdPaths(currentSymbolIndex(), name, options || {});
  },
  vcdPathsByName(name) {
    return findVcdPathsByName(state.vcd, name);
  },
  // #76 B4：代码内点/选中变量 → 加波形（交互主路径）的自动化入口。
  // 探针可直接造 {name, fileIndex, line}（等价于在代码里双击该变量名）。
  addSymbolFromCode,
  // 与代码区取词口径一致（光标/选区 → 符号名）；无 CM 时读 textarea。
  get codeContext() {
    return sourceCodeView?.getContext?.() || { name: "", line: 0, selection: "", exact: false, source: "none" };
  },
  // 当前候选选择器里的候选（未弹出时为 null）；探针用它核验"多候选 → 轻量选择器"。
  get symbolPickerOptions() {
    const node = symbolPicker?.node;
    if (!node) return null;
    return [...node.querySelectorAll(".sim-symbol-picker-item")].map((item) => item.textContent);
  },
  clickSymbolPickerOption(path) {
    const node = symbolPicker?.node;
    if (!node) return false;
    const item = [...node.querySelectorAll(".sim-symbol-picker-item")].find((row) => row.textContent === path);
    if (!item) return false;
    item.click();
    return true;
  },
  closeSymbolPicker,
  // 仿真输出在当前画布口径下的展开值（长度 = 主步 × (子步+1)）；e2e 核验观察行同源用。
  nativeValuesOfOutput(name) {
    const outputs = Array.isArray(state.outputs) ? state.outputs : [];
    const index = outputs.findIndex((output) => String(output?.name || "") === String(name));
    if (index < 0) return null;
    const row = toNativeSignal(outputs[index], index, null, Math.max(4, canvasEffectiveCount()));
    return Array.isArray(row?.values) ? row.values : null;
  },
  get outputs() {
    return (Array.isArray(state.outputs) ? state.outputs : []).map((output) => ({
      name: output?.name || "",
      width: Math.max(1, Number(output?.width) || 1)
    }));
  },
  get simWatches() {
    return (Array.isArray(state.simWatches) ? state.simWatches : []).map((watch) => ({ ...watch }));
  },
  setSourceFiles,
  resetSourceFiles,
  importSourceFiles
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
