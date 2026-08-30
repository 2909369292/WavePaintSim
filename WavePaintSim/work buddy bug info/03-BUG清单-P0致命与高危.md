# 03 — BUG 清单：P0 致命与高危

> 本文件收录 **4 个会直接导致程序崩溃或给出错误结果** 的问题。
> 建议在任何新功能开发之前先修复。
> 每条包含：定位 / 现象 / 根因 / 复现步骤 / 影响 / 修复方案 / 验收方法 / 置信度。

---

## BUG-001 🔴 致命 — 选择工具单击画布导致事件回放无限递归

| 项 | 内容 |
|---|---|
| **文件** | `js/feature-select.js` |
| **行号** | 232-240（`onMouseUp` 的 else 分支）；关联 243-245（监听器注册）、187-200（`onMouseDown`） |
| **置信度** | **高**（纯静态可证明，不依赖运行时行为） |

### 现象

在**选择工具**（`#tool-select`，`data-tool="select"`）激活时，在画布上**单击（不拖动）**：

1. 控制台抛出 `RangeError: Maximum call stack size exceeded`；
2. 原版"单击选中信号 / 选中对象"的行为**完全不生效**；
3. 框选状态机 `marquee` 残留脏状态，后续框选行为可能异常。

### 根因

```js
// js/feature-select.js:232-240
} else {
  // 单击：回放给原版（选择信号/对象）
  marquee.dragging = false;
  drawMarquee();
  const init = { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, button: 0, view: window };
  canvas.dispatchEvent(new MouseEvent('mousedown', init));   // ← 237
  canvas.dispatchEvent(new MouseEvent('mouseup', init));     // ← 238
  canvas.dispatchEvent(new MouseEvent('click', init));       // ← 239
}
```

而监听器注册在 **document 的捕获阶段**：

```js
// js/feature-select.js:243-245
document.addEventListener('mousedown', onMouseDown, true);
document.addEventListener('mousemove', onMouseMove, true);
document.addEventListener('mouseup',   onMouseUp,   true);
```

**递归链条**：

```
用户单击
  └─ document 捕获 mouseup → onMouseUp
       ├─ marquee.active = false
       └─ else 分支（未拖动）
            └─ dispatch(mousedown) on canvas
                 └─ 事件传播：window → document（捕获）→ ... → canvas
                      └─ onMouseDown 再次被触发
                           ├─ e.target === canvas ✓
                           ├─ wpf.currentTool() === 'select' ✓
                           ├─ marquee.active = true  ← 重新激活！
                           └─ stopImmediatePropagation() ← 原版目标监听器被挡住
            └─ dispatch(mouseup) on canvas
                 └─ onMouseUp 再次被触发
                      ├─ marquee.active === true（刚被设为 true）
                      ├─ marquee.dragging === false
                      └─ → 再次进入 else 分支 → 再次 dispatch ...  ♻️ 无限递归
```

每一轮递归消耗约 3 层调用栈，直到爆栈。

**第二个独立缺陷**：即使没有递归，这个"回放"设计在原理上也不可能生效。因为 `dispatchEvent` 派发的事件同样会经过 document 捕获阶段，而 `onMouseDown` 里执行了 `e.stopImmediatePropagation()`，**原版挂在 canvas 目标阶段的监听器永远收不到**。

### 复现步骤

1. 启动应用（exe 或 dev-server）
2. 点击工具栏「选择」按钮（`#tool-select`），确认其获得 `.active` 类
3. 在画布某个信号行上**单击一次**（按下即松开，移动距离 < 5px）
4. 观察控制台：出现 `Maximum call stack size exceeded`
5. 观察界面：信号未被选中（原版单击选中行为丢失）

### 影响

- **功能**：选择工具下的单击交互完全失效（该工具最常用的操作之一）
- **稳定性**：每次单击都在控制台刷大量异常；极端情况下可能影响页面响应
- **范围**：仅在选择工具激活时触发，不影响画笔 / 橡皮擦 / 其它工具

### 修复方案

