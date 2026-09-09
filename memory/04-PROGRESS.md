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
| 最近完成需求 | Verdi 先行批第一步 **#85：VCD 树点信号 → 画布「观察行」**（2026-09-09 第十轮落地，见 §4.8）；此前第六轮 5 项 #90/#88/#92/#91/#89 与 #93 混淆残留清理均已收尾 |
| 最近完成文档 | **第十二轮澄清**（2026-09-09）：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4）；RTL 结构树降级为纯代码层级浏览（文件→模块→实例），删「端口 Ports / 参数 Parameters」分组、不显示接口信号、不承载加信号交互（原 #76 B2 撤销）。见 §4.10 / 03 表 F/H / 08 §1.2/§2 |
| 最近一轮（第十二轮，澄清+首批实施） | 用户拍板：通过代码直接下信号，RTL tree 仅用于看代码层级、不需要看到接口信号。先以纯文档 commit 修订记忆口径（详见 §4.10 / 08 §1.2/§2）；随后**同会话首批实施 = RTL 树瘦身已落地并验证**（renderRtlTree 删 ports/params 分组与模块行端口计数，只留 文件→模块→实例 跳转；数据层 `buildRtlNav` 不变供解析/B1 复用；e2e-rtl 新增 B3 断言 → 16/16、regression 62/62、e2e-ui 73/73、真 exe 冒烟通过、exe 已重建 22:19:04） |
| 当前阻塞 | 无 |
| 下一步主线 | 开工 **#86**（实例→模块定义源码跳转 + 源码文件导入 + 例化解析增强，拆解 A1~A4 见 08 §1.1）→ **#76**（B1 模块体内符号索引/scope 映射 → **B4 代码点变量加波形 = 唯一加信号主路径** → B3 双向跳转/B5 信号组入 `.wp`，拆解见 08 §1.2）→ **#87②**；#84/#77 已推迟远期（08 §3）。第十二轮首批实施（RTL 树瘦身）已完成，RTL 树不再承载端口/参数/加信号 |
| 测试基线 | regression 62/62（含 #89 新增 4 断言）、e2e-sim 0 失败、probe-param 全过 |
| UI 基线 | e2e-rtl 16/16（含 #85 D1~D6 + 第十二轮 B3 RTL 树纯层级浏览断言）；e2e-ui 73/73（真实 Edge，含 D2/F/G/H 段）；probe-tutorial / probe-addbtn / probe-simfail 全过；真 exe 冒烟通过（#82：收窗 5→1 + 端到端仿真 + UIA 真实点击 RUN→RESULT；本批 exe 冒烟 22:19 也通过） |
| 交付提醒 | 重启应用、从唯一路径启动、面板版本号自查（应显示 `v0.4.0 build 2026-09-09 22:19:04 31402a0`）；本次 exe 内置第十二轮 RTL 树瘦身（rtl-panel.js `renderRtlTree` 无端口/参数分组）、#85（`simWatches`/`pickVcdSignalIntoWave`）与第六轮收官 clean.js |

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
| 2026-09-09 | 插队清理 #93 混淆残留（第七轮） | clean.js 死代码清理 33,110→17,164 行（删 1732 别名/824 数值映射/解码器与反调试脚手架）；删除混淆源 `wavepaint.63e6dade.js`、`index.obf.html`、`tools/deobfuscate.mjs`、`tools/probe-core.mjs`（git 可恢复）；regression 58/58、exe 已重建 |
| 2026-09-09 | 插队清理 #93 收尾：第 7 pass 标识符重命名（第八轮） | 17,164→13,115 行（557,914 B）；19,132 处 `_0x…` 局部标识符 / 4,291 变量按 ESLint-scope 绑定图改名可读名，正文 `_0x` 清零；绑定一致性验证 BINDINGS OK；regression 58/58 + e2e-ui 73/73 + exe 已重建 |
| 2026-09-09 | 第六轮收官：#89 信号名位宽显示（第九轮） | clean.js `[PATCH-A6]` `displaySignalName` 显示层拼 `name[msb:lsb]`（不改 `sig.name`），测宽/宽度缓存键/`drawSignalName` fillText 三处消费；regression 62/62 + e2e-ui 73/73 + exe 重建（17:35:49） |
| 2026-09-09 | Verdi 先行批 #85：VCD 树点信号→画布观察行（第十轮） | ui-bridge.js `state.simWatches` + `pickVcdSignalIntoWave`：观察行 `__simInjected:true` 不进激励，重仿真按 VCD 路径刷新去重，删行不复活可重加；e2e-rtl 新增 D1~D6 → 15/15 + regression 62/62 + e2e-ui 73/73 + exe 重建（19:31:28） |
| 2026-09-09 | 第十一轮：优先级重排（纯规划文档） | 用户拍板：近期主线改 **#86 → #76**（底层支持更多 Verilog 代码互动 + 解析能力增强；交互层仿 Verdi）；#87 优先级提高（① 并入 #76、② 紧随其后）；侧栏/整体 UI 重构设计优先级提高（方案线）；**#84 波形查看增强、#77 Active Annotation 推迟打入远期**；更新 03/04/05/08/09 与当日日志，未动代码无需重建 exe |
| 2026-09-09 | 第十二轮首批实施：RTL 树瘦身完成 | 用户拍板「代码内点变量 = 加信号唯一主路径、RTL 树仅层级浏览」后同会话实施：`rtl-panel.js renderRtlTree` 删「端口 Ports / 参数 Parameters」分组与模块行端口计数（模块 meta 只显示实例数+行号），实例/模块跳转保留；`index.html` 注释同步口径；e2e-rtl 新增 B3 断言（无 .rtl-port/.rtl-param、无端口/参数文案）→ 16/16；regression 62/62 + e2e-ui 73/73 + 真 exe 冒烟通过；exe 重建（22:19:04，特征串「纯代码层级浏览」命中） |

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
- 点变量 → 加波形（复用 `toNativeSignal` 注入链路）——✅ VCD 树部分已于第十轮 #85 完成。
- 树 ↔ 代码双向跳转。
- 信号组入 `.wp` 工程。

