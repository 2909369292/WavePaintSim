# 04 · 项目进展同步（跨 AI 接手必读）

> 本文件回答“现在做到哪了、下一步做什么、最近一轮发生了什么”。
> 每次任务开始/结束都必须更新本文件，保证下一个 AI 不用翻完整日志也能接手。

---

## 1. 当前状态快照（2026-09-09）

| 项 | 状态 |
|---|---|
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 代码状态 | 主线可用，`main` 分支 |
| 构建产物 | `D:\Files\Code\波形\WavePaintClean.exe` |
| 最近完成需求 | #82 遗留窗口收拢（旧 Edge 窗口停死随机端口 → “直接无法仿真”根治）；#81 Bug 自研修复 |
| 最近完成文档 | #80 记忆体系重构（已完成，旧目录已删除） |
| 最近一轮（第五轮） | 纯规划：Verdi ①查看波形 ②添加信号 ③top→例化模块源码 调研 → 拆解登记 #83~#87；未动代码，无需重建 exe |
| 当前阻塞 | 无 |
| 下一步主线 | 先行批 #85 点信号→加波形 → #86 实例→模块定义源码跳转 + 源码文件导入 → #84 波形查看增强；再收 #76 双向跳转/信号组入 `.wp`（详见 §4.5） |
| 测试基线 | regression 58/58、e2e-sim 0 失败、probe-param 全过 |
| UI 基线 | e2e-rtl 9/9（#75 浏览器冒烟）；e2e-ui 35 项（环境正常时全绿）；probe-tutorial / probe-addbtn / probe-simfail 全过；真 exe 冒烟通过（#82：收窗 5→1 + 端到端仿真 + UIA 真实点击 RUN→RESULT） |
| 交付提醒 | 重启应用、从唯一路径启动、面板版本号自查 |

---

## 2. 里程碑时间线

| 日期 | 里程碑 | 关键结论 |
|---|---|---|
| 2026-08-30 | 接手并实证定位“仿真恒为 0” | 真根因是 `rst_n` 低有效复位被默认激励恒置 0；stride 问题真实存在但不是恒 0 根因 |
| 2026-08-31 | 仿真链路修复与常见信号预填 | `e2e-sim` 固化，时钟/复位预填，主题改浅色 |
| 2026-09-01 | 解混淆核心完成 | `wavepaint.clean.js` 33K 行可维护源码，1:1 复刻验证 |
| 2026-09-02 | 分层重构完成 | `__core`/`wpf`/`editor`/`sim` 体系建立，历史 hack 清零 |
| 2026-09-03 | 私有 divisor 与交互收口 | 全链路统一 stride 口径，`parseValue` 成为唯一入口 |
| 2026-09-04 | 批次1~10 完成 | 文件菜单、实时预览、DUT 回显、顶层选择、版本显示、launcher 自愈 |
| 2026-09-08 | 参数化位宽修复 | 位宽算术交给 iverilog，regression 49/49 |
| 2026-09-09 | 记忆体系重构 | 所有跨 AI 记忆统一收敛到 `memory/` |
| 2026-09-09 | #75 Verdi 借鉴 P0 完成 | CM6 代码视图 + RTL Tree + VCD 全路径索引；regression 58/58、e2e-rtl 9/9、exe 已重建 |
| 2026-09-09 | #81 Bug 自研修复完成 | sim 瞬时离线自愈重试+45s 超时；添加信号按钮消失根治（教程 CSS/高亮）；教程隐形重启+键盘拦截拦截；exe 已重建 |
| 2026-09-09 | #82 遗留窗口收拢完成 | 重建/杀进程后旧 Edge 窗口残留死随机端口 → “直接无法仿真”+旧实例永不退出；launcher 开新窗前 `CloseLegacyWindows()` 收全部同名窗口；真机 5→1、新实例仿真通过、exe 已重建 |
| 2026-09-09 | Verdi 功能规划（第五轮，纯规划） | 用户要求研究 Verdi ①查看波形 ②添加信号 ③打开 top 自动找例化模块源码文件等；完成真实交互语义梳理 + WavePaint 差距对照，拆解登记 #83~#87（03 表 H）；未动代码 |

---

## 3. 已完成主线