**方案 A（推荐，最小改动）**：加一个重入保护标志，让重放的事件被本模块忽略，从而能真正到达原版监听器。

```js
let replaying = false;   // 模块作用域新增

function onMouseDown(e) {
  if (replaying) return;              // ← 新增：重放期间全部放行
  // ... 原有逻辑
}

function onMouseMove(e) {
  if (replaying) return;              // ← 新增
  // ... 原有逻辑
}

function onMouseUp(e) {
  if (replaying) return;              // ← 新增
  if (!marquee.active) return;
  marquee.active = false;
  e.stopImmediatePropagation();
  e.preventDefault();
  if (marquee.dragging) {
    // ... 原有逻辑
  } else {
    marquee.dragging = false;
    drawMarquee();
    const init = { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, button: 0, view: window };
    replaying = true;                 // ← 新增
    try {
      canvas.dispatchEvent(new MouseEvent('mousedown', init));
      canvas.dispatchEvent(new MouseEvent('mouseup', init));
      canvas.dispatchEvent(new MouseEvent('click', init));
    } finally {
      replaying = false;              // ← 新增
    }
  }
}
```

**方案 B（更稳妥）**：不用事件重放，改为**保存并直接调用原版的目标阶段监听器**。
在模块初始化时（核心就绪后、注册自己的捕获监听器之前）遍历 canvas 上已注册的 `mousedown/mouseup/click` 监听器并保存引用——但浏览器不提供 `getEventListeners`，需要提前 monkey-patch `EventTarget.prototype.addEventListener` 才能捕获，**侵入性较大，不推荐**。

**方案 C（最保守）**：如果探明原版单击行为就是"选中信号"，直接用 `document_wave` API 实现等价逻辑（设置选中态 + `drawWaveform()` + `updateSidePanels()`），彻底放弃事件重放。

> 推荐 **方案 A**，改动 5 行，风险最低。

### 验收方法

1. 选择工具下**单击**画布 → 控制台**无**任何异常，且信号被选中（与原版行为一致）
2. 选择工具下**拖动**框选 → 虚线框正常，松开后浮动工具条出现
3. 点击工具条的「设 1」→ 选区内 Bit 信号全部变高电平；Ctrl+Z 可撤销
4. 切到画笔工具 → 单击 / 拖动绘制不受影响（回归验证）

---

## BUG-002 🔴 高 — 未绑定端口共用同一条激励，仿真结果静默错误

| 项 | 内容 |
|---|---|
| **文件** | `js/sim.js` |
| **行号** | 477-489（`matchSignalsToPorts`），缺陷在第 486 行 |
| **置信度** | **高** |

### 现象

当 DUT 的端口数**多于**画布上同名信号数时，所有未被匹配的端口会被驱动成**同一个信号的波形**。生成的 testbench 语法完全合法、能跑通、有输出，但**激励是错的**——用户不会收到任何警告。

### 根因

```js
// js/sim.js:477-489
export function matchSignalsToPorts(signals, ports) {
  const signalMap = new Map();
  for (const signal of signals || []) {
    signalMap.set(normalizeSignalName(signal.name), signal);
  }

  return (ports || []).map((port) => {
    const exact = signalMap.get(normalizeSignalName(port.name));
    if (exact) return { port, signal: exact, matched: true, strategy: "name" };
    const fallback = (signals || []).find((signal) => signal.role !== "result") || null;  // ← 486: 永远返回第 0 个
    return { port, signal: fallback, matched: false, strategy: fallback ? "fallback" : "none" };
  });
}
```

第 486 行的 `find()` **对每个未匹配端口都返回同一个对象**（第一个非 result 信号）。

例如：DUT 端口为 `clk, rst_n, en, data_in, addr`；画布只有 `clk, rst_n` 两个信号：
- `en`、`data_in`、`addr` 三个端口**全部**被 `clk` 的波形驱动
- 生成的 TB 里这三个 reg 都会被赋 `clk` 的值序列
- `buildAutoTestbench` 的绑定列表会显示 `strategy: "fallback"`，但 UI 上只是一行文本，不醒目