**已有地基**
- P0 的 RTL 树 / VCD 层次树已能点击跳源码（跨文件）。
- `engine.js` 已解析模块、端口、参数、实例；VCD 带层次路径。
- ✅ #85（第十轮）已把「VCD 树信号行 → 加波形」闭环：观察行 `__simInjected:true` 不进激励、
  重仿真按 VCD 路径自动刷新去重、删行不复活可重加（详见 §4.8 / 当日日志第十轮）。
- P1 剩余：RTL 树侧点行加波形、多实例歧义选择器、树 ↔ 代码双向跳转、信号组入 `.wp`。

**建议顺序**
1. ✅（第十轮 #85 完成）「VCD 树信号行 → 加波形」回调。
2. （第十一轮重排后）近期主线：**#86**（实例→模块定义跳转 + 源码文件导入 + 例化解析增强）
   → 本 #76 收尾（RTL 树点行加波形 / 代码点变量加波形 / 树↔代码双向跳转 / 信号组入 `.wp`）。
3. 之后 #87①/②（Ctrl+W 语义并入 #76 B4、Ctrl+4 紧随）；#84/#77 已推迟远期（见 08 §3）。

### 4.5 【规划登记】#83~#87 Verdi 功能拆解（2026-09-09 第五轮，纯规划未动代码）

用户要求「详细研究 Verdi：①查看波形 ②添加信号 ③打开一个 top 时自动查找所有例化的模块的源码文件，以及其它好用功能，规划到本项目」。已完成研究并对照 WavePaint 现状拆解登记（台账 03 表 H）：

- **#85 点信号 → 加波形**（= #76 第一步，先行）：VCD/结构树信号行 → 画布注入。数据源与 `toNativeSignal` 链路已就绪，`onSignalPick` 现在只 `setStatus`，缺「加入画布」回调。
  ✅ **第十轮（2026-09-09）已完成**：VCD 树点信号 → 画布「观察行」闭环（详见 §4.8 与当日日志
  第十轮），e2e-rtl 15/15 + regression 62/62 + e2e-ui 73/73，exe 已重建（19:31:28）。RTL 结构树
  点行加波形仍属 #76 P1 后续项。