1. **解混淆与重构**
   - 还原核心引擎并保持原版行为。
   - 建立 `core/editor/sim` 分层，清除 6 类历史 hack。
2. **仿真链路健壮化**
   - 端口精确匹配、私有 divisor、参数化位宽、VCD 层次回填。
   - `e2e-sim` 与 `probe-param` 全绿。
3. **交互与编辑增强**
   - 整步/子步统一、值输入唯一入口、框选、快捷键、测量、生成器、模板。
   - 工程存取、实时预览、任意工具复制粘贴。
4. **交付与运维**
   - exe 自包含 iverilog，本地 HTTP 服务，自愈保活。
   - 版本号自查，旧副本隔离策略，单实例。
5. **记忆体系**
   - `.workbuddy`、`docs/attic`、旧总纲全部收敛到 `memory/`。

---

## 4. 当前进行中 / 待交接

### 4.1 ✅ 已完成：#82 遗留窗口收拢（2026-09-09，最新交付）

用户报障「存在仿真失败的问题，直接无法仿真」。排查实证：

- 当前存活服务本身健康（headless 直连能正常出 4 信号）→ **不是服务/代码坏**；
- 真凶是用户 Edge 窗口停在**上一个已死实例的随机端口**（当天 9245），该页面同源
  `/api/*` 全部断连，点仿真必失败；
- 桌面当时有 5 个同名「WavePaint 波形编辑」窗口（部分活端口、部分死端口）——重建/
  杀进程时旧窗口不消失，而 `HasWindow()` 只看窗口标题 → 旧实例永不退出 +
  `OpenExistingInstance` 只开不收 → 死窗口越积越多。

修复（`WavePaintLauncher.cs`，+80 行）：

- 新增 `CloseLegacyWindows()`：开窗前枚举全部**可见**、标题含 `WavePaint/WaveWorkbench`
  的顶层窗口 → `PostMessage(WM_CLOSE)` → 最多等 2.5s；调用点 = `MainCore`（全新启动）
  与 `OpenExistingInstance`（接管已有实例）的 `Process.Start` 之前。
- 语义：桌面同一时刻只有一份指向最新实例的页面（死窗口/重复窗口先收再开）。
- 取舍见 `07-DECISIONS.md` D13：接受“活窗口时再次双击 exe 会关旧开新”的副作用。

验证：`CLOSE-LEGACY 5 window(s)`（真机 5→1）；新实例（端口 3521）headless 端到端仿真
通过（零异常零网络失败）；真实前台窗口 UIA 点 `sim-run` → 服务端 RUN→RESULT；
regression 58/58；e2e-sim 0 失败；exe 已重建并核验特征串。

> 完整过程见 `memory/logs/2026-09-09.md` 第四轮。

### 4.2 ✅ 已完成：#81 Bug 自研修复（2026-09-09）

用户报告：① 仿真服务“有可能不在线”；② 添加信号按钮图标“有时候会消失”。调查中又发现
③ 教程隐形重启（键盘拦截 + 给真实控件挂隐藏 class）。三个根因全部定位并修复：

- **Bug1 sim 瞬时离线**（`js/sim/ui-bridge.js`）：launcher 自愈（RestartServer）会造成
  “瞬时不可达窗口”，旧 UI 把窗口内被丢弃的请求一律误报“请重启应用”。修复 =
  `probeServerAlive()`（GET `api/ping`，800ms 超时）区分“进程死 / 自愈窗口”；
  `/api/sim` 挂 45s `AbortController`；网络失败且探活成功 → 自动静默重试一次
  （`simAutoRetried` 每次手动点击复位）；在线但请求未完成 → 准确定位超时/被丢弃。
- **Bug2 添加信号按钮图标消失**（`index.html`）：汉化 CSS 把 `.wp-tutorial-highlight`
  与瞬态教程元素一起 `display:none`，而教程 JS 把该 class 标到真实控件
  （`#add-signal-btn` 等）上 → 控件被永久隐藏。修复 = 隐藏列表移除该 class +
  防御规则保证真实控件（tool-btn/dropdown/menu-item/input）带高亮时仍可见可点。
