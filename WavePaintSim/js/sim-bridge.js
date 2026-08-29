import { renderWaveScene } from "./renderer.js";
import { buildAutoTestbench, buildPlaceholderOutputsFromPorts, buildSimulationPayload, parseVerilogDesign, vcdToProjectOutputs } from "./sim.js";
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
  resultView: "placeholder",
  lastTestbench: "",
  lastBindings: []
};

const refs = {};

function el(id) {
  return document.getElementById(id);
}

function initRefs() {
  refs.panel = el("sim-panel");
  refs.toggleBtn = el("sim-toggle-btn");
  refs.header = el("sim-panel-header");
  refs.sourceFiles = el("source-files");
  refs.sourceEditor = el("verilog-source");
  refs.portPreview = el("port-preview");
  refs.modulePreview = el("module-preview");
  refs.status = el("sim-status");
  refs.resultPanel = el("sim-result-panel");
  refs.resultMeta = el("sim-result-meta");
  refs.resultWave = el("sim-result-wave");
  refs.addFile = el("sim-addfile");
  refs.removeFile = el("sim-removefile");
  refs.parseBtn = el("sim-parse");
  refs.tbBtn = el("sim-tb");
  refs.runBtn = el("sim-run");
  refs.collapseBtn = el("sim-collapse");
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
  state.resultView = "empty";
}

function readWaveDocument() {
  const dw = window.document_wave;
  const signals = Array.isArray(dw?.m_signals) ? dw.m_signals : [];
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
      const values = Array.from({ length: timeSteps }, (_, cell) => normalizeVectorValue(rawValues[cell], width));
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
  syncEditor();
  const design = parseVerilogDesign(sourceText());
  state.design = design;
  state.resultView = "placeholder";
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
  syncEditor();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  state.resultView = "placeholder";
  const project = readWaveDocument();
  const result = buildAutoTestbench(design, project);
  if (!result.ok) {
    refs.modulePreview.textContent = result.error;
    setStatus(result.error);
    return;
  }
  state.lastTestbench = result.source;
  state.lastBindings = result.bindings;
  refs.modulePreview.textContent = [
    `bindings: ${result.bindings.length}`,
    ...result.bindings.map((binding) => `${binding.port.name} -> ${binding.signal ? binding.signal.name : "<unbound>"} (${binding.strategy})`)
  ].join("\n");
  setStatus(`Built TB for ${design.topName}.`);
  render();
}

async function runSimulation() {
  syncEditor();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  const project = readWaveDocument();
  const tbResult = buildAutoTestbench(design, project);
  if (!tbResult.ok) {
    refs.modulePreview.textContent = tbResult.error;
    setStatus(tbResult.error);
    return;
  }

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
      state.resultView = "empty";
      render();
      setStatus(error || "Simulation failed.");
      return;
    }

    const { parsed, outputs } = vcdToProjectOutputs(text, project);
    state.outputs = outputs;
    state.resultView = "simulation";
    state.lastTestbench = tbResult.source;
    state.lastBindings = tbResult.bindings;
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

function renderResultWave(design, project) {
  if (!refs.resultPanel || !refs.resultWave) return;
  const outputs = state.resultView === "simulation" && state.outputs && state.outputs.length
    ? state.outputs
    : state.resultView === "placeholder"
      ? buildPlaceholderOutputsFromPorts(design.topModule?.ports || [], project.timeSteps)
      : [];
  const hasWave = Array.isArray(outputs) && outputs.length > 0;
  refs.resultPanel.classList.toggle("hidden", !hasWave);
  if (refs.resultMeta) {
    refs.resultMeta.textContent = hasWave ? `${outputs.length} result signal(s)` : "waiting for simulation";
  }
  if (!hasWave) {
    refs.resultWave.replaceChildren();
    return;
  }
  renderWaveScene({
    ...project,
    signals: [],
    outputs,
    selectedSignalId: project.selectedSignalId || outputs[0]?.id || null
  }, refs.resultWave);
}

function render() {
  const project = readWaveDocument();
  const design = state.design || parseVerilogDesign(sourceText());
  state.design = design;
  renderResultWave(design, project);
  const outputCount = state.resultView === "simulation" && state.outputs && state.outputs.length
    ? state.outputs.length
    : state.resultView === "placeholder"
      ? (design.topModule?.ports || []).filter((port) => port.direction === "output" || port.direction === "inout").length
      : 0;
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
  refs.tbBtn?.addEventListener("click", buildTbPreview);
  refs.runBtn?.addEventListener("click", runSimulation);
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
  render();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