- **#86 实例 → 模块定义源码跳转 + 源码文件导入**：实例节点按 `moduleName` 跨文件定位同名 module 定义行；新增磁盘 `.sv/.v` 导入入口（Verdi filelist 语义的本地等价）。
- **#84 波形查看增强**：reload 重载 / 完整层次路径显示开关 / 游标快速移首末等（与已有 zoom/fit/measure/radix 互补）。
- **#87 其它好用功能**：Ctrl+W 源码选中加波形、Ctrl+4 模块全接口入波形、信号组管理（与 #76 信号组入 `.wp` 合流）、Active Annotation（与 P2=#77 合流）。

**建议落地顺序（第五轮初版）**：#85 → #86 → #84（先让“加信号”闭环，再补“找定义源码”，最后
波形查看增强）——#85 已于第十轮完成（见 §4.8）。
**第十一轮用户重排（当前生效）**：#84 推迟远期；近期主线 = #86 → #76（含代码点变量加波形），
其后 #87①/②；#77 打入远期。落地拆解见 08 §1；各 ID 落地状态以 03 表 H 状态栏为准。

### 4.6 ✅ 【已完成】#88~#92 存量功能完善（2026-09-09 第六轮，用户点名 5 项）

> 用户明确「目前不着急做 Verdi 远期（#83~#87）」，优先完善 5 项存量功能。编号见台账 03 表 I。
> 实现顺序：#90 → #88 → #92 → #91 → #89；每项一条 commit + 定向验证。
> ✅ 2026-09-09 收官：5 项全部完成（#89 落地于当日第九轮），批末已按 C1 统一重建 exe：
> `WavePaintClean.exe` 21,851,648 B、SHA256
> `4B8200C93C538BC93FD1E2743B7ECCDA6F298BA7FADDC7F7365BD0A62BCD3C37`、`version.txt` =
> `v0.4.0 build 2026-09-09 17:35:49 0bae1a4`（clean.js 已内置 #89 逻辑）。
> ⚠ 本批执行期间恰逢第七轮（死代码清理）+ 第八轮（第 7 pass 标识符重命名）也各自重建过 exe；
> 每次改 clean.js/index.html 等内嵌文件都必须按 C1 重建并 C8 核验（#89 是批末最后一遍）。

- **✅ #90 步数/子步数 ▲/▼ 微调按钮（Task3，2026-09-09 已提交）**
  - 改动：`index.html` 两个 `.step-input-wrapper` 内各加一对 `.step-arrow`（`data-target`/`data-step=±1`）；CSS 末尾追加 `.step-stepper/.step-arrow`；`js/editor/resize.js` 新增 `wireStepSteppers()` —— document capture `pointerdown` 命中 `.step-arrow` 时 `preventDefault`（不抢输入框焦点）+ `stopPropagation`，在 min/max 内取 `input.value` ±1，写回 spin 后派发 `change(bubbles)`，**复用**既有 capture change → `resizeSignals`（含撤销快照），与手输/回车同通道，不另起第二套 resize。
  - 验证：e2e-ui 新增 D2 段（6 断言：±1 提交、min=4/max=16 收敛）→ 42/42（真实 Edge）；`node tools/regression.mjs` 58/58；用例结束把 spin+模型恢复到 D 段状态，避免污染后续 E 段。
  - exe：本批收官后已按 C1 统一重建（2026-09-09 17:35:49，见 §4.6 文首）。
