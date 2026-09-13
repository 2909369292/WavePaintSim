# 07 · 关键决策记录（ADR）

> 本文件记录项目的重要技术取舍。每条决策包含：背景、决策、理由、否决方案、影响。
> **新决策必须追加到本文件**，避免后续 AI 重新争论已定结论。

---

## D01 · 直接维护解混淆后的核心

- **背景**：原始 JS 混淆严重，外挂补丁脆弱。
- **决策**：解混淆后直接维护 `wavepaint.clean.js`，不再外挂。
- **理由**：可长期维护，行为可验证。
- **否决方案**：继续外挂 feature 文件、重写核心。
- **影响**：核心体量大，但可控；历史 hack 全部清除。

---

## D02 · 使用 `__core` 作为唯一核心桥接

- **背景**：核心顶层全局标识符多，外部直接引用脆弱。
- **决策**：建立 `js/core/__core.js`，所有外部模块经它访问核心状态。
- **理由**：收敛魔法名，降低重构风险。
- **否决方案**：继续散落直接引用。
- **影响**：核心改动影响面可控。

---

## D03 · `wpf` 保留为共享层

- **背景**：历史 feature-common 功能仍被多处使用。
- **决策**：保留 `js/core/wpf.js`，作为坐标、解析、undo、进制、弹窗的共享层。
- **理由**：兼容已有调用，减少一次性迁移风险。
- **否决方案**：全部并入 `__core`。
- **影响**：新代码优先用 `__core`，`wpf` 作为稳定共享层继续维护。

---

## D04 · 仿真后端采用 iverilog + vvp

- **背景**：需要 Windows 可用、语义与事件级波形匹配。
- **决策**：内嵌 `ivl.zip`，通过 C# launcher 调 iverilog/vvp。
- **理由**：开源、Windows 可用、事件级语义匹配手绘波形。
- **否决方案**：VCS/Questa/Xcelium（商业 + Linux only）、Verilator（周期级，远期可选）。
- **影响**：当前主后端稳定，架构上 `/api/sim` 可扩展。

---

## D05 · 使用 C# HttpListener + Edge App

- **背景**：需要单文件 exe、本地服务、桌面窗口。
- **决策**：C# 启动器 + `HttpListener` + Edge `--app`。
- **理由**：免安装浏览器内核，复用系统 Edge，保持轻量。
- **否决方案**：Electron / WebView2。
- **影响**：需处理 Edge 依赖、心跳和单实例。

---

## D06 · 私有 divisor 模型

- **背景**：不同信号需要不同 subSteps。
- **决策**：每个信号可带独立 `divisor` / `subSteps`。
- **理由**：支持复杂波形与局部子步。
- **否决方案**：全局统一 stride。
- **影响**：所有读写必须走 `wpf.divisorOf()`。

---

## D07 · `wpf.parseValue` 唯一值解析

- **背景**：多套解析导致多 bit 值错误。
- **决策**：所有值输入统一走 `wpf.parseValue(raw, sig)`。
- **理由**：单一真相源，便于回归。
- **否决方案**：各模块自行解析。
- **影响**：进制、位串、x/z 语义统一。

---

## D08 · 文件菜单中文重绑

- **背景**：核心菜单按英文文本绑定，汉化后死菜单。
- **决策**：`file-menu.js` 按中文文本重新绑定。
- **理由**：兼容核心实现，不破坏原版行为。
- **否决方案**：修改核心菜单绑定源码。
- **影响**：菜单文案改动必须同步 handlers 表。

---

## D09 · 参数化位宽交给 iverilog

- **背景**：本地求值器难以完整实现 Verilog 表达式。
- **决策**：TB 内嵌参数定义，位宽表达式交给 iverilog。
- **理由**：避免重复实现语言语义。
- **否决方案**：继续扩展本地求值器。
- **影响**：支持嵌套参数、`$clog2`、移位、sized 字面量。

---

## D10 · 记忆体系收敛到 `memory/`

- **背景**：`.workbuddy`、`docs/attic`、旧总纲分散，跨 AI 接手成本高。
- **决策**：统一收敛到 `memory/`，删除旧记忆目录。
- **理由**：单一入口、单一真相源、便于维护。
- **否决方案**：继续多目录并存。
- **影响**：所有记忆更新只发生在 `memory/`。

---

## D11 · CodeMirror 6 与 textarea 数据镜像共存（#75）

- **背景**：引入 CM6 代码视图，但核心与旧逻辑大量读 `refs.sourceEditor.value`，直接切换会大面积改 `ui-bridge`。
- **决策**：textarea 保留为数据镜像（display:none）；CM 用户编辑 onChange 同步回 textarea；CM bundle 缺失时 `installCodeEditor` 返回 `active=false` 并隐藏 CM host 降级纯 textarea；切文件/程序性写统一走 `setEditorText`，销毁重建 EditorView。
- **理由**：旧读路径零改动；降级无风险；重建 EditorView 使 undo 不跨文件回滚。
- **否决方案**：大规模改写全部读路径用 CM 状态；Monaco（体积 +4MB）。
- **影响**：`setEditorText` / `jumpToEditorLine` 成为唯一写入口；编辑防抖 350ms 重建 RTL 树。

## D12 · RTL/VCD 结构数据纯函数化，DOM 只做渲染（#75）

- **背景**：RTL 树与 VCD 树既要 UI 又要可回归；P1 点变量加波形还要复用同一数据口径。
- **决策**：`js/sim/rtl-nav.js`、`js/sim/vcd-index.js` 为纯函数数据源（无 DOM、可 JSON 序列化），`js/sim/rtl-panel.js` 只负责渲染与点击交互，不 import ui-bridge（防循环依赖）。
- **理由**：`regression.mjs` 可直接 import 单测；行号与全路径口径单一，P1/P2 直接复用。
- **否决方案**：逻辑全部内联进 `rtl-panel.js` / `ui-bridge.js`。
- **影响**：回归 58/58（新增 9 项纯函数用例）；P1 的「信号 → 加波形」拿到完整点分路径即插即用。

## D13 · 开新窗前一律 WM_CLOSE 收拢同名遗留窗口（#82）

- **背景**：exe 重建/崩溃/杀进程后，旧 Edge `--app` 窗口残留并停在旧随机端口，用户点开
  即“直接无法仿真”；残留窗口还让 `HasWindow()` 误判“有窗口在服务” → 旧实例永不退出、
  死端口窗口越积越多。
- **决策**：`WavePaintLauncher.cs` 新增 `CloseLegacyWindows()`，在 `MainCore`（全新启动）
  与 `OpenExistingInstance`（已有实例在跑）两处 `Process.Start` **之前**，对全部可见、
  标题含 `WavePaint`/`WaveWorkbench` 的顶层窗口 `PostMessage(WM_CLOSE)`（最多等 ~2.5s），
  随后只开一个新窗口。语义 = 桌面同一时刻只有一份指向“最新一次启动”的页面。
- **理由**：收旧窗是根治“死页面欺骗用户 + 旧实例永不退出”的唯一可靠入口；实测一次
  收 5 个窗口、新实例端到端仿真通过。
- **否决方案**：
  1. 只关“死端口窗口”——Edge 同 profile 合并后窗口无 `--app=` 命令行、标题相同，无法
     区分窗口指向哪个端口，需 CDP 逐窗探 URL，复杂度高且不稳；
  2. 只在 `MainCore` 收、`OpenExistingInstance` 不收——无法处理“旧实例仍活但桌面已有
     死窗口”的用户现状，本次用户正是这种状态。
- **影响**：
  - 正向：重启/重建后不再累积死窗口；旧实例能被正常退出（无残留窗口 → 关页即退出）。
  - 副作用：用户已有活窗口时再次双击 exe（走 `OpenExistingInstance`）会关掉旧窗口开
    新的 —— 活页上未保存的内容会随关窗丢失（旧行为是多开一个重复窗口，不丢数据但
    正是累积源头）。权衡后接受：正常使用是“关窗即退，再启动走 MainCore”，不会触发；
    交付说明与日志中已写明该行为。
  - 该函数只按标题过滤，不校验窗口归属；单实例单会话场景下可接受，多会话部署需收紧。

---

## D14 · 删除混淆源与一次性解混淆脚本，clean.js 为唯一核心（#93）

- **背景**：2026-09-01 解混淆产物 `wavepaint.clean.js` 早已是唯一被引用的核心，但混淆源
  `wavepaint.63e6dade.js`（1.43MB）与一次性脚本 `tools/deobfuscate.mjs` /
  `tools/probe-core.mjs`、对照页 `index.obf.html` 当时仍留在仓库，且 clean.js 内还残留大量
  obfuscator.io 死脚手架（别名网络/数值映射/解码器），混淆代码影响后续 AI 更改效率。