- **Bug3 教程隐形重启**（`index.html` + `js/editor/file-menu.js`）：随机端口 ⇒
  localStorage 每会话全新 ⇒ 教程每次启动重跑（键盘拦截 + 高亮副作用）。修复 =
  `<head>` 内联脚本在 `clean.js` 前预置 `wavepaint_tutorial_done='true'`；
  `file-menu.js` 捕获阶段拦截「帮助→教程」，改弹中文提示，杜绝 `removeItem+queueTutorial`。

探针（`.e2e-tmp/`，gitignore 覆盖）与套件全部通过：probe-simfail 3 场景、probe-addbtn
全场景、probe-tutorial T1/T2、regression 58/58、probe-param、e2e-sim 0 失败、真 exe
冒烟通过。exe 已重建（C1）并核验 5 个特征串。完整过程见 `memory/logs/2026-09-09.md` 第三轮。

> 编号说明：用户会话里把本次任务称为「把 73 完成」，与台账 #73（参数化位宽，09-08 已
> 完成）数字相同但**不是同一件事**；为避免台账冲突，本 Bug 任务登记为 #81。

### 4.3 ✅ 已完成：#75 Verdi 借鉴 P0（2026-09-09）

- **CM6 代码视图**：`tools/cm6-entry.js` esbuild 预打包为 `lib/codemirror.bundle.js`（305KB，挂 `globalThis.WPCm`）；`rtl-panel.installCodeEditor` 挂载；textarea 保留为数据镜像（display:none），旧读路径 `refs.sourceEditor.value` 不变；bundle 缺失自动降级纯 textarea。
- **RTL Tree**：`js/sim/rtl-nav.js` 纯函数复用 `parseVerilogDesign` 为 module/port/param/instance 定位「文件+行号」（注释抹平等长空格保行号）；点击行跳转源码（跨文件先切标签页），状态栏显示「已定位到 module …」。
- **VCD 全路径索引**：`js/sim/vcd-index.js` 纯函数把 `parseVcd` 产物转点分作用域树，信号 title = 完整路径（如 `tb.q`）；`state.vcd` 存最近一次成功解析结果，仿真失败时清空防过期展示。
- 接入点全部在 `ui-bridge.js`：`initSourceCodeView` / `setEditorText` / `jumpToEditorLine` / `refreshStructureTrees` / `refreshVcdTree`。

### 4.4 【下一步主线】#76 Verdi 借鉴 P1

> 编号口径：台账中 P1 = #76（#75 是已完成的 P0）；此前 04/09 文档把 P1 误写成
> “#75 P1”，2026-09-09 第三轮已纠正。

**目标**
- 点变量 → 加波形（复用 `toNativeSignal` 注入链路）。
- 树 ↔ 代码双向跳转。
- 信号组入 `.wp` 工程。

**已有地基**
- P0 的 RTL 树 / VCD 层次树已能点击跳源码（跨文件）。
- `engine.js` 已解析模块、端口、参数、实例；VCD 带层次路径。
- P1 需处理：多实例歧义选择器、未 dump 信号提示、点信号加波形回调。

**建议顺序**
1. 先把「VCD/结构树信号行 → 加波形」的回调接到仿真面板。
2. 再做树 ↔ 代码双向跳转（代码行 → 反向高亮树节点）。
3. 最后做信号组写入 `.wp` 工程并回归存档。

### 4.5 【规划登记】#83~#87 Verdi 功能拆解（2026-09-09 第五轮，纯规划未动代码）

用户要求「详细研究 Verdi：①查看波形 ②添加信号 ③打开一个 top 时自动查找所有例化的模块的源码文件，以及其它好用功能，规划到本项目」。已完成研究并对照 WavePaint 现状拆解登记（台账 03 表 H）：

- **#85 点信号 → 加波形**（= #76 第一步，先行）：VCD/结构树信号行 → 画布注入。数据源与 `toNativeSignal` 链路已就绪，`onSignalPick` 现在只 `setStatus`，缺「加入画布」回调。
- **#86 实例 → 模块定义源码跳转 + 源码文件导入**：实例节点按 `moduleName` 跨文件定位同名 module 定义行；新增磁盘 `.sv/.v` 导入入口（Verdi filelist 语义的本地等价）。
- **#84 波形查看增强**：reload 重载 / 完整层次路径显示开关 / 游标快速移首末等（与已有 zoom/fit/measure/radix 互补）。
- **#87 其它好用功能**：Ctrl+W 源码选中加波形、Ctrl+4 模块全接口入波形、信号组管理（与 #76 信号组入 `.wp` 合流）、Active Annotation（与 P2=#77 合流）。

