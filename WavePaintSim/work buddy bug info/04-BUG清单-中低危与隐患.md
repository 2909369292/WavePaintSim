# 04 — BUG 清单：中低危与隐患（BUG-005 ~ BUG-018）

> **面向对象**：接手本项目的其他 AI / 开发者
> **前置阅读**：`README.md` → `01-项目背景与架构.md` → `03-BUG清单-P0致命与高危.md`
> **代码基线**：`d:\Files\Code\波形\WavePaintSim\`（本次审计未修改任何代码）

---

## 0. ⚠ 动手前先读：对首轮结论的三处重要订正

在写本文档时，我对混淆核心做了更深的静态探测，**推翻了首轮审计中的三条结论**。
如果你已经在按 `README.md` 的旧表格排查这三条，请**立刻停下**，按下文处理。

### 订正 1 — BUG-005「HiDPI / DPR 下叠加层错位」：❌ 不成立，降级

**原结论**：主 canvas 使用 devicePixelRatio 缩放，overlay 只设 `width/height` 属性不设 CSS 尺寸 → 叠加层放大错位。

**推翻依据**：在 `js/wavepaint.63e6dade.js` 中检索 `devicePixelRatio` 与 `setTransform`，**出现次数均为 0**。核心完全没有做 DPR 缩放，canvas 的 `width` 属性与 CSS 宽度基本一致。

**保留的部分**：overlay 确实依赖"`canvas.width` 属性 == canvas CSS 宽度"这一**未言明的隐式假设**，属于健壮性隐患而非当前已知的显示错误。已降级处理，见 §1。

### 订正 2 — BUG-006「mapCanvasPosition 返回 null 导致 TypeError」：❌ 基本不成立，但暴露了另一个真问题

**原结论**：框选到信号区外时 `mapCanvasPosition` 返回 `null`，`regionFromPoints()` 直接取 `.signalIndex` 抛 TypeError。

**推翻依据**：核心中 `mapCanvasPosition` 的函数体开头是：

```js
if(!document_wave||!canvas)return null;
```

即 **null 只在 `document_wave` 或 `canvas` 缺失时返回**（启动未完成 / 已销毁），与几何越界无关。
几何越界（点在名称列左侧、超过最后一步、落在空白行）时返回的是一个**全 `-1` 的哨兵对象**：

```js
return { 'signalIndex': -1, 'signal': null, 'clickedOnName': false,
         'mainStep': -1, 'subStepFraction': 0, 'globalSampleIndex': -1,
         'signalSampleIndex': -1, ... };
```

**所以不会崩。** 但顺着这条线查下去，发现了一个**真实存在且更隐蔽的缺陷**：
`regionFromPoints()` 里的 `Math.max(0, ...)` 把 `-1` **静默吞掉并夹到 0**，导致从名称区 / 顶部标尺 / 最后一行下方起拖时，选区被**静默扩大到信号 0**，用户完全无感知。详见 §2。

### 订正 3 — BUG-007「structuredClone 丢失 Signal 原型」：❌ 不成立

**原结论**：`pushUndoSnapshot` 用 `structuredClone` 克隆 `Signal` 类实例，克隆结果是普通对象、丢失原型方法。

**推翻依据**：核心自己的快照函数（偏移 `1417736` / `164042` 附近）长这样：

```js
WaveDocument['prototype']['pushUndoSnapshot'] = function () {
  const snap = {
    'signals':          JSON.parse(JSON.stringify(this['m_signals'])),
    'markers':          JSON.parse(JSON.stringify(this['m_markers'])),
    'timeJumps':        JSON.parse(JSON.stringify(this['m_timeJumps'])),
    'timeSpanMarkers':  JSON.parse(JSON.stringify(this['m_timeSpanMarkers'])),
    'arrows':           JSON.parse(JSON.stringify(this['m_arrows'])),
    'textAnnotations':  JSON.parse(JSON.stringify(this['m_textAnnotations'])),
    'sampleCount':      this['m_sampleCount'],
    'subStepCount':     this['m_subStepCount']
  };
  this['m_undoStack'].push(snap);
  if (this['m_undoStack'].length > 100) this['m_undoStack'].shift();   // ← 上限 100
  this['m_redoStack'] = [];
};
```

（上式为反混淆后的等价可读形式；原文中字符串被拆成 `'m_undoStac'+'k'`、`'pushUndoSn'+'apshot'` 等形式，所以直接 grep `m_undoStack` / `pushUndoSnapshot` 是搜不到的。）

**核心自己用的就是 `JSON.parse(JSON.stringify(...))`，撤销栈里存的本来就是普通对象**，撤销时直接 `this['m_signals'] = snap['signals']` 整体替换。
所以 `structuredClone` 产生的普通对象与核心行为**完全一致**，不是缺陷。

**好消息是**：`feature-common.js` 手写的快照格式 `{signals, markers, timeJumps, timeSpanMarkers, arrows, textAnnotations, sampleCount, subStepCount}` 与核心**逐个字段完全对齐**，这块实现是对的。

### ★ 订正 3 附带的重大发现：核心自带 `pushUndoSnapshot()`

核心在 `WaveDocument.prototype` 上暴露了一个方法，名字就叫 **`pushUndoSnapshot`**（与 `wpf.pushUndoSnapshot` **同名**，极易混淆）。
在核心中 `'pushUndoSn'+'apshot'` 形式共出现 **32 次**，全部是核心自己在改数据前调用的（`addSignal` / `deleteSignal` / `moveSignal` / `setArrowStyle` / `clearTimeJumps` / `setMarkerColorById` …）。

**这是本次审计最有价值的发现**，它直接改变了 BUG-003 与 BUG-007 的最优修复方案：

| | 现在的做法（`feature-common.js:120`） | 应该的做法 |
|---|---|---|
| 实现 | 手写 8 字段快照 + 手动 push | **直接调 `window.document_wave.pushUndoSnapshot()`** |
| 撤销栈上限 100 | ❌ 没有，会无限增长 | ✅ 核心自带 `if (length > 100) shift()` |
| 清空 `m_redoStack` | ✅ 有（但没判空） | ✅ 核心自带 |
| 格式与核心一致 | ✅ 一致（纯属巧合地写对了） | ✅ 天然一致 |
| 维护成本 | 核心新增字段时需同步改 | 0 |

**结论**：`wpf.pushUndoSnapshot` 应该改成对核心方法的**委托 + 兜底**，而不是自己实现一份。详见 §3。

---

## 1. BUG-005 🟡 低｜叠加层尺寸依赖隐式假设，且用 1 秒轮询兜底

> **级别已由「中」下调为「低」**，理由见 §0 订正 1。

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-measure.js:42-52`、`js/feature-select.js:43-53` |
| **置信度** | 高（代码事实）／影响程度：低 |

### 现象

两处 overlay canvas 只设置绘图缓冲区尺寸（`overlay.width/height`），**从不设置 CSS 尺寸**：

```js
function syncSize() {
  if (!overlay) return;
  const r = canvas.getBoundingClientRect();
  const hr = canvas.parentElement.getBoundingClientRect();
  overlay.style.left = (r.left - hr.left) + 'px';
  overlay.style.top  = (r.top  - hr.top ) + 'px';
  if (overlay.width !== canvas.width || overlay.height !== canvas.height) {
    overlay.width  = canvas.width;
    overlay.height = canvas.height;
  }
}
```

`<canvas>` 在没有 CSS 宽高时，其**布局尺寸 = width/height 属性值（CSS px）**。
这段代码成立的前提是 `canvas.width === canvas 的 CSS 宽度`。核心目前确实如此，但这是个**没人保证的耦合**。

### 触发条件（任一满足即错位）

1. 主 canvas 一旦引入 DPR 缩放（`canvas.width = cssW * dpr`）—— 当前没有，但未来可能加。
2. 给 `#wave-canvas` 加 CSS `width:100%` 之类的拉伸样式 —— 属性与 CSS 尺寸脱钩。
3. 窗口缩放后、核心尚未重绘的**中间帧**：canvas 属性还是旧值，CSS 尺寸已是新值。
4. 叠加层被浏览器缩放（`zoom`、系统缩放变化）。

### 影响

叠加层（框选虚线、测量光标、Δ 读数）与主波形**整体错位**，且错位是"差一点点"的量级，非常容易被误判成"坐标映射算错了"，从而去改根本没问题的 `hitTest` / `mapCanvasPosition` 逻辑。

### 顺带的问题：`setInterval(syncSize, 1000)`（`feature-measure.js:161`）

```js
// 画布重绘后叠加层可能错位（缩放等），监听一次低频同步
setInterval(syncSize, 1000);
```

一个**永不释放的 1 秒定时器**，页面生命周期内一直跑。这是"不确定什么时候该同步，那就每秒同步一次"的兜底写法，掩盖了真正的问题（没有尺寸变化通知）。

### 修复方案

**1）`syncSize` 显式同步 CSS 尺寸，切断对 `canvas.width` 的隐式依赖：**