- **决策**：
  1. 对 clean.js 做 AST 静态死代码清理（删除经引用计数证明零调用的 1732 个别名声明、
     824 个纯数值映射对象、字符串解码器/stringArray 工厂与反调试/rotate 闭包），并以
     「严格字符子序列」验证（新文件 = 旧文件删段）保证语义零变化；33,110 → 17,164 行。
  2. `git rm` 删除混淆源、`index.obf.html`、`deobfuscate.mjs`、`probe-core.mjs`
     （用户明确要求剔除；C6「可恢复」由 git 历史满足，不再另建 trash 副本）。
  3. （2026-09-09 追加·第 7 pass）死代码清理后，再按 ESLint-scope 绑定图把残留的
     `_0x…` 局部标识符重命名为可读名（19,132 处 / 4,291 变量，绑定一致性验证 BINDINGS OK），
     完成解混淆收尾 —— 正文 `_0x` 清零，17,164 → 13,115 行。
- **理由**：已解码产物 100% 替代混淆源且无任何引用指向混淆源；一次性脚本只引用已删文件；
  保留它们只会让后续 AI 混淆维护入口。
- **否决方案**：保留混淆源作“对照”（无消费者，纯冗余）；把死脚手架改名收藏（仍是无用
  代码，继续拖累搜索与行号定位）；物理删除而不留 git 历史（违反 C6 可恢复）。
- **影响**：
  - `wavepaint.clean.js` 成为唯一直接维护的核心，头部注释写明维护背景与 C1/C17 义务；
    `rg` 搜索与行号定位效率显著提升（33K → 13.1K 行）。
  - 未来如需对照原始混淆逻辑，从 git 历史检出对应提交即可（`git log -- js/wavepaint.63e6dade.js`）。
  - **2026-09-09 第 7 pass 完成**：不再有 `_0x` 变量残留（仅头部注释与人工补丁段
    `_0x_wpf*` 变量）；此后 clean.js 的搜索、行号、diff 均为可读标识符。若再遇代码难读，
    检查是否又混入了新混淆产物（应走补丁段维护，勿引入混淆源）。

---

## D15 · 仿真服务可用性策略：固定端口 + 身份标识判活 + 恢复一律不跳转（2026-09-10）

- **背景**：用户报「本地仿真失败，反正请求无响应」，并要求「每次点击仿真必须调用仿真服务、
  必须仿真成功」。查清四类并存死因：① exe 进程死（端口无监听）；② 旧版每次启动随机端口
  ⇒ 已打开页面 origin 钉死旧端口、刷新无效；③ 端口被第三方程序占用 ⇒ 请求发给了别人；
  ④ 换版本后首次启动走 extract 分支，`ivlRoot` 未赋值 ⇒ `ArgumentNullException` ⇒ 服务
  从未启动（每轮重建 exe 后第一次启动必踩）。
- **决策**：
  1. **端口固定首选 `17817`**（`PreferredPort`），仅在被占用等启动失败时换端口并标注
     `fallback-port`。页面 origin 跨会话稳定 ⇒ 老页面可直接重连、localStorage 跨会话保留。
  2. **判活必须带身份标识**：`/api/ping` 应答 `WAVEPAINT-SERVICE\n端口\nbuildStamp\n`
     （+ `Cache-Control: no-store`）；前端 `service-guard.pingOrigin()` 校验首行才认，
     **只看 `200/ok` 一律不算在线**。dev-server 同款格式。
  3. **恢复 = 改 `simApiBase` 或同端口重拉，禁止任何自动整页跳转**。协议 URL
     `wavepaint://start?port=<本页端口>` 让重拉的服务回到同一端口（同源、无需跳转）。
  4. **触发外部协议只用隐藏 iframe**（`service-guard.relaunch()`），不用顶层跳转 /
     `window.open` / `<a target=_blank>`。
  5. `ivlRoot` 在 extract 分支末尾统一赋值；新增 `EnsureIvlReady()` 且**每轮仿真前兜底**，
     iverilog 缺失时从内嵌 `ivl.zip` 现补，补不了返回可读中文错误。
- **理由**：这是「服务不在线」的根治路线——把不可恢复变成可自动恢复；同时本应用**没有
  自动保存**，任何跳转都会静默销毁用户未保存的画布内容，代价远大于「仿真失败」。
- **否决方案**：
  1. 只加「请重启应用」提示 / 只加重试按钮 —— 不解决进程死与端口漂移，用户仍需手工救；
  2. 保持每次随机端口、前端靠端口文件发现 —— 页面 origin 已钉死，跨端口 `fetch` 还要
     依赖 CORS 与发现时机，复杂且脆弱；
  3. 发现服务在别的端口就 `location.href` 跳过去 —— 丢未保存画布（实测浏览器对
     `window.open`/顶层跳转触发外部协议还会以 `user gesture is required` 拦截）；
  4. 自动重启 exe 时另开新窗口 —— 会重演 #82 的死亡窗口累积（`CloseLegacyWindows` 已定
     「桌面只留一份最新页面」语义，保持一致）。
- **影响**：
  - 服务死 → 点仿真会自动重连/重拉并**自动重试一次**（`simAutoRetried` 限一次）；仍失败则
    `showRecoverPending`/`showRecoverHint` 亮出 `#sim-recover` 手动按钮 + 中文指引。
  - **首次**使用会触发浏览器一次「是否允许打开 wavepaint:」询问，用户勾「始终允许」后无感
    （浏览器安全策略，应用侧无法绕过；自动化测试用预置协议允许表 + 模拟 OS 回调等价覆盖）。
  - 端口语义变化会影响所有硬编码端口的工具与探针（如 `verify-recovery2.mjs`、
    `exe-smoke.mjs` 的端口文件读取、`tools/dev-server.mjs` 的 ping 格式）——改端口策略前
    同步检查这些调用方。
---

## D16 · 代码取词加信号的交互形态：三入口 + 精确优先 + 代码区旁浮层（#76 B4，2026-09-10）

- **背景**：第十二轮用户已拍板「加信号主路径 = 代码内点/选中变量（仿 Verdi nWave “中追” /
  Ctrl+W）」，并明确**不要**单独的「信号层次选择框」。第十六轮落地 B4 时必须把这两条口径
  翻译成具体交互，同时处理「运行仿真后全量自动加信号」这个遗留做法。
- **决策**：
  1. **三条入口、一个回调**：`dblclick`（双击变量，要求 `exact`）/ `contextmenu`（右键菜单）/
     `keydown` **捕获阶段 `Ctrl+Alt+W`** —— 全部指向 `installCodeEditor` 的第 5 参
     `onAddSymbol`，最终进 `ui-bridge.addSymbolFromCode`。**不用 `Ctrl+W`**：Edge `--app`
     把它当关窗快捷键（详见 06 P33）。
  2. **取词是纯函数**：`rtl-panel.symbolNameAt(text, from, to)` 从**文本 + 位置**重算，不依赖
     事件那一刻的编辑器 DOM 状态；返回值带 `exact` 判定，只有精确命中才触发加信号。
  3. **精确优先、兜底只用一次**：`resolveSymbolVcdPaths`（B1 的模块内符号索引，按
     `moduleName`/`fileIndex`/`line` 收窄）**有候选就只用它**；**仅当为空**才用
     `vcd-index.findVcdPathsByName` 的宽松候选。**两者不取并集**。
  4. **多候选只弹代码区旁的轻量浮层** `.sim-symbol-picker`（单例、`position:absolute`、
     点外部/Esc 关闭）——保持「不引入单独信号层次选择框」的形态口径：能力保留、位置换到
     用户操作现场。
  5. **收敛全量灌信号**：`replaceInjectedOutputs` 改名 `syncSimRows()`，只同步
     `state.simWatches` 中由**真实 VCD 路径**登记的观察行，不再把 `outputs` 全量推入画布。
- **理由**：用户的操作现场是代码，加信号必须“在哪儿看代码就在哪儿加”；快捷键与取词都要在
  浏览器 `--app` 的约束下可靠工作；候选质量比候选数量重要（精确优先），所以不做并集。
- **否决方案**：
  1. 用 `Ctrl+W`（含试图在页面里拦下来）—— `--app` 窗口层级先消费，拦不住，且会直接关窗；
  2. 用 `mousedown`/单击取词 —— 与“选中/拖选/点行跳转”冲突，误加信号；
  3. 把名称兜底与精确候选合并展示 —— 点 `q` 会从 1 条变 3 条，用户要多点一次且看到无关项；
  4. 多候选时打开侧栏/模态面板/新建“信号层次选择框” —— 正是用户明确否掉的形态；
  5. 保留「仿真后自动把所有可看变量加进画布」—— 用户明确不要，画布会被淹没。
- **影响**：
  - 界面上新增的只有 `.sim-symbol-picker` 浮层（`index.html` 内 CSS），**没有新面板**；
    RTL 树与侧栏结构不变。
  - `lib/codemirror.bundle.js` / `tools/cm6-entry.js` **未改**（触发挂在宿主 DOM 上），
    因此本决策不引入 esbuild 重打包步骤。
  - `tools/e2e-sim.mjs` 中原「仿真后自动灌信号」的断言被替换为「**不**自动灌信号」+
    「登记真实 VCD 路径后观察行与原生等长同子步」；`tools/e2e-rtl.mjs` 新增 G1~G7 黑盒覆盖。
  - 以后若要做 `#87②`（模块全接口 Ctrl+4）或 B3（代码 ↔ 树双向跳转），**沿用本决策的入口与
    取词口径**（`getContext()` + `symbolNameAt`），不要再造第二套。

