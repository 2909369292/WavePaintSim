// ============================================================================
// WavePaintSim feature-select.js —— 选择工具框选 + 批量操作
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F5）：
//   1. 选择工具（tool-select）下按住左键拖动 → 自绘虚线框选（跨多信号 × 多格子）。
//   2. 松开后弹出浮动批量工具条：设 1 / 设 0 / 设 x / 翻转 / 清除 / 复制 / 粘贴。
//   3. 单击（无拖动）时回放原版点击行为（选择信号/对象），不破坏原版交互。
//   4. 批量写入前压撤销快照，Ctrl+Z 可撤销；Escape 或点击空白取消框选。
//   说明：批量设值只作用于 Bit 类型信号（矢量信号跳过）。
// 依赖：feature-common.js、混淆核心全局 API
// 修改记录：
//   2026-08-30 初版（F5）
//   2026-08-30 P1-4 单击回放加 replaying 重入保护（BUG-001，防 dispatchEvent 递归）
//   2026-08-30 P2-1 regionFromPoints 正确处理 mapCanvasPosition 的 null 与 -1 哨兵
//   2026-08-30 P2-4 overlay 补 CSS 尺寸对齐（BUG-005，缩放/HiDPI 错位）
//   2026-08-30 P3-1 批量工具条支持全局关闭（点画布外 / Escape / 切工具）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureSelect) return;
  window.__wpfFeatureSelect = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    const canvas = wpf.canvas();

    // 清理可能由旧版 feature-select 创建的 wpf-select-overlay DOM 元素（现在框选视觉
    // 完全由混淆核心原生绘制，不再自绘 canvas overlay）。
    const oldOverlay = document.getElementById('wpf-select-overlay');
    if (oldOverlay && oldOverlay.parentElement) oldOverlay.parentElement.removeChild(oldOverlay);

    // marquee：只记录鼠标起止位置（用于换算选区），框选的视觉完全交给
    // 混淆核心自带的原生 range selection（select 工具下由核心绘制紫色对齐矩形）。
    // 本模块不再自绘任何 marquee/overlay（用户明确要求：不要自己画的，完全复用原生）。
    const marquee = {
      active: false, startX: 0, startY: 0, curX: 0, curY: 0, dragging: false,
      // 按下点的原始信息（驱动核心时要用按下点的行 y，而不是当前 y）
      startClientX: 0, startClientY: 0, startSample: -1,
      dir: null,   // 'fwd' 向左→右 / 'back' 向右→左；决定按下点是首格还是末格
      sent: false, // 是否已向核心派发过 mousedown
      hadSelection: false // 按下时是否已有选框（单击=清除 或 新框选的判定依据）
    };
    const clip = { data: null }; // 复制剪贴板 {rows: [{signalIndex, values: []}], sampleCount}
    let bar = null;
    // 整步粒度下会派发合成鼠标事件给核心（坐标已按主步对齐），这些合成事件同样
    // 会被本模块的捕获监听器收到，必须整体短路，否则无限递归。
    let replaying = false;

    function hideBar() {
      if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
      bar = null;
      // 菜单消失时选框必须同步消失（用户要求：视觉与编辑菜单同步出现同步消失）。
      // 让核心重置并清除其原生 range selection。
      clearCoreSelectionFromAnchor();
      window.__wpf.selection = null;
      window.__wpf._selAnchor = null;
    }

    // value-edit 的 Ctrl/Vector 会话标志：现在 Ctrl/Vector 完全复用框选工具条，
    // 不再需要抑制工具条，此标志仅保留兼容（恒 false）。
    function nativeRangeSessionActive() {
      const s = window.__wpf.nativeRangeSession;
      return !!(s && s.active);
    }

    // 记录选框范围 + 一个「锚点」（按下点，在信号行上），供清除选框时定位。
    function setSelection(region, ax, ay) {
      window.__wpf.selection = region || null;
      window.__wpf._selAnchor = (region && ax != null && ay != null) ? { x: ax, y: ay } : null;
    }

    // 向核心派发一个原始坐标的合成鼠标事件（不被 dispatchAt 的坐标对齐干扰）
    function dispatchRaw(type, clientX, clientY, buttons) {
      canvas.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window,
        clientX: clientX, clientY: clientY,
        button: 0, buttons: buttons, detail: 1,
        ctrlKey: false, shiftKey: false, altKey: false, metaKey: false
      }));
    }

    // 清除核心原生 range selection：在同一点派发 mousedown+mouseup。
    // 核心 mousedown（select 工具、信号行上）会重置 start=end=该格并 rangeSelecting=true，
    // mouseup 判定「无拖动」→ rangeSelActive=false 并清空 start/end → 选框消失。
    // 不能用 Esc：核心 deleteSelection 只在 rangeSelActive 时触发，子步单格残留态
    // 是 rangeSelecting=true（rangeSelActive=false），Esc 不会清除。
    function clearCoreSelection(px, py) {
      if (!canvas) return;
      const anchor = window.__wpf._selAnchor;
      const m = wpf.mapAt(px, py) || (anchor ? wpf.mapAt(anchor.x, anchor.y) : null);
      if (!m) return;
      const sample = Number(m.signalSampleIndex);
      if (!(sample >= 0)) return; // 不在有效信号格上，无法通过 mousedown 重置核心
      const y = (anchor ? anchor.y : py);
      const x = xForSample(y, sample);
      replaying = true;
      try {
        dispatchRaw('mousedown', x, y, 1);
        dispatchRaw('mouseup', x, y, 0);
      } finally {
        replaying = false;
      }
    }

    function clearCoreSelectionFromAnchor() {
      const anchor = window.__wpf._selAnchor;
      if (anchor) clearCoreSelection(anchor.x, anchor.y);
    }

    // 框选完成后弹工具条：等核心同步处理完 mouseup 再弹，并把核心可能残留的
    // #wp-modal 遮罩收起（防挡住后续点击）。
    function showBarAfter(e) {
      const region = window.__wpf.selection;
      if (!region || nativeRangeSessionActive()) return;
      setTimeout(function () {
        if (!window.__wpf.selection) return;
        // 防御：框选会话中核心可能把工具切走（如 closeModal 流程）。保持 select，
        // 避免后续框选在 paint/null 工具下失效。t===null 时不强制（尊重切换）。
        const t = wpf.currentTool();
        if (t !== 'select' && t !== null) {
          const selBtn = document.querySelector('.tool-btn[data-tool="select"]');
          if (selBtn && !selBtn.classList.contains('active')) selBtn.click();
        }
        const ov = document.getElementById('wp-modal-overlay');
        if (ov && ov.className.indexOf('hidden') < 0) ov.classList.add('hidden');
        showBar(e.clientX, e.clientY);
      }, 0);
    }

    // 计算框选区域覆盖的 {signalStart, signalEnd, sampleStart, sampleEnd}
    function regionFromPoints() {
      const x1 = Math.min(marquee.startX, marquee.curX);
      const x2 = Math.max(marquee.startX, marquee.curX);
      const y1 = Math.min(marquee.startY, marquee.curY);
      const y2 = Math.max(marquee.startY, marquee.curY);
      const midY = (y1 + y2) / 2;
      const mStart = window.mapCanvasPosition(x1, midY);
      const mEnd = window.mapCanvasPosition(x2, midY);
      const mTop = window.mapCanvasPosition(x1, y1);
      const mBottom = window.mapCanvasPosition(x1, y2);
      // mapCanvasPosition 只在 document_wave / canvas 缺失时返回 null（启动/销毁瞬间）；
      // 几何越界时返回的是 signalIndex / signalSampleIndex 全为 -1 的哨兵对象。
      if (!mStart || !mEnd || !mTop || !mBottom) return null;

      const dw = window.document_wave;
      const maxSignal = (dw && Array.isArray(dw.m_signals)) ? dw.m_signals.length - 1 : -1;
      const maxSample = (dw && Array.isArray(dw.m_signals) && dw.m_signals.length)
        ? Math.max(0, (Number(dw.m_signals[0].values && dw.m_signals[0].values.length) || 0) - 1)
        : -1;

      // -1 不能再用 Math.max(0, ...) 兜底：那会把"框在了信号行之外/波形区之外"
      // 静默放大成"从第 0 行 / 第 0 格开始"，一次误框就覆盖整片数据。
      // 正确语义：单边越界夹到边界（上→0 行、下→末行、左→0 格、右→末格）；
      // 双边都越界说明根本没框到有效区域，直接判空。
      const topHit = Number(mTop.signalIndex);
      const botHit = Number(mBottom.signalIndex);
      const leftHit = Number(mStart.signalSampleIndex);
      const rightHit = Number(mEnd.signalSampleIndex);
      if (topHit < 0 && botHit < 0) return null;
      if (leftHit < 0 && rightHit < 0) return null;

      let signalStart, signalEnd;
      if (topHit < 0) { signalStart = 0; signalEnd = botHit; }
      else if (botHit < 0) { signalStart = topHit; signalEnd = maxSignal; }
      else { signalStart = Math.min(topHit, botHit); signalEnd = Math.max(topHit, botHit); }

      let sampleStart, sampleEnd;
      if (leftHit < 0) { sampleStart = 0; sampleEnd = rightHit; }
      else if (rightHit < 0) { sampleStart = leftHit; sampleEnd = maxSample; }
      else { sampleStart = Math.min(leftHit, rightHit); sampleEnd = Math.max(leftHit, rightHit); }

      if (signalEnd < 0 || sampleEnd < 0) return null;
      if (signalEnd < signalStart || sampleEnd < sampleStart) return null;
      return { signalStart: signalStart, signalEnd: signalEnd, sampleStart: sampleStart, sampleEnd: sampleEnd };
    }

    function regionSignals(region) {
      const dw = window.document_wave;
      const out = [];
      for (let i = region.signalStart; i <= region.signalEnd && i < dw.m_signals.length; i += 1) {
        const sig = dw.m_signals[i];
        if (!sig || !window.SignalType || !Array.isArray(sig.values)) continue;
        if (sig.type === window.SignalType.Bit || sig.type === window.SignalType.Vector) {
          out.push({ index: i, sig: sig });
        }
      }
      return out;
    }

    // 总线位宽：优先用信号自带 width，否则从已有位串推断
    function vectorWidth(sig) {
      const w = Number(sig && sig.width);
      if (Number.isFinite(w) && w > 1) return Math.floor(w);
      const values = (sig && Array.isArray(sig.values)) ? sig.values : [];
      for (const v of values) {
        const text = String(v ?? '').trim();
        if (/^[01xz]+$/i.test(text) && text.length > 1) return text.length;
      }
      return 1;
    }

    // 解析总线输入：优先用 model.js 的 normalizeVectorValue（支持 10/0xA/A/0b1010/8'hA5/x/z），
    // 失败则回退到本地简化解析。返回 width 长度的位串。
    function parseBusInput(raw, width) {
      const w = Math.max(1, width || 1);
      if (window.__wpfVec && typeof window.__wpfVec.normalizeVectorValue === 'function') {
        try { return window.__wpfVec.normalizeVectorValue(raw, w); } catch (e) { /* 落到回退 */ }
      }
      const text = String(raw == null ? '' : raw).trim().toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
      if (!text) return '0'.repeat(w);
      if (/^[01xz]+$/.test(text)) {
        if (text.length === w) return text;
        if (text.length > w) return text.slice(-w);
        const fill = (text[0] === 'x' || text[0] === 'z') ? text[0] : '0';
        return text.padStart(w, fill);
      }
      const sized = /^(\d+)?'([bhdox])([0-9a-fxz]+)$/.exec(text);
      const prefixed = /^(0[bhdox])([0-9a-fxz]+)$/.exec(text);
      const base = sized ? sized[2].toLowerCase() : prefixed ? prefixed[1].slice(1).toLowerCase() : '';
      const payload = sized ? sized[3] : prefixed ? prefixed[2] : text;
      let bits = '';
      if (base === 'b') bits = payload;
      else if (base === 'h' || base === 'x') {
        for (const d of payload) bits += /^[0-9a-f]$/.test(d) ? Number.parseInt(d, 16).toString(2).padStart(4, '0') : d.repeat(4);
      } else if (base === 'o') {
        for (const d of payload) bits += /^[0-7]$/.test(d) ? Number.parseInt(d, 8).toString(2).padStart(3, '0') : d.repeat(3);
      } else {
        const num = /^[-+]?\d+$/.test(text) ? BigInt(text) : null;
        if (num !== null) bits = (num < 0n ? (num + (1n << BigInt(w))) : num).toString(2);
      }
      if (!bits) return '0'.repeat(w);
      if (bits.length >= w) return bits.slice(-w);
      const fill = (bits[0] === 'x' || bits[0] === 'z') ? bits[0] : '0';
      return bits.padStart(w, fill);
    }

    function isVector(sig) { return !!(window.SignalType && sig.type === window.SignalType.Vector); }

    // kind: 'one' | 'zero' | 'x' | 'invert'（批量按钮用）
    function nextValue(sig, current, kind) {
      if (!isVector(sig)) {
        if (kind === 'one') return 1;
        if (kind === 'zero') return 0;
        if (kind === 'x') return -1;
        return current === 1 ? 0 : current === 0 ? 1 : current; // invert
      }
      const width = vectorWidth(sig);
      const bits = String(current ?? '');
      if (kind === 'one') return '1'.repeat(width);
      if (kind === 'zero') return '0'.repeat(width);
      if (kind === 'x') return 'x'.repeat(width);
      let out = '';
      for (let k = 0; k < width; k += 1) {
        const ch = bits[k] || '0';
        out += ch === '1' ? '0' : ch === '0' ? '1' : ch; // 逐位取反，x/z 不变
      }
      return out;
    }

    function applyValues(kind) {
      const region = window.__wpf.selection;
      if (!region) return;
      const range = [];
      for (let i = region.sampleStart; i <= region.sampleEnd; i += 1) range.push(i);
      wpf.pushUndoSnapshot();
      const touched = new Set();
      for (const { sig } of regionSignals(region)) {
        if (kind === 'invert') {
          // 翻转必须逐格取反，不能走 writeValue（整步模式下它会铺满整个主步，
          // 交替时钟 1,0,1,0 翻完变 0,0,0,0 → 恒 0/1——用户实测的 bug）。
          // 整步模式下也要展开到主步所有格、每格独立取反，保持波形形状（交替仍交替）。
          const stride = wpf.stride();
          const cells = new Set();
          for (const i of range) {
            if (i >= sig.values.length) continue;
            if (wpf.editGranularity() !== 'substep') {
              const start = Math.floor(i / stride) * stride;
              const end = Math.min(start + stride, sig.values.length);
              for (let k = start; k < end; k += 1) cells.add(k);
            } else {
              cells.add(i);
            }
          }
          for (const i of cells) {
            sig.values[i] = nextValue(sig, sig.values[i], 'invert');
          }
        } else {
          // 设值（设1/设0/设x）：整步模式按主步铺满（用户预期：写整个主步）。
          const targets = wpf.indicesByGranularity(range, wpf.stride());
          for (const i of targets) {
            if (i >= sig.values.length) continue;
            wpf.writeValue(sig, i, nextValue(sig, sig.values[i], kind));
          }
        }
        touched.add(sig);
      }
      touched.forEach(function (sig) {
        if (isVector(sig) && typeof wpf.refreshBusLabels === 'function') wpf.refreshBusLabels(sig);
      });
      wpf.scheduleRedraw();
    }

    // 自定义输入：把 raw 写到选中范围内的总线（位串），位信号写 1/0/x/z
    function applyCustom(raw) {
      const region = window.__wpf.selection;
      if (!region) return;
      const text = String(raw == null ? '' : raw).trim();
      if (!text) return;
      const range = [];
      for (let i = region.sampleStart; i <= region.sampleEnd; i += 1) range.push(i);
      wpf.pushUndoSnapshot();
      const touched = new Set();
      for (const { sig } of regionSignals(region)) {
        const targets = wpf.indicesByGranularity(range, wpf.stride());
        if (isVector(sig)) {
          const bits = parseBusInput(text, vectorWidth(sig));
          for (const i of targets) {
            if (i < sig.values.length) wpf.writeValue(sig, i, bits);
          }
        } else {
          const t = text.toLowerCase();
          const v = t === '1' ? 1 : t === '0' ? 0 : t === 'x' ? -1 : t === 'z' ? 2 : null;
          if (v === null) continue;
          for (const i of targets) {
            if (i < sig.values.length) wpf.writeValue(sig, i, v);
          }
        }
        touched.add(sig);
      }
      touched.forEach(function (sig) {
        if (isVector(sig) && typeof wpf.refreshBusLabels === 'function') wpf.refreshBusLabels(sig);
      });
      wpf.scheduleRedraw();
    }

    function copyRegion() {
      const region = window.__wpf.selection;
      if (!region) return;
      clip.data = {
        sampleCount: region.sampleEnd - region.sampleStart + 1,
        rows: regionSignals(region).map(function ({ index, sig }) {
          return { name: sig.name, values: sig.values.slice(region.sampleStart, region.sampleEnd + 1) };
        })
      };
    }

    function pasteRegion() {
      const region = window.__wpf.selection;
      if (!region || !clip.data || !clip.data.rows.length) return;
      wpf.pushUndoSnapshot();
      const targets = regionSignals(region);
      clip.data.rows.forEach(function (row, r) {
        if (r >= targets.length) return;
        const sig = targets[r].sig;
        for (let i = 0; i < clip.data.sampleCount; i += 1) {
          const dst = region.sampleStart + i;
          if (dst >= sig.values.length) break;
          sig.values[dst] = row.values[i];
        }
      });
      wpf.scheduleRedraw();
    }

    function showBar(clientX, clientY) {
      hideBarKeepSelection();
      const region = window.__wpf.selection;
      if (!region) return;
      bar = document.createElement('div');
      bar.id = 'wpf-batch-bar';
      bar.style.cssText = 'position:fixed;z-index:300;display:flex;gap:4px;padding:6px 8px;align-items:center;'
        + 'background:#fff;border:1px solid #bbb;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);font-size:12px;';
      // 点工具条上的按钮（设1/设0/…）时，输入框会先失焦；此时不应误触发「失焦即提交」。
      let suppressCommit = false;
      const buttons = [
        ['设 1', function () { applyValues('one'); }],
        ['设 0', function () { applyValues('zero'); }],
        ['设 x', function () { applyValues('x'); }],
        ['翻转', function () { applyValues('invert'); }]
        // 复制/粘贴已移除：快捷键（Ctrl+C / Ctrl+V）已可用，不再占用工具条空间
      ];
      buttons.forEach(function ([label, fn]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'cursor:pointer;padding:3px 10px;';
        b.addEventListener('mousedown', function () { suppressCommit = true; });
        b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
        bar.appendChild(b);
      });
      // 值输入：弹出即自动聚焦，回车 / 点击别处直接写入；不输入点击别处 = 取消。
      // 不再需要「输入值」确认按钮与「取消」按钮。
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '输入值';
      input.title = '输入数值后回车或点击别处即写入（支持 10 / 0xA / 0b1010 / 8\'hA5 / x / z）；'
        + '不输入直接点击别处 = 取消；Esc = 取消';
      input.style.cssText = 'width:92px;font-size:12px;padding:3px 6px;border:1px solid #bbb;border-radius:6px;';
      function commitInput() {
        const text = String(input.value || '').trim();
        if (!text) { hideBar(); return; }  // 空输入 = 取消
        applyCustom(text);
        hideBar();
      }
      function cancelInput() {
        input.value = '';
        hideBar();
      }
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation(); // 不触发全局快捷键
        if (ev.key === 'Enter') { ev.preventDefault(); commitInput(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancelInput(); }
      });
      // 失焦即提交（有值）/ 取消（无值）
      input.addEventListener('blur', function () {
        if (suppressCommit) { suppressCommit = false; return; }
        const text = String(input.value || '').trim();
        if (!text) { hideBar(); return; }
        applyCustom(text);
        hideBar();
      });
      bar.appendChild(input);
      document.body.appendChild(bar);
      const bw = bar.offsetWidth, bh = bar.offsetHeight;
      bar.style.left = Math.max(8, Math.min(clientX, window.innerWidth - bw - 8)) + 'px';
      bar.style.top = Math.max(8, Math.min(clientY - bh - 12, window.innerHeight - bh - 8)) + 'px';
      // 自动聚焦：框选结束弹出后可直接键入，无需再点一次输入框
      input.focus();
      input.select();
    }

    function hideBarKeepSelection() {
      if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
      bar = null;
    }

    // ------------------------------------------------ 选框粒度（整步/子步）
    // 核心原生 range selection 的最小单位是「一格（sample）」。整步粒度下写入会
    // 铺满整个主步（stride 格），若选框仍按单格绘制，视觉范围就比实际写入范围细。
    // 处理方式：**不自己画**，而是把鼠标坐标按粒度对齐后派发合成事件给核心，
    // 核心原生 range selection 便按整步边界绘制（视觉与写入粒度完全一致）。
    function alignSample(sampleIndex, isEnd) {
      const s = Number(sampleIndex);
      if (!(s >= 0)) return s;
      if (wpf.editGranularity() === 'substep') return s; // 子步：原样
      const stride = wpf.stride();
      const step = Math.floor(s / stride);
      return isEnd ? (step * stride + stride - 1) : (step * stride); // 首格 / 末格
    }

    // 把选区范围也对齐到主步边界（保证写入范围与视觉一致）
    function alignRegion(region) {
      if (!region || wpf.editGranularity() === 'substep') return region;
      const stride = wpf.stride();
      const startStep = Math.floor(region.sampleStart / stride);
      const endStep = Math.floor(region.sampleEnd / stride);
      return {
        signalStart: region.signalStart,
        signalEnd: region.signalEnd,
        sampleStart: startStep * stride,
        sampleEnd: Math.min(endStep * stride + stride - 1, region.sampleEnd + stride - 1)
      };
    }

    // 求「使核心 mapCanvasPosition(x, y).signalSampleIndex === sample」的精确 clientX。
    // 不能用「平均格宽线性反算」：格子宽存在累积舍入，反算出的 x 常落在相邻格，
    // 核心于是拿到子步位置的 sample —— 这正是「起点落在整步后半部分时选框仍是子步」
    // 的根因。这里改用二分定位，保证核心拿到的就是目标格。
    function xForSample(clientY, sample) {
      const r = canvas.getBoundingClientRect();
      const at = function (x) {
        const m = wpf.mapAt(x, clientY);
        return m ? Number(m.signalSampleIndex) : -1;
      };
      const target = Number(sample);
      let lo = r.left;
      let hi = r.right - 1;
      if (at(lo) >= target) return lo + 1;
      if (at(hi) < target) return hi;
      // 二分：找最小的 x 使 at(x) >= target
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        if (at(mid) >= target) hi = mid; else lo = mid;
      }
      return hi + 0.5; // 落进该格内部，避免正好压在边界上
    }

    // 派发「按粒度对齐坐标」的合成鼠标事件给核心（核心原生绘制选框）
    // ⚠ 合成事件必须去掉 ctrlKey/metaKey：否则核心会误判为 Ctrl+框选（走缩放/其它
    //   特殊分支），导致框选行为异常、状态错乱（用户实测 Ctrl 框选后一切点选失效）。
    function dispatchAt(type, e, sampleIndex, clientY) {
      const y = (clientY === undefined || clientY === null) ? e.clientY : clientY;
      const x = xForSample(y, sampleIndex);
      replaying = true; // 合成事件同样会被本模块的捕获监听收到，需短路防递归
      try {
        canvas.dispatchEvent(new MouseEvent(type, {
          bubbles: true, cancelable: true, view: window,
          clientX: x, clientY: y,
          button: e.button, buttons: e.buttons, detail: e.detail,
          ctrlKey: false, shiftKey: false, altKey: false, metaKey: false
        }));
      } finally {
        replaying = false;
      }
    }

    // 单击框选：只框「一个粒度单位」，行固定为按下时那一行
    function regionFromSamples(lo, hi) {
      const m = wpf.mapAt(marquee.startClientX, marquee.startClientY);
      const si = m ? Number(m.signalIndex) : -1;
      if (si < 0) return null;
      return {
        signalStart: si, signalEnd: si,
        sampleStart: Math.min(lo, hi), sampleEnd: Math.max(lo, hi)
      };
    }

    function onMouseDown(e) {
      if (replaying) return;
      if (e.button !== 0) return;
      if (e.target !== canvas) return;
      if (wpf.currentTool() !== 'select') return;
      marquee.hadSelection = !!window.__wpf.selection;
      // 只隐藏菜单，选框的清除/替换由本次交互（mouseup）统一决定：
      //   单击已有选框 → 清除；拖动 → 新框选覆盖；单击无选框 → 框选一个单位。
      if (bar) hideBarKeepSelection();
      const r = canvas.getBoundingClientRect();
      const m = wpf.mapAt(e.clientX, e.clientY);
      marquee.active = true;
      marquee.dragging = false;
      marquee.startX = marquee.curX = e.clientX - r.left;
      marquee.startY = marquee.curY = e.clientY - r.top;
      marquee.startClientX = e.clientX;
      marquee.startClientY = e.clientY;
      marquee.startSample = m ? Number(m.signalSampleIndex) : -1;
      marquee.dir = null;
      marquee.sent = false;
      // 拦截：框选完全由本模块按粒度驱动核心原生 range selection 绘制。
      // mousedown 暂不派发——要等拖动方向确定后才知道按下点该对齐成首格还是末格。
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (replaying) return;
      if (!marquee.active) return;
      const r = canvas.getBoundingClientRect();
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      if (!marquee.dragging && (Math.abs(nx - marquee.startX) > 5 || Math.abs(ny - marquee.startY) > 5)) {
        marquee.dragging = true;
      }
      marquee.curX = nx;
      marquee.curY = ny;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (!marquee.dragging) return;

      const m = wpf.mapAt(e.clientX, e.clientY);
      const curSample = m ? Number(m.signalSampleIndex) : -1;
      // 方向决定「按下点」是范围的左端还是右端：
      //   向右拖 → 按下点是左端（对齐首格），当前点是右端（对齐末格）
      //   向左拖 → 按下点是右端（对齐末格），当前点是左端（对齐首格）
      // 方向一变就必须用新规则重设核心的起点，否则整步边界会偏半步。
      const dir = (e.clientX >= marquee.startClientX) ? 'fwd' : 'back';
      const dirChanged = (dir !== marquee.dir);
      marquee.dir = dir;
      if (dirChanged || !marquee.sent) {
        const startSample = alignSample(marquee.startSample, dir === 'back');
        dispatchAt('mousedown', e, startSample, marquee.startClientY);
        marquee.sent = true;
      }
      dispatchAt('mousemove', e, alignSample(curSample, dir === 'fwd'), e.clientY);
    }

    // 该位置命中的信号是否为 Vector（总线）。核心对 Vector 的 mouseup 会弹它自带的
    // 「Vector Value」弹窗并把工具切回画笔（用户实测：框选 Vector 后工具变 paint，
    // 后续 Bit 框选粒度错乱）。为此对 Vector 信号不派发合成 mouseup 给核心——
    // 核心停在 rangeSelecting 态继续绘制选框（视觉保留），但不进入弹窗/切工具流程。
    function isVectorSignal(clientX, clientY) {
      const m = wpf.mapAt(clientX, clientY);
      if (!m) return false;
      const dw = window.document_wave;
      const sig = dw && dw.m_signals ? dw.m_signals[m.signalIndex] : null;
      return !!(sig && window.SignalType && sig.type === window.SignalType.Vector);
    }

    function onMouseUp(e) {
      if (replaying) return;
      if (!marquee.active) return;
      marquee.active = false;
      e.stopImmediatePropagation();
      e.preventDefault();

      if (!marquee.dragging) {
        // ---------------- 单击 ----------------
        if (marquee.hadSelection) {
          // 已有选框：点击别处 = 清除选框（不框新格、不弹菜单）。
          // 让核心 mousedown+mouseup 同点走「无拖动」分支清掉高亮。
          clearCoreSelection(marquee.startClientX, marquee.startClientY);
          window.__wpf.selection = null;
          window.__wpf._selAnchor = null;
          return;
        }
        // 无选框：单击 = 一次框选，只框「一个粒度单位」
        //（整步 = 一个主步，子步 = 一格），交核心原生绘制。
        if (marquee.startSample >= 0) {
          const lo = alignSample(marquee.startSample, false);
          const hi = alignSample(marquee.startSample, true);
          const y = marquee.startClientY;
          const xLo = xForSample(y, lo);
          const xHi = xForSample(y, hi);
          const isVec = isVectorSignal(marquee.startClientX, marquee.startClientY);
          replaying = true;
          try {
            dispatchRaw('mousedown', xLo, y, 1);
            dispatchRaw('mousemove', xHi, y, 1);
            // 核心判定「拖动」的条件是 rangeSelEnd > rangeSelStart（跨格）。整步单格
            //（lo 首格 < hi 末格）满足 → mouseup 后保留选框（rangeSelActive=true）。
            // 子步单格（lo==hi）不满足 → mouseup 会清掉选框（视觉闪一下）。所以
            // 子步单格不派发 mouseup：核心停在 rangeSelecting 态持续绘制选框，
            // 视觉保留；清除时机由 clearCoreSelection（下次交互）负责。
            // Vector：同样不派发 mouseup（核心会弹自带弹窗 + 切走工具）。
            if (lo < hi && !isVec) dispatchRaw('mouseup', xHi, y, 0);
          } finally {
            replaying = false;
          }
          setSelection(regionFromSamples(lo, hi), marquee.startClientX, marquee.startClientY);
          showBarAfter(e);
        }
        return;
      }

      // ---------------- 拖动框选 ----------------
      const m = wpf.mapAt(e.clientX, e.clientY);
      const curSample = m ? Number(m.signalSampleIndex) : marquee.startSample;
      if (!marquee.sent) {
        dispatchAt('mousedown', e, alignSample(marquee.startSample, false), marquee.startClientY);
        marquee.sent = true;
      }
      if (!isVectorSignal(marquee.startClientX, marquee.startClientY)) {
        dispatchAt('mouseup', e, alignSample(curSample, marquee.dir !== 'back'), e.clientY);
      }
      const region = alignRegion(regionFromPoints());
      setSelection(region, marquee.startClientX, marquee.startClientY);
      if (region) showBarAfter(e);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', function () { marquee.active = false; });

    // ---------------------------------------------------------- 工具条全局关闭
    // P3-1：原实现只有「选择工具下按在画布上」才会 hideBar，于是在菜单、侧栏、
    // 输入框里点一下，浮动工具条和虚线选区会一直挂在屏幕上。
    function dismissBar() {
      if (!bar) return false;
      hideBar();
      return true;
    }
    function insideBar(node) {
      return !!(node && bar && (node === bar || (bar.contains && bar.contains(node))));
    }

    document.addEventListener('mousedown', function (e) {
      if (!bar) return;
      if (insideBar(e.target)) return;   // 工具条自身的按钮：留给它的 click 处理
      if (e.target === canvas) return;   // 画布上的按下由 onMouseDown 自己决定
      dismissBar();
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        // 有框选工具条时：自己关菜单 + 清选框。stopImmediatePropagation 阻止核心
        // 的 Esc 处理（cancelCurrentTool 会把工具切走、或对 rangeSelActive 调 deleteSelection），
        // 避免工具意外切换。无工具条时放行核心（取消其它操作）。
        if (bar) {
          e.stopImmediatePropagation();
          e.preventDefault();
          dismissBar();
        }
      }
    }, true);

    // 切到别的工具后，遗留的框选工具条也应消失
    window.addEventListener('resize', function () {
      if (bar && wpf.currentTool() !== 'select') dismissBar();
      syncOverlaySize();
    });
  }, 'feature-select');
})();