```js
function syncSize() {
  if (!overlay) return;
  const r  = canvas.getBoundingClientRect();
  const hr = canvas.parentElement.getBoundingClientRect();
  overlay.style.left   = (r.left - hr.left) + 'px';
  overlay.style.top    = (r.top  - hr.top ) + 'px';
  // 显式设置 CSS 尺寸：叠加层的显示大小只跟 canvas 的布局大小走
  overlay.style.width  = r.width  + 'px';
  overlay.style.height = r.height + 'px';
  // 缓冲区尺寸用布局尺寸（如需支持 DPR，再乘 devicePixelRatio 并 ctx.scale）
  const bw = Math.max(1, Math.round(r.width));
  const bh = Math.max(1, Math.round(r.height));
  if (overlay.width !== bw || overlay.height !== bh) {
    overlay.width  = bw;
    overlay.height = bh;   // 注意：赋值会重置 ctx 状态，之后需重绘
  }
}
```

**2）用 `ResizeObserver` 替换 `setInterval`：**

```js
if (window.ResizeObserver) {
  new ResizeObserver(function () { scheduleDraw(); }).observe(canvas);
} else {
  window.addEventListener('resize', onResize);   // 降级
}
// 删除 setInterval(syncSize, 1000)
```

### 验收

1. 缩放浏览器窗口 → 框选虚线与测量光标**始终贴合**波形格线，无滞后、无偏移。
2. 在 DevTools 里给 `#wave-canvas` 临时加 `style="width:120%"` → 叠加层**按比例跟随**，而不是错位。（修复前会错位，此条用于证明修复有效）
3. 打开 Performance 面板录制 30 秒 → 无 1 秒周期的定时器回调。

---

## 2. BUG-006 🟠 中｜框选起拖于信号区外时，选区被静默扩大到信号 0

> **定性已修正**，见 §0 订正 2。不是"崩溃"，是"静默给出错误选区"——从可诊断性角度看反而更糟。

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-select.js:81-97`（`regionFromPoints`） |
| **置信度** | 高 |

### 现象与根因

```js
function regionFromPoints() {
  const x1 = Math.min(marquee.startX, marquee.curX);
  const x2 = Math.max(marquee.startX, marquee.curX);
  const y1 = Math.min(marquee.startY, marquee.curY);
  const y2 = Math.max(marquee.startY, marquee.curY);
  const midY = (y1 + y2) / 2;
  const mStart  = window.mapCanvasPosition(x1, midY);
  const mEnd    = window.mapCanvasPosition(x2, midY);
  const mTop    = window.mapCanvasPosition(x1, y1);
  const mBottom = window.mapCanvasPosition(x1, y2);
  const sigStart = Math.max(0, Math.min(mTop.signalIndex, mBottom.signalIndex));  // ←①
  const sigEnd   = Math.max(mTop.signalIndex, mBottom.signalIndex);               // ←②
  if (sigStart < 0 || sigEnd < 0) return null;                                    // ←③ 死代码
  const sampleStart = Math.max(0, Math.min(mStart.signalSampleIndex, mEnd.signalSampleIndex));
  const sampleEnd   = Math.max(mStart.signalSampleIndex, mEnd.signalSampleIndex);
  return { signalStart: sigStart, signalEnd: sigEnd,
           sampleStart: sampleStart, sampleEnd: sampleEnd };
}
```

三处问题：

| 标记 | 问题 |
|---|---|
| ① | `Math.max(0, ...)` 把越界的 `-1` **夹成 0**。用户从名称区起拖（此处 `signalIndex === -1`），`sigStart` 变成 0 —— 选区被**静默向上扩大到第一个信号**。 |
| ② | `sigEnd = Math.max(-1, -1) = -1` 时才会走到 ③；但只要上下任一端命中真实信号，另一端是 `-1` 也会被当成"有效参与"，只是被 `Math.max` 忽略——行为恰好正确，属于**侥幸**。 |
| ③ | 因为 ① 的 `Math.max(0, ...)`，`sigStart` **永远不可能 < 0**，这个判断的前半段是**死代码**。 |

`sampleStart` 同理：`Math.max(0, ...)` 会把越界采样点夹成 0。

### 复现步骤

1. 新建工程，添加 3 个 Bit 信号（`clk` / `data` / `rst`）。
2. 选择工具（tool-select）。
3. **从信号名区域（左侧名称列）按住左键向下拖到第 3 行**，松手。
4. 观察：选区从第 1 行（`clk`）开始，而不是从第 3 行。

**预期**：起拖点在有效波形区之外时，应视为无效选区（或至少从第一个真实命中的行开始，不应包含名称列对应的 0 号行偏移）。

更严重的场景：从**画布底部空白处**（最后一个信号下方）向上拖到最后一行 → `mBottom.signalIndex === -1`、`mTop.signalIndex === 2` → `sigEnd = max(-1, 2) = 2`，这个恰好正确；
但从**顶部标尺**向下拖 → `mTop = -1`、`mBottom = 2` → `sigStart = max(0, min(-1, 2)) = max(0, -1) = 0`，`sigEnd = 2` → 选中 0..2 全部三行，而用户可能只想选 1..2。

### 影响

批量设值（设 1 / 设 0 / 翻转 / 清除）作用于**用户没打算选中的信号行**，且因为不报错，**用户会以为是自己拖错了**，反复重试。属于"消耗信任"型缺陷。

### 修复方案

**核心思路：先过滤掉 `-1`，再取 min/max；同时对 `null` 做兜底。**

```js
// 哨兵：几何越界时 mapCanvasPosition 返回全 -1 对象；极端情况（文档/画布缺失）返回 null
const EMPTY = {
  signalIndex: -1, signal: null, clickedOnName: false,
  mainStep: -1, signalSampleIndex: -1
};

function regionFromPoints() {
  const x1 = Math.min(marquee.startX, marquee.curX);
  const x2 = Math.max(marquee.startX, marquee.curX);
  const y1 = Math.min(marquee.startY, marquee.curY);
  const y2 = Math.max(marquee.startY, marquee.curY);
  const midY = (y1 + y2) / 2;

  const mStart  = window.mapCanvasPosition(x1, midY) || EMPTY;
  const mEnd    = window.mapCanvasPosition(x2, midY) || EMPTY;
  const mTop    = window.mapCanvasPosition(x1, y1  ) || EMPTY;
  const mBottom = window.mapCanvasPosition(x1, y2  ) || EMPTY;

  // 只保留真实命中的行，绝不把 -1 夹成 0
  const rows = [mTop.signalIndex, mBottom.signalIndex].filter(function (i) { return i >= 0; });
  const cols = [mStart.signalSampleIndex, mEnd.signalSampleIndex].filter(function (i) { return i >= 0; });
  if (!rows.length || !cols.length) return null;   // 完全落在波形区外 → 无效选区

  return {
    signalStart: Math.min.apply(null, rows),
    signalEnd:   Math.max.apply(null, rows),
    sampleStart: Math.min.apply(null, cols),
    sampleEnd:   Math.max.apply(null, cols)
  };
}
```

**同时建议在 UI 上给出反馈**：`onMouseUp` 中 `region` 为 `null` 时，清掉虚线框并（可选）在状态栏提示"选区不在波形区域内"，而不是静默什么都不做。

### 验收

1. 从名称列起拖到信号区 → **不选中任何行**（或仅选中真实命中的行），不出现"从 0 号行开始"。
2. 从顶部标尺向下拖 2 行 → 只选中真实命中的那 2 行。
3. 完全在画布底部空白处拖动 → 无工具条弹出，无异常。
4. 正常在波形区内框选 → 行为与修复前完全一致（回归）。

---

## 3. BUG-007 🟠 中｜撤销快照未复用核心方法：无上限裁剪 + `m_redoStack` 未判空

> **定性已修正**，见 §0 订正 3。原型丢失的担忧撤回；剩下两个真实问题，并给出一个更优的实现。

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-common.js:120-141`（`wpf.pushUndoSnapshot`） |
| **置信度** | 高 |

### 现有代码

```js
wpf.pushUndoSnapshot = function () {
  const dw = window.document_wave;
  if (!dw || !Array.isArray(dw.m_undoStack)) return false;
  const clone = function (v) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(v); } catch (e) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(v || []));
  };
  dw.m_redoStack.length = 0;                       // ← 问题 A：未判空
  dw.m_undoStack.push({
    signals: clone(dw.m_signals),
    markers: clone(dw.m_markers),
    timeJumps: clone(dw.m_timeJumps),
    timeSpanMarkers: clone(dw.m_timeSpanMarkers),
    arrows: clone(dw.m_arrows),
    textAnnotations: clone(dw.m_textAnnotations),
    sampleCount: dw.m_sampleCount,
    subStepCount: dw.m_subStepCount
  });                                              // ← 问题 B：无上限裁剪
  return true;
};
```

### 问题 A：`m_redoStack` 未判空（低危）

上一行刚判过 `m_undoStack` 是数组，下一行就无条件访问 `m_redoStack.length`。
两者在核心中总是成对初始化，所以**实际触发概率很低**；但一旦 `WaveDocument` 被重建到中间状态（这恰恰是 BUG-004 的场景），这里会抛 `TypeError`，且发生在"用户正在操作"的路径上。

### 问题 B：撤销栈无上限裁剪（中危）

核心自己的 `pushUndoSnapshot` 有：

```js
if (this['m_undoStack'].length > 100) this['m_undoStack'].shift();
```

手写的这份**没有**。

**为什么会真的涨**：核心只在**它自己** push 时才裁剪。用户连续使用 feature 模块的批量操作（波form 生成器 F7、协议模板 F8，以及 BUG-003 修复后将要加入的绘制）时，**只有 feature 侧在 push，核心一次都不 push**，栈就会持续增长。

