// ============================================================================
// WavePaintSim feature-value-edit.js —— 值输入编辑（v0.3.0 R1/R2/R3/R4/R5）
// ----------------------------------------------------------------------------
// 需求来源：docs/功能需求_框选与总线编辑_v0.3.0.md
//  R1  Bit 信号获得「总线式」值输入编辑（点击弹 Bit Value 弹窗）
//  R2  所有「选择→输入值」写入遵循顶部「整步/子步」开关
//     ① 接管核心「Vector Value」弹窗（画笔下点击 Vector 格），按粒度写入
//     ② feature-select 框选输入值（已在 feature-select.js 内改造）
//  R3  交互统一：复用核心 #wp-modal 弹窗 DOM（wpPrompt 未暴露，自建驱动）
//  R4  写入前 pushUndoSnapshot，Ctrl+Z 整体回退
//  R5  与 TimeGen 绘制（feature-draw）互不冲突：
//      - 普通拖动 = 绘制（交给 feature-draw）
//      - Ctrl/⌘+拖动 = 框选（本模块接管）
//      - 单击 Bit / Vector 波形格 = 弹窗（Vector 拦截核心弹窗）
//      - 输入框内按键 stopPropagation，不误触全局快捷键
// 依赖：feature-common.js（wpf.*）、model.js（window.__wpfVec）、混淆核心全局 API
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureValueEdit) return;
  window.__wpfFeatureValueEdit = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    const canvas = wpf.canvas();

    // ---------------------------------------------------------------- 弹窗
    // 复用核心 #wp-modal DOM（index.html 已存在），自己驱动显示/隐藏与回调。
    // 返回 Promise<string|null>：确定→输入串；取消/关闭/点遮罩→null。
    let promptActive = false;
    let promptOk = false;
    function showPrompt(title, message, defaultValue, subtitle) {
      return new Promise(function (resolve) {
        const overlay = document.getElementById('wp-modal-overlay');
        const titleEl = document.getElementById('wp-modal-title');
        const msgEl = document.getElementById('wp-modal-message');
        const inputEl = document.getElementById('wp-modal-input');
        const okBtn = document.getElementById('wp-modal-ok');
        const cancelBtn = document.getElementById('wp-modal-cancel');
        const closeBtn = document.getElementById('wp-modal-close');
        if (!overlay || !inputEl || !okBtn) { resolve(null); return; }
        promptActive = true;
        promptOk = false;
        titleEl.textContent = title;
        msgEl.textContent = message + (subtitle ? '\n（当前粒度：' + subtitle + '）' : '');
        inputEl.value = String(defaultValue == null ? '' : defaultValue);
        inputEl.classList.remove('wp-modal-error');
        overlay.classList.remove('hidden');
        inputEl.focus();
        inputEl.select();
        function finish(val) {
          cleanup();
          resolve(val);
        }
        function cleanup() {
          promptActive = false;
          overlay.classList.add('hidden');
          inputEl.removeEventListener('keydown', onKey, true);
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          closeBtn.removeEventListener('click', onClose);
          overlay.removeEventListener('mousedown', onOverlayDown, true);
        }
        function onKey(e) {
          e.stopPropagation(); // R5：输入框内按键不触发全局快捷键
          if (e.key === 'Enter') { e.preventDefault(); onOk(); }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }
        function onOk() { finish(inputEl.value); }
        function onCancel() { finish(null); }
        function onClose() { finish(null); }
        function onOverlayDown(e) { if (e.target === overlay) finish(null); }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onClose);
        inputEl.addEventListener('keydown', onKey, true);
        overlay.addEventListener('mousedown', onOverlayDown, true);
      });
    }

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
        if (typeof wpf.busRadixLabel === 'function') {
          return wpf.busRadixLabel(sig.values[i], vectorWidth(sig));
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
    function openValuePrompt(sig, indices) {
      const isVector = !!(window.SignalType && sig.type === window.SignalType.Vector);
      const granLabel = wpf.editGranularity() === 'substep' ? '子步' : '整步';
      const title = isVector ? 'Vector Value' : 'Bit Value';
      const hint = isVector
        ? 'Enter vector value or label:'
        : 'Enter bit value (1/0/x/z, 或位串如 1010):';
      const defVal = defaultInput(sig, indices, isVector);
      showPrompt(title, hint, defVal, granLabel).then(function (raw) {
        // 弹窗关闭：结束原生会话（feature-select 恢复批量工具条）、切回画笔工具
        if (sel.mode === 'native') {
          wpf.nativeRangeSession.active = false;
          switchTool('paint');
        }
        sel.mode = null;
        wpf.clearAllMarquees();
        if (raw == null) return; // 取消
        if (applyToRange(sig, indices, raw)) return;
        // R8 非法输入：红框 + 重开
        const inputEl = document.getElementById('wp-modal-input');
        if (inputEl) inputEl.classList.add('wp-modal-error');
        openValuePrompt(sig, indices);
      });
    }

    // ---------------------------------------------------------- 鼠标接管
    // 画笔工具下：
    //  - Ctrl/⌘+拖动 / Vector：切到 select 工具 → 混淆核心的 select 工具启动
    //    **原生 range selection**（紫色对齐框选，用户明确要求完全复用原生，不自绘）。
    //    mouseup 后本模块弹值输入弹窗（用 nativeRangeSession 标志让 feature-select
    //    不弹批量工具条）；弹窗关闭后切回画笔工具。
    //  - Bit 普通拖动：交给 feature-draw（TimeGen 绘制，不弹窗）
    //  - Bit 纯点击：弹 Bit Value 弹窗（不切工具）
    const sel = {
      active: false, signalIndex: -1, start: -1, end: -1, moved: false,
      x0: 0, y0: 0, ex: 0, ey: 0,
      mode: null // 'native' = Ctrl/Vector 会话（切 select，原生框选）
    };

    // 切换工具（'select'/'paint'）：通过点击工具栏按钮让核心 currentTool 同步
    function switchTool(tool) {
      const sel2 = (tool === 'select') ? '.tool-btn[data-tool="select"]' : '.tool-btn[data-tool="paint"]';
      const b = document.querySelector(sel2);
      if (b) b.click();
    }

    function currentTool() {
      const t = wpf.currentTool();
      return (t === null || t === undefined) ? 'paint' : t;
    }

    function onMouseDown(e) {
      if (promptActive) return;
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
        // 接管本次拖动（紫色对齐框选）；feature-select 同步记录起止、不弹工具条。
        sel.mode = 'native';
        wpf.nativeRangeSession.active = true;
        switchTool('select');
      } else {
        // Bit 普通按下：不切工具、不拦截 → feature-draw 准备 TimeGen 绘制
        sel.mode = null;
      }
    }

    function onMouseMove(e) {
      if (!sel.active || promptActive) return;
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
      const wantPopup = (mode === 'native') || !sel.moved;
      sel.active = false;

      if (!wantPopup) {
        // Bit 拖动：feature-draw 已绘制，不弹窗
        sel.mode = null;
        return;
      }

      // 不拦截：让核心完成 mouseup（结束原生 range selection 并保留高亮）。
      // nativeRangeSession.active 会让 feature-select 跳过批量工具条。
      // 等核心处理完再弹窗（setTimeout 0），保证画布高亮就绪。
      const x0c = sel.x0, x1c = e.clientX;
      const y0c = sel.y0, y1c = e.clientY;
      const midY = (y0c + y1c) / 2;
      const m0 = wpf.mapAt(x0c, midY);
      const m1 = wpf.mapAt(x1c, midY);
      let lo, hi;
      if (m0 && m1 && m0.signalIndex === sel.signalIndex && m1.signalIndex === sel.signalIndex) {
        lo = Math.min(Number(m0.signalSampleIndex), Number(m1.signalSampleIndex));
        hi = Math.max(Number(m0.signalSampleIndex), Number(m1.signalSampleIndex));
      } else {
        lo = sel.start; hi = sel.end;
      }
      const indices = [];
      for (let i = lo; i <= hi && i < sig.values.length; i += 1) indices.push(i);
      if (!indices.length) {
        if (mode === 'native') {
          wpf.nativeRangeSession.active = false;
          switchTool('paint');
        }
        sel.mode = null;
        return;
      }
      setTimeout(function () { openValuePrompt(sig, indices); }, 0);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', function () {
      sel.active = false;
      if (sel.mode === 'native') {
        wpf.nativeRangeSession.active = false;
      }
      sel.mode = null;
    });
  }, 'feature-value-edit');
})();
