# WavePaintSim 项目长期记忆

> 跨会话的**稳定事实**与**操作约定**。日常流水记在 `YYYY-MM-DD.md`。
>
> 📌 **2026-08-30 第二轮更新**：新增 `.workbuddy/memory/` 目录存放日常流水（如 `2026-08-30.md`），
> 本文件继续作为**项目级长期事实**的唯一权威位置。两份都要看。
> **「仿真恒为 0」已实证定位到真根因（未绑定端口默认全 0 激励 × 低有效复位），见下方专节——
> 不要再按「stride 是头号嫌疑」的旧结论去修。**
> 完整交接文档见仓库根目录 `work buddy bug info/`（目录名含空格）。
> **最新交接包见 `memory-backup/`**（2026-08-30 22:50 生成，含「仿真恒为 0」完整诊断，
> 接手项目时**优先读 `memory-backup/README.md` 与 `03-未解决问题-仿真恒为0.md`**）。

## 项目性质

在**不可修改的第三方混淆前端**（`js/wavepaint.63e6dade.js`，1.43MB，obfuscator.io）之上做增强，
外加 C# 启动器把全部资源 + Icarus Verilog 打包成单个 `WavePaint.exe`。
核心原则：**混淆核心只当引擎，新功能一律走「独立模块 + 捕获阶段事件接管 + 全局 API 调用」**。

## 铁律（违反必出错）

- **数据模型**：`signal.values.length === m_sampleCount × (m_subStepCount + 1)`；
  每步占 `(子步+1)` 个下标，**主值是每步的第 1 个**（下标 `步号 × stride`）。
- **位值编码**：Bit 信号存**数字**（`0`低 `1`高 `-1`x `2`z `3`u `4`d）；Vector 存**字符串**。写错类型不报错、波形空白。
- **改完 JS 必须重建 exe**（`.\build.ps1`），刷新页面无效。调试纯前端交互改用 `node tools/dev-server.mjs <port>`（不提供 `/api/*`，仿真测不了）。
- **csc 是 .NET 4.0 / C# 4.0**：禁用 `out int x`、`??=`、switch 表达式等 C# 7+ 语法。
- **单实例 Mutex** `Local\WavePaintSim_SingleInstance`；构建前要先 `Stop-Process WavePaint`。

## 核心 API（已静态探测确认）

| 全局 | 说明 |
|---|---|
| `window.Signal` / `SignalType` / `Radix` / `DriveStrength` / `SegmentStyle` | 类与枚举 |
| `window.document_wave` | WaveDocument 实例 |
| `window.drawWaveform()` / `updateSidePanels()` / `mapCanvasPosition(x,y)` / `deleteSelection()` / `clearSelection()` | 函数 |
| **`window.document_wave.pushUndoSnapshot()`** | ★ 核心自带，核心内部调用 32 次；自带撤销栈上限 100 + 清空 redo 栈。**优先复用它**，不要手写 |
| `window.document_wave.valueToLabel(value, radix)` | 把值按进制格式化成标签（F9 总线进制用）；`window.Radix={Hexadecimal:0,Decimal:1,Binary:2}` |
| `window.__wpConstants` | ❌ **不存在**，勿依赖（`docs/` 里提过，是错的） |
| `js/feature-common.js` 的 `window.__wpf` | 自建共享命名空间：`ready/canvas/mapAt/signalRowBand/currentBitState/bitStateToValue/setBitState/currentTool/pushUndoSnapshot/syncSignalMeta/scheduleRedraw/clamp/subSteps/stride/writeValue/editGranularity/busRadix...` |

`mapCanvasPosition` 返回字段（全部真实存在）：
`signalIndex, signal, clickedOnName, mainStep, subStepFraction, globalSampleIndex, signalSampleIndex, signalSubSteps, signalDivisor, signalEffectiveCount, nameWidth, relX, stepWidth, globalStepWidth`

- **返回 null 的唯一条件**：`if(!document_wave||!canvas)`（启动/销毁态）。
  **几何越界返回全 `-1` 的哨兵对象，不是 null** —— 不要写"越界会崩"的断言。
- 核心**无 DPR 缩放**（`devicePixelRatio` / `setTransform` 出现 0 次）。

## 主题机制（2026-08-31 探明；默认已改为浅色）