**内存量级估算**：
单个快照 = 全量深拷贝。以 `步数 1000 × 子步 3 × 信号 20` 为例，`values` 约 `1000 × 4 × 20 = 80,000` 个数字，加上 `labels` / `segmentStyles`（每个是对象）/ `driveStrengths` / `clockMarkers` / `waveDromColorCodes` 五个等长数组 → 单个快照约 **40 万个 JS 值**，保守估计 3~8 MB。
无上限时，连续点 50 次生成器 → **数百 MB**。

### 修复方案（推荐：委托给核心）

```js
wpf.pushUndoSnapshot = function () {
  const dw = window.document_wave;
  // 优先复用核心自带实现：它自带 100 条上限裁剪与 redo 栈清理，且格式天然一致
  if (dw && typeof dw.pushUndoSnapshot === 'function') {
    try { dw.pushUndoSnapshot(); return true; }
    catch (e) {
      if (window.console) console.warn('[wpf] 核心 pushUndoSnapshot 失败，回退手写实现', e);
    }
  }
  // 兜底：保持与核心完全一致的 8 字段格式，补上判空与上限
  if (!dw || !Array.isArray(dw.m_undoStack)) return false;
  const clone = function (v) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(v); } catch (e) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(v == null ? [] : v));
  };
  if (Array.isArray(dw.m_redoStack)) dw.m_redoStack.length = 0;   // 判空
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
  if (dw.m_undoStack.length > 100) dw.m_undoStack.shift();        // 与核心一致的裁剪
  return true;
};
```

> ⚠ **命名陷阱**：`window.document_wave.pushUndoSnapshot` 与 `window.__wpf.pushUndoSnapshot` **同名**。
> 在 `feature-common.js` 内部写 `wpf.pushUndoSnapshot()` 调的是后者，写 `dw.pushUndoSnapshot()` 才是前者。
> 改这段代码时要格外小心，建议改名以区分（例如把 `wpf` 侧的改名为 `wpf.snapshot()`，各调用点同步改），或在注释里写明。

### 验收

1. 控制台执行：
   ```js
   const dw = window.document_wave;
   for (let i = 0; i < 300; i++) window.__wpf.pushUndoSnapshot();
   console.log('undo 栈长度 =', dw.m_undoStack.length);   // 期望 ≤ 100
   ```
2. 连续执行 30 次「波形生成器」→ 内存占用（任务管理器里 Edge 进程）不应线性飙升。
3. 执行生成器 → 按 Ctrl+Z → 波形回到生成器执行前（回归，验证委托没改坏格式）。
4. 生成器 → Ctrl+Z → 再 Ctrl+Y（重做）→ 波形恢复（验证 redo 栈被正确清空/回填）。

---

## 4. BUG-008 🟠 中｜行高探测逐像素扫描，拖拽时每秒上万次坐标映射

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-common.js:58-77`（`wpf.signalRowBand`） |
| **置信度** | 高 |

### 根因

```js
wpf.signalRowBand = function (clientX, clientY, signalIndex) {
  const canvas = wpf.canvas();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const toCanvasY = function (cy) { return cy - rect.top; };
  let top = toCanvasY(clientY);
  let bottom = top;
  const guard = 200;
  while (top > 0 && guard > bottom - top) {                     // ← 向上逐像素
    const m = window.mapCanvasPosition(clientX - rect.left, top - 1);
    if (!m || m.signalIndex !== signalIndex) break;
    top -= 1;
  }
  while (bottom < rect.height - 1 && guard > bottom - top) {    // ← 向下逐像素
    const m = window.mapCanvasPosition(clientX - rect.left, bottom + 1);
    if (!m || m.signalIndex !== signalIndex) break;
    bottom += 1;
  }
  return { top: top, bottom: bottom, height: bottom - top + 1 };
};
```

行高默认约 40px，实际要扫 **~40 次**；如果某行被设为高行（`uiRowHeightHint`）或用户放大了行高，`guard = 200` 允许最多扫 **400 次**（上下各 200）。

### 调用频率

`feature-draw.js:42` 在 `hitTest()` 里调用它，而 `hitTest()` 在 `paintAt()` 里被调用，`paintAt()` 又挂在 **`mousemove`** 上：

```js
function onMouseMove(e) {
  if (!drag.active) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  paintAt(e);          // → hitTest() → signalRowBand() → 最多 400 次 mapCanvasPosition
}
```

`mapCanvasPosition` 不是廉价函数，它内部要调 `getDynamicNameWidth()`、`document_wave.getSignals()`、做若干除法和取整。

**量级估算**：mousemove 在高刷屏上可达 120 次/秒。
`120 × 400 = 48,000 次/秒`（最坏情况），典型情况 `60 × 40 = 2,400 次/秒`。

### 影响

- 低端机 / 大工程（信号多 → `getSignals()` 返回大数组）上拖拽绘制**明显掉帧**。
- 这是"越用越卡"型问题：信号越多、行越高，越卡。
- 与 BUG-003 修复（在 `onMouseDown` 压快照）叠加时，`structuredClone` 全量深拷贝 + 高频映射，卡顿会更明显。

### 修复方案（推荐：二分查找，改动小且保持语义）

信号行的 y 区间是**连续且单调**的（同一行内 `signalIndex` 不变，跨行才变），满足二分前提。

```js
wpf.signalRowBand = function (clientX, clientY, signalIndex) {
  const canvas = wpf.canvas();
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y0 = clientY - rect.top;
  const maxY = Math.floor(rect.height) - 1;
  if (y0 < 0 || y0 > maxY) return null;

  const hit = function (y) {
    const m = window.mapCanvasPosition(x, y);
    return !!m && m.signalIndex === signalIndex;
  };
  if (!hit(y0)) return null;   // 起点就不在这一行 → 直接放弃（旧实现会返回 height:1 的退化结果）

  // 向上找上边界：最小满足 hit 的 y
  let lo = 0, hi = y0;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (hit(mid)) hi = mid; else lo = mid + 1;
  }
  const top = hi;

  // 向下找下边界：最大满足 hit 的 y
  lo = y0; hi = maxY;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (hit(mid)) lo = mid; else hi = mid - 1;
  }
  const bottom = lo;

  return { top: top, bottom: bottom, height: bottom - top + 1 };
};
```

**复杂度**：`O(log n)`，上边界 + 下边界合计约 `2 × log2(400) ≈ 18` 次 → 相比最坏 400 次**降低 ~95%**，相比典型 40 次降低 ~55%。

### 可选增强：一次拖拽只算一次

`signalRowBand` 的结果在一次拖拽过程中**只在跨行时才变**。可以加一个按 `signalIndex` 的记忆化，在同一次 drag 内复用：

```js
let bandCache = null;   // { key, value }
// key = signalIndex + '|' + rect.height + '|' + document_wave.m_sampleCount
```

`feature-draw.js` 的 `hitTest` 里检测到 `signalIndex` 未变就直接复用缓存。
**注意**：缓存必须在 `resize` / `zoom` / 撤销重做后失效，否则会用到过期几何。建议以 `rect.height + m_sampleCount + m_subStepCount` 参与 key。

### 验收

1. 在 `signalRowBand` 入口加计数器，一次 3 秒的拖拽绘制 → 调用次数应 ≤ 原来最坏情况的 1/10。
2. 功能回归：上半区画 1、下半区画 0 的分界**与视觉中线一致**（尤其行高被改大的信号）。
3. 跨行拖动时，进入新行的第一个格子就能正确按新行的上下半区取值（验证缓存/二分没有跨行粘连）。
4. 用 Performance 面板录制一次拖拽 → `mapCanvasPosition` 不再占据主要耗时。

---

## 5. BUG-009 🟡 低｜子步数填 `0` 被 `||` 当作假值吞掉，无法生效

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-resize.js:122`（`readSpins`）、`js/feature-resize.js:143-144`（`change` 处理器） |
| **置信度** | 高 |

### 根因

```js
// 第 114-124 行
function readSpins() {
  const s = document.getElementById('sample-spin');
  const b = document.getElementById('substep-spin');
  const steps = s ? Number(s.value) : NaN;
  const subs  = b ? Number(b.value) : NaN;
  return {
    steps: Number.isFinite(steps) && steps >= 4 ? Math.floor(steps) : null,
    subs:  Number.isFinite(subs)  && subs  >= 0 ? Math.floor(subs ) : null   // 0 是合法值，返回 0
  };
}

// 第 141-145 行
const spins = readSpins();
const cur   = currentCounts();
const newSteps = spins.steps || cur.steps;
const newSubs  = spins.subs  || cur.subs;     // ← 0 || cur.subs === cur.subs，0 被吞掉
if (newSteps === cur.steps && newSubs === cur.subs) return;   // 于是这里直接 return，什么都不做
```

`readSpins()` **正确**地把 `0` 解析成了 `0`（`subs >= 0` 允许 0）。
但调用方用 `||` 取值，`0` 是 falsy，于是回退到 `cur.subs`，导致**设置子步数为 0 永远是静默无效**。

### 现象

用户把「子步数」输入框改成 `0` → 回车/失焦 → **数字跳回原值**，波形毫无变化，无报错、无提示。

### 影响

