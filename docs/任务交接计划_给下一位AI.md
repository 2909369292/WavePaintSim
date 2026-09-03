# WavePaintSim 任务交接计划（给下一位接手 AI）

> 读者：下一位负责 WavePaintSim 的 AI 同事。
> 目的：把项目现状、已踩的坑、以及**尚未完成的需求**一次性交代清楚，让你无需重新探索即可开工。
> 最后更新：2026-08-31（第五轮回退 → **第六轮已重新实现完毕**，见下方「进度更新」）

---

## ★ 进度更新（2026-08-31 第六轮，务必先读）

第五轮（总线编辑 + 4 bug）因搞坏仿真已回退到 `6383c24`；**随后第六轮重新实现并已完成**，
策略是**完全不碰 `js/sim-bridge.js`**，把仿真回归风险降为零（第五轮就是死在这里）。

| 项 | 状态 | 说明 |
|---|---|---|
| 7.1 总线编辑 | ✅ 已实现 | 走"选择工具框选"路径，工具条新增「输入值」输入框（见下） |
| 7.2 Bug A 展开入口 | ✅ 已修复 | `#sim-toggle-btn` 移到右缘垂直中部、z-index 6500、仅收起时显示 |
| 7.3 Bug B 空框/杂乱 | ✅ 部分 | `:empty` 隐藏已做；"杂乱"的版式重排未做 |
| 7.4 Bug C 左侧空白条 | ✅ 已修复 | `#main-area.with-vcd-panel` 清零 |
| 7.5 Bug D 任务栏图标 | ✅ 已实现 | favicon.svg + app.ico + `/win32icon` |
| 7.6 总线进制右键菜单 | ✅ 已实现 | 并修正 decimal 显示、去掉 0x/0b 前缀 |
| 7.7 整步/子步对总线 | ⚠ 部分 | 选择工具写总线本身是子步粒度；顶部粒度开关未在总线路径上单独连通 |
| 7.8 选择模式编辑总线 | ✅ 已实现 | 与 7.1 同一套实现 |
| 7.9 延长自动填补 | ✅ 已有 | `feature-resize.js:extendValue` 本就能延续时钟周期/末值，未改动 |
| 7.10 时钟子步翻转 | ⛔ 不做 | 会重现第五轮仿真退化，见 §10 禁忌 |
| 7.11 Vivado/Verdi 调研 | ⬜ 未做 | 调研型，可单独开一轮 |

**验证**：`regression.mjs` 33/33、`e2e-sim.mjs` 失败 0 项、`node --check` 全 OK，
exe 已重建且确认内嵌新代码（`grep -ac "输入值" WavePaint.exe` 等）。

**待人工验收（AI 无浏览器，必须你做）**：
1. 侧边栏收起 → 点右缘竖标签能否重新展开（Bug A）
2. 左侧空白条消失否（Bug C）、空 helper 框不再占位（Bug B）、任务栏图标（Bug D）
3. 总线：选择工具框选总线 → 输入 `10`/`0xA` → 波形与标签是否正确
4. 总线名右键进制菜单；**若核心本身已有信号右键菜单，可能出现两个菜单并存**，
   届时应改为往核心菜单里注入项（我只 `preventDefault`，没有 `stopPropagation`）

---

## 0. 一句话总览

WavePaintSim 是一个**浏览器内的波形编辑器 + Verilog 仿真器**：用户在画布上画时钟/复位/数据波形，
工具把画布导出成 testbench 激励，调用内嵌的 iverilog 跑仿真，再把 VCD 结果回填到画布。
目前"画 → 仿真 → 看结果"的主链路在 `6383c24` 这个提交上是**通畅且验证过的**。
最近一轮（第五轮）我尝试加"总线编辑 + 4 个 UI bug 修复"，但把仿真链路搞坏了，且展开入口依旧失败，
**已整体回退到 `6383c24`**。你现在从该提交起步即可。

---

## 1. 项目结构与关键文件

仓库根：`D:/Files/Code/波形/`（父仓库）。**你只能动 `WavePaintSim/` 子目录**，不要碰父仓库其他内容。

