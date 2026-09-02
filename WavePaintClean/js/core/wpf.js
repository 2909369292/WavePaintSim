// ============================================================================
// WavePaintClean js/core/wpf.js —— 历史共享层 window.__wpf（迁移中）
// ----------------------------------------------------------------------------
// 背景：早期 WavePaintSim 时代由 feature-common.js 提供各 feature-* 模块的公共
// 能力。项目重构（WavePaintClean 主项目 + editor/sim 分层）后本文件保留为
// window.__wpf 共享层，新代码应优先经 window.__core（见 __core.js）。
// 现职责：
//   - 等核心/文档就绪（wpf.ready，与 __core.ready 并存）
//   - 画布坐标/信号行带映射封装（mapAt / signalRowBand / canvas）
//   - 位状态读写（currentBitState / bitStateToValue / setBitState…）
//   - 撤销快照（pushUndoSnapshot，优先委托核心原型实现）
//   - 重绘节流 / 信号元数据同步（scheduleRedraw / syncSignalMeta）
//   - 编辑粒度（editGranularity / writeValue / indicesByGranularity）
//   - 总线进制（busRadix / applyBusRadix / refreshBusLabels / valueLabel…）
//   - 启动侧任务（默认浅色主题、工具栏控件绑定、进制恢复）
// 依赖：解混淆核心 wavepaint.clean.js 暴露的全局（document_wave / SignalType /
//       Radix / drawWaveform / updateSidePanels / mapCanvasPosition / applyTheme）
// 修改记录：
//   2026-09-02 头注释随 Phase-3 收口更新（删除已下沉核心的补丁描述）
// ============================================================================
(function () {
  'use strict';

  const wpf = window.__wpf = window.__wpf || {};

  // ---------------------------------------------------------------- 就绪等待
  // BUG-018：原来核心没起来时会每 100ms 静默重试、永不提示，
  // 表现为「功能全都没生效」却查不到任何线索。这里在 10s 后打一条明确的警告，
  // 并列出缺了哪些全局符号。
  wpf.ready = function (fn, label) {
    let tries = 0;
    function missing() {
      const need = [];
      if (!window.document_wave) need.push('window.document_wave');
      if (typeof window.drawWaveform !== 'function') need.push('window.drawWaveform');
      if (typeof window.updateSidePanels !== 'function') need.push('window.updateSidePanels');
      if (typeof window.mapCanvasPosition !== 'function') need.push('window.mapCanvasPosition');
      return need;
    }
    function attempt() {
      const need = missing();
      if (!need.length) {
        fn();
        return;
      }
      tries += 1;
      if (tries === 100) {
        console.warn('[WavePaintClean] 等待核心就绪超时（10s），'
          + (label ? '模块 ' + label + ' ' : '') + '功能未启用。缺少：' + need.join(', '));
      } else if (tries > 100 && tries % 300 === 0) {
        console.warn('[WavePaintClean] 仍未就绪（' + Math.round(tries / 10) + 's），缺少：' + need.join(', '));
      }
      setTimeout(attempt, 100);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { attempt(); }, { once: true });
    } else {
      attempt();
    }
  };

  // ---------------------------------------------------------------- 画布映射
  wpf.canvas = function () {
    return document.getElementById('wave-canvas');
  };

  // 客户端坐标 → canvas 相对坐标 → mapCanvasPosition 结果
  wpf.mapAt = function (clientX, clientY) {
    const canvas = wpf.canvas();
    if (!canvas || typeof window.mapCanvasPosition !== 'function') return null;
    const rect = canvas.getBoundingClientRect();
    return window.mapCanvasPosition(clientX - rect.left, clientY - rect.top) || null;
  };

  // 探测某个 signalIndex 所在信号行的 y 范围 [top, bottom]（canvas 相对坐标）。
  // 同一信号行在 y 轴上是连续区间，命中判定 y → signalIndex 关于边界单调，
  // 因此用二分定位上下边界，再做少量线性校正（P2-2）。
  // 旧实现是逐像素向上/向下扫描，最坏要调 200+ 次 mapCanvasPosition，
  // 而它在 mousemove 里被高频调用，是拖动绘制卡顿的主要来源。
  wpf.signalRowBand = function (clientX, clientY, signalIndex) {
    const canvas = wpf.canvas();
    if (!canvas || typeof window.mapCanvasPosition !== 'function') return null;
    const rect = canvas.getBoundingClientRect();
    const height = rect.height;
    if (!(height > 0)) return null;
    const x = clientX - rect.left;
    const y0 = clientY - rect.top;

    const hits = function (y) {
      const m = window.mapCanvasPosition(x, y);
      return !!m && Number(m.signalIndex) === signalIndex;
    };
    if (!hits(y0)) return null;

    // 上边界：最小的整数 y 使 hits(y) 成立
    let lo = 0;
    let hi = y0;
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      if (hits(mid)) hi = mid; else lo = mid;
    }
    let top = Math.ceil(lo);
    while (top > 0 && hits(top - 1)) top -= 1;          // 校正非严格单调的布局
    while (top < y0 && !hits(top)) top += 1;

    // 下边界：最大的整数 y 使 hits(y) 成立
    lo = y0;
    hi = height - 1;
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      if (hits(mid)) lo = mid; else hi = mid;
    }
    let bottom = Math.floor(hi);
    while (bottom < height - 1 && hits(bottom + 1)) bottom += 1;
    while (bottom > y0 && !hits(bottom)) bottom -= 1;

    if (bottom < top) return null;
    return { top: top, bottom: bottom, height: bottom - top + 1 };
  };

  // ---------------------------------------------------------------- 位状态
  // 读取位状态选择器当前选中值（'1'/'0'/'z'/'x'/'u'/'d'）
  wpf.currentBitState = function () {
    const active = document.querySelector('.bit-state-option.selected');
    return active ? active.getAttribute('data-state') : '1';
  };

  // 是否处于"自动 0/1 模式"（位状态为 0/1 时，按上下半区自动取值）
  wpf.isAutoBitMode = function () {
    const st = wpf.currentBitState();
    return st === '1' || st === '0';
  };

  // 位状态 → 核心原生 Bit 数字编码（0=低 1=高 -1=x 2=z 3=u 4=d）
  wpf.bitStateToValue = function (state) {
    switch (state) {
      case '0': return 0;
      case '1': return 1;
      case 'z': return 2;
      case 'u': return 3;
      case 'd': return 4;
      default: return -1; // x / 未知
    }
  };

  // 模拟点击位状态选择器（供快捷键使用）
  wpf.setBitState = function (state) {
    const option = document.querySelector('.bit-state-option[data-state="' + state + '"]');
    if (option) option.click();
  };

  // ---------------------------------------------------------------- 工具状态
  // 当前激活工具（'paint'/'erase'/'select'/...；由 .tool-btn.active 的 data-tool 得出）
  wpf.currentTool = function () {
    const btn = document.querySelector('.tool-btn.active[data-tool]');
    return btn ? btn.getAttribute('data-tool') : null;
  };

  // ---------------------------------------------------------------- 撤销快照
  // 向核心撤销栈压入一个全量快照（格式与核心 resize/绘制产生的条目一致），
  // 使扩展模块做的批量修改可以通过核心 Ctrl+Z 撤销。
  //
  // 优先委托给解混淆核心自带的 WaveDocument.prototype.pushUndoSnapshot（P2-3）。
  // 已静态确证其核心实现（早期混淆版 wavepaint.63e6dade.js 偏移 162831 处的等价逻辑）：
  //   push(signals/markers/timeJumps/timeSpanMarkers/arrows/textAnnotations/
  //        sampleCount/subStepCount 的 JSON 深拷贝)
  //   → if (m_undoStack.length > 100) m_undoStack.shift()
  //   → m_redoStack = []
  // 委托的好处：条目格式与核心完全一致（核心以后加字段不会和我们脱节），
  // 而且自带 100 条上限，不会像手写版那样无限增长把内存撑爆。
  wpf.pushUndoSnapshot = function () {
    const dw = window.document_wave;
    if (!dw) return false;

    const proto = Object.getPrototypeOf(dw);
    const corePush = (proto && typeof proto.pushUndoSnapshot === 'function')
      ? proto.pushUndoSnapshot : null;
    if (corePush) {
      try {
        corePush.call(dw);
        return true;
      } catch (e) {
        // 核心签名若将来变动，退回下面的手写实现，不阻断绘制
      }
    }

    // 兜底：手写实现（字段与核心一致）
    if (!Array.isArray(dw.m_undoStack)) return false;
    if (!Array.isArray(dw.m_redoStack)) dw.m_redoStack = [];
    const clone = function (v) {
      if (typeof structuredClone === 'function') {
        try { return structuredClone(v); } catch (e) { /* fall through */ }
      }
      return JSON.parse(JSON.stringify(v || []));
    };
    dw.m_redoStack.length = 0;
    dw.m_undoStack.push({
      signals: clone(dw.m_signals),
      markers: clone(dw.m_markers),
      timeJumps: clone(dw.m_timeJumps),
      timeSpanMarkers: clone(dw.m_timeSpanMarkers),
      arrows: clone(dw.m_arrows),
      textAnnotations: clone(dw.m_textAnnotations),
      sampleCount: dw.m_sampleCount,
      subStepCount: dw.m_subStepCount
    });
    // 与核心对齐的 100 条上限
    while (dw.m_undoStack.length > 100) dw.m_undoStack.shift();
    return true;
  };

  // ---------------------------------------------------------------- 元数据同步
  // 将信号的相关数组同步到 newLen 长度（核心 resize 同步这些数组）
  wpf.syncSignalMeta = function (sig, newLen) {
    const fit = function (arr, fill) {
      const src = Array.isArray(arr) ? arr : [];
      const out = src.slice(0, newLen);
      while (out.length < newLen) out.push(typeof fill === 'function' ? fill() : fill);
      return out;
    };
    sig.labels = fit(sig.labels, '');
    sig.segmentStyles = fit(sig.segmentStyles, function () { return { color: null, hatched: false, fill: null }; });
    sig.driveStrengths = fit(sig.driveStrengths, 0);
    sig.clockMarkers = fit(sig.clockMarkers, false);
    sig.waveDromColorCodes = fit(sig.waveDromColorCodes, null);
  };

  // ---------------------------------------------------------------- 重绘节流
  let rafId = 0;
  wpf.scheduleRedraw = function () {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      if (typeof window.drawWaveform === 'function') window.drawWaveform();
      if (typeof window.updateSidePanels === 'function') window.updateSidePanels();
    });
  };

  // ---------------------------------------------------------------- 小工具
  wpf.clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };

  // ---------------------------------------------------------------- 编辑粒度
  // step: 一次写入整个主步；substep: 仅写入单个子步
  wpf.editGranularity = function () {
    const value = localStorage.getItem('wpf.editGranularity') || 'step';
    return value === 'substep' ? 'substep' : 'step';
  };
  wpf.setEditGranularity = function (value) {
    localStorage.setItem('wpf.editGranularity', value === 'substep' ? 'substep' : 'step');
    wpf.syncGranularityUI();
    wpf.scheduleRedraw();
  };

  // 把 localStorage 里的粒度值回写到工具栏分段控件的 .active 状态
  wpf.syncGranularityUI = function () {
    const box = document.getElementById('granularity-toggle');
    if (!box) return;
    const current = wpf.editGranularity();
    const btns = box.querySelectorAll('.gran-btn');
    for (let i = 0; i < btns.length; i += 1) {
      const on = btns[i].getAttribute('data-gran') === current;
      btns[i].classList.toggle('active', on);
    }
  };

  // 绑定工具栏「编辑力度」分段控件（index.html #granularity-toggle）
  // 注意：用捕获阶段监听并 stopImmediatePropagation，避免与主界面的
  // 空白处"取消工具选择"逻辑打架；控件本身在 toolbar 内而非画布，影响很小。
  wpf.bindGranularityUI = function () {
    const box = document.getElementById('granularity-toggle');
    if (!box || box.dataset.wpfBound === '1') return;
    box.dataset.wpfBound = '1';
    box.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('.gran-btn') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      wpf.setEditGranularity(btn.getAttribute('data-gran'));
    });
    wpf.syncGranularityUI();
  };

  // ---------------------------------------------------------------- 总线进制
  // F9：核心已暴露 window.Radix = { Hexadecimal:0, Decimal:1, Binary:2 }，
  // 以及 WaveDocument.prototype.valueToLabel(value, radix)（信号自带 radix 字段）。
  // 核心属性面板里其实已有进制切换，但入口很深；这里在工具栏做一个全局开关，
  // 一次作用到所有矢量信号：改 radix + 用 valueToLabel 重算 labels。
  const BUS_RADIX_KEY = 'wpf.busRadix';
  wpf.busRadix = function () {
    const v = localStorage.getItem(BUS_RADIX_KEY);
    return (v === 'hex' || v === 'bin' || v === 'dec') ? v : 'dec';
  };
  // 'dec'|'hex'|'bin' → window.Radix 的数字枚举
  wpf.busRadixValue = function () {
    const name = wpf.busRadix();
    const r = window.Radix;
    if (r && typeof r.Hexadecimal === 'number') {
      if (name === 'hex') return r.Hexadecimal;
      if (name === 'bin') return r.Binary;
      return r.Decimal;
    }
    return name === 'hex' ? 0 : name === 'bin' ? 2 : 1; // 兜底（与核心枚举一致）
  };
  // Radix 枚举值 → 进制名（'hex'|'bin'|'dec'）
  wpf.radixNameOf = function (radixValue) {
    const r = window.Radix;
    if (r && typeof r.Hexadecimal === 'number') {
      if (radixValue === r.Hexadecimal) return 'hex';
      if (radixValue === r.Binary) return 'bin';
      if (radixValue === r.Decimal) return 'dec';
      return null;
    }
    if (radixValue === 0) return 'hex';
    if (radixValue === 2) return 'bin';
    if (radixValue === 1) return 'dec';
    return null;
  };

  // 值 → 显示标签（唯一实现在核心 [PATCH-A3] 的 valueToLabel）。
  // radix 缺省时用全局进制；传数字枚举则按该进制（单信号自身进制）。
  // 所有显示路径（波形标签 / 弹窗默认值 / 核心自己重算）都经此一处，口径天然一致。
  wpf.valueLabel = function (value, radix) {
    const dw = window.document_wave;
    const r = (radix == null) ? wpf.busRadixValue() : radix;
    if (dw && typeof dw.valueToLabel === 'function') {
      try {
        return String(dw.valueToLabel(value, r)).replace(/^0[xXbB]/, '');
      } catch (e) { /* 落到下面的兜底 */ }
    }
    return String(value ?? '');
  };

  // 按「信号自身 radix」重算单个矢量信号的全部标签；返回 1 表示处理过。
  // 信号没记 radix 时才退回全局进制 —— 全局开关与单信号右键切换互不干扰。
  wpf.refreshBusLabels = function (sig) {
    if (!sig || !Array.isArray(sig.values) || !Array.isArray(sig.labels)) return 0;
    const width = Math.max(1, Number(sig.width) || 1);
    const radix = (sig.radix == null) ? wpf.busRadixValue() : sig.radix;
    for (let k = 0; k < sig.values.length && k < sig.labels.length; k += 1) {
      sig.labels[k] = width > 1 ? wpf.valueLabel(sig.values[k], radix) : '';
    }
    return 1;
  };

  // 把当前进制写到所有矢量信号并重算标签；返回命中的矢量信号数
  wpf.applyBusRadix = function () {
    const dw = window.document_wave;
    if (!dw || !Array.isArray(dw.m_signals) || !window.SignalType) return 0;
    const radix = wpf.busRadixValue();
    let count = 0;
    for (let i = 0; i < dw.m_signals.length; i += 1) {
      const sig = dw.m_signals[i];
      if (!sig || sig.type !== window.SignalType.Vector) continue;
      sig.radix = radix;
      wpf.refreshBusLabels(sig);
      count += 1;
    }
    return count;
  };
  // 只改单个信号的进制（总线右键菜单用），name 为 'dec'|'hex'|'bin'。
  // 不改动全局默认进制，也不影响其他信号。
  wpf.setSignalRadix = function (sig, name) {
    if (!sig || !window.SignalType || sig.type !== window.SignalType.Vector) return false;
    const r = window.Radix;
    const value = (r && typeof r.Hexadecimal === 'number')
      ? (name === 'hex' ? r.Hexadecimal : name === 'bin' ? r.Binary : r.Decimal)
      : (name === 'hex' ? 0 : name === 'bin' ? 2 : 1);
    wpf.pushUndoSnapshot();
    sig.radix = value;
    wpf.refreshBusLabels(sig);
    wpf.scheduleRedraw();
    return true;
  };
  wpf.setBusRadix = function (name) {
    localStorage.setItem(BUS_RADIX_KEY, (name === 'hex' || name === 'bin') ? name : 'dec');
    wpf.syncBusRadixUI();
    wpf.applyBusRadix();
    wpf.scheduleRedraw();
  };
  wpf.syncBusRadixUI = function () {
    const box = document.getElementById('bus-radix-toggle');
    if (!box) return;
    const current = wpf.busRadix();
    const btns = box.querySelectorAll('.gran-btn');
    for (let i = 0; i < btns.length; i += 1) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-radix') === current);
    }
  };
  wpf.bindBusRadixUI = function () {
    const box = document.getElementById('bus-radix-toggle');
    if (!box || box.dataset.wpfBound === '1') return;
    box.dataset.wpfBound = '1';
    box.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('.gran-btn') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      wpf.setBusRadix(btn.getAttribute('data-radix'));
    });
    wpf.syncBusRadixUI();
  };

  // ---------------------------------------------------------------- 子步数
  // 返回画布子步数（>=0），与数据模型 m_subStepCount 一致
  wpf.subSteps = function () {
    const dw = window.document_wave;
    return Math.max(0, Number(dw && dw.m_subStepCount) || 0);
  };

  // stride = 每主步占的下标数（子步数 + 1）
  wpf.stride = function () {
    return Math.max(1, wpf.subSteps() + 1);
  };

  // 按当前编辑粒度写入一个值，并清掉对应格子的时钟标记。
  //   step（默认）：写入该主步的全部 stride 个下标 —— 与仿真采样口径一致，
  //                 避免"画在子步下标导致 readWaveDocument 采不到 → 结果恒 0"。
  //   substep      ：只写入命中的那一个下标（用于画时钟沿等精细场景）。
  // editor/draw.js（鼠标）与 editor/shortcuts.js（方向键）共用，保证两处行为一致。
  wpf.writeValue = function (sig, sampleIndex, value) {
    if (!sig || !Array.isArray(sig.values)) return false;
    if (!(sampleIndex >= 0) || sampleIndex >= sig.values.length) return false;

    if (wpf.editGranularity() === 'substep') {
      sig.values[sampleIndex] = value;
      if (Array.isArray(sig.clockMarkers) && sampleIndex < sig.clockMarkers.length) {
        sig.clockMarkers[sampleIndex] = false;
      }
      return true;
    }

    const stride = wpf.stride();
    const start = Math.floor(sampleIndex / stride) * stride;
    const end = Math.min(start + stride - 1, sig.values.length - 1);
    for (let i = start; i <= end; i += 1) sig.values[i] = value;
    if (Array.isArray(sig.clockMarkers)) {
      const cEnd = Math.min(start + stride - 1, sig.clockMarkers.length - 1);
      for (let i = start; i <= cEnd; i += 1) sig.clockMarkers[i] = false;
    }
    return true;
  };

  // 弹窗关闭时清掉 editor/selection.js 历史残留的自绘 marquee overlay（wpf-select-overlay）。
  // 原生框选由核心绘制，这里只负责清我们以前可能残留的图层。
  wpf.clearAllMarquees = function () {
    const selOv = document.getElementById('wpf-select-overlay');
    if (selOv) {
      const ctx = selOv.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, selOv.width, selOv.height);
    }
  };

  // 按当前编辑粒度把「目标下标列表」收敛为实际要写入的下标：
  //   'step'   ：每个主步只留首格（writeValue 会铺满整个主步的 stride 格）
  //   'substep'：原样返回（每个下标单独写）
  // 供框选/值输入等批量写入路径使用（v0.3.0 R2：写入粒度跟随顶部整步/子步开关）。
  wpf.indicesByGranularity = function (indices, stride) {
    const s = Math.max(1, Number(stride) || wpf.stride());
    if (wpf.editGranularity() !== 'substep') {
      const seen = new Set();
      const out = [];
      for (const i of indices) {
        const step = Math.floor(i / s);
        if (seen.has(step)) continue;
        seen.add(step);
        out.push(step * s);
      }
      return out.sort(function (a, b) { return a - b; });
    }
    return Array.isArray(indices) ? indices.slice() : [];
  };

  // ------------------------------------------------- 默认浅色主题
  // 核心默认深色主题（body.dark）。这里在启动阶段切回浅色，但只做一次：
  // 之后用户通过「主题」菜单的选择一律尊重（核心的 applyTheme 会自行持久化）。
  const THEME_FLAG = 'wpf.defaultLightThemeApplied';
  const flagStore = {
    get: function () { try { return localStorage.getItem(THEME_FLAG); } catch (e) { return null; } },
    set: function () { try { localStorage.setItem(THEME_FLAG, '1'); } catch (e) { /* 无痕模式忽略 */ } }
  };

  // 返回 true 表示已处理完毕（成功切浅色 / 本就是浅色 / 以前处理过），可以停止观察
  function applyDefaultLightTheme() {
    if (flagStore.get()) return true;
    if (!document.body) return false;
    if (!document.body.classList.contains('dark')) {
      flagStore.set(); // 本来就是浅色，记下即可，不必改动
      return true;
    }
    // 优先走核心自己的 API，保证 body class 与核心持久化的主题状态一致
    if (typeof window.applyTheme === 'function') window.applyTheme('light');
    else document.body.classList.remove('dark');
    flagStore.set();
    return true;
  }

  // 核心的主题初始化是异步的，可能在我们之后又把 dark 加回来，故观察一小段窗口
  function ensureDefaultLightTheme() {
    if (applyDefaultLightTheme()) return;
    if (typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver(function () {
      if (applyDefaultLightTheme()) observer.disconnect();
    });
    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
    setTimeout(function () { observer.disconnect(); }, 10000);
  }

  // ------------------------------------------------- 工具栏「编辑力度」初始化
  // 只依赖 DOM，不必等核心就绪，故单独在 DOMContentLoaded 后绑定一次。
  function bindToolbarWhenReady() {
    try { ensureDefaultLightTheme(); } catch (e) { /* 忽略：主题失败不影响使用 */ }
    try { wpf.bindGranularityUI(); } catch (e) { /* 忽略：控件缺失不影响绘图 */ }
    try { wpf.bindBusRadixUI(); } catch (e) { /* 同上 */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToolbarWhenReady, { once: true });
  } else {
    bindToolbarWhenReady();
  }

  // 启动时把记住的总线进制应用一次。只做「启动一次」，不做持续同步 ——
  // 否则会覆盖用户稍后通过核心属性面板给单个信号设的进制。
  wpf.ready(function () {
    let tries = 0;
    (function attempt() {
      const n = wpf.applyBusRadix();
      tries += 1;
      // 文档是异步载入/导入的，多试几次直到出现矢量信号（或放弃）
      if (n === 0 && tries < 6) { setTimeout(attempt, 400); return; }
      if (n > 0) wpf.scheduleRedraw();
    })();
    // （历史）曾用 MutationObserver 抑制框选 Vector 后核心自弹的「Vector Value」弹窗。
    // 解混淆后 editor/selection.js 直接驱动 __core.selection 且拦截真实鼠标事件，
    // 核心不再自行弹窗，此抑制逻辑已删除。
  }, 'bus-radix');

  // ------------------------------------------------- 总线进制右键菜单（需求 7.6）
  // ★ 已放弃「自绘菜单 / 注入菜单」两个方案（用户实测否决）：
  //   自绘 → 与核心菜单并存；注入 → 分隔线风格不符、二次右键闪烁、
  //   且核心右键菜单**本身就自带进制转换项**，注入属于重复冲突。
  //   最终方案：直接用核心自带的右键进制项，本模块只保证转换结果的正确性 ——
  //   即核心 [PATCH-A3] 的 valueToLabel（同时支持位串与数字、无 0x/0b 前缀）
  //   + refreshBusLabels（按信号自身 radix 重算）。
  //   setSignalRadix 仍保留供编程调用，但不再挂任何 UI。
})();