### 复现步骤

1. 编辑器里写一个端口数 > 画布信号数的模块，例如：
   ```verilog
   module dut(input clk, input a, input b, output [3:0] y);
   ```
2. 点「添加信号」只添加 `clk`（或画布上只有 1~2 个信号）
3. 点「TB」查看生成的 testbench
4. 观察：`a` 和 `b` 的赋值序列与 `clk` 完全相同

### 影响

- **正确性**：仿真结果完全不可信，且**没有任何错误提示**
- **隐蔽性**：TB 合法、iverilog 不报错、VCD 正常生成，用户会误以为结果正确
- **范围**：任何"端口数 > 画布信号数"的场景，在实际使用中很常见

### 修复方案

**推荐方案**：未匹配的端口**不再驱动**，并在 UI 中显眼提示。

```js
return (ports || []).map((port) => {
  const key = normalizeSignalName(port.name);
  const exact = signalMap.get(key);
  if (exact) return { port, signal: exact, matched: true, strategy: "name" };

  // ★ 不再 fallback 到任意信号；改做"名字模糊匹配 + 显式未绑定"
  const fuzzy = (signals || []).find((s) => {
    if (s.role === "result") return false;
    const a = normalizeSignalName(s.name), b = key;
    return a && b && (a.includes(b) || b.includes(a));
  }) || null;

  if (fuzzy) return { port, signal: fuzzy, matched: true, strategy: "fuzzy" };
  return { port, signal: null, matched: false, strategy: "unbound" };  // ← 关键改动
});
```

**配套改动 1** — `buildAutoTestbench`（`js/sim.js:533`）过滤驱动事件时保持现状即可（`if (b.signal && ...)` 已判空，未绑定端口自动不产生赋值，保持为 `x`）。

**配套改动 2** — UI 必须暴露未绑定端口。当前绑定信息写在这里：
- `js/sim-bridge.js:412-415`（`buildTbPreview`）
- `js/sim-bridge.js:463-466`（`runSimulation`）

建议改为：
```js
refs.modulePreview.textContent = [
  `bindings: ${result.bindings.length}`,
  ...result.bindings.map(b => {
    const flag = b.strategy === "unbound" ? "⚠ 未绑定(保持 x)" : (b.strategy === "fuzzy" ? "~ 模糊匹配" : "✓");
    return `${flag} ${b.port.name} -> ${b.signal ? b.signal.name : "<unbound>"}`;
  })
].join("\n");
```

**配套改动 3（可选增强）**：在「Sim」按钮执行前，若存在 `unbound` 的输入端口，弹确认框提示用户。

### 验收方法

1. 构造 DUT 端口数 > 画布信号数的场景，点「TB」
2. 断言：未绑定端口在 TB 中**不出现在任何赋值语句里**（保持未初始化/x）
3. 断言：`module-preview` 面板中该端口标注为「⚠ 未绑定」，且 `strategy === "unbound"`
4. 回归：端口与信号完全同名时，`strategy === "name"`，行为与修复前一致

---

## BUG-003 🔴 高 — TimeGen 拖拽绘制与方向键绘制无法撤销

| 项 | 内容 |
|---|---|
| **文件** | `js/feature-draw.js`（56-96 行）、`js/feature-shortcuts.js`（105-112 行） |
| **行号** | `feature-draw.js:78`（`stopImmediatePropagation`）、`feature-shortcuts.js:110`（写入） |
| **置信度** | **中高**（机制确定；"原版在 mousedown 时压栈"这一前提需运行时确认） |

### 现象

用 TimeGen 方式（画笔工具 + 位状态 1/0，靠上下半区决定值）**拖拽绘制一整段波形后按 Ctrl+Z，波形不会回退**。方向键绘制同样。

而用原版方式绘制（位状态选 x/z/u/d 时走原版处理器）**可以**正常撤销 —— 这正好佐证了根因。

### 根因