- 低危：子步数 0（即"每步只有 1 个格子"，`stride = 1`）是个合理需求——画简单时序图时不希望每步被拆成多格。
- 但它是**静默失败**，用户会以为软件坏了。

### 修复方案

把"`||` 取默认值"换成"显式的 `null` 判断"，保留 `0`：

```js
const spins = readSpins();
const cur = currentCounts();
// 注意：0 是合法值，必须用 == null 判断，不能用 ||
const newSteps = (spins.steps == null) ? cur.steps : spins.steps;
const newSubs  = (spins.subs  == null) ? cur.subs  : spins.subs;
if (newSteps === cur.steps && newSubs === cur.subs) return;
resizeSignals(newSteps, newSubs);
```

> `== null` 同时覆盖 `null` 和 `undefined`，且**不会**把 `0` 判为缺失，是本场景最合适的写法。
> （若担心团队代码规范禁止 `==`，可用 `spins.subs === null || spins.subs === undefined ? cur.subs : spins.subs`，语义等价但啰嗦。）

### 顺带检查同一模式的其它位置

请在修复时全局搜索 `|| cur.` / `|| default` 形式的取值，确认没有第二处把 `0` 当缺失的写法。
特别是 `js/feature-resize.js:120` 的 `steps >= 4` 下限——如果用户填 `3`，`readSpins` 返回 `null`，会静默回退到当前值，同样无提示。**建议一并加上越界提示**（在 `#sim-status` 或标题栏提示"步数需在 4 ~ N 之间"）。

### 验收

1. 子步数改为 `0` → 回车 → `values.length === 步数 × 1`，每步只有 1 格，波形显示正常。
2. 子步数改为 `0` 后再改回 `3` → `values.length === 步数 × 4`，子格内容按主值铺开。
3. 步数改为 `3`（低于下限）→ 应给出提示，而不是静默无反应。
4. 步数/子步数改为非法字符（如 `abc`）→ 行为与修复前一致（静默回退，不崩）。

---

## 6. BUG-010 🟡 低｜批量操作浮动工具条无全局关闭，且 Escape 后残留

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-select.js:151-185`（`showBar` / `hideBar` / `hideBarKeepSelection`）、`js/feature-shortcuts.js:66-72` |
| **置信度** | 高 |

### 现象一：工具条不会自动消失

`showBar()` 把 `<div id="wpf-batch-bar">` 挂到 `document.body` 上（`position:fixed; z-index:300`）。
但**只有一条路径会移除它**：

```js
function onMouseDown(e) {
  if (e.button !== 0) return;
  if (e.target !== canvas) return;          // ← 点画布以外，直接 return
  if (wpf.currentTool() !== 'select') return;  // ← 切到别的工具，也直接 return
  if (bar) hideBar();
  ...
}
```

于是：

| 用户操作 | 工具条 |
|---|---|
| 切到「画笔」工具后在画布上点一下 | ❌ 不消失 |
| 点顶部菜单 / 侧边栏 / 输入框 | ❌ 不消失 |
| 滚动页面（工具条是 `fixed`） | ❌ 不消失，且**与选区脱节** |
| 按 Ctrl+Z 撤销（选区数据已变） | ❌ 不消失，此时点「设 1」会作用在**已改变的**波形上 |
| Alt+点击放测量光标 | ❌ 不消失 |

### 现象二：Escape 之后工具条残留（这个是确定的 Bug）

`feature-shortcuts.js` 的 Escape 分支：

```js
if (e.key === 'Escape') {
  if (window.__wpf.selection) window.__wpf.selection = null;   // ← 只清了数据
  if (typeof window.clearSelection === 'function') window.clearSelection();
  wpf.scheduleRedraw();
  return;
}
```

它把 `__wpf.selection` 置空了，但**没有移除 `bar` 这个 DOM 节点**，也没有清掉 overlay 上的虚线框。

**后果**：按 Escape 后，工具条**仍然显示在屏幕上**。此时点「设 1」→ `applyValues()` → `const region = window.__wpf.selection; if (!region) return;` → **静默什么都不做**。
用户看到的现象是："按了 Escape，工具条还在，但所有按钮都失灵了。" 这是非常典型的"看起来像崩溃"的体验问题。

### 影响

- 遮挡画布内容。
- 与当前数据状态不一致（撤销后仍可点），可能产生**用户没预期的写入**。
- Escape 后按钮失灵，用户会认为程序挂了。

### 修复方案

**1）在 `feature-select.js` 内加全局关闭逻辑**（捕获阶段，先于其它模块）：

```js
// 点击工具条以外任何地方 → 关闭
document.addEventListener('mousedown', function (e) {
  if (!bar) return;
  if (bar.contains(e.target)) return;      // 点工具条内部不关（按钮自己有 stopPropagation）
  hideBar();
  drawMarquee();                            // 同时清掉 overlay 上的虚线框
}, true);

// 窗口失焦 / 滚动 / 缩放 → 关闭
window.addEventListener('blur', function () { if (bar) { hideBar(); drawMarquee(); } });
window.addEventListener('resize', function () { if (bar) { hideBar(); drawMarquee(); } });
window.addEventListener('scroll', function () { if (bar) { hideBar(); drawMarquee(); } }, true);
```

**2）Escape 关闭工具条**：`feature-shortcuts.js` 的 Escape 分支改为同时清 DOM。
由于 `bar` 是 `feature-select.js` 的模块私有变量，跨模块访问需要一个约定。建议：

```js
// feature-select.js 内（模块末尾）
window.__wpf.closeBatchBar = function () {
  if (!bar) return false;
  hideBar();
  drawMarquee();
  return true;
};

// feature-shortcuts.js 的 Escape 分支
if (e.key === 'Escape') {
  if (typeof window.__wpf.closeBatchBar === 'function') window.__wpf.closeBatchBar();  // 先关工具条
  else if (window.__wpf.selection) window.__wpf.selection = null;
  if (typeof window.clearSelection === 'function') window.clearSelection();
  wpf.scheduleRedraw();
  return;
}
```

> 注意 `hideBar()` 内部已经会置 `window.__wpf.selection = null`，所以调 `closeBatchBar()` 就不需要再单独清 `selection`。

**3）`hideBar()` 与 `drawMarquee()` 的调用要成对**：目前 `hideBar()` 只清 `bar` 和 `selection`，**不清 overlay 上的虚线**。所有调用 `hideBar()` 的地方都应跟一次 `drawMarquee()`，否则会留下"幽灵选区"。

### 验收

1. 框选 → 出现工具条 → 切到画笔工具 → 工具条消失。
2. 框选 → 点顶部菜单 → 工具条消失。
3. 框选 → **按 Escape** → 工具条消失、虚线框消失。
4. 框选 → 按 Ctrl+Z → 工具条消失（避免作用于已变更的数据）。
5. 框选 → 点工具条上的「设 1」→ 波形写入、工具条**保留**（按钮内部有 `ev.stopPropagation()`，不应被全局关闭逻辑误伤）。
6. 框选 → 点「取消」→ 工具条消失、虚线框消失。

---

## 7. BUG-011 🟡 低｜端口文件只写不删，`%TEMP%` 持续累积

| 项 | 内容 |
|---|---|
| **位置** | `WavePaintLauncher.cs:24`（定义）、`:93`（写入）、`:468-523`（`Main`，无删除） |
| **置信度** | 高 |

### 根因

```csharp
// 第 24 行
static string portFile = Path.Combine(Path.GetTempPath(),
    "WavePaintSim_port_" + Process.GetCurrentProcess().Id + ".txt");

// 第 93 行（StartServer 内）
try { File.WriteAllText(portFile, port.ToString()); } catch { }