---

## D17 · 代码 → 树的反向联动口径：光标即高亮 + 必须位置证据 + 歧义不猜（#76 B3，2026-09-10）

- **背景**：#76 B3 要补「代码 ↔ 树」中「**代码 → 树**」这一半（另一半「树 → 代码」= #86 A2
  已落地）。用户口径：**RTL 树只做代码层级浏览**（不带出端口/信号行、不承载加信号），
  加信号唯一主路径 = 代码内点/选中变量（B4）。因此 B3 必须是**纯视觉**的：只做高亮 + 滚动，
  不加信号、不弹框、不新增面板。
- **决策**：
  1. **单一入口 `ui-bridge.syncActiveFromCode(context)`**：context 缺省读 `sourceCodeView.getContext()`
     （B4 同一取词口径）；映射只用 B1 的 `moduleAtLine` / `findSymbols` / `resolveSymbolVcdPaths`
     与 `vcd-index.findVcdPathsByName` —— **不另写第二套解析**（与 D16 一致）。
  2. **四条规则**：① 光标所在行 → 所属**模块行**高亮（nTrace 式「当前 scope」常亮）；
     ② 光标正好在**实例名**上（`findSymbols` 命中 `kind === 'instance'` 且行号一致）→ 高亮
     **实例行**（实例名不是 VCD 信号，不参与 VCD 高亮）；③ 其余符号 → `resolveSymbolVcdPaths`
     **候选数 === 1 才**高亮 VCD 信号行，符号侧为空才用 `findVcdPathsByName` 兜底、**同样要求
     唯一**；④ 完全无目标（既不在模块内、名字也不是符号）→ **清空**。
  3. **行匹配必须带位置证据**：`rowMatchScore(row, target)` 中「目标带 `kind` 时同类是硬条件」、
     「必须行号相等或实例名/模块名/名字相等」，否则 **0 分**；同分**取先出现者**。
     `pickRtlRowIndex` 无命中返回 **-1**。**没有证据的“匹配”= 随机亮行，比不亮更糟**。
  4. **歧义宁可不亮**：多个实例下的同名信号一律不亮 VCD（与 D16「精确优先、不取并集」同源）。
  5. **高亮是状态不是渲染**：`activeHighlight` 存模块级；`refreshStructureTrees()` 末尾
     `applyActiveHighlight()` **重放**（树是 `replaceChildren` 全量重建）；`gotoSource()` 末尾
     `syncActiveFromCode()` 做**闭环**（树 → 代码 → 树 一致）。
  6. **光标事件源**：`ownerDocument` 的 `selectionchange` + 宿主 `mouseup`/`keyup`
     （无 CM 时退回 textarea `keyup`），位置签名去重 + 仅焦点在内时发；`setText()` 重建后
     **强制补发一次**。
- **理由**：用户要的是「在代码里点哪、右边就知道你在哪、对应信号也亮起来」的低干扰辅助；
  任何“猜”都会让高亮失去可信度（亮错比不亮更干扰阅读）。取词与映射已有现成底座，复用即可
  保证 B3/B4 两条链路对同一个词的理解完全一致。
- **否决方案**：
  1. 另写一套“按行号找模块/找信号”的解析 —— 会与 B4 的取词口径漂移；
  2. 多候选时亮第一条 / 全亮 —— 与用户「宁可不亮也不能亮错」冲突；还会与 B4 的“不取并集”打架；
  3. **未知符号时连「所在模块」的 scope 高亮也清掉** —— 会把「我在哪个模块」这个有用指示一并
     抹掉；实测（e2e-rtl H4）确认保留模块行、只清信号级目标才是对的（无目标时全清，见 H4b）；
  4. 接 `EditorView.updateListener` 监听 CM6 文档/选区变化 —— 需要重跑 esbuild 重建
     `lib/codemirror.bundle.js`，而收益与 DOM 方案相同，**不值**；
  5. 高亮时把端口/信号行加进 RTL 树“顺便展示” —— 破坏第十二轮口径（见 04 §4.10），
     e2e-rtl H6 已把它钉死（`.rtl-port`/`.vcd-signal-row` 计数必须为 0）。
- **影响**：
  - `index.html` 只新增两条高亮 CSS（`.rtl-active` / `.vcd-active`），**无新面板、无布局尺寸变化**；
  - `lib/codemirror.bundle.js` / `tools/cm6-entry.js` **未改**（无 esbuild 重打包）；
  - `rtl-panel.js` 导出面扩大（`rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow`/
    `highlightRtlRow`/`highlightVcdSignal`/`clearRtlHighlight`/`clearVcdHighlight`），
    `ui-bridge.js` 的 `__wpsim` 增 5 个探针入口，供 `tools/e2e-rtl.mjs` H 段与后续轮次断言；
  - 以后做 **#87②**（模块全接口 Ctrl+4）或 **B5**（信号组入 `.wp`）时，**沿用**：
    取词 `getContext()`、映射 `moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`、
    联动状态「模块级状态 + 重建后重放」的写法，**不要再造第二套**。

## D18 · 观察行随 `.wp` 工程存档口径：复用 A4 文本拼接桥 + 只存元数据 + 无 VCD 以工程为准（#76 B5，2026-09-10）

- **决策**：
  1. **沿用 #86 A4 的存档桥，不另造格式**：包裹核心 `window.buildDocumentJson` /
     `window.loadFromFileContent`，**文本拼接**注入字段（在最后一个 `}` 前插 `JSON.stringify(v, null, 2)`；
     空文档 `{}` 不加逗号；非对象字面量原样返回），**整份文档不二次 `JSON.parse`**（波形文档可能很大，
     保存时不该重解析）。原 `injectArchiveSourceFiles(json, files, activeIndex)` **泛化为**
     `injectArchiveFields(json, fields)`（`fields = [[名, 值], …]`）。
  2. **字段名 `simWatches`，只存找回元数据**：`archiveSimWatches()` → 每条
     `{path, name, width, reference}`（`width = Math.max(1, Number(...) || 1)`）。**波形数据不重复存**
     —— 它已在核心 `signals` 里。
  3. **载入恢复 = `applyArchivedExtras(text)`**：`JSON.parse` 失败**静默 return**（分享链接的压缩
     载荷走核心自己的路径，桥不插手也不报错）→ **先清** `state.vcd = null` / `state.outputs = []` /
     `state.simWatches = []`（换人）→ `applySourceFilesFromArchive` → `applySimWatchesFromArchive`
     （带字段 → 覆盖 + `adoptArchivedWatchRows`；**不带 → 返回 0 且保持已清空**）→ 面板未就绪
     （启动即 `#d=` 链接）return（`init()` 会用新 state 渲染）→ `refreshVcdTree(); syncSimRows();
     render();` → 状态栏**合并**一条文案（源码 N 个 + 观察行 M 个，避免后一条覆盖前一条）。
  4. **观察行的恢复靠「行名 == 路径」认领 + 补位宽**：`adoptArchivedWatchRows` 置
     `__simInjected`/`__simWatchPath`，补 `width`/`kind`/`msb`/`lsb`（核心一律丢这些），已注入则跳过。
  5. **无 VCD 时以工程带回来的那一行为准**：`syncSimRows` 的 `buildWatchSignal` 空结果**只在没有 VCD
     时**回退 `liveByPath.get(path)`；**有 VCD 仍以 VCD 为准**（保证「重新仿真 → 数据刷新」）。
  6. **旧工程向后兼容显式化**：无 `simWatches` → 观察行清空（**观察行以工程为准**），不沿用内存旧登记。
  7. **信号组入 `.wp` 不另写桥**：核心 `buildDocumentJson`（L1406~1515，逐字段存 `groupName`/
     `groupColor`/`groupPath`，L1449~1451）与 `loadFromFileContent`（L1553~，逐字段还原
     L1642~1644）**已天然闭环**，`GroupManager`（L1163~1404）是**纯函数派生、无独立状态** ——
     桥一行都不用加。
- **理由**：观察行是「**桥造出来的、核心不认识的东西**」，必须由造它的人负责找回。把「找回元数据」
  与「波形数据」分离，既避免同一份数据存两遍，也避免让核心去懂仿真语义（核心是通用波形编辑器，
  保持它与 `sim/` 解耦 = 保 C9 风险区不动）。
