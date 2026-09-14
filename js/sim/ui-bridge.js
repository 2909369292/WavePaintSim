import { buildAutoTestbench, buildSimulationPayload, createPortStimulus, createSignalFromPort, diagnoseSimulation, parseVerilogDesign, vcdToProjectOutputs } from "./engine.js";
import { formatVectorValue, normalizeVectorValue } from "./project-model.js";
import { blankComments, buildRtlNav, buildSymbolIndex, collectModuleDefs, findSymbols, maskStrings, moduleAtLine, resolveModuleDef, resolveSymbolVcdPaths } from "./rtl-nav.js";
import { buildVcdHierarchy, findVcdPathsByName } from "./vcd-index.js";
import { installSimPanelLayout } from "./panel-layout.js";
import { highlightRtlRow, highlightVcdSignal, installCodeEditor, renderRtlTree, renderVcdTree } from "./rtl-panel.js";

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
let tbCodeView = null;          // 第 46 轮：TB 面板的只读 CodeMirror 6 控制器（同款高亮）
let panelLayout = null;         // 第二十一轮：侧栏「可拖拽多面板」布局控制器（panel-layout.js）
let rtlRefreshTimer = null;     // 编辑后防抖刷新 RTL 树
let activeSyncTimer = null;     // #76 B3：光标移动 → 反向高亮的防抖（索引是全量解析，别每键都算）
let activeHighlight = null;     // #76 B3：当前「代码 → 树」联动状态 {name,fileIndex,line,target,path,fallbackTarget}
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
// #76 B5：观察行还要能**从工程里回来** —— 刚载入工程时 state.vcd 为空，此时按
// 「工程里带回来的那一行」保留（它的 values 就是存档数据）；一旦有 VCD 数据就以
// VCD 为准（缺该路径 = 未 dump → 丢弃），保证「重新仿真 → 数据刷新」这条链路。
function syncSimRows() {
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) return;
  const currentRows = dw.m_signals;
  const liveByPath = new Map();
  for (const signal of currentRows) {
    const path = signal && signal.__simWatchPath;
    if (path && !liveByPath.has(path)) liveByPath.set(path, signal);
  }
  // #85：观察行只保留当前画布仍存在的行（用户删行后不复活；想再要可重新点 VCD 行）。
  // 注意要在 strip 之前看原数组 —— 观察行都是 __simInjected，重建后才判断
  // 会把自己误判成“已删除”。
  state.simWatches = (Array.isArray(state.simWatches) ? state.simWatches : []).filter((watch) =>
    !!watch?.path && liveByPath.has(watch.path)
  );
  const baseSignals = stripInjectedSignals(currentRows);
  // 观察行 values 长度对齐数据模型：主步数 × (子步+1)
  const effectiveCount = Math.max(4, canvasEffectiveCount());
  const template = baseSignals[0] || null;
  const watchRows = state.simWatches
    .map((watch, index) => buildWatchSignal(watch, index, template, effectiveCount)
      || (state.vcd ? null : (liveByPath.get(watch.path) || null)))
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
  refs.panelBody = el("sim-panel-body");
  refs.resizeHandle = el("sim-resize-x");
  refs.toggleBtn = el("sim-toggle-btn");
  refs.header = el("sim-panel-header");
  refs.waveView = el("wave-view");
  refs.waveCanvas = el("wave-canvas");
  refs.sourceFiles = el("source-files");
  refs.sourceEditor = el("verilog-source");
  refs.cmHost = el("verilog-cm-host");
  refs.rtlTree = el("rtl-tree");
  refs.vcdTree = el("vcd-tree");
  // #port-preview / #module-preview 已于第 39 轮退役：.helper-box 删除，
  // 全部状态文本统一走「仿真状态」日志流（见下方 consoleOut）。
  // ⚠ 第 44 轮删除单行状态行 #sim-status 后，refs.status 也不再存在：setStatus()
  // 直接把文本转发进日志流（用户裁决：那一行白占界面高度，内容与日志重复）。
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
  refs.tbSource = el("tb-source");
  refs.tbCopy = el("sim-tb-copy");
  refs.tbCmHost = el("tb-cm-host");
}

// TB 缺省内容（第 47 轮，用户要求）：还没生成过 TB 时，代码框里显示一行注释提示，
// 让空面板自己说清楚下一步该点哪里。⚠ 它只是**显示缺省**，不是真 TB：
//   state.lastTestbench 保持为空串（copyTb 等「有没有 TB」的判定必须看它，
//   否则会把这句提示当 TB 复制出去）。要改文案只改这一处。
const TB_PLACEHOLDER = "// 点击「运行仿真」生成 TB";

// 面板上「应该显示什么」= 真 TB，没有则显示缺省提示。
function tbDisplayText() {
  return state.lastTestbench || TB_PLACEHOLDER;
}

// TB 文本的唯一写入口：textarea（数据镜像）与 CM 只读代码框**同时**更新。
// ⚠ 两处都要写：textarea.value 是旧读路径与 e2e 契约的取值口，CM 视图才是用户看到的。
function updateTbViewer() {
  const text = tbDisplayText();
  if (tbCodeView?.active) tbCodeView.setText(text);
  if (refs.tbSource) {
    refs.tbSource.value = text;
  }
}