// 第 521-522 行（Main 末尾）
try { server.Stop(); } catch { }
return 0;          // ← 结束，没有 File.Delete(portFile)
```

已用检索确认：整个 `.cs` 文件中 **`File.Delete` 一次都没有出现过**（只有 5 处 `Directory.Delete`，全部是删工作目录/资源目录）。

### 影响

- 每启动一次就多一个 `WavePaintSim_port_<PID>.txt`。长期使用后 `%TEMP%` 里堆积成百上千个小文件。
- 直接影响 `OpenExistingInstance()`（第 441 行）：

```csharp
var files = Directory.GetFiles(Path.GetTempPath(), "WavePaintSim_port_*.txt");
foreach (var file in files)
{
    ...
    using (var tcp = new System.Net.Sockets.TcpClient())
    {
        var connect = tcp.BeginConnect("127.0.0.1", port, null, null);
        if (!connect.AsyncWaitHandle.WaitOne(500)) continue;    // ← 每个死端口最多等 500ms
        ...
    }
}
```

**缓解因素**：连本机已关闭端口会立刻 `Connection Refused`，通常不会真的等满 500ms。所以实际退化没那么严重，但文件数多时 `Directory.GetFiles` 本身和 TcpClient 的创建/销毁仍有开销。

- 更实际的麻烦：`%TEMP%` 里堆满文件会影响用户手工排查（想找当前端口时要在一堆历史文件里挑）。

### 修复方案

**1）`Main` 退出前删除自己的端口文件**（用 `try/finally` 保证异常路径也执行）：

```csharp
[STAThread]
static int Main()
{
    if (!TryAcquireSingleInstance())
    {
        OpenExistingInstance();
        return 0;
    }
    try
    {
        // ... 原有主体（ExtractResources / StartServer / 启动 Edge / 主循环）...
    }
    finally
    {
        try { server.Stop(); } catch { }
        try { if (File.Exists(portFile)) File.Delete(portFile); } catch { }
    }
}
```

> ⚠ `Main` 目前的结构是线性代码 + 中间的 `return 1`（Edge 未找到 / 启动失败）。
> 改成 `try/finally` 时要保证**所有 `return` 都在 try 内部**，否则 `return 1` 会跳过 finally。
> 建议把主体抽成 `static int Run()`，`Main` 只负责 `try { return Run(); } finally { 清理 }`。

**2）`OpenExistingInstance` 顺手清理死文件**（可选但推荐）：

```csharp
foreach (var file in files)
{
    try
    {
        string portText = File.ReadAllText(file).Trim();
        int port;
        if (!int.TryParse(portText, out port)) { TryDelete(file); continue; }
        bool alive = false;
        using (var tcp = new System.Net.Sockets.TcpClient())
        {
            var connect = tcp.BeginConnect("127.0.0.1", port, null, null);
            if (connect.AsyncWaitHandle.WaitOne(500))
            {
                try { tcp.EndConnect(connect); alive = true; } catch { }
            }
        }
        if (!alive) { TryDelete(file); continue; }   // 端口已死 → 删掉这个陈旧文件
        // ... 原有启动 Edge 的逻辑 ...
    }
    catch { }
}
```

其中 `TryDelete` 是 `try { File.Delete(f); } catch { }` 的小包装（C# 4.0 不支持本地函数，写成私有静态方法）。

### 验收

1. 启动 → 关闭 → `%TEMP%\WavePaintSim_port_*.txt` **数量回到 0**。
2. 强制结束进程（`taskkill /F`）→ 下次启动时，陈旧文件应在 `OpenExistingInstance` 中被清理（若已实现第 2 点）。
3. 起 A 实例 → 再启动一次 → 应打开 A 的窗口（单实例逻辑不受影响）。

---

## 8. BUG-012 🟡 低｜进程参数用空格拼接，文件名含空格时编译失败

| 项 | 内容 |
|---|---|
| **位置** | `WavePaintLauncher.cs:353`（`Run` 方法） |
| **置信度** | 高 |

### 根因

```csharp
static int Run(string exe, string workDir, List<string> args, int timeoutMs, out string stderr)
{
    var psi = new ProcessStartInfo();
    psi.FileName = exe;
    psi.WorkingDirectory = workDir;
    psi.Arguments = string.Join(" ", args);      // ← 裸拼，无引号
    ...
}
```

`args` 的来源（`BuildCompileBatches`，第 271-304 行）最终追溯到 `WriteOne`（第 318-323 行）：

```csharp
static void WriteOne(string work, List<string> names, string name, string content)
{
    string safe = Path.GetFileName(name);        // 只去掉路径，不去空格
    File.WriteAllText(Path.Combine(work, safe), content, new UTF8Encoding(false));
    names.Add(safe);
}
```

文件名来自前端 `@@FILE:<name>` 标记，是**用户在仿真面板里输入的**。

### 触发条件与现象

用户给 Verilog 源文件起名 `my design.v`（含空格），或 `top module.sv`。

- 实际传给 iverilog 的命令行变成：`iverilog -g2012 -s tb -o sim.vvp my design.v`
- iverilog 认为要编译 3 个文件：`my`、`design.v`（以及把 `-s` 的参数搞乱）
- 报错：`Unable to find the source file "my"` 之类，或者更糟——**恰好存在同名文件而静默编译了错误的东西**。
- 前端只会看到一句 `IVERILOG-ERROR:` + 英文报错，用户完全无法理解发生了什么。

### 影响

- 中低危：用户起带空格的文件名就完全无法仿真，且错误信息指向错误的方向。
- 中文文件名同理（不涉及编码问题，纯粹是分词问题）。

### 修复方案

给每个参数加引号并转义内部引号/反斜杠：

```csharp
static string QuoteArg(string arg)
{
    if (string.IsNullOrEmpty(arg)) return "\"\"";
    // 反斜杠序列在紧邻结束引号时需要加倍，其余照写
    var sb = new StringBuilder(arg.Length + 8);
    sb.Append('"');
    for (int i = 0; i < arg.Length; i++)
    {
        int backslashes = 0;
        while (i < arg.Length && arg[i] == '\\') { backslashes++; i++; }
        if (i == arg.Length)
        {
            sb.Append('\\', backslashes * 2);      // 结尾的反斜杠要加倍
            break;
        }
        else if (arg[i] == '"')
        {
            sb.Append('\\', backslashes * 2 + 1);
            sb.Append('"');
        }
        else
        {
            sb.Append('\\', backslashes);
            sb.Append(arg[i]);
        }
    }
    sb.Append('"');
    return sb.ToString();
}

// 第 353 行改为：
var sbArgs = new StringBuilder();
foreach (var a in args)
{
    if (sbArgs.Length > 0) sbArgs.Append(' ');
    sbArgs.Append(QuoteArg(a));
}
psi.Arguments = sbArgs.ToString();
```

> 注：C# 4.0 环境，`StringBuilder` / `foreach` 均可用。避免用 `string.Join(" ", args.Select(...))`（需要 `using System.Linq`，虽然 .NET 4.0 有，但本项目风格偏保守，且手写更可控）。

**同一处还有个日志用的拼接（第 233 行）**，`string.Join(" ", compileArgs)` 只用于写日志，**不需要改**（引号反而影响可读性），但建议在日志里也用 `[` + arg + `]` 包起来，方便看出分词。

### 验收

1. 在仿真面板新建源文件，命名为 `my design.v`，写一个简单 module → 点 Sim → **编译成功**，结果正确。
2. 文件名为 `测试 module.sv` → 编译成功。
3. 文件名为普通 `design.v` → 行为与修复前一致（回归）。
4. 查看 `%TEMP%\WavePaintSim_sim.log` 中 `RUN args` 一行 → 带空格的文件名被引号包裹。

---

## 9. BUG-013 🟡 低（安全）｜本地服务开放跨源 + 静态服务缺目录逃逸校验

| 项 | 内容 |
|---|---|
| **位置** | `WavePaintLauncher.cs:112-114`（CORS）、`:167-175`（静态文件服务） |
| **置信度** | 高 |

### 9.1 CORS：`Access-Control-Allow-Origin: *`

```csharp
context.Response.AddHeader("Access-Control-Allow-Origin", "*");
context.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
context.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
if (context.Request.HttpMethod == "OPTIONS") { context.Response.StatusCode = 200; context.Response.Close(); return; }
```

**关键点：页面本来就由这个 HttpListener 同源提供**（`http://127.0.0.1:<port>/index.html`），前端 `fetch('/api/sim')` 是**同源请求，根本不需要 CORS**。这三个头是纯粹的多余攻击面。

**威胁模型**：
1. 用户在浏览器里访问任意恶意网页。
2. 该网页用 JS 扫描 `127.0.0.1` 的常用端口（或暴力扫全端口），找到 WavePaintSim 的端口。
3. 因为有 `ACAO: *`，恶意网页能**读取响应内容**。
4. → 可远程调用 `/api/sim`（任意 Verilog 代码执行，虽受限但仍可执行本地程序链）、`/api/snapshot`（写入文件）、以及**读取任意本地文件内容**（见 9.2）。

**实际风险评级**：低~中。需要用户同时（a）运行着本程序（b）访问恶意页面（c）被扫到端口。但**修复成本几乎为零**。

### 9.2 静态文件服务缺目录逃逸校验

```csharp
if (string.IsNullOrEmpty(path)) path = "index.html";
path = path.Replace('/', Path.DirectorySeparatorChar);
string file = Path.Combine(root, path);
if (!File.Exists(file)) { context.Response.StatusCode = 404; context.Response.Close(); return; }
lastActivity = Environment.TickCount;
context.Response.ContentType = MimeFor(Path.GetExtension(file));
byte[] fileData = File.ReadAllBytes(file);          // ← 无任何路径归属校验
context.Response.OutputStream.Write(fileData, 0, fileData.Length);
```

`Path.Combine(root, "../../Windows/win.ini")` 会解析成 `C:\Windows\win.ini`（如果 root 在 C 盘且层级够）。
`Path.Combine` **不会**规范掉 `..`。

浏览器通常会在发送前规范化 URL 中的 `..`，但这**不是安全边界**——任何非浏览器的 HTTP 客户端（curl、脚本、以及上面 9.1 里的恶意页面用 `fetch` 配 `ACAO:*`）都可以发送未规范化的路径。

**两个问题叠加后的完整攻击链**（这才是真正需要关注的）：

> 恶意网页 → 扫到端口 → `fetch('http://127.0.0.1:PORT/../../Users/<用户名>/Documents/xxx.docx')`
> → 服务端 `Path.Combine` 解析出真实路径 → `File.ReadAllBytes` 读出来
> → 响应带 `Access-Control-Allow-Origin: *` → **恶意网页拿到用户本地文件内容并上传**

### 修复方案（两处都改，缺一不可）

**1）删除全部 CORS 头与 OPTIONS 分支**（第 112-115 行整段删掉）：