```
WavePaintSim/
├─ index.html                 # 入口页面。所有 feature 脚本、sim-bridge、混淆核心都在这里按序引入
├─ WavePaintLauncher.cs       # C# 启动器（static class）。关键：把 js/css/img/lib 作为资源内嵌进 exe，
│                             #   启动时解压到 %TEMP%/WavePaintSim_<user>/，再用 Edge --app 打开
│                             #   http://127.0.0.1:<port>/index.html（即走 HTTP，不是 file://）
├─ build.ps1                  # 用 csc 编译 Launcher 并把资源内嵌进 WavePaint.exe
├─ WavePaint.exe              # 构建产物（已从 git 移除），每次改动 JS 后必须重建
├─ ivl.zip                    # 内嵌的 iverilog 便携包（bin/iverilog.exe、bin/vvp.exe、ivl/…）
├─ js/
│  ├─ wavepaint.63e6dade.js   # ⚠ 混淆核心（obfuscator.io），1.43MB。顶层脚本（非 IIFE），
│  │                         #   它导出 window.__wpf、window.document_wave、window.SignalType、
│  │                         #   window.Radix 等全局。不要改它，只能基于它的全局 API 编程。
│  ├─ sim-bridge.js           # ⚠ 仿真桥。type="module"。负责：
│  │                         #   readWaveDocument()(画布→激励)、addPortSignalsToCanvas()(端口→画布)、
│  │                         #   buildAutoTestbench()(生成 TB)、runSimulation()(调本地 api/sim)。
│  │                         #   这是仿真链路最易碎的文件，改动务必谨慎。
│  ├─ feature-*.js            # 增强模块：common/select/resize/draw/measure/generator/templates/…
│  ├─ model.js                # 矢量值处理（normalizeVectorValue / formatVectorValue）。ESM，可 import。
│  ├─ step-commit-patch.js / zh-lang-patch.js  # 核心补丁
├─ css/wavepaint.e7b903ef.css # 核心样式（含 #main-area.with-vcd-panel{margin-bottom:40vh} 这个坑，见 §7）
├─ tools/
│  ├─ regression.mjs          # ⚠ 关键验证：33 项黄金快照（不跑真实仿真，纯逻辑/快照比对）。每改必跑。
│  ├─ e2e-sim.mjs             # 端到端：stub 浏览器环境加载真实 sim-bridge.js + 真实 iverilog 跑仿真。
├─ docs/  attic/  backup/  memory-backup/  img/  lib/
```

### 1.1 必须记住的两条架构事实
1. **exe 内嵌 JS 资源**：`WavePaintLauncher.cs:ExtractResources` 把 js/css/img/lib 内嵌进 exe，
   每次启动 `Directory.Delete(root,true)` 后重新解压。所以**任何 JS/CSS 改动都必须重建 exe 才生效**；
   只改磁盘文件、不重建 exe，用户跑出来的还是旧代码。
2. **应用跑在 HTTP 上**：启动器用 HttpListener 在 127.0.0.1 提供页面。`<script type="module">` 能正常加载
   （不存在 file:// 的 CORS 问题）。所以第五轮之前 sim-bridge 用 module 是 OK 的——模块本身不是坑。

---

## 2. 仿真链路（端到端，必须完全理解）

```
用户在画布画波形
   │  (信号存在 window.document_wave.m_signals[].values)
   ▼
click "运行仿真" → sim-bridge.js 的 runSimulation()
   │
   ├─ readWaveDocument()        把画布的每个信号 values 采样成「主步级」激励文本
   ├─ buildAutoTestbench()      把激励 + RTL 源文件拼成 tb.v（含 $dumpfile/$dumpvars）
   ├─ fetch('http://127.0.0.1:<port>/api/sim', POST)
   │        │  C# 端 RunSimulation()：把源文件写出来 → iverilog 编译 → vvp 跑 → 读 wave_out.vcd
   │        ▼  返回 VCD 文本
   ├─ vcdToProjectOutputs()     把 VCD 解析回填到画布信号
   └─ diagnoseSimulation()      输出中文诊断提示到结果区/状态栏
```