function copyTb() {
  // ⚠ 只看 state.lastTestbench：CM 只读、textarea 是镜像，两者都可能装着缺省提示
  // （TB_PLACEHOLDER），不能拿它们当「有 TB」的证据。
  const text = state.lastTestbench || "";
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
// 第 46 轮：TB 面板与源码区共用同一套 CodeMirror 视图（installCodeEditor），
// 只是 readonly=true（可聚焦 / 选中 / 复制，不能改）。可用时隐藏 textarea 镜像，
// 不可用（bundle 缺失）时保持隐藏宿主 + 原样使用 textarea。
function initTbCodeView() {
  if (!refs.tbCmHost || !refs.tbSource) return;
  tbCodeView = installCodeEditor({
    host: refs.tbCmHost,
    textarea: refs.tbSource,
    doc: tbDisplayText(),
    readonly: true
  });
  const usingCm = !!tbCodeView.active;
  refs.tbCmHost.style.display = usingCm ? "block" : "none";
  refs.tbSource.style.display = usingCm ? "none" : "";
  // ⚠ 装完必须再走一次唯一写入口：installCodeEditor 只把 doc 交给 CM，
  // 不会回写 textarea 镜像（它只在「用户改动 / setText」时写）。不补这一刀，
  // 首屏会出现「代码框里是缺省提示、#tb-source.value 还是空串」的镜像不一致，
  // 违反 e2e 契约（镜像 == 面板显示）。setText 在文本未变时只写镜像、不重建视图，
  // 所以这里是一次廉价的无害调用。
  updateTbViewer();
}

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
    onAddSymbol: (context) => addSymbolFromCode(context),
    // #76 B3：光标/选区变化 → 「代码 → 树」反向高亮（仿 Verdi nTrace 的 Active Annotation）
    onCursorMove: (context) => scheduleActiveSync(context),
    // #87②：代码区 Ctrl+Alt+4 → 把光标所在模块/实例的全部接口批量加入波形
    // （rtl-panel 仍只负责取词与触发，作用域解析与落点在 addModulePortsFromCode）。
    onAddScope: (context) => addModulePortsFromCode(context)
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

// 轻量候选选择器（单例）。挂在 document.body 上绝对定位，点击项 = 执行该项动作，
// 点击别处 / Esc = 关闭。
// 两种用法共用同一个浮层（#76 B4 的「同名多候选」与 #87② 的「同名模块多实例」）：
//   mode="symbol" —— 点了加入该 **信号**（B4）；
//   mode="scope"  —— 点了加入该 **作用域的全部接口**（#87②）。
// 探针用 pickerMode 区分，避免自动化把两种情况混为一谈。
let symbolPicker = null;

function closeSymbolPicker() {
  if (!symbolPicker) return;
  if (symbolPicker.teardown) symbolPicker.teardown();
  if (symbolPicker.node?.parentNode) symbolPicker.node.parentNode.removeChild(symbolPicker.node);
  symbolPicker = null;
}

// 通用浮层：items = [{ label, title, onPick }]，anchor = 触发点（鼠标/光标）坐标。
function openPicker(titleText, items, anchor, mode) {
  closeSymbolPicker();
  const box = document.createElement("div");
  box.className = "sim-symbol-picker";
  box.setAttribute("role", "listbox");
  box.dataset.pickerMode = String(mode || "symbol");
  const title = document.createElement("div");
  title.className = "sim-symbol-picker-title";
  title.textContent = titleText;
  box.appendChild(title);
  for (const option of items) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "sim-symbol-picker-item";
    item.textContent = option.label;
    if (option.title) item.title = option.title;
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeSymbolPicker();
      option.onPick();
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

// B4：同名多候选 → 点一个**信号**加入波形（探针口径不变：选项文本 = VCD 全路径）。
function showSymbolPicker(name, paths, anchor) {
  openPicker(
    `${name} 匹配到 ${paths.length} 个信号，点一个加入波形：`,
    paths.map((path) => ({
      label: path,
      title: `加入波形：${path}`,
      onPick: () => pickVcdSignalIntoWave(path)
    })),
    anchor,
    "symbol"
  );
}

// #87②：同名模块被例化多次 → 点一个**作用域**，把该实例的全部接口加入波形。
function showScopePicker(moduleName, scopes, anchor) {
  openPicker(
    `${moduleName} 在层次中出现 ${scopes.length} 次，点一个作用域加入其全部接口：`,
    scopes.map((scope) => ({
      label: scope.path,
      title: `加入 ${scope.path} 的全部接口`,
      onPick: () => addModulePortsToWave(scope)
    })),
    anchor,
    "scope"
  );
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

// ---------------------------------------------------------------------------
// #87②：模块全部接口一键入波形（仿 Verdi nWave `Ctrl+4` = 「把当前作用域的信号整批加入」）
// ---------------------------------------------------------------------------
// 与 B4 的分工：B4 = 光标处**那一个**变量；#87② = 光标所在**作用域的全部接口（端口）**。
// 触发：代码区 `Ctrl+Alt+4`（**不用 `Ctrl+4`**：Chromium/Edge 把 `Ctrl+数字` 当浏览器级
// 「切换标签页」加速键，页面收不到 keydown —— 与 `Ctrl+W` 同理，见 06 P33；手势落在
// installCodeEditor 的第 7 参 onAddScope 上）。
// 口径（严格遵守用户既定约束）：
//   · 只从**代码**发起（光标位置决定目标），不弹「信号层次选择框」、不动 RTL 树、
//     不恢复「仿真后全量灌信号」；
//   · 「全部接口」= 模块的**端口**（kind==="port"：模块头 ANSI 端口 + 体内 input/output/
//     inout 声明）。体内 wire/reg 属于内部信号，仍走 B4 单点加入，不在这里批量灌；
//   · 目标作用域 = 该模块的例化路径（顶层模块自动映射到 `tb.dut`，与 VCD 全路径同口径）。
//     同名模块被例化多次 → 复用代码区旁**轻量选择器**让人选作用域（不是一棵层级树）。
// 批量加入走 addVcdPathsToWave()：**一次 render、一条汇总状态**，避免逐条重绘。
function moduleScopes(index, moduleName) {
  const name = String(moduleName || "").trim();
  if (!name) return [];
  return (Array.isArray(index?.instancePaths) ? index.instancePaths : [])
    .filter((entry) => entry.moduleName === name);
}

// 模块的端口符号（按名去重：非 ANSI 写法下模块头与体内可能各出一条同名符号）。
function modulePorts(index, moduleName) {
  const name = String(moduleName || "").trim();
  const mod = (Array.isArray(index?.modules) ? index.modules : []).find((entry) => entry.name === name);
  if (!mod) return [];
  const seen = new Set();
  const out = [];
  for (const symbol of (Array.isArray(mod.symbols) ? mod.symbols : [])) {
    if (symbol.kind !== "port") continue;
    const portName = String(symbol.name || "");
    if (!portName || seen.has(portName)) continue;
    seen.add(portName);
    out.push(symbol);
  }
  return out;
}

// 批量把 VCD 全路径加为观察行（B4 的 pickVcdSignalIntoWave 是单条版，语义保持不动）。
// 返回 { ready, added[], existed[], missing[] }；**不设状态栏**（调用方据此拼汇总文案）。
function addVcdPathsToWave(paths) {
  const result = { ready: false, added: [], existed: [], missing: [] };
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) return result;
  result.ready = true;
  const wanted = [];
  for (const path of (Array.isArray(paths) ? paths : [])) {
    const text = String(path || "");
    if (text && !wanted.includes(text)) wanted.push(text);
  }
  const effectiveCount = Math.max(4, canvasEffectiveCount());
  // 模板行只借用配色/样式：优先用户自己的信号，避免拿注入行当模板。
  const template = dw.m_signals.find((signal) => signal && !signal.__simInjected) || dw.m_signals[0] || null;
  state.simWatches = Array.isArray(state.simWatches) ? state.simWatches : [];
  for (const path of wanted) {
    const vcdSignal = vcdSignalByFullPath(path);
    if (!vcdSignal) { result.missing.push(path); continue; }
    if (dw.m_signals.some((signal) => signal && signal.__simWatchPath === path)) {
      result.existed.push(path);
      continue;
    }
    const watch = {
      path,
      name: vcdSignal.name,
      width: Math.max(1, Number(vcdSignal.width) || 1),
      reference: vcdSignal.reference || ""
    };
    const row = buildWatchSignal(watch, state.simWatches.length, template, effectiveCount);
    if (!row) { result.missing.push(path); continue; }   // 理论不可达：上面已确认有 VCD 数据
    state.simWatches.push(watch);
    dw.m_signals.push(row);
    result.added.push(path);
  }
  if (result.added.length) {
    dw.m_sampleCount = Math.max(dw.m_sampleCount || 0, canvasTimeSteps());
  }
  render();
  if (result.added.length) scrollWaveToWatchPath(result.added[result.added.length - 1]);
  return result;
}

// 汇总文案（单一入口，保证「加了几个 / 跳过几个 / 为什么跳过」都说清楚）。
function modulePortsStatus(scopePath, portCount, result) {
  if (!portCount) return `${scopePath} 所属模块没有接口（端口）信号。`;
  if (!result.added.length) {
    if (result.existed.length && !result.missing.length) {
      return `${scopePath} 的 ${result.existed.length} 个接口已在波形中。`;
    }
    if (result.missing.length && !result.existed.length) {
      return `未找到 ${scopePath} 的接口 VCD 数据（可能未被 dump，请检查 TB）。`;
    }
    return `${scopePath} 的接口已在波形中（${result.existed.length} 个），另有 ${result.missing.length} 个无 VCD 数据。`;
  }
  const extras = [];
  if (result.existed.length) extras.push(`${result.existed.length} 个已在波形`);
  if (result.missing.length) extras.push(`${result.missing.length} 个无 VCD 数据`);
  return `已将 ${scopePath} 的 ${result.added.length} 个接口加入波形${extras.length ? `（${extras.join("，")}）` : ""}。`;
}

// 单个作用域 → 全部接口入波形。
function addModulePortsToWave(scope) {
  onWavepaintReady();
  const scopePath = String(scope?.path || "").trim();
  const ports = scopePath ? modulePorts(currentSymbolIndex(), scope?.moduleName) : [];
  const result = addVcdPathsToWave(ports.map((port) => `${scopePath}.${port.name}`));
  if (!result.ready) {
    setStatus("画布尚未就绪，请稍后再试。");
    return result;
  }
  result.scope = scopePath;
  result.status = modulePortsStatus(scopePath, ports.length, result);
  setStatus(result.status);
  return result;
}

// context = 代码取词结果（与 B4 同源）。光标停在实例名上 → 该实例作用域；否则 → 所在模块。
function addModulePortsFromCode(context) {
  onWavepaintReady();
  const info = context || sourceCodeView?.getContext?.() || {};
  const fileIndex = Number.isFinite(Number(info.fileIndex)) ? Number(info.fileIndex) : state.active;
  const line = Number(info.line) > 0 ? Number(info.line) : 0;
  const index = currentSymbolIndex();
  const name = String(info.name || "").trim();

  // ① 光标正好停在**实例名**上（例化点那一行）→ 目标 = 这个实例的作用域
  //    （对着 `sub u_a (.clk(clk));` 按 Ctrl+Alt+4 = 把 u_a 的全部接口加进来）。
  //    ⚠ 不能用 findSymbols 命中项的 moduleName 去查作用域：符号索引给实例符号的
  //    moduleName 是**定义所在模块**（counter），被例化的模块名（sub）在符号上已丢；
  //    作用域一律直接按「实例名后缀」在 instancePaths 上定位（那里的 moduleName 才是
  //    被例化模块）。
  if (name) {
    const { hits } = findSymbols(index, name, { fileIndex, line });
    const inst = hits.find((symbol) => symbol.kind === "instance") || null;
    if (inst) {
      const suffix = `.${name}`;
      const scopes = (Array.isArray(index?.instancePaths) ? index.instancePaths : [])
        .filter((entry) => entry.path === name || entry.path.endsWith(suffix));
      if (scopes.length === 1) { addModulePortsToWave(scopes[0]); return; }
      if (scopes.length > 1) {
        showScopePicker(scopes[0].moduleName || name, scopes, info.anchor);
        setStatus(`实例 ${name} 在层次中出现 ${scopes.length} 次，请在代码区旁的选择器里点选作用域。`);
        return;
      }
      setStatus(`未找到实例 ${name} 的例化作用域（无法确定 VCD 层级）。`);
      return;
    }
  }

  // ② 常规：光标所在模块 → 它的全部例化作用域
  const moduleName = String(moduleAtLine(index, fileIndex, line)?.name || "");
  if (!moduleName) {
    setStatus("把光标放到某个模块体内（或实例名上）再按 Ctrl+Alt+4。");
    return;
  }
  const scopes = moduleScopes(index, moduleName);
  if (!scopes.length) {
    setStatus(`未找到模块 ${moduleName} 的例化作用域（该模块可能未被例化，无法确定 VCD 层级）。`);
    return;
  }
  if (scopes.length === 1) { addModulePortsToWave(scopes[0]); return; }
  showScopePicker(moduleName, scopes, info.anchor);
  setStatus(`模块 ${moduleName} 在层次中出现 ${scopes.length} 次，请在代码区旁的选择器里点选作用域。`);
}

// ---------------------------------------------------------------------------
// #76 B3：代码 → 树 反向定位（仿 Verdi nTrace「光标即高亮」的双向 Active Annotation）
// ---------------------------------------------------------------------------
// 与 B4 的分工：B4 是「代码 → 波形」（加信号，用户主动触发）；B3 是「代码 → 树」
// （只做高亮 + 滚动，零副作用、不加信号、不弹框、不新增面板）。
// 数据底座完全复用现成的两块，绝不另写解析：
//   · 取词       = installCodeEditor 的 getContext()（B4 已闭环的 symbolNameAt 口径）；
//   · 定位/映射  = B1 的 moduleAtLine / findSymbols / resolveSymbolVcdPaths。
// 规则：
//   1) 光标所在行 → 所属模块（moduleAtLine）→ 高亮 RTL 树的**模块行**；
//   2) 光标正好停在**实例名**上（findSymbols 命中 kind="instance" 且行号一致）→ 高亮**实例行**
//      （实例名不是 VCD 信号，因此不参与 VCD 高亮）；
//   3) 其余符号 → resolveSymbolVcdPaths：**唯一**候选才高亮 VCD 树的对应信号行；
//      多候选 = 有歧义 → 不高亮（宁可不亮也不猜）；符号侧为空时用名称兜底，同样要求唯一；
//   4) 取不到词 / 取不到任何目标 → 清空高亮。
// ⚠ RTL 树仍然只做层级浏览：这里只加 .rtl-active 视觉标记与滚动，不加端口/信号行、
//   不恢复「点行加波形」（用户明确口径）。
function clearActiveHighlight() {
  activeHighlight = null;
  highlightRtlRow(refs.rtlTree, null);
  highlightVcdSignal(refs.vcdTree, null);
}

// 把当前高亮重放到树上。refreshStructureTrees() 是 container.replaceChildren() 全量重建，
// 重建后高亮 class 会被抹掉 —— 所以每次重建完都必须重放一次。
function applyActiveHighlight() {
  if (!refs.rtlTree && !refs.vcdTree) return;
  if (!activeHighlight) {
    highlightRtlRow(refs.rtlTree, null);
    highlightVcdSignal(refs.vcdTree, null);
    return;
  }
  let hit = null;
  if (activeHighlight.target) hit = highlightRtlRow(refs.rtlTree, activeHighlight.target);
  // 实例行没命中（例如该实例未进树）→ 退回高亮所属模块行，保证至少落在正确的模块上
  if (!hit && activeHighlight.fallbackTarget) highlightRtlRow(refs.rtlTree, activeHighlight.fallbackTarget);
  highlightVcdSignal(refs.vcdTree, activeHighlight.path || null);
}

// 由代码上下文算出「树上的目标」并立即应用。context 缺省时读当前编辑器光标
// （与 B4 的 addSymbolFromCode 同一取词口径）。返回联动状态（供探针核验）。
function syncActiveFromCode(context) {
  const info = context || sourceCodeView?.getContext?.() || {};
  const name = String(info.name || "").trim();
  const fileIndex = Number.isFinite(Number(info.fileIndex)) ? Number(info.fileIndex) : state.active;
  const line = Number(info.line) > 0 ? Number(info.line) : 0;
  if (!name || !line) {
    clearActiveHighlight();
    return null;
  }
  const index = currentSymbolIndex();
  const mod = moduleAtLine(index, fileIndex, line);
  const fallbackTarget = mod
    ? { kind: "module", fileIndex: mod.fileIndex, line: mod.line, moduleName: mod.name, name: mod.name }
    : null;
  const { hits } = findSymbols(index, name, { fileIndex, line });
  const instHit = hits.find((symbol) => symbol.kind === "instance") || null;
  let target = fallbackTarget;
  let path = "";
  if (instHit) {
    target = { kind: "instance", fileIndex: instHit.fileIndex, line: instHit.line, instanceName: instHit.name, name: instHit.name };
  } else {
    const resolved = resolveSymbolVcdPaths(index, name, { moduleName: mod?.name || "", fileIndex, line });
    if (resolved.paths.length === 1) path = resolved.paths[0];
    else if (!resolved.paths.length) {
      const byName = findVcdPathsByName(state.vcd, name);
      if (byName.length === 1) path = byName[0];
    }
  }
  if (!target && !path) {
    clearActiveHighlight();
    return null;
  }
  activeHighlight = {
    name, fileIndex, line, target, path,
    fallbackTarget: instHit ? fallbackTarget : null
  };
  applyActiveHighlight();
  return activeHighlight;
}

// 光标移动防抖：连续按键/拖选时只在停顿时算一次（currentSymbolIndex 是全量解析）。
function scheduleActiveSync(context) {
  if (activeSyncTimer) clearTimeout(activeSyncTimer);
  activeSyncTimer = window.setTimeout(() => {
    activeSyncTimer = null;
    syncActiveFromCode(context);
  }, 180);
}

// 切到目标文件并跳到目标行（跨文件先同步当前编辑内容，再切标签页）。
function gotoSource(fileIndex, line) {
  if (typeof fileIndex === "number" && fileIndex !== state.active && state.files[fileIndex]) {
    syncEditor();
    state.active = fileIndex;
    renderFileTabs();
  }
  if (Number(line) > 0) jumpToEditorLine(Number(line));
  // 树 → 代码 之后立刻把「代码 → 树」的高亮同步到落点行（双向联动的闭环）：
  // 点模块行 → 光标落在定义行 → 该模块行保持高亮；点实例行 → 落到定义/例化点后同步刷新。
  syncActiveFromCode();
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
  // ⚠ 上面两棵树都是 replaceChildren() 全量重建：高亮 class 会被一起抹掉，必须重放。
  applyActiveHighlight();
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
    consoleOut("解析失败：未找到 module。请检查 RTL 语法：module/endmodule 是否匹配、模块名是否合法。", "error");
    setStatus("解析失败：未找到 module。");
    refreshStructureTrees();
    render();
    return;
  }
  const topPorts = design.topModule?.ports || [];
  consoleOut(topPorts.length
    ? `${design.topName}: ${topPorts.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
    : `⚠ ${design.topName} 未解析到端口。请检查端口声明写法（ANSI 或非 ANSI 均可）。`,
    topPorts.length ? "info" : "warn");
  consoleOut([
    `模块数：${design.moduleCount}`,
    ...design.modules.map((moduleInfo) => `${moduleInfo.name}：端口 ${moduleInfo.ports.length} 个，实例 ${moduleInfo.instances.length} 个`)
  ].join("\n"), "info");
  setStatus(`已解析 ${design.moduleCount} 个模块。`);
  syncTopSelector();
  refreshStructureTrees();
  render();
  // #123：若本次会话已授权过源码目录，解析后自动把「顶层例化图里缺定义」的模块
  // 从该目录读进来（异步、不阻塞；重入由 resolveMissingDependencies 内部守卫）。
  if (sourceDirHandle) { resolveMissingDependencies().catch(() => {}); }
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
    consoleOut(result.error, "error");
    setStatus("TB 生成失败：" + result.error);
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
  state.lastTestbench = result.source;
  state.lastBindings = result.bindings;
  updateTbViewer();
  const notes = diagnoseSimulation([], result.bindings);
  consoleOut([
    `端口绑定 ${result.bindings.length} 条：`,
    ...result.bindings.map((binding) => `${binding.port.name} → ${binding.signal ? binding.signal.name : "（未绑定）"} [${binding.strategy}]`),
    ...(notes.length ? ["", ...notes] : [])
  ].join("\n"), "info");
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
  consoleOut(message, "error");
  setStatus("本地仿真服务无响应，请点下方按钮重试或重启应用。");
  if (refs.recoverBtn) refs.recoverBtn.style.display = "block";
}

// 自动恢复进行中：先把手动入口亮出来（用户可立即点，不必干等），但文案**不说**
// 「失败」——旧实现先弹「自动恢复失败」再继续尝试自动拉起，字样一闪而过很误导。
function showRecoverPending() {
  consoleOut("本地仿真服务无响应，正在自动恢复（重连 / 重新拉起服务）...\n"
    + "  也可以立即点下方「启动本地仿真服务」手动拉起。", "warn");
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
    consoleOut("TB 生成失败：" + detail.slice(0, 500), "error");
    setStatus("TB 生成失败：" + String(error).slice(0, 200));
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
  if (!tbResult.ok) {
    consoleOut(tbResult.error, "error");
    setStatus(tbResult.error);
    state.lastTestbench = "";
    updateTbViewer();
    return;
  }
  state.lastTestbench = tbResult.source;
  updateTbViewer();

  setStatus(`正在为 ${design.topName} 运行仿真...`);
  consoleOut("正在运行真实仿真（iverilog）...", "info");
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
    // 第 39 轮（E2）：后端成功路径可能回传 "@@LOG:...@@VCD:..." 分段（iverilog warning /
    // vvp $display 输出 + VCD）。不带 @@LOG: 前缀的旧格式（纯 VCD 文本）与错误前缀格式
    // 都按原逻辑解析 —— 新 exe / 旧 exe / dev-server 三种响应都能吃。
    let vcdText = text;
    let simLogText = "";
    if (text.startsWith("@@LOG:")) {
      const cut = text.indexOf("@@VCD:");
      simLogText = (cut >= 0 ? text.slice(0, cut) : text).replace(/^@@LOG:\r?\n?/, "");
      vcdText = cut >= 0 ? text.slice(cut + "@@VCD:".length).replace(/^\r?\n/, "") : "";
    }
    for (const logLine of simLogText.split(/\r?\n/)) {
      const line = logLine.replace(/\r/g, ""); // iverilog/vvp 在 Windows 上是 CRLF
      if (!line.trim()) continue; // 编译 / 仿真器输出 → 日志流（error/warning 自动着色）
      consoleOut(line, /error/i.test(line) ? "error" : (/warning/i.test(line) ? "warn" : "info"));
    }
    if (/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):/.test(text)) {
      const error = text.replace(/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):\s*/, "").trim();
      consoleOut(error || "仿真失败。", "error");
      state.outputs = [];
      render();
      setStatus(error || "仿真失败。");
      return;
    }

    const { parsed, outputs } = vcdToProjectOutputs(vcdText, project);
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
    consoleOut([
      `仿真完成：${outputs.length} 个输出信号，时长 tmax ${parsed.tmax}`,
      "加信号：在左侧代码里双击变量名（或选中后按 Ctrl+Alt+W / 右键）即可加入波形；"
        + "按 Ctrl+Alt+4 可把光标所在模块/实例的全部接口批量加入。",
      `末值：${summarizeOutputs(outputs)}`,
      ...(notes.length ? ["", ...notes] : [])
    ].join("\n"), notes.length ? "warn" : "ok");
    render();
    refreshStructureTrees();
    if (refs.recoverBtn) refs.recoverBtn.style.display = "none"; // 仿真成功 → 收起自愈入口
    // 第 44 轮：单行状态行已删，仿真完成摘要只由上面的 consoleOut 输出一次（不再重复一行）。
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
        consoleOut("检测到仿真服务瞬时不可达，正在自动重试（1/1）...", "warn");
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
        consoleOut(friendly, "error");
        setStatus(firstLine(friendly));
        return;
      }
      // 服务不在线（进程已退出 / 换端口 / 端口被占）→ 主动自愈，而不是只提示重启：
      //   ① 快速发现（~1s，不重拉）：服务还在、只是换了回环端口 → 记下 origin 直接重试；
      //   ② 进程真的没了 → 立刻亮出「启动本地仿真服务」按钮（用户可马上手动救），
      //      同时后台尽力用 wavepaint: 协议自动重拉（本次点击带来的用户手势可能仍有效）；
      //      重拉成功 → 自动重试仿真；失败 → 保留按钮 + 手动指引。
      consoleOut("本地仿真服务无响应，正在自动恢复（重新连接 / 拉起服务）...", "warn");
      setStatus("本地仿真服务无响应，正在自动恢复...");
      const located = await recoverService({ allowRelaunch: false });
      if (located.state === "alive" || located.state === "elsewhere") {
        simApiBase = located.state === "elsewhere" ? located.origin : "";
        if (!simAutoRetried) {
          simAutoRetried = true;
          consoleOut("已重新连接本地仿真服务，正在自动重试（1/1）...", "warn");
          setStatus("已重新连接本地仿真服务，自动重试一次...");
          setTimeout(runSimulation, 600);
          return;
        }
        consoleOut("本地仿真服务已重连，请再点一次「运行仿真」。", "warn");
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
          consoleOut("已重新启动本地仿真服务，正在自动重试（1/1）...", "warn");
          setStatus("已重新启动本地仿真服务，自动重试一次...");
          setTimeout(runSimulation, 600);
          return;
        }
        consoleOut("本地仿真服务已重启，请再点一次「运行仿真」。", "warn");
        setStatus("本地仿真服务已重启，请再点一次「运行仿真」。");
        return;
      }
      showRecoverHint();
      return;
    }
    consoleOut(raw || String(error), "error");
    setStatus(firstLine(raw || String(error)));
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
  // 第 44 轮：这里原来那条「仿真完成 / 双击变量名加信号」的单行状态文案已删
  // （用户裁决：它白占一行界面高度；同样的摘要已由日志流逐条输出）。
  if (refs.toggleBtn) refs.toggleBtn.style.display = refs.panel?.classList.contains("collapsed") ? "block" : "none";
}

let lastStatusLine = ""; // 连续重复的状态文案只进日志一次（render 等高频路径不刷屏）
// 第 44 轮：单行状态行 #sim-status 已删（用户裁决：占一行界面高度，且内容与日志流重复）。
// 从此 setStatus() = 把文本转发进「仿真状态」日志流（全应用唯一状态出口，见 consoleOut），
// 并做「连续去重」；kind 按文案粗判，失败 / 错误类走 error 配色。
function setStatus(text, kind) {
  const line = String(text == null ? "" : text).trim();
  if (!line || line === lastStatusLine) return;
  lastStatusLine = line;
  consoleOut(line, kind || (/失败|错误|无响应|未找到|无法|不可用|请重启/.test(line) ? "error" : "info"));
}

// 第 39 轮：全应用唯一状态 / 日志出口 —— 「仿真状态」面板的 #sim-console-log。
// 实现在 js/sim/dock/workspace.js（普通 <script>，早于本 ESM 加载）里，挂到
// window.wpConsoleAppend(text, kind)；kind ∈ info | ok | warn | error。
// 旧的 #port-preview / #module-preview（.helper-box）已退役：编译报错、仿真摘要、
// 服务自愈提示等一律以纯文本行进日志流，不再有「框套框」。
function consoleOut(text, kind) {
  const body = text == null ? "" : String(text);
  if (!body) return;
  const emit = (typeof window !== "undefined") ? window.wpConsoleAppend : null;
  if (typeof emit === "function") emit(body, kind || "info");
}

// 只取首行的工具（错误消息进日志流时保持一行，避免一条消息散成多行）。
function firstLine(text) {
  return String(text == null ? "" : text).split("\n")[0].trim();
}

function renderFileTabs() {
  if (!refs.sourceFiles) return;
  refs.sourceFiles.replaceChildren(...state.files.map((file, index) => {
    const label = file.name || `file_${index + 1}`;
    // 标签 = .source-tab 容器（.source-chip 文本 + .source-chip-close 关闭键）。
    // ⚠ 关闭键是 chip 的**兄弟**而不是子节点：e2e-rtl E2 断言
    //   document.querySelector('#source-files .source-chip.active').textContent === 'sub.v'，
    //   若把「−」塞进 chip 里，chip 文本就会变成 'sub.v−' 而破坏该契约。
    const tab = document.createElement("div");
    tab.className = "source-tab" + (index === state.active ? " active" : "");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "source-chip" + (index === state.active ? " active" : "");
    chip.textContent = label;
    chip.title = label;
    chip.addEventListener("click", () => {
      syncEditor();
      state.active = index;
      setEditorText(currentFile()?.content || "");
      renderFileTabs();
    });
    const close = document.createElement("button");
    close.type = "button";
    close.className = "source-chip-close";
    close.textContent = "−"; // 用户点名的「小减号」：点它移除这一个文件
    close.disabled = state.files.length <= 1;
    close.title = close.disabled ? "至少保留一个源文件" : `移除 ${label}`;
    close.setAttribute("aria-label", close.title);
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      removeFileAt(index);
    });
    tab.append(chip, close);
    return tab;
  }));
  setEditorText(currentFile()?.content || "");
  scheduleRtlTreeRefresh();
}

// 第 51 轮（用户裁决）：标签条末尾的「＋」**不再**先弹自定义输入框问文件名，
// 而是直接调用系统「打开文件」对话框（File System Access API，回退隐藏 <input type=file>），
// 与「另存为 / 打开」一致 —— 像正常软件一样一步到位：选完文件即导入 + 自动解析。
// 这也是 Verdi「Add File」的等价行为（不预设空文件名的空白标签页）。
function addFile() {
  return importSourceFiles();
}

function removeFile() {
  removeFileAt(state.active);
}

// 按索引移除（第 37 轮）：文件标签上的「−」直接点谁删谁，不再只能删「当前」文件。
// 活动标签的收敛规则：
//   · 删的是活动标签左边的文件 → 活动索引左移一位（内容不变，仍停在同一文件上）；
//   · 删的就是活动标签         → 活动索引原地不动（自动落到后一个；越界时退到最后一个）；
//   · 删的是活动标签右边的文件 → 活动索引不变。
function removeFileAt(index) {
  const count = state.files.length;
  if (count <= 1) return;                      // 护栏：至少保留一个源文件
  const at = Math.max(0, Math.min(Number(index) || 0, count - 1));
  syncEditor();
  state.files.splice(at, 1);
  if (state.active > at) state.active -= 1;
  state.active = Math.max(0, Math.min(state.active, state.files.length - 1));
  renderFileTabs();
  setStatus(`已移除文件（剩 ${state.files.length} 个）。`);
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

// 把一批「磁盘上读到的源码」并进源码集合（同名自动去重，不静默覆盖）。
// 只做数据 + 标签条刷新；**调用方负责随后 parseDesign()**（避免批量导入解析多次）。
// 返回 { added: 实际加入的文件名[], renamed: '旧名 → 新名'[] }，供调用方组织状态文案。
//
// options.activate === false：**不要抢占当前活动标签**（#123 自动补齐依赖用）。
//   用户正在看 / 编辑 counter.sv 时后台把 sub.v 读进来，编辑器绝不能跳到 sub.v。
function addSourceFiles(items, options = {}) {
  const valid = (Array.isArray(items) ? items : [])
    .filter((item) => item && String(item.name || "").trim());
  if (!valid.length) return { added: [], renamed: [] };
  syncEditor();
  const firstIndex = state.files.length;
  const added = [];
  const renamed = [];
  for (const item of valid) {
    const name = uniqueSourceFileName(item.name);
    if (name !== item.name) renamed.push(`${item.name} → ${name}`);
    state.files.push({ id: `file_${state.files.length}`, name, content: String(item.content || "") });
    added.push(name);
  }
  if (options.activate !== false) state.active = firstIndex;
  // 活动下标收敛到合法区间（清空后重填、后台追加等路径都可能把它顶出界）
  state.active = Math.min(Math.max(0, Number(state.active) || 0), Math.max(0, state.files.length - 1));
  renderFileTabs();
  return { added, renamed };
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
  const { added, renamed } = addSourceFiles(picked);
  if (!added.length) return;
  parseDesign();   // 自动解析 + 刷新 RTL 结构树（parseDesign 内部已 refreshStructureTrees）
  const renameNote = renamed.length ? `　同名文件已重命名：${renamed.join("、")}。` : "";
  setStatus(`已导入 ${added.length} 个源码文件并自动解析。${renameNote}`);
  reportMissingDependencies();
}

// ---------------------------------------------------------------------------
// #122 / #123 顶层依赖图：扫「谁被例化却没定义」+ 从已授权目录自动补齐
// ---------------------------------------------------------------------------
// 分工：
//   #122（第 51 轮）= 选目录 → 递归读 → 解析 → **汇报**缺谁；
//   #123（第 52 轮）= **记住**已授权目录 → 之后每次解析自动把「从当前顶层往下的
//     例化图里缺定义的模块」读进来，用户不必再选一次文件
//     （= 用户要的「打开顶层自动扫描读取相应的依赖和例化的模块」）。
//
// 为什么 #123 能「自动」：FileSystemDirectoryHandle 一旦经用户手势授权，**同一页面
// 会话内** queryPermission() 恒为 'granted'，之后读盘不再需要手势。跨页面重载权限
// 失效，此时自动补齐自动降级为「汇报 + 提示重选目录」，不弹任何模态框。
//
// 数据源一律是 buildRtlNav（源码扫描器，已过滤门原语 / 字符串里的假例化），不碰 C9 核心。
const HDL_SOURCE_RE = /\.(v|sv|vh|svh)$/i;
const HDL_EXTS = [".v", ".sv", ".vh", ".svh"];
// 递归扫目录时跳过这些「肯定不含 HDL 源码」的重目录（避免误扫 node_modules / 构建产物）
const SOURCE_DIR_SKIP_RE = /^(node_modules|\.git|\.svn|\.hg|\.e2e-tmp|\.codex|\.vscode|build|out|dist|target|obj|bin|csrc|simv|__pycache__|temp|tmp)$/i;
const SOURCE_DIR_MAX_FILES = 400;   // 护栏：一次最多收 400 个源文件（防止误选 C:\ 这类巨目录）
const SOURCE_DIR_MAX_DEPTH = 6;
const DEP_RESOLVE_MAX_ROUNDS = 3;   // 自动补齐最多 3 轮（每轮一层依赖，环/漏定义不会死循环）

let sourceDirHandle = null;            // 用户最后一次授权的源码目录（会话内有效）
let sourceDirIndex = null;             // Map<小写文件名, FileSystemFileHandle>（惰性建立）
const sourceDirTextCache = new Map();  // 小写文件名 → 文本（读过就不再读第二次）
let depResolving = false;              // 自动补齐重入保护（parseDesign 会被补齐流程自己触发）
let autoScanDeclined = false;          // 用户在「自动扫描依赖」的文件夹对话框里点过取消 → 本会话不再弹

function escapeRe(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 从当前顶层 BFS 例化图，收集「被例化但没有 module 定义」的模块名。
// 口径 = 当前顶层的**例化可达图**（Verdi 的 -top 语义）：只有顶层往下真的例化到的
// 模块才算依赖，工程里其它无关模块的残留例化不会把无关文件拖进来。
// topName 为空 / 源码里查无此定义时，退化成「扫全部模块」的宽松口径。
// 大小写不敏感判重，保留源码里的原始拼写；按先遇到的顺序返回。
function missingDependencyModules(topName) {
  const nav = buildRtlNav(state.files);
  const defs = new Map();   // 小写模块名 → { name, instances[] }（同名多文件定义合并）
  for (const mod of nav) {
    const key = String(mod?.name || "").toLowerCase();
    if (!key) continue;
    const entry = defs.get(key);
    if (entry) entry.instances.push(...(mod.instances || []));
    else defs.set(key, { name: String(mod.name), instances: (mod.instances || []).slice() });
  }
  const requested = String(topName || state.selectedTop || state.design?.topName || "").trim().toLowerCase();
  const roots = defs.has(requested) ? [requested] : Array.from(defs.keys());

  const missing = [];
  const seen = new Set();
  const visited = new Set();
  const queue = roots.slice();
  while (queue.length) {
    const key = queue.shift();
    if (visited.has(key)) continue;
    visited.add(key);
    const entry = defs.get(key);
    if (!entry) continue;
    for (const inst of entry.instances) {
      const name = String(inst?.moduleName || "").trim();
      if (!name) continue;
      const childKey = name.toLowerCase();
      if (visited.has(childKey) || seen.has(childKey)) continue;
      seen.add(childKey);
      if (defs.has(childKey)) queue.push(childKey);
      else missing.push(name);   // 例化了、但整个源码集合里没有它的 module 定义
    }
  }
  return missing;
}

// 汇报：齐全 → 一条 info；有缺口 → 一条 warn，并给出两条可执行的补齐路径。
function reportMissingDependencies() {
  const missing = missingDependencyModules();
  if (!missing.length) {
    consoleOut(`依赖扫描：${state.files.length} 个源文件的例化依赖已闭合，没有被例化却缺失定义的模块。`, "info");
    return missing;
  }
  consoleOut([
    `⚠ 依赖扫描：以下 ${missing.length} 个模块被例化，但当前源码里没有定义 ——`,
    `　${missing.join("、")}`,
    "　→ 点源码标签条末尾的「＋」选择这些源码文件（可多选）；",
    sourceDirHandle
      ? "　→ 或直接重试（已记住源码目录，会自动读入）；若权限已过期，重选一次目录即可。"
      : "　→ 或用菜单「文件 → 打开源码目录（自动扫描依赖）…」一次性扫描整个工程目录补齐。"
  ].join("\n"), "warn");
  return missing;
}

// 目录句柄当前是否可读（不弹框；无权限且当前没有用户手势时返回 false）。
async function dirReadable(handle) {
  if (!handle) return false;
  if (typeof handle.queryPermission !== "function") return true;   // 非 FSA 句柄（探针 stub）
  try {
    const options = { mode: "read" };
    if ((await handle.queryPermission(options)) === "granted") return true;
    if (typeof handle.requestPermission !== "function") return false;
    // 重新授权必须由用户手势触发；没有手势时不要调用（会抛 SecurityError 并刷控制台）
    if (!(navigator.userActivation && navigator.userActivation.isActive)) return false;
    return (await handle.requestPermission(options)) === "granted";
  } catch (error) {
    return false;
  }
}

// 建立 / 复用「目录 → HDL 文件句柄」索引（只列目录，不读内容）。
async function indexSourceDirectory(handle) {
  if (sourceDirIndex && sourceDirHandle === handle) return sourceDirIndex;
  const index = new Map();
  const walk = async (dir, depth) => {
    if (depth > SOURCE_DIR_MAX_DEPTH || index.size >= SOURCE_DIR_MAX_FILES) return;
    for await (const entry of dir.values()) {
      if (index.size >= SOURCE_DIR_MAX_FILES) return;
      if (entry.kind === "directory") {
        if (SOURCE_DIR_SKIP_RE.test(entry.name)) continue;
        await walk(entry, depth + 1);
        continue;
      }
      if (!HDL_SOURCE_RE.test(entry.name)) continue;
      const key = entry.name.toLowerCase();
      if (!index.has(key)) index.set(key, entry);   // 同名取先遇到的（重名极罕见，只做去重）
    }
  };
  await walk(handle, 0);
  sourceDirHandle = handle;
  sourceDirIndex = index;
  return index;
}

// 读目录里的某个 HDL 文件（带缓存：同一文件在整个会话里只读一次）。
async function readDirFile(key, handle) {
  if (sourceDirTextCache.has(key)) return sourceDirTextCache.get(key);
  const file = await handle.getFile();
  const text = await file.text();
  sourceDirTextCache.set(key, text);
  return text;
}

// 在目录里找「定义了模块 name」的源文件：
//   ① 文件名约定优先 —— <name>.v / .sv / .vh / .svh，并要求文件里真有它的 module 声明；
//   ② 兜底按内容找 —— 文件名与模块名不一致的工程（扫索引里的其余 HDL 文件）。
// 已被当前源码集合收录的文件、以及本轮已经认领的文件都跳过（不重复导入）。
async function findModuleFileInDir(name, index, claimed, existing) {
  const lower = String(name).toLowerCase();
  const declares = (text) => new RegExp(`\\bmodule\\s+${escapeRe(name)}\\b`, "i")
    .test(maskStrings(blankComments(String(text))));
  const usable = (key) => index.has(key) && !claimed.has(key) && !existing.has(key);

  for (const ext of HDL_EXTS) {
    const key = lower + ext;
    if (!usable(key)) continue;
    const handle = index.get(key);
    try {
      const content = await readDirFile(key, handle);
      if (declares(content)) return { key, name: handle.name, content };
    } catch (error) { /* 单文件读失败（权限 / 占用）→ 继续找 */ }
  }
  for (const [key, handle] of index) {
    if (!usable(key)) continue;
    try {
      const content = await readDirFile(key, handle);
      if (declares(content)) return { key, name: handle.name, content };
    } catch (error) { /* 同上 */ }
  }
  return null;
}

// 把一批「缺失模块」从已授权目录读进源码集合（**不抢占当前活动标签**）。
// 返回 { loaded: 文件名[], unresolved: 模块名[], needsPermission: bool }
async function loadMissingModulesFromDir(names) {
  const list = (Array.isArray(names) ? names : []).filter(Boolean);
  if (!list.length) return { loaded: [], unresolved: [], needsPermission: false };
  if (!sourceDirHandle) return { loaded: [], unresolved: list.slice(), needsPermission: false };
  if (!(await dirReadable(sourceDirHandle))) {
    return { loaded: [], unresolved: list.slice(), needsPermission: true };
  }
  const index = await indexSourceDirectory(sourceDirHandle);
  const existing = new Set(state.files.map((file) => String(file.name || "").toLowerCase()));
  const claimed = new Set();
  const items = [];
  const unresolved = [];
  for (const name of list) {
    const hit = await findModuleFileInDir(name, index, claimed, existing);
    if (!hit) { unresolved.push(name); continue; }
    claimed.add(hit.key);
    existing.add(String(hit.name).toLowerCase());
    items.push({ name: hit.name, content: hit.content });
  }
  const { added } = addSourceFiles(items, { activate: false });
  return { loaded: added, unresolved, needsPermission: false };
}

// #123 自动补齐入口：解析后（或切换顶层后）调用 —— 有已授权目录就自动读入缺失模块。
// 重入保护：本函数内部会再调 parseDesign()，而 parseDesign() 又会回调本函数，
// 用 depResolving 把嵌套调用一次性挡掉（不会递归、也不会重复汇报）。
async function resolveMissingDependencies() {
  if (depResolving) return { rounds: 0, loaded: [], unresolved: missingDependencyModules(), needsPermission: false };
  depResolving = true;
  const loaded = [];
  let unresolved = [];
  let needsPermission = false;
  let rounds = 0;
  try {
    while (rounds < DEP_RESOLVE_MAX_ROUNDS) {
      rounds += 1;
      unresolved = missingDependencyModules();
      if (!unresolved.length || !sourceDirHandle) break;
      const result = await loadMissingModulesFromDir(unresolved);
      if (result.needsPermission) { needsPermission = true; unresolved = result.unresolved; break; }
      if (!result.loaded.length) { unresolved = result.unresolved; break; }
      loaded.push(...result.loaded);
      parseDesign();   // 新模块进 design（depResolving 守卫保证不会递归）
    }
  } catch (error) {
    consoleOut(`依赖自动补齐出错：${(error && error.message) || error}`, "error");
  } finally {
    depResolving = false;
  }
  if (loaded.length) {
    consoleOut(`依赖自动补齐：已从源码目录「${sourceDirHandle ? sourceDirHandle.name : ""}」读入 ${loaded.length} 个源文件 —— ${loaded.join("、")}`, "ok");
  }
  reportMissingDependencies();
  return { rounds, loaded, unresolved, needsPermission };
}

// 选工程目录 → 递归收集 HDL 源文件（只读；跳过重目录，带文件数 / 深度护栏）。
async function scanSourceDirectory() {
  const dir = await window.showDirectoryPicker({ mode: "read", id: "wavepaint-source" });
  const index = await indexSourceDirectory(dir);
  const collected = [];
  for (const [key, handle] of index) {
    try {
      collected.push({ name: handle.name, content: await readDirFile(key, handle) });
    } catch (error) { /* 单个文件读失败（权限 / 占用）不阻断整次扫描 */ }
  }
  return collected;
}

// 入口（菜单「文件 → 打开源码目录（自动扫描依赖）…」）：
// 一次点击 = 选目录 + 递归读源码 + 自动解析 + 自动汇报依赖缺口；
// 目录句柄被记住，之后每次解析都会自动按顶层例化图补齐缺失模块（#123）。
async function openSourceDirectory() {
  if (typeof window.showDirectoryPicker !== "function") {
    consoleOut("当前浏览器不支持「打开源码目录」（需要 File System Access API）。请改用源码标签条的「＋」逐个选择源码文件。", "error");
    return;
  }
  let picked = [];
  try {
    picked = await scanSourceDirectory();
  } catch (error) {
    if (error && error.name === "AbortError") { setStatus("已取消打开源码目录。"); return; }
    consoleOut(`打开源码目录失败：${(error && error.message) || error}`, "error");
    return;
  }
  if (!picked.length) {
    setStatus("该目录（含子目录）下没有找到 .v / .sv / .vh / .svh 源码文件。");
    return;
  }
  // 源码还是出厂的 counter.sv（用户没动过）→ 用目录内容整体替换，避免出现 counter_2.sv 这类噪音
  if (state.files.length === 1 && state.files[0].content === DEFAULT_SOURCE) {
    state.files = [];
    state.active = 0;
  }
  const { added, renamed } = addSourceFiles(picked);
  if (!added.length) { setStatus("该目录下没有可导入的源码文件。"); return; }
  parseDesign();
  const renameNote = renamed.length ? `　同名文件已重命名：${renamed.join("、")}。` : "";
  const capped = picked.length >= SOURCE_DIR_MAX_FILES ? `（已达 ${SOURCE_DIR_MAX_FILES} 个文件上限，可能被截断）` : "";
  setStatus(`已从源码目录「${sourceDirHandle ? sourceDirHandle.name : ""}」导入 ${added.length} 个文件并自动解析。${renameNote}${capped}`);
  await resolveMissingDependencies();
}

// ─────────────────────────────────────────────────────────────────────────────
// 「打开顶层 → 自动扫描依赖」（第 52 轮 · #123 的入口形态）
// ─────────────────────────────────────────────────────────────────────────────
// 语义（对齐 Verdi 的 `-top` + filelist 行为）：用户选定一个顶层后，工具应当自己去把
// 该顶层**例化可达图**上缺定义的模块找出来，而不是让用户一个个地挑文件。
//   ① 已有授权过的源码目录（sourceDirHandle）→ 后台静默补齐（resolveMissingDependencies）；
//   ② 没有 → **在同一次用户手势里**直接弹系统「选择文件夹」，选完即递归读入并补齐；
//   ③ 用户取消过一次 → 本会话内不再弹框（避免每次切顶层都打扰），只往日志流写补齐提示，
//      之后仍可走菜单「文件 → 打开源码目录（自动扫描依赖）…」或标签条「＋」。
//
// ⚠ showDirectoryPicker 必须有用户手势（transient activation）。因此本函数**同步**发起
// 选择框，之后才 await —— 只能在点击 / change 这类事件处理器的同步段里调用。
// 没有手势（SecurityError）时只退回「写日志提示」，**不**记成用户拒绝。
function autoScanForTop(topName) {
  if (depResolving) return;
  const missing = missingDependencyModules(topName);
  if (!missing.length) return;                     // 依赖已闭合：什么都不做，不打扰用户
  if (sourceDirHandle) {                           // ① 已授权目录 → 静默补齐
    resolveMissingDependencies().catch(() => {});
    return;
  }
  if (autoScanDeclined || typeof window.showDirectoryPicker !== "function") {
    reportMissingDependencies();                   // ③ / 不支持 FSA → 只提示可执行的补齐路径
    return;
  }
  const dirName = String(topName || state.selectedTop || state.design?.topName || "").trim();
  let pickerPromise;
  try {
    // ② 同步发起（保住用户手势）：选择框此时已在系统层弹出
    pickerPromise = window.showDirectoryPicker({ mode: "read", id: "wavepaint-source" });
  } catch (error) {
    reportMissingDependencies();                   // 无手势等 → 静默降级，不写 autoScanDeclined
    return;
  }
  consoleOut([
    `依赖扫描：顶层 ${dirName || "（未命名）"} 例化了 ${missing.length} 个当前源码里没有定义的模块 ——`,
    `　${missing.join("、")}`,
    "　→ 已弹出文件夹选择框，请选择这些模块所在的源码目录（一次授权，之后自动补齐）。"
  ].join("\n"), "info");
  pickerPromise.then(async (dir) => {
    try {
      sourceDirHandle = dir || null;
      sourceDirIndex = null;                       // 换目录 → 索引与文本缓存一起失效
      sourceDirTextCache.clear();
      const index = await indexSourceDirectory(dir);
      const before = new Set(state.files.map((file) => String(file.name || "").toLowerCase()));
      const picked = [];
      for (const [key, handle] of index) {
        if (before.has(String(handle.name).toLowerCase())) continue;   // 已在源码集合里
        try { picked.push({ name: handle.name, content: await readDirFile(key, handle) }); }
        catch (error) { /* 单文件读失败不阻断整次扫描 */ }
      }
      if (picked.length) {
        addSourceFiles(picked, { activate: false });   // 不抢占用户正在看的标签
        parseDesign();
      }
      await resolveMissingDependencies();
    } catch (error) {
      autoScanDeclined = true;
      consoleOut(`依赖自动扫描失败：${(error && error.message) || error}`, "warn");
      reportMissingDependencies();
    }
  }, () => {
    // 用户点了取消 / 系统拒绝：本会话不再自动弹框，只保留日志提示
    autoScanDeclined = true;
    consoleOut("已取消选择源码目录。之后可用菜单「文件 → 打开源码目录（自动扫描依赖）…」或源码标签条的「＋」补齐缺失模块。", "info");
    reportMissingDependencies();
  });
}

// ---------------------------------------------------------------------------
// #86 A4 + #76 B5：工程附加状态（源码文件集合 + 画布观察行）随 .wp 存档 / 恢复
// ---------------------------------------------------------------------------
// 口径：**不改核心**（js/wavepaint.clean.js 是解混淆产物，改一行都要背上回归风险），
// 改用「包裹核心两个顶层函数」给工程 JSON 追加：
//   · `sourceFiles` + `activeSourceIndex` —— #86 A4：源码文件集合 / 当前标签页；
//   · `simWatches`                        —— #76 B5：画布上的「观察行」登记
//     （= VCD 树点行 / 代码里点变量加进来的信号，state.simWatches）。
//   · `buildDocumentJson` —— 保存 / 分享链接共用；核心内部是 `buildDocumentJson(item)`
//     动态查表（classic script 的顶层 function 声明即全局对象属性），所以包裹
//     `window.buildDocumentJson` 对 `saveToFile` / `createShareLink` 一并生效；
//   · `loadFromFileContent` —— 覆盖「打开 / 载入示例 / 分享链接(#d=)」全部载入路径。
// 注入方式用**文本拼接**而不是二次 JSON.parse+stringify：波形文档可能很大，
// 保存时不该把整份文档再解析一遍（JSON.stringify 才是耗时大头）。
// 旧工程没有这些字段 → 保持当前源码集合不动（向后兼容）；观察行则以工程为准。
let archiveBridgeInstalled = false;

function indentBlock(text, indent) {
  const pad = " ".repeat(indent);
  return String(text).split("\n").map((line) => pad + line).join("\n");
}

// 把若干 { 字段名: 值 } 追加进核心产物 JSON 的末尾。
// 核心产物形如 `{\n  "sampleCount": 30,\n  …\n}`（JSON.stringify(val, null, 2)），
// 因此在最后一个 `}` 之前插入即可 —— 不解析、不重排，只做一次字符串拼接。
function injectArchiveFields(json, fields) {
  const text = String(json || "");
  const braceAt = text.lastIndexOf("}");
  if (braceAt < 0) return text;
  const head = text.slice(0, braceAt).replace(/[\s,]+$/, "");
  const tail = text.slice(braceAt);
  if (!/\{/.test(head)) return text;             // 不是对象字面量（异常输入）→ 原样返回
  const block = (Array.isArray(fields) ? fields : [])
    .filter((field) => Array.isArray(field) && typeof field[0] === "string" && field[0])
    .map((field) => `${JSON.stringify(field[0])}: ${JSON.stringify(field[1], null, 2)}`)
    .join(",\n");
  if (!block) return text;
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

// #76 B5：观察行登记 → 存档副本。只存「怎么找回它」的元数据（VCD 全路径 / 显示名 /
// 位宽 / reference）；波形数据本身在核心的 `signals` 里（核心不认得注入行，会把观察行
// 一并当普通信号存档），恢复时按 path 认领回来（见 adoptArchivedWatchRows）。
function archiveSimWatches() {
  return (Array.isArray(state.simWatches) ? state.simWatches : [])
    .filter((watch) => !!watch?.path)
    .map((watch) => ({
      path: String(watch.path),
      name: String(watch.name ?? watch.path),
      width: Math.max(1, Number(watch.width) || 1),
      reference: String(watch.reference ?? "")
    }));
}

function installProjectArchiveBridge() {
  if (archiveBridgeInstalled) return true;
  if (typeof window.buildDocumentJson !== "function" || typeof window.loadFromFileContent !== "function") {
    // 核心未按预期暴露顶层函数（结构变了）→ 静默降级：工程仍可存取，只是不带附加状态。
    console.warn("[WavePaint] 工程存档桥未安装：核心未暴露 buildDocumentJson / loadFromFileContent。");
    return false;
  }
  const originalBuild = window.buildDocumentJson;
  const originalLoad = window.loadFromFileContent;
  window.buildDocumentJson = function (item) {
    const json = originalBuild.apply(this, arguments);
    try {
      return injectArchiveFields(json, [
        ["sourceFiles", archiveSourceFiles()],
        ["activeSourceIndex", Math.max(0, Number(state.active) || 0)],
        ["simWatches", archiveSimWatches()]
      ]);
    } catch (error) {
      console.warn("[WavePaint] 注入工程附加状态失败（工程本身仍正常保存）：", error);
      return json;
    }
  };
  window.loadFromFileContent = function (item, text) {
    const ok = originalLoad.apply(this, arguments);
    if (ok) {
      try {
        applyArchivedExtras(text);
      } catch (error) {
        console.warn("[WavePaint] 恢复工程附加状态失败（波形本身已载入）：", error);
      }
    }
    return ok;
  };
  archiveBridgeInstalled = true;
  return true;
}

// 载入工程后把附加状态接回来：源码集合 + 观察行登记，然后重绘画布。
// ⚠ 画布已整体换人：上一份设计留下的仿真结果（VCD / outputs / 观察行）对新画布没有
// 意义，先清干净 —— 否则 syncSimRows 会拿旧 VCD 去刷新载入的观察行（数据张冠李戴）。
function applyArchivedExtras(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || ""));
  } catch (error) {
    return;   // 分享链接的压缩载荷等场景：解析不了就跳过（波形载入不受影响）
  }
  state.vcd = null;
  state.outputs = [];
  state.simWatches = [];
  const files = applySourceFilesFromArchive(parsed);
  const watches = applySimWatchesFromArchive(parsed);
  if (!refs.sourceFiles) return;   // 面板尚未就绪（如启动即带 #d= 链接）：init() 会用新的 state 渲染
  refreshVcdTree();
  syncSimRows();
  render();
  const notes = [];
  if (files) notes.push(`已从工程恢复 ${files} 个源码文件并自动解析`);
  if (watches) notes.push(`已恢复 ${watches} 个观察行`);
  if (notes.length) setStatus(notes.join("；") + "。");
}

// 工程里带 sourceFiles → 整体替换源码集合（并刷新标签页/RTL 树）；返回恢复的文件数。
// 不带（旧工程）→ 保持现状，避免把用户正在编辑的源码清掉。
function applySourceFilesFromArchive(parsed) {
  const raw = Array.isArray(parsed?.sourceFiles) ? parsed.sourceFiles : null;
  if (!raw || !raw.length) return 0;
  const files = raw
    .filter((file) => file && typeof file.name === "string" && file.name.trim())
    .map((file) => ({ name: String(file.name), content: String(file.content ?? "") }));
  if (!files.length) return 0;
  state.files = files;
  state.active = Math.max(0, Math.min(files.length - 1, Number(parsed.activeSourceIndex) || 0));
  if (!refs.sourceFiles) return files.length;   // 面板尚未就绪：init() 会用新的 state.files 渲染
  renderFileTabs();   // 必须先切编辑器文本，再 parseDesign（否则 syncEditor 会把旧文本回写进新文件）
  parseDesign();      // 重新解析 + 刷新 RTL 结构树
  return files.length;
}

// 工程里带 simWatches → 覆盖观察行登记，并把核心当「普通信号」载入的观察行副本
// 认领回注入语义（见 adoptArchivedWatchRows）；返回恢复的观察行数。
// 不带该字段 → 观察行以「工程本身」为准（= 空）：新画布上不该残留上一个工程的观察行。
function applySimWatchesFromArchive(parsed) {
  const raw = Array.isArray(parsed?.simWatches) ? parsed.simWatches : null;
  if (!raw) return 0;
  const watches = raw
    .filter((watch) => watch && typeof watch.path === "string" && watch.path.trim())
    .map((watch) => ({
      path: String(watch.path),
      name: String(watch.name ?? watch.path),
      width: Math.max(1, Number(watch.width) || 1),
      reference: String(watch.reference ?? "")
    }));
  state.simWatches = watches;
  adoptArchivedWatchRows(watches);
  return watches.length;
}

// 核心的 loadFromFileContent 不认得注入行：buildDocumentJson 会把观察行连同行数据一起
// 存成**普通信号**，载入后它们就丢了「注入」身份 —— 后果是它们会被 readWaveDocument 当成
// 用户画的激励信号去生成 TB（脏激励），重新仿真后也不会刷新。
// 这里按「行名 == 观察路径」（buildWatchSignal 用 path 当行名）把行认领回来，
// 并把存档里的位宽元数据补回行上（核心不还原 width/msb/lsb，名字列会丢掉 `[3:0]`）。
function adoptArchivedWatchRows(watches) {
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_signals)) return 0;
  const byPath = new Map(watches.map((watch) => [watch.path, watch]));
  let adopted = 0;
  for (const signal of dw.m_signals) {
    if (!signal || signal.__simInjected) continue;
    const watch = byPath.get(String(signal.name || ""));
    if (!watch) continue;
    signal.__simInjected = true;
    signal.__simWatchPath = watch.path;
    signal.width = watch.width;
    signal.kind = watch.width > 1 ? "vector" : "logic";
    signal.msb = watch.width > 1 ? String(watch.width - 1) : "";
    signal.lsb = watch.width > 1 ? "0" : "";
    adopted += 1;
  }
  return adopted;
}

// 新建工程：源码集合 + 仿真结果（VCD / outputs / 观察行）一并复位
// （与 C12 的「新建就地重置」口径一致：新画布不该残留上一个工程的任何东西）。
function resetSourceFiles() {
  state.files = [{ id: "file0", name: "design.sv", content: "" }];
  state.active = 0;
  state.design = null;
  state.vcd = null;
  state.outputs = [];
  state.lastTestbench = "";
  state.simWatches = [];
  refs.sourceFiles && renderFileTabs();
  refs.rtlTree && refreshStructureTrees();
  refreshVcdTree();
  updateTbViewer();
  render();
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
  refs.addFile?.addEventListener("click", addFile);
  refs.importFile?.addEventListener("click", importSourceFiles);
  refs.removeFile?.addEventListener("click", removeFile);
  refs.parseBtn?.addEventListener("click", parseDesign);
  refs.topSelect?.addEventListener("change", () => {
    state.selectedTop = refs.topSelect.value || null;
    const design = effectiveDesign();
    const ports = design?.topModule?.ports || [];
    consoleOut(ports.length
      ? `${design.topName}: ${ports.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
      : `⚠ ${design.topName} 未解析到端口。`,
      ports.length ? "info" : "warn");
    setStatus(`顶层模块已切换为 ${design.topName}，点「自动加信号」或「生成 TB」生效。`);
    // #123：换顶层 = 换依赖子图 → 自动扫描该顶层缺的例化模块。
    // ⚠ 必须在 change 事件处理器的**同步段**里调用（autoScanForTop 同步发起
    // showDirectoryPicker，晚一拍就没有用户手势了）。
    autoScanForTop(state.selectedTop);
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
    consoleOut("正在拉起本地仿真服务（首次会询问是否允许打开 wavepaint:，请选择允许）...", "info");
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

// 第二十一轮：侧栏「可拖拽多面板」装配（折叠 / 高度分割 / 宽度 / session 持久化）。
// 布局失败（DOM 缺节点）不影响仿真功能：installSimPanelLayout 返回 null，
// 侧栏退回 CSS 兜底（四张卡片均分高度、无拖拽），既有 id/class 语义不变。
function initPanelLayout() {
  // 停靠引擎接管时让位：js/sim/dock/workspace.js 会把四张卡片整块搬进面板
  // （布局树自己管），侧栏那套「折叠 / 高度分割 / 宽度拖拽」在这时既无意义，
  // 还会往卡片上写 inline flex 样式去干扰面板内的排布。带 ?dock=off 时
  // window.__wpDock 未定义 → 照旧装配，旧侧栏 UI 完整可用。
  if (window.__wpDock) return;
  if (!refs.panel || !refs.panelBody) return;
  panelLayout = installSimPanelLayout({
    panel: refs.panel,
    body: refs.panelBody,
    handle: refs.resizeHandle,
    onLayout: (info) => {
      // 高度分割后代码区（CM6）要重新测量一次；宽度变化由 panel-layout 自行派发
      // window resize（核心 editor/measure.js 监听它重排画布），这里不重复。
      if (String(info?.reason || "").startsWith("split")) sourceCodeView?.remeasure?.();
    }
  });
}

function init() {
  initRefs();
  if (!refs.panel || !refs.sourceEditor) return;
  initSourceCodeView();
  initTbCodeView();
  bindEvents();
  initPanelLayout();
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
  // ⚠ 第 44 轮删除底部状态栏后，镜像节点 #wp-version 也没了；停靠模式下
  // #app-version 所在的 #sim-panel 被隐藏，版本号改为写进「仿真状态」日志流，
  // 「用户可自查是不是旧 exe」这条能力不丢。
  if (!elVer) return;
  fetch("version.txt", { cache: "no-store" })
    .then((r) => (r.ok ? r.text() : ""))
    .then((t) => {
      const text = String(t || "").replace(/^\uFEFF/, "").trim();
      if (text) {
        if (elVer) { elVer.textContent = text; elVer.title = text; }
        consoleOut("[WavePaint] " + text, "info");
      }
    })
    .catch(() => { /* 无版本文件（如 dev-server）：留空 */ });
}

// #86 A4：存档桥必须尽早安装 —— 分享链接（#d=/#j=）的自动载入发生在核心初始化阶段，
// 装晚了就会漏掉那一次「载入 → 恢复源码集合」。模块求值时机早于 DOMContentLoaded。
installProjectArchiveBridge();

// ── 工具带实测高度 → CSS 变量 --wp-toolbar-h（第 37 轮）──────────────────────
// 用途：旧侧栏 #sim-panel 是 position:fixed，index.html 里用
//   top: calc(40px + var(--wp-toolbar-h, 46px) + 6px)
// 贴到工具带下缘。工具带在窄窗口下允许换行（css/workspace.css §0.5），高度不再是
// 恒定的 46px —— 写死的话侧栏会反过来盖住工具带末端的「自动加信号 / 运行仿真」
// （e2e-ui I8 在 750x485 下按坐标点它时命中 #sim-panel-header 就是这个原因）。
// 停靠模式（body.wp-dock）下侧栏 display:none，写这个变量同样无害：只改一个 CSS
// 变量，不碰任何布局状态、不重绘真机节点。
function syncToolbarHeight() {
  const bar = document.getElementById("toolbar");
  if (!bar) return;
  const h = Math.round(bar.getBoundingClientRect().height);
  const root = document.documentElement;
  if (h > 0 && root && root.style && typeof root.style.setProperty === "function") {
    root.style.setProperty("--wp-toolbar-h", h + "px");
  }
}
syncToolbarHeight();
if (typeof window.addEventListener === "function") window.addEventListener("resize", syncToolbarHeight);
if (typeof document.addEventListener === "function") document.addEventListener("DOMContentLoaded", syncToolbarHeight);
if (typeof ResizeObserver === "function") {
  const bar = document.getElementById("toolbar");
  if (bar) new ResizeObserver(() => syncToolbarHeight()).observe(bar);
}

// 调试 / 自动化测试入口（e2e 探针用；不参与产品逻辑，不写入全局状态）。
window.__wpsim = {
  get sourceFiles() { return state.files.map((file) => ({ name: file.name, content: file.content })); },
  get active() { return state.active; },
  get archiveInstalled() { return archiveBridgeInstalled; },
  // 第二十一轮：侧栏多面板布局状态（e2e 核验折叠 / 权重 / 宽度；产品逻辑不读它）
  get panelLayout() { return panelLayout ? panelLayout.getState() : null; },
  setPanelWidth(px) { return panelLayout ? panelLayout.setWidth(px) : null; },
  resetPanelLayout() { return panelLayout ? panelLayout.reset() : null; },
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
  // #87②：模块/实例全部接口一键入波形（Ctrl+Alt+4 的等价入口）。
  // 探针可造 {name, fileIndex, line}（名字填实例名则按实例作用域，否则按所在模块）。
  addModulePortsFromCode,
  moduleScopesOf(moduleName) {
    return moduleScopes(currentSymbolIndex(), moduleName).map((entry) => ({ ...entry }));
  },
  modulePortsOf(moduleName) {
    return modulePorts(currentSymbolIndex(), moduleName)
      .map((port) => ({ name: port.name, direction: port.direction, width: port.width, line: port.line }));
  },
  // 直接按 VCD 全路径批量入波形（返回 {ready,added,existed,missing}）；e2e 核验批量语义用。
  addVcdPathsToWave,
  // 第 46 轮：TB 面板改成 CM 只读代码框后，探针需要一条「塞入 TB 文本」的等价入口
  // （等价于跑完一次仿真），以及一份 TB 视图实况（是否 CM / 是否只读 / 高亮 token 配色）。
  setTestbench(text) {
    state.lastTestbench = String(text == null ? "" : text);
    updateTbViewer();
    return tbCodeView?.getText?.() || "";
  },
  get testbenchView() {
    const host = refs.tbCmHost || null;
    const editor = host ? host.querySelector(".cm-editor") : null;
    const content = editor ? editor.querySelector(".cm-content") : null;
    const styles = new Set();
    if (content) {
      content.querySelectorAll("span").forEach((span) => {
        const cls = String(span.className || "");
        if (!cls) return;
        styles.add(cls + " | " + getComputedStyle(span).color);
      });
    }
    return {
      cm: !!editor,
      hostVisible: !!host && getComputedStyle(host).display !== "none",
      textareaHidden: !!refs.tbSource && refs.tbSource.style.display === "none",
      editable: content ? content.getAttribute("contenteditable") : null,
      text: tbCodeView?.getText?.() || "",
      tokenStyles: [...styles]
    };
  },
  // 与代码区取词口径一致（光标/选区 → 符号名）；无 CM 时读 textarea。
  get codeContext() {
    return sourceCodeView?.getContext?.() || { name: "", line: 0, selection: "", exact: false, source: "none" };
  },
  // 当前候选选择器的用途（"symbol" = B4 选信号 / "scope" = #87② 选作用域）；未弹出为 null。
  get pickerMode() {
    return symbolPicker?.node?.dataset?.pickerMode || null;
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
  // #76 B3：代码 → 树 反向定位（高亮 + 滚动）的自动化入口。
  // 传 context {name, fileIndex, line, …} 等价于「把光标放到该变量上」；不传则读当前编辑器光标。
  syncActiveFromCode,
  clearActiveHighlight,
  get activeSymbol() {
    if (!activeHighlight) return null;
    return {
      name: activeHighlight.name,
      fileIndex: activeHighlight.fileIndex,
      line: activeHighlight.line,
      path: activeHighlight.path || "",
      targetKind: activeHighlight.target?.kind || ""
    };
  },
  // 当前高亮的 RTL 行（读 DOM 上的 data-rtl-*，与渲染/定位同源）；无高亮 → null。
  get highlightedRtlRow() {
    const el = refs.rtlTree?.querySelector?.(".rtl-active") || null;
    if (!el) return null;
    return {
      kind: el.dataset.rtlKind || "",
      fileIndex: Number(el.dataset.fileIndex),
      line: Number(el.dataset.line) || 0,
      moduleName: el.dataset.moduleName || "",
      instanceName: el.dataset.instanceName || "",
      name: el.dataset.name || "",
      text: String(el.textContent || "").trim()
    };
  },
  get highlightedVcdPath() {
    const el = refs.vcdTree?.querySelector?.(".vcd-active") || null;
    return el ? (el.dataset.vcdPath || "") : null;
  },
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
  // #76 B5：核心画布口径下的「用户设计信号」名 —— 即 readWaveDocument 真正会喂给 TB 的行
  // （观察行被 stripInjectedSignals 剔除）。e2e 用它核验「载入工程后观察行不再当激励」。
  get designSignalNames() {
    return stripInjectedSignals(window.document_wave?.m_signals || [])
      .map((signal) => String(signal?.name || ""));
  },
  // 当前源码集合快照（探针 / 自动化核验用；只读拷贝，外部改不动内部数组）。
  get sourceFiles() {
    return (Array.isArray(state.files) ? state.files : []).map((file) => ({
      name: String(file?.name || ""),
      content: String(file?.content ?? "")
    }));
  },
  setSourceFiles,
  resetSourceFiles,
  importSourceFiles,
  // 重新解析当前源码集合并刷新 RTL 结构树（探针改完源码后手动触发；setSourceFiles 已内含）。
  parseDesign,
  // #122 顶层依赖自动扫描（e2e / 探针入口）：
  //   missingDependencyModules() —— 纯计算，返回「被例化但没定义」的模块名数组；
  //   addSourceFiles(items)      —— 把 {name,content}[] 并进源码集合（同名去重，不解析）；
  //   reportMissingDependencies()—— 走一遍扫描 + 写日志流，返回同一数组；
  //   openSourceDirectory()      —— 等价于点菜单「打开源码目录（自动扫描依赖）…」
  //                                 （探针可先 stub window.showDirectoryPicker）。
  //   #123 自动补齐：
  //   setSourceDirHandle(handle)     —— 直接登记一个目录句柄（探针用 fake handle 注入，
  //                                    真机等同「用户刚授权过这个目录」）；
  //   resolveMissingDependencies()   —— 按当前顶层例化图自动补齐缺失模块；
  //   loadMissingModulesFromDir(list)—— 只做「读进来」这一步（不解析、不汇报）。
  missingDependencyModules,
  addSourceFiles,
  reportMissingDependencies,
  openSourceDirectory,
  setSourceDirHandle(handle) { sourceDirHandle = handle || null; sourceDirIndex = null; },
  resolveMissingDependencies,
  loadMissingModulesFromDir,
  // autoScanForTop(topName) —— 「打开顶层 → 自动扫描依赖」入口（#123）。
  // 探针可先 stub window.showDirectoryPicker 返回 fake 句柄，再调它验证整条链。
  // resetAutoScanDecline()  —— 清掉「用户已取消过一次」的会话标志（探针用例间隔离用）。
  autoScanForTop,
  resetAutoScanDecline() { autoScanDeclined = false; }
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