**建议落地顺序**：#85 → #86 → #84（先让“加信号”闭环，再补“找定义源码”，最后波形查看增强）；随后主线收 #76 的双向跳转与信号组入 `.wp`，再进 P2=#77。本轮只规划登记，用户尚未拍板实现范围，**未动任何代码**。

### 4.6 🔄 【当前进行中】#88~#92 存量功能完善（2026-09-09 第六轮，用户点名 5 项）

> 用户明确「目前不着急做 Verdi 远期（#83~#87）」，优先完善 5 项存量功能。编号见台账 03 表 I。
> 实现顺序：#90 → #88 → #92 → #91 → #89；每项一条 commit + 定向验证；
> 四项已完成（#90/#88/#92/#91），剩 #89 一项；全部完成后统一 C1 重建 exe + C8 特征串核验 + 全量工具链 + 交付提醒。

- **✅ #90 步数/子步数 ▲/▼ 微调按钮（Task3，2026-09-09 已提交）**
  - 改动：`index.html` 两个 `.step-input-wrapper` 内各加一对 `.step-arrow`（`data-target`/`data-step=±1`）；CSS 末尾追加 `.step-stepper/.step-arrow`；`js/editor/resize.js` 新增 `wireStepSteppers()` —— document capture `pointerdown` 命中 `.step-arrow` 时 `preventDefault`（不抢输入框焦点）+ `stopPropagation`，在 min/max 内取 `input.value` ±1，写回 spin 后派发 `change(bubbles)`，**复用**既有 capture change → `resizeSignals`（含撤销快照），与手输/回车同通道，不另起第二套 resize。
  - 验证：e2e-ui 新增 D2 段（6 断言：±1 提交、min=4/max=16 收敛）→ 42/42（真实 Edge）；`node tools/regression.mjs` 58/58；用例结束把 spin+模型恢复到 D 段状态，避免污染后续 E 段。
  - ⚠ exe 尚未重建：本批 5 项全部完成后再统一重建（见 03 表 I 备注）。
- **✅ #88 编辑模式点击 Vector 不再进框选（Task1，2026-09-09 已提交）**
  - 改动：`js/editor/value-input.js` onMouseDown 由 `ctrlKey||metaKey||isVector` 一锅端切 native/select，改为三分支 —— Ctrl/⌘（Bit/Vector）→ `mode='native'` 切 select 交 selection.js（框选保留）；非 Ctrl Vector → `mode='vector-paint'`：**不切工具** + `stopImmediatePropagation()/preventDefault()` 阻断核心 canvas 冒泡 vectorSelecting（否则 mouseup 会自弹旧式「Vector Value」框），mouseup 未拖动（>4px 阈值）时 `openValuePrompt` 弹「矢量值」弹窗（与 Bit 对齐，走 `wpf.parseValue`）；Bit → `mode=null` 原样放行 draw.js（核心仍先画一笔再弹窗，C 段依赖该行为，未触碰）。
  - 关键机制实证：value-input.js 在 index.html 先于 draw.js/selection.js 加载（L813~L817）→ 其 document capture 监听先注册 → `stopImmediatePropagation` 先于同层 draw/selection 且早于 canvas 冒泡的核心。
  - 验证：e2e-ui 新增 F 段（真实 Edge，7 断言：F1 单击弹「矢量值」不切 select 无工具条 / F2 输入 A→主步格 10+标签 A / F3 拖动不弹窗不框选值不变 / F4 Ctrl+单击框选 1 主步+工具条+Esc 自动回 paint / F4.5 会话后不再滞留 select）→ 50/50 全绿；`node tools/regression.mjs` 58/58。
  - ⚠ exe 尚未重建：本批 5 项全部完成后再统一重建（见 03 表 I 备注）。