- 主题 = `body` 上的 `dark` class。**CSS 的 `:root` 默认就是浅色**
  （`--bg-color:#f0f2f0`、`--canvas-bg:#ffffff`），`body.dark` 只是覆盖成深色。
  画布要再叠加 `canvas-dark` class 才变深（`body.dark.canvas-dark`）。
- **混淆核心是顶层脚本（非 IIFE 包裹）**，所以 `applyTheme`、`getCurrentTheme`
  等顶层函数是全局的，可直接 `window.applyTheme('light')`。
  `applyTheme(t)` 会 toggle `dark` class **并把主题写入 localStorage**（主题是持久化的）。
- 与主题无关的另一套机制是 `WavePaintSkins`（波形配色：Black / Sunset / Forest，
  **全是深色系**），也持久化在 localStorage，默认 `currentSkin = 'black'`。
  它**只影响信号波形颜色，不影响背景**，别把两者搞混。
- ✅ 默认浅色已实现（`js/feature-common.js`）：启动时调 `window.applyTheme('light')`，
  用 `localStorage` 标记 `wpf.defaultLightThemeApplied` 保证**只干预一次** ——
  是"改默认值"而非"锁死主题"，用户之后通过「主题」菜单的选择一律尊重。
  核心主题初始化是异步的，故用 MutationObserver 观察 10s 窗口防止被改回深色。

## ★★「仿真结果恒为 0」的真根因（2026-08-30 第二轮，实证已复现）

> 实证工具：`node tools/e2e-sim.mjs` —— 绕开 GUI，stub 浏览器环境后加载真实 `sim-bridge.js`，
> 跑真实 iverilog+vvp（自动解压 `ivl.zip` 到系统临时目录并缓存）。**它执行真实仿真，不是黄金快照。**
> ✅ **2026-08-30 已修复并提交**（commit `5340a8f`）。

**仿真引擎本身完全正常。** DFF 用例输出 `q = x000011111100000`，标准触发器行为。
链路 [5]~[10]（payload → iverilog → vvp → VCD 解析 → 回填）无问题，问题全在**激励侧 [1]~[3]**。

> ⚠⚠ **纠错（务必记住）**：本节一度误判「stride 不是主因」，那是因为第一版用例
> 把用户绘制的值**填满了整个 2 倍长度的信号**，掩盖了「后半段根本没被绘制」这一关键事实。
> **前任的原始判断是对的。** 教训：构造用例时必须忠实模拟真实绘制行为
> （`writeValue` 用 `wpf.stride()`，只写 `index = step`，不会自动填满被撑长的后半段）。

### 根因 2：未绑定输入端口默认激励是「全 0」，而复位是低有效（✅ 已修复）

默认 RTL 就是 `counter`（`js/sim-bridge.js:4-17`），带 `input rst_n`，
`always @(posedge clk or negedge rst_n) if (!rst_n) q <= 4'd0;`

`buildAutoTestbench`（`js/sim.js:546-555`）给未绑定输入端口生成**全 0** 激励：
```js
values: Array.from({...}, () => (defWidth > 1 ? "0".repeat(defWidth) : "0"))
```
→ `rst_n` 恒 0 → **复位一直有效** → `q` 恒 0。**已复现：`q = 0000 × 16`。**

### 根因 3：无复位沿 → x 自我传播（✅ 已修复，补上了前任漏掉的 X-4）

`defaultInputValues`（`js/sim.js:50-54`）给「添加端口信号到画布」的新信号填**全 "x"**。
用户不画波形就点 Sim → TB 只有 `clk = 1'bx;` → 输出恒 x。

⚠ 即使画全了也不够：`counter` 的 `q` 无初值，**没有复位释放沿时 x 会自我传播**（`x+1 = x`）。
所以 `rst_n` 恒 1 同样输出全 x。**必须有 0→1 的复位沿，计数器才起步。**

### 根因 4：fuzzy 匹配误配（✅ 2026-08-31 已收紧）

`matchSignalsToPorts`（`js/sim.js:487-492`）用 `a.includes(b) || b.includes(a)`：
- 实测 `sys_clk`→`clk`、`enable`→`en` 均命中 `[fuzzy]`（侥幸正确）
- 端口 `d` 会匹配 `data`/`addr`/`valid` 中任一 —— **误配风险真实存在**

### 修复状态（2026-08-30 末）

