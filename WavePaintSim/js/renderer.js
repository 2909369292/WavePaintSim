import { formatVectorValue, normalizeVectorValue } from "./model.js";

function valueToLevel(value) {
  if (value === "1") return 0.24;
  if (value === "x") return 0.50;
  if (value === "z") return 0.64;
  return 0.78;
}

function formatLaneTitle(signal) {
  const suffix = signal.width > 1
    ? ` [${signal.msb ?? signal.width - 1}:${signal.lsb ?? 0}]`
    : "";
  return signal.kind === "clock" ? `${signal.name} ⟳${suffix}` : `${signal.name}${suffix}`;
}

function isVectorSignal(signal) {
  return signal.kind === "vector" || Number(signal.width) > 1 || (Array.isArray(signal.values) && signal.values.some((value) => String(value || "").length > 1));
}

function segmentStyleFor(signal, cellIndex) {
  const style = signal?.segmentStyles?.[cellIndex];
  if (!style || typeof style !== "object") return null;
  if (!style.color && !style.fill && !style.hatched) return null;
  return style;
}

function defaultVectorStyle(signal) {
  return signal.role === "result"
    ? { color: "#0f766e", fill: "rgba(15,118,110,0.08)", hatched: true }
    : { color: "#4caf50", fill: "rgba(76,175,80,0.08)", hatched: true };
}

function drawVectorSignal(ctx, signal, laneIndex, project, metrics) {
  const { labelWidth, laneHeight, timelineHeight, cellWidth } = metrics;
  const top = timelineHeight + laneIndex * laneHeight;
  const values = signal.values || [];
  const labels = signal.labels || [];
  const isResult = signal.role === "result";
  const bandTop = top + laneHeight * 0.18;
  const bandBottom = top + laneHeight * 0.82;
  const bandHeight = bandBottom - bandTop;
  const diagonal = Math.min(10, Math.max(4, cellWidth * 0.24));

  function segmentText(start, end) {
    const value = normalizeVectorValue(values[start] || "0", signal.width);
    const label = String(labels[start] || "").trim();
    return label || formatVectorValue(value, signal.width, signal.radix);
  }

  ctx.save();
  ctx.font = "12px Segoe UI, Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1.2;

  let start = 0;
  while (start < project.timeSteps) {
    const startValue = normalizeVectorValue(values[start] || "0", signal.width);
    const startLabel = String(labels[start] || "");
    const startStyle = segmentStyleFor(signal, start);
    let end = start;
    while (end + 1 < project.timeSteps
      && normalizeVectorValue(values[end + 1] || "0", signal.width) === startValue
      && String(labels[end + 1] || "") === startLabel) {
      end += 1;
    }

    const x0 = labelWidth + start * cellWidth;
    const x1 = labelWidth + (end + 1) * cellWidth;
    const leftDiagonal = start > 0 ? diagonal : 0;
    const rightDiagonal = end < project.timeSteps - 1 ? diagonal : 0;
    const textWidth = x1 - x0 - leftDiagonal - rightDiagonal - 8;
    const vectorStyle = startStyle || defaultVectorStyle(signal);
    const fill = vectorStyle.fill;
    const stroke = vectorStyle.color;

    ctx.beginPath();
    ctx.moveTo(x0 + leftDiagonal, bandTop);
    ctx.lineTo(x1 - rightDiagonal, bandTop);
    if (rightDiagonal) ctx.lineTo(x1, bandTop + diagonal);
    ctx.lineTo(x1, bandBottom - (rightDiagonal ? diagonal : 0));
    if (rightDiagonal) ctx.lineTo(x1 - rightDiagonal, bandBottom);
    ctx.lineTo(x0 + leftDiagonal, bandBottom);
    if (leftDiagonal) ctx.lineTo(x0, bandBottom - diagonal);
    ctx.lineTo(x0, bandTop + (leftDiagonal ? diagonal : 0));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
    if (vectorStyle.hatched) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, bandTop, x1 - x0, bandHeight);
      ctx.clip();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = stroke;
      for (let x = x0 - bandHeight; x < x1 + bandHeight; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, bandBottom);
        ctx.lineTo(x + bandHeight, bandTop);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (textWidth >= 22) {
      const text = segmentText(start, end);
      ctx.fillStyle = /[xz]/i.test(startValue) ? "#b42318" : "#1d2939";
      ctx.fillText(text.length > 18 ? `${text.slice(0, 18)}…` : text, (x0 + x1) / 2, bandTop + bandHeight / 2);
    }

    start = end + 1;
  }

  ctx.restore();
}

function createHitLayer(project, metrics, hooks) {
  const layer = document.createElement("div");
  layer.className = "wave-hit-layer";
  project.signals.forEach((signal, laneIndex) => {
    for (let cell = 0; cell < project.timeSteps; cell += 1) {
      const hit = document.createElement("button");
      hit.type = "button";
      hit.className = "wave-hit-cell";
      hit.style.left = `${metrics.labelWidth + cell * metrics.cellWidth}px`;
      hit.style.top = `${metrics.timelineHeight + laneIndex * metrics.laneHeight}px`;
      hit.style.width = `${metrics.cellWidth}px`;
      hit.style.height = `${metrics.laneHeight}px`;
      hit.dataset.signalId = signal.id;
      hit.dataset.cell = String(cell);
      hit.setAttribute("aria-label", `${signal.name} sample ${cell + 1}${signal.width > 1 ? `, width ${signal.width}` : ""}`);
      hit.addEventListener("pointerdown", (event) => hooks.onCellPointerDown?.(signal.id, cell, event));
      hit.addEventListener("pointerenter", (event) => hooks.onCellPointerEnter?.(signal.id, cell, event));
      hit.addEventListener("click", (event) => hooks.onCellClick?.(signal.id, cell, event));
      hit.addEventListener("dblclick", (event) => hooks.onCellDoubleClick?.(signal.id, cell, event));
      layer.appendChild(hit);
    }
  });
  return layer;
}

