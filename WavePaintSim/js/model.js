import { uid, deepClone } from "./utils.js";

function defaultSourceText() {
  return `module counter(
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
}

function createDefaultSourceFiles() {
  return [
    {
      id: uid("file"),
      name: "counter.sv",
      content: defaultSourceText()
    }
  ];
}

function inferSignalWidth(signal) {
  const explicitWidth = Number(signal?.width);
  if (Number.isFinite(explicitWidth) && explicitWidth > 1) return Math.floor(explicitWidth);
  const values = Array.isArray(signal?.values) ? signal.values : [];
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    if (/^[01xz]+$/i.test(text) && text.length > 1) return text.length;
  }
  return 1;
}

function padVectorBits(bits, width) {
  const normalized = String(bits || "0").toLowerCase();
  if (normalized.length === width) return normalized;
  if (normalized.length > width) return normalized.slice(-width);
  const fill = normalized[0] === "x" || normalized[0] === "z" ? normalized[0] : "0";
  return normalized.padStart(width, fill);
}

function numericToBits(value, width) {
  try {
    const mask = (1n << BigInt(width)) - 1n;
    let number = BigInt(value);
    if (number < 0) number = (number + (1n << BigInt(width))) & mask;
    return padVectorBits((number & mask).toString(2), width);
  } catch {
    return "0".repeat(width);
  }
}

export function normalizeVectorValue(value, width) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const text = String(value ?? "").trim().replace(/\s+/g, "").replace(/_/g, "").toLowerCase();
  if (safeWidth <= 1) return /^[01xz]$/.test(text) ? text : "0";
  if (!text) return "0".repeat(safeWidth);
  if (/^[01xz]+$/.test(text)) return padVectorBits(text, safeWidth);

  const sized = /^(\d+)?'([bhdox])([0-9a-fxz]+)$/i.exec(text);
  const prefixed = /^(0[bhdox])([0-9a-fxz]+)$/i.exec(text);
  const baseToken = sized ? sized[2].toLowerCase() : prefixed ? prefixed[1].slice(1).toLowerCase() : "";
  const payload = sized ? sized[3] : prefixed ? prefixed[2] : text;

  if (baseToken === "b") return padVectorBits(payload, safeWidth);
  if (baseToken === "h" || baseToken === "x") {
    let bits = "";
    for (const digit of payload) {
      if (digit === "x" || digit === "z") bits += digit.repeat(4);
      else if (/^[0-9a-f]$/.test(digit)) bits += Number.parseInt(digit, 16).toString(2).padStart(4, "0");
      else return "0".repeat(safeWidth);
    }
    return padVectorBits(bits, safeWidth);
  }
  if (baseToken === "o") {
    let bits = "";
    for (const digit of payload) {
      if (digit === "x" || digit === "z") bits += digit.repeat(3);
      else if (/^[0-7]$/.test(digit)) bits += Number.parseInt(digit, 8).toString(2).padStart(3, "0");
      else return "0".repeat(safeWidth);
    }
    return padVectorBits(bits, safeWidth);
  }
  if (baseToken === "d") return /[xz]/.test(payload) ? "x".repeat(safeWidth) : numericToBits(payload, safeWidth);
  if (/^[+-]?\d+$/.test(text)) return numericToBits(text, safeWidth);
  if (/^[0-9a-f]+$/i.test(text)) return numericToBits(`0x${text}`, safeWidth);
  return "0".repeat(safeWidth);
}

export function formatVectorValue(value, width, radix = "hexadecimal") {
  const safeWidth = Math.max(1, Number(width) || 1);
  const bits = normalizeVectorValue(value, safeWidth);
  if (safeWidth <= 1) return bits;
  if (/[xz]/.test(bits)) return bits.includes("z") && !bits.includes("x") ? "Z" : "X";
  if (radix === "binary") return bits;
  try {
    const number = BigInt(`0b${bits}`);
    if (radix === "decimal") return number.toString(10);
    const digits = Math.ceil(safeWidth / 4);
    return `0x${number.toString(16).toUpperCase().padStart(digits, "0")}`;
  } catch {
    return bits;
  }
}

function normalizeSignalValue(value, width) {
  return normalizeVectorValue(value, width);
}

function normalizeSegmentStyle(style) {
  if (!style || typeof style !== "object") return { color: null, hatched: false, fill: null };
  return {
    color: style.color ?? null,
    hatched: !!style.hatched,
    fill: style.fill ?? null
  };
}

function normalizeSignalMetaArray(source, timeSteps, factory) {
  return Array.from({ length: timeSteps }, (_, index) => factory(source?.[index], index));
}

export function createSampleProject() {
  return {
    version: 2,
    name: "WaveWorkbench Demo",
    timeSteps: 24,
    subSteps: 1,
    zoom: 1,
    drawTool: "paint",
    paintState: "1",
    selectedSignalId: null,
    activeCell: 0,
    sourceFiles: createDefaultSourceFiles(),
    activeSourceFileId: null,
    signals: [
      { id: uid("sig"), name: "clk", role: "stimulus", kind: "clock", width: 1, values: "010101010101010101010101".split("") },
      { id: uid("sig"), name: "rst_n", role: "stimulus", kind: "logic", width: 1, values: "001111111111111111111111".split("") },
      { id: uid("sig"), name: "en", role: "stimulus", kind: "logic", width: 1, values: "0010101010xxxxxxxxxxxxxx".split("") }
    ],
    outputs: []
  };
}

export function normalizeProject(project) {
  const base = project && typeof project === "object" ? project : createSampleProject();
  const copy = deepClone(base);
  copy.version = 2;
  copy.name ||= "Untitled";
  copy.timeSteps = Math.max(4, Number(copy.timeSteps) || 24);
  copy.subSteps = Math.max(1, Number(copy.subSteps) || 1);
  copy.zoom = Math.max(0.5, Math.min(4, Number(copy.zoom) || 1));
  copy.drawTool = copy.drawTool || copy.selectedTool || "paint";
  copy.paintState = ["0", "1", "x", "z"].includes(copy.paintState) ? copy.paintState : (["0", "1", "x", "z"].includes(copy.selectedState) ? copy.selectedState : "1");
  copy.signals = Array.isArray(copy.signals) ? copy.signals : [];
  copy.outputs = Array.isArray(copy.outputs) ? copy.outputs : [];
  copy.sourceFiles = Array.isArray(copy.sourceFiles) && copy.sourceFiles.length ? copy.sourceFiles : createDefaultSourceFiles();
  copy.selectedSignalId = copy.selectedSignalId || copy.signals[0]?.id || null;
  for (const file of copy.sourceFiles) {
    file.id ||= uid("file");
    file.name ||= "dut.v";
    file.content = String(file.content || "");
  }
  copy.activeSourceFileId = copy.activeSourceFileId || copy.sourceFiles[0]?.id || null;
  for (const signal of [...copy.signals, ...copy.outputs]) {
    signal.id ||= uid("sig");
    signal.name ||= "signal";
    signal.role ||= "stimulus";
    signal.width = Math.max(1, Number(signal.width) || inferSignalWidth(signal));
    if (signal.width > 1) signal.kind = "vector";
    else if (signal.kind !== "clock") signal.kind = "logic";
    signal.kind ||= "logic";
    signal.msb = signal.width > 1 ? String(signal.msb ?? signal.width - 1) : "";
    signal.lsb = signal.width > 1 ? String(signal.lsb ?? 0) : "";
    signal.radix = ["hexadecimal", "decimal", "binary"].includes(signal.radix) ? signal.radix : "hexadecimal";
    signal.values = Array.from({ length: copy.timeSteps }, (_, index) => normalizeSignalValue(signal.values?.[index], signal.width));
    signal.labels = Array.from({ length: copy.timeSteps }, (_, index) => String(signal.labels?.[index] || ""));
    signal.segmentStyles = normalizeSignalMetaArray(signal.segmentStyles, copy.timeSteps, (entry) => normalizeSegmentStyle(entry));
    signal.driveStrengths = normalizeSignalMetaArray(signal.driveStrengths, copy.timeSteps, (entry) => entry ?? "strong");
    signal.clockMarkers = normalizeSignalMetaArray(signal.clockMarkers, copy.timeSteps, (entry) => !!entry);
    signal.showClockMarkers = signal.showClockMarkers ?? false;
  }
  if (!copy.selectedSignalId && copy.signals.length) copy.selectedSignalId = copy.signals[0].id;
  return copy;
}

export function exportProject(project) {
  return deepClone(project);
}

export function importProject(json) {
  const parsed = typeof json === "string" ? JSON.parse(json) : json;
  return normalizeProject(parsed);
}