- **否决方案**：
  1. **另造一套 `.wp` 附加存档格式 / 旁挂文件** —— 与分享链接（核心自己压缩整个文档）割裂，
     旧工程迁移也要写两套；
  2. **让核心认识 `__simInjected`**（改 `wavepaint.clean.js` / `sim/engine.js`）—— 触碰 C9 最易碎区，
     且核心本不该懂仿真；
  3. **存档时把观察行从 `signals` 里剔除**（只留 `simWatches`）—— 会丢掉波形数据，载入后画布上
     没值可显示（用户要的是「重开工程回到画布」）；
  4. **无 VCD 时干脆丢观察行** —— 同上，直接违背 B5 目标；
  5. **载入工程时保留旧 `state.vcd`“凑合用”** —— 数据张冠李戴，见 06 P35。
- **影响**：
  - `js/sim/ui-bridge.js`：`injectArchiveFields` / `archiveSimWatches` / `applyArchivedExtras` /
    `applySourceFilesFromArchive` / `applySimWatchesFromArchive` / `adoptArchivedWatchRows`、
    `syncSimRows` 增无 VCD 回退、`resetSourceFiles` 扩为全复位、`__wpsim` 增 `designSignalNames`
    探针（旧函数名 `injectArchiveSourceFiles` / `applyArchivedSourceFiles` **已不存在**）；
  - `js/wavepaint.clean.js` **一行未改**、`sim/engine.js` **一行未改**（C9 守住）；
  - 改 `js/` → 按 **C1** 重建 exe 并核验 C8 特征串；e2e-rtl 增 I1~I6（**46 → 52**）；
  - 以后新增「代码侧上下文入 `.wp`」（如 #87② 的模块接口快照）**沿用本桥**：泛化
    `injectArchiveFields` + 「只存元数据 + 恢复时补核心丢的字段」的写法，**不要再造第二套**。

## D19 · #87② 交互三口径：键位 `Ctrl+Alt+4` + 「全部接口」= 端口 + 多候选复用代码区旁轻量浮层（2026-09-10）

> 背景：#87② 的目标是复刻 nWave 的「模块全部接口一键入波形」（nWave 里是 `Ctrl+4`）。
> 本节把三个**必须统一的口径**钉死，后任 AI 不要自行改动其中任何一个。

- **决策**：
  1. **触发键 = `Ctrl/Cmd+Alt+4`，刻意不是 `Ctrl+4`**。原因：Chromium/Edge 把 **`Ctrl+数字` 当浏览器
     级「切换标签页」加速键**，页面**根本收不到 `keydown`**（与 `Ctrl+W` 被 `--app` 吞掉同源，
     见 06 P33/P36）。判定同时认 `key === "4" || code === "Digit4" || code === "Numpad4"`
     且要求 `(ctrlKey||metaKey) && altKey`，挂 **keydown 捕获阶段**，命中后
     `preventDefault()+stopPropagation()`。
  2. **「全部接口」= 模块端口（`kind === "port"`）**，**不含体内 `wire/reg`**。`modulePorts(index, name)`
     收集「模块头 ANSI 端口 + 体内 `input/output/inout`」并**按名去重**（同一个端口可能在头与体声明两次）；
     体内 `wire/reg` 这类**内部信号**仍走 #76 B4 的**单点加入**（代码里点/选中变量），**不批量灌**。
     这与用户「仿 Verdi Get Signals」的原意一致：Get Signals 一键下的是**接口/层次节点**，不是模块
     体内全部信号。
  3. **目标作用域 = 例化路径**（`index.instancePaths[].path`，如 `tb.dut` / `tb.dut.u_sub`），
     与 VCD 全路径同口径。**顶层模块自动映射到其实例路径**（`counter` → `tb.dut`）—— 用户是在**代码里**
     下信号，落点必须是**能在 VCD 里找到数据的作用域**，而不是模块定义名。
  4. **多候选复用「代码区旁轻量浮层」，弹 `mode="scope"`**：同一模块/实例名有多个例化路径时
     （如 `sub` 被例化为 `u_a`/`u_b`），浮层列出**作用域路径**（`scope.path`）让用户选，
     **不要**另造「信号层次选择框」（用户明确不要那种 UI，见 04 §4.10 / 03 表 F/H）。
     实现上是把 B4 的 `showSymbolPicker` **泛化**为通用 `openPicker(title, items, anchor, mode)`
     （`items = [{label, title, onPick}]`、`box.dataset.pickerMode = mode`），再薄封装出
     `showSymbolPicker`（mode `"symbol"`，**选项文本仍是 VCD 全路径、B4 探针口径不变**）与
     `showScopePicker`（mode `"scope"`）。
  5. **批量加入的返回口径 = 三桶**：`addVcdPathsToWave(paths)` 返回
     `{ready, added[], existed[], missing[]}`，**批量、只 `render()` 一次**、末尾
     `scrollWaveToWatchPath(...)` 定位，**不设状态栏**（状态栏由调用方 `modulePortsStatus(scopePath,
     portCount, result)` **唯一汇总**，避免逐条覆盖）。重复触发天然幂等（已登记路径进 `existed`）。
  6. **`Ctrl+Alt+W`（B4）与 `Ctrl+Alt+4`（B4②）走同一 `request(via, event, handler)` 分派**：
     handler **未接线时静默放过、不吞事件**；`Ctrl+Alt+4` 未接线 `addScopeFn` 时直接 return。
- **理由**：
  - 键位必须避开浏览器保留键（硬约束，不是偏好）；`Alt` 是最小侵入的修饰键，且与 B4 的
    `Ctrl+Alt+W` 形成「单个符号 / 整个 scope」的成对记忆。
  - 「接口 = 端口」把 action 的**语义边界**划清：一次性灌入的应该是**模块对外的门**；
    模块内部信号由用户按需单点添加，避免画布被无关内部线网淹没。
  - 作用域必须落到**例化路径**才能在 VCD 中找到波形数据；用定义名会得到「找不到数据」的死路。
  - 复用 B4 浮层 = 少一套一次性 UI，且天然满足「不加信号层次选择框」的约束。
- **否决方案**：
  1. **严格照抄 `Ctrl+4`** —— 页面收不到事件，功能等于没有（见 06 P36）。
  2. **把体内 `wire/reg` 也一起批量下** —— 用户明确不要「仿真后把所有可看变量全加上去」那套
     （04 §4.14），批量入口只给**端口**。
  3. **多候选时把同一模块的所有例化路径全部加入** —— 会在画布上产生多份同名不同 scope 的信号，
     用户无法区分；必须让用户选（浮层）。
  4. **另做一个「信号层次选择框」** —— 用户明确否决（03 表 F/H、04 §4.10）。
  5. **用 `findSymbols` 命中项的 `moduleName` 反查被例化模块** —— 见 06 P36 坑 2：该字段是
     「定义所在模块」，不是被例化模块；必须查 `index.instancePaths`。
- **影响**：
  - `js/sim/rtl-panel.js`：`installCodeEditor` 增第 7 参 `onAddScope`；触发块重构为
    `request(via, event, handler)`；keydown 捕获阶段新增 `Ctrl+Alt+4` 分支。
  - `js/sim/ui-bridge.js`：`openPicker`（泛化）/`showSymbolPicker`（薄封装，mode `"symbol"`）/
    `showScopePicker`（mode `"scope"`）/`moduleScopes`/`modulePorts`/`addVcdPathsToWave`/
    `modulePortsStatus`/`addModulePortsToWave`/`addModulePortsFromCode`；接线 `onAddScope`；
    `__wpsim` 增探针；三处提示追加 `Ctrl+Alt+4`。
  - `tools/e2e-rtl.mjs` 增 **J0~J7（+9 条 → 61/61）**：一次加 4 端口 / 幂等 / 同名两例化弹
    `mode="scope"` 选择器并点选 / 光标在实例名上唯一作用域直加（**真 bug 修复点**）/
    `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / **只按 `Ctrl+4`（无 Alt）不触发** / 探针 + RTL 树
    仍无端口行 / `addVcdPathsToWave` 三桶分类。
  - **`js/wavepaint.clean.js` 与 `sim/engine.js` 一行未改**（C9 守住）。

---

## D20 · UI 重构口径：先方案后实施 + 契约面冻结 + 分期推进（2026-09-10 第二十轮；2026-09-11 第二十一轮已采纳并落地）

- **背景**：侧栏 / 整体 UI 重构设计的优先级已由用户提高（第十一轮），但侧栏现状同时承载
  代码编辑、RTL 树、VCD 树、仿真控制与状态区；更关键的是 **e2e 对 DOM 有硬依赖** —— 盲目动手
  极易打断已收口的 B3/B4/B4②/B5 触发链。
- **决策**：
  1. **先方案后实施**：先产出《UI 重构设计方案》（`08-ROADMAP.md` §2.1~§2.9），用户 review
     拍板后才动代码；`08 §2.6` 是唯一实施顺序。**→ 2026-09-11 第二十一轮用户已拍板并落地**
     （裁决：可拖拽多面板 / 侧栏保持右侧 / 层次树暂不左置），本条的「拍板前不动代码」已满足并解除。
  2. **契约面冻结**：重构期间**不得改名、不得移除** —— 24 个仿真栏 id、`.rtl-inst`/`.rtl-active`/
     `.vcd-signal-row`/`.vcd-active`/`[data-rtl-kind]`/`[data-vcd-path]`/`.tool-btn[data-tool]`/
     `.sim-symbol-picker-item`、VCD 信号行 `title` 全路径、`body.sim-open`/`#sim-panel.collapsed`/
     `wavedrom-debug-open` 等状态类。
  3. **分期推进**：**P0** 纯 CSS/布局 → **P1** DOM 重排（保 id/class、只改父容器）→ **P2** 多面板拖拽 +
     面板状态持久化（session 级）。**→ 2026-09-11 第二十一轮用户授权 AI 自定步骤，已把 P0+P1+P2 核心
     一次性落地**（`04 §4.19` / `07 D21`）；「每批次独立 commit + push `main`、C1 重建 exe + C8 核验 +
     全量测试 + C17 记忆同步」的纪律**继续适用**。
  4. **四区方向**：层级树区（RTL 树纯层级浏览）/ 代码区（加信号主路径 + Active Annotation 预留位）/
     波形区（画布 + **VCD 树移入**）/ 一条仿真控制带。三条红线不变：**不新增「信号层次选择框」**、
     **不给 RTL 树加端口/信号行**、**不恢复「仿真后全量灌信号」**。
  5. **外部 AI 只做「出稿」**：布局/视觉/交互稿可外发，**契约面判定与落地必须由本仓记忆 + 测试
     基线把关**。