- **✅ #88 编辑模式点击 Vector 不再进框选（Task1，2026-09-09 已提交）**
  - 改动：`js/editor/value-input.js` onMouseDown 由 `ctrlKey||metaKey||isVector` 一锅端切 native/select，改为三分支 —— Ctrl/⌘（Bit/Vector）→ `mode='native'` 切 select 交 selection.js（框选保留）；非 Ctrl Vector → `mode='vector-paint'`：**不切工具** + `stopImmediatePropagation()/preventDefault()` 阻断核心 canvas 冒泡 vectorSelecting（否则 mouseup 会自弹旧式「Vector Value」框），mouseup 未拖动（>4px 阈值）时 `openValuePrompt` 弹「矢量值」弹窗（与 Bit 对齐，走 `wpf.parseValue`）；Bit → `mode=null` 原样放行 draw.js（核心仍先画一笔再弹窗，C 段依赖该行为，未触碰）。
  - 关键机制实证：value-input.js 在 index.html 先于 draw.js/selection.js 加载（L813~L817）→ 其 document capture 监听先注册 → `stopImmediatePropagation` 先于同层 draw/selection 且早于 canvas 冒泡的核心。
  - 验证：e2e-ui 新增 F 段（真实 Edge，7 断言：F1 单击弹「矢量值」不切 select 无工具条 / F2 输入 A→主步格 10+标签 A / F3 拖动不弹窗不框选值不变 / F4 Ctrl+单击框选 1 主步+工具条+Esc 自动回 paint / F4.5 会话后不再滞留 select）→ 50/50 全绿；`node tools/regression.mjs` 58/58。
  - exe：本批收官后已按 C1 统一重建（2026-09-09 17:35:49，见 §4.6 文首）。
- **✅ #92 框选输入后点画布其它处自动提交（Task5，2026-09-09 已提交）**
  - 改动：`js/editor/selection.js` —— 工具条 input 只跟踪「用户真实键入/粘贴」（`input` 事件 → `userTyped=true` + `data-typed='1'`；程序直改 `input.value` 不视为键入，保住 E6「残留半输入点画布=取消」语义）；`showBar()` 挂 `bar.__commitTyped()`（未键入返回 false；有键入 commitInput 收条后返回 true）。画布 mousedown（`onMouseDown`）与画布外 mousedown（document capture，非 canvas 且非 bar 内）收条前先 `dismissBar({commitIfTyping:true})` —— 有键入先自动提交再继续本次鼠标会话（单击=提交后清旧选区、拖动=提交后开新区）；Esc / resize 不带 commitIfTyping → 仍为取消；`hideBarKeepSelection()` 死代码已删。
  - 验证：e2e-ui 新增 G 段（真实 Edge，gbit/gvec，S=3）：G1 单击框 1 主步→输入 1→点画布其它格自动提交且清旧选区、工具仍 select；G2 输入 A 后拖新区域 → 旧 gvec 区自动提交 10/标签 A 且新选区在 gbit、bar 重开聚焦（会话延续）；G3 空输入点画布外 → 值不变/条关/选区清；G4 输入 1 后点画布外（inert div）→ 自动提交并关闭。→ **60/60 全绿**；`node tools/regression.mjs` 58/58。
  - ⚠ e2e 调试教训（防后人误判为产品 bug）：G2 首败 = 第二段拖拽起点落在浮动工具条矩形内（mousedown 命中工具条按钮 → suppressCommit），测试侧新增 `parkBarAway()`（把工具条挪到离拖拽点最远的角落）解决；G4 首败 = G2 失败的级联脏状态，G2 修复后自动转绿。另有环境坑：e2e 依赖固定端口 9531/8949，残留 headless Edge / dev-server 占端口会让新 e2e 连到上次调试的脏页面 → 大面积与改动无关的假失败（本次 37/60 的根因），跑前必须查端口并清理。
  - exe：本批收官后已按 C1 统一重建（2026-09-09 17:35:49，见 §4.6 文首）。
