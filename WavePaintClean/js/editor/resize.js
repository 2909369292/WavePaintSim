// ============================================================================
// WavePaintSim feature-resize.js —— 步数/子步变化智能自适应
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F3，用户点名需求）：
//   1. 增大步数：
//      - 时钟类信号（isClockPattern）：按已画内容的周期自动延续（如 0101…）
//      - 其它信号：延续最后一个确定值；整行未定义则补 x
//   2. 减小步数：截断保留前部（可通过原版撤销栈 Ctrl+Z 撤销）。
//   3. 子步数变化：按"主步 × (子步+1)"重排——主值保留，新增子步填主值。
//      （原版在此场景会把 0101 时钟错乱成 0000，本模块修正该行为）
//   4. 修改前压入原版撤销栈快照，Ctrl+Z 可整体撤销。
// 实现要点：
//   核心对两个 spin 已直接绑定 change（失焦/回车提交，避免每键 input 全量重绘闪烁）；
//   本模块在 document 捕获阶段先于核心收到 spin 的 input / change，
//   input 一律吞掉（防任何逐键重绘），change 则接管执行本模块的智能 resize，
//   使核心原生的"尾部补空"resize 不再执行。
// 依赖：feature-common.js、混淆核心全局 API
// 修改记录：
//   2026-08-30 初版（F3）
//   2026-08-30 P0-3 不再缓存 document_wave 引用（核心重建文档后 resize 失效）
//   2026-08-30 P2-5 子步数 0 不再被 || 吞掉；currentCounts 子步下限改为 0
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureResize) return;
  window.__wpfFeatureResize = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    // ★ 每次都重新读取，不要在 ready 时缓存引用：
    //   核心在「新建 / 载入示例 / 导入」时会重建 window.document_wave 对象，
    //   缓存会导致后续 resize 读写已被丢弃的旧文档 —— 画布毫无反应（BUG-004）。
    const doc = function () { return window.document_wave; };

    // 当前画布步数状态（以 document_wave 为准，undo/redo 后自动跟随）
    function currentCounts() {
      const dw = doc();
      return {
        steps: Math.max(4, Number(dw && dw.m_sampleCount) || 30),
        // 子步数允许为 0（此时 stride = 1，每步只占 1 个下标）。
        // 旧写法 Math.max(1, Number(x) || 1) 会把 0 变成 1，导致子步设不回 0（BUG-009）。
        subs: Math.max(0, Number(dw && dw.m_subStepCount) || 0)
      };
    }

    // 从旧 values 提取各主步的主值（每步第 1 个值）
    function extractMainValues(oldValues, oldStride, oldSteps) {
      const mains = [];
      for (let step = 0; step < oldSteps; step += 1) {
        const idx = step * oldStride;
        if (idx < oldValues.length) mains.push(oldValues[idx]);
        else if (oldValues.length) mains.push(oldValues[oldValues.length - 1]);
        else mains.push(-1);
      }
      return mains;
    }

    // 时钟信号周期检测：返回最小周期 p（主值序列整体循环），无周期返回 0
    function detectPeriod(mains) {
      const n = mains.length;
      for (let p = 1; p <= Math.floor(n / 2); p += 1) {
        let ok = true;
        for (let i = 0; i < n - p; i += 1) {
          if (mains[i] !== mains[i + p]) { ok = false; break; }
        }
        if (ok) return p;
      }
      return 0;
    }

    // 计算第 step 步的延续值（step >= mains.length 时调用）
    function extendValue(sig, mains, step) {
      if (sig.isClockPattern && mains.length) {
        // 时钟：按已画主值序列的最小周期延续（0101…、0011… 均适用）
        const p = detectPeriod(mains);
        if (p > 0) return mains[step % p];
      }
      // 其它信号：延续最后一个确定值；整行未定义则补 x（Bit=-1）
      for (let i = mains.length - 1; i >= 0; i -= 1) {
        if (mains[i] !== null && mains[i] !== undefined) return mains[i];
      }
      return -1;
    }

    // 核心：按新步数/子步重建每个信号的 values
    function resizeSignals(newSteps, newSubs) {
      const dw = doc();
      if (!dw) return;
      const old = currentCounts();
      wpf.pushUndoSnapshot(); // 撤销栈：保存旧状态（含旧步数），Ctrl+Z 可整体撤销

      const oldStride = old.subs + 1;
      const newStride = newSubs + 1;
      const newLen = newSteps * newStride;

      for (const sig of (Array.isArray(dw.m_signals) ? dw.m_signals : [])) {
        if (!sig || sig.type === window.SignalType.BlankRow) continue;
        const oldValues = Array.isArray(sig.values) ? sig.values : [];
        const oldSteps = oldValues.length ? Math.max(1, Math.floor(oldValues.length / oldStride)) : 0;
        const mains = extractMainValues(oldValues, oldStride, oldSteps);

        // 先按新步数补齐/截断主值序列
        const extended = mains.slice(0, newSteps);
        while (extended.length < newSteps) {
          extended.push(extendValue(sig, mains, extended.length));
        }

        // 按新 stride 重建：每步的 (子步+1) 个格子都填主值
        const next = new Array(newLen);
        for (let step = 0; step < newSteps; step += 1) {
          for (let k = 0; k < newStride; k += 1) {
            next[step * newStride + k] = extended[step];
          }
        }
        sig.values = next;
        wpf.syncSignalMeta(sig, newLen);
      }

      dw.m_sampleCount = newSteps;
      dw.m_subStepCount = newSubs;
      wpf.scheduleRedraw();
    }

    // spin 值（可能用户只改了其中一个）
    function readSpins() {
      const s = document.getElementById('sample-spin');
      const b = document.getElementById('substep-spin');
      const steps = s ? Number(s.value) : NaN;
      const subs = b ? Number(b.value) : NaN;
      return {
        steps: Number.isFinite(steps) && steps >= 4 ? Math.floor(steps) : null,
        // 子步 spin 值 = 模型 m_subStepCount（实测：spin=1→1、spin=2→2），无需 +1
        subs: Number.isFinite(subs) && subs >= 0 ? Math.floor(subs) : null
      };
    }

    // 拦截 spin 的 input（核心已改绑 change，不再有逐键监听；此兜底阻止任何
    // 残留的 input 级 resize，杜绝逐键全量重绘的闪烁）
    document.addEventListener('input', function (e) {
      const id = e.target && e.target.id;
      if (id === 'sample-spin' || id === 'substep-spin') {
        e.stopImmediatePropagation();
      }
    }, true);

    // change（blur/Enter）提交时执行智能 resize。
    // stop 阻止原版（若有）的 change 监听器再次执行"尾部补空"resize。
    document.addEventListener('change', function (e) {
      const id = e.target && e.target.id;
      if (id !== 'sample-spin' && id !== 'substep-spin') return;
      e.stopImmediatePropagation();
      const spins = readSpins();
      const cur = currentCounts();
      // 注意：readSpins 用 null 表示"该输入框值非法"，0 是合法值（子步可为 0）。
      // 必须用 == null 判断，用 || 会把 0 当成缺失而吞掉（BUG-009）。
      const newSteps = (spins.steps == null) ? cur.steps : spins.steps;
      const newSubs = (spins.subs == null) ? cur.subs : spins.subs;
      if (newSteps === cur.steps && newSubs === cur.subs) return;
      resizeSignals(newSteps, newSubs);
    }, true);

    // 撤销/重做后（原版会恢复 sampleCount/subStepCount），无需额外处理：
    // 本模块始终通过 doc() 读取 window.document_wave 的当前值，不存在过期缓存。
  }, 'feature-resize');
})();
