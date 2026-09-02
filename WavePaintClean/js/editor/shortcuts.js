// ============================================================================
// WavePaintClean js/editor/shortcuts.js —— 键盘快捷键绘制
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F4）：
//   1. 焦点不在输入框时，数字/字母键切换位状态（等效点击位状态选择器）：
//      1=高电平  0=低电平  X=未定义  Z=高阻  U=上拉  D=下拉
//   2. Ctrl+Z / Ctrl+Y（及 Ctrl+Shift+Z）：核心撤销/重做。
//   3. Delete / Backspace：删除当前选中对象（核心 deleteSelection）。
//   4. 方向键移动绘制光标并写入当前位状态值（光标由 editor/draw.js 的绘制位置
//      初始化；←→ 移动格子，↑↓ 切换信号行；Escape 清除选区/光标）。
// 依赖：core/wpf.js（window.__wpf）、解混淆核心 wavepaint.clean.js 全局 API
// 修改记录：
//   2026-08-30 初版（F4）
//   2026-08-30 P0-2 方向键绘制前压撤销快照，并改用 wpf.writeValue 支持编辑粒度
//   2026-08-30 P1-2 配套：←→ 移动步长与粒度一致（整步跨 stride，子步跨 1）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureShortcuts) return;
  window.__wpfFeatureShortcuts = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;

    function isEditableTarget(target) {
      if (!target) return false;
      const tag = String(target.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    }

    function onKeyDown(e) {
      if (isEditableTarget(e.target)) return;

      // Ctrl 组合：撤销 / 重做
      if (e.ctrlKey || e.metaKey) {
        const key = String(e.key || '').toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          const btn = document.getElementById('tool-undo');
          if (btn) { e.preventDefault(); btn.click(); }
          return;
        }
        if ((key === 'y') || (key === 'z' && e.shiftKey)) {
          const btn = document.getElementById('tool-redo');
          if (btn) { e.preventDefault(); btn.click(); }
          return;
        }
        return;
      }

      // 位状态快捷键（与工具栏"位状态"菜单项的 key 标注一致）
      const stateKeys = { '1': '1', '0': '0', 'x': 'x', 'z': 'z', 'u': 'u', 'd': 'd' };
      const state = stateKeys[String(e.key || '').toLowerCase()];
      if (state) {
        e.preventDefault();
        wpf.setBitState(state);
        return;
      }

      // Delete / Backspace：删除选中对象
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typeof window.deleteSelection === 'function') {
          e.preventDefault();
          window.deleteSelection();
        }
        return;
      }

      // Escape：清除框选（本模块系列）
      if (e.key === 'Escape') {
        if (window.__wpf.selection) window.__wpf.selection = null;
        if (typeof window.clearSelection === 'function') window.clearSelection();
        wpf.scheduleRedraw();
        return;
      }

      // 方向键：移动绘制光标并写入当前位状态值
      if (e.key.startsWith('Arrow')) {
        const dw = window.document_wave;
        const cursor = window.__wpf.cursor;
        if (!dw || !Array.isArray(dw.m_signals) || !cursor) return;
        const signal = dw.m_signals[cursor.signalIndex];
        if (!signal || !Array.isArray(signal.values)) return;
        const paintable = window.SignalType && signal.type === window.SignalType.Bit;
        if (!paintable) return;
        const idx = cursor.sampleIndex;
        const len = signal.values.length;
        // 移动粒度与写入粒度保持一致（P1-2 配套）：
        // 「整步」下一次跨一个主步（stride 个下标），否则按 1 个下标挪。
        // 否则整步模式下连按两次 → 都落在同一主步内，光标看着没动。
        const stride = wpf.stride();
        const stepMode = wpf.editGranularity() !== 'substep';
        const moveBy = function (delta) {
          if (!stepMode) return wpf.clamp(idx + delta, 0, len - 1);
          const step = Math.floor(idx / stride) + (delta > 0 ? 1 : -1);
          return wpf.clamp(step * stride, 0, len - 1);
        };
        let nextSignal = cursor.signalIndex;
        let nextSample = idx;
        if (e.key === 'ArrowLeft') nextSample = moveBy(-1);
        else if (e.key === 'ArrowRight') nextSample = moveBy(1);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const dir = e.key === 'ArrowUp' ? -1 : 1;
          let i = cursor.signalIndex + dir;
          while (i >= 0 && i < dw.m_signals.length) {
            const s = dw.m_signals[i];
            if (s && window.SignalType && s.type === window.SignalType.Bit && Array.isArray(s.values)) break;
            i += dir;
          }
          if (i < 0 || i >= dw.m_signals.length) return;
          nextSignal = i;
          const targetLen = dw.m_signals[i].values.length;
          nextSample = stepMode
            ? wpf.clamp(Math.floor(idx / stride) * stride, 0, targetLen - 1)
            : wpf.clamp(idx, 0, targetLen - 1);
        } else return;

        e.preventDefault();
        window.__wpf.cursor = { signalIndex: nextSignal, sampleIndex: nextSample };
        // 移动即绘制：写入当前位状态值（等效画笔跟随）
        const target = dw.m_signals[nextSignal];
        if (target && Array.isArray(target.values)) {
          // 写入前压快照，使方向键绘制可 Ctrl+Z 回退（每次按键一条）
          wpf.pushUndoSnapshot();
          // 与鼠标绘制共用粒度逻辑，保证"整步"时方向键也写满整个主步
          wpf.writeValue(target, nextSample, wpf.bitStateToValue(wpf.currentBitState()));
          wpf.scheduleRedraw();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
  }, 'editor/shortcuts');
})();