- **✅ #91 步长/子步变化时 Clock 自动填充防全 0/全 1（Task4，2026-09-09 已提交）**
  - 改动：`js/editor/resize.js` 重写重建核心 —— 删旧 `extractMainValues/detectPeriod/extendValue` 全量重建，改「主步块」语义：`cellBlocks` 按每信号 divisor（`wpf.divisorOf`，私有 subSteps 行=own+1）把旧 values 切成完整主步块；只改步数（dOld===dNew）时重叠区主步块**原样保留**，缺块用 `extendBlockAt` 按「已落位块序列」延续 —— `isClockPattern` 行 `detectBlockPeriod` 找整块最小周期（stride 3 的 101/010 交替块 p=2、stride 4 块长整除时钟周期的 p=1 均正确；不成周期兜底重复末块微形态，绝不塌常量），数据/未知行延续最后值、空行填 -1；改子步数时每个重叠主步 `resampleBlock`（首格恒取旧主值，子格按「新格中点」映射旧格，保留跨格翻转）；末尾 `remapAnchors/syncSignalMeta/pushUndoSnapshot/scheduleRedraw` 保留。
  - 关键实证：clock 行实际以「逐格 1,0,1,0…」存储（ui-bridge `clockCells` 口径，每主步必须内含翻转才有上升沿）；divisor=4 时块长是时钟周期(2)的整数倍 → 所有块两两相同（p=1），仅看主值序列（全 1）会误判为常量 → 旧代码把新块铺成同值 = 用户实测「变全 1/全 0」根因。
  - 验证：e2e-ui 新增 H 段（真实 Edge，hclk stride3 时钟/hdata Vector 阶梯/hpriv 私有 subSteps=3 时钟，`#sample-spin/#substep-spin` 真实 change 通道）：H1 步数 8→10 重叠 24 格原样+时钟主值 1/0 交替延续 10 步+数据尾 7 延续+hpriv 32 格原样尾 8 格继续 `1,0,1,0`；H2 截断回 8 三行与原始快照全等；H3 子步 2→0 主值 `1,0…` 不塌 + 私有行不被全局子步重采样；H4/H5 子步 0→1/1→2 往返主值相位保持 → **73/73 全绿**；`node tools/regression.mjs` 58/58。
  - ⚠ H1 初跑 72/73 失败归因：hpriv 尾部期望值写错（误以为 stride4 块会 `[1,0,1,0]/[0,1,0,1]` 交替），实证块序列同相（p=1）→ 期望修为 `1,0,1,0,1,0,1,0`，产品代码无需改。
  - exe：等 #89 完成后统一重建 —— 已完成（2026-09-09 17:35:49，见 §4.6 文首）。
- **✅ #89 信号名显示位宽 `[msb:lsb]`（Task2，仅显示层；2026-09-09 收官，第九轮）**
  - 改动（`js/wavepaint.clean.js`，遵守「只动头部注释与 `[PATCH-A*]` 补丁段」规矩）：新增
    `[PATCH-A6]` helper `displaySignalName(item)`（L5741~L5752，位于 `SIGNAL_NAME_WIDTH` L5740 与
    `_cachedDynamicNameWidth` L5753 之间）——有真实位宽（`width>1` 且 name 不含 `[`）拼
    `name[msb:lsb]`：`msb` 取 `item.msb` 非空值否则 `String(width-1)`、`lsb` 取 `item.lsb` 非空值
    否则 `'0'`（数字型 msb/lsb 也支持）；空 name / null / 空对象 / 位宽 1 / 无 width / 名字已带位域
    → 一律原样返回（无真实位宽信息绝不硬画）。
  - 两个消费点改走显示名：① `calculateDynamicNameWidth`（L5755~L5775）——宽度缓存 hash 与
    `measureText` 循环均 `arr.map(v3 => displaySignalName(v3))`，后缀自然参与测宽与缓存键失效；
    ② `drawSignalName`（L8839）——`fillText` 前 `let arr = displaySignalName(item)`，名字列显示
    `name[msb:lsb]`，截断省略逻辑作用于完整显示名。
  - 语义边界：**不改 `sig.name`**（改名/去重/hitTest/保存全不受影响）；位宽信息由 `ui-bridge.js`
    `toNativeSignal` 注入（`msb=width>1?String(width-1):''; lsb='0'`），手绘/核心 Signal 无 width
    字段 → 不加后缀。
  - 验证：`node --check js/wavepaint.clean.js` 通过；regression 新增 4 条 #89 断言
    （`tools/regression.mjs` L878~L986，`compileCoreFunction` 从核心抽取**真实函数**：后缀拼接四例 /
    原样兜底八例 / 测宽含后缀且缓存命中不重测 / drawSignalName 画布 fillText 显示名）→ **62/62 全绿**；
    e2e-ui **73/73 全绿**（真实 Edge）。
  - exe 已按 C1 重建：21,851,648 B、SHA256 `4B8200C9…C37`、`version.txt` = `v0.4.0 build
    2026-09-09 17:35:49 0bae1a4`。