| # | 项 | 状态 |
|---|---|---|
| 1 | 未绑定默认激励按端口语义取值（低有效复位给 1，其余给 0） | ✅ 已实施 |
| 2 | 补 X-4：复位端口从未画出复位沿时，TB 开头自动补上电复位脉冲 | ✅ 已实施 |
| 3 | 修 stride 口径（`canvasSubSteps` / `readWaveDocument` 的 `subSteps` / `toNativeSignal`） | ✅ 已实施 |
| 4 | 回归防护：regression.mjs 新增 3 项复位语义用例；e2e-sim.mjs 新增「真实用户流程」用例 | ✅ 已实施 |
| 5 | **unbound 告警**：存在未绑定输入端口时点名列出 | ✅ 已实施（`diagnoseSimulation`） |
| 6 | **结果诊断**：输出全 0 / 全 x 时提示可能原因 | ✅ 已实施（同上） |
| 7 | **修 fuzzy 误配**（根因 4） | ✅ 已实施（见根因 4） |

截至 2026-08-31，1~7 全部完成。

实施要点（`js/sim.js` 新增）：
- `resetPolarity(name)`：`rst_n/reset_n/rst_b/rstn/nreset/n_rst` → `low`；`rst/reset` → `high`；其余 `null`
- `resetInactiveLevel(name)`：低有效复位返回 `"1"`，其余 `"0"`
- `ensureResetPulse(values, portName)`：仅当复位信号从未出现有效电平时，
  把前 2 格设为有效电平、其余设为无效电平；**用户画了复位沿则完全不改动**
  （只影响生成的 TB，不改动画布原始波形）

---

## ⚠ 根因 1（主因）：两侧 stride 口径不一致（2026-08-30 查实，**已修复**）

> ✅ 已修复：`canvasSubSteps()` 改为 `Math.max(0, ...)`；`toNativeSignal` 的
> `subSteps` 不再硬编码 1。见 commit `5340a8f`。

**这正是用户「恒为 0」的主因**，触发路径是用户最常用的操作：点「添加端口信号到画布」。

完整因果链（实测）：
1. `canvasSubSteps()` 用 `Math.max(1, ...)` 把子步数 0 当成 1
   → `canvasEffectiveCount()` = 主步数 × 2
2. `addPortSignalsToCanvas` 按这个长度建信号：**24 步的画布建出 len=48 的信号**
3. 用户绘制走 `feature-common` 的 `wpf.stride()` = `max(1, m_subStepCount+1)` = **1**，
   只写 `index = step`，即 **只写满前半段 0..23**
4. 仿真 `readWaveDocument` 用 stride = **2** 采样：cell → `index = cell*2`
   → cell 12 以后全部落进未绘制的后半段，采到 **x**

实测画布信号（24 步）：
```
clk len=48 = 010101010101010101010101xxxxxxxxxxxxxxxxxxxxxxxx
                                    ^^^^^^^^^^^^^^^^^^^^^^^^ 用户从没写到这里
```
激励几乎全 x → 输出恒 x/恒 0。

**为什么早期用例没暴露**：若把用户绘制的值填满整个 2 倍长度（模拟方式不对），
采样结果反而"正确"，问题被掩盖。**构造用例必须忠实模拟第 3 步。**

绘制侧与仿真侧对「每个主步占几个 values 下标」的算法**不一致**：

| 位置 | 代码 | `m_subStepCount=0` 时 |
|---|---|---|
| `js/feature-common.js:250` `wpf.subSteps()` | `Math.max(0, ...)` | `subSteps=0` → `stride=1` ✅ 符合铁律 |
| `js/feature-common.js:367` `wpf.stride()` | `subSteps()+1` | `stride=1` ✅ |
| `js/sim-bridge.js:151` `canvasSubSteps()` | `Math.max(1, ...)` | `subSteps=1` → `stride=2` ❌ **多算一格** |
| `js/sim-bridge.js:349` `project.subSteps` | `Math.max(1, ...)` | 对外报告 `1`，真实是 `0` ❌ |
| `js/sim-bridge.js:155` `canvasEffectiveCount()` | `timeSteps*(subSteps+1)` | 长度算成 **2 倍** ❌ |

- 绘制按 `stride=1` 写主值，仿真按 `stride=2` 采样 → **采样点整体错位一格**。
- 目前被 `sampleMainValue()`（sim-bridge.js:164）的兼容分支
  `if (rawValues.length <= timeSteps)` **短路掩盖**：`m_subStepCount=0` 时
  `values.length` 恰好 = `timeSteps`，走「按下标直取」分支，碰巧正确。**这是脆弱的。**
