import { createSampleProject, normalizeProject, exportProject, normalizeVectorValue, formatVectorValue } from "./model.js";
import { renderWaveScene } from "./renderer.js";
import { buildAutoTestbench, buildPlaceholderOutputsFromPorts, buildSimulationPayload, parseVerilogDesign, syncProjectSignalsToDesign, vcdToProjectOutputs } from "./sim.js";
import { saveJsonFile, uid } from "./utils.js";

const STORAGE_KEY = "waveworkbench.project.v2";
const DRAW_TOOLS = ["cursor", "select", "paint", "erase"];
const BIT_STATES = ["1", "0", "x", "z"];

const state = {
  project: loadProject(),
  logs: [],
  ports: [],
  design: null,
  designKey: "",
  history: [],
  future: [],
  clipboard: null,
  selection: null,
  simulationOutputs: null,
  lastSnapshotPath: "",
  paintSession: null,
  dragState: null
};

function emptySegmentStyle() {
  return { color: null, hatched: false, fill: null };
}

function cloneSegmentStyle(style) {
  return style ? { color: style.color ?? null, hatched: !!style.hatched, fill: style.fill ?? null } : emptySegmentStyle();
}

function resizeMetaArray(source, length, factory) {
  return Array.from({ length }, (_, index) => factory(source?.[index], index));
}

const app = document.querySelector("#app");
app.innerHTML = `
  <div class="shell">
    <header class="menu-bar">
      <div class="menu-left">
        <div class="brand-mark">WaveWorkbench</div>
        <button class="menu-item">文件</button>
        <button class="menu-item">编辑</button>
        <button class="menu-item">视图</button>
        <button class="menu-item">仿真</button>
        <button class="menu-item">帮助</button>
      </div>
      <div class="menu-right">Quartus × WavePaint 風格</div>
    </header>

    <header class="toolbar">
      <div class="tool-group">
        <button data-action="save">保存</button>
        <button data-action="copy">复制</button>
        <button data-action="paste">粘贴</button>
        <button data-action="delete">删除</button>
        <button data-action="load-sample">示例</button>
        <button data-action="undo">撤销</button>
        <button data-action="redo">重做</button>
      </div>
      <div class="tool-group">
        <button data-action="zoom-out">缩小</button>
        <button data-action="zoom-in">放大</button>
        <button data-action="zoom-fit">适应</button>
      </div>
      <div class="tool-group dropdown">
        <button data-action="toggle-add-menu">添加信号</button>
        <div class="dropdown-menu" data-menu="add">
          <button data-template="bit">位信号</button>
          <button data-template="clock">时钟</button>
          <button data-template="reset">复位</button>
          <button data-template="pulse">脉冲</button>
          <button data-template="vector">向量</button>
        </div>
      </div>
      <div class="tool-group bit-picker">
        <button data-state="1" class="bit-state">1</button>
        <button data-state="0" class="bit-state">0</button>
        <button data-state="x" class="bit-state">X</button>
        <button data-state="z" class="bit-state">Z</button>
      </div>
      <div class="tool-group">
        <button data-tool="cursor" class="tool-button">Cursor</button>
        <button data-tool="select" class="tool-button">Select</button>
        <button data-tool="paint" class="tool-button">Paint</button>
        <button data-tool="erase" class="tool-button">Erase</button>
      </div>
      <div class="tool-group">
        <label class="inline-field">Steps<input id="sample-spin" type="number" min="4" max="4096"></label>
        <label class="inline-field">Sub<input id="substep-spin" type="number" min="1" max="32"></label>
      </div>
      <div class="tool-group">
        <button data-action="parse-verilog">解析</button>
        <button data-action="build-tb">生成TB</button>
        <button data-action="simulate">仿真</button>
      </div>
    </header>

    <main class="workspace">
      <aside class="panel left-panel">
        <div class="panel-section">
          <div class="section-title">Signals</div>
          <div id="project-name" class="project-name"></div>
          <div id="stimulus-list" class="signal-list"></div>
        </div>
        <div class="panel-section compact">
          <div class="section-title">编辑</div>
          <label class="field">项目名<input id="project-name-input" type="text"></label>
          <label class="field">信号名<input id="signal-name" type="text"></label>
          <label class="field">角色<select id="signal-role"><option value="stimulus">Stimulus</option><option value="result">Result</option></select></label>
          <label class="field">类型<select id="signal-kind"><option value="logic">Logic</option><option value="clock">Clock</option><option value="vector">Vector</option></select></label>
          <label class="field">位宽<input id="signal-width" type="number" min="1" max="1024"></label>
          <label class="field">进制<select id="signal-radix"><option value="hexadecimal">Hex</option><option value="decimal">Dec</option><option value="binary">Bin</option></select></label>
        </div>
      </aside>

      <section class="editor">
        <div class="timeline-bar">
          <span class="badge">手绘输入 / 仿真输出 同屏显示</span>
          <span class="hint">拖拽即可绘制波形；选中 Cursor 只做选择。</span>
        </div>
        <div id="wave-view" class="wave-view"></div>
      </section>

      <aside class="panel right-panel">
        <div class="panel-section">
          <div class="section-title">Result</div>
          <div id="result-list" class="signal-list"></div>
        </div>
        <div class="panel-section">
          <div class="section-title">Verilog / SV</div>
          <div class="source-toolbar">
            <div id="source-files" class="source-files"></div>
            <div class="source-actions">
              <button data-action="source-add">Add</button>
              <button data-action="source-remove">Remove</button>
            </div>
          </div>
          <textarea id="verilog-source" spellcheck="false"></textarea>
          <div class="helper-box">
            <div id="port-preview" class="helper"></div>
            <div id="module-preview" class="helper"></div>
          </div>
        </div>
        <div class="panel-section">
          <div class="section-title">Testbench (TB)</div>
          <textarea id="tb-source" spellcheck="false" readonly placeholder="点击「生成TB」或「仿真」后自动生成。"></textarea>
          <div class="helper-box">
            <button data-action="tb-copy" type="button">复制</button>
          </div>
        </div>
      </aside>
    </main>

    <footer class="status-bar"><pre id="logs" class="logs"></pre></footer>
  </div>`;

