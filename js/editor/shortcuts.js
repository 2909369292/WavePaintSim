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

    // 方向键连击的撤销快照合并状态（见 onKeyDown 内注释）
    let arrowBurst = null;

    function onKeyDown(e) {
      if (isEditableTarget(e.target)) return;

      // Ctrl 组合：撤销 / 重做（走核心 document_wave API，不依赖 DOM 按钮 id）
      if (e.ctrlKey || e.metaKey) {
        const key = String(e.key || '').toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          wpf.undo();
          return;
        }
        if ((key === 'y') || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          wpf.redo();
          return;
        }
        // Ctrl+C / Ctrl+V：框选内容的复制 / 粘贴。
        // 核心自己有实现，但只在 select 工具下生效；这里补「任意工具」路径：
        // select 工具下放行给核心（防双写），其余工具由本模块直接驱动核心函数
        // （copySelection 读 rangeSel* 状态；pasteClipboard 自带空剪贴板守卫）。
        if (key === 'c' && !e.shiftKey) {
          const st = window.__core.state();
          if (st.tool !== 'select' && st.range.active && typeof window.copySelection === 'function') {
            e.preventDefault();
            window.copySelection();
          }
          return;
        }
        if (key === 'v' && !e.shiftKey) {
          const st = window.__core.state();
          if (st.tool === 'select') return; // 核心分支已处理
          if (typeof window.pasteClipboard === 'function') {
            e.preventDefault();
            window.pasteClipboard();
          }
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

      // Escape：清除框选与绘制光标（头注释承诺的行为；只清光标不清会导致
      // 误按方向键仍在旧位置写值）
      if (e.key === 'Escape') {
        if (window.__wpf.selection) window.__wpf.selection = null;
        window.__wpf.cursor = null;
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
        // 「整步」下一次跨一个主步（该信号 divisor 个下标），否则按 1 个下标挪。
        // 否则整步模式下连按两次 → 都落在同一主步内，光标看着没动。
        // ⚠ 步长必须用「当前信号自己的 divisor」（divisorOf），不是全局 stride()：
        //   信号设了私有子步（sig.subSteps）时 values 按自己 divisor 铺开，
        //   用全局口径求主步会框错格子。纵向跳转同样经主步坐标映射（见下）。
        const sigDivisor = wpf.divisorOf(signal);
        const stepMode = wpf.editGranularity() !== 'substep';
        const moveBy = function (delta) {
          if (!stepMode) return wpf.clamp(idx + delta, 0, len - 1);
          const step = Math.floor(idx / sigDivisor) + (delta > 0 ? 1 : -1);
          return wpf.clamp(step * sigDivisor, 0, len - 1);
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
          const target = dw.m_signals[i];
          const targetLen = target.values.length;
          // 纵向跳转 = 保持「主步浮点坐标」，再映射进目标行空间：
          //   idx / 源信号 divisor = 主步坐标（私有子步不同的行也能落到同一个
          //   主步 / 相对位置，等价跨行写值的主步中转口径）。整步模式下源 idx
          //   恒在主步边界 → 结果天然是目标行主步首格；子步模式保相对位置。
          const mainFloat = idx / sigDivisor;
          nextSample = wpf.clamp(Math.round(mainFloat * wpf.divisorOf(target)), 0, targetLen - 1);
        } else return;

        e.preventDefault();
        window.__wpf.cursor = { signalIndex: nextSignal, sampleIndex: nextSample };
        // 移动即绘制：写入当前位状态值（等效画笔跟随）
        const target = dw.m_signals[nextSignal];
        if (target && Array.isArray(target.values)) {
          // 撤销快照按连击合并：800ms 内在同一信号上连续按方向键只压一条快照，
          // 避免 20 连按冲掉核心 100 条撤销栈（鼠标拖拽整次只压一条，口径对齐）。
          const now = Date.now();
          if (!arrowBurst || arrowBurst.signalIndex !== nextSignal || now - arrowBurst.at > 800) {
            wpf.pushUndoSnapshot();
            arrowBurst = { signalIndex: nextSignal, at: now };
          } else {
            arrowBurst.at = now;
          }
          // 与鼠标绘制共用粒度逻辑，保证"整步"时方向键也写满整个主步
          wpf.writeValue(target, nextSample, wpf.bitStateToValue(wpf.currentBitState()));
          wpf.scheduleRedraw();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
  }, 'editor/shortcuts');
})();