function drawSignal(ctx, signal, laneIndex, project, metrics) {
  if (isVectorSignal(signal)) {
    drawVectorSignal(ctx, signal, laneIndex, project, metrics);
    return;
  }
  const { labelWidth, laneHeight, timelineHeight, cellWidth } = metrics;
  const top = timelineHeight + laneIndex * laneHeight;
  const values = signal.values || [];
  const isResult = signal.role === "result";

  ctx.save();
  ctx.strokeStyle = isResult ? "#0f766e" : "#2563eb";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  let lastY = top + laneHeight * valueToLevel(values[0] || "0");
  ctx.moveTo(labelWidth + 2, lastY);
  for (let step = 0; step < project.timeSteps; step += 1) {
    const value = values[step] || "0";
    const nextValue = values[step + 1] ?? value;
    const x0 = labelWidth + step * cellWidth;
    const x1 = x0 + cellWidth;
    const currentY = top + laneHeight * valueToLevel(value);
    const nextY = top + laneHeight * valueToLevel(nextValue);
    ctx.lineTo(x0, currentY);
    ctx.lineTo(x1, currentY);
    if (nextY !== currentY) ctx.lineTo(x1, nextY);
    lastY = nextY;
  }
  ctx.stroke();
  ctx.restore();
}

function drawSelection(ctx, selection, metrics) {
  if (!selection) return;
  const { labelWidth, laneHeight, timelineHeight, cellWidth } = metrics;
  const x = labelWidth + selection.startCell * cellWidth;
  const y = timelineHeight + selection.startSignalIndex * laneHeight;
  const width = (selection.endCell - selection.startCell + 1) * cellWidth;
  const height = (selection.endSignalIndex - selection.startSignalIndex + 1) * laneHeight;

  ctx.save();
  ctx.fillStyle = "rgba(76,175,80,0.14)";
  ctx.strokeStyle = "rgba(76,175,80,0.65)";
  ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  ctx.restore();
}

export function renderWaveScene(project, container, hooks = {}) {
  const laneHeight = 68;
  const labelWidth = 180;
  const timelineHeight = 28;
  const cellWidth = 28 * project.zoom;
  const totalWidth = labelWidth + project.timeSteps * cellWidth + 24;
  const totalHeight = timelineHeight + (project.signals.length + project.outputs.length) * laneHeight + 18;
  const width = Math.max(container.clientWidth || 1200, totalWidth);

  const wrapper = document.createElement("div");
  wrapper.className = "wave-stage";
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${totalHeight}px`;

  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.className = "wave-canvas";
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(totalHeight * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${totalHeight}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#fbfcfe";
  ctx.fillRect(0, 0, width, totalHeight);

  ctx.font = "11px Segoe UI, Microsoft YaHei UI, sans-serif";
  ctx.fillStyle = "#667085";
  ctx.strokeStyle = "rgba(30,41,59,0.10)";
  for (let step = 0; step <= project.timeSteps; step += 1) {
    const x = labelWidth + step * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, timelineHeight - 2);
    ctx.lineTo(x, totalHeight - 10);
    ctx.stroke();
    if (step % 4 === 0) ctx.fillText(String(step), x + 2, 18);
  }

  const lanes = [
    ...project.signals.map((signal) => ({ ...signal, laneType: "stimulus" })),
    ...project.outputs.map((signal) => ({ ...signal, laneType: "result" }))
  ];

  lanes.forEach((signal, index) => {
    const top = timelineHeight + index * laneHeight;
    const selected = signal.id === project.selectedSignalId;

    ctx.fillStyle = selected ? "rgba(76,175,80,0.09)" : (index % 2 === 0 ? "rgba(15,23,42,0.02)" : "rgba(37,99,235,0.03)");
    ctx.fillRect(0, top, width, laneHeight);
    ctx.strokeStyle = selected ? "rgba(76,175,80,0.30)" : "rgba(15,23,42,0.12)";
    ctx.beginPath();
    ctx.moveTo(labelWidth, top + laneHeight * 0.5);
    ctx.lineTo(width - 12, top + laneHeight * 0.5);
    ctx.stroke();

    ctx.fillStyle = "#101828";
    ctx.font = "13px Segoe UI, Microsoft YaHei UI, sans-serif";
    ctx.fillText(formatLaneTitle(signal), 16, top + 24);
    ctx.fillStyle = "#667085";
    ctx.font = "11px Segoe UI, Microsoft YaHei UI, sans-serif";
    ctx.fillText(signal.laneType === "stimulus" ? "Stimulus" : "Result", 16, top + 42);

    drawSignal(ctx, signal, index, project, { labelWidth, laneHeight, timelineHeight, cellWidth });
  });

  drawSelection(ctx, hooks.selection, { labelWidth, laneHeight, timelineHeight, cellWidth });

  const overlay = createHitLayer(project, { labelWidth, laneHeight, timelineHeight, cellWidth }, hooks);
  wrapper.appendChild(canvas);
  wrapper.appendChild(overlay);
  container.replaceChildren(wrapper);
  return { cellWidth, laneHeight, labelWidth, totalHeight, timelineHeight };
}