```csharp
// 删除这三行 AddHeader 和 OPTIONS 分支：
// context.Response.AddHeader("Access-Control-Allow-Origin", "*");
// context.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
// context.Response.AddHeader("Access-Control-Allow-Headers", "Content-Type");
// if (context.Request.HttpMethod == "OPTIONS") { ... }
```

这与前端不冲突：`sim-bridge.js` 是从同源页面发起 `fetch`，同源请求不受 CORS 限制，不需要预检（且 `Content-Type: text/plain` 属于简单请求，不触发预检）。

**⚠ 修复前请先确认**：搜索 `sim-bridge.js` 中的 `fetch(` 调用，确认其 URL 是**同源相对路径**（形如 `'/api/sim'` 或相对路径），而不是写了完整的 `http://127.0.0.1:<port>/api/sim`。
如果前端是用从端口文件读到的绝对地址发起请求，那在某些 Edge 配置下会被判为跨源（127.0.0.1 vs localhost 视为不同源），此时不能简单删 CORS，需改为**按 Origin 白名单回显**：

```csharp
string origin = context.Request.Headers["Origin"];
string self = "http://127.0.0.1:" + port + "/";
if (!string.IsNullOrEmpty(origin) && origin == self.TrimEnd('/'))
{
    context.Response.AddHeader("Access-Control-Allow-Origin", origin);
    context.Response.AddHeader("Vary", "Origin");
}
```

**2）加路径归属校验**（第 167-175 行）：

```csharp
if (string.IsNullOrEmpty(path)) path = "index.html";
path = path.Replace('/', Path.DirectorySeparatorChar);

// 拒绝绝对路径与盘符（UNC、C:\ 等）
if (path.IndexOf(':') >= 0 || path.StartsWith("\\\\") || Path.IsPathRooted(path))
{
    context.Response.StatusCode = 400;
    context.Response.Close();
    return;
}

string file = Path.GetFullPath(Path.Combine(root, path));
string rootFull = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);

bool underRoot = file.StartsWith(rootFull + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
              || string.Equals(file, rootFull, StringComparison.OrdinalIgnoreCase);
if (!underRoot)
{
    context.Response.StatusCode = 403;
    context.Response.Close();
    return;
}

if (!File.Exists(file)) { context.Response.StatusCode = 404; context.Response.Close(); return; }
```

**3）（可选加固）绑定只监听回环并校验 Host 头**：

```csharp
if (!context.Request.Url.IsLoopback) { context.Response.StatusCode = 403; context.Response.Close(); return; }
```

（`Prefixes` 已经是 `http://127.0.0.1:<port>/`，理论上外部不可达，加一道校验属于纵深防御。）

### 验收

1. 正常启动 → 页面加载、Parse / 添加信号 / TB / Sim 全部功能正常（验证删 CORS 没有破坏同源请求）。
2. `curl --path-as-is "http://127.0.0.1:<PORT>/../../Windows/win.ini"` → 返回 **403**（修复前会返回文件内容）。
3. `curl -H "Origin: http://evil.example" "http://127.0.0.1:<PORT>/index.html"` → 响应中**不含** `Access-Control-Allow-Origin` 头。
4. `curl "http://127.0.0.1:<PORT>/js/feature-draw.js"` → 正常返回（正路径未被误杀）。
5. `curl "http://127.0.0.1:<PORT>/"` → 返回 index.html（`path` 为空的分支仍工作）。

---

## 10. BUG-014 🟡 低｜超时只 Kill 主进程，子进程树残留

| 项 | 内容 |
|---|---|
| **位置** | `WavePaintLauncher.cs:366-371`（`Run` 方法的超时分支） |
| **置信度** | 高 |

### 根因

```csharp
if (!process.WaitForExit(timeoutMs))
{
    try { process.Kill(); } catch { }        // ← 只杀 iverilog.exe / vvp.exe 本身
    stderr = "Process timed out after " + timeoutMs + " ms.";
    return -1;
}
```

已确认整个文件中 `.Kill()` 只出现这 1 次，没有 `taskkill /T` 之类的树杀逻辑。

**Icarus Verilog 是多进程工具链**：`iverilog.exe` 会派生 `ivl`、`ivlpp` 等子进程做预处理和代码生成。父进程被 Kill 后，子进程**不会被自动回收**（Windows 没有 Unix 的进程组终止语义）。

### 影响

1. **CPU/内存泄漏**：孤儿进程继续跑完整个编译，占用资源。用户看到"仿真超时"的提示，但 CPU 仍在 100%，风扇狂转。
2. **工作目录删除失败**：

```csharp
try { Directory.Delete(work, true); } catch { }     // ← 子进程持有文件句柄 → 删除失败 → 被静默吞掉
```

`RunSimulation` 的第 246 / 255 / 262 / 267 行都是这个写法。删除失败后，`%TEMP%\ivl_work_<GUID>\` 目录**永久残留**。
每次超时仿真泄漏一个目录（内含源文件 + 可能的 `sim.vvp`，后者可达数 MB）。

3. **后续仿真的不确定性**：残留进程持有旧工作目录句柄，理论上不影响新的随机 GUID 目录，但资源占用会累积。

### 修复方案

**1）杀进程树**：

```csharp
if (!process.WaitForExit(timeoutMs))
{
    KillTree(process.Id);
    stderr = "Process timed out after " + timeoutMs + " ms.";
    return -1;
}

// 新增（C# 4.0 兼容，私有静态方法，放在 Launcher 类内）
static void KillTree(int pid)
{
    try
    {
        var psi = new ProcessStartInfo("taskkill");
        psi.Arguments = "/PID " + pid + " /T /F";
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        using (var p = Process.Start(psi))
        {
            if (p != null) p.WaitForExit(5000);
        }
    }
    catch { }
    // taskkill 失败时兜底（例如 PATH 异常）
    try { Process.GetProcessById(pid).Kill(); } catch { }
}
```

> `taskkill` 是 Windows 系统自带（`C:\Windows\System32\taskkill.exe`），不需要额外依赖，符合"离线便携"约束。

**2）工作目录删除失败时不要静默**（至少记日志，便于排查）：

```csharp
static void DeleteWork(string work, string logFile)
{
    for (int attempt = 0; attempt < 3; attempt++)
    {
        try { if (Directory.Exists(work)) { Directory.Delete(work, true); return; } }
        catch (Exception ex)
        {
            try { File.AppendAllText(logFile,
                DateTime.Now.ToString("u") + " DELETE-RETRY " + attempt + " " + work
                + Environment.NewLine + ex.Message + Environment.NewLine); } catch { }
            Thread.Sleep(300);
        }
    }
    try { File.AppendAllText(logFile,
        DateTime.Now.ToString("u") + " DELETE-FAILED " + work + Environment.NewLine); } catch { }
}
```

把 4 处 `try { Directory.Delete(work, true); } catch { }` 替换为 `DeleteWork(work, logFile);`。

**3）（可选）启动时清扫陈旧工作目录**：在 `ExtractResources` 之后加一步，删除修改时间早于 24 小时的 `ivl_work_*` 目录：

```csharp
static void SweepStaleWorkDirs()
{
    try
    {
        string temp = Path.GetTempPath();
        foreach (var dir in Directory.GetDirectories(temp, "ivl_work_*"))
        {
            try
            {
                if (Directory.GetLastWriteTimeUtc(dir) < DateTime.UtcNow.AddHours(-24))
                    Directory.Delete(dir, true);
            }
            catch { }
        }
    }
    catch { }
}
```

### 验收

1. 构造一个死循环的 Verilog（如 `always #1 clk=~clk;` 配 `$finish` 缺失）→ 触发 30s 超时 →
   任务管理器中 **`ivl.exe` / `ivlpp.exe` / `iverilog.exe` 全部消失**（修复前会有残留）。
2. 超时后 `%TEMP%` 中**不残留** `ivl_work_*` 目录。
3. 正常（不超时的）仿真仍然成功，日志中无 `DELETE-FAILED`。
4. 人为让目录被占用（用记事本打开工作目录内文件）→ 日志中出现 `DELETE-RETRY` / `DELETE-FAILED`，程序不崩。

---

## 11. BUG-015 ⚪ 死代码｜`app.js` / `renderer.js` / `utils.js` 从未被加载（约 1.4k 行）

| 项 | 内容 |
|---|---|
| **位置** | `js/app.js`(1072 行)、`js/renderer.js`(270 行)、`js/utils.js`(21 行)、`css/styles.css` |
| **置信度** | 高 |

### 证据

已用全仓库检索（`.html` / `.js` / `.json` / `.ps1` / `.mjs`）确认：
`app.js` / `renderer.js` / `utils.js` 除了**彼此互相 import** 之外，**没有任何文件引用它们**。
`index.html` 中不存在对它们的 `<script>` 标签；`css/styles.css` 也没有 `<link>`。

唯一的引用链是：`js/model.js:1` → `import { uid, deepClone } from "./utils.js";`
而 `model.js` 只被 `sim-bridge.js` import（用到的是 `formatVectorValue` / `normalizeVectorValue`，**不是** `uid` / `deepClone`）。
所以 `utils.js` 是通过 `model.js` 被 ESM 加载的，但**其中没有任何函数被调用**（`uid` / `deepClone` / `clamp` / `saveJsonFile` 全部无调用点）。

### 这套死代码是什么

