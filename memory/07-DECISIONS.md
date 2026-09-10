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