- **✅ #92 框选输入后点画布其它处自动提交（Task5，2026-09-09 已提交）**
  - 改动：`js/editor/selection.js` —— 工具条 input 只跟踪「用户真实键入/粘贴」（`input` 事件 → `userTyped=true` + `data-typed='1'`；程序直改 `input.value` 不视为键入，保住 E6「残留半输入点画布=取消」语义）；`showBar()` 挂 `bar.__commitTyped()`（未键入返回 false；有键入 commitInput 收条后返回 true）。画布 mousedown（`onMouseDown`）与画布外 mousedown（document capture，非 canvas 且非 bar 内）收条前先 `dismissBar({commitIfTyping:true})` —— 有键入先自动提交再继续本次鼠标会话（单击=提交后清旧选区、拖动=提交后开新区）；Esc / resize 不带 commitIfTyping → 仍为取消；`hideBarKeepSelection()` 死代码已删。
  - 验证：e2e-ui 新增 G 段（真实 Edge，gbit/gvec，S=3）：G1 单击框 1 主步→输入 1→点画布其它格自动提交且清旧选区、工具仍 select；G2 输入 A 后拖新区域 → 旧 gvec 区自动提交 10/标签 A 且新选区在 gbit、bar 重开聚焦（会话延续）；G3 空输入点画布外 → 值不变/条关/选区清；G4 输入 1 后点画布外（inert div）→ 自动提交并关闭。→ **60/60 全绿**；`node tools/regression.mjs` 58/58。
  - ⚠ e2e 调试教训（防后人误判为产品 bug）：G2 首败 = 第二段拖拽起点落在浮动工具条矩形内（mousedown 命中工具条按钮 → suppressCommit），测试侧新增 `parkBarAway()`（把工具条挪到离拖拽点最远的角落）解决；G4 首败 = G2 失败的级联脏状态，G2 修复后自动转绿。另有环境坑：e2e 依赖固定端口 9531/8949，残留 headless Edge / dev-server 占端口会让新 e2e 连到上次调试的脏页面 → 大面积与改动无关的假失败（本次 37/60 的根因），跑前必须查端口并清理。
  - ⚠ exe 尚未重建：本批 5 项全部完成后再统一重建（见 03 表 I 备注）。
- **✅ #91 步长/子步变化时 Clock 自动填充防全 0/全 1（Task4，2026-09-09 已提交）**
  - 改动：`js/editor/resize.js` 重写重建核心 —— 删旧 `extractMainValues/detectPeriod/extendValue` 全量重建，改「主步块」语义：`cellBlocks` 按每信号 divisor（`wpf.divisorOf`，私有 subSteps 行=own+1）把旧 values 切成完整主步块；只改步数（dOld===dNew）时重叠区主步块**原样保留**，缺块用 `extendBlockAt` 按「已落位块序列」延续 —— `isClockPattern` 行 `detectBlockPeriod` 找整块最小周期（stride 3 的 101/010 交替块 p=2、stride 4 块长整除时钟周期的 p=1 均正确；不成周期兜底重复末块微形态，绝不塌常量），数据/未知行延续最后值、空行填 -1；改子步数时每个重叠主步 `resampleBlock`（首格恒取旧主值，子格按「新格中点」映射旧格，保留跨格翻转）；末尾 `remapAnchors/syncSignalMeta/pushUndoSnapshot/scheduleRedraw` 保留。
  - 关键实证：clock 行实际以「逐格 1,0,1,0…」存储（ui-bridge `clockCells` 口径，每主步必须内含翻转才有上升沿）；divisor=4 时块长是时钟周期(2)的整数倍 → 所有块两两相同（p=1），仅看主值序列（全 1）会误判为常量 → 旧代码把新块铺成同值 = 用户实测「变全 1/全 0」根因。
  - 验证：e2e-ui 新增 H 段（真实 Edge，hclk stride3 时钟/hdata Vector 阶梯/hpriv 私有 subSteps=3 时钟，`#sample-spin/#substep-spin` 真实 change 通道）：H1 步数 8→10 重叠 24 格原样+时钟主值 1/0 交替延续 10 步+数据尾 7 延续+hpriv 32 格原样尾 8 格继续 `1,0,1,0`；H2 截断回 8 三行与原始快照全等；H3 子步 2→0 主值 `1,0…` 不塌 + 私有行不被全局子步重采样；H4/H5 子步 0→1/1→2 往返主值相位保持 → **73/73 全绿**；`node tools/regression.mjs` 58/58。
  - ⚠ H1 初跑 72/73 失败归因：hpriv 尾部期望值写错（误以为 stride4 块会 `[1,0,1,0]/[0,1,0,1]` 交替），实证块序列同相（p=1）→ 期望修为 `1,0,1,0,1,0,1,0`，产品代码无需改。
  - ⚠ exe 尚未重建：等 #89 完成后统一重建（见 03 表 I 备注）。