const refs = {
  nameInput: document.querySelector("#project-name-input"),
  name: document.querySelector("#project-name"),
  wave: document.querySelector("#wave-view"),
  stimulusList: document.querySelector("#stimulus-list"),
  resultList: document.querySelector("#result-list"),
  logs: document.querySelector("#logs"),
  verilogSource: document.querySelector("#verilog-source"),
  tbSource: document.querySelector("#tb-source"),
  sourceFiles: document.querySelector("#source-files"),
  portPreview: document.querySelector("#port-preview"),
  modulePreview: document.querySelector("#module-preview"),
  signalName: document.querySelector("#signal-name"),
  signalRole: document.querySelector("#signal-role"),
  signalKind: document.querySelector("#signal-kind"),
  signalWidth: document.querySelector("#signal-width"),
  signalRadix: document.querySelector("#signal-radix"),
  sampleSpin: document.querySelector("#sample-spin"),
  substepSpin: document.querySelector("#substep-spin"),
  toolButtons: Array.from(document.querySelectorAll("[data-tool]")),
  stateButtons: Array.from(document.querySelectorAll("[data-state]")),
  addMenu: document.querySelector("[data-menu='add']")
};

bindEvents();
startBackendHeartbeat();
window.addEventListener("error", (event) => {
  log(`[error] ${event.message}`);
  render();
});
render();

function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createSampleProject();
  try {
    const parsed = JSON.parse(raw);
    const isLegacyDemo = parsed
      && parsed.name === "WaveWorkbench Demo"
      && Array.isArray(parsed.signals)
      && parsed.signals.some((signal) => ["a", "b", "rst_n", "clk"].includes(signal?.name))
      && Array.isArray(parsed.sourceFiles)
      && parsed.sourceFiles[0]?.name === "dut.v";
    if (isLegacyDemo) return createSampleProject();
    return normalizeProject(parsed);
  } catch {
    return createSampleProject();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exportProject(state.project)));
}

function startBackendHeartbeat() {
  setInterval(() => {
    fetch("/api/ping", { cache: "no-store" }).catch(() => {});
  }, 5000);
}

function invalidateSimulation() {
  state.simulationOutputs = null;
  state.lastTestbench = "";
  updateTbViewer();
}

function updateTbViewer() {
  if (refs.tbSource) {
    refs.tbSource.value = state.lastTestbench || "";
  }
}

function copyTb() {
  const text = state.lastTestbench || (refs.tbSource && refs.tbSource.value) || "";
  if (!text) {
    log("No testbench to copy.");
    return;
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard.writeText(text)
      .then(() => log("TB copied to clipboard."))
      .catch(() => log("Copy failed."));
  } else {
    log("Clipboard not available.");
  }
}

async function saveSnapshotToDisk(reason) {
  const payload = exportProject(state.project);
  try {
    const response = await fetch("/api/snapshot", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: JSON.stringify(payload, null, 2)
    });
    const text = await response.text();
    if (!/^SNAPSHOT-OK:/m.test(text)) {
      throw new Error(text || "Snapshot failed.");
    }
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    state.lastSnapshotPath = lines[1] || "";
    log(`Snapshot saved${reason ? ` (${reason})` : ""}: ${state.lastSnapshotPath}`);
    return state.lastSnapshotPath;
  } catch (error) {
    log(`Snapshot failed${reason ? ` (${reason})` : ""}: ${error}`);
    return "";
  }
}

function log(message) {
  state.logs.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  state.logs = state.logs.slice(0, 12);
}

function summarizeSimulationOutputs(outputs) {
  if (!Array.isArray(outputs) || !outputs.length) return "none";
  return outputs.map((signal) => {
    const width = signalDisplayWidth(signal);
    const finalValue = signal.values?.[signal.values.length - 1];
    const formatted = width > 1
      ? formatVectorValue(finalValue, width, signalDisplayRadix(signal))
      : normalizeVectorValue(finalValue, 1);
    const scope = signal.scope ? ` @${signal.scope}` : "";
    return `${signal.name}=${formatted}${scope}`;
  }).join("; ");
}

function pushHistory() {
  state.history.push(JSON.stringify(exportProject(state.project)));
  if (state.history.length > 50) state.history.shift();
  state.future = [];
}

function restoreSnapshot(snapshot) {
  state.project = normalizeProject(JSON.parse(snapshot));
}

