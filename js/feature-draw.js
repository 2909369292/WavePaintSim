// ============================================================================
// WavePaintSim feature-draw.js —— TimeGen 式鼠标绘制（上移画 1 / 下移画 0）
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F2，用户点名需求）：
//   1. 位状态选择器处于 1 或 0 时进入"自动 0/1 模式"：
//      - 指针位于信号行上半区 → 写 1
//      - 指针位于信号行下半区 → 写 0
//   2. 按住左键拖动可连续绘制；按下时锁定首个信号行，拖到别的行不改别行。
//   3. 位状态选择器选 x/z/u/d 时保持原版"固定值绘制"（不拦截，交给原版）。
//   4. 按住 Shift 拖动 = 擦除（写 x）。
//   5. 点在信号名称区 / 空白行 / 非画笔工具时不启用，原版行为不受影响。
// 依赖：feature-common.js（window.__wpf）、混淆核心全局 API
// 实现要点：在 document 上以捕获阶段监听鼠标事件（先于画布目标监听器），
//   仅在"自动模式 + 画笔工具"时 stopImmediatePropagation 接管。
// 修改记录：
//   2026-08-30 初版（F2）
//   2026-08-30 X-1 无激活工具时视为画笔，确保 TimeGen 默认接管（仿真恒 0 根因之一）
//   2026-08-30 接入编辑粒度（整步/子步），默认整步以匹配仿真采样
//   2026-08-30 P0-2 修复绘制无法撤销：onMouseDown 压一次快照（整次拖拽一条）
//   2026-08-30 P1-1 拖动编辑锁定首个信号（TimeGen 行为）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureDraw) return;
  window.__wpfFeatureDraw = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    // signalIndex：本次拖拽锁定的信号行（P1-1，TimeGen 行为——按下后只影响这一行）
    // value      ：本次拖拽当前生效的值（按下时确定；指针留在锁定行内时按行内位置重算）
    const drag = { active: false, value: 1, signalIndex: -1 };

    function isPaintableSignal(signal) {
      return !!(signal && window.SignalType && signal.type === window.SignalType.Bit
        && Array.isArray(signal.values));
    }

    // 计算本次指针位置应写入的格子与值；返回 null 表示此处不绘制
    function hitTest(e) {
      const m = wpf.mapAt(e.clientX, e.clientY);
      if (!m || m.clickedOnName) return null;
      const signalIndex = m.signalIndex;
      if (signalIndex < 0 || !isPaintableSignal(m.signal)) return null;
      const sig = window.document_wave.m_signals[signalIndex];
      const idx = m.signalSampleIndex;
      if (idx < 0 || idx >= sig.values.length) return null;
      // 行内上下判定：上半 = 1，下半 = 0；行高探测失败时退化为当前位状态值
      const band = wpf.signalRowBand(e.clientX, e.clientY, signalIndex);
      let value;
      if (e.shiftKey) {
        value = -1; // Shift = 擦除
      } else if (band && band.height > 0) {
        const canvas = wpf.canvas();
        const yInCanvas = e.clientY - canvas.getBoundingClientRect().top;
        value = (yInCanvas - band.top) < band.height / 2 ? 1 : 0;
      } else {
        value = wpf.bitStateToValue(wpf.currentBitState());
      }
      return { signalIndex: signalIndex, sampleIndex: idx, value: value };
    }

    function paintAt(e) {
      const hit = hitTest(e);
      if (!hit) return;
      const sig = window.document_wave.m_signals[hit.signalIndex];
      // 按编辑粒度写入（整步：写满该主步的 stride 个下标），并同步清时钟标记
      wpf.writeValue(sig, hit.sampleIndex, hit.value);
      // 记录光标位置供 feature-shortcuts.js 的方向键使用
      window.__wpf.cursor = { signalIndex: hit.signalIndex, sampleIndex: hit.sampleIndex };
      wpf.scheduleRedraw();
    }

    // 拖动过程中的取值：Shift 恒为擦除；指针仍在锁定行内时按行内上下半区实时判定；
    // 指针移出锁定行（拖到别的信号行或画布外）时保持上一次的值，避免数值乱跳。
    function valueForDrag(e) {
      if (e.shiftKey) return -1;
      const m = wpf.mapAt(e.clientX, e.clientY);
      if (m && m.signalIndex === drag.signalIndex) {
        const band = wpf.signalRowBand(e.clientX, e.clientY, drag.signalIndex);
        if (band && band.height > 0) {
          const yInCanvas = e.clientY - wpf.canvas().getBoundingClientRect().top;
          return (yInCanvas - band.top) < band.height / 2 ? 1 : 0;
        }
      }
      return drag.value;
    }

    // 拖动中绘制：信号行固定为按下时锁定的那一行，只跟随横向格子推进（P1-1）。
    function paintMove(e) {
      if (drag.signalIndex < 0) return;
      const dw = window.document_wave;
      const sig = (dw && Array.isArray(dw.m_signals)) ? dw.m_signals[drag.signalIndex] : null;
      if (!isPaintableSignal(sig)) return;
      const m = wpf.mapAt(e.clientX, e.clientY);
      if (!m || m.clickedOnName) return;

      let idx;
      if (m.signalIndex === drag.signalIndex) {
        idx = m.signalSampleIndex;               // 指针在锁定行内：直接用该行命中的下标
      } else {
        // 指针移出锁定行：用全局主步号换算成锁定行的主值下标。
        // 不能跨行借用 signalSampleIndex —— 不同信号的 subSteps 可能不同，
        // 下标坐标系不一样，直接借用会写到错误的格子。
        idx = (Math.max(0, Number(m.mainStep) || 0)) * wpf.stride();
      }
      if (!(idx >= 0) || idx >= sig.values.length) return;

      drag.value = valueForDrag(e);
      wpf.writeValue(sig, idx, drag.value);
      window.__wpf.cursor = { signalIndex: drag.signalIndex, sampleIndex: idx };
      wpf.scheduleRedraw();
    }

    function onMouseDown(e) {
      if (e.button !== 0) return;
      // 无激活工具时视为画笔（与原版默认画笔一致），确保 TimeGen 默认接管，
      // 否则用户不手动点「画笔」时落回原版绘制写子步下标 → 仿真采样不到 → 结果 0
      const tool = wpf.currentTool();
      if (tool !== 'paint' && tool !== null) return;
      const target = e.target;
      if (!target || target !== wpf.canvas()) return;
      if (!wpf.isAutoBitMode() && !e.shiftKey) return; // 固定值模式：交给原版
      const hit = hitTest(e);
      if (!hit) return;                                // 名称区/空白行等：交给原版
      // 接管后原版的 canvas mousedown 不会再执行，它本该压入的撤销快照由我们补上。
      // 整次拖拽只压一次（不是每格一条）：否则一次拖 60 格就压 60 条快照，
      // 会把核心 100 条的撤销栈上限挤爆，用户真正想保留的历史被冲掉。
      wpf.pushUndoSnapshot();
      e.stopImmediatePropagation();
      e.preventDefault();
      drag.active = true;
      // 锁定本次拖拽作用的信号行（P1-1）：后续 mousemove 一律写这一行，
      // 拖到别的信号行也不会改到别人。
      drag.signalIndex = hit.signalIndex;
      drag.value = hit.value;
      paintAt(e);
    }

    function onMouseMove(e) {
      if (!drag.active) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      paintMove(e);          // P1-1：只写 drag.signalIndex 锁定的那一行
    }

    function onMouseUp(e) {
      if (!drag.active) return;
      drag.active = false;
      drag.signalIndex = -1;
      e.stopImmediatePropagation();
      wpf.scheduleRedraw();
    }

    // 捕获阶段挂在 document 上（先于画布上的原版目标监听器执行）
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    // 拖出画布/失焦时终止绘制
    window.addEventListener('blur', function () {
      drag.active = false;
      drag.signalIndex = -1;
    });
  }, 'feature-draw');
})();
