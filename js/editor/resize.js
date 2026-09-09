// ============================================================================
// WavePaintClean js/editor/resize.js —— 步数/子步变化智能自适应
// ----------------------------------------------------------------------------
// 功能说明（对应实施规格 F3，用户点名需求）：
//   1. 增大步数：
//      - 时钟类信号（isClockPattern）：按已画内容的最小周期自动延续（如 0101…）
//      - 其它信号：延续最后一个值；整行未定义则补 x
//   2. 减小步数：截断保留前部（可通过核心撤销栈 Ctrl+Z 撤销）。
//   3. 子步数变化：主步重叠区按「分数时间中点重采样」重排到新 stride——
//      主值（每步首格）不变，子格跨格翻转保留，绝不把 0101 抹成全 0/全 1
//      （核心原生在此场景会把 0101 时钟错乱成 0000，本模块修正该行为）
//   4. 修改前压入核心撤销栈快照，Ctrl+Z 可整体撤销。
// 实现要点：
//   核心对两个 spin 已直接绑定 change（失焦/回车提交，避免每键 input 全量重绘闪烁）；
//   本模块在 document 捕获阶段先于核心收到 spin 的 input / change，
//   input 一律吞掉（防任何逐键重绘），change 则接管执行本模块的智能 resize，
//   使核心原生的"尾部补空"resize 不再执行。
// 依赖：core/wpf.js（window.__wpf）、解混淆核心 wavepaint.clean.js 全局 API
// 修改记录：
//   2026-08-30 初版（F3）
//   2026-08-30 P0-3 不再缓存 document_wave 引用（核心重建文档后 resize 失效）
//   2026-08-30 P2-5 子步数 0 不再被 || 吞掉；currentCounts 子步下限改为 0
//   2026-09-09 Task3(#90) 步数/子步数输入框右侧新增 ▲/▼ 微调按钮：点击 ±1，
//     改 spin 值后派发 change，复用下方统一的 capture 监听完成智能 resize（含撤销快照）。
//   2026-09-09 Task4(#91) 重建语义改为「主步块」：只改步数时重叠区原样保留、
//     时钟按块序列最小周期延续；改子步数时按主步内分数时间中点重采样。
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

    // 附属对象（标记/时间跳转/箭头/时间跨度/文本标注）的锚点都在全局子步空间下标，
    // 与核心原生 resize 同语义：旧下标 → 主步浮点 → 新下标（四舍五入），
    // 越界者按原生行为过滤剔除（文本标注 sample=null 表示锚定箭头，保持不动）。
    function remapAnchorValue(value, oldStride, newStride, maxIdx) {
      const n = Number(value);
      if (!Number.isFinite(n)) return value;
      const main = n / oldStride;
      return Math.min(Math.max(0, Math.round(main * newStride)), maxIdx);
    }

    function remapAnchors(dw, oldStride, newStride, newSteps) {
      const maxIdx = newSteps * newStride;
      const pos = (v) => remapAnchorValue(v, oldStride, newStride, maxIdx);
      const inRange = (v) => typeof v === "number" && v >= 0 && v <= maxIdx;
      if (Array.isArray(dw.m_markers)) {
        dw.m_markers = dw.m_markers
          .map((m) => ({ ...m, position: pos(m.position) }))
          .filter((m) => inRange(m.position));
      }
      if (Array.isArray(dw.m_timeJumps)) {
        dw.m_timeJumps = dw.m_timeJumps
          .map((m) => ({ ...m, position: pos(m.position) }))
          .filter((m) => inRange(m.position));
      }
      if (Array.isArray(dw.m_arrows)) {
        dw.m_arrows = dw.m_arrows
          .map((m) => ({ ...m, startPosition: pos(m.startPosition), endPosition: pos(m.endPosition) }))
          .filter((m) => inRange(m.startPosition) && inRange(m.endPosition));
      }
      if (Array.isArray(dw.m_timeSpanMarkers)) {
        dw.m_timeSpanMarkers = dw.m_timeSpanMarkers
          .map((m) => ({ ...m, startPosition: pos(m.startPosition), endPosition: pos(m.endPosition) }))
          .filter((m) => inRange(m.startPosition) && inRange(m.endPosition));
      }
      if (Array.isArray(dw.m_textAnnotations)) {
        dw.m_textAnnotations = dw.m_textAnnotations
          .map((m) => ({ ...m, sample: typeof m.sample === "number" ? pos(m.sample) : m.sample }))
          .filter((m) => m.sample === null || m.sample === undefined || m.sample >= 0);
      }
    }

    // =======================================================================
    // #91 重建语义（替代旧的「主值抽值→铺满」全量重建）
    // -----------------------------------------------------------------------
    // 旧逻辑对每个信号一律「每主步抽首格(main) → 主值截断/延拓 → 把主值铺满
    // 新长度每个格子」。cell 层的真实图案（自动端口时钟/核心时钟每格 1,0,1,0、
    // 用户在子步格手画的翻转）在重建中会被抹平：自动时钟每个主步的主值恒为 1，
    // 步长一变整行就变成全 1/全 0（用户实测 #91）。
    //
    // 新语义：以「一个完整主步的 cell 块」为最小重建单位，且一律按该行自己的
    // divisor（wpf.divisorOf 口径：私有 subSteps>0 用 own+1，否则跟随全局 stride）：
    //   1. 只改步数（dOld===dNew）：重叠区的前 newSteps 个块**原样保留**，绝不
    //      重写用户已画的子格图案；不足时延拓（见 3）。
    //   2. 截断（newSteps 更小）：保留前 newSteps 个块，子格图案与相位不丢。
    //   3. 延拓（缺块）：isClockPattern 行按「块序列最小周期」整体延续（块=整块
    //      判等，stride=3 时 101/010 交替块也能识别出周期 2，相位不漂）；其它行
    //      延续整行最后一个值（含 x），不凭空造翻转，与旧「延续最后值」一致。
    //   4. 改子步数（dOld!==dNew，只可能是跟随全局的非私有行）：重叠主步做
    //      「主步内分数时间中点重采样」dOld→dNew —— 每步首格永远取旧主值
    //      （主步边界相位与 readWaveDocument 的主值采样不变），其余子格按新格
    //      中点在旧格上的位置取值：新格变细则旧值被展宽（hold），变粗则按中点
    //      压缩，跨格翻转原样保留，任何情况下不把 0101 抹成同值。
    //   5. 私有 subSteps 行 dOld===dNew 恒成立（divisor 不随全局子步变），因此
    //      全局子步变化时只走 1-3，绝不被整体抹平或错位。
    // =======================================================================

    // 按 dOld 把 values 切成完整主步块（不足一块的尾巴丢弃，与旧 oldSteps 口径一致）
    function cellBlocks(values, dOld) {
      const blocks = [];
      const n = Math.floor(values.length / dOld);
      for (let i = 0; i < n; i += 1) {
        blocks.push(values.slice(i * dOld, (i + 1) * dOld));
      }
      return blocks;
    }

    // 两块逐格判等（块周期检测用）
    function sameBlock(a, b) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
      return true;
    }

    // 块序列最小周期（整块判等）；无周期返回 0
    function detectBlockPeriod(blocks) {
      const n = blocks.length;
      for (let p = 1; p <= Math.floor(n / 2); p += 1) {
        let ok = true;
        for (let i = 0; i < n - p; i += 1) {
          if (!sameBlock(blocks[i], blocks[i + p])) { ok = false; break; }
        }
        if (ok) return p;
      }
      return 0;
    }

    // 主步内重采样：旧块（dOld 格）→ 新块（dNew 格）。
    // 首格 = 旧主值；其余子格取「新格中点所在旧格」的值。
    function resampleBlock(block, dNew) {
      const dOld = block.length;
      if (dNew === dOld) return block.slice();
      if (dNew <= 0) return [block[0]];
      const out = [block[0]];
      for (let j = 1; j < dNew; j += 1) {
        const idx = Math.min(dOld - 1, Math.floor(((j + 0.5) / dNew) * dOld));
        out.push(block[idx]);
      }
      return out;
    }

    // 生成第 k 个缺失块（k >= blocks.length）：时钟按块周期延续，其它延续最后值
    function extendBlockAt(sig, blocks, k, dNew) {
      const n = blocks.length;
      if (!n) {
        const blank = [];
        for (let i = 0; i < dNew; i += 1) blank.push(-1);
        return blank;
      }
      if (sig.isClockPattern) {
        const p = detectBlockPeriod(blocks);
        if (p > 0) return blocks[k % p].slice();
        // 画得不成周期仍标了时钟：重复最后一块的微形态，至少不塌成常量
        return blocks[n - 1].slice();
      }
      // 数据/无法判周期：延续最后一个值（含 x），不产生新翻转
      const last = blocks[n - 1][blocks[n - 1].length - 1];
      const out = [];
      for (let i = 0; i < dNew; i += 1) out.push(last);
      return out;
    }

    // 核心：按新步数/子步重建每个信号的 values。
    // ⚠ 必须按「每信号 divisor」换算（wpf.divisorOf 口径）：信号可带私有 subSteps
    // （divisor = subSteps+1，不随全局子步变化），用全局 stride 提取/重建会把
    // 私有行的主值取错列、重建后长度与 divisorOf 解读不一致 → 该行整体错位。
    function resizeSignals(newSteps, newSubs) {
      const dw = doc();
      if (!dw) return;
      const old = currentCounts();
      wpf.pushUndoSnapshot(); // 撤销栈：保存旧状态（含旧步数），Ctrl+Z 可整体撤销

      const oldStride = old.subs + 1;
      const newStride = newSubs + 1;

      for (const sig of (Array.isArray(dw.m_signals) ? dw.m_signals : [])) {
        if (!sig || sig.type === window.SignalType.BlankRow) continue;
        const ownSubs = Number(sig.subSteps);
        const hasOwn = Number.isFinite(ownSubs) && ownSubs > 0;
        const dOld = hasOwn ? ownSubs + 1 : oldStride;   // 该行旧 divisor
        const dNew = hasOwn ? ownSubs + 1 : newStride;   // 该行新 divisor（私有行不变）
        const oldValues = Array.isArray(sig.values) ? sig.values : [];
        const newLen = newSteps * dNew;
        if (!oldValues.length) {
          // 空行：全 x 铺满新长度
          sig.values = new Array(newLen).fill(-1);
          wpf.syncSignalMeta(sig, newLen);
          continue;
        }

        // 以旧网格的主步块为原始素材：重叠区保持「块」完整，再统一做
        // 重采样(dOld→dNew) + 截断 + 延拓，最后展平。
        const blocks = cellBlocks(oldValues, dOld);
        const keptCount = Math.min(blocks.length, newSteps);
        const rebuilt = [];
        for (let step = 0; step < keptCount; step += 1) {
          rebuilt.push(resampleBlock(blocks[step], dNew));
        }
        // 需要延拓的缺块：在已经落位的新网格块序列上延续（时钟按块周期）
        for (let step = keptCount; step < newSteps; step += 1) {
          rebuilt.push(extendBlockAt(sig, rebuilt, step, dNew));
        }

        const next = new Array(newLen);
        for (let step = 0; step < rebuilt.length && step < newSteps; step += 1) {
          const block = rebuilt[step];
          for (let k = 0; k < dNew; k += 1) next[step * dNew + k] = block[k];
        }
        sig.values = next;
        wpf.syncSignalMeta(sig, newLen);
      }

      remapAnchors(dw, oldStride, newStride, newSteps);
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

    // ▲/▼ 微调：步数/子步数按钮（HTML: index.html .step-arrow）。
    // 点按钮不抢输入框焦点（preventDefault 阻止 mousedown 默认聚焦/失焦），
    // 在 min/max 内取当前输入值 ±1，写入 spin 后派发 change——
    // 由下方 document capture change 监听统一走 resizeSignals（含撤销快照），
    // 与用户手输/回车行为完全一致，不另起第二套 resize 逻辑。
    function wireStepSteppers() {
      const isArrow = function (el) {
        return el && el.closest && !!el.closest('.step-arrow');
      };
      document.addEventListener('pointerdown', function (e) {
        if (!isArrow(e.target)) return;
        const btn = e.target.closest('.step-arrow');
        const input = btn && document.getElementById(btn.getAttribute('data-target') || '');
        const delta = Number(btn && btn.getAttribute('data-step'));
        if (!input || !Number.isFinite(delta)) return;
        e.preventDefault();   // 保持输入框焦点（若已聚焦），避免点击触发失焦 blur 的二次 change
        e.stopPropagation();  // 阻断其它 document 捕获监听误判本次点击
        const min = input.min === '' ? -Infinity : Number(input.min);
        const max = input.max === '' ? Infinity : Number(input.max);
        const base = Number(input.value);
        if (!Number.isFinite(base)) return; // 非法中间态：交给用户回车/失焦处理
        const next = Math.min(max, Math.max(min, base + delta));
        if (!Number.isFinite(next) || next === base) return;
        input.value = String(next);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, true);
    }
    wireStepSteppers();

    // 拦截 spin 的 input（核心已改绑 change，不再有逐键监听；此兜底阻止任何
    // 残留的 input 级 resize，杜绝逐键全量重绘的闪烁）
    document.addEventListener('input', function (e) {
      const id = e.target && e.target.id;
      if (id === 'sample-spin' || id === 'substep-spin') {
        e.stopImmediatePropagation();
      }
    }, true);

    // change（blur/Enter）提交时执行智能 resize。
    // stop 阻止核心（若有）的 change 监听器再次执行"尾部补空"resize。
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

    // 撤销/重做后（核心会恢复 sampleCount/subStepCount），无需额外处理：
    // 本模块始终通过 doc() 读取 window.document_wave 的当前值，不存在过期缓存。
  }, 'editor/resize');
})();
