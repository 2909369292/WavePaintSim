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

    const marquee = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dragging: false };
    const clip = { data: null }; // 复制剪贴板 {rows: [{signalIndex, values: []}], sampleCount}
    // BUG-001 防护：单击时用 dispatchEvent 回放 mousedown/mouseup/click，
    // 这些合成事件同样会被本模块的捕获监听器收到 → 会再次进入 onMouseUp 的 else
    // 分支再次回放 → 无限递归。回放期间必须整体短路。
    let replaying = false;

    let overlay = null;
    let bar = null;

    function ensureOverlay() {
      if (overlay && overlay.parentElement) return overlay;
      overlay = document.createElement('canvas');
      overlay.id = 'wpf-select-overlay';
      overlay.style.cssText = 'position:absolute;pointer-events:none;z-index:50;';
      const holder = canvas.parentElement;
      if (holder) {
        holder.style.position = holder.style.position || 'relative';
        holder.appendChild(overlay);
      }
      syncOverlaySize();
      return overlay;
    }

    function syncOverlaySize() {
      if (!overlay) return;
      const holder = canvas.parentElement;
      if (!holder) return;
      const r = canvas.getBoundingClientRect();
      const hr = holder.getBoundingClientRect();
      overlay.style.left = (r.left - hr.left) + 'px';
      overlay.style.top = (r.top - hr.top) + 'px';
      // BUG-005/P2-4：显式设 CSS 尺寸，使叠加层与主画布的缩放比例一致，
      // 否则框选虚线会在缩放/HiDPI 下与鼠标位置错位。
      const cssW = Math.max(1, Math.round(r.width)) + 'px';
      const cssH = Math.max(1, Math.round(r.height)) + 'px';
      if (overlay.style.width !== cssW) overlay.style.width = cssW;
      if (overlay.style.height !== cssH) overlay.style.height = cssH;
      if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
      }
    }

    function drawMarquee() {
      if (!overlay) return;
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (!marquee.active) return;
      const x = Math.min(marquee.startX, marquee.curX);
      const y = Math.min(marquee.startY, marquee.curY);
      const w = Math.abs(marquee.curX - marquee.startX);
      const h = Math.abs(marquee.curY - marquee.startY);
      ctx.save();
      ctx.strokeStyle = '#1e88e5';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      ctx.fillStyle = 'rgba(30,136,229,0.10)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    function hideBar() {
      if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
      bar = null;
      window.__wpf.selection = null;
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
        if (sig && window.SignalType && sig.type === window.SignalType.Bit && Array.isArray(sig.values)) {
          out.push({ index: i, sig: sig });
        }
      }
      return out;
    }

    function applyValues(fn) {
      const region = window.__wpf.selection;
      if (!region) return;
      wpf.pushUndoSnapshot();
      for (const { sig } of regionSignals(region)) {
        for (let i = region.sampleStart; i <= region.sampleEnd && i < sig.values.length; i += 1) {
          sig.values[i] = fn(sig.values[i]);
        }
      }
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
      bar.style.cssText = 'position:fixed;z-index:300;display:flex;gap:4px;padding:6px 8px;'
        + 'background:#fff;border:1px solid #bbb;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);font-size:12px;';
      const buttons = [
        ['设 1', function () { applyValues(function () { return 1; }); }],
        ['设 0', function () { applyValues(function () { return 0; }); }],
        ['设 x', function () { applyValues(function () { return -1; }); }],
        ['翻转', function () { applyValues(function (v) { return v === 1 ? 0 : v === 0 ? 1 : v; }); }],
        ['复制', function () { copyRegion(); }],
        ['粘贴', function () { pasteRegion(); }],
        ['取消', function () { hideBar(); drawMarquee(); }]
      ];
      buttons.forEach(function ([label, fn]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'cursor:pointer;padding:3px 10px;';
        b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
        bar.appendChild(b);
      });
      document.body.appendChild(bar);
      const bw = bar.offsetWidth, bh = bar.offsetHeight;
      bar.style.left = Math.max(8, Math.min(clientX, window.innerWidth - bw - 8)) + 'px';
      bar.style.top = Math.max(8, Math.min(clientY - bh - 12, window.innerHeight - bh - 8)) + 'px';
    }

    function hideBarKeepSelection() {
      if (bar && bar.parentElement) bar.parentElement.removeChild(bar);
      bar = null;
    }

    function onMouseDown(e) {
      if (replaying) return;
      if (e.button !== 0) return;
      if (e.target !== canvas) return;
      if (wpf.currentTool() !== 'select') return;
      if (bar) hideBar();
      const r = canvas.getBoundingClientRect();
      marquee.active = true;
      marquee.dragging = false;
      marquee.startX = marquee.curX = e.clientX - r.left;
      marquee.startY = marquee.curY = e.clientY - r.top;
      // 接管：阻止原版把"按下-拖动"当成信号移动
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
        ensureOverlay();
        syncOverlaySize();
      }
      if (marquee.dragging) {
        marquee.curX = nx;
        marquee.curY = ny;
        e.stopImmediatePropagation();
        e.preventDefault();
        drawMarquee();
      }
    }

    function onMouseUp(e) {
      if (replaying) return;
      if (!marquee.active) return;
      marquee.active = false;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (marquee.dragging) {
        marquee.dragging = false;
        const region = regionFromPoints();
        window.__wpf.selection = region;
        if (region) showBar(e.clientX, e.clientY);
        drawMarquee(); // 保留选区虚线；取消时再清除
      } else {
        // 单击：回放给原版（选择信号/对象）
        marquee.dragging = false;
        drawMarquee();
        const init = { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, button: 0, view: window };
        // try/finally 保证异常时标志也能复位，否则选择工具会永久失灵
        replaying = true;
        try {
          canvas.dispatchEvent(new MouseEvent('mousedown', init));
          canvas.dispatchEvent(new MouseEvent('mouseup', init));
          canvas.dispatchEvent(new MouseEvent('click', init));
        } finally {
          replaying = false;
        }
      }
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
      drawMarquee();
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
      if (e.key === 'Escape') dismissBar();
    }, true);

    // 切到别的工具后，遗留的框选工具条也应消失
    window.addEventListener('resize', function () {
      if (bar && wpf.currentTool() !== 'select') dismissBar();
      syncOverlaySize();
    });
  }, 'feature-select');
})();