要点：
- **激励来自画布 `values`，不是 RTL**。时钟/复位必须画成合理波形，否则 DUT 没有时钟沿/一直复位 → 输出恒 x/恒 0。
- 端口绑定：`buildAutoTestbench` 用模糊匹配把 RTL 端口名对到画布信号名（见 §5 P4 收紧规则）。
- 编译走 `iverilog.exe -g2012 -s tb -o sim.vvp <files>`，失败返回 `IVERILOG-ERROR`。
- 单实例互斥 + 端口文件在 %TEMP%；多开时只会拉起已有实例的窗口。

---

## 3. 画布数据模型（踩坑核心）

- `document_wave.m_sampleCount` = **主步数**（main steps）。
- `document_wave.m_subStepCount` = **子步数**（sub steps）；子步 = 0 表示整步。
- 每个信号 `sig.values` 长度 = `主步数 × (子步数 + 1)`。`stride = max(1, 子步数+1)`。
- 写入某主步整体：`for k in 0..stride-1: values[主步*stride + k] = v`。
- 写入单个子步：`values[主步*stride + 子步下标] = v`（不改其它子步）。

⚠ **历史大坑（第四轮已修）**：之前 `canvasSubSteps()` 用 `Math.max(1, …)` 导致子步=0 时算成 1，
使 `values` 长度变成实际 2 倍，仿真采样错位 → **结果恒为 0**。修复后 stride 统一为 `子步+1`，
并用 `writeValue` 同时支持整步/子步写入（`feature-common.js` 有单测覆盖）。**不要再动 stride 口径，除非你重新跑全量回归。**

---

## 4. 已完成的四轮工作（这些结论是稳固的，不要推翻）

- **第一轮**：摸清混淆核心全局 API、画布模型、仿真链路。
- **第二轮（修复"仿真恒为 0"）**：根因 = stride 口径不一致 + 复位激励语义错误。已提交 `5340a8f`，验证通过。
- **第三轮**：补齐 feature-* 增强模块（`359fd05`）。
- **第四轮（预填波形/诊断/浅色主题/收紧端口匹配）**：
  - P1 常见信号（clock/reset）添加到画布时**自动预填典型波形**（`createPortStimulus` 为单一真相源，
    clock→`0101…`、低有效复位 rst_n→前 2 格 0 后 1、高有效 rst→前 2 格 1 后 0，其余返回 null 保持 x）。
  - P2 `diagnoseSimulation()` 输出中文诊断（未绑定输入/激励全 x/输出全 0/输出全 x）。
  - P3 **默认浅色主题**（`feature-common.js` 启动 `applyTheme('light')` + MutationObserver 防被核心改回深色）。
  - P4 收紧端口模糊匹配：单字符端口名(如 d/q)不参与模糊、长度比<0.3 不配对、一对一占用、精确优先。
  - 验证：`node tools/regression.mjs` 33/33；`node tools/e2e-sim.mjs` 5 用例 0 失败。

**当前 HEAD = `6383c24`，是上述全部内容的状态，仿真通畅。**

---

## 5. 第五轮（已回退）做了什么、为什么失败

我尝试实现用户的「总线编辑 + 4 个 UI bug 修复」，改动文件：
- 新增：`js/feature-bus-edit.js`、`img/app.ico`、`img/favicon.svg`、`tools/gen-icon.mjs`
- 改：`index.html`、`js/feature-common.js`、`js/feature-resize.js`、`js/feature-select.js`、`js/sim-bridge.js`、`build.ps1`

### 5.1 失败现象
1. **展开窗口仍没出现**（Bug A 没修好）—— 侧边栏收起后没有可用的重新展开入口。
2. **仿真不能跑了** —— 点击仿真无有效输出。这是比 Bug A 严重得多的回归。

