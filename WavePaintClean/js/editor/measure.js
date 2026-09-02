// ============================================================================
// WavePaintSim feature-measure.js —— 时间光标与测量（GTKWave 风格）
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F6）：
//   1. 鼠标悬停画布时显示竖线幽灵光标 + 顶部步号标签（纯叠加层，不改数据）。
//   2. Alt+左键 点击画布放置测量光标 A / B（交替），显示两光标步号差 Δ；
//      只有一个光标时显示其步号。再次 Alt+点击 循环更新 A→B→A。
//   3. Escape 清除测量光标（feature-shortcuts 已把 Escape 用于清选区，
//      本模块仅在无选区时响应清除光标）。
//   4. 不干扰任何原版工具：叠加层 pointer-events:none，监听不阻止传播。
// 依赖：feature-common.js、混淆核心全局 API
// 修改记录：
//   2026-08-30 初版（F6）
//   2026-08-30 P2-4 overlay 补 CSS 尺寸对齐（BUG-005，缩放/HiDPI 错位）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureMeasure) return;
  window.__wpfFeatureMeasure = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    const canvas = wpf.canvas();
    if (!canvas) return;

    const state = { hoverX: -1, cursors: [] }; // cursors: 最多 2 个 {x, mainStep}
    let overlay = null;

    function ensureOverlay() {
      if (overlay && overlay.parentElement) return overlay;
      overlay = document.createElement('canvas');
      overlay.id = 'wpf-measure-overlay';
      overlay.style.cssText = 'position:absolute;pointer-events:none;z-index:60;';
      const holder = canvas.parentElement;
      if (holder) {
        holder.style.position = holder.style.position || 'relative';
        holder.appendChild(overlay);
      }
      syncSize();
      return overlay;
    }

    function syncSize() {
      if (!overlay) return;
      const holder = canvas.parentElement;
      if (!holder) return;
      const r = canvas.getBoundingClientRect();
      const hr = holder.getBoundingClientRect();
      overlay.style.left = (r.left - hr.left) + 'px';
      overlay.style.top = (r.top - hr.top) + 'px';
      // BUG-005/P2-4：只设 drawing buffer 尺寸、不设 CSS 尺寸时，叠加层会按
      // buffer 分辨率显示；一旦画布的 CSS 盒子与 buffer 不一致（页面缩放、
      // 高分屏、窗口 resize 中间态），幽灵光标/测量线就会整体错位。
      // 显式把 CSS 尺寸对齐到画布的渲染盒子，缩放比例即与主画布一致。
      const cssW = Math.max(1, Math.round(r.width)) + 'px';
      const cssH = Math.max(1, Math.round(r.height)) + 'px';
      if (overlay.style.width !== cssW) overlay.style.width = cssW;
      if (overlay.style.height !== cssH) overlay.style.height = cssH;
      if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
        overlay.width = canvas.width;
        overlay.height = canvas.height;
      }
    }

    // x（canvas 坐标）→ 主步号（越界返回 null）
    function stepAtX(x) {
      const m = window.mapCanvasPosition(x, 1);
      if (!m || m.mainStep < 0 || m.mainStep >= window.document_wave.m_sampleCount) return null;
      return m.mainStep;
    }

    function draw() {
      ensureOverlay();
      syncSize();
      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (canvas.parentElement) {
        const r = canvas.getBoundingClientRect();
        if (r.width === 0) return;
      }

      const drawLine = function (x, color, label, dashed) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        if (dashed) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, overlay.height);
        ctx.stroke();
        ctx.setLineDash([]);
        if (label) {
          ctx.font = '11px Consolas, monospace';
          const w = ctx.measureText(label).width + 8;
          const lx = Math.min(Math.max(0, x - w / 2), overlay.width - w);
          ctx.fillStyle = color;
          ctx.fillRect(lx, 0, w, 15);
          ctx.fillStyle = '#fff';
          ctx.textBaseline = 'top';
          ctx.fillText(label, lx + 4, 2);
        }
        ctx.restore();
      };

      if (state.hoverX >= 0) {
        const step = stepAtX(state.hoverX);
        drawLine(state.hoverX, 'rgba(120,120,120,0.7)', step === null ? '' : '步 ' + step, true);
      }
      state.cursors.forEach(function (c, i) {
        drawLine(c.x, i === 0 ? '#e53935' : '#1e88e5', String.fromCharCode(65 + i) + '=' + c.mainStep, false);
      });

      // 差值读数
      if (state.cursors.length === 2) {
        const d = state.cursors[1].mainStep - state.cursors[0].mainStep;
        const text = 'Δ = ' + d + ' 步' + (d !== 0 ? '（1/' + Math.abs(d) + ' 每步）' : '');
        ctx.save();
        ctx.font = '12px Consolas, monospace';
        const w = ctx.measureText(text).width + 12;
        ctx.fillStyle = 'rgba(40,40,40,0.85)';
        ctx.fillRect(overlay.width - w - 4, 20, w, 18);
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'top';
        ctx.fillText(text, overlay.width - w + 2, 24);
        ctx.restore();
      }
    }

    let raf = 0;
    function scheduleDraw() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; draw(); });
    }

    function onMouseMove(e) {
      if (e.target !== canvas) {
        if (state.hoverX !== -1) { state.hoverX = -1; scheduleDraw(); }
        return;
      }
      const r = canvas.getBoundingClientRect();
      state.hoverX = e.clientX - r.left;
      scheduleDraw();
    }

    function onMouseDown(e) {
      if (e.target !== canvas || !e.altKey || e.button !== 0) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const step = stepAtX(x);
      if (step === null) return;
      // 循环放置：第 1 个 → A；第 2 个 → B；第 3 个 → 重置为 A
      if (state.cursors.length >= 2) state.cursors = [];
      state.cursors.push({ x: x, mainStep: step });
      scheduleDraw();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' && state.cursors.length) {
        if (window.__wpf.selection) return; // 有框选时交给选区清除
        state.cursors = [];
        scheduleDraw();
      }
    }

    function onResize() { scheduleDraw(); }

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResize);
    // 画布重绘后叠加层可能错位（缩放等），监听一次低频同步
    setInterval(syncSize, 1000);
  }, 'feature-measure');
})();
