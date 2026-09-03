// ============================================================================
// WavePaintClean js/core/__core.js —— 官方核心桥接层
// ----------------------------------------------------------------------------
// 背景：解混淆核心 wavepaint.clean.js 的 323 个顶层 function 与核心状态
//（currentTool / isMouseDown / rangeSel* / vectorSelecting …）全部位于全局
// 作用域（已验证浏览器可直接访问）。本文件把它们收敛为带语义的稳定 API
// window.__core.*，供 editor/sim 各模块调用。
//
// 原则：
//   1. editor/*、sim/* 不得再直接抓取核心内部标识符（魔法名），一律经 __core；
//   2. 新增“需要碰核心内部”的能力时，先在此登记语义方法，禁止散落在外；
//   3. 逐步替代历史 hack（合成事件驱动框选 / MutationObserver 抑制弹窗 /
//      原型补丁 valueToLabel 等），替代完成后删除旧实现。
//   4. 本文件依赖核心已执行（顶层标识符存在）；DOM/文档就绪用 __core.ready。
//
// 修改记录：
//   2026-09-02 初版：状态只读快照、selection 原生选框 set/clear、ready。
// ============================================================================
window.__core = window.__core || {};
(function () {
  'use strict';
  const C = window.__core;
  if (C._booted) return;
  C._booted = true;

  // ---------------------------------------------------------------- 就绪
  // 本文件在核心脚本之后加载：核心顶层标识符此时必然已存在（function 声明提升 +
  // 顶层执行完）。文档（document_wave）可能异步导入，各模块自行用 __core.ready
  // 注册“等文档就绪”逻辑，此处仅做简单调度（每 300ms 探测一次 m_signals 非空）。
  const readyCallbacks = [];
  let docReady = false;
  function runCallbacks() {
    readyCallbacks.splice(0).forEach(function (fn) { try { fn(); } catch (e) { console.error('[__core.ready]', e); } });
  }
  function checkDoc() {
    if (docReady) return;
    const dw = window.document_wave;
    if (dw && Array.isArray(dw.m_signals) && dw.m_signals.length) {
      docReady = true;
      runCallbacks();
    }
  }
  let tries = 0;
  const poll = setInterval(function () {
    checkDoc();
    if (docReady || ++tries > 40) clearInterval(poll); // ~12s 上限
  }, 300);
  C.ready = function (fn) {
    if (docReady) { try { fn(); } catch (e) { console.error('[__core.ready]', e); } return; }
    readyCallbacks.push(fn);
    // 轮询放弃（核心 12s 仍无文档）后注册的回调不能静默丢失：降频兜底轮询，
    // 一旦文档就绪仍会执行，并给出可诊断的警告。
    if (tries > 40) {
      console.warn('[__core.ready] 核心文档迟迟未就绪（已注册第 ' + readyCallbacks.length + ' 个等待回调）');
      setInterval(checkDoc, 2000);
    }
  };

  // ---------------------------------------------------------------- 常量
  // Bit 值数字编码（核心 WaveValue 约定）：0=低 1=高 -1=x 2=z 3=u 4=d
  C.Value = Object.freeze({ LOW: 0, HIGH: 1, X: -1, Z: 2, U: 3, D: 4 });
  C.SignalType = window.SignalType || {};
  C.NONE = -1; // 核心的哨兵下标/信号

  // ---------------------------------------------------------------- 状态只读快照
  // 供 editor/sim 读取核心当前交互/选框状态（避免散布魔法名）。
  // ⚠ 核心状态是脚本顶层 let 声明（在全局词法环境，不在 globalThis 对象上），
  // 只能用「直接引用 + try/catch」守卫：某个符号缺失时该位退化 false/NONE，
  // 而不是整个 state() 抛 ReferenceError 不可用。
  function safe(ref, dflt) {
    try { const v = ref(); return v === undefined ? dflt : v; } catch (e) { return dflt; }
  }
  C.state = function () {
    return {
      tool: safe(function () { return currentTool; }, null),
      mouseDown: safe(function () { return !!isMouseDown; }, false),
      draggingObject: safe(function () { return !!isDraggingObject; }, false),
      vectorSelecting: safe(function () { return !!vectorSelecting; }, false),
      range: {
        active: safe(function () { return !!rangeSelActive; }, false),
        selecting: safe(function () { return !!rangeSelecting; }, false),
        startSignal: safe(function () { return rangeSelStartSignal; }, C.NONE),
        startSample: safe(function () { return rangeSelStartSample; }, C.NONE),
        endSignal: safe(function () { return rangeSelEndSignal; }, C.NONE),
        endSample: safe(function () { return rangeSelEndSample; }, C.NONE)
      }
    };
  };

  // ---------------------------------------------------------------- 画布
  C.redraw = function () { if (typeof drawWaveform === 'function') drawWaveform(); };

  // ---------------------------------------------------------------- 弹窗
  // 统一入口：所有输入型弹窗都走核心 #wp-modal（核心已汉化 [PATCH-A2]、
  // 并内置快速录入模式 [PATCH-A5]），外部模块不再自己驱动弹窗 DOM。
  //
  // 用法：__core.prompt({ title, message, value, invalid }) → Promise<string|null>
  //   确定（回车 / 失焦且有值）→ 去空格后的输入串；取消（Esc / X / 遮罩 / 空值失焦）→ null
  //   invalid=true 时以红框态打开，用户一敲键盘即恢复正常（非法输入重开用）
  C.prompt = function (options) {
    const opt = options || {};
    if (typeof wpQuickPrompt !== 'function') return Promise.resolve(null);
    return wpQuickPrompt(
      opt.message || '',
      opt.value == null ? '' : String(opt.value),
      opt.title || 'Input',
      !!opt.invalid,
      typeof opt.onPreview === 'function' ? opt.onPreview : null
    );
  };
  // 弹窗是否打开中（供鼠标/快捷键处理判断是否该让位给弹窗）
  C.promptActive = function () {
    return !!(typeof wpModalState !== 'undefined' && wpModalState && wpModalState.isOpen);
  };

  // ---------------------------------------------------------------- 原生选框驱动
  // 核心 drawRangeSelection 以 rangeSel* + rangeSelActive 为状态源（tool 为 select 时绘制）。
  // 外部直接置状态 + 重绘即可"原生"显示/清除选框 —— 替代历史里伪造 mousedown/up
  // 合成事件驱动框选的做法（已随重构删除的 dispatchAt/dispatchRaw/clearCoreSelection…）。
  C.selection = {
    // 设置一段原生选框并重绘（等效于拖动完成后的核心状态）
    set: function (startSignal, startSample, endSignal, endSample) {
      if (typeof rangeSelActive === 'undefined') return false;
      rangeSelecting = false;
      rangeSelActive = true;
      rangeSelStartSignal = startSignal;
      rangeSelStartSample = startSample;
      rangeSelEndSignal = endSignal;
      rangeSelEndSample = endSample;
      C.redraw();
      return true;
    },
    // 清除选框并重绘（等效于核心 mouseup 单击/点击空白后的清除）
    clear: function () {
      if (typeof rangeSelActive === 'undefined') return false;
      rangeSelActive = false;
      rangeSelecting = false;
      rangeSelStartSignal = C.NONE;
      rangeSelStartSample = C.NONE;
      rangeSelEndSignal = C.NONE;
      rangeSelEndSample = C.NONE;
      C.redraw();
      return true;
    }
  };

  // ---------------------------------------------------------------- 工具
  // 数值对象字面量简写（与核心一致的十六进制源无关，纯粹为外部省去魔法常量）
  C.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
})();