### 5.2 已定位的疑似根因（按可能性排序，供你排查/避免）
- **(高) `js/sim-bridge.js` 的时钟子步翻转改动破坏了激励/采样**：
  - `addPortSignalsToCanvas` 里对 `kind==='clock'` 改为 `native.values[i] = i%2===1?1:0`
    （每个格子都翻转，意图是"子步级方波"）。
  - `readWaveDocument` 里新增 `isAlternating()` + `subStepClock` 重建：若 `width<=1 && 所有相邻都相反`，
    则按主步重建 `cell%2===1?"1":"0"`。
  - **问题**：`isAlternating` 是脆弱的启发式——任何真实交替的数据信号（比如计数器输出的某位）都会被
    **误判为子步时钟并重写成 0101**，污染激励；而且这套"生成时翻转、采样时再翻转"的双写逻辑极易在
    子步=0 / 步长偶数等边界产生恒定电平，使时钟沿丢失、DUT 无时钟 → 仿真退化。
  - 建议：不要再用"生成翻转 + 采样再翻转"的双写套路。时钟就按**主步级** `0101…` 预填（第四轮 P1 已是对的），
    除非你能在仿真端彻底证明子步时钟的采样正确。
- **(中) Bug A 修复本身没生效**：`index.html` 把 `#sim-toggle-btn` 重定位到垂直居中、提高 z-index，
  但侧边栏收起后该浮动标签仍可能落在菜单栏区域或被遮挡；且面板头里另加了 `#sim-collapse` 按钮，
  两套"收起/展开"入口逻辑可能互相打架。需要重新设计"收起 → 重新展开"的单一入口。
- **(低) ESM 引入**：本轮新增 `<script type="module">` 引入 `model.js` 给 `feature-bus-edit.js` 用。
  注意应用跑在 HTTP 上，模块本身能加载；但若 `model.js` 导出名拼错会让该模块静默失败
  （`window.__wpfVec` 为 undefined，`busRadixLabel` 会回退到核心 `valueToLabel`，不抛错但显示异常）。

### 5.3 当前处置（★ 2026-08-31 第六轮已更新，以下"无法重建"的判断是错的）
第五轮已回退（工作区与 `6383c24` 一致，regression 33/33）。**之后需求已由第六轮重新实现完毕**。

> ⚠ **更正一处重要误判**：当时以为"安全策略禁用了 csc，无法重建 exe"。
> 实际根因是 **`build.ps1` 是 UTF-8 无 BOM，Windows 的 PS 5.1 会按 GBK 解码**，
> 中文破坏引号/括号结构 → **脚本解析失败、构建根本没执行**；
> 而 `build.ps1` 不传播编译器失败码，外层仍报 `exit 0`，造成"构建成功"的假象。
> **加上 UTF-8 BOM 后构建正常**（`e834435`），exe 已重建（22302208 字节）。
> 详见 `MEMORY.md`「构建：三个必须知道的坑」。

---

## 6. 现阶段做法的问题与经验教训（避坑清单）

1. **仿真链路极脆，改动 sim-bridge.js 必须跑 e2e**：逻辑/快照改动用 `regression.mjs` 看不出仿真是否还能跑，
   必须 `e2e-sim.mjs` 真跑 iverilog 验证。第五轮就是只信了 regression 没信 e2e 翻车的。
2. **不要引入"双写"语义**（生成时一种表示、采样时另一种）。时钟激励保持单一真相源（主步级 0101）。
3. **不要用水合式启发式（isAlternating）去猜信号语义**，会把真实数据当时钟。按端口类型/用户意图明确处理。
4. **UI 改动要先在浏览器实测**，不能只改 CSS 就当修好（Bug A 改了等于没改）。
5. **改完不重建 exe = 用户看到旧行为**：凡是动 js/css/img，必须 `.\build.ps1` 并让用户在重建后的 exe 验证。
6. **单字符端口名、命名风格差异**：P4 已收紧，别退回"includes 互含"的弱匹配。
7. **主题**：浅色是用 `applyTheme('light')` 干预一次（非锁死），尊重用户后续选择；核心深色靠 `body.dark`，
   CSS `:root` 默认即浅色。

---

## 7. 需求清单（按优先级，含推荐实现路径）

