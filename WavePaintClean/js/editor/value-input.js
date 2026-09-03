// ============================================================================
// WavePaintClean js/editor/value-input.js —— 值输入编辑（Bit/Vector 弹窗）
// ----------------------------------------------------------------------------
// 职责（画笔工具 tool-paint 下）：
//   - Bit 单击（无拖动）→ 弹值输入弹窗（整步/子步粒度写入）
//   - Ctrl/⌘+拖动 / Vector 单击 → 切 select 工具，交给 editor/selection.js
//     （复用框选工具条，不再弹本模块弹窗）
//   - Bit 普通拖动 → 交给 editor/draw.js（TimeGen 绘制）
// 弹窗交互：自动聚焦、回车/点击别处即写入、无输入点别处即取消、Esc 取消
// （隐藏 #wp-modal 自带确定/取消按钮，保留右上角 X）。
// 依赖：core/wpf.js（window.__wpf）、core/__core.js（window.__core.prompt）
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureValueEdit) return;
  window.__wpfFeatureValueEdit = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    const canvas = wpf.canvas();

    // ---------------------------------------------------------------- 弹窗
    // 统一走核心弹窗：__core.prompt → 核心 wpQuickPrompt（[PATCH-A5] 已把
    // 「回车/失焦即写入、空值取消、隐藏确定/取消、非法输入红框」整套输入流收进核心）。
    // 本模块不再直接操作 #wp-modal DOM —— 历史那份实现约 80 行，且与核心的
    // wpModalState 脱节（全局快捷键抑制只能靠自己 stopPropagation 勉强挡）。
    // 返回 Promise<string|null>：写入→去空格后的输入串；取消→null。
    function showPrompt(title, message, defaultValue, subtitle, invalid) {
      return window.__core.prompt({
        title: title,
        message: message + (subtitle ? '\n（当前粒度：' + subtitle + '）' : ''),
        value: defaultValue == null ? '' : defaultValue,
        invalid: !!invalid
      });
    }
    function promptActive() { return window.__core.promptActive(); }

    // ---------------------------------------------------------- 输入解析
    // 值解析统一走 wpf.parseValue(raw, sig)（见 core/wpf.js「值解析」——无位宽
    // 概念，位串/0x/0b/Verilog/十进制皆可，Vector 与 Bit 各自编码）。
    // 历史实现 parseVectorValue/vectorWidth 依赖不存在的 sig.width（width 恒 1 →
    // 'A' 会被截成 '0'，正是「框选多 bit 信号写值变 0 / 添加信号异常」的根源），
    // 已删除；本模块只保留 Bit 的「单字符 / 位串循环」输入语义（历史 R1 规则）。
    const BIT_MAP = { '1': 1, '0': 0, 'x': -1, 'z': 2, 'u': 3, 'd': 4 };
    // 解析 Bit 输入：返回 { value:number }（单值）或 { multi:[chars] }（位串），非法返回 null
    function parseBitInput(raw) {
      const text = String(raw == null ? '' : raw).trim().toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
      if (!text) return null;
      if (/^[10xzud]$/.test(text)) return { value: BIT_MAP[text] };
      if (/^[10xz]+$/.test(text)) return { multi: text.split('') };
      return null;
    }

    // ---------------------------------------------------------- 统一写入
    // 对目标下标列表按粒度写入一个值（Vector 值 / Bit 单值或位串循环）。
    // 返回 true=成功写入，false=输入非法。
    // indices 是「该信号自己的 values 下标」（mousedown 的 signalSampleIndex 口径），
    // 因此按步收敛用 divisorOf(sig) 而不是全局 stride()：信号设了私有子步时，
    // 用全局口径求主步首格会框错格子。
    function applyToRange(sig, indices, raw) {
      const isVector = !!(window.SignalType && sig.type === window.SignalType.Vector);
      const targets = wpf.indicesByGranularity(indices, wpf.divisorOf(sig));
      if (isVector) {
        // Vector：交给 wpf.parseValue 全格式解析（'A' 按信号 radix→10，不会变 '0'）
        const v = wpf.parseValue(raw, sig);
        if (v === null) return false;
        wpf.pushUndoSnapshot(); // R4
        for (const i of targets) {
          if (i < sig.values.length) wpf.writeValue(sig, i, v);
        }
        if (typeof wpf.refreshBusLabels === 'function') wpf.refreshBusLabels(sig);
        wpf.scheduleRedraw();
        return true;
      }
      const parsed = parseBitInput(raw);
      if (!parsed) return false;
      wpf.pushUndoSnapshot(); // R4
      if (parsed.value !== undefined) {
        for (const i of targets) {
          if (i < sig.values.length) wpf.writeValue(sig, i, parsed.value);
        }
      } else {
        // 位串循环重复写入（101 → 10110）——v0.3.0 R1 边界规则
        parsed.multi.forEach(function (ch, k) {
          const v = BIT_MAP[ch];
          for (let idx = k; idx < targets.length; idx += parsed.multi.length) {
            const i = targets[idx];
            if (i < sig.values.length) wpf.writeValue(sig, i, v);
          }
        });
      }
      wpf.scheduleRedraw();
      return true;
    }

    // 默认值：命中范围首格的当前显示值
    function defaultInput(sig, indices, isVector) {
      const i = indices[0];
      if (i == null || i >= sig.values.length) return '';
      if (isVector) {
        // 按信号自身进制显示当前值（与波形标签同一实现，避免"弹窗里是 A、画布上是 10"）
        if (typeof wpf.valueLabel === 'function') {
          return wpf.valueLabel(sig.values[i], sig.radix);
        }
        return String(sig.values[i]);
      }
      const v = sig.values[i];
      const text = String(v ?? '');
      return (v === 1 || text === '1') ? '1' : (v === 0 || text === '0') ? '0'
        : (v === -1 || text === 'x') ? 'x' : (v === 2 || text === 'z') ? 'z'
          : (v === 3 || text === 'u') ? 'u' : (v === 4 || text === 'd') ? 'd' : '';
    }

    // ---------------------------------------------------------- 弹窗入口
    function openValuePrompt(sig, indices, invalid) {
      const isVector = !!(window.SignalType && sig.type === window.SignalType.Vector);
      const granLabel = wpf.editGranularity() === 'substep' ? '子步' : '整步';
      const title = isVector ? '矢量值' : '位值';
      const hint = isVector
        ? '输入矢量值或标签：'
        : '输入位值（1/0/x/z，或位串如 1010）：';
      const defVal = defaultInput(sig, indices, isVector);
      showPrompt(title, hint, defVal, granLabel, invalid).then(function (raw) {
        wpf.clearAllMarquees();
        if (raw == null) return; // 取消
        if (applyToRange(sig, indices, raw)) return;
        // R8 非法输入：以红框态重开（用户一敲键盘即恢复正常）
        openValuePrompt(sig, indices, true);
      });
    }

    // ---------------------------------------------------------- 鼠标接管
    // 画笔工具下：
    //  - Ctrl/⌘+拖动 / Vector：切到 select 工具 → editor/selection.js 接管框选
    //    （直驱核心原生 range selection），弹框选工具条（用户要求 Ctrl 框选
    //    完全复用框选模式代码，本模块不再弹窗）。
    //  - Bit 普通拖动：交给 editor/draw.js（TimeGen 绘制，不弹窗）
    //  - Bit 纯点击：弹值输入弹窗（不切工具）
    const sel = {
      active: false, signalIndex: -1, start: -1, end: -1, moved: false,
      x0: 0, y0: 0, ex: 0, ey: 0,
      mode: null // 'native' = Ctrl/Vector 会话（切 select，交给 selection.js）
    };

    // 切换工具（'select'/'paint'）：通过点击工具栏按钮让核心 currentTool 同步。
    // ⚠ 核心工具按钮是「切换」语义：对已激活的按钮再 click 会取消工具（currentTool
    // 变 null），导致后续框选全部失效。因此已处于目标工具时直接返回。
    function switchTool(tool) {
      if (currentTool() === tool) return;
      const sel2 = (tool === 'select') ? '.tool-btn[data-tool="select"]' : '.tool-btn[data-tool="paint"]';
      const b = document.querySelector(sel2);
      if (b) b.click();
    }

    function currentTool() {
      const t = wpf.currentTool();
      return (t === null || t === undefined) ? 'paint' : t;
    }

    function onMouseDown(e) {
      if (promptActive()) return;
      if (e.button !== 0) return;
      if (currentTool() !== 'paint') return;
      if (!canvas || e.target !== canvas) return;
      const m = wpf.mapAt(e.clientX, e.clientY);
      if (!m || m.clickedOnName) return;
      const sigIndex = m.signalIndex;
      if (!(sigIndex >= 0)) return;
      const dw = window.document_wave;
      const sig = dw && dw.m_signals ? dw.m_signals[sigIndex] : null;
      if (!sig || !Array.isArray(sig.values)) return;
      const idx = m.signalSampleIndex;
      if (!(idx >= 0) || idx >= sig.values.length) return;
      const isVector = !!(window.SignalType && sig.type === window.SignalType.Vector);

      sel.active = true;
      sel.moved = false;
      sel.signalIndex = sigIndex;
      sel.start = sel.end = idx;
      sel.x0 = sel.ex = e.clientX;
      sel.y0 = sel.ey = e.clientY;

      if (e.ctrlKey || e.metaKey || isVector) {
        // Ctrl/Vector：切 select 工具，**不拦截** → 核心原生 range selection
        // 接管本次拖动（紫色对齐框选）；editor/selection.js 记录起止并弹批量工具条
        // （用户要求：编辑模式下 Ctrl 框选完全复用框选模式的代码/工具条）。
        sel.mode = 'native';
        switchTool('select');
      } else {
        // Bit 普通按下：不切工具、不拦截 → editor/draw.js 准备 TimeGen 绘制
        sel.mode = null;
      }
    }

    function onMouseMove(e) {
      if (!sel.active || promptActive()) return;
      sel.ex = e.clientX;
      sel.ey = e.clientY;
      if (!sel.moved && (Math.abs(e.clientX - sel.x0) > 4 || Math.abs(e.clientY - sel.y0) > 4)) {
        sel.moved = true;
      }
      // Ctrl/Vector 会话（sel.mode==='native'）已切到 select 工具并放行给
      // editor/selection.js：选框/工具条全部由它驱动，这里不再记录任何选区状态。
      // Bit 非 Ctrl 拖动：放行 editor/draw.js 绘制（不拦截）。
    }

    function onMouseUp(e) {
      if (!sel.active) return;
      const sig = window.document_wave.m_signals[sel.signalIndex];
      const mode = sel.mode;
      sel.active = false;

      if (mode === 'native') {
        // Ctrl/Vector：已切 select 工具，不拦截、不弹窗——
        // editor/selection.js 负责框选并弹批量工具条。
        sel.mode = null;
        return;
      }

      if (sel.moved || currentTool() !== 'paint') {
        // Bit 拖动：editor/draw.js 已绘制，不弹窗；
        // 当前已不是画笔工具（如 select 工具下的点击）也不属于本模块的单击弹窗
        // 场景（交给 editor/selection.js 框选）。防御：残留的 sel 状态在此彻底清理，
        // 避免误弹 #wp-modal（曾导致核心弹窗抑制器放行 → 遮罩挡住后续操作）。
        sel.mode = null;
        return;
      }

      // Bit 纯点击：弹 Bit Value 弹窗（不切工具）
      const lo = Math.min(sel.start, sel.end);
      const hi = Math.max(sel.start, sel.end);
      const indices = [];
      for (let i = lo; i <= hi && i < sig.values.length; i += 1) indices.push(i);
      sel.mode = null;
      if (!indices.length) return;
      openValuePrompt(sig, indices);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', function () {
      sel.active = false;
      sel.mode = null;
    });
  }, 'editor/value-input');
})();
