// ============================================================================
// WavePaintClean js/editor/selection.js —— 选择工具：框选 + 批量操作
// ----------------------------------------------------------------------------
// 职责（select 工具，tool-select）：
//   1. 左键拖动 → 原生 range selection 框选（视觉由核心 drawRangeSelection 绘制，
//      我们直接驱动其状态 rangeSel*，见 __core.selection）。
//   2. 松开 → 浮动批量工具条：设 1 / 设 0 / 设 x / 翻转 / 输入值。
//   3. 单击（无拖动）= 框选一个「粒度单位」（整步 = 一个主步，子步 = 一格）；
//      若已有选框，点击别处 = 清除选框与菜单（同步消失）。
//   4. 粒度（整步/子步）控制框选视觉与写入范围一致：选区的 sample 两端对齐主步。
//   5. 写入前压撤销快照；Esc / 点击画布外关闭工具条。
//
// 重构说明（2026-09-02）：历史实现为驱动核心原生框选而**伪造鼠标事件**
//（dispatchAt/dispatchRaw/xForSample/replaying/方向感知等 ~200 行，曾引发多轮
// 时序 bug）。解混淆核心的状态（rangeSelActive/rangeSel*Signal|Sample）已在全局
// 作用域开放，现改为直接置状态 + redraw（__core.selection.set/clear）：
//   - 选区样本两端由 alignRegion 归一到主步边界 → 反向拖动天然正确，
//     不再需要“起点对齐首格/末格”的方向感知逻辑；
//   - 单格（子步）不再需要“不派发 mouseup 防核心清除”的 hack —— 状态直驱保留。
// 依赖：core/__core.js、core/wpf.js（window.__wpf）；普通 script，加载顺序：核心→__core→wpf→本文件。
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureSelect) return;
  window.__wpfFeatureSelect = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    const core = window.__core;
    const canvas = wpf.canvas();

    // 鼠标会话状态（记录原始起止点，用于换算选区；选框视觉交给核心原生绘制）
    const marquee = {
      active: false,          // 正在一次鼠标会话（按下→抬起）
      dragging: false,        // 超过拖动手势阈值（>5px）
      hadSelection: false,    // 按下瞬间是否已有选框（决定“单击=清除”还是“单击=框一格”）
      startX: 0, startY: 0, curX: 0, curY: 0, // canvas 相对坐标
      startClientX: 0, startClientY: 0,       // 按下点 client 坐标（信号行锚点）
      startSample: -1         // 按下点 sample（mapAt 结果）
    };
    const clip = { data: null }; // 复制剪贴板 {rows:[{name, values}], sampleCount}
    let bar = null;              // 浮动工具条 DOM

    // ------------------------------------------------ 工具条生命周期
    function hideBarKeepSelection() {
      if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
      bar = null;
    }

    function hideBar() {
      hideBarKeepSelection();
      // 菜单消失时选框同步消失（视觉与菜单同步出现/同步消失）
      core.selection.clear();
      window.__wpf.selection = null;
    }

    // 框选完成 → 弹工具条。等一帧让核心完成状态落地；兜底收起核心可能残留的
    // #wp-modal 遮罩（防挡住后续点击）。
    function showBarAfter(clientX, clientY) {
      const region = window.__wpf.selection;
      if (!region) return;
      setTimeout(function () {
        if (!window.__wpf.selection) return;
        const ov = document.getElementById('wp-modal-overlay');
        if (ov && ov.className.indexOf('hidden') < 0) ov.classList.add('hidden');
        showBar(clientX, clientY);
      }, 0);
    }

    // 记录我们的选区元数据（供工具条批量操作使用）
    function setSelection(region, ax, ay) {
      window.__wpf.selection = region || null;
      window.__wpf._selAnchor = (region && ax != null && ay != null) ? { x: ax, y: ay } : null;
    }

    // ------------------------------------------------ 区域换算
    // 由鼠标起止点（canvas 相对坐标）计算覆盖的 {signalStart, signalEnd,
    // sampleStart, sampleEnd}。夹逼语义：
    //   - 信号行/样本越界 → 夹到边界（0 或最大值）；
    //   - 两边都越界 → 返回 null（没框到有效区域，避免误框整片）。
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
      if (!mStart || !mEnd || !mTop || !mBottom) return null;

      const dw = window.document_wave;
      const maxSignal = (dw && Array.isArray(dw.m_signals)) ? dw.m_signals.length - 1 : -1;
      const maxSample = (dw && Array.isArray(dw.m_signals) && dw.m_signals.length)
        ? Math.max(0, (Number(dw.m_signals[0].values && dw.m_signals[0].values.length) || 0) - 1) : -1;

      const topHit = Number(mTop.signalIndex);
      const botHit = Number(mBottom.signalIndex);
      const leftHit = Number(mStart.signalSampleIndex);
      const rightHit = Number(mEnd.signalSampleIndex);
      if ((topHit < 0 && botHit < 0) || (leftHit < 0 && rightHit < 0)) return null;

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

    // 单击框一格（单行）：行 = 按下点所在信号行
    function regionFromSamples(lo, hi) {
      const m = wpf.mapAt(marquee.startClientX, marquee.startClientY);
      const si = m ? Number(m.signalIndex) : -1;
      if (si < 0) return null;
      return { signalStart: si, signalEnd: si, sampleStart: Math.min(lo, hi), sampleEnd: Math.max(lo, hi) };
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

    // ------------------------------------------------ 粒度对齐
    // 整步粒度：样本列两端对齐到主步边界（sampleStart 取主步首格、sampleEnd 取
    // 主步末格），使选框视觉与写入范围一致；子步粒度：原样。
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
    function alignSample(sampleIndex, isEnd) {
      const s = Number(sampleIndex);
      if (!(s >= 0)) return s;
      if (wpf.editGranularity() === 'substep') return s;
      const stride = wpf.stride();
      const step = Math.floor(s / stride);
      return isEnd ? (step * stride + stride - 1) : (step * stride);
    }

    // 把 region 交给核心原生绘制（直驱状态 + 重绘；已包含 active=true 语义）
    function paintSelection(region) {
      if (!region) return false;
      return core.selection.set(region.signalStart, region.sampleStart,
        region.signalEnd, region.sampleEnd);
    }

    // ------------------------------------------------ 鼠标会话
    function onMouseDown(e) {
      if (e.button !== 0) return;
      if (e.target !== canvas) return;
      if (wpf.currentTool() !== 'select') return;
      marquee.hadSelection = !!window.__wpf.selection;
      if (bar) hideBarKeepSelection(); // 只收菜单；选框的清除/替换在 mouseup 决定
      const r = canvas.getBoundingClientRect();
      const m = wpf.mapAt(e.clientX, e.clientY);
      marquee.active = true;
      marquee.dragging = false;
      marquee.startX = marquee.curX = e.clientX - r.left;
      marquee.startY = marquee.curY = e.clientY - r.top;
      marquee.startClientX = e.clientX;
      marquee.startClientY = e.clientY;
      marquee.startSample = m ? Number(m.signalSampleIndex) : -1;
      // 拦截：框选完全由本模块（粒度对齐后）驱动核心原生 range selection 绘制
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    function onMouseMove(e) {
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
      // 拖动中：实时按粒度对齐后的区域驱动核心绘制（region 归一化 → 反向拖动天然正确）
      paintSelection(alignRegion(regionFromPoints()));
    }

    function onMouseUp(e) {
      if (!marquee.active) return;
      marquee.active = false;
      e.stopImmediatePropagation();
      e.preventDefault();

      if (!marquee.dragging) {
        // ---------------- 单击 ----------------
        if (marquee.hadSelection) {
          // 已有选框：点击别处 = 清除（不框新格、不弹菜单）
          core.selection.clear();
          setSelection(null);
          return;
        }
        // 无选框：单击 = 框选一个「粒度单位」
        if (marquee.startSample >= 0) {
          const lo = alignSample(marquee.startSample, false);
          const hi = alignSample(marquee.startSample, true);
          const region = regionFromSamples(lo, hi);
          paintSelection(region);
          setSelection(region, marquee.startClientX, marquee.startClientY);
          showBarAfter(e.clientX, e.clientY);
        }
        return;
      }

      // ---------------- 拖动框选 ----------------
      const region = alignRegion(regionFromPoints());
      paintSelection(region); // 最终区域
      setSelection(region, marquee.startClientX, marquee.startClientY);
      if (region) showBarAfter(e.clientX, e.clientY);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', function () { marquee.active = false; });

    // ------------------------------------------------ 批量写值
    function isVector(sig) { return !!(window.SignalType && sig.type === window.SignalType.Vector); }

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

    // 解析总线输入（10 / 0xA / A / 0b1010 / 8'hA5 / x / z）
    function parseBusInput(raw, width) {
      const w = Math.max(1, width || 1);
      if (window.__wpfVec && typeof window.__wpfVec.normalizeVectorValue === 'function') {
        try { return window.__wpfVec.normalizeVectorValue(raw, w); } catch (e) { /* 回退 */ }
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

    // kind: 'one' | 'zero' | 'x' | 'invert'
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
        out += ch === '1' ? '0' : ch === '0' ? '1' : ch;
      }
      return out;
    }

    function refreshTouched(touched) {
      touched.forEach(function (sig) {
        if (isVector(sig) && typeof wpf.refreshBusLabels === 'function') wpf.refreshBusLabels(sig);
      });
      wpf.scheduleRedraw();
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
          // 翻转逐格取反（不能走 writeValue：整步模式下它会铺满主步，
          // 交替时钟 1,0,1,0 翻完会变恒 0/1）。整步模式下展开到主步所有格、每格独立取反。
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
          for (const i of cells) sig.values[i] = nextValue(sig, sig.values[i], 'invert');
        } else {
          // 设值（设1/设0/设x）：整步按主步铺满
          const targets = wpf.indicesByGranularity(range, wpf.stride());
          for (const i of targets) {
            if (i >= sig.values.length) continue;
            wpf.writeValue(sig, i, nextValue(sig, sig.values[i], kind));
          }
        }
        touched.add(sig);
      }
      refreshTouched(touched);
    }

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
          for (const i of targets) if (i < sig.values.length) wpf.writeValue(sig, i, bits);
        } else {
          const t = text.toLowerCase();
          const v = t === '1' ? 1 : t === '0' ? 0 : t === 'x' ? -1 : t === 'z' ? 2 : null;
          if (v === null) continue;
          for (const i of targets) if (i < sig.values.length) wpf.writeValue(sig, i, v);
        }
        touched.add(sig);
      }
      refreshTouched(touched);
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

    // ------------------------------------------------ 浮动工具条
    function showBar(clientX, clientY) {
      hideBarKeepSelection();
      const region = window.__wpf.selection;
      if (!region) return;
      bar = document.createElement('div');
      bar.id = 'wpf-batch-bar';
      bar.style.cssText = 'position:fixed;z-index:300;display:flex;gap:4px;padding:6px 8px;align-items:center;'
        + 'background:#fff;border:1px solid #bbb;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);font-size:12px;';
      let suppressCommit = false; // 点按钮时 input 会失焦，不应误触发「失焦即提交」
      const buttons = [
        ['设 1', function () { applyValues('one'); }],
        ['设 0', function () { applyValues('zero'); }],
        ['设 x', function () { applyValues('x'); }],
        ['翻转', function () { applyValues('invert'); }]
        // 复制/粘贴走快捷键（Ctrl+C/V），不再占用工具条
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
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '输入值';
      input.title = '输入数值后回车或点击别处即写入（支持 10 / 0xA / 0b1010 / 8\'hA5 / x / z）；不输入点击别处 = 取消；Esc = 取消';
      input.style.cssText = 'width:92px;font-size:12px;padding:3px 6px;border:1px solid #bbb;border-radius:6px;';
      function commitInput() {
        const text = String(input.value || '').trim();
        if (!text) { hideBar(); return; }
        applyCustom(text);
        hideBar();
      }
      function cancelInput() {
        input.value = '';
        hideBar();
      }
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') { ev.preventDefault(); commitInput(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancelInput(); }
      });
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
      input.focus();
      input.select();
    }

    // ------------------------------------------------ 工具条全局关闭
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
      if (insideBar(e.target)) return; // 工具条按钮交给 click
      if (e.target === canvas) return; // 画布按下由 onMouseDown 决定
      dismissBar();
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar) {
        // 自己关菜单+选框；阻止核心 Esc（cancelCurrentTool 会切走工具）
        e.stopImmediatePropagation();
        e.preventDefault();
        dismissBar();
      }
    }, true);

    // 切走工具 / 窗口尺寸变化：遗留工具条应消失
    window.addEventListener('resize', function () {
      if (bar && wpf.currentTool() !== 'select') dismissBar();
    });
  }, 'editor-selection');
})();