`feature-draw.js` 在 document 捕获阶段拦截画布 `mousedown` 并 `stopImmediatePropagation()`：

```js
// js/feature-draw.js:70-82
function onMouseDown(e) {
  if (e.button !== 0) return;
  if (wpf.currentTool() !== 'paint') return;
  const target = e.target;
  if (!target || target !== wpf.canvas()) return;
  if (!wpf.isAutoBitMode() && !e.shiftKey) return;   // 固定值模式放行给原版
  const hit = hitTest(e);
  if (!hit) return;
  e.stopImmediatePropagation();   // ← 78: 原版 mousedown 处理器彻底不执行
  e.preventDefault();
  drag.active = true;
  paintAt(e);
}
```

原版几乎必然在自己的画布 `mousedown` 处理器里执行"压入撤销栈快照"（否则它自己的撤销功能无法实现）。**拦截事件的同时，也把这个副作用一起挡掉了**。

而 `feature-draw.js` 自身**从未调用过** `wpf.pushUndoSnapshot()`（全文件搜索 `pushUndoSnapshot` 无匹配）。

对照：其它模块做得很规范——`feature-resize.js:79`、`feature-select.js:114/137`、`feature-generator.js:88/199`、`feature-templates.js:167` 都在修改前压了快照。**只有 feature-draw 和 feature-shortcuts 漏了**。

`feature-shortcuts.js:105-112` 方向键绘制同理：
```js
window.__wpf.cursor = { signalIndex: nextSignal, sampleIndex: nextSample };
const target = dw.m_signals[nextSignal];
if (target && Array.isArray(target.values)) {
  target.values[nextSample] = wpf.bitStateToValue(wpf.currentBitState());   // ← 写入但无快照
  wpf.scheduleRedraw();
}
```

### 前置验证（修复前建议先做）

在浏览器控制台验证原版是否在 mousedown 压栈：
```js
// 1) 记录栈深
const before = document_wave.m_undoStack.length;
// 2) 在位状态选 'x'（走原版）时点击画布一次
const after1 = document_wave.m_undoStack.length;   // 预期 +1
// 3) 切回位状态 '1'（走 feature-draw）再点击一次
const after2 = document_wave.m_undoStack.length;   // 预期 不变 → 确认 BUG
```

### 影响

- **可用性**：绘制是最高频操作，无法撤销会显著降低使用信心，且用户可能误以为"撤销坏了"
- **数据安全**：一次误拖拽（尤其是跨多行拖拽）无法回退

### 修复方案

**修复 1 — `feature-draw.js`**：在**一次拖拽的起点**压一次快照（不是每个格子压一次，否则撤销栈爆炸）。

```js
function onMouseDown(e) {
  // ... 现有判断 ...
  const hit = hitTest(e);
  if (!hit) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  wpf.pushUndoSnapshot();        // ← 新增：本次拖拽前的快照（一次拖拽一条）
  drag.active = true;
  paintAt(e);
}
```

> 注意放在 `hitTest` 之后、`paintAt` 之前，保证快照是"修改前"的状态。

**修复 2 — `feature-shortcuts.js`**：方向键连续移动应合并为一条快照。建议用一个"事务"标志：

```js
let arrowSession = false;   // 模块作用域

// 方向键分支内，写入之前：
if (!arrowSession) {
  wpf.pushUndoSnapshot();
  arrowSession = true;
  // 在 keyup 或 800ms 无操作后复位
  clearTimeout(arrowTimer);
}
arrowTimer = setTimeout(() => { arrowSession = false; }, 800);
```

简单版（先落地）：每次方向键写入前都 `wpf.pushUndoSnapshot()` 也能工作，只是撤销栈条目较多。考虑到方向键写入频次远低于拖拽，且撤销栈有 50 条上限（`app.js:289` 是另一套实现；原版上限未知），**建议先上简单版，观察后再优化**。

**修复 3（补充验证）**：`feature-draw.js` 的 Shift 擦除路径（`hitTest` 中 `value = -1`）同样走 `paintAt`，已被修复 1 覆盖。