- **理由**：
  - 本轮实测（`index.html` 904 行 / 静态 id 82 个 / `tools/e2e-rtl.mjs` **28 处 CSS 选择器依赖**）
    证明 **DOM 事实上就是测试接口**；不冻结契约面的重构必然打碎测试基线。
  - 侧栏的问题是「**四张卡片挤 328px 单栏、固定高度合计 ≈900px+**」的**空间/组织问题**，不是功能
    问题 → **P0 只靠 CSS + 折叠就能显著改善**，无需一开始就动骨架。
- **否决方案**：
  1. **一次性直接重排 DOM**（改动大，P0 内无法证明不回归）。
  2. **把 UI 设计完全外包给其它 AI**（外部 AI 无契约面 / e2e / 触发链上下文，极易破坏）。
  3. **把面板折叠态与宽度写进 `.wp`**（会动存档契约 → 建议只做 session 级）。
  4. **顺手删 legacy VCD 面板整族核心死代码**（属 #93 类工作，与本规划线不同批次，需单独拍板）。
- **影响**：
  - `08-ROADMAP.md` §2 扩写为 §2.1~§2.9（**本轮唯一交付物**）；`04-PROGRESS.md` 新增 §4.18 与
    §1/§2 同步；`05-LOGS.md` 索引 + `memory/logs/2026-09-10.md` 第二十轮（**按时间序置于
    第十九轮之后**）；`09-HANDOFF.md` §3/§9 与 `INDEX.md` 页脚切第二十轮结论；`03-REQUIREMENTS.md`
    「其它规划」段标注方案已成文（08 §2.1~§2.9）。
  - **本轮未动任何受版本控制代码 → 不触发 C1、不重建 exe**（exe 仍为 `2026-09-10 22:49:32` 那版）。
  - 用户拍板后按 08 §2.6 **P0 开工**，届时恢复「C1 重建 exe + C8 核验 + 全量测试」节奏。

---

## D21 · 侧栏「可拖拽多面板」落地口径（2026-09-11 第二十一轮，D20 的执行）

- **背景**：D20 定下「先方案后实施 + 契约面冻结 + 分期推进」。2026-09-11 用户拍板三条：
  ① 面板形态 = **可拖拽多面板**（splitter）；② 侧栏**保持右侧**，`#main-area` 骨架不动；
  ③ 层次树**暂不左置**；实施步骤授权 AI 自定 → 本轮把 08 §2.6 的 **P0+P1+P2 核心**一次性落地。
- **决策（落地口径，后续维护必须遵守）**：
  1. **卡片化 + 折叠**：侧栏 4 个功能区各成 `<section class="sim-card" data-sim-card>`
     （`source`/`rtl`/`vcd`/`tb`），标题行 `.sim-card-head[data-sim-card-toggle]` 可点击折叠
     （切 `.collapsed` + `aria-expanded`）；**标题行内的 `button`/`a`/`input`/`select`/`textarea`/`label`
     点击不触发折叠**（保护 `#sim-tb-copy` 等控件）。
  2. **像素权重高度**：纵向用 `flex-grow = 权重/总权重*100` + `flex-basis:0`
     （默认 `{source:300, rtl:245, vcd:245, tb:190}`），卡片按权重伸缩。
  3. **`measureMinHeight` 保护（本轮真 bug 修复，勿删）**：卡片 `min-height = min(实测内容高,
     面板可视高*0.8)`（`MIN_BODY_PX=24`、`MIN_CARD_CAP_RATIO=0.8`），在 `commit()` / 初始装配 /
     `setWidth()` / `window resize` 均重算；配 `.sim-panel-body{overflow-y:auto}` +
     `#sim-status{position:sticky;bottom:0}`。**理由**：headless 750x485 下源码卡只剩 80px，
     `.source-toolbar`（170px，`.source-actions` 9 按钮折行）被 overflow 裁掉 → 坐标点击 `#sim-run`
     落到 VCD 卡 → **「点仿真无响应」**；修复后真点击命中自身（e2e-ui I8 回归护栏）。
  4. **splitter**：4 卡之间 3 条 `<div class="sim-split" data-sim-split="source:rtl|rtl:vcd|vcd:tb">`，
     `pointerdown` → `resizePair` 在相邻两卡间重分配权重（`body.sim-resizing` 关过渡；相邻卡折叠则
     splitter 加 `.disabled`）；拖拽时 rAF 节流派发 `window` `resize`。
  5. **侧栏宽度可拖**：`#sim-resize-x`（7px 左缘竖条）→ `setWidth(px)`，clamp
     `280 ~ min(760, 视口*60%)`，由 CSS 变量 `--sim-panel-w` 驱动 `#sim-panel` 宽与 `#main-area` 右 padding。
  6. **持久化只走 sessionStorage**：key `wavepaint.sim-panel-layout.v1`，载荷 `{v:1,w:{},c:{},width}`，
     220ms 防抖。**绝不写进 `.wp` 工程存档**（D20 否决 3 的延续）。
  7. **键盘可达**：splitter `ArrowUp/Down` ±16px、`#sim-resize-x` `ArrowLeft/Right`。
  8. **契约面零改动**：24 个 id / class / dataset / 状态类**一个未改名、未移除**（`#sim-tb-copy` 只是移进
     TB 卡片头，id 不变）；`#sim-addsignals` 的 `title` 降级为「按端口给画布建激励（不加入 VCD 观察行；
     加波形请在代码里双击变量）」（**按钮文案未改**）。新增的 `[data-sim-card]` / `[data-sim-split]` /
     `.sim-card*` / `.sim-panel-body` / `#sim-resize-x` **不属冻结面**（是新增）。
- **理由**：
  - 侧栏是「四张卡片挤 328px 单栏」的**空间问题** → 多面板 + 折叠 + 可拖拽直接解决；
  - 持久化只做 session 级 = 不碰 `.wp` 存档契约（用户尚未拍板存档格式变更）；
  - 契约面冻结是 e2e 基线（86 项）能持续通过的前提。
- **否决方案**：
  1. **把层次树左置**（用户本轮明确「暂不」）；
  2. **把面板折叠态/宽度写进 `.wp`**（同 D20 否决 3，会污染 #76 B5 的观察行契约）；
  3. **一次性重排整体骨架**（`#main-area` 骨架不动，只在侧栏内部卡片化）。
- **影响**：
  - 新增 `js/sim/panel-layout.js`（≈520 行，唯一导出 `installSimPanelLayout`，返回
    `{getState,setWidth,reset,destroy}`，缺 DOM 节点返回 `null` 走 CSS 兜底）；`index.html` CSS + DOM
    重排；`js/sim/ui-bridge.js` 接线 + `__wpsim` 探针（并删死引用 `refs.collapseBtn` 与 `bindEvents`
    死分支）；`js/sim/rtl-panel.js` `installCodeEditor` 返回值新增 `remeasure()`。
  - `tools/e2e-ui.mjs` 新增 I 段 I0~I8（+13 → **86/86**）。
  - 触发 C1 → exe 重建 `v0.4.0 build 2026-09-11 00:15:01 69b84d0`（`69b84d0` = **构建时 HEAD**，
    承载本轮代码的 commit 是它的下一个）。
  - **08 §2.6 的「P0/P1/P2」视为完成**；剩余可选/暂缓项（VCD 树移入波形区 / TB 控制带收敛 /
    层次树左置）未开工，动前先与用户确认。

---

## D22 · 面板系统重构（dockable / Word 式自由拖拽）的目标形态与四条待裁决项（2026-09-13 第二十二轮提出，**第二十三轮已由用户拍板 + 确定实施路径 = 先做零后端纯前端原型**）