一套从零实现的「WaveWorkbench」Canvas 波形编辑器：自建数据模型、自建渲染管线、自建撤销栈、**自建 DOM 命中层**。
推测是被放弃的重写尝试——注意它的命名空间就叫 `WaveWorkbench`（与 `WavePaintLauncher.cs` 的 `namespace WaveWorkbench` 一致），而运行时实现用的是 `WavePaint`。

### 为什么必须处理（不只是"占地方"）

1. **最危险的一点：它会骗人。**
   一个接手的 AI 打开 `js/` 目录，看到 `app.js`（1072 行，文件名最像主程序）、`renderer.js`、`utils.js`，**极大概率会以为这才是主程序**，然后去改它，改完发现毫无效果，浪费大量时间。
   `01-项目背景与架构.md` 已经用醒目方式警告过这一点，但**最好的警告是让它不在那儿**。

2. **命中层的实现是一个已知的性能灾难**（`js/renderer.js:120-143`）：

```js
// 节选自 renderer.js 的 createHitLayer
// 为每个 (步 × 信号) 单元格创建一个 <button>，作为鼠标命中目标
```

按默认 4096 步 × 20 个信号计算 = **81,920 个 DOM 节点**，并且**每次 render 全量重建**（`app.js:542` 的 `persist()` 挂在每个 render 上）。
这段代码目前没跑，所以它只是"定时炸弹"——**一旦将来有人把它接回去，应用会直接卡死**。

3. `build.ps1` 的 `js\*` 通配会把这三个文件**一起打进 exe**（约 50 KB，体积影响可忽略，但增加了误解面）。

### 修复方案

**推荐：移到 `attic/` 目录，而不是直接删除。**

```powershell
# 在项目根目录执行
New-Item -ItemType Directory -Path "attic" -Force
Move-Item "js\app.js"       "attic\app.js.dead"
Move-Item "js\renderer.js"  "attic\renderer.js.dead"
Move-Item "css\styles.css"  "attic\styles.css.dead"
```

**关于 `utils.js` 要小心**：它被 `model.js` import，不能直接删/移，否则 `sim-bridge.js` 加载失败（ESM import 解析错误会导致整个模块不执行，仿真面板直接失效）。

处理顺序：

1. **先**改 `js/model.js:1`，去掉对 `utils.js` 的 import：
   ```js
   // 原来：import { uid, deepClone } from "./utils.js";
   // 检查 model.js 内部是否真的用到 uid / deepClone —— 若没用到，直接删除这一行
   ```
2. 确认 `model.js` 内无 `uid(` / `deepClone(` 调用后，**再**把 `utils.js` 移到 `attic/`。
3. 执行 `node --check` 与一次完整构建，确认 exe 能正常起、仿真功能正常。

**替代方案（更保守）**：不移动文件，只在三份文件的**头部**加醒目注释并保留：

```js
/* ============================================================
 * ⚠ 死代码 — 本文件从未被 index.html 或任何运行时模块加载。
 * 运行时实现是：混淆核心 js/wavepaint.63e6dade.js + js/feature-*.js
 * 请勿修改本文件，也不要从这里推测运行时行为。
 * 详见 work buddy bug info/01-项目背景与架构.md 第 2 节
 * ============================================================ */
```

### 验收

1. 移动后重新构建 exe → 应用正常启动，所有功能（绘制/框选/测量/生成器/模板/仿真）无变化。
2. 在 Edge DevTools 的 Sources 面板中确认 `app.js` / `renderer.js` **不再被加载**。
3. `node --check js/model.js` 通过；仿真面板的 Parse / Sim 功能正常。

---

## 12. BUG-016 ⚪ 隐患｜`uid()` 碰撞概率偏高 + `saveJsonFile` 立即回收 Blob URL

| 项 | 内容 |
|---|---|
| **位置** | `js/utils.js:5-7`（`uid`）、`js/utils.js:13-21`（`saveJsonFile`） |
| **置信度** | 中（逻辑成立；但因属死代码，当前影响为 0） |

### 12.1 `uid()` 碰撞

```js
export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
```

`Math.random().toString(36).slice(2, 8)` 取的是**尾数十六进制表示的 6 位**，取值空间约 `36^6 ≈ 2.18 × 10^9`。
但注意：`Math.random()` 的尾数只有 52 bit，且 `slice(2,8)` 取的是**小数部分的前 6 位**，实际熵约 `log2(36^6) ≈ 31 bit`。

**生日碰撞估算**：

| 生成的 ID 数 | 至少一次碰撞的概率 |
|---|---|
| 6,600 | ≈ 1% |
| 21,000 | ≈ 10% |
| 46,000 | ≈ 50% |

听起来很多？但结合 BUG-015 提到的 `renderer.js` 命中层——**一次 render 就创建 8 万个节点**。如果那套代码被启用，ID 碰撞**必然发生**，且表现为"点了 A 单元格却改到 B 单元格"的诡异行为。

**当前影响**：0（死代码）。**风险**：一旦有人复活这套代码就是定时炸弹。

### 12.2 `saveJsonFile` 立即回收 URL

```js
export function saveJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);      // ← 紧接着就回收
}
```

`anchor.click()` 在现代 Chromium 中**同步**启动下载，下载器会持有 Blob 的引用，所以立即 `revoke` 通常能工作。
但这依赖"下载已在 `click()` 返回前完成握手"这一**未写入规范的实现细节**。历史上 Firefox 与部分 Safari 版本出现过 `revokeObjectURL` 过早导致下载失败/得到 0 字节文件的问题。
另外 `anchor` 从未 `appendChild` 到 DOM —— 在部分浏览器中，未入文档的 `<a>` 上调用 `click()` 不触发下载（Firefox 早期行为）。

### 修复方案

**1）ID 生成改用 `crypto.randomUUID()`**（Edge 92+ 支持，本项目 Edge 由用户系统提供，均满足）：

```js
export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  // 兜底：用 crypto.getRandomValues 提高熵（仍不是 UUID，但远高于 base36 6 位）
  const buf = new Uint8Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return `${prefix}_${Array.from(buf, b => b.toString(16).padStart(2, "0")).join("")}`;
}
```

**注意**：本应用运行在 `http://127.0.0.1` 上，属于**安全上下文**，`crypto.randomUUID` 可用。（若是 `file://` 或 http 非本机，可能不可用，故保留兜底。）

**2）`saveJsonFile` 延迟回收 + 入文档**：

```js
export function saveJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);     // 部分浏览器要求节点在文档中
  anchor.click();
  document.body.removeChild(anchor);
  // 延迟回收：给下载器留出获取 Blob 的时间
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}
```

### 验收

1. 生成 100 万个 `uid()` → **零碰撞**（可用 `new Set()` 验证）。（修复前约 10 万个就可能出现碰撞）
2. 调用 `saveJsonFile` → 文件正常下载且内容完整（非 0 字节）。
3. 连续调用 5 次 → 5 个文件都完整。

---

## 13. BUG-017 ⚪ 隐患｜核心未就绪时 `ready()` 静默重试，功能集体失效且无任何提示

| 项 | 内容 |
|---|---|
| **位置** | `js/feature-common.js:25-40`（`wpf.ready`） |
| **置信度** | 高 |

### 根因

```js
wpf.ready = function (fn) {
  function attempt() {
    if (window.document_wave && typeof window.drawWaveform === 'function'
      && typeof window.updateSidePanels === 'function'
      && typeof window.mapCanvasPosition === 'function') {
      fn();
      return;
    }
    setTimeout(attempt, 100);       // ← 无限重试，永不报错
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { attempt(); }, { once: true });
  } else {
    attempt();
  }
};
```

**8 个 feature 模块 + 若干补丁全部依赖这个函数**。如果 4 个前置条件有任意一个不满足，所有模块**永远停在重试循环里**。

### 为什么会触发

1. 混淆核心加载失败（资源解压不完整、`js/wavepaint.63e6dade.js` 404）。
2. 核心内部抛异常，导致后面的 `window.drawWaveform = drawWaveform` 赋值**没执行到**。
3. 核心改版（原版 WavePaint 更新）后 API 改名。
4. `feature-common.js` 被排在混淆核心**之前**加载（脚本顺序被误改）——此时第一次 `attempt` 失败，靠 100ms 重试能救回来，**但会静默延迟 100ms+**，且如果核心最终没加载成功就永久静默。

### 影响

**症状是"所有新增功能同时失效，但原版功能完全正常"**。
用户/开发者看到的是：画笔能画（原版功能）、撤销能用（原版功能），但 TimeGen 上下半区绘制、框选、测量、生成器、模板**全都不工作**，控制台**一条错误都没有**。

这是本项目**最难排查的故障模式**——因为"没有报错"会让人以为"功能没实现"或"改的代码没生效"（尤其配合 `01-项目背景与架构.md` 坑 #2「改 JS 后忘记重建 exe」，两者症状完全一样）。

### 修复方案

**1）加重试上限与明确报错：**