### 验收方法

1. 画笔工具 + 位状态 1，在信号行上半区**拖过 10 个格子**
2. 按 Ctrl+Z → **整段拖拽一次性回退**（不是一格一格回退）
3. 按 Ctrl+Y → 重做回来
4. 位状态切到 x（走原版）点一下 → Ctrl+Z 仍能撤销（回归验证，确认没被重复压栈破坏）
5. 方向键绘制几格 → Ctrl+Z 生效

---

## BUG-004 🟠 中（高危边缘）— feature-resize 缓存 document_wave 引用

> 虽定级为中，但一旦触发就是"改了步数但画布完全没反应"，排查成本很高，建议与 P0 同批修复。

| 项 | 内容 |
|---|---|
| **文件** | `js/feature-resize.js` |
| **行号** | 第 27 行 `const dw = window.document_wave;`；读取点 32-34、85-110 |
| **置信度** | **高** |

### 现象

若混淆核心重建了 `document_wave` 对象（新建 / 打开 / 导入项目 / 载入示例），修改步数后：
- `feature-resize` 把新数据写进**旧的、已被遗弃的** `WaveDocument` 实例
- 画布**毫无反应**，或行为诡异
- 无任何报错

### 根因

```js
// js/feature-resize.js:25-35
window.__wpf.ready(function () {
  const wpf = window.__wpf;
  const dw = window.document_wave;        // ← 27: ready 时快照一次，永不更新

  function currentCounts() {
    return {
      steps: Math.max(4, Number(dw.m_sampleCount) || 30),
      subs:  Math.max(1, Number(dw.m_subStepCount) || 1)
    };
  }
  // ... 后续 resizeSignals() 直接读写 dw.m_signals / dw.m_sampleCount
```

而混淆核心里存在重建文档的代码（已静态定位）：
```js
document_wave = window.document_wave = new WaveDocument()
```
「新建」「打开」「载入示例」「导入」等菜单动作（`index.html:179-182`）很可能触发它。

**对照**：`sim-bridge.js` 的写法是正确的——每次都重新读 `window.document_wave`（如 `canvasSubSteps()` 第 149-152 行、`replaceInjectedOutputs()` 第 241 行）。`feature-common.js:121` 的 `pushUndoSnapshot` 也是每次重读。只有 `feature-resize` 错了。

### 复现步骤

1. 画几个信号
2. 执行「文件 → 新建」（或「打开」/「载入示例」）
3. 修改「步数」输入框并失焦提交
4. 观察：画布波形长度不变（数据被写进了旧对象）

### 修复方案

把 `dw` 从常量改为**每次读取的函数/Getter**：

```js
window.__wpf.ready(function () {
  const wpf = window.__wpf;
  const getDw = () => window.document_wave;      // ← 改：不再缓存

  function currentCounts() {
    const dw = getDw();
    return {
      steps: Math.max(4,  Number(dw?.m_sampleCount)  || 30),
      subs:  Math.max(1,  Number(dw?.m_subStepCount) || 1)
    };
  }

  function resizeSignals(newSteps, newSubs) {
    const dw = getDw();
    if (!dw) return;
    // ... 其余逻辑不变，函数体内所有 dw 引用改为局部常量（已通过 getDw() 拿到）
  }
});
```

最小改动版：保留 `const dw`，但在使用前做一次同步：
```js
function syncDw() { return (dwRef = window.document_wave); }
```
推荐直接用 `getDw()` 函数式改写，语义更清晰。

### 前置验证

控制台执行以下操作前后比对对象身份：
```js
const id1 = window.document_wave;
// 执行「新建」
const id2 = window.document_wave;
console.log(id1 === id2);   // false → 确认核心会重建对象，BUG 成立
```

### 验收方法

1. 画 3 个信号 → 执行「新建」→ 改步数 → 波形长度正确变化
2. 不执行新建，直接改步数 → 行为与修复前一致（回归）
3. 执行「载入示例」→ 改子步数 → 长度 = 步数 × (子步+1)