> ⚠ **本节写于第六轮之前，其中 7.1 / 7.2 / 7.4 / 7.5 / 7.6 已在第六轮完成**（见文首「进度更新」表）。
> 下面保留原文作为**需求原始描述与实现路径参考**，不要照抄着重做一遍；
> 接手时请先读文首进度表，再对照本节判断还差什么。
> 通用纪律仍然适用：逐个做、做完一个验证一个、单独 git 提交 + 重建 exe。

### 7.1 总线（矢量信号）编辑  ★最高优先级，用户明确要
**需求**：在画笔/编辑模式下，点击或拖动选中总线（Vector 信号）上一段波形 → 松开弹窗 → 输入数字 →
该范围波形改为该值。**粒度=子步**（每个 values 下标都写，不做主步取整）。
**推荐实现**：
- 复用 `model.js` 的 `normalizeVectorValue`（已存在，支持 `10` / `0xA` / `A` / `0b1010` / `8'hA5` / `x`/`z`）。
- 监听画布 mousedown/mousemove/mouseup，命中 `sig.type===SignalType.Vector` 时进入"选范围"模式
  （用 `wpf.mapAt(x,y)` 取 `signalIndex`、`signalSampleIndex`，参考 `feature-select.js` 的命中逻辑）。
- 选完弹 `prompt` 或一个浮动 `<input>`（注意：已有 `feature-select.js` 的框选工具条可借鉴样式）。
- 写入后 `wpf.refreshBusLabels(sig)`（该函数已在 `feature-common.js` 存在，会按进制重算标签）并 `wpf.scheduleRedraw()`。
- **千万别**再把 sim-bridge 的时钟逻辑改成子步翻转来"配合"总线编辑。
- 验证：`regression.mjs` 加一条"总线按子步写入后 values 与 labels 正确"的用例。

### 7.2 Bug A — 侧边栏收起后无展开入口  ★高
**需求**：侧边栏（#sim-panel）收起后，必须有一个始终可点的入口把它重新展开。
**推荐实现**：
- 统一"收起/展开"为**一个**按钮：展开时按钮在面板头（如现 `#sim-collapse`），
  收起时同一个按钮变成贴在左边缘的浮动标签（固定 `left:0; top:50%`），**务必避开顶部 #menu-bar（高 40px, z-index 6000）**，
  自身 z-index 要高于菜单栏；用 `position:fixed` 而非依赖面板内元素。
- 先 `grep` 现有 `#sim-toggle-btn` / `#sim-collapse` 绑定逻辑（在 `feature-common.js` 或 `sim-bridge.js` 里），
  确认只有一个状态变量控制 `open/collapsed`，不要两套入口各管各的。
- **验证方式**：在浏览器里真的收起再点开，确认能恢复；不要只改 CSS 就提交。

### 7.3 Bug B — 侧边栏 UI 杂乱 + 两个空白框  ★中
**需求**：清理侧边栏布局；之前"端口预览/模块预览"两个 helper 框在没内容时常驻空白。
**推荐实现**：已有一版 `.sim-result:empty{display:none}` 的修法方向是对的，但需确认 `port-preview`/
`module-preview` 在真正有内容时正确填充（来自 `diagnoseSimulation` / 解析结果）。
**验证**：添加端口信号后看两框是否显示内容、无内容时不占空间。

### 7.4 Bug C — 侧边栏左侧遗留空白条  ★中
**需求**：主区底部/左侧有一条约 40% 视口的空白条。
**根因已探明**：核心 CSS 有 `#main-area.with-vcd-panel{margin-bottom:40vh}`，而本项目不启用该 VCD 层级面板
（核心里没有任何代码操作它），于是主区被永久空出，侧边栏全高就显出左侧空白。
**推荐实现**：在 `index.html` 的 `<style>` 里加
`#main-area.with-vcd-panel{margin-left:0 !important;margin-bottom:0 !important;}` 即可。
（第五轮已写但随回退没了，重新加回去即可。）

