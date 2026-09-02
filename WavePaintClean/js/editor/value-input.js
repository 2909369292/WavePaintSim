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
// 依赖：core/wpf.js（window.__wpf）、sim/project-model.js（window.__wpfVec）
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
    function parseVectorValue(raw, width) {
      const w = Math.max(1, width || 1);
      const mod = window.__wpfVec;
      if (mod && typeof mod.normalizeVectorValue === 'function') {
        try { return mod.normalizeVectorValue(raw, w); } catch (e) { /* 回退 */ }
      }
      // 本地回退（与 feature-select 的 parseBusInput 一致）
      const text = String(raw == null ? '' : raw).trim().toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
      if (!text) return null;
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
      if (!bits) return null;
      if (bits.length >= w) return bits.slice(-w);
      const fill = (bits[0] === 'x' || bits[0] === 'z') ? bits[0] : '0';
      return bits.padStart(w, fill);
    }
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
    // 对目标下标列表按粒度写入一个值（Vector 位串 / Bit 单值或位串循环）。
    // 返回 true=成功写入，false=输入非法。
    function applyToRange(sig, indices, raw) {
      const isVector = !!(window.SignalType && sig.type === window.SignalType.Vector);
      const targets = wpf.indicesByGranularity(indices, wpf.stride());
      if (isVector) {
        const bits = parseVectorValue(raw, vectorWidth(sig));
        if (bits == null) return false;
        wpf.pushUndoSnapshot(); // R4
        for (const i of targets) {
          if (i < sig.values.length) wpf.writeValue(sig, i, bits);
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
        // 接管本次拖动（紫色对齐框选）；feature-select 记录起止并弹批量工具条
        // （用户要求：编辑模式下 Ctrl 框选完全复用框选模式的代码/工具条）。
        sel.mode = 'native';
        switchTool('select');
      } else {
        // Bit 普通按下：不切工具、不拦截 → feature-draw 准备 TimeGen 绘制
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
      if (sel.mode === 'native' && sel.moved) {
        // 原生会话：放行核心更新框选；只记录 end 供弹窗换算范围
        const m = wpf.mapAt(e.clientX, e.clientY);
        if (!m) return;
        if (m.signalIndex === sel.signalIndex) {
          sel.end = m.signalSampleIndex;
        } else if (m.mainStep >= 0) {
          sel.end = Math.max(0, Number(m.mainStep)) * wpf.stride();
        }
      }
      // Bit 非 Ctrl 拖动：放行 feature-draw 绘制（不拦截）
    }

    function onMouseUp(e) {
      if (!sel.active) return;
      const sig = window.document_wave.m_signals[sel.signalIndex];
      const mode = sel.mode;
      sel.active = false;

      if (mode === 'native') {
        // Ctrl/Vector：已切 select 工具，不拦截、不弹窗——
        // feature-select 负责框选并弹批量工具条。
        sel.mode = null;
        return;
      }

      if (sel.moved || currentTool() !== 'paint') {
        // Bit 拖动：feature-draw 已绘制，不弹窗；
        // 当前已不是画笔工具（如 select 工具下的点击）也不属于本模块的单击弹窗
        // 场景（交给 feature-select 框选）。防御：残留的 sel 状态在此彻底清理，
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
  }, 'feature-value-edit');
})();
