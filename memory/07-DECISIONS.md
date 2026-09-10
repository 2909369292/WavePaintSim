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