function selectedSignal() {
  const selectedId = state.project.selectedSignalId;
  const signal = state.project.signals.find((item) => item.id === selectedId);
  if (signal) return signal;
  if (!state.project.signals.length) {
    return state.project.outputs.find((item) => item.id === selectedId) || state.project.outputs[0] || null;
  }
  return state.project.signals[0] || null;
}

function signalDisplayWidth(signal) {
  return Math.max(1, Number(signal?.width) || 1);
}

function signalDisplayRadix(signal) {
  return ["binary", "decimal", "hexadecimal"].includes(signal?.radix) ? signal.radix : "hexadecimal";
}

function signalDisplayLabel(signal, cellIndex) {
  if (!signal) return "";
  const width = signalDisplayWidth(signal);
  const value = signal.values?.[cellIndex];
  const label = signal.labels?.[cellIndex];
  const base = String(label || "").trim();
  if (base) return base;
  return formatVectorValue(value, width, signalDisplayRadix(signal));
}

function activeSourceFile() {
  const files = Array.isArray(state.project.sourceFiles) ? state.project.sourceFiles : [];
  return files.find((file) => file.id === state.project.activeSourceFileId) || files[0] || null;
}

function combinedSourceText() {
  return (Array.isArray(state.project.sourceFiles) ? state.project.sourceFiles : [])
    .map((file) => `// file: ${file.name}\n${file.content || ""}`)
    .join("\n\n");
}

function ensureDesignSynced() {
  const sourceKey = combinedSourceText();
  if (state.design && state.designKey === sourceKey) return state.design;
  const design = parseVerilogDesign(sourceKey);
  state.design = design;
  state.designKey = sourceKey;
  state.ports = design.topModule?.ports || [];
  state.simulationOutputs = null;
  if (design.topModule) {
    const synced = syncProjectSignalsToDesign(state.project, design);
    state.project.signals = synced.signals;
    state.project.selectedSignalId = synced.selectedSignalId;
  }
  return design;
}

function ensureActiveSourceFile() {
  if (!Array.isArray(state.project.sourceFiles) || !state.project.sourceFiles.length) {
    state.project.sourceFiles = [{ id: uid("file"), name: "dut.sv", content: "" }];
  }
  if (!state.project.activeSourceFileId) {
    state.project.activeSourceFileId = state.project.sourceFiles[0].id;
  }
}

function renderSourceFiles() {
  ensureActiveSourceFile();
  refs.sourceFiles.replaceChildren(...state.project.sourceFiles.map((file) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "source-file";
    if (file.id === state.project.activeSourceFileId) button.classList.add("active");
    button.textContent = file.name;
    button.addEventListener("click", () => {
      state.project.activeSourceFileId = file.id;
      render();
    });
    return button;
  }));
  const active = activeSourceFile();
  if (active && document.activeElement !== refs.verilogSource) {
    refs.verilogSource.value = active.content || "";
  }
}

function updateActiveSourceContent(text) {
  const active = activeSourceFile();
  if (!active) return;
  active.content = String(text || "");
  invalidateSimulation();
}

function syncEditorToModel() {
  const active = activeSourceFile();
  if (!active) return;
  active.content = String(refs.verilogSource.value || "");
}

function selectedSignalIndex() {
  return Math.max(0, state.project.signals.findIndex((signal) => signal.id === state.project.selectedSignalId));
}

function clampCell(cellIndex) {
  return Math.max(0, Math.min(state.project.timeSteps - 1, Number(cellIndex) || 0));
}

function clampSignalIndex(signalIndex) {
  if (!state.project.signals.length) return 0;
  return Math.max(0, Math.min(state.project.signals.length - 1, Number(signalIndex) || 0));
}

function normalizedSelection() {
  if (!state.selection) return null;
  const startSignalIndex = clampSignalIndex(state.selection.startSignalIndex);
  const endSignalIndex = clampSignalIndex(state.selection.endSignalIndex);
  const startCell = clampCell(state.selection.startCell);
  const endCell = clampCell(state.selection.endCell);
  return {
    startSignalIndex: Math.min(startSignalIndex, endSignalIndex),
    endSignalIndex: Math.max(startSignalIndex, endSignalIndex),
    startCell: Math.min(startCell, endCell),
    endCell: Math.max(startCell, endCell)
  };
}

function setSelection(startSignalIndex, startCell, endSignalIndex = startSignalIndex, endCell = startCell) {
  state.selection = {
    startSignalIndex,
    startCell,
    endSignalIndex,
    endCell
  };
}

function clearSelection() {
  state.selection = null;
}

function activePaintValue() {
  if (state.project.drawTool === "erase") return "x";
  if (BIT_STATES.includes(state.project.paintState)) return state.project.paintState;
  return "1";
}

function normalizeTool(tool) {
  return DRAW_TOOLS.includes(tool) ? tool : "paint";
}