- 触发条件：~~子步数 ≥ 1~~（错，子步数=2 时两侧 stride 都是 3，实测正确）；
  真正触发条件只有**「子步数 = 0 但 values 长度 = timeSteps×2」**（即经由 `addPortSignalsToCanvas` 建的信号）。
- ~~级联后果：`$finish` 退化成 `#1 $finish` → 输出全 0~~ —— **此推断已被实证推翻**：
  实测该场景下输出为**错位半格的正确波形**，不是全 0。
- 同类第三处：`toNativeSignal`（`sim-bridge.js:250`）把注入信号的 `subSteps` **硬编码为 `1`**，
  与画布 `m_subStepCount` 又不一致（注入信号长度 timeSteps×2，原生信号 timeSteps×1）。
- 建议修法：`sim-bridge.js` 的 `canvasSubSteps()` 与 `readWaveDocument()` 的 `subSteps` 字段
  改成与 feature-common 一致的 `Math.max(0, ...)` 口径。**改完必须在 子步数=0 和 =2 两种配置下各验一次仿真。**

> 教训：四个批次（P0-2~P3-6）全做完、回归 21/21、exe 重建成功，**用户实测仍恒为 0**。
> 因为我没有先复现和二分定位，就照着任务书的归因（X-1~X-4）照单执行——而那份归因本身不完整。
> **下次：先用最小可复现用例（clk + d + q 的 D 触发器）二分到具体环节，再动手改。**

## ★ 探查混淆核心的方法论（务必遵守）

混淆器把字符串拆成 `'m_undoStac'+'k'`、`'pushUndoSn'+'apshot'`、`_0x27d135(0x1773)+'apshot'` 这类形式，
**直接 grep 完整属性名结果恒为 0**（`m_undoStack`、`snapshot`、`isClockPattern(` 都搜不到）。

正确做法：
1. **搜片段 + 提取上下文**，不要 grep 后直接输出（1.43MB 单行文件会 dump 上百万字符）：
   ```bash
   python -c "
   import re
   s=open('js/wavepaint.63e6dade.js',encoding='utf-8',errors='replace').read()
   for m in re.finditer('apshot', s):
       print(s[max(0,m.start()-300):m.end()+300].replace(chr(10),' '))
   "
   ```
2. **优先做运行时验证**（浏览器控制台），比静态推测可靠：`typeof document_wave.pushUndoSnapshot`、`document_wave.m_undoStack.length`。
3. 断言核心行为前先想清楚"能不能证伪"。本项目已因此产生 3 条误判（见 `work buddy bug info/README.md` 勘误）。

## 两套实现（别改错文件）

- **运行时**：`index.html` + 混淆核心 + `js/feature-*.js` + `js/sim-bridge.js` → `sim.js` → `model.js` → `utils.js`。
- **已归档到 `attic/`（2026-08-30，均不再参与构建）**：
  - `attic/js/app.js` + `attic/js/renderer.js` + `attic/css/styles.css` —— 另一套「WaveWorkbench」Canvas 编辑器，
    从未被 index.html 引用。`renderer.js` 用 DOM `<button>` 网格做命中层（4096步×20信号 = 8万节点、每次 render 重建），
    **一旦接回应用必卡死**。
  - `attic/residue/` —— 根目录残留：与子目录字节相同的重复副本（svg/wavedrom/step-commit-patch/zh-lang-patch）、
    `CHUAN_API_SETUP.md`、`.env.example`、`waveform.json`/`.vcd`/`closedloop_waveform.json`。
  - `attic/core-original/` —— 混淆核心**打补丁前**的原始副本（见下）。
- ⚠ **`js/utils.js` 不是死代码**：被 `js/model.js:1` `import { uid, deepClone }`。删它会导致
  sim-bridge 整个 ESM 模块图加载失败、仿真面板全挂。要删必须先去掉 model.js 的 import 并验证。
- ⚠ 判断死代码**必须做 ES module 导入可达性检查**（遍历 `from "./x.js"` 求闭包 ∪ `index.html` 的 `src="js/..."`），
  只看"有没有被 index.html 引用"会漏掉 ESM 依赖。

## 根目录的坑