### 7.5 Bug D — Windows 任务栏图标空白  ★低
**需求**：Edge `--app` 模式下任务栏图标空白。
**根因**：缺 favicon。注意应用由 C# 启动器以 `--app="http://127.0.0.1:port/index.html"` 打开，
任务栏图标取自页面 favicon。
**推荐实现**：在 `index.html` 加 `<link rel="icon" ... href="img/favicon.svg">` +
`<link rel="alternate icon" href="img/app.ico">`；同时 `build.ps1` 用 `/win32icon:img/app.ico`
给 exe 本体在资源管理器里也加图标（favicon 管运行时任务栏，ico 管 exe 文件图标，两者都做）。
`tools/gen-icon.mjs` 可无依赖生成 ico（若环境无 node-canvas，可改成直接写一个固定 SVG/favicon 或手绘 ico）。
**验证**：重建 exe 后在资源管理器与任务栏看图标。

### 7.6 总线进制切换（DEC/hex/bin）到右键菜单 + 去前缀  ★中（来自用户 6 项分析①）
**需求**：总线信号的进制切换放到信号**右键菜单**（替代现有顶部统一切换），并去掉 `0x`/`0b` 前缀；
当前 decimal 显示有问题（核心 `valueToLabel` 对字符串位串会原样返回/多出前缀）。
**推荐实现**：
- `feature-common.js` 已有 `wpf.setSignalRadix(sig,'dec'|'hex'|'bin')` 和 `busRadixLabel`（用 `model.js` 的
  `formatVectorValue` 正确转换并去前缀）。**这套函数在第五轮已写好且随回退被删**，逻辑可复用，
  但要重新加回，并接上矢量信号的右键菜单（在画布信号名上右键弹出 DEC/hex/bin）。
- 注意：`setSignalRadix` 之前用 `localStorage` 临时切换全局进制再还原，比较 hacky；更干净的做法是
  直接按信号自身 radix 调 `formatVectorValue`，不动全局。

### 7.7 整步/子步选择在总线也应生效  ★中（分析②）
**需求**：画布顶部"整步/子步"粒度开关，对总线（矢量）信号也应控制写入粒度（现只对位信号生效）。
**推荐实现**：`writeValue`（feature-common.js）已支持整步/子步。确认总线写入路径也走同一 `writeValue`
（而不是绕过它直接写单个下标）。总线默认建议**子步粒度**。

### 7.8 选择模式应复用编辑模式选总线的效果  ★中（分析③）
**需求**：在选择(select)/擦除(erase)模式下框选总线时，应当能像编辑模式一样得到"选区"并批量设值，
而不是只有一个框。
**推荐实现**：`feature-select.js` 的 `regionSignals` 之前只收 Bit，第五轮已改成 Bit+Vector 并分派
`nextValue`，逻辑方向对，可复用；但把它和 7.1 的总线编辑弹窗协调好（选择模式=批量设 1/0/x/翻转，
编辑模式=弹窗输任意值）。

### 7.9 常见信号画布延长时自动填补  ★中（分析⑤）
**需求**：画布向右延长时，常见信号（clock/reset 等）应**自动延续**典型波形（如时钟继续翻转、
复位保持释放后的电平），而不是补纯 0/1 或空白。
**推荐实现**：`feature-resize.js` 已有 `extendValue` 与 `sig.isClockPattern` 概念，可扩展：
延长时按信号类型推断延续值（时钟交替、复位维持末值、数据维持末值或保持 x）。

### 7.10 clock 自动添加应子步翻转？ —— 暂不实现，见 §5.2 警告
分析④希望 clock 自动添加成"子步级方波"。**强烈建议不要做**（会重现第五轮的仿真退化）。
若坚持要做，必须先证明仿真端对子步时钟采样正确，且绝不用 `isAlternating` 启发式。

### 7.11 参考 Vivado/Verdi 规划下一阶段  ★调研（分析⑥）
需求：调研专业波形工具（Vivado Waveform Viewer / Verdi nWave）的交互，规划下一阶段体验。
建议：先稳住上面 7.1–7.9 的功能正确性，再单独开一轮做交互范式调研，不要和修复混在一起。

---