function syncSignalLengths() {
  for (const signal of [...state.project.signals, ...state.project.outputs]) {
    const width = signalDisplayWidth(signal);
    signal.values = Array.from({ length: state.project.timeSteps }, (_, index) => normalizeVectorValue(signal.values?.[index], width));
    signal.labels = Array.from({ length: state.project.timeSteps }, (_, index) => String(signal.labels?.[index] || ""));
    signal.segmentStyles = resizeMetaArray(signal.segmentStyles, state.project.timeSteps, (entry) => cloneSegmentStyle(entry));
    signal.driveStrengths = resizeMetaArray(signal.driveStrengths, state.project.timeSteps, (entry) => entry ?? "strong");
    signal.clockMarkers = resizeMetaArray(signal.clockMarkers, state.project.timeSteps, (entry) => !!entry);
    signal.radix = signalDisplayRadix(signal);
  }
}

function resizeSteps(nextSteps) {
  state.project.timeSteps = Math.max(4, Math.min(4096, Number(nextSteps) || 24));
  syncSignalLengths();
}

function resizeSubSteps(nextSubSteps) {
  state.project.subSteps = Math.max(1, Math.min(32, Number(nextSubSteps) || 1));
}

function setZoom(nextZoom) {
  state.project.zoom = Math.max(0.5, Math.min(4, Number(nextZoom) || 1));
}

function fitZoom() {
  const width = Math.max(420, refs.wave.clientWidth || 1200);
  const target = (width - 240) / (state.project.timeSteps * 28);
  setZoom(Math.max(0.5, Math.min(2.6, target)));
}

function renderSignalCard(signal, selectable) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "signal-item";
  if (selectable && signal.id === state.project.selectedSignalId) node.classList.add("active");
  const meta = signal.width > 1 ? `${signal.kind}[${signal.msb ?? signal.width - 1}:${signal.lsb ?? 0}] ${signalDisplayRadix(signal)}` : signal.kind;
  node.innerHTML = `<span class="signal-name">${signal.name}</span><span class="signal-meta">${meta}</span>`;
  if (selectable) {
    node.addEventListener("click", () => {
      state.project.selectedSignalId = signal.id;
      render();
    });
  }
  return node;
}

function refreshInspector() {
  const signal = selectedSignal();
  refs.nameInput.value = state.project.name;
  if (!signal) {
    refs.signalName.value = "";
    refs.signalRole.value = "stimulus";
    refs.signalKind.value = "logic";
    refs.signalWidth.value = "1";
    refs.signalRadix.value = "hexadecimal";
    refs.sampleSpin.value = String(state.project.timeSteps);
    refs.substepSpin.value = String(state.project.subSteps);
    return;
  }
  refs.signalName.value = signal.name;
  refs.signalRole.value = signal.role;
  refs.signalKind.value = signal.kind;
  refs.signalWidth.value = String(signalDisplayWidth(signal));
  refs.signalRadix.value = signalDisplayRadix(signal);
  refs.sampleSpin.value = String(state.project.timeSteps);
  refs.substepSpin.value = String(state.project.subSteps);
}