- `build.ps1` 只嵌 `index.html` + `js\*` + `css\*` + `img\*` + `lib\*` + `ivl.zip`。
  根目录任何副本/残留**都不参与构建**，改了等于白改，症状与"忘记重建 exe"一模一样。
  2026-08-30 已把根目录那批副本全部归入 `attic/residue/`。
- ⚠ **`attic/core-original/wavepaint.63e6dade.js` 千万别覆盖回 `js/`**。它与在用版本唯一差异：
  `document_wave=new WaveDocument()` → `document_wave=window.document_wave=new WaveDocument()`。
  这个 `window.` 前缀是所有 feature 模块能工作的前提，覆盖回去会"无报错但功能全废"。
- `tools/dev-server.mjs` 是本项目要用的（`node tools/dev-server.mjs <port>`，不提供 `/api/*`），**别当残留删**。

## 版本控制

- **本项目已在父仓库 `D:/Files/Code/波形` 中被跟踪**（`git ls-files WavePaintSim` 可见 72 个文件）。
  ⚠ **不要再在此目录执行 `git init`** —— 会形成嵌套仓库，反而让这些文件脱离版本控制。
- 已知问题：`docs/` **未被跟踪**；`WavePaint.exe`（21MB 构建产物）**已被跟踪**。
  `.gitignore` 已补上 exe/bak/backup，但已跟踪的 exe 需要手动
  `git rm --cached WavePaintSim/WavePaint.exe` 才会真正移除。

## 既有任务书 docs/问题修复与功能规划.md（A~E）

2026-08-30 晚：按 `docs/最终项目实施文档.md` 实施了第 1~4 批（P0-2 ~ P3-6），
B/C/D/E 四项已落地（B 侧栏乱码已修；C 侧栏 252→328px + 样式统一；
D 拖动锁定首个信号；E 编辑粒度 UI）。

⚠ **但 A（仿真结果恒为 0）并未解决** —— 用户 22:48 实测反馈「结果依然恒为 0」。
**不要相信文档里的「已实施 ✅」标记。** 真正根因见上一节
「两侧 stride 口径不一致」与 `memory-backup/03-未解决问题-仿真恒为0.md`。
（本条于 2026-08-30 22:55 修正；此前误记为「A~E 全部完成」。）

## 用户偏好

- 要求"详细记录成文档交给其他 AI"时，期望的是**可直接执行的交接包**：
  每个 Bug 要有 位置 / 置信度 / 现象 / 根因（含代码原文）/ 复现步骤 / 影响 / 修复代码 / 验收标准。
- 明确要求 bug 与**功能规划**都要写，不能只写 bug。
- 给任务书让"对照文档修改"时，期望**先核实文档与现状是否一致**再动手
  （本次核实发现 X-1/X-2/X-3 已实施、`editGranularity` 已存在，避免了重复劳动）。

## 验证手段（GUI 起不来时的替代方案）

- ⚠ **GUI 冒烟不可行**：PowerShell `Start-Process` 启动的 `WavePaint.exe` 会在工具调用结束时被沙箱回收
  （端口文件写了、进程没了）。
- 可用四件套：
  1. `node --check <file>` 逐个 JS 文件；
  2. **`node tools/regression.mjs`** —— 21 项回归（utils/model/sim + stub 浏览器环境后直接测真实
     `feature-common.js` 的 `writeValue` / `signalRowBand` 二分 / 进制映射）；`--update` 重生成 TB 黄金快照；
     ⚠ **它不执行真实仿真**（用黄金快照），跑绿了不代表仿真结果对。
  3. **`node tools/e2e-sim.mjs`** —— ★ 仿真链路端到端体检。stub 浏览器环境加载真实 `sim-bridge.js`，
     自动解压 `ivl.zip` 到系统临时目录（跨运行缓存），跑**真实 iverilog + vvp**，断言输出波形。
     3 个用例：DFF 健康基线 / counter 恒 0 复现 / counter 全 x 复现。
     **改动激励生成、TB 构造、VCD 解析、回填逻辑后必跑它。** 与 2 互补，不可替代。
  4. ES module 导入可达性 + HTML 标签配平 + UTF-8 无 BOM 的静态核对。
- 改 C# 后 `.\build.ps1` 的 `csc exit: 0` 即编译通过（.NET 4.0，禁用 C# 7+ 语法）。