---

### 4.7 ✅ 已完成：插队清理 #93 混淆残留 = 第七轮死代码清理 + 第八轮标识符重命名（2026-09-09）

用户插队要求「混淆代码太影响更改效率，检查还有哪些混淆代码 / 重复、已解码产物，剔除不
需要的混淆部分」。调查结论（第七轮实证）：

- **业务代码/HTML 无混淆残留**。唯一混淆源 = `js/wavepaint.63e6dade.js`（obfuscator.io），
  早已解混淆为 `js/wavepaint.clean.js` 且 `index.html` 只引用 clean.js → 混淆源是纯冗余。
- **clean.js 自身曾带大量 obfuscator.io 死脚手架**：顶层别名+rotate IIFE、反调试
  console 闭包、字符串解码器 `_0x55bf`、stringArray 工厂 `_0x3f97`（base64 数组）、
  全文件散落 **1732 个解码器别名声明（零调用）** 与 **824 个纯数值映射对象（零使用）**。
- **死代码清理后正文仍残留 `_0x…` 局部标识符（19,132 处 / 4,291 变量）** —— 虽已可读，
  仍拖累检索与定位，故第八轮再做 scope-safe 重命名收尾。

第七轮改法（死代码清理 + 删混淆物）：
1. 编写 AST 静态死代码分析（`.e2e-tmp/`，gitignore）：全部别名/映射经引用计数证明零调用后
   删除；严格「字符子序列」验证新文件 = 旧文件删段（未加内容/未改顺序）→ 语义零风险。
2. `js/wavepaint.clean.js`：33,110 → 17,164 行（删 1732 别名、824 数值 map、460 stub），
   头部改写为正式维护说明（本文件已是**唯一直接维护的核心**）。
3. 删除过时混淆物（git rm，历史可恢复）：`js/wavepaint.63e6dade.js`（混淆源）、
   `index.obf.html`（引用已删除脚本，双重过时）、`tools/deobfuscate.mjs` /
   `tools/probe-core.mjs`（一次性脚本，只引用已删混淆源）。

第八轮改法（第 7 pass 标识符重命名）：
1. 用 ESLint-scope 建绑定图（`.e2e-tmp/rename-idents.mjs` + `verify-bindings.mjs`），对每个
   `_0x…` 绑定变量按语义角色批量改名（构造器/函数 → 用途可读名，如 `createWaveformDocument`；
   其余按角色前缀 + 计数），**scope 内唯一性校验**防重名遮蔽。
2. `js/wavepaint.clean.js`：17,164 → 13,115 行（557,914 B）；正文 `_0x` 残留清零
   （仅剩头部注释 2 处历史提及 + 人工补丁段 `_0x_wpf*` 变量，后者是 feature 补丁自取名，
   属可读性豁免）。回归锚 `[PATCH-A3]`/`[PATCH-A5]` 等全部原样保留。
3. 同步 `tools/regression.mjs`（valueToLabel 抽取改为锚 `[PATCH-A3]` 定位，不再依赖旧的
   `['valueToLab'+'el'](` 拼接 marker）、`README.md` / `js/core/wpf.js` 注释 / 全部
   memory（01/03/04/05/07/08/09 + 当日日志）。

验证：`node --check js/wavepaint.clean.js` 通过；`node tools/regression.mjs` **58/58 全绿**；
`.e2e-tmp/verify-bindings.mjs` **BINDINGS OK**（4,290 分组 / 4,291 变量，改名后无 `_0x`
变量、同 def 位点 refs 完全一致）；e2e-ui **73/73**（真实 Edge，无页面错误/404/控制台异常）；
exe 已按 C1 重建（SHA256 `A096EE5D…F99D`，version `v0.4.0 build 2026-09-09 16:45:51 0bae1a4`）。

> 后续维护：解混淆收尾已**全部完成**——clean.js 正文既无死脚手架也无 `_0x` 变量，头部
> 注释注明维护背景与 C1/C17 义务。**勿**重新引入混淆源或 deobfuscate 脚本；改 clean.js
> 只准动头部注释（前 9 行）与补丁段（`[PATCH-A*]`），改完必须重建 exe。