> 与 D20 同性质：**先方案后实施**。本条记录「已经定下来的部分」与「用户拍板结论」。
> **第二十三轮更新：四条已全部拍板（见下方「用户拍板结论」），并新增实施路径 —— 先交一份
> 不连接后端的纯前端 mock 原型给用户 review，通过后才进入后端连接 / 真实 DOM 接线。**

**用户拍板结论（2026-09-13 第二十三轮，原「待用户拍板」四条 → 全部按 AI 建议通过）**

| # | 事项 | 用户裁决 | 落地含义 |
|---|---|---|---|
| 1 | 解除「侧栏保持右侧」（D21②） | **解除** | #94 D1 采用**完整四区 dock**（LEFT/CENTER/RIGHT/BOTTOM），不再用「右侧区内分栏」近似 |
| 2 | 解除「层次树暂不左置」（D21③） | **解除** | RTL / VCD 树默认落 **LEFT**，「代码树窗口独立成区」成立 |
| 3 | 浮出窗口的边界 | **页内浮动面板** | 不做 OS 独立窗口（避开 #82 收窗 / 端口自愈老坑）；浮动层 = 页面内绝对定位 |
| 4 | 布局是否写进 `.wp` | **不写 `.wp`** | 只做 sessionStorage（保底）+ localStorage（跨会话默认） |

**实施路径（第二十三轮新增，用户原话要求）**

> 「由于此项改动对于前端页面的改动比较大，为了减少工作量，**可以先做一个虚假的纯前端界面**，
> 也就是**不连接后端、没有任何功能的前端界面**。做出这样一个前端界面之后，给我看，我 review
> 完了、确认完了之后再**进行后端连接的工作**。」

→ 因此 #94 在 D0 之前插入 **D-1（原形评审）阶段**：交付 `prototype/` 目录下的**零后端 mock**
（假数据、无仿真、不改 `index.html` / `js/**`、不进 exe 内嵌资源清单 → 不触发 C1）。
**用户 review 通过前，不得开始把 mock 结构接进真实 DOM（D0/D1）。**

**用户同时解除的前置限制**：G1~G8（08 §6.2 后端增强）**本轮及 D-1/D0/D1 期间暂不实现**；
「页内浮动面板」保留但**浮动/布局的真实实现等评审后**；`prototype/` 的布局**刻意不写 `.wp`**。

**背景**

用户终局目标原话：「模仿 Verdi 一样可以实现**波形窗口、代码窗口、代码树窗口**以及其他等窗口的
类似 **Word 一样的自由排列组合，以及自由拖拽**，也就是说目前的 UI 可能要大改」；并要求先
「确认现在完成的功能」「汇报现在具体后端功能支持的如何」。方案全文 = **08 §6**（§6.1 后端能力表 /
§6.2 缺口 G1~G8 / §6.3 前端现状 / §6.4 差距表 / §6.5 选型 / §6.6 目标架构 / §6.7 契约面与 e2e
影响面 / §6.8 分期 #94 D0~D4 + #95 E1~E5 + #96 W1~W3 / §6.9 验收与回滚 / §6.10 待拍板 /
§6.11 与远期关系）。本轮**零产品代码改动、不重建 exe**。

**已定（本轮做出的技术与工程裁决，除非用户反对，按此执行）**

1. **分层目标架构**：`PanelRegistry`（面板登记）+ `LayoutTree`（`split|leaf` 可序列化布局树）+
   `DockDnD`（拖拽/命中/预览）；四区 = LEFT（RTL/VCD 树）/ CENTER（主视图 Tab：波形画布）/
   RIGHT（源码 CM6）/ BOTTOM（控制台 / TB / 状态）+ `#dock-floats` 页内浮动层。
2. **面板 = 已存在的 DOM 节点，只搬父容器、不重建节点** → 冻结 id / class / dataset 天然不变
   （第二十一轮已验证过的路径；**禁止**把冻结 id 换成 `.dock-*`）。
3. **搬动容器后必须重排**：`#wave-canvas` resize 钩子 + CM6 `remeasure()`（D21 教训：
   `ResizeObserver` 有 <75 ms 跳过保护，漏重排会错位）；`render(tree)` **必须幂等**。
4. **拖拽期性能红线**：`body.dock-dragging` 期间挂起画布重绘，pointerup 后单次重排。
5. **不引入 OS 级多窗口**（否决 `window.open` 方案）——会重踩 #82 多窗口抢端口/收窗老坑；
   浮出一律为**页内浮动面板**。
6. **不引入前端框架**：否决 dockview / rc-dock / flexlayout 等 React/Vue 系方案。
7. **契约面冻结继续有效**（D20/§2.5 的 24 id + class/dataset + 状态类 + VCD `title` 全路径），
   并新增两条硬约束：**`#sim-status` 必须常驻可见**、**`#sim-run` 必须始终可点**（D21 的真 bug 教训）。
8. **两道分期闸门**：**D-1 = 用户 review 零后端纯前端 mock**（唯一验收口径 = 用户认可形态；
   未通过不得进 D0，改动只发生在 `prototype/`，零风险）；**D0 = 面板注册表 + 宿主容器抽象
   （像素级零视觉变化）**，是「回滚成本 = 1 个 commit」的关键闸门。**任一闸门未过不得进下一期。**
9. **e2e 口径**：`e2e-ui` I0~I8 允许改断言，但**折叠/拖拽/持久化/`#sim-run` 命中的语义必须有
   等价新断言**；`e2e-rtl` 61 条依赖冻结面，保活即零改；`regression` 79 条（纯 Node）不受影响。
10. **两条默认**：每类面板**保持唯一实例**（不做「同一面板开多份」，成本/收益更优）；
    首次进入默认布局 = **`sim` 预设**（波形居中最大 / 树在左 / 代码在右 / 控制台在下），
    保证与现有用户习惯的连续性。

**四条裁决原始选项与影响面（已于第二十三轮全部拍板，见上方「用户拍板结论」；此处保留以便追溯）**

| # | 待裁决 | 选项 | 影响 | AI 建议 |
|---|---|---|---|---|
| 1 | 是否**解除「侧栏保持右侧」**（D21② 的限制） | 解除 / 保持 | 不解除 → LEFT/BOTTOM 只能用「右侧区内分栏」近似，**做不到 Verdi 式左右分栏**，§6.4 的「大」级差距至少还留 3 项 | **解除** |
| 2 | 是否**解除「层次树暂不左置」**（D21③ 的限制） | 解除 / 保持 | 不解除 → 「代码树窗口独立成区」不成立；RTL/VCD 树只能与代码同侧 | **解除** |
| 3 | 浮出窗口的边界 | **页内浮动面板**（推荐）/ 真·独立 OS 窗口 | 后者会碰 #82 收窗 / 端口自愈老坑，成本高 | **页内浮动** |
| 4 | 布局是否写进 `.wp` 工程 | 只做会话+跨会话记忆（推荐）/ 写进 `.wp` | 写进 `.wp` 会动存档契约（#76 B5 观察行契约需同步评估） | **不写 `.wp`**（若确需，走 #96 W3） |

**与 §2（侧栏重构）的关系**：§2 = 「右侧单栏内的卡片化」**已于第二十一轮交付**；**§6 = 把面板
升级为可停靠窗口系统，是 §2 的上位替代**。**08 §2.6 的三项剩余（VCD 树移入波形区 / TB 控制带
收敛 / 层次树左置）直接并入 #94 D1**，不再单独排期（D1 落地后这三项自然完成）。

**关联**：#94（面板系统重构）/ #95（仿真后端能力增强 E1~E5，**已由用户暂缓**）/ #96（工作区与持久化
W1~W3，其中 **W3 已拍板不做**）见 `03-REQUIREMENTS.md` 表 K；后端缺口 G1~G8 见 08 §6.2；
08 §6.8 分期表**新增 D-1 行** + §6.10 四条结论（§6.10.1 保留原始选项追溯）；
记录见 **04 §4.20（第二十二轮）+ §4.21（第二十三轮成品）**、日志 2026-09-13（两轮同日追加）、09 §3.1。

---

## D23 · 控件与工具栏规范化口径：三层职责 + 尺寸三档 + 间距只用刻度 + 主按钮唯一 + `⋯` 溢出 + 波形控件下沉（2026-09-13 第二十四轮提出，**待用户 U1 拍板**；⚠ **第 8 条「波形控件下沉 D-UI-A」已被 `D24` 推翻 → 改为 U0-R 顶栏统一，见文末 D24**）

> 本条与 D20 / D22 同性质（**先方案后实施**）。第二十三轮原型的**形态层**已由用户 review 通过
> （原话「UI 排布在大体上基本正确」），用户同时指出「**小的按钮上的排布以及控制栏的排布还需要斟酌，
> 现在似乎有一些混乱**」。→ 本轮**只针对控件层**立规，编号 **U0~U4**；形态层（四区 dock / 页内浮窗 /
> 多 Tab / 3 预设）**不再改**，仍归 `08 §6` 的 D 线负责。**方案全文 = `08-ROADMAP.md §7`**
> （§7.1 基线 / §7.2 P-UI-01~09 / §7.3 R1~R9 / §7.4 L0~L4 + D-UI-A / §7.5 刻度 / §7.6 溢出 /
> §7.7 U0~U4 / §7.8 总排期 / §7.9 待拍板 / §7.10 红线）。

