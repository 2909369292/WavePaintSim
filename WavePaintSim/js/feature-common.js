// ============================================================================
// WavePaintSim feature-common.js —— 新增功能模块的共享工具集
// ----------------------------------------------------------------------------
// 功能说明：
//   为 feature-*.js 系列模块提供公共能力，避免各模块重复实现：
//   - window.__wpf 全局命名空间（模块间通信：光标、选区、剪贴板等）
//   - 等 WavePaint 混淆核心就绪（ready/init 模板）
//   - 画布坐标映射封装（mapCanvasPosition 的 canvas 相对坐标包装）
//   - 位状态读取/写入（自动 0/1 模式判定、固定值映射）
//   - 信号行高探测（用于"上半画 1 / 下半画 0"）
//   - 撤销栈快照（与原版 m_undoStack 条目格式一致）
//   - 重绘节流（requestAnimationFrame）
//   - 信号元数据数组同步（resize 时保持长度一致）
// 依赖：混淆核心暴露的 window.document_wave / Signal / SignalType /
//       drawWaveform / updateSidePanels / mapCanvasPosition
// 修改记录：
//   2026-08-30 初版（对应 docs/绘图功能实施规格.md F2~F10 公共部分）
//   2026-08-30 新增 stride()/writeValue()，统一鼠标与方向键的粒度写入口径
//   2026-08-30 P1-2 编辑力度 UI 绑定（syncGranularityUI / bindGranularityUI）
//   2026-08-30 P2-2 signalRowBand 改二分查找（逐像素扫描 → ~10 次探测）
//   2026-08-30 P2-3 pushUndoSnapshot 优先委托核心 WaveDocument.prototype 版
//   2026-08-30 P3-4 wpf.ready() 就绪超时改为明确告警（原来是静默无限重试）
//   2026-08-30 P3-5 F9 总线进制切换（工具栏 Hex/Dec/Bin + 启动恢复 + labels 重算）
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
        console.warn('[WavePaintSim] 等待混淆核心就绪超时（10s），'
          + (label ? '模块 ' + label + ' ' : '') + '功能未启用。缺少：' + need.join(', '));
      } else if (tries > 100 && tries % 300 === 0) {
        console.warn('[WavePaintSim] 仍未就绪（' + Math.round(tries / 10) + 's），缺少：' + need.join(', '));
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

  // 位状态 → 原版 Bit 数字编码（0=低 1=高 -1=x 2=z 3=u 4=d）
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
  // 向原版撤销栈压入一个全量快照（格式与原版 resize/绘制产生的条目一致），
  // 使 feature 模块做的批量修改可以通过原版 Ctrl+Z 撤销。
  //
  // 优先委托给混淆核心自带的 WaveDocument.prototype.pushUndoSnapshot（P2-3）。
  // 已静态确证其核心实现（wavepaint.63e6dade.js 偏移 162831 处）：
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
  // 将信号的相关数组同步到 newLen 长度（原版 resize 同步这些数组）
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

  // ---------------------------------------------------------------- 子步数
  // 返回画布子步数（>=0），与数据模型 m_subStepCount 一致
  wpf.subSteps = function () {
    const dw = window.document_wave;
    return Math.max(0, Number(dw && dw.m_subStepCount) || 0);
  };

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

  // 本地进制换算（与 model.js 的 formatVectorValue 等价）。
  // ⚠ 不依赖 ESM 是否加载成功：此前若 model.js 模块加载失败，标签会退回核心的坏实现
  //   （位串原样输出 / 带 0x 前缀），造成「切了进制但显示不变」。内联后永不再发生。
  function localFormatVector(value, width, name) {
    const w = Math.max(1, Number(width) || 1);
    const text = String(value ?? '').trim().toLowerCase();
    let bits;
    if (/^[01xz]+$/.test(text)) {
      bits = text.length >= w ? text.slice(-w)
        : text.padStart(w, (text[0] === 'x' || text[0] === 'z') ? text[0] : '0');
    } else if (/^[+-]?\d+$/.test(text)) {
      try {
        let n = BigInt(text);
        if (n < 0n) n += (1n << BigInt(w));
        bits = (n & ((1n << BigInt(w)) - 1n)).toString(2).padStart(w, '0');
      } catch (e) { bits = '0'.repeat(w); }
    } else {
      bits = '0'.repeat(w);
    }
    if (/[xz]/.test(bits)) return bits.includes('z') && !bits.includes('x') ? 'Z' : 'X';
    if (w <= 1) return bits;
    if (name === 'binary') return bits;
    try {
      const num = BigInt('0b' + bits);
      if (name === 'decimal') return num.toString(10);
      return num.toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0');
    } catch (e) { return bits; }
  }

  // 标签格式化（单个矢量值 → 显示文本）。
  // ⚠ 不能用核心的 valueToLabel：它假定 value 是数字，而矢量信号存的是字符串位串
  //   （如 "0011"）——字符串的 toString(radix) 会忽略参数原样返回，
  //   于是十进制显示成 "0011"、十六进制还多出 "0x" 前缀。
  // radixName：可选覆盖（'hex'|'bin'|'dec'）。按「信号自身进制」重算时必须传，
  // 否则一律退回全局进制 —— 这正是此前「右键切换单个信号进制不生效」的原因。
  wpf.busRadixLabel = function (value, width, radixName) {
    const name = radixName || wpf.busRadix();
    const fmtName = name === 'hex' ? 'hexadecimal' : name === 'bin' ? 'binary' : 'decimal';
    let label = null;
    const mod = window.__wpfVec;
    if (mod && typeof mod.formatVectorValue === 'function') {
      try { label = mod.formatVectorValue(value, width, fmtName); } catch (e) { label = null; }
    }
    if (label == null) label = localFormatVector(value, width, fmtName);
    return String(label).replace(/^0[xXbB]/, '');
  };

  // 按「信号自身 radix」重算单个矢量信号的全部标签；返回 1 表示处理过。
  // 信号没记 radix 时才退回全局进制 —— 全局开关与单信号右键切换互不干扰。
  wpf.refreshBusLabels = function (sig) {
    if (!sig || !Array.isArray(sig.values) || !Array.isArray(sig.labels)) return 0;
    const width = Math.max(1, Number(sig.width) || 1);
    const name = wpf.radixNameOf(sig.radix) || wpf.busRadix();
    for (let k = 0; k < sig.values.length && k < sig.labels.length; k += 1) {
      sig.labels[k] = width > 1 ? wpf.busRadixLabel(sig.values[k], width, name) : '';
    }
    return 1;
  };

  // 修补核心 valueToLabel：位串按位宽正确换算并去前缀。
  // 无论标签最终由我们（refreshBusLabels）还是核心自己重算，显示都正确。
  wpf.patchCoreValueToLabel = function () {
    const dw = window.document_wave;
    if (!dw) return false;
    const patched = function (value, radix) {
      if (value === -1 || value === '-1') return 'X';
      const text = String(value ?? '').trim();
      if (/^[01xz]+$/i.test(text) && text.length > 1) {
        return wpf.busRadixLabel(text, text.length, wpf.radixNameOf(radix) || undefined);
      }
      return text;
    };
    try { dw.valueToLabel = patched; } catch (e) { /* 忽略 */ }
    // 原型链也要补：核心内部可能通过原型方法调用（window.WaveDocument 不一定暴露）。
    // 沿原型链把所有 valueToLabel 都换掉，覆盖「实例方法 / 原型方法」两种调用方式。
    let proto = Object.getPrototypeOf(dw);
    while (proto && proto !== Object.prototype) {
      if (typeof proto.valueToLabel === 'function') { try { proto.valueToLabel = patched; } catch (e2) { /* 忽略 */ } }
      proto = Object.getPrototypeOf(proto);
    }
    const P = window.WaveDocument && window.WaveDocument.prototype;
    if (P && typeof P.valueToLabel === 'function') { try { P.valueToLabel = patched; } catch (e3) { /* 忽略 */ } }
    return true;
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

  // stride = 每主步占的下标数（子步数 + 1）
  wpf.stride = function () {
    return Math.max(1, wpf.subSteps() + 1);
  };

  // 按当前编辑粒度写入一个值，并清掉对应格子的时钟标记。
  //   step（默认）：写入该主步的全部 stride 个下标 —— 与仿真采样口径一致，
  //                 避免"画在子步下标导致 readWaveDocument 采不到 → 结果恒 0"。
  //   substep      ：只写入命中的那一个下标（用于画时钟沿等精细场景）。
  // feature-draw（鼠标）与 feature-shortcuts（方向键）共用，保证两处行为一致。
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

  // 在指定父元素后插入节点（index.html 不便逐个改动菜单时的辅助）
  wpf.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'style') node.style.cssText = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  };

  // ------------------------------------------------- 默认浅色主题
  // 混淆核心首次启动会带上深色主题（body.dark）。这里在启动阶段切回浅色，但只做一次：
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
  // 只依赖 DOM，不必等混淆核心就绪，故单独在 DOMContentLoaded 后绑定一次。
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
      wpf.patchCoreValueToLabel(); // 幂等：核心文档就绪后立即打上 valueToLabel 补丁
      const n = wpf.applyBusRadix();
      tries += 1;
      // 文档是异步载入/导入的，多试几次直到出现矢量信号（或放弃）
      if (n === 0 && tries < 6) { setTimeout(attempt, 400); return; }
      if (n > 0) wpf.scheduleRedraw();
    })();
  }, 'bus-radix');

  // ------------------------------------------------- 总线进制右键菜单（需求 7.6）
  // ★ 已放弃「自绘菜单 / 注入菜单」两个方案（用户实测否决）：
  //   自绘 → 与核心菜单并存；注入 → 分隔线风格不符、二次右键闪烁、
  //   且核心右键菜单**本身就自带进制转换项**，注入属于重复冲突。
  //   最终方案：直接用核心自带的右键进制项，本模块只保证转换结果的正确性 ——
  //   即 patchCoreValueToLabel（位串按位宽换算、去前缀）+ refreshBusLabels（按信号自身 radix）。
  //   setSignalRadix 仍保留供编程调用，但不再挂任何 UI。
})();