### 4.8 ✅ 已完成：#85 VCD 点信号 → 画布「观察行」（2026-09-09 第十轮，Verdi 先行批第一步）

主线 03 表 H #85 = #76 P1 先行批（#85 → #86 → #84）第一步：VCD 树点信号 → 画布加行。改动
集中在 `js/sim/ui-bridge.js`（+139 行），测试在 `tools/e2e-rtl.mjs`（+80 行，新增 D1~D6）。

- **登记与采样**：新增 `state.simWatches`（`{path,name,width,reference}`，path = 点分全路径，
  口径同 vcd-index：scope path + '.' + name）；`vcdSignalByFullPath` 精确查 `state.vcd.signals`；
  `sampleVcdMainValues` 按主步采样（格子 i ↔ `round(i*tmax/timeSteps)`，复制 engine 内部
  buildOutputs 口径，vector 用 `normalizeVectorValue` 补位宽）。
- **点行行为**：`refreshVcdTree` 回调由 `setStatus` 改为 `pickVcdSignalIntoWave`——已在画布 →
  提示「已在波形中」+ 滚动定位（`scrollTop = i*40`）；不在 → 登记 + push 行 + render + 滚动；
  无 VCD / 未 dump → 中文提示不静默。
- **注入语义**：观察行 `__simInjected:true`（不进 `readWaveDocument`、绝不参与生成 TB/激励）；
  `replaceInjectedOutputs` 在 strip 前先按现存行存活同步登记（删行不复活，可重新点行加入）；
  重建 `m_signals = [...baseSignals, ...watchRows, ...injected]` —— 新一轮仿真后观察行按 VCD
  路径自动刷新且同名去重。
- **边界**：只读复用 engine 采样口径，未改 `sim/engine.js` 的 stride/端口匹配/VCD 回填；
  未动 clean.js / HTML，无需重跑 esbuild / 第 7 pass。
- **验证**：`node tools/regression.mjs` **62/62**；`node tools/e2e-rtl.mjs` **15/15**（D1 加行 /
  D2 位宽类型与 VCD 一致（q[3:0] vector type=1）/ D3 values 与同源输出行 q 全等 / D4 重复点
  不重复加 / D5 删行重加 / D6 重仿真后保留 1 条且数据随新结果刷新）；e2e-ui 73/73；
  e2e-sim 0 失败。
- **exe**：已按 C1 重建（21,857,280 B、时间戳 19:31:28、SHA256 `298B06AA…92E`、
  `version.txt` = `v0.4.0 build 2026-09-09 19:31:28 25525f0`）；特征串 `rg -a -c`：
  pickVcdSignalIntoWave=2 / __simWatchPath=6 / simWatches=9。

> 完整过程见 `memory/logs/2026-09-09.md` 第十轮。#85 只做 VCD 侧；RTL 结构树点行加波形、#86
> （实例→模块定义源码跳转 + 源码文件导入）、#84（波形查看增强）仍为 ⬜，见 03 表 H / §4.5。

### 4.9 【规划重排】第十一轮：用户拍板优先级（2026-09-09，纯文档未动代码）

用户要求：「推迟 #84 波形查看增强、改入远期规划；先完成 #86、#76，重点是**在底层支持更多
Verilog 代码的互动**以及**代码的解析能力**，**交互层需要仿照 Verdi 进行规划**；#77 也打入
远期；#87 的优先级提高；侧栏 UI 重构设计的优先级提高。」已据此重排：

- **近期主线 = #86 → #76 → #87①/②**（拆解见 08 §1.1/§1.2）。#86 从“接跳转”升级为
  「例化解析增强（参数化/命名端口/generate 内例化/多文件同名歧义）+ 实例跳定义 + 磁盘源码
  导入」（A1~A4）；#76 从“收尾”升级为「模块体内符号索引 + scope 映射（解析能力底座）+
  RTL 树点行加波形 + 代码点变量加波形（“中追”式 = #87①）+ 树↔代码双向跳转 + 信号组入
  `.wp`」（B1~B5）。