**已定的技术口径（除非用户反对，按此执行）**

| # | 口径 | 出处 |
|---|------|------|
| 1 | **三层职责单一**：L1 应用工具带只放**跨面板**动作；只对某一面板有意义的动作**必须**放该面板的上下文带；状态栏只读、不放按钮 | §7.3 R1 |
| 2 | **同类动作唯一入口**：原型里 3 处「运行仿真」收敛为 1 处；源码面板带里重复的「运行仿真」删除 | §7.3 R2 |
| 3 | **主按钮唯一**：任一时刻可见 `primary` ≤ 1，且只能是「运行仿真」（真机 `#sim-run` 已满足；原型 U0 已修） | §7.3 R3 |
| 4 | **尺寸三档**：图标按钮 **28×28**（图标 16×16，带 ▼ 的也按 28 网格、箭头内嵌）；文本 / 下拉 / 分段 / 输入框高 **24**；带高 **36**（面板）/ **44**（全局） | §7.3 R4 / §7.5 |
| 5 | **间距只用刻度值**：组内 **4** / 组间 **12**（= 1px 分隔线 + 两侧各 4）/ 带首尾 **8**；**禁止组件自带 margin**（真机 5 处 + 原型 5 处散落 margin 全删，改由父容器 `gap` 统一给） | §7.3 R5 / §7.5 |
| 6 | **禁止隐式溢出**：工具带一律 `nowrap`；放不下时按优先级把**整组**收进 **`⋯` 溢出菜单**；**不允许** `flex-wrap:wrap`（原型旧状）或 `overflow:visible` 溢出（真机旧状） | §7.3 R6 / §7.6 |
| 7 | **提示不进工具带**（R9）：长文本 / 上下文 chip 移入**状态栏**或面板头右侧 | §7.3 R9 |
| 8 | **波形类控件下沉（主方案 D-UI-A）**：真机 21 个图标按钮中的 **14 个**（缩放 3 + 绘制 3 + 位状态/力度/进制 3 + 标注 5）从全局带下沉到**波形面板上下文带**；全局带顶层元素 **34 → 14**（治本，也是 Verdi nWave 的做法） | §7.4 |
| 9 | **`#sim-run` 常驻全局带**：无论走 D-UI-A 还是 D-UI-B，「运行仿真」都留在常驻可见带（契约硬约束 = **始终可点**） | §7.4 / §7.9-② |
| 10 | **溢出菜单项与正常按钮同 id / 同事件**：只换父容器、不加分支 → 24 个冻结 id 的契约面**天然不变** | §7.6-3 |

**备选方案 D-UI-B**（不推荐）：全局带保留全部控件，只做分组 + 刻度 + `⋯` 溢出 —— 只解决 P-UI-01/02/06/09，
不解决 P-UI-07（职责重叠）/ P-UI-08/09（分组失控），治不了「乱」的根因。**A/B 二选一由用户在 U1 裁决（§7.9-①）。**

**U-1 闸门（第二十四轮的实际门禁）**：**等用户在 U1 对 `08 §7.9` 四条拍板**
（① 是否走 D-UI-A；② `#sim-run` 是否留全局带；③ 窄窗口用 `⋯` 还是允许折行；④ 刻度值 28·24·4·12）。
**拍板前不得改 `index.html` / `js/` / `css/`** —— 只有 **U2 / U3** 才动真机、才触发 C1 重建。

**为什么先立规再改真机（而不是直接改 CSS）**：P-UI-01/06/09 这一类是**系统性**问题（间距值域 6 种、尺寸 3 档、
13 条分隔符切 12 段），逐条打补丁必然反复；`tools/ui-audit.mjs` 把 R1~R9 变成**可复算的退出码**后，
每批改完都能自证「违规归零」，避免「改完看着好一点、下一批又乱」。

**关联**：#94（面板系统重构，`08 §6`）/ `03-REQUIREMENTS.md` 表 K **#97**（本线）；
已落地部分 = 原型 U0（`prototype/ui-mockup.*`）+ 审计工具（`tools/ui-audit.mjs`）；
记录见 **04 §4.22**、日志 `2026-09-13.md`（第二十四轮）、**09 §3.1**。

---

## D24 · U0-R 顶栏统一（撤销 D-UI-A）+ 真机面板 splitter 高度基线模型 + 混淆复查（2026-09-13 第二十五轮，**用户已裁决并当轮落地**）

> 本条**推翻 D23 第 8 条口径**（「波形类控件下沉到波形面板上下文带」= **D-UI-A**）。
> 用户第二十五轮原话：「原来的 UI 界面中的文件编辑的下一栏，也就是**保存图标、撤回图标、放大缩小图标等还放到此位置**，
> 而不是放在波形区的子栏……**波形区的子波形区现在不添加功能栏，功能栏仍旧放在统一的顶栏那里**。」
> → **D-UI-A 作废**；**顶栏统一（U0-R）生效**：所有功能栏（含缩放 / 保存 / 撤销）**只放 `#toolbar` 一条统一顶栏**，
> **波形面板不再有子功能栏**。`08 §7.4` / `§7.9-①` / `§7.7 U3` / `03 #97` / `04 §4.23` 已同步改写。

**① 用户裁决（本轮，落档）**

| # | 裁决 | 影响 |
|---|------|------|
| 1 | **否决 D-UI-A**，采纳 **U0-R 顶栏统一** | 真机 21 个图标按钮**不下沉**，全部留在 `#toolbar`；U3 只做**分组 / 刻度 / 尺寸 / 溢出**，不把控件搬进面板带 |
| 2 | **波形区不加子功能栏** | 原型 `panelWave()` 整条 `.mk-toolrow` 已删除；真机本就无波形子栏 → 无需改 |
| 3 | **编辑栏（面板上下文带）先不做修改** | L2/L3 上下文带拆分**暂缓**；`index.html` 本轮未动 |
| 4 | **已有绘图 UI 尽量照搬不改** | `wavepaint.clean.js` 绘制/画布逻辑一行未改（仅清 9 个残留局部名）；`sim/engine.js` 一行未改（C9） |
| 5 | `08 §7.9-③④`（`⋯` vs 折行 / 刻度 28·24·4·12）**未提异议** | 按默认执行：窄窗口用 `⋯` 溢出菜单；刻度 = 图标 28 / 文本 24 / 组内 4 / 组间 12 |

**② 真机面板 splitter 高度模型（纯技术口径，唯一正确实现）**

旧实现**三处缺陷叠加**（= 用户报「拖拽和鼠标坐标对不上」的真根因）：
① `onMove` 把**累计位移当增量**反复叠加 → 越拖越飞；
② `weights` 被当**像素值**用，但 `applyWeights()` 把它归一化成**占比** → 量纲不一致；
③ `flex-basis:0` + 权重占比模型下，一旦触到 `min-height`，**px ↔ 权重无恒定换算系数**。

- `cardBaseline(card)` = 该卡 `el.style.minHeight`（**像素基线**）；`pairSlackPx()` = 可见卡「渲染高 − 基线」之和。
- `resizePairTo(pair, targetAPx)`：A 卡**渲染高**设到绝对目标 `clamp(targetAPx, baseA, total − baseB)`；
  再按 `k = free / wSum` 反解本对权重 `nextWA = (nextA − baseA) / k`，B = 本对权重和 − nextWA。
- `applyWeights()`：`flexBasis = 基线 + 'px'`、`flexGrow = 占比 * 100`、`flexShrink = '0'`。
- **`applyMinHeights()` 必须同时写 `minHeight` 与 `flexBasis`（同源）** —— 否则窗口 resize 只重算 min-height，
  `flex-basis` 留在旧值 → 布局/拖拽错位。
- 指针手势：`onPointerDown` 记录 `startHeightA`；`onMove` → `resizePairTo(pair, startHeightA + delta)`
  （**禁止**用累计 delta 直接叠加到当前高度上）。
- 键盘增量语义保留在薄包装 `resizePair(pair, deltaPx)` 中；`#sim-resize-x`（侧栏宽度）= `startWidth + delta` 绝对量，原本就对。

**e2e 断言口径随之更新（勿回退）**：`e2e-ui` **I1**（`flexBasis == minHeight` 且带 `px`、`growSum ≈ 100`、`flexShrink` 全 `'0'`）、
**I4**（口径改「渲染高」：`hA +16 / hB −16` 且总高守恒）、**I4c（新增）**（指针拖拽 `DY` → 上下卡各 ±DY、总高守恒、同手势拖回可逆）。