```js
wpf.ready = function (fn, label) {
  const MAX_ATTEMPTS = 100;        // 100 × 100ms = 10 秒
  let attempts = 0;

  function missing() {
    const miss = [];
    if (!window.document_wave) miss.push('window.document_wave');
    if (typeof window.drawWaveform !== 'function') miss.push('window.drawWaveform');
    if (typeof window.updateSidePanels !== 'function') miss.push('window.updateSidePanels');
    if (typeof window.mapCanvasPosition !== 'function') miss.push('window.mapCanvasPosition');
    return miss;
  }

  function attempt() {
    const miss = missing();
    if (!miss.length) { fn(); return; }
    attempts += 1;
    if (attempts >= MAX_ATTEMPTS) {
      const msg = '[wpf.ready] 等待 WavePaint 核心就绪超时（10s），'
        + (label ? '模块=' + label + '；' : '')
        + '缺失的全局 API：' + miss.join(', ')
        + '。所有 feature 模块将不会初始化。'
        + '请检查 js/wavepaint.63e6dade.js 是否加载成功（DevTools → Network）。';
      if (window.console && console.error) console.error(msg);
      // 同时在页面上给出可见提示，避免"静默失效"
      wpf.reportFatal(msg);
      return;
    }
    setTimeout(attempt, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { attempt(); }, { once: true });
  } else {
    attempt();
  }
};
```

**2）加一个统一的可见提示函数**（放在 `feature-common.js`）：

```js
wpf.reportFatal = function (msg) {
  if (window.console && console.error) console.error(msg);
  try {
    let box = document.getElementById('wpf-fatal-banner');
    if (!box) {
      box = document.createElement('div');
      box.id = 'wpf-fatal-banner';
      box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;max-width:70vw;'
        + 'padding:10px 14px;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;'
        + 'font:12px/1.6 Consolas,monospace;color:#6b4c00;box-shadow:0 2px 10px rgba(0,0,0,.2);'
        + 'white-space:pre-wrap;';
      document.body.appendChild(box);
    }
    box.textContent = (box.textContent ? box.textContent + '\n' : '') + msg;
  } catch (e) { /* 兜底：至少控制台已经打出来了 */ }
};
```

**3）各模块调用时传入自己的名字**，便于定位是哪个模块在等：

```js
window.__wpf.ready(function () { ... }, 'feature-draw');
```

（这是**向后兼容**的改动：`label` 是可选参数，不改调用也不会坏。建议逐步补上。）

### 验收

1. 正常启动 → 无 banner，控制台无 `[wpf.ready]` 错误。
2. **人为验证**：在 DevTools 里 `delete window.mapCanvasPosition`，然后刷新页面 →
   10 秒后**控制台出现明确错误 + 页面出现黄色横幅**，指明缺失的是 `window.mapCanvasPosition`。
3. 在 DevTools Network 里把 `wavepaint.63e6dade.js` 设为 Block → 刷新 → 横幅应提示 4 个 API 全部缺失。

---

## 14. BUG-018 ⚪ 工程｜无版本控制、根目录有过期重复副本、无关项目残留

| 项 | 内容 |
|---|---|
| **位置** | 仓库根目录 |
| **置信度** | 高 |

### 14.1 🔴 没有 `.git`（最高优先级）

已确认：项目根目录**不存在 `.git` 目录**。

**这意味着**：
- 没有历史、没有 diff、没有回滚。
- 而本项目**恰恰是最需要回滚的**那种项目：混淆核心不可读、feature 模块之间靠事件捕获顺序耦合、改一处可能影响三个模块（见 `01-项目背景与架构.md` 第 6 节）。
- 一旦某次改动引入难以复现的交互 Bug，只能靠"记忆 + 肉眼看 diff"来恢复。

**这是整个改进清单里 ROI 最高的一项**：成本 1 分钟，收益是后面所有改动的安全网。

```bash
cd "d:\Files\Code\波形\WavePaintSim"
git init
git add -A
git commit -m "chore: 建立基线快照（WavePaintSim 只读审计后）"
```

**必须配 `.gitignore`**（否则 `ivl.zip` 等大文件入库，且每次构建产物都会污染 diff）：

```gitignore
# 构建产物
WavePaint.exe

# 大型二进制依赖（约 21MB，由外部提供，不入版本库）
ivl.zip

# 编辑器 / 系统
.vs/
.idea/
Thumbs.db
desktop.ini

# 临时目录（若存在）
tmp/
```

> ⚠ **`ivl.zip` 不能删**——`build.ps1` 需要它来内嵌 Icarus Verilog。
> 只是不进版本库。如果仓库只有你一个人用、且不在意体积，也可以选择**入库**（保证可重现构建）。
> 二选一即可，**但要明确选择并写进 README**，否则下一个人会困惑于"为什么构建失败"。

### 14.2 根目录存在过期重复副本（会骗人）

| 根目录副本 | 实际生效位置 | 说明 |
|---|---|---|
| `wavepaint.63e6dade.js`（1,434,509 B） | `js/wavepaint.63e6dade.js`（1,434,734 B） | 两个文件**大小不同**（差 225 字节），根目录那份是旧版 |
| `wavepaint.e7b903ef.css`（92,310 B） | `css/wavepaint.e7b903ef.css`（92,581 B） | 同样不同，根目录那份是旧版 |
| `wavedrom-skin.js`（43,489 B） | `lib/wavedrom-skin.js`（43,489 B） | 大小一致，是副本 |
| `wavedrom.min.js`（52,820 B） | `lib/wavedrom.min.js`（52,820 B） | 大小一致，是副本 |

**为什么危险**：`build.ps1` 只嵌入 `index.html` + `css\*` + `js\*` + `img\*` + `lib\*`，**根目录的这些副本根本不参与构建**。
如果有人改动了根目录的 `wavepaint.63e6dade.js`（尤其是"大小不同"意味着有人已经动过其中之一），**改完会发现毫无效果**，然后陷入"改 JS 不生效"的排查循环——这与坑 #2 的症状一模一样，极易误判。

**处理**：删除根目录的 4 个副本，或在 `README.md` 中用醒目方式标注"⚠ 根目录这些文件是过期副本，不参与构建，请勿修改"。

### 14.3 无关项目残留

| 文件 | 说明 |
|---|---|
| `CHUAN_API_SETUP.md` | 另一个项目（New API 网关 `https://chuan.sylu.cc` 的 OpenAI 兼容接口）的接入说明，与 WavePaintSim **毫无关系** |
| `tools/chuan-api-test.ps1` | 同上，是那个项目的测试脚本 |

`tools/` 目录下同时还有本项目**需要**的 `dev-server.mjs`（`01-项目背景与架构.md` 5.1 节推荐的调试方式）。
所以**不能整个删掉 `tools/`**，只删 `chuan-api-test.ps1`。

### 14.4 其它

| 项 | 建议 |
|---|---|
| `backup/sim.js.blocking-clock-first.bak`、`backup/sim.js.blocking-clockfirst.20260830.bak` | 两个 `.bak` 大小完全相同（27478 B），疑似同一份备份存了两遍。确认无用后删除，或移入 `attic/` |
| `backup/verify_hybrid.mjs` | 一次性验证脚本，可移入 `attic/` |
| `closedloop_waveform.json` / `waveform.json` / `waveform.vcd` | 示例数据，确认是否还有引用；无引用则移入 `attic/` 或 `samples/` |
| `step-commit-patch.js`（41 行） | 这是**捕获阶段拦截的范例文件**，有价值，建议保留并在 `01-项目背景与架构.md` 中保持引用（已引用） |
| `docs/问题修复与功能规划.md` | ⚠ 这是**另一份任务书**（早于本次审计编写），与本文档集存在**内容重叠**。详见 `05-改进路线图与验收清单.md` 第 6 节 |

### 验收

1. `git log` 能看到基线提交；`git status` 干净。
2. `git check-ignore -v ivl.zip` 能命中 `.gitignore` 规则（若选择不入库）。
3. 根目录不再存在 `wavepaint.63e6dade.js` 等 4 个副本（或已加醒目说明）。
4. `CHUAN_API_SETUP.md` 与 `tools/chuan-api-test.ps1` 已移除，`tools/dev-server.mjs` **仍在**。
5. 重新执行 `.\build.ps1` → `csc exit: 0`，exe 大小与整理前基本一致。

---

## 15. 本文档对应的修复优先级建议

```
先做（几乎零成本，收益明确）
  BUG-018 建 git 仓库          ← 所有后续改动的前提
  BUG-007 委托核心 pushUndoSnapshot（同时解决撤销栈无限增长）
  BUG-009 子步 0 被吞（改 2 行）

再做（需要回归测试配合）
  BUG-006 框选区 -1 静默夹取（语义变更，需仔细回归）
  BUG-008 行高探测改二分（性能，可量化验证）
  BUG-010 工具条全局关闭 + Escape 残留（交互，需手工验证）

然后（C# 侧，需要重新构建 exe 验证）
  BUG-012 参数引号化
  BUG-013 删 CORS + 路径归属校验      ← 安全，建议优先
  BUG-014 杀进程树
  BUG-011 端口文件清理

最后（清理类，可择机进行）
  BUG-005 叠加层尺寸显式化 + ResizeObserver
  BUG-015 死代码移入 attic/
  BUG-016 uid / saveJsonFile（死代码，随 015 一起处理）
  BUG-017 ready() 超时报错
  BUG-018 其余清理项
```

详细排期、依赖关系与每个 Bug 的完整验收方法见 `05-改进路线图与验收清单.md`。

---

*本文档为只读审计产物，不含任何代码改动。所有代码引用均基于 2026-08-30 的代码基线。*