- **⬜ #89 信号名显示位宽 `[msb:lsb]`（Task2，仅显示层）**
  - 位置：`wavepaint.clean.js` `calculateDynamicNameWidth`（~L17299，含 `_cachedSignalNamesHash`）/ `drawSignalName`（~L23116）；`Signal` 构造器无 width/msb/lsb，由 `ui-bridge.js` `toNativeSignal` 注入（`msb=width>1?String(width-1):''; lsb='0'`），Vector 位宽信息并非必然存在 → 无真实位宽信息不硬画。
  - 预期：绘制时拼**局部显示名**（不改 `sig.name`，避免影响改名/去重/hitTest/保存）；宽度缓存 hash 需纳入 `[msb:lsb]` 后缀。

---

## 5. 已知未排期方向

- 边缘对齐辅助线
- Ctrl+滚轮缩放增强
- 导出增强
- X 首现追溯
- 波形 diff
- VSCode 外接扩展

---

## 6. 近期重要结论（防遗忘）

- **stride 口径**：`stride = m_subStepCount + 1`，任何模块不得自推。
- **值解析**：唯一入口 `wpf.parseValue(raw, sig)`。
- **文件菜单**：核心按英文文本绑定，`file-menu.js` 必须按中文重绑。
- **新建工程**：必须就地重置 `document_wave`，禁止换对象。
- **参数化位宽**：TB 内嵌参数定义，最终由 iverilog 求值。
- **旧 exe 假象**：本地全绿但用户异常时，先查启动路径与版本号。
- **CM6 降级策略**：textarea 永远保留为数据镜像；CM 不可用只隐藏宿主，不影响任何旧逻辑。
- **行号真相源**：RTL/代码跳转行号一律按原始文件文本计算（注释抹成等长空格），不能从渲染后的 DOM 反推。
- **VCD 完整路径**：信号全路径 = 作用域点分 path + `.` + signal.name（`vcd-index.buildVcdHierarchy` 口径），P1/P2 直接复用。
- **教程 = 只留副作用**：汉化版隐藏教程 UI 后，教程重跑只剩“挂高亮 + 拦键盘”两类副作用；随机端口下 localStorage 每会话全新，必须在 `clean.js` 前预置 `wavepaint_tutorial_done`，并拦截「帮助→教程」菜单。
- **sim 失败先分死因**：`/api/sim` 失败必须探活区分「进程死 / 自愈窗口 / 在线但请求超时」；进程死才提示重启，自愈窗口自动重试一次，超时给准确文案。
- **自动化探测注意**：核心模态 Enter=Escape 会自行关闭；探测按键拦截必须先把弹窗关掉。`wpModalState` 是词法全局，`window.wpModalState` 取不到。
- **exe-smoke 端口文件**：按最近写入时间选 `WavePaintClean_port_*.txt`（残留旧文件的数字可能更大）。
- **死窗口陷阱（#82）**：Edge 同 profile 的 `--app` 窗口合并进一个 msedge 进程、无法按
  命令行区分 URL；`HasWindow()` 只看标题 → 残留窗口会让旧实例永不退出。重启/重建后开
  新窗前必须 `CloseLegacyWindows()` 收掉全部同名窗口，否则死端口页面会持续欺骗用户。

---

## 7. 维护规则

每次任务开始/结束时，更新：
1. 本文件第 1 节状态快照
2. 第 4 节进行中/待交接
3. 当日日志 `memory/logs/YYYY-MM-DD.md`
4. 若需求变化，同步 `03-REQUIREMENTS.md`
