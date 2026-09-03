// ============================================================================
// WavePaintClean js/editor/selection.js —— 选择工具：框选 + 批量操作
// ----------------------------------------------------------------------------
// 职责（select 工具 / 画笔工具下 Ctrl+拖动 / 矢量信号拖动）：
//   1. 左键拖动 → 原生 range selection 框选（视觉由核心 drawRangeSelection 绘制，
//      我们直接驱动其状态 rangeSel*，见 __core.selection）。
//   2. 松开 → 浮动批量工具条：设 1 / 设 0 / 设 x / 翻转 / 输入值。
//   3. 单击（无拖动）= 框选一个「粒度单位」（整步 = 一个主步，子步 = 一格）；
//      若已有选框，点击别处 = 清除选框与菜单（同步消失）。
//   4. 粒度（整步/子步）控制框选视觉与写入范围一致：选区的 sample 两端对齐主步。
//   5. 写入前压撤销快照；Esc / 点击画布外关闭工具条。
//
// ----------------------------------------------------------------------------
// ★ 坐标模型（2026-09-03 重写，见 core/wpf.js「坐标模型」一节，口径必须一致）：
//   数据里每主步的格子数（divisor）可能是全局的，也可能是该信号私有的
//   （sig.subSteps）。因此「同一个样本下标在不同信号行上含义不同」——
//   框选/写值绝不能在行间直接套用同一个下标。
//
//   本模块的统一规则：
//   · 选区两端 sample 一律使用「全局子步空间」下标（mapCanvasPosition 的
//     globalSampleIndex —— 由 x 像素决定，与鼠标所在行无关），它与核心原生
//     drawRangeSelection 的绘制口径（每格宽 = waveCellWidth/全局stride）严格一致；
//   · 需要操作某个信号行时，用 wpf.cellsInRange(sig, sampleStart, sampleEnd)
//     把它换算成该行自己 divisor 下应写入的 values 下标数组（经主步坐标中转，
//     自动处理该行私有子步；等价核心 copySelection/pasteClipboard 的做法）；
//   · 单击「一格」= 当前粒度下的一个最小可写单位：整步=1 个主步、子步=1 格。
//
// ★ 值模型：写值统一走 wpf.parseValue(raw, sig)（无位宽概念，位串/数字皆可），
//   不再有 vectorWidth/parseBusInput —— 核心 Signal 与 addVectorSignal 都没有
//   width 字段，按位宽解析（'A' → '0'）正是历史 bug（多 bit 写值变 0）的根源。
//
// ★ 稳定性：工具条带焦点 input，hideBar 时先给 bar 打 closing 标记再摘除，
//   input 失焦（blur）处理器检测到 closing 直接返回 —— 根治历史上
//   「removeChild 触发同步 blur → blur 处理器重入 hideBar → 二次 removeChild
//   抛 NotFoundError → onMouseDown 中断、选框状态撕裂」的框选不稳定问题。
//
// 依赖：core/__core.js、core/wpf.js（window.__wpf）；普通 script，
// 加载顺序：核心 → __core → wpf → 本文件。
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureSelect) return;
  window.__wpfFeatureSelect = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;
    const core = window.__core;
    const canvas = wpf.canvas();

    // 鼠标会话状态（选区坐标见上：两端 sample 为「全局子步空间」下标）
    const marquee = {
      active: false,          // 正在一次鼠标会话（按下→抬起）
      dragging: false,        // 超过拖动手势阈值（>5px）
      hadSelection: false,    // 按下瞬间是否已有选框（决定“单击=清除”还是“单击=框一格”）
      startX: 0, startY: 0, curX: 0, curY: 0, // canvas 相对坐标
      startClientX: 0, startClientY: 0,       // 按下点 client 坐标（信号行锚点）
      startSample: -1         // 按下点「全局子步」下标（>=-1）
    };
    let bar = null;              // 浮动工具条 DOM

    // ------------------------------------------------ 坐标工具
    // 画布相对 x → 全局子步空间下标（<0 表示点在名称区/画布外，不是波形格）
    function xToGlobalSample(x) {
      // globalSampleIndex 只由 x 决定，y 给任意值即可（mapCanvasPosition 需要 y）
      const m = window.mapCanvasPosition(x, 1);
      const g = m ? Number(m.globalSampleIndex) : -1;
      return Number.isFinite(g) ? g : -1;
    }
    // 全局子步空间下界 / 上界
    function globalBounds() {
      const dw = window.document_wave;
      const count = (dw && Number(dw.m_sampleCount)) || 0;
      const stride = wpf.stride();
      return { max: Math.max(0, count * stride - 1) };
    }
    // 整步粒度对齐：sample 两端对齐主步边界（首格 → 该主步首格；末格 → 主步末格）
    function snapStepRange(lo, hi, stride) {
      const s = Math.max(1, stride);
      return {
        lo: Math.floor(lo / s) * s,
        hi: Math.floor(hi / s) * s + s - 1
      };
    }

    // ------------------------------------------------ 工具条生命周期
    // 摘除工具条。必须先置 closing 标记再摘除：input 还带着焦点，摘除会触发
    // 同步/异步 blur，处理器见 closing 即 return，绝不重入（历史崩溃点）。
    function detachBar() {
      if (!bar) return;
      bar.__closing = true;
      const el = bar;
      bar = null;
      try {
        if (el.parentElement) el.parentElement.removeChild(el);
        else if (typeof el.remove === 'function') el.remove();
      } catch (e) { /* 摘除失败不致命 */ }
    }

    // 关工具条并保留选框（用于：开始新框选、切走等——选区生命周期由鼠标会话决定）
    function hideBarKeepSelection() {
      detachBar();
    }

    // 关工具条且清除选框（菜单消失时选框同步消失，视觉与菜单同步出现/消失）
    function hideBar() {
      detachBar();
      core.selection.clear();
      window.__wpf.selection = null;
    }

    // 框选完成 → 弹工具条。等一帧让核心完成状态落地；兜底收起核心可能残留的
    // #wp-modal 遮罩（防挡住后续点击）。
    function showBarAfter(clientX, clientY) {
      const region = window.__wpf.selection;
      if (!region) return;
      setTimeout(function () {
        if (!window.__wpf.selection) return;
        const ov = document.getElementById('wp-modal-overlay');
        if (ov && ov.className.indexOf('hidden') < 0) ov.classList.add('hidden');
        showBar(clientX, clientY);
      }, 0);
    }

    // 记录我们的选区元数据（供工具条批量操作使用）
    function setSelection(region, ax, ay) {
      window.__wpf.selection = region || null;
      window.__wpf._selAnchor = (region && ax != null && ay != null) ? { x: ax, y: ay } : null;
    }

    // ------------------------------------------------ 区域换算
    // 由鼠标起止点（canvas 相对坐标）计算覆盖的 {signalStart, signalEnd,
    // sampleStart, sampleEnd}（sample 为全局子步空间下标）。夹逼语义：
    //   - 信号行/样本越界 → 夹到边界（0 或最大值）；
    //   - 两边都越界 → 返回 null（没框到有效区域，避免误框整片）。
    function regionFromPoints() {
      const x1 = Math.min(marquee.startX, marquee.curX);
      const x2 = Math.max(marquee.startX, marquee.curX);
      const y1 = Math.min(marquee.startY, marquee.curY);
      const y2 = Math.max(marquee.startY, marquee.curY);
      const midY = (y1 + y2) / 2;
      const mStart = window.mapCanvasPosition(x1, midY);
      const mEnd = window.mapCanvasPosition(x2, midY);
      const mTop = window.mapCanvasPosition(x1, y1);
      const mBottom = window.mapCanvasPosition(x1, y2);
      if (!mStart || !mEnd || !mTop || !mBottom) return null;

      const dw = window.document_wave;
      const maxSignal = (dw && Array.isArray(dw.m_signals)) ? dw.m_signals.length - 1 : -1;
      const { max: maxSample } = globalBounds();

      const topHit = Number(mTop.signalIndex);
      const botHit = Number(mBottom.signalIndex);
      // 左右端点用全局子步下标（仅由 x 决定）—— 不再受“采样行”影响
      const leftHit = Number(mStart.globalSampleIndex);
      const rightHit = Number(mEnd.globalSampleIndex);
      if ((topHit < 0 && botHit < 0) || (leftHit < 0 && rightHit < 0)) return null;

      let signalStart, signalEnd;
      if (topHit < 0) { signalStart = 0; signalEnd = botHit; }
      else if (botHit < 0) { signalStart = topHit; signalEnd = maxSignal; }
      else { signalStart = Math.min(topHit, botHit); signalEnd = Math.max(topHit, botHit); }

      let sampleStart, sampleEnd;
      if (leftHit < 0) { sampleStart = 0; sampleEnd = rightHit; }
      else if (rightHit < 0) { sampleStart = leftHit; sampleEnd = maxSample; }
      else { sampleStart = Math.min(leftHit, rightHit); sampleEnd = Math.max(leftHit, rightHit); }

      sampleStart = Math.max(0, sampleStart);
      sampleEnd = Math.min(maxSample, sampleEnd);
      if (signalEnd < 0 || sampleEnd < sampleStart) return null;
      return { signalStart: signalStart, signalEnd: signalEnd, sampleStart: sampleStart, sampleEnd: sampleEnd };
    }

    // 单击框一格（单行）：行 = 按下点所在信号行；sample = 全局子步下标
    function regionFromPointHit() {
      const m = wpf.mapAt(marquee.startClientX, marquee.startClientY);
      const si = m ? Number(m.signalIndex) : -1;
      if (si < 0) return null;
      const g = Number(m.globalSampleIndex);
      if (!(g >= 0)) return null;
      return { signalStart: si, signalEnd: si, sampleStart: g, sampleEnd: g };
    }

    function regionSignals(region) {
      const dw = window.document_wave;
      const out = [];
      for (let i = region.signalStart; i <= region.signalEnd && i < dw.m_signals.length; i += 1) {
        const sig = dw.m_signals[i];
        if (!sig || !window.SignalType || !Array.isArray(sig.values)) continue;
        if (sig.type === window.SignalType.Bit || sig.type === window.SignalType.Vector) {
          out.push({ index: i, sig: sig });
        }
      }
      return out;
    }

    // ------------------------------------------------ 粒度对齐
    // 整步粒度：样本两端对齐到主步边界（sampleStart 取主步首格、sampleEnd 取
    // 主步末格），使选框视觉与写入范围一致；子步粒度：原样。
    // sample 是全局子步空间下标 → 主步边界即 stride 的整数倍。
    function alignRegion(region) {
      if (!region || wpf.editGranularity() === 'substep') return region;
      const stride = wpf.stride();
      const aligned = snapStepRange(region.sampleStart, region.sampleEnd, stride);
      const { max: maxSample } = globalBounds();
      return {
        signalStart: region.signalStart,
        signalEnd: region.signalEnd,
        sampleStart: aligned.lo,
        sampleEnd: Math.min(maxSample, aligned.hi)
      };
    }
    // 单击一格的粒度对齐：整步 → 该主步首格；子步 → 原格（返回全局子步下标区间）
    function cellRangeAt(g) {
      if (wpf.editGranularity() === 'substep') return { lo: g, hi: g };
      const stride = wpf.stride();
      return { lo: Math.floor(g / stride) * stride, hi: Math.floor(g / stride) * stride + stride - 1 };
    }

    // 把 region 交给核心原生绘制（直驱状态 + 重绘；已包含 active=true 语义）
    function paintSelection(region) {
      if (!region) return false;
      return core.selection.set(region.signalStart, region.sampleStart,
        region.signalEnd, region.sampleEnd);
    }

    // ------------------------------------------------ 鼠标会话
    function onMouseDown(e) {
      if (e.button !== 0) return;
      if (e.target !== canvas) return;
      if (wpf.currentTool() !== 'select') return;
      marquee.hadSelection = !!window.__wpf.selection;
      if (bar) hideBarKeepSelection(); // 只收菜单；选框的清除/替换在 mouseup 决定
      const r = canvas.getBoundingClientRect();
      const m = wpf.mapAt(e.clientX, e.clientY);
      marquee.active = true;
      marquee.dragging = false;
      marquee.startX = marquee.curX = e.clientX - r.left;
      marquee.startY = marquee.curY = e.clientY - r.top;
      marquee.startClientX = e.clientX;
      marquee.startClientY = e.clientY;
      marquee.startSample = m ? Number(m.globalSampleIndex) : -1;
      // 拦截：框选完全由本模块（粒度对齐后）驱动核心原生 range selection 绘制
      e.stopImmediatePropagation();
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (!marquee.active) return;
      const r = canvas.getBoundingClientRect();
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      if (!marquee.dragging && (Math.abs(nx - marquee.startX) > 5 || Math.abs(ny - marquee.startY) > 5)) {
        marquee.dragging = true;
      }
      marquee.curX = nx;
      marquee.curY = ny;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (!marquee.dragging) return;
      // 拖动中：实时按粒度对齐后的区域驱动核心绘制（region 归一化 → 反向拖动天然正确）
      paintSelection(alignRegion(regionFromPoints()));
    }

    function onMouseUp(e) {
      if (!marquee.active) return;
      marquee.active = false;
      e.stopImmediatePropagation();
      e.preventDefault();

      if (!marquee.dragging) {
        // ---------------- 单击 ----------------
        if (marquee.hadSelection) {
          // 已有选框：点击别处 = 清除（不框新格、不弹菜单）
          core.selection.clear();
          setSelection(null);
          return;
        }
        // 无选框：单击 = 框选一个「粒度单位」
        if (marquee.startSample >= 0) {
          const cr = cellRangeAt(marquee.startSample);
          const region = regionFromPointHit();
          if (region) {
            region.sampleStart = cr.lo;
            region.sampleEnd = cr.hi;
            paintSelection(region);
            setSelection(region, marquee.startClientX, marquee.startClientY);
            showBarAfter(e.clientX, e.clientY);
          }
        }
        return;
      }

      // ---------------- 拖动框选 ----------------
      const region = alignRegion(regionFromPoints());
      paintSelection(region); // 最终区域
      setSelection(region, marquee.startClientX, marquee.startClientY);
      if (region) showBarAfter(e.clientX, e.clientY);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', function () { marquee.active = false; });

    // ------------------------------------------------ 批量写值
    // 一个信号行在该选区中实际要写入的 values 下标（已按该行 divisor 换算并夹逼）
    function cellsFor(sig, region) {
      return wpf.cellsInRange(sig, region.sampleStart, region.sampleEnd);
    }

    function isVector(sig) { return !!(window.SignalType && sig.type === window.SignalType.Vector); }

    // 单格写入（直接写 values 并清该格时钟标记；不经过 writeValue 的主步铺开，
    // 因为这里逐格语义由调用方按粒度决定——cellsFor 已把整步展开成完整下标）
    function setCell(sig, i, v) {
      if (!(i >= 0) || i >= sig.values.length) return;
      sig.values[i] = v;
      if (Array.isArray(sig.clockMarkers) && i < sig.clockMarkers.length) {
        sig.clockMarkers[i] = false;
      }
    }

    // 判断某格「当前值形态」：位串字符串（vector 信号常见）或数字（Bit 编码）
    function isBitString(v) { return typeof v === 'string' && /^[01xz]+$/i.test(v); }

    // kind: 'one' | 'zero' | 'x' | 'invert'
    function nextValue(sig, current, kind) {
      if (!isVector(sig)) {
        if (kind === 'one') return 1;
        if (kind === 'zero') return 0;
        if (kind === 'x') return -1;
        // invert：0↔1；x/z/u/d 保持原状
        const n = Number(current);
        if (n === 1) return 0;
        if (n === 0) return 1;
        return current;
      }
      // Vector：值形态可能是位串（'1010'/'x'）或数字（-1 初值 / 数值进制值）。
      // 设值：若当前是位串 → 同长位串（'1'/'0'/'x' 铺满），否则写数字编码；
      // 翻转：位串逐位取反（x/z 保持），数字值不翻（无位宽无法补码）。
      if (isBitString(current) && current.length > 1) {
        const fill = kind === 'one' ? '1' : kind === 'zero' ? '0' : kind === 'x' ? 'x' : '';
        if (fill) return fill.repeat(current.length);
        let out = '';
        for (const ch of current) out += ch === '1' ? '0' : ch === '0' ? '1' : ch;
        return out;
      }
      if (kind === 'one') return 1;
      if (kind === 'zero') return 0;
      if (kind === 'x') return -1;
      return current; // invert（数字形态保持）
    }

    function refreshTouched(touched) {
      touched.forEach(function (sig) {
        if (isVector(sig) && typeof wpf.refreshBusLabels === 'function') wpf.refreshBusLabels(sig);
      });
      wpf.scheduleRedraw();
    }

    // 设值 / 翻转（工具条按钮）
    function applyValues(kind) {
      const region = window.__wpf.selection;
      if (!region) return;
      wpf.pushUndoSnapshot();
      const touched = new Set();
      for (const { sig } of regionSignals(region)) {
        // cellsFor 已按该信号 divisor 把选区换算成实际下标（含整步展开）——
        // 翻转逐格取反天然正确（交替时钟 1,0,1,0 不会因“主步铺满”而抹平）。
        for (const i of cellsFor(sig, region)) {
          if (i >= sig.values.length) continue;
          setCell(sig, i, nextValue(sig, sig.values[i], kind));
        }
        touched.add(sig);
      }
      refreshTouched(touched);
    }

    // 输入值（工具条输入框）：vector 用 wpf.parseValue 全格式解析；
    // Bit 支持 0/1/x/z 单字符（u/d 一并识别），非法输入整体跳过（不写 0！）
    function bitFromText(text) {
      const t = String(text).toLowerCase();
      if (t === '1') return 1;
      if (t === '0') return 0;
      if (t === 'x') return -1;
      if (t === 'z') return 2;
      if (t === 'u') return 3;
      if (t === 'd') return 4;
      return null;
    }

    function applyCustom(raw) {
      const region = window.__wpf.selection;
      if (!region) return;
      const text = String(raw == null ? '' : raw).trim();
      if (!text) return;
      wpf.pushUndoSnapshot();
      const touched = new Set();
      for (const { sig } of regionSignals(region)) {
        const cells = cellsFor(sig, region);
        if (!cells.length) continue;
        if (isVector(sig)) {
          const v = wpf.parseValue(text, sig);
          if (v === null) continue; // 该行无法解析 → 跳过，绝不误写 0
          for (const i of cells) setCell(sig, i, v);
        } else {
          const v = bitFromText(text);
          if (v === null) continue;
          for (const i of cells) setCell(sig, i, v);
        }
        touched.add(sig);
      }
      refreshTouched(touched);
    }

    // ------------------------------------------------ 浮动工具条
    function showBar(clientX, clientY) {
      detachBar();
      const region = window.__wpf.selection;
      if (!region) return;
      bar = document.createElement('div');
      bar.id = 'wpf-batch-bar';
      bar.__closing = false;
      bar.style.cssText = 'position:fixed;z-index:300;display:flex;gap:4px;padding:6px 8px;align-items:center;'
        + 'background:#fff;border:1px solid #bbb;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.2);font-size:12px;';
      let suppressCommit = false; // 点按钮时 input 会失焦，不应误触发「失焦即提交」
      const buttons = [
        ['设 1', function () { applyValues('one'); }],
        ['设 0', function () { applyValues('zero'); }],
        ['设 x', function () { applyValues('x'); }],
        ['翻转', function () { applyValues('invert'); }]
        // 复制/粘贴走快捷键（Ctrl+C/V），不再占用工具条
      ];
      buttons.forEach(function ([label, fn]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.style.cssText = 'cursor:pointer;padding:3px 10px;';
        b.addEventListener('mousedown', function () { suppressCommit = true; });
        b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
        bar.appendChild(b);
      });
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '输入值';
      input.title = '输入数值后回车或点击别处即写入（支持 10 / 0xA / 0b1010 / 8\'hA5 / x / z）；不输入点击别处 = 取消；Esc = 取消';
      input.style.cssText = 'width:92px;font-size:12px;padding:3px 6px;border:1px solid #bbb;border-radius:6px;';
      function commitInput() {
        const text = String(input.value || '').trim();
        if (!text) { hideBar(); return; }
        applyCustom(text);
        hideBar();
      }
      function cancelInput() {
        input.value = '';
        hideBar();
      }
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') { ev.preventDefault(); commitInput(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cancelInput(); }
      });
      // ★ 稳定性关键：barEl 是「本工具条元素」的闭包稳定引用。摘除（detachBar）
      //   会把 barEl.__closing 置 true；随后因摘除而同步/异步触发的 blur 看到
      //   closing 直接 return —— 绝不重入 hideBar / applyCustom（历史
      //   removeChild→blur→hideBar 二次 removeChild 抛 NotFoundError 的根源，
      //   见文件头注释）。不要改成检查全局 bar：摘除时全局 bar 已置 null，
      //   守卫会失效。
      const barEl = bar;
      input.addEventListener('blur', function () {
        if (barEl.__closing) return;
        if (suppressCommit) { suppressCommit = false; return; }
        const text = String(input.value || '').trim();
        if (!text) { hideBar(); return; }
        applyCustom(text);
        hideBar();
      });
      bar.appendChild(input);
      document.body.appendChild(bar);
      const bw = bar.offsetWidth, bh = bar.offsetHeight;
      bar.style.left = Math.max(8, Math.min(clientX, window.innerWidth - bw - 8)) + 'px';
      bar.style.top = Math.max(8, Math.min(clientY - bh - 12, window.innerHeight - bh - 8)) + 'px';
      input.focus();
      input.select();
    }

    // ------------------------------------------------ 工具条全局关闭
    function dismissBar() {
      if (!bar) return false;
      hideBar();
      return true;
    }
    function insideBar(node) {
      return !!(node && bar && (node === bar || (bar.contains && bar.contains(node))));
    }

    document.addEventListener('mousedown', function (e) {
      if (!bar) return;
      if (insideBar(e.target)) return; // 工具条按钮交给 click
      if (e.target === canvas) return; // 画布按下由 onMouseDown 决定
      dismissBar();
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bar) {
        // 自己关菜单+选框；阻止核心 Esc（cancelCurrentTool 会切走工具）
        e.stopImmediatePropagation();
        e.preventDefault();
        dismissBar();
      }
    }, true);

    // 切走工具 / 窗口尺寸变化：遗留工具条应消失
    window.addEventListener('resize', function () {
      if (bar && wpf.currentTool() !== 'select') dismissBar();
    });
  }, 'editor-selection');
})();