- **#87 优先级提高**：① 并入 #76 B4；② 模块全接口入波形（Ctrl+4）紧跟 #76；③ 与 #76
  信号组入 `.wp` 合流；④ Active Annotation 随 #77 远期。
- **#84 波形查看增强、#77 Active Annotation**：推迟**打入远期**（08 §3），不再排期。
- **侧栏 / 整体 UI 重构设计**：优先级提高，作为与主线并行的方案线（08 §2）——先出设计
  方案给用户 review 再实施；含“是否交给其它 AI 设计”的工作方式选项。
- 纯文档轮：只改 `memory/`（03/04/05/08/09 + 当日日志第十一轮），未动运行时代码 →
  **无需重建 exe**；按 C2 提交推送。

---

### 4.10 【第十二轮澄清】代码点变量 = 加信号唯一主路径；RTL 树瘦身为纯层级浏览

用户要求（原话）：「我希望通过代码直接下信号，而不是 RTL tree，RTL tree 的作用仅仅是为了
方便看代码层级，我也不需要在上面看到接口信号其他功能。其他功能经过规划后 按照规划进行实施」
已据此澄清（详见 08 §1.2/§2、03 表 F/H、当日日志第十二轮）：

- **加信号主路径 = 代码内操作变量**（点/选中 + 快捷键，“中追”式 = #87① = #76 B4），最终
  语义对齐 Verdi nWave Ctrl+W：直接在代码变量名上操作 → 画布波形；不引入单独“信号层次
  选择框”，不要“运行后把所有可看变量全自动加上”（#83③c 遗留随 B4 一并统一为“用户主动点”）。
- **RTL 结构树降级为纯代码层级浏览**：只保留 文件 → 模块（跳 module 定义行）→ 实例
  （跳例化点行），**删除「端口 Ports / 参数 Parameters」分组与模块行端口计数**；不给 RTL 树
  挂任何“点信号 → 画布”能力。用户不需要在 RTL 树上看到接口/信号信息（#85 中“RTL 结构树
  点行加波形属 #76 P1 后续”作废，B2 撤销）。
- 数据层不改：`rtl-nav.js buildRtlNav` 继续产出 ports/params/instances（解析测试、模块定义
  跳转、B1“代码符号 → VCD scope”映射仍要复用），只改 `rtl-panel.js renderRtlTree` 的 UI
  渲染不展示 ports/params。
- 其余主线不变：#86（A1~A4）→ #76（B1 符号索引/scope 映射 → B4 代码点选加波形 → B3/B5）
  → #87②；UI 重构方案线（08 §2）并行，草案中的“RTL 树”区按“纯层级浏览”口径设计。

**✅ 首批实施已完成（2026-09-09，同会话）**：RTL 树瘦身 —— 只删 UI 渲染（`rtl-panel.js`
`renderRtlTree`：删除「端口 Ports / 参数 Parameters」两个分组与模块行端口计数，模块 meta
只显示 `实例 N · L行号`；模块/实例跳转原样保留），`index.html` 区域注释同步「纯代码层级浏览」
口径；**不碰** engine/rtl-nav 数据层与 stride/端口匹配/VCD 回填（C9）。验证：e2e-rtl 新增
B3 断言（`.rtl-port`/`.rtl-param` 为 0、无端口/参数文案、实例行仍在）→ **16/16**；regression
**62/62**；e2e-ui **73/73**；真 exe 冒烟通过；exe 已按 C1 重建（2026-09-09 22:19:04，
`version.txt` = `v0.4.0 build 2026-09-09 22:19:04 31402a0`，特征串 `rg -a -c "纯代码层级浏览"`
= 1）。数据层 `buildRtlNav` 仍产出 ports/params/instances 供解析测试与 #76 B1 scope 映射复用。

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
- **VCD 观察行（#85）**：点 VCD 信号行加入的观察行走 `state.simWatches` + `__simWatchPath`，
  `__simInjected:true` 不进 `readWaveDocument`（绝不生成激励）；重仿真时 `replaceInjectedOutputs`
  按路径重建 = 自动刷新 + 去重；删行即摘登记不复活（可重新点行加入）。
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