function render() {
  state.project = normalizeProject(state.project);
  state.project.drawTool = normalizeTool(state.project.drawTool);
  state.project.paintState = BIT_STATES.includes(state.project.paintState) ? state.project.paintState : "1";
  const design = ensureDesignSynced();
  state.project.outputs = state.simulationOutputs || buildPlaceholderOutputsFromPorts(design.topModule?.ports || [], state.project.timeSteps);
  ensureActiveSourceFile();
  if (!state.project.selectedSignalId && state.project.signals[0]) state.project.selectedSignalId = state.project.signals[0].id;
  refs.portPreview.textContent = state.ports.length
    ? `${design.topName}: ${state.ports.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
    : `No ports found in ${design.topName}.`;

  refs.name.textContent = state.project.name;
  refs.logs.textContent = state.logs.join("\n\n") || "Ready.";
  updateTbViewer();
  refs.stimulusList.replaceChildren(...state.project.signals.map((signal) => renderSignalCard(signal, true)));
  refs.resultList.replaceChildren(...state.project.outputs.map((signal) => renderSignalCard(signal, false)));
  renderSourceFiles();
  refreshInspector();
  refs.toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.tool === state.project.drawTool));
  refs.stateButtons.forEach((button) => button.classList.toggle("active", button.dataset.state === state.project.paintState));
  refs.addMenu.classList.remove("open");
  renderWaveScene(state.project, refs.wave, {
    selection: normalizedSelection(),
    onCellPointerDown: handleCellPointerDown,
    onCellPointerEnter: handleCellPointerEnter,
    onCellClick: handleCellClick,
    onCellDoubleClick: handleCellDoubleClick
  });
  persist();
}

function applyPaint(signalId, cellIndex) {
  const signal = state.project.signals.find((item) => item.id === signalId);
  if (!signal) return;
  const value = activePaintValue();
  const width = signalDisplayWidth(signal);
  signal.values[cellIndex] = normalizeVectorValue(signal.width > 1 ? value.repeat(width) : value, width);
  signal.labels[cellIndex] = width > 1 ? formatVectorValue(signal.values[cellIndex], width, signalDisplayRadix(signal)) : "";
  signal.segmentStyles[cellIndex] = emptySegmentStyle();
  state.project.selectedSignalId = signal.id;
  state.project.activeCell = cellIndex;
  invalidateSimulation();
}

function finishPaint() {
  if (!state.paintSession) return;
  state.paintSession = null;
  render();
}

function handleCellPointerDown(signalId, cellIndex, event) {
  if (state.project.drawTool === "cursor") {
    state.project.selectedSignalId = signalId;
    state.project.activeCell = cellIndex;
    clearSelection();
    render();
    return;
  }
  if (state.project.drawTool === "select") {
    event.preventDefault();
    pushHistory();
    const signalIndex = selectedSignalIndexById(signalId);
    state.project.selectedSignalId = signalId;
    state.project.activeCell = cellIndex;
    setSelection(signalIndex, cellIndex);
    state.dragState = { mode: "select", signalIndex, cellIndex };
    window.addEventListener("pointerup", finishSelect, { once: true });
    render();
    return;
  }
  event.preventDefault();
  pushHistory();
  state.paintSession = { signalId };
  applyPaint(signalId, cellIndex);
  window.addEventListener("pointerup", finishPaint, { once: true });
}

function handleCellPointerEnter(signalId, cellIndex, event) {
  if (state.paintSession && state.paintSession.signalId === signalId) {
    if (event.buttons !== 1) return;
    applyPaint(signalId, cellIndex);
    return;
  }
  if (state.dragState?.mode === "select" && event.buttons === 1) {
    const signalIndex = selectedSignalIndexById(signalId);
    setSelection(state.dragState.signalIndex, state.dragState.cellIndex, signalIndex, cellIndex);
    state.project.selectedSignalId = signalId;
    state.project.activeCell = cellIndex;
    render();
  }
}

function handleCellClick(signalId) {
  void signalId;
}

function handleCellDoubleClick(signalId, cellIndex, event) {
  if (event) event.preventDefault();
  const signal = state.project.signals.find((item) => item.id === signalId);
  if (!signal || signalDisplayWidth(signal) <= 1) return;
  const width = signalDisplayWidth(signal);
  const current = signalDisplayLabel(signal, cellIndex);
  const nextValue = prompt(`Enter value for ${signal.name}[${signal.msb ?? width - 1}:${signal.lsb ?? 0}]`, current);
  if (nextValue == null) return;
  pushHistory();
  const normalized = normalizeVectorValue(nextValue, width);
  signal.values[cellIndex] = normalized;
  signal.labels[cellIndex] = formatVectorValue(normalized, width, signalDisplayRadix(signal));
  signal.segmentStyles[cellIndex] = emptySegmentStyle();
  state.project.selectedSignalId = signal.id;
  state.project.activeCell = cellIndex;
  invalidateSimulation();
  render();
}

function selectedSignalIndexById(signalId) {
  return Math.max(0, state.project.signals.findIndex((signal) => signal.id === signalId));
}

function finishSelect() {
  state.dragState = null;
  render();
}

function selectionBounds() {
  const bounds = normalizedSelection();
  if (!bounds) return null;
  return {
    ...bounds,
    width: bounds.endCell - bounds.startCell + 1,
    height: bounds.endSignalIndex - bounds.startSignalIndex + 1
  };
}

function copySelection() {
  const bounds = selectionBounds();
  if (!bounds) {
    log("No selection to copy");
    return;
  }
  state.clipboard = {
    width: bounds.width,
    height: bounds.height,
    signals: state.project.signals.slice(bounds.startSignalIndex, bounds.endSignalIndex + 1).map((signal) => ({
      name: signal.name,
      role: signal.role,
      kind: signal.kind,
      width: signal.width,
      msb: signal.msb,
      lsb: signal.lsb,
      radix: signal.radix,
      values: signal.values.slice(bounds.startCell, bounds.endCell + 1),
      labels: (signal.labels || []).slice(bounds.startCell, bounds.endCell + 1),
      segmentStyles: (signal.segmentStyles || []).slice(bounds.startCell, bounds.endCell + 1).map((style) => cloneSegmentStyle(style)),
      driveStrengths: (signal.driveStrengths || []).slice(bounds.startCell, bounds.endCell + 1),
      clockMarkers: (signal.clockMarkers || []).slice(bounds.startCell, bounds.endCell + 1)
    }))
  };
  log(`Copied ${bounds.height}x${bounds.width}`);
}

function deleteSelection() {
  const bounds = selectionBounds();
  if (!bounds) {
    log("No selection to delete");
    return;
  }
  pushHistory();
  for (let rowOffset = 0; rowOffset < bounds.height; rowOffset += 1) {
    const signal = state.project.signals[bounds.startSignalIndex + rowOffset];
    if (!signal) continue;
      const width = signalDisplayWidth(signal);
      for (let cell = bounds.startCell; cell <= bounds.endCell; cell += 1) {
        signal.values[cell] = width > 1 ? "x".repeat(width) : "x";
        signal.labels[cell] = width > 1 ? formatVectorValue(signal.values[cell], width, signalDisplayRadix(signal)) : "";
        signal.segmentStyles[cell] = emptySegmentStyle();
      }
    }
  clearSelection();
  invalidateSimulation();
  log(`Deleted ${bounds.height}x${bounds.width}`);
  render();
}

function pasteSelection() {
  if (!state.clipboard?.signals?.length) {
    log("Clipboard empty");
    return;
  }
  const startSignalIndex = clampSignalIndex(selectedSignalIndex());
  const startCell = clampCell(state.project.activeCell);
  pushHistory();
  for (let rowOffset = 0; rowOffset < state.clipboard.signals.length; rowOffset += 1) {
    const sourceSignal = state.clipboard.signals[rowOffset];
    const targetIndex = startSignalIndex + rowOffset;
    while (state.project.signals.length <= targetIndex) {
      state.project.signals.push({
        id: uid("sig"),
        name: `signal_${state.project.signals.length + 1}`,
        role: "stimulus",
        kind: "logic",
        width: 1,
        radix: "hexadecimal",
        values: Array.from({ length: state.project.timeSteps }, () => "0"),
        labels: Array.from({ length: state.project.timeSteps }, () => ""),
        segmentStyles: Array.from({ length: state.project.timeSteps }, () => emptySegmentStyle()),
        driveStrengths: Array.from({ length: state.project.timeSteps }, () => "strong"),
        clockMarkers: Array.from({ length: state.project.timeSteps }, () => false)
      });
    }
    const targetSignal = state.project.signals[targetIndex];
    targetSignal.role = sourceSignal.role || targetSignal.role;
    targetSignal.kind = sourceSignal.kind || targetSignal.kind;
    targetSignal.name = sourceSignal.name || targetSignal.name;
    targetSignal.width = Math.max(1, Number(sourceSignal.width) || targetSignal.width || 1);
    targetSignal.msb = sourceSignal.msb ?? targetSignal.msb ?? (targetSignal.width > 1 ? String(targetSignal.width - 1) : "");
    targetSignal.lsb = sourceSignal.lsb ?? targetSignal.lsb ?? (targetSignal.width > 1 ? "0" : "");
    targetSignal.radix = sourceSignal.radix || targetSignal.radix || "hexadecimal";
    targetSignal.segmentStyles = resizeMetaArray(targetSignal.segmentStyles, state.project.timeSteps, (entry) => cloneSegmentStyle(entry));
    targetSignal.driveStrengths = resizeMetaArray(targetSignal.driveStrengths, state.project.timeSteps, (entry) => entry ?? "strong");
    targetSignal.clockMarkers = resizeMetaArray(targetSignal.clockMarkers, state.project.timeSteps, (entry) => !!entry);
    for (let cellOffset = 0; cellOffset < state.clipboard.width; cellOffset += 1) {
      const targetCell = startCell + cellOffset;
      if (targetCell >= state.project.timeSteps) break;
      targetSignal.values[targetCell] = normalizeVectorValue(sourceSignal.values[cellOffset] ?? "0", targetSignal.width);
      targetSignal.labels[targetCell] = targetSignal.width > 1
        ? formatVectorValue(targetSignal.values[targetCell], targetSignal.width, signalDisplayRadix(targetSignal))
        : "";
      targetSignal.segmentStyles[targetCell] = cloneSegmentStyle(sourceSignal.segmentStyles?.[cellOffset]);
      targetSignal.driveStrengths[targetCell] = sourceSignal.driveStrengths?.[cellOffset] ?? "strong";
      targetSignal.clockMarkers[targetCell] = !!sourceSignal.clockMarkers?.[cellOffset];
    }
  }
  state.project.selectedSignalId = state.project.signals[startSignalIndex]?.id || state.project.selectedSignalId;
  state.project.activeCell = startCell;
  setSelection(startSignalIndex, startCell, Math.min(state.project.signals.length - 1, startSignalIndex + state.clipboard.height - 1), Math.min(state.project.timeSteps - 1, startCell + state.clipboard.width - 1));
  invalidateSimulation();
  log(`Pasted ${state.clipboard.height}x${state.clipboard.width}`);
  render();
}

function cutSelection() {
  if (!selectionBounds()) {
    log("No selection to cut");
    return;
  }
  copySelection();
  deleteSelection();
}

function addSignal(template) {
  const signalName = prompt("Signal name", `${template}_${state.project.signals.length + 1}`);
  if (!signalName) return;
  pushHistory();
  state.project.signals.push(buildTemplateSignal(template, signalName));
  state.project.selectedSignalId = state.project.signals.at(-1)?.id || null;
  invalidateSimulation();
  log(`Added ${signalName}`);
  render();
}

function buildTemplateSignal(template, signalName) {
  const values = {
    bit: Array.from({ length: state.project.timeSteps }, () => "0"),
    clock: Array.from({ length: state.project.timeSteps }, (_, index) => (index % 2 === 0 ? "0" : "1")),
    reset: Array.from({ length: state.project.timeSteps }, (_, index) => (index < 2 ? "1" : "0")),
    pulse: Array.from({ length: state.project.timeSteps }, (_, index) => (index >= 4 && index < 8 ? "1" : "0")),
    vector: Array.from({ length: state.project.timeSteps }, () => "0000")
  }[template] || Array.from({ length: state.project.timeSteps }, () => "0");
  const kind = template === "clock" ? "clock" : template === "vector" ? "vector" : "logic";
  const width = template === "vector" ? 4 : 1;
  return {
    id: uid("sig"),
    name: signalName,
    role: "stimulus",
    kind,
    width,
    msb: width > 1 ? String(width - 1) : "",
    lsb: width > 1 ? "0" : "",
    radix: "hexadecimal",
    values,
    labels: Array.from({ length: state.project.timeSteps }, () => ""),
    segmentStyles: Array.from({ length: state.project.timeSteps }, () => emptySegmentStyle()),
    driveStrengths: Array.from({ length: state.project.timeSteps }, () => "strong"),
    clockMarkers: Array.from({ length: state.project.timeSteps }, () => false)
  };
}

function undo() {
  if (!state.history.length) return;
  state.future.push(JSON.stringify(exportProject(state.project)));
  restoreSnapshot(state.history.pop());
  invalidateSimulation();
  log("Undo");
  render();
}

function redo() {
  if (!state.future.length) return;
  state.history.push(JSON.stringify(exportProject(state.project)));
  restoreSnapshot(state.future.pop());
  invalidateSimulation();
  log("Redo");
  render();
}

function parseVerilog() {
  syncEditorToModel();
  const design = ensureDesignSynced();
  const ports = state.ports || [];
  refs.portPreview.textContent = ports.length
    ? `${design.topName}: ${ports.map((port) => `${port.direction} ${port.name}[${port.width}]`).join(", ")}`
    : `No ports found in ${design.topName}.`;
  refs.modulePreview.textContent = [
    `modules: ${design.moduleCount}`,
    ...design.modules.map((moduleInfo) => `${moduleInfo.name}: ${moduleInfo.ports.length} ports, ${moduleInfo.instances.length} instances`)
  ].join("\n");
  log(`Parsed ${design.moduleCount} module(s)`);
  render();
}

function buildTbPreview() {
  syncEditorToModel();
  const design = ensureDesignSynced();
  const result = buildAutoTestbench(design, state.project);
  if (!result.ok) {
    refs.modulePreview.textContent = result.error;
    log(`TB build failed: ${result.error}`);
    state.simulationOutputs = null;
    state.lastTestbench = "";
    updateTbViewer();
    render();
    return;
  }
  refs.modulePreview.textContent = [
    `bindings: ${result.bindings.length}`,
    ...result.bindings.map((binding) => `${binding.port.name} -> ${binding.signal ? binding.signal.name : "<unbound>"} (${binding.strategy})`)
  ].join("\n");
  state.lastTestbench = result.source;
  state.project.lastTestbench = result.source;
  state.project.lastSimulationBindings = result.bindings;
  updateTbViewer();
  log(`Built TB for ${design.topName}`);
  render();
}

async function runSimulation() {
  syncEditorToModel();
  const design = ensureDesignSynced();
  const tbResult = buildAutoTestbench(design, state.project);
  if (!tbResult.ok) {
    refs.modulePreview.textContent = tbResult.error;
    log(`TB build failed: ${tbResult.error}`);
    state.simulationOutputs = null;
    state.lastTestbench = "";
    updateTbViewer();
    render();
    return;
  }
  state.lastTestbench = tbResult.source;
  updateTbViewer();

  const payload = buildSimulationPayload(Array.isArray(state.project.sourceFiles) ? state.project.sourceFiles : [], tbResult.source);
  refs.modulePreview.textContent = "Running real simulation...";
  log(`Running simulation for ${design.topName}`);

  try {
    const response = await fetch("/api/sim", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: payload
    });
    const text = await response.text();
    if (/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):/.test(text)) {
      const error = text.replace(/^(IVERILOG-ERROR|VVP-ERROR|SIM-ERROR):\s*/,'').trim();
      refs.modulePreview.textContent = error || "Simulation failed.";
      log(`Simulation failed: ${error}`);
      state.simulationOutputs = null;
      render();
      return;
    }
    const { parsed, outputs } = vcdToProjectOutputs(text, state.project);
    state.simulationOutputs = outputs;
    state.project.outputs = outputs;
    state.project.lastTestbench = tbResult.source;
    state.project.lastSimulationBindings = tbResult.bindings;
    const summary = summarizeSimulationOutputs(outputs);
    refs.modulePreview.textContent = [
      `Simulation done: ${outputs.length} signals, tmax ${parsed.tmax}`,
      `Final: ${summary}`
    ].join("\n");
    log(`Simulation completed: ${outputs.length} result signal(s)`);
    log(`Final outputs: ${summary}`);
    render();
    await saveSnapshotToDisk("simulation");
  } catch (error) {
    refs.modulePreview.textContent = String(error);
    log(`Simulation request failed: ${error}`);
    render();
  }
}

function addDemoSignals() {
  pushHistory();
  state.project = createSampleProject();
  clearSelection();
  state.clipboard = null;
  invalidateSimulation();
  log("Loaded demo project");
  render();
}

function addSourceFile() {
  const name = prompt("Source file name", `file_${state.project.sourceFiles.length + 1}.v`);
  if (!name) return;
  pushHistory();
  const file = { id: uid("file"), name, content: "" };
  state.project.sourceFiles.push(file);
  state.project.activeSourceFileId = file.id;
  invalidateSimulation();
  render();
}

function removeSourceFile() {
  if ((state.project.sourceFiles || []).length <= 1) return;
  const active = activeSourceFile();
  if (!active) return;
  pushHistory();
  state.project.sourceFiles = state.project.sourceFiles.filter((file) => file.id !== active.id);
  state.project.activeSourceFileId = state.project.sourceFiles[0]?.id || null;
  invalidateSimulation();
  render();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action],[data-tool],[data-state],[data-template]");
    if (!target) return;
    const action = target.dataset.action;
    const template = target.dataset.template;
    const tool = target.dataset.tool;
    const bitState = target.dataset.state;

    if (action === "save") {
      saveJsonFile(`${state.project.name}.json`, exportProject(state.project));
      saveSnapshotToDisk("manual-save");
    }
    if (action === "load-sample") addDemoSignals();
    if (action === "source-add") addSourceFile();
    if (action === "source-remove") removeSourceFile();
    if (action === "undo") undo();
    if (action === "redo") redo();
    if (action === "copy") copySelection();
    if (action === "paste") pasteSelection();
    if (action === "delete") deleteSelection();
    if (action === "zoom-out") { setZoom(state.project.zoom / 1.15); render(); }
    if (action === "zoom-in") { setZoom(state.project.zoom * 1.15); render(); }
    if (action === "zoom-fit") { fitZoom(); render(); }
    if (action === "parse-verilog") parseVerilog();
    if (action === "build-tb") buildTbPreview();
    if (action === "simulate") runSimulation();
    if (action === "tb-copy") copyTb();
    if (action === "toggle-add-menu") refs.addMenu.classList.toggle("open");
    if (tool) { state.project.drawTool = tool; log(`Tool: ${tool}`); render(); }
    if (bitState) { state.project.paintState = bitState; invalidateSimulation(); log(`Paint state: ${bitState}`); render(); }
    if (template) addSignal(template);
  });

  refs.nameInput.addEventListener("change", () => {
    pushHistory();
    state.project.name = refs.nameInput.value || state.project.name;
    render();
  });
  refs.verilogSource.addEventListener("input", () => {
    updateActiveSourceContent(refs.verilogSource.value);
  });
  refs.signalName.addEventListener("change", () => {
    const signal = selectedSignal();
    if (!signal) return;
    pushHistory();
    signal.name = refs.signalName.value || signal.name;
    invalidateSimulation();
    render();
  });
  refs.signalRole.addEventListener("change", () => {
    const signal = selectedSignal();
    if (!signal) return;
    pushHistory();
    signal.role = refs.signalRole.value || signal.role;
    invalidateSimulation();
    render();
  });
  refs.signalKind.addEventListener("change", () => {
    const signal = selectedSignal();
    if (!signal) return;
    pushHistory();
    signal.kind = refs.signalKind.value || signal.kind;
    invalidateSimulation();
    render();
  });
  refs.signalWidth.addEventListener("change", () => {
    const signal = selectedSignal();
    if (!signal) return;
    pushHistory();
    const nextWidth = Math.max(1, Math.min(1024, Number(refs.signalWidth.value) || signal.width || 1));
    const radix = signalDisplayRadix(signal);
    signal.width = nextWidth;
    signal.kind = nextWidth > 1 ? "vector" : (signal.kind === "clock" ? "clock" : "logic");
    signal.msb = nextWidth > 1 ? String(nextWidth - 1) : "";
    signal.lsb = nextWidth > 1 ? "0" : "";
    signal.values = Array.from({ length: state.project.timeSteps }, (_, index) => normalizeVectorValue(signal.values?.[index], nextWidth));
    signal.labels = Array.from({ length: state.project.timeSteps }, (_, index) => nextWidth > 1 ? formatVectorValue(signal.values[index], nextWidth, radix) : "");
    signal.segmentStyles = resizeMetaArray(signal.segmentStyles, state.project.timeSteps, (entry) => cloneSegmentStyle(entry));
    signal.driveStrengths = resizeMetaArray(signal.driveStrengths, state.project.timeSteps, (entry) => entry ?? "strong");
    signal.clockMarkers = resizeMetaArray(signal.clockMarkers, state.project.timeSteps, (entry) => !!entry);
    invalidateSimulation();
    render();
  });
  refs.signalRadix.addEventListener("change", () => {
    const signal = selectedSignal();
    if (!signal) return;
    pushHistory();
    signal.radix = refs.signalRadix.value || "hexadecimal";
    if (signalDisplayWidth(signal) > 1) {
      signal.labels = Array.from({ length: state.project.timeSteps }, (_, index) => formatVectorValue(signal.values?.[index], signalDisplayWidth(signal), signal.radix));
    }
    invalidateSimulation();
    render();
  });
  refs.sampleSpin.addEventListener("change", () => {
    pushHistory();
    resizeSteps(refs.sampleSpin.value);
    invalidateSimulation();
    log(`Steps: ${state.project.timeSteps}`);
    render();
  });
  refs.substepSpin.addEventListener("change", () => {
    pushHistory();
    resizeSubSteps(refs.substepSpin.value);
    invalidateSimulation();
    log(`Sub-steps: ${state.project.subSteps}`);
    render();
  });
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "Escape") {
      refs.addMenu.classList.remove("open");
      clearSelection();
      render();
      return;
    }
  if (event.ctrlKey && key === "c") { event.preventDefault(); copySelection(); return; }
  if (event.ctrlKey && key === "v") { event.preventDefault(); pasteSelection(); return; }
  if (event.ctrlKey && key === "x") { event.preventDefault(); cutSelection(); return; }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelection(); return; }
    if (event.ctrlKey && key === "z") { event.preventDefault(); undo(); return; }
    if (event.ctrlKey && (key === "y" || (event.shiftKey && key === "z"))) { event.preventDefault(); redo(); return; }
  });
}