## 8. 总线相关已有可用资产（别重复造轮子）
- `window.SignalType.Bit` / `SignalType.Vector`（核心全局）。
- `wpf.mapAt(x,y)` → `{signalIndex, signalSampleIndex, clickedOnName}`（命中测试）。
- `wpf.writeValue(sig, mainStep, subStep, value)`（feature-common.js，整步/子步双支持）。
- `wpf.refreshBusLabels(sig)` / `wpf.busRadixLabel(value, width)`（feature-common.js，按进制重算标签、去前缀）。
- `wpf.setSignalRadix(sig, name)` / `wpf.applyBusRadix()`（feature-common.js）。
- `model.js`：`normalizeVectorValue` / `formatVectorValue`（ESM，可 `import`）。

---

## 9. 构建、提交与验证流程（纪律）

1. 只在 `WavePaintSim/` 内改。
2. 每完成一个小功能/修复：**单独** `git commit`（父仓库内）。
3. 任何 js/css/img 改动后：**必须重建 exe**：在本机 PowerShell 跑
   `cd WavePaintSim; .\build.ps1`（内部调用 C# 编译器编译 Launcher 并内嵌资源）。
   **未重建 exe 的改动对用户不可见**（exe 内嵌 js/css，启动时重新解压）。
   ⚠ **构建有两个大坑，务必先读 `MEMORY.md`「构建：三个必须知道的坑」**：
   - **`build.ps1` 必须带 UTF-8 BOM**：无 BOM 时 Windows 的 PS 5.1 按 GBK 解码，
     中文会破坏引号/括号结构 → 脚本**解析失败、构建根本没执行**。
   - **`build.ps1` 不传播编译器失败码**：解析/编译失败时外层仍报 `exit 0`（"假成功"）。
     **判断构建是否真成功，只能看 exe 的时间戳/体积是否变化**，别信 exit code。
     需要看报错时把输出重定向到日志再读：
     `& powershell -ExecutionPolicy Bypass -File .\build.ps1 *>&1 | Out-File build.log`
   - 顺带一提：提交信息里出现 `csc` 这个字面量会触发本环境的安全策略拦截，写提交信息时请避开。
4. 验证门槛（缺一不可）：
   - `node tools/regression.mjs` → 必须 33/33（或你新增用例后对应数量全过）。
   - `node tools/e2e-sim.mjs` → 必须 0 失败（真跑 iverilog，确认仿真链路没断）。
   - `node --check <改动的 js>` → 语法检查（防整段脚本加载失败）。
   - 浏览器实测：UI bug 必须真在重建后的 exe 里点一遍（Bug A/C/D 尤其）。
   - 确认新代码真的进了 exe：`grep -ac "新代码里的独特字符串" WavePaint.exe`
5. 提交信息用中文祈使句，如 `fix(ui): 修复侧边栏收起后无展开入口`。

---

## 10. 给下一位 AI 的明确禁忌（别踩）
- ❌ 不要在 `sim-bridge.js` 里再搞"生成翻转 + 采样再翻转"的双写时钟逻辑。
- ❌ 不要用 `isAlternating` 之类的脆弱启发式去推断信号语义。
- ❌ 不要动 stride 口径（`子步+1`）而不重跑全量回归。
- ❌ 不要只改 CSS 就宣称 UI bug 修好——必须在重建后的 exe 里实测。
- ❌ 改了 JS 不重建 exe 就提交。
- ❌ 把 `WavePaint.exe` 提交回 git（它是构建产物，已被忽略）。
- ❌ 碰父仓库 `D:/Files/Code/波形/` 下 `WavePaintSim/` 之外的内容。

---

### 附：第五轮回退后的 git 状态（确认）
- 跟踪文件已 `git restore` 至 `6383c24`，与 HEAD 一致（仅 `.workbuddy/memory/2026-08-31.md` 为保留的日志）。
- 已删除本轮新增：`js/feature-bus-edit.js`、`img/app.ico`、`img/favicon.svg`、`tools/gen-icon.mjs`。
- `regression.mjs` 33/33 通过。
- 待办：在你本机跑 `.\build.ps1` 重建 exe，让内嵌 JS 与回退后的源码一致。