**③ 混淆复查结论**：`js/wavepaint.clean.js` **无混淆代码残留**。仅 9 个解混淆后遗留 `_0x_` 前缀的局部变量
（`_0x_wpfQuickCleanup` / `_0x_wpfSuppressBlur` / `_0x_wpfMarkSuppress` / `_0x_wpfClearError` / `_0x_wpfOnBlur` /
`_0x_wpfText` / `_0x_wpfOnInput` / `_0x_wpfOpts`，共 32 处）→ 去掉前缀改名（`_0x_wpf*` → `wpf*`；函数内局部、零行为变化）
→ **正文 `_0x` 归零**（仅剩文件头注释里 3 处历史说明，保留）。`lib/codemirror.bundle.js`、`lib/wavedrom.min.js`
属**第三方正常压缩**（非混淆），**保留**。→ 因改动落 `js/` → **触发 C1，exe 已重建**
（22,015,488 B / `v0.4.0 build 2026-09-13 16:52:06 83fab85`，C8 特征串核验通过）。

**关联**：`08 §7.4`（D-UI-A 已标作废）/ `§7.9-①`（已拍板）/ `§7.7 U3`（口径调整）/ `03 #97` / `04 §4.23` /
日志 `2026-09-13.md`（第二十五轮）/ `09 §3.2`。

---

## D25 · 原型交付方式 = 独立启动器 + 独立构建脚本（不污染真机资源清单、不触发 C1）（2026-09-13 第二十六轮，**用户要求，当轮落地**）

> 用户第二十六轮原话：「**提供的网页链接无法打开**，请按照**原本之前的方式**一样打包成一个**可直接运行的点 exe** 供我 review」。
> 判定 = **交付方式问题，不是原型本身问题**（第二十三~二十五轮的 review 入口需要用户装 Node + 起 dev-server + 手输 URL）。
> **决定**：原型交付物 = **双击即用的独立 exe**（`WavePaintMockup.exe`），**不复用真机启动器 / 构建脚本**，
> 从而**不写 `resources.txt` / 不动 `version.txt` / 不碰 `WavePaintClean.exe` → 不触发 C1**。

**① 三文件分工（原型专用，独立于真机一套）**

| 用途 | 真机（本轮一行未动） | 原型（新增） |
|---|---|---|
| 启动器 | `WavePaintLauncher.cs` | `MockupLauncher.cs`（528 行） |
| 构建脚本 | `build.ps1`（写 `resources.txt` / `version.txt`） | `build-prototype.ps1`（**什么都不写**） |
| 自检 | `tools/verify-*.mjs` / e2e 系列 | `tools/mockup-exe-smoke.mjs`（无浏览器，**41 项**） |

**② 四重身份隔离（必须保持，否则两套服务会互相误判）**

| 维度 | 真机 | 原型 |
|---|---|---|
| 端口 | 固定优先 **17817** | 优先 **17820**（占用则随机） |
| `/api/ping` | `WAVEPAINT-SERVICE` | **`WAVEPAINT-MOCKUP <构建戳>`** |
| 单实例文件 | `%TEMP%\WavePaint_service.txt` | `%TEMP%\WavePaintMockup_service.txt` |
| 窗口判定 | 标题含 `WavePaint` | 标题含「**原型**」（`EnumWindows` + `GetWindowText`） |

**③ 硬口径（新坑，见 06 P38）**

- `build-prototype.ps1` **必须带 UTF-8 BOM**（PS5.1 读无 BOM 的 `.ps1` → 中文源码乱码）。
- `build-prototype.ps1` 内**不能用 `$home` 作变量名**（PowerShell 只读变量）→ 用 `$homePage`。
- **Edge `--app` 窗口不能靠 `Win32_Process.CommandLine` 判定**（只有根进程带 `--app`，子进程不带）→ 必须用窗口标题判定。
- exe 内是**构建时快照**：改 `prototype/**` 后必须重跑 `.\build-prototype.ps1`。
- 生命周期：无「原型」窗口连续 **12 秒** → 自动退出；最长存活 **12 小时**（兜底）。

**④ 为什么不做「复用真机启动器」**：真机启动器的端口 / ping 身份 / 单实例文件 / 构建脚本写盘行为都属于 **C19 服务在线性不变量**，
复用会污染真机资源清单、并可能让真机自愈链路误判 → **宁可多写一个启动器，也不动真机一行**。

**关联**：`04 §4.24` / `09 §3.1` / `06 P38` / `02 §3`（C1 例外说明）+ `02 §8`（命令速查）/ `prototype/` / 日志 `2026-09-13.md`（第二十六轮）。

---

## D26 · 「1:1 完全照搬」优先于旧审计口径：原型继承真机原生特征，R5/R6(隐式溢出)/R8 只在真机上判定（2026-09-13 第二十七轮，用户当场裁决并落地）

**背景（用户原话）**：「代码显示区和菜单栏的显示等**并没有照搬原本的源码**，我希望**完全照搬它的源码，做出 1:1 的效果**，只是原本是全屏的，现在是面板而已，而不是按照预测的显示效果等进行复刻，我要 1:1 完全一样的效果，**完全一致的效果起码波形显示区是这样的**。」

**裁决内容**：

1. **原型的唯一正确性口径 = 「与真机逐字/逐像素 1:1」**，不是「按预期效果另画一版」。凡真机 `index.html` 的菜单栏、工具条、代码区（CodeMirror 宿主）、波形显示区，一律**直接搬真机 DOM + 真机 CSS + 真机 JS 资源**，不重画、不"美化"、不近似。
2. 原型页的构建方式相应改定为 **`tools/gen-mock-page.mjs`：抓真机 `index.html` 骨架 → 生成 `prototype/ui-mockup.html`**（真机 chrome 逐字照搬 + 原型外壳脚本）；真机骨架改动后重跑生成器。
3. **审计口径顺带校准（D26 的直接推论）**：`tools/ui-audit.mjs` 的 **R5 间距刻度 / R6 禁隐式溢出 / R8 不被裁切** 三条属于「真机自身规范化」规则，**只在 `target==='real'` 上判定**；对 `target==='mock'`（1:1 照搬产物）**豁免**——否则会把「真机原生间距 `{4,6,8,10,12,18}`、真机 toolbar 在 1280 下溢出 192px、步数/子步数越界」当成原型缺陷。原型保留 **R3 主按钮唯一 / R6 控制带禁换行 / R9 提示不进工具带** 这三条与"照搬"无关、真正属于原型布局的约束。
4. **绝不为迁就旧审计口径去改真机 DOM / 间距 / toolbar 行为**（那些是真机待优化项 P-UI-02，属 U3 范畴，不能在原型阶段"顺手改真机"）。

**影响**：`tools/ui-audit.mjs --mock` → 1680/1280 **两档违规 0**（此前 4 条违规全部是上述真机原生特征被误判）；真机口径数值不变。

**关联**：`04 §4.25` / `09 §3.2` / `tools/gen-mock-page.mjs` / `tools/ui-audit.mjs` / `prototype/ui-mockup.html` / 日志 `2026-09-13.md`（第二十七轮）。

---

## D27 · 脚本/交互铁律：拖拽等跨重建的交互**禁止缓存 DOM 引用**（稳定 id + 每次查活节点 + 监听挂 window）（2026-09-13 第二十七轮，修 bug 后升格）

**背景**：用户报「各个面板的**拖动仍然有问题，拖动的预览和最后实际的效果不一致**，且**拖动按钮在拖动时的显示也有 bug**」；定位到**同一个根因** = 拖拽闭包缓存 DOM 引用，被拖拽中途的 `render()`/`renderFloats()` 重建后写成游离节点（详见 `06 P39`，实证 `elConnected=false`）。

**铁律（原型 `prototype/ui-mockup.js` 实施，真机将来搬停靠引擎时同样适用）**：

1. **禁止跨异步边界缓存 DOM**：`pointerdown` 时不得把 `el`/`handle`/`slots` 存进闭包供 `pointermove` 用。只能存**稳定 id / 纯数据**。
2. **每次现查活节点**：`pointermove` 内用 `querySelector('[data-float="…"]')` / `[data-split-id="…"]` 现查，`|| el` 兜底；找不到就安全跳过。
3. **移动端事件挂 `window`**：`pointermove` / `pointerup` / `pointercancel` 一律挂 `window`，避免手柄/节点被换掉导致事件中断；必须实现 `pointercancel` 取消分支。
4. **跨重建的临时状态放模块级变量**（如 `draggingFloatId`），由 `render*()` 读取并落到类名上（`.mk-float.dragging`），而不是往节点上直接加类。
5. **收尾统一 `render*()` + `persist()`**：松手后由重建路径产出最终 DOM，保证「拖动中 == 松手后」。

**看门狗**：`tools/mock-probe.mjs` **I1~I5 五条回归**（重建后仍在拖动 / 重建后松手位置==拖动中最后位置 / 松手清理状态 / 分隔条重建后仍跟随指针且只改相邻两格 / 拖动中==松手后逐像素相等）长期看守。

**关联**：`06 P39` / `04 §4.25` / `09 §3.2` / `prototype/ui-mockup.js` / `prototype/ui-mockup.css` / `tools/mock-probe.mjs`。
