# 04 · 项目进展同步（跨 AI 接手必读）

> 本文件回答“现在做到哪了、下一步做什么、最近一轮发生了什么”。
> 每次任务开始/结束都必须更新本文件，保证下一个 AI 不用翻完整日志也能接手。

---

## 1. 当前状态快照（2026-09-10）

| 项 | 状态 |
|---|---|
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 代码状态 | 主线可用，`main` 分支 |
| 构建产物 | `D:\Files\Code\波形\WavePaintClean.exe` |
| 最近完成（第二十轮） | **侧栏 / 整体 UI 重构设计方案已交付（2026-09-10 第二十轮，见 §4.18 + `08-ROADMAP.md` §2.1~§2.9）** —— 只出方案、**未动任何受版本控制代码**（`index.html`/`css/`/`js/` 一行未改），因此**本轮不重建 exe**（C1 未触发，exe 仍是 `2026-09-10 22:49:32` 那版）。方案含：现状问题清单（P1 空间 / P2 数量 / P3 语义遗留 / P4 结构 / P5 CSS 双轨，全部实测）、仿 Verdi「三区 + 一条控制带」目标布局、面板与按钮归位表、六条主线衔接点、**契约面冻结清单**（24 个 id + class/dataset + VCD 行 `title` 全路径 + 状态类）、P0/P1/P2 分期计划、「UI 设计交给其它 AI」评估 + 现状交互清单。**状态 = 待用户 review（拍板后按 08 §2.6 P0 开工）** |
| 最近完成需求 | **#87②：模块/实例全部接口一键入波形（2026-09-10 第十九轮落地，见 §4.17）** —— 代码区按 **`Ctrl+Alt+4`** 即可把光标所在**模块（或实例）的全部接口（端口）**一次加为观察行（唯一作用域直加；同名模块/实例多作用域 → **代码区旁轻量浮层**选作用域；重复触发幂等；无 VCD 数据 / 未 dump 给中文说明）。**刻意不用 `Ctrl+4`** —— Chromium/Edge 把 `Ctrl+数字` 当浏览器级「切换标签页」加速键，页面收不到 keydown（与 `Ctrl+W` 同源，见 06 P33/P36）。**「全部接口」= 模块端口（`kind === "port"`）**，体内 `wire/reg` 仍走 B4 单点加入。**未改 `js/wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9 守住）。此前 **#76 已收口**：B5（第十八轮，§4.16）、B3（第十七轮）、B4（第十六轮）、B1（第十五轮）、**#86 A1~A4**（第十四轮）、**#86 服务在线性**（第十三轮）、**#85**（第十轮）、第十二轮 RTL 树瘦身、第六轮 5 项 + #93 收官 |
| 最近完成文档 | **第十九轮记忆同步**（2026-09-10）：新增 §4.17（#87② 落地全记录）、06 P36（`Ctrl+4` 被浏览器吞 + **实例符号 `moduleName` 被索引覆盖** + 「只 splice 不清登记 → render 会复活行」的测试陷阱）、07 D19（`Ctrl+Alt+4` 选型 + 「全部接口 = 端口」口径 + 多候选复用代码区旁轻量浮层 `mode="scope"`）、03 表 F/H #87 状态（**①②③ 全部落地**）、08 文件头/§1/§1.2 + **新增 §1.3**（#87② ✅ + 主线下移）、本文件 §1 快照 / §2 时间线 / §4.4 / §6、09 全篇切第二十轮、当日日志「第十九轮」、`05-LOGS.md` 索引、`INDEX.md` 页脚。叠加生效的仍是**第十二轮澄清**：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4，**已落地**）；RTL 结构树为纯代码层级浏览（文件→模块→实例），不显示接口信号、不承载加信号交互（原 #76 B2 撤销）。见 §4.10 / 03 表 F/H / 08 §1.2/§2 |
| 最近一轮（第十九轮，2026-09-10） | **#87② 落地：模块/实例全部接口一键入波形（详见 §4.17）**。① `js/sim/rtl-panel.js`：`installCodeEditor` 增第 7 参 `onAddScope`；触发块重构为 `request(via, event, handler)`（handler 缺省回落 B4 单符号入口；**未接线的手势静默放过、不吞事件**）；keydown 捕获阶段识别 **`Ctrl/Cmd+Alt+4`**（`key==="4" || code==="Digit4" || code==="Numpad4"`）→ `preventDefault()+stopPropagation()` → `onAddScope`；`Ctrl+Alt+W`（B4）行为不变。② `js/sim/ui-bridge.js`：浮层泛化 `openPicker(title, items, anchor, mode)`（`items=[{label,title,onPick}]`、`box.dataset.pickerMode`）+ 薄封装 `showSymbolPicker`（mode `"symbol"`，**B4 选项文本仍是 VCD 全路径、探针口径不变**）/ `showScopePicker`（mode `"scope"`）；新增 `moduleScopes` / `modulePorts`（`kind==="port"` 按名去重）/ **`addVcdPathsToWave`**（**批量、只 render 一次**、末尾滚动定位、**不设状态栏**，返回 `{ready,added[],existed[],missing[]}`）/ `modulePortsStatus`（唯一汇总文案入口）/ `addModulePortsToWave` / `addModulePortsFromCode`；接线 `onAddScope`；三处提示追加 `Ctrl+Alt+4`；`__wpsim` 增探针（`addModulePortsFromCode`/`moduleScopesOf`/`modulePortsOf`/`addVcdPathsToWave`/`get pickerMode`）。③ `tools/e2e-rtl.mjs` +9 条 J 段（J0~J7）。**修掉一个真 bug**：分支①（光标在实例名上）若用 `findSymbols` 命中项的 `moduleName` 查作用域是**错的** —— 符号索引把实例符号的 `moduleName` 覆盖成**定义所在模块** → 改为按「**实例名后缀**」直接查 `index.instancePaths`。exe 已重建（22:49:32） |
| 当前阻塞 | 无 |
| 下一步主线 | **第二十轮：侧栏 / 整体 UI 重构设计方案已交付（§4.18 + 08 §2.1~§2.9），状态 = 待用户 review**。用户拍板后按 **08 §2.6 分期开工**：**P0** = 纯 CSS/布局（分区标题 + 卡片折叠 + 自适应高度 + `#sim-collapse` 死引用与 `#sim-addsignals` 文案清理，不动 id/class/DOM 层级，风险低）；**P1** = DOM 重排（VCD 树移入波形区 / TB 折叠 / 控制带收敛，保 id/class、只改父容器）；**P2** = 多面板拖拽 + 面板状态持久化（session 级）。**每期独立 commit + push `main`，且每期都要 C1 重建 exe + C8 核验 + 全量测试 + C17 记忆同步**。此前 **#87② 已完成（第十九轮）→ #76 + #87①②③ 全部收口**。**#84 波形查看增强 / #77 Active Annotation 仍为远期**（08 §3，除非用户再拍板）。RTL 树仍只做代码层级浏览；服务自愈（§4.11）是独立专项 | 
| 测试基线 | regression **79/79**；e2e-rtl **61/61**（第十九轮新增 **J0~J7 共 9 条**）；e2e-ui 73/73；e2e-sim 0 失败；probe-param 全过；**2026-09-10 第十九轮实测复跑（全部实测）：regression 79/79、e2e-rtl 61/61、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过**（B4 起「仿真后不全量灌信号」的 e2e-sim 断言仍在守） |
| UI 基线 | e2e-rtl **61/61**（含 #85 D1~D6 + 第十二轮 B3 RTL 树纯层级浏览 + 第十四轮 E1~E6 + 第十五轮 F1~F9 + 第十六轮 G1~G7 + 第十七轮 H1/H2/H3/H4/H4b/H5/H6 + 第十八轮 I1~I6 + **第十九轮 J0~J7：模块体一次加 4 端口 / 重复触发幂等 / 同名两例化弹 `mode="scope"` 选择器且点选后加对作用域 / 光标在实例名上唯一作用域直加（真 bug 修复点）/ `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / 只按 `Ctrl+4` 不触发 / 探针 `modulePortsOf`+`moduleScopesOf`+RTL 树仍无端口行 / `addVcdPathsToWave` 三桶分类**）；e2e-ui 73/73（真实 Edge）；probe-tutorial / probe-addbtn / probe-simfail 全过；真 exe 冒烟通过（端口 17817、core/wpf/doc/canvas/汉化全在、无异常）；第十三轮自愈专测 `verify-recovery2.mjs` 17/17 + 真实 Edge 协议探针 `probe-protocol.mjs` |
| 交付提醒 | 重启应用、从唯一路径启动、面板版本号自查（应显示 `v0.4.0 build 2026-09-10 22:49:32 a201338`；⚠ `a201338` = **构建时 HEAD**（第十八轮 B5 的 commit），承载第十九轮 #87② 代码的 commit 是它的**下一个** —— **别误判 exe 落后**，口径见 05/09 第十六轮补记）；本次 exe 内置第十九轮 **#87②（模块/实例全部接口一键入波形 `Ctrl+Alt+4`）**、第十八轮 #76 B5、第十七轮 #76 B3、第十六轮 #76 B4（+ 不再仿真后全量灌信号）、第十五轮 #76 B1、第十四轮 #86 A1~A4、第十三轮服务自愈（固定端口 17817 + `WPServiceGuard` + `#sim-recover` 按钮）、第十二轮 RTL 树瘦身、#85 与第六轮收官 clean.js。**首次**自愈时浏览器会弹一次「是否允许打开 wavepaint:」，勾选「始终允许」后无感（浏览器安全策略，无法绕过） |

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
| 2026-09-10 | 第十三轮插队专项：#86 服务在线性根治（本地仿真服务自愈） | 用户报「本地仿真失败/请求无响应」→ 查清四类并存死因（进程死 / 每次随机换端口 / 端口被第三方占 / **换版本后首次启动 `ivlRoot` 为 null 必崩**，日志 `IVL repair failed: ArgumentNullException`）；逐条根治：固定首选端口 **17817** + `/api/ping` 带 `PING_TAG` 身份标识 + extract 分支统一 `ivlRoot` 赋值与 `EnsureIvlReady` 每轮兜底 + `wavepaint://start?port=` 同端口重拉；新增 `js/core/service-guard.js`（192 行，隐藏 iframe 重拉、`recover → alive/restarted/elsewhere/dead`、**绝不自动跳转**）；ui-bridge 失败路径改三段自愈 + `#sim-recover` 手动入口；dev-server `/api/ping` 对齐身份格式。验证：regression 62/62、e2e-sim 0 失败、e2e-rtl 16/16、e2e-ui 73/73、exe 冒烟通过、`verify-recovery2` 17/17、真实 Edge 协议探针证明「隐藏 iframe 可拉起 exe，顶层跳转被浏览器拦」；exe 重建（20:05:06） |
| 2026-09-10 | 第十四轮：#86 A1~A4 全部落地 | 源码级实例扫描器 `scanInstances` + `maskStrings` 抹白 + `mergeInstances`（扫描器优先、engine 兜底过两道闸）+ 模块定义索引 `collectModuleDefs`/`resolveModuleDef`（同名多处→同文件优先、`fuzzy` 标记）；实例行**左键跳模块定义 / 右键(Alt+左键)跳例化点**，黑盒给中文提示；侧栏「导入源码」按钮（磁盘多选 → `state.files` → 自动重解析，不做全盘扫盘）；**源码集合随 `.wp` 存档/恢复**（包裹核心 `buildDocumentJson`/`loadFromFileContent`，旧工程向后兼容）。regression 62→**68/68**、e2e-rtl 16→**23/23**（E1~E6）、e2e-ui 73/73、真 exe 冒烟通过；exe 重建（20:36:16） |
| 2026-09-10 | 第十五轮：#76 B1 数据层落地（模块体内符号索引 + 例化路径 + 符号→VCD 全路径映射） | `rtl-nav.js` 新增 `scanModuleSymbols`（体内声明/端口/参数/实例名 → 行号 + 位宽 + 方向 + 值；`blankInnerScopes` 先抹白 function/task/specify/table 体，保证函数局部变量不进表且行号等长不失真）、`buildInstancePaths`（例化点分作用域前缀，自动判顶层、带环保护）、`buildSymbolIndex`（统一索引 + `moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`，`findSymbols` 收窄后为空则忽略该条件）；`buildRtlNav` 每模块新增 `endLine`/`symbols`；`vcd-index.js` 新增 `findVcdPathsByName`（名称末段兜底）；`ui-bridge.js` 只加探针 `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`（纯计算无副作用，**不动 UI**）。regression 68→**75/75**、e2e-rtl 23→**32/32**（F1~F9，跑真实 VCD 核对宽度）、e2e-ui 73/73、真 exe 冒烟通过；exe 重建（21:06:52）。**未改 `sim/engine.js` 一行** |
| 2026-09-10 | 第十六轮：#76 B4 交互落地（代码内点/选中变量 → 加波形 = 唯一加信号主路径） | `rtl-panel.js` 新增导出纯函数 `symbolNameAt(text, from, to)`（Verilog 标识符扫描 + `baseSymbolName` 剥位选 + `firstSymbolIn` 取末段 + ~110 个关键字排除），`installCodeEditor` 增第 5 参 `onAddSymbol` 与 `getContext()`/`focus()`，触发面 = 双击变量 / 右键菜单 / **捕获阶段 Ctrl+Alt+W**（**不用 Ctrl+W**：Edge `--app` 会吞它当关窗）；`ui-bridge.js` 新增 `addSymbolFromCode`（`currentSymbolIndex` → `moduleAtLine` 收窄 → `resolveSymbolVcdPaths`，**仅当候选为空**才 `findVcdPathsByName` 兜底）→ 唯一候选直加、多候选弹代码区旁轻量选择器 `.sim-symbol-picker`；`syncSimRows()`（原 `replaceInjectedOutputs` 改名）**不再灌 outputs** = 收敛「仿真后全量自动加信号」。regression 75→**77/77**、e2e-rtl 32→**39/39**（G1~G7）、e2e-ui 73/73、真 exe 冒烟通过；exe 重建（21:33:05）。**未改 `sim/engine.js` 一行** |
| 2026-09-10 | 第十七轮：#76 B3 落地（代码 ↔ 树双向跳转 = 代码光标 → RTL/VCD 树反向高亮，仿 nTrace「光标即高亮」） | `rtl-panel.js` 新增导出纯函数 `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow`（**目标带 kind 时同类是硬条件 + 必须位置证据**，同分取先出现者，无命中 -1）与 `clearRtlHighlight`/`clearVcdHighlight`/`highlightRtlRow`/`highlightVcdSignal`（清旧 → 加 `.rtl-active`/`.vcd-active` → **展开祖先 `<details>`** → `scrollIntoView`）；`installCodeEditor` 增第 6 参 `onCursorMove`（`selectionchange`(ownerDocument) + 宿主 `mouseup`/`keyup`，位置签名去重、仅焦点在内时发、`setText()` 重建后强制补发；**未改 CM bundle，免跑 esbuild**）；RTL 树行补 `data-rtl-*`、VCD 信号行补 `data-vcd-path`。`ui-bridge.js` 新增 `syncActiveFromCode`（`moduleAtLine` 模块行 / 实例名 → 实例行 / `resolveSymbolVcdPaths` **唯一才亮** VCD、歧义不猜、无目标清空）+ `scheduleActiveSync`（180ms 防抖）+ `applyActiveHighlight`/`clearActiveHighlight`（**树重建后重放**），`gotoSource()` 末尾闭环、`refreshStructureTrees()` 末尾重放。`index.html` 只加两条高亮 CSS（无新面板）。首跑 e2e-rtl H4 失败 → 判定**断言才是错的 spec**（模块 scope 高亮是刻意设计），改断言 + 新增 H4b。regression **79/79**、e2e-rtl **46/46**（H1/H2/H3/H4/H4b/H5/H6）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建（22:06:08） |
| 2026-09-10 | 第十八轮：**#76 B5 落地**（画布观察行随 `.wp` 工程存档与恢复） | 先做范围勘察（读核心 `js/wavepaint.clean.js`，**一行未改**）：① **信号组无需另存** —— `buildDocumentJson`（L1449~1451）逐字段存 `groupName`/`groupColor`/`groupPath`、`loadFromFileContent`（L1642~1644）逐字段还原，`GroupManager`（L1163~1404）纯函数派生无独立状态 → 天然闭环；② **观察行必须桥兜底** —— 核心把它当普通信号写进 `signals`，载入后丢 `__simInjected`/`__simWatchPath`/`width`/`msb`/`lsb`（脏激励 + 名字列丢 `[3:0]`）。`ui-bridge.js`：`injectArchiveSourceFiles` → **`injectArchiveFields(json, fields)`** 泛化；新增 `archiveSimWatches`（只存 `{path,name,width,reference}`）/ `applyArchivedExtras`（**先清 `vcd`/`outputs`/`simWatches`** 再恢复，坏载荷静默跳过）/ `applySourceFilesFromArchive` / `applySimWatchesFromArchive` / `adoptArchivedWatchRows`（「行名 == 观察路径」认领 + 补回位宽字段，幂等）；`syncSimRows` 增「无 VCD 时回退工程带回来的行」；`resetSourceFiles` 扩为「新工程全复位」；`__wpsim` 增 `designSignalNames` 探针。`tools/e2e-rtl.mjs` 新增 I1~I6（7 条落点 6 条断言，真实 Edge + 真实 VCD）。**首跑即 52/52 全 PASS**。regression 79/79、e2e-rtl **52/52**、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建（22:23:52、21,969,408 B、`v0.4.0 build 2026-09-10 22:23:51 5ec07e7`）。踩坑记入 06 P35、决策 07 D18；下一项 = **#87②**（模块全接口 Ctrl+4） |
| 2026-09-10 | 第十九轮：**#87② 落地**（模块/实例全部接口一键入波形，仿 nWave `Ctrl+4`；实际触发键 `Ctrl+Alt+4`） | 两条硬口径：① **触发键 = `Ctrl+Alt+4`**（**不用 `Ctrl+4`** —— Chromium/Edge 把 `Ctrl+数字` 当浏览器级「切换标签页」加速键，页面收不到 keydown，与 `Ctrl+W` 同源，见 06 P36）；② **「全部接口」= 模块端口**（`kind === "port"`，`modulePorts` 按名去重），体内 `wire/reg` 仍走 B4 单点加入、不批量灌；目标作用域 = **例化路径**（顶层模块 → `tb.dut`）。`rtl-panel.js`：`installCodeEditor` 第 7 参 `onAddScope`，触发块统一 `request(via,event,handler)`（未接线手势静默放过、不吞事件），捕获阶段识别 `key==="4"||code==="Digit4"||code==="Numpad4"`；`ui-bridge.js`：浮层泛化 `openPicker(title,items,anchor,mode)` + `showScopePicker`（`mode="scope"`）+ `moduleScopes`/`modulePorts`/**`addVcdPathsToWave`**（批量、只 render 一次、三桶返回、不设状态栏）/`modulePortsStatus`/`addModulePortsToWave`/`addModulePortsFromCode`；三处提示追加 `Ctrl+Alt+4`；`__wpsim` 增探针。**修掉一个真 bug**：光标在实例名上不能用 `findSymbols` 命中项的 `moduleName` 查作用域（`buildSymbolIndex` 把它覆盖成「定义所在模块」）→ 按实例名后缀查 `instancePaths`。`tools/e2e-rtl.mjs` +J0~J7（9 条）→ **61/61**（首跑 58/61：2 条测试自身设计错误 + 1 条真 bug）。regression 79/79、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建（22:49:32）。**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9） |
| 2026-09-10 | 第二十轮：**侧栏 / 整体 UI 重构设计方案交付（纯规划文档，本轮唯一交付物）** | 用户指令「按照规划继续」（承接第十九轮，其下一项 = 侧栏 / 整体 UI 重构设计方案）。**只出方案、未动任何受版本控制代码** → 不触发 C1、**本轮不重建 exe**。先做只读调研并建临时审计脚本 `.e2e-tmp/ui-audit.mjs`（`.gitignore` 覆盖，不入库），实测：`index.html` 904 行 / 静态 id 82 个 /「js 引用但 DOM 无 id」31 个 / 内联 `<style>` L26~L471 / 侧栏 DOM L733~L803 / 仿真栏 24 个 id 全部由 `ui-bridge.js` `el(...)` 抓取；顺带**纠正上一轮两处口径**（e2e-rtl 实为 28 处 CSS 选择器依赖；侧栏已无「收起」按钮，`el("sim-collapse")` 是死引用）。方案落盘 `08-ROADMAP.md` §2.1~§2.9：现状问题清单（P1 空间 / P2 数量 / P3 语义遗留 / P4 结构 / P5 CSS 双轨）+ 仿 Verdi「三区 + 一条控制带」目标布局 + 面板归位表 + 三条取舍选项 + 六条主线衔接点 + **契约面冻结清单**（24 id / class-dataset / `title` 全路径 / 状态类）+ P0/P1/P2 分期 +「UI 设计交给其它 AI」评估 + 交互清单。**状态 = 待用户 review**；用户拍板后按 08 §2.6 P0 开工（P0 起才动代码，届时须 C1 重建 exe + C8 核验 + 全量测试 + C17 记忆同步 + C2/C3 commit/push）。详见 04 §4.18、08 §2、07 D20、日志 2026-09-10 第二十轮 |

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

### 4.4 ✅ 已完成：#76 Verdi 借鉴 P1（B1~B5 全部完成 2026-09-10）+ #87②（第十九轮，见 §4.17；总纲/拆解见 08 §1.2/§1.3）

> 编号口径：台账中 P1 = #76（#75 是已完成的 P0）；此前 04/09 文档把 P1 误写成
> “#75 P1”，2026-09-09 第三轮已纠正。

**目标**
- 点变量 → 加波形（复用 `toNativeSignal` 注入链路）——✅ VCD 树部分已于第十轮 #85 完成。
- 树 ↔ 代码双向跳转。
- 信号组入 `.wp` 工程 —— ✅ B5 第十八轮完成（观察行随工程往返；信号组由核心天然闭环）。

**已有地基**
- P0 的 RTL 树 / VCD 层次树已能点击跳源码（跨文件）。
- `engine.js` 已解析模块、端口、参数、实例；VCD 带层次路径。
- ✅ #85（第十轮）已把「VCD 树信号行 → 加波形」闭环：观察行 `__simInjected:true` 不进激励、
  重仿真按 VCD 路径自动刷新去重、删行不复活可重加（详见 §4.8 / 当日日志第十轮）。
- P1 进度（2026-09-10 第十九轮更新，**#76 + #87①②③ 全部收口**）：RTL 树侧点行加波形 **已撤销**（B2，用户口径：不要求；
  RTL 树只做代码层级浏览，见 §4.10）；多实例歧义选择器 **✅ B4 已落地**（代码区旁轻量浮层）；
  代码点变量加波形 **✅ B4 已落地**（唯一加信号主路径）；树 ↔ 代码双向跳转 **✅ B3 已落地**
  （树→代码 #86 A2 + 代码→树反向高亮，#76 B3，见 §4.15）；信号组/观察行入 `.wp` **✅ B5 已落地**（观察行随工程往返，见 §4.16）；**#87②（模块/实例全部接口一键入波形，触发键 `Ctrl+Alt+4`）✅ 第十九轮落地**（见 §4.17）。**#76 B1~B5 全部完成，无剩余；#87①②③ 亦全部落地**。

**建议顺序**
1. ✅（第十轮 #85 完成）「VCD 树信号行 → 加波形」回调。
2. （第十一轮重排后）近期主线：**#86**（实例→模块定义跳转 + 源码文件导入 + 例化解析增强）
   → 本 #76 收尾（RTL 树点行加波形 / 代码点变量加波形 / 树↔代码双向跳转 / 信号组入 `.wp`）。
3. 之后 #87①/② —— **均已落地**（① = #76 B4 第十六轮；② = 第十九轮，触发键 `Ctrl+Alt+4`，见 §4.17）；#84/#77 已推迟远期（见 08 §3）。

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

### 4.11 ✅ 已完成：#86 服务在线性根治 —— 本地仿真服务自愈（2026-09-10 第十三轮，插队专项）

用户报障（原话）：「本地仿真失败，反正请求无响应的问题，这个要从根本上去解决的。每次点击
仿真的时候必须调用仿真服务，必须仿真成功」。本批**不是加提示、加重试**，而是把「服务不在线」
这件事本身消灭掉。完整过程见 `memory/logs/2026-09-10.md`。

**四类并存死因（缺一不可）**：

1. **进程死** — exe 退出/被杀 → 端口无监听 → `fetch` 立刻 `ERR_CONNECTION_REFUSED`；
   旧实现只弹「请重启应用」。
2. **换端口** — 旧版每次启动随机端口 → 已打开页面 origin 钉死旧端口，刷新也没用。
3. **端口被占** — 别的程序占了同端口 → `/api/sim` 发给「别人的」服务，拿到 404/乱码。
4. **换版本后首次启动必崩（本轮新发现）** — `ivlRoot` 只在 cache 命中分支赋值；
   换版本后首次启动走 extract 分支 → `Path.Combine(null, …)` → `ArgumentNullException`
   → **服务根本没起来**。日志实证：`19:57:24 BOOT resources=extract` →
   `IVL repair failed: ArgumentNullException path1`。**每轮重建 exe 后都会踩到这条路径**，
   解释了历史上「重建后重启就仿真不了」的反复。

**改动（5 个文件）**：

- **`WavePaintLauncher.cs`（服务侧根治）**：`PreferredPort = 17817` 固定首选端口（页面 origin
  跨会话稳定）；`PingTag = "WAVEPAINT-SERVICE"`，`/api/ping` 应答 `tag\n端口\nbuildStamp\n`
  + `Cache-Control: no-store`；**extract 分支末尾统一 `ivlRoot = Path.Combine(root,"ivl")`**
  + 新增 `EnsureIvlReady` 且在**每轮仿真前**也兜底；`ParsePortArg` 解析
  `wavepaint://start?port=49234`，`MainCore` 走 `requestedPort>0 ? requestedPort : PreferredPort`
  （**协议重拉回原端口 ⇒ 同源、无需跳转、不丢未保存内容**）；单实例互斥失败 → 探到活服务则
  `OpenExistingInstance()`，否则记 `TAKE-OVER` 继续自起；启动失败换端口重试一次；窗口探测改
  `FindWaveWindowHandles` 真值枚举（与 `CloseLegacyWindows` 同源），`HasWindow` 探测失败返回
  true 保守；退出条件 `everSeen && windowProbeOk && gone>24 && idle>90000`。
- **`js/core/service-guard.js`（新增 192 行，普通 script，早于 ui-bridge）**：`pingOrigin` 身份
  校验判活（绝不错认占端口的第三方）、`ping` 同源、`discover`（同源 + `127.0.0.1:17817`）、
  `waitForService`、`relaunch`（**隐藏 iframe** 加载 `wavepaint://start?port=<本页端口>`）、
  `recover → {alive|restarted|elsewhere|dead}`；**`elsewhere` 只上报不跳转**。
- **`index.html`**：引入 `service-guard.js`；`#sim-status` 后新增 `#sim-recover` 手动自愈按钮
  （默认 `display:none`）。
- **`js/sim/ui-bridge.js`（+142 行）**：`simApiBase`/`simApiUrl`（自愈到别的回环端口时改指向）；
  探活拆 `probePlainPing` + `probeServerAlive`（`tagged || plain || relocated`）；
  `recoverService` / `showRecoverHint` / **新增 `showRecoverPending`**（自动恢复进行中先亮手动
  入口但文案不说「失败」，替换旧实现那处误导性提示）；`/api/sim` catch 分支重写为三段自愈
  （在线 → 只给准确文案；不在线 → 快速发现并自动重试一次；进程真死 → 亮按钮 + 重拉 + 重试，
  失败才给手动指引）；`#sim-recover` 点击重拉并重试。
- **`tools/dev-server.mjs`**：`/api/ping` 对齐身份标识格式（否则本地开发时前端把 dev-server
  判成离线、自愈误触发）。

**验证（全绿）**：regression **62/62**、e2e-sim **0 失败**、e2e-rtl **16/16**、
e2e-ui **73/73**（真实 Edge）、真 exe 冒烟（core/wpf/doc/canvas/汉化全在、无异常）、
本轮自建 `verify-recovery2.mjs` **17/17**（含 D1「点运行仿真 + 服务已死 → 自愈 → 仿真完成」、
D3「重拉回到同一端口 17817」、D6「页面全程未跳转」、C4「relaunch 不顶掉页面」）、
真实 Edge 协议探针 `probe-protocol.mjs`（**T1 隐藏 iframe ✅ 拉起 exe**；T2/T3/T4
`<a target=_blank>`/`window.open`/顶层跳转 ❌ 被 `user gesture is required` 拦下）。
exe 已按 C1 重建：21,881,344 B、20:05:06、`version.txt` = `v0.4.0 build 2026-09-10 20:05:06 72116e0`；
C8 特征串：`WAVEPAINT-SERVICE`=1 / `wavepaint:`=11 / `WPServiceGuard`=5 / `sim-recover`=2 /
`showRecoverPending`=2 / `probePlainPing`=2 / `simApiBase`=8。

**两条铁律（后人务必遵守）**：

1. **恢复策略一律「改 `simApiBase` / 同端口重拉」，禁止自动整页跳转** —— 本应用**没有自动
   保存**，跳转 = 用户画布内容全丢（见 06 P30）。
2. `relaunch()` **必须用隐藏 iframe** —— 顶层跳转 / `window.open` / `<a target=_blank>`
   均被浏览器用户手势策略拦下，且顶层跳转在协议未注册时会顶掉当前页面。

**未覆盖项（明确登记，勿误以为已验证）**：浏览器首次弹「是否允许打开 wavepaint:」并勾选
「始终允许」这一步只有真实用户桌面能走完，headless 无法覆盖；本轮用预置协议允许表 +
模拟 OS 协议回调等价替代。

**范围说明**：#86 在 03 表 H 的原定义是「实例→模块定义源码跳转 + 源码文件导入」（A1~A4），
本轮做的是其中**独立子项「服务在线性」**（用户当轮唯一诉求）；当时 **A1~A4 仍为 ⬜ 未开工**，
已在下一轮（第十四轮，见 §4.12）全部实施完成。

### 4.12 ✅ 已完成：#86 A1~A4 —— 实例→模块定义源码跳转 + 磁盘导入源码 + 源码集合随工程存档（2026-09-10 第十四轮，近期主线第一项收口）

用户指令：「OK, 继续回到原来的任务，继续进行，按规划进行」→ 按 `09-HANDOFF.md` §3 的
「下一步任务」开工 **#86 A1~A4**，一次做完四项（A4 原为「待用户拍板」，本轮一并落地）。

**A1 底层解析/索引增强（`js/sim/rtl-nav.js`，+311 行）**：

- 新增**源码级实例扫描器** `scanInstances(text, from, to, lineOf)`：字符流 + 平衡括号
  `matchParen` + 多实例循环（`sub u1(a), u2(b), u3(c);`）+ 必须以 `;` 收尾；实例名与
  语句位置取自**真实下标** ⇒ 行号精确。覆盖：参数化例化 `mod#(.P(1)) u(…)`、命名/位置
  端口连接、generate 内例化、一条语句多实例。
- 新增 `maskStrings(source)`（字符串内容换等长空格）+ `blankComments` 已成对的抹白，
  防字符串里的 `"mod u(x);"` 干扰扫描；**未闭合字符串按 `inner = scan - index - 1` 保证等长**。
- `mergeInstances(scanned, fromEngine)`：以 `moduleName.toLowerCase()|instanceName` 为 key
  去重，扫描器优先、engine 兜底（engine 条目过两道闸：`isReservedName` 排除门原语 +
  抹白文本里必须真存在 `<实例名> (`），最后按行号排序。
- 新增模块定义索引：`collectModuleDefs(nav)`（压平成 `{name,file,fileIndex,line,...}`）、
  `findModuleDefCandidates`（精确 → 大小写不敏感模糊）、`resolveModuleDef(defs, moduleName,
  preferFileIndex)`（同名多处定义 → **优先同文件**，否则第一处）。

**A2 交互：实例行 → 模块定义跳转（`rtl-panel.js` + `ui-bridge.js`）**：

- `makeJumpRow(...)` 增第 6 参 `secondaryJump`：**左键 = 主入口（跳模块定义）**，
  **右键 `contextmenu` / Alt+左键 = 次入口（跳例化点）**；title 里写明两种语义。
- 实例行 payload 扩为 `{fileIndex, line, moduleName, instanceName, name, kind}`
  （`kind:"instance"` 跳定义 / `kind:"instanceSite"` 跳例化点）。
- `refreshStructureTrees()` 里 `kind==="instance"` → `resolveModuleDef`：命中 → 跨文件
  `gotoSource(def.fileIndex, def.line)`（先 `syncEditor()` 再切 `state.active` + `renderFileTabs()`）
  + 状态栏「已定位到 module X 的定义（file:line）」（fuzzy / 多候选附加说明）；未命中
  （黑盒 / 外部 IP）→ 中文提示并退回例化点。

**A3 交互：磁盘导入源码（`index.html` + `ui-bridge.js`）**：

- `.source-actions` 新增 `<button id="sim-import">导入源码</button>`（`accept=.v/.sv/.vh/.svh`、
  多选）。`pickSourceFilesFromDisk()` 优先 `showOpenFilePicker`，不可用回退隐藏 `<input type=file>`。
- `importSourceFiles()`：读文本 →（`uniqueSourceFileName` 同名追加 `_2`/`_3` 并提示，不静默覆盖）
  → 进 `state.files` → `renderFileTabs()` → `parseDesign()` 自动解析刷新 RTL 树 → 状态栏报告。
  **不做全盘扫盘**（= Verdi filelist 语义的本地等价）。

**A4 源码集合随 `.wp` 工程存档/恢复（`ui-bridge.js`）**：

- **不改核心**（`wavepaint.clean.js` 是解混淆产物）：改为**包裹核心两个顶层函数**
  `window.buildDocumentJson` / `window.loadFromFileContent`（classic script 的顶层 function
  声明 = 全局对象属性，`file-menu.js` 已在用 `window.saveToFile`，口径一致）。
- 存档：`injectArchiveSourceFiles(json, files, activeIndex)` 用**文本拼接**在末尾 `}` 前
  追加 `"sourceFiles":[…]` + `"activeSourceIndex":N`（不二次 parse/stringify；空文档 `{}` 不多逗号）。
  当前编辑器里尚未回写的文本由 `flushEditorIntoSourceFiles()` 回写（**故意不用 `syncEditor()`**
  —— 后者会清 `design`/`outputs`/TB，保存不该有副作用）。
- 恢复：`applyArchivedSourceFiles(text)` —— 带 `sourceFiles` → 整体替换 + `renderFileTabs()`
  + `parseDesign()`；**旧工程不带 → 保持现状**（不覆盖用户正在编辑的源码）。面板未就绪
  （如启动即带 `#d=` 分享链接）时只写 `state.files`，由 `init()` 渲染。
- **存档桥尽早安装**（模块求值期，早于 DOMContentLoaded）—— 分享链接自动载入发生在核心
  初始化阶段，装晚了会漏掉那一次恢复。核心未暴露这两个函数时**静默降级**（`console.warn`，
  工程仍可存取，只是不带源码集合）。
- `js/editor/file-menu.js` 的「新建」在 `resetDocumentInPlace()` 后调 `__wpsim.resetSourceFiles()`，
  源码集合一并复位（与 C12「新建就地重置」口径一致）。
- 新增自动化/探针入口 `window.__wpsim = { sourceFiles, active, archiveInstalled,
  setSourceFiles, resetSourceFiles, importSourceFiles }`（不参与产品逻辑）。

**验证（全绿）**：

| 套件 | 结果 |
|---|---|
| `node tools/regression.mjs` | **68/68**（#86 A1 新增 6 条：多实例/参数化/generate 全识别、关键字与字符串不误判、实例名与端口同名取实例化语句行号、`maskStrings` 等长、定义索引与模糊/多候选） |
| `node tools/e2e-rtl.mjs` | **23/23**（真实 Edge；新增 E1~E6） |
| `node tools/e2e-sim.mjs` | 失败 0 项 |
| `node tools/probe-param.mjs` | 全部通过 |
| `node tools/e2e-ui.mjs` | **73/73**（真实 Edge） |
| `node tools/exe-smoke.mjs` | 真实 exe 冒烟通过（core/wpf/doc/canvas/汉化全在、无异常） |

**E 段断言（`tools/e2e-rtl.mjs`，真实 Edge 实测）**：
E1 存档桥已安装且 `__wpsim` 可用；E2 两文件工程（top 例化 sub）点实例行 → 状态栏
「已定位到 module sub 的定义（sub.v:1）」+ 标签切到 `sub.v`；E3 黑盒 `ext_ip` →
「未找到模块 ext_ip 的源码定义（可能是黑盒或外部 IP），已定位到例化点第 3 行。」；
E4 实例行右键 → 「已定位到 sub 的例化点（第 3 行）。」且仍停在 `top.sv`；
E5a `buildDocumentJson` 产物含 `sourceFiles`（2 条、内容取自当前编辑）+ `activeSourceIndex`；
E5b 载入带 `sourceFiles` 的最小工程 → `__wpsim.sourceFiles` 被整体替换（`loaded_a.sv,
loaded_b.v`，`activeSourceIndex=1` 生效）；E6 侧栏存在「导入源码」按钮。

**exe**：已按 C1 重建 —— `WavePaintClean.exe` **21,910,016 B**、时间戳 **2026-09-10 20:36:16**、
`version.txt` = `v0.4.0 build 2026-09-10 20:36:16 327acf7`（哈希为构建时的 HEAD，提交后
比新 commit 差一轮，与本项目历次口径一致）。C8 特征串（`rg -a -c`）：`scanInstances`=2、
`resolveModuleDef`=3、`collectModuleDefs`=3、`sim-import`=2、`archiveInstalled`=1、
`__wpsim`=2、`setSourceFiles`=5、`injectArchiveSourceFiles`=2。

**范围与后续**：#86 A1~A4 至此**全部收口**。下一步整线进入 **#76 B1**（模块体内符号索引 +
scope 映射）→ **B4**（代码内点/选中变量加波形 = 唯一加信号主路径，仿 Verdi Ctrl+W）。

---

### 4.13 ✅ 已完成：#76 B1 —— 模块体内符号索引 + 例化路径 + 符号→VCD 全路径映射（2026-09-10 第十五轮，近期主线第二项第一顺位）

用户指令：「OK, 继续回到原来的任务，继续进行，按规划进行」→ 按 08 §1.2 开工 **#76**，本轮
完成**第一顺位 B1（底层解析底座）**。B1 是 B4（代码内点变量 → 加波形 = 唯一加信号主路径）与
B3（代码↔树双向跳转）的**共同底座**，因此本轮只做**数据层**，不碰 UI 交互（B4 才接线）。
**界面上无任何可见变化**。

**1. `js/sim/rtl-nav.js`（核心新增，只增不改：`buildRtlNav` 既有语义保持）**

- 关键字表：`DATA_DECL_KEYWORDS`（wire/reg/logic/bit/integer/genvar/tri/time/real/shortint/…
  共 26 个）、`IMPLICIT_WIDTHS`（integer/int=32、time/longint=64、shortint=16、byte=8、
  real/realtime=64、shortreal=32）、`DECL_TYPE_WORDS`、`DECL_SCAN_KEYWORDS`（数据关键字 +
  input/output/inout + parameter/localparam）。
- 内部工具：`blankInnerScopes(text)`（`function…endfunction` / `task…endtask` /
  `specify…endspecify` / `table…endtable` **整体抹成等长空格**、保留换行 → 函数/任务形参与
  局部变量**不进符号表**）；`declRangeInfo(rangeText)`（`[7:0]` → `{msb,lsb,width,range}`，
  参数化位宽 width=0 但保留 `range` 原文）；`findStatementEnd`（深度 0 的 `;`）；
  `splitDeclItems`（深度 0 逗号切分）；`declItemInfo`（单项 → `{name,ownRange,value}`）；
  `readDeclStatement`（吞类型词 → 取位宽 → 取标识符列表；`parameter type T = logic;` 放弃）。
- **导出 `scanModuleSymbols(content, blanked, from, to)`**：在
  `blankInnerScopes(maskStrings(blanked))` 上跑关键字扫描，产出
  `{name, kind:'port'|'parameter'|'localparam'|'reg'|'wire'|'logic'|'integer'|'genvar'|…,
  direction, width, msb, lsb, range, value, line}`；行号用 `lineNumberOf(原文, 真实下标)`。
- 内部 `mergeSymbols(groups)`：同名同行去重（key=`name|line`）+ 按行号排序（稳定 sort 保同行
  内优先级）。
- **导出 `buildInstancePaths(nav, options)`** → `{topName, topNames, paths:[{moduleName,file,
  fileIndex,line,path,depth}]}`；`path` = **不含信号名**的作用域前缀（`tb.dut`、`tb.dut.u_a`）；
  options = `{topName, tbScope='tb', topInstance='dut', maxDepth=32}`；顶层未指定时**自动判**
  （没被任何模块例化过的模块）；带**例化环保护**（`stack` 按 defKey + `seen` 按 `key|path`）。
- **导出 `buildSymbolIndex(nav, options)`** → `{topName, topNames, modules:[…], symbols:[已展平，
  带 moduleName/file/fileIndex], instancePaths}`；`moduleAtLine(index, fileIndex, line)`（含该行的
  **最外层**模块，越界 null）；`findSymbols(index, name, options)`（`{moduleName,fileIndex,line}`
  逐级收窄，**收窄后为空则忽略该条件**；大小写不一致标 `fuzzy`）；
  `resolveSymbolVcdPaths(index, name, options)` → `{paths, hits, fuzzy}`。
- `buildRtlNav` 每模块结果新增 `endLine` 与 `symbols`（= `mergeSymbols([体内声明, 端口, 头部参数,
  实例名])`，**体内声明在前**：唯一重叠是体内 localparam，体内扫描的关键字更准）。
- 注释里写明三条**有意为之**的边界：不索引 `assign` 隐式 net、不索引自定义类型变量、
  不索引 named begin 内局部变量。

**2. `js/sim/vcd-index.js`（+1 导出）**：`findVcdPathsByName(parsed, name)` —— 按信号名**末段**
在 `parsed.signals` 取全部全路径（scope 点分 + name），去重保序、空入参安全。用途 = 代码符号
没能在模块体符号索引命中时（隐式 net / TB 本地信号 / 自定义类型变量）做**兜底候选**。

**3. `js/sim/ui-bridge.js`（仅接线 + 探针）**：import 扩为 `buildRtlNav, buildSymbolIndex,
collectModuleDefs, resolveModuleDef, resolveSymbolVcdPaths` + `buildVcdHierarchy,
findVcdPathsByName`；新增 `currentSymbolIndex()`（`refreshVcdTree` 之后：
`buildSymbolIndex(buildRtlNav(state.files), { topName: state.selectedTop ||
state.design?.topModule?.name || "" })`，**纯计算、无副作用、不碰画布**）；
`window.__wpsim` 增 `get symbolIndex()`（返回 `{topName, topNames, moduleCount, symbolCount,
instancePaths}`）、`symbolsOf(fileIndex)`、`symbolVcdPaths(name, options)`、
`vcdPathsByName(name)`。

**4. `tools/regression.mjs`（+7 条，62→75）**：rtl-nav 组末尾 6 条（fixture `B1_TOP_SRC` /
`B1_SUB_SRC` / `b1Files()`）：体内声明索引（wire/parameter/localparam/instance、按行有序）、
ANSI+非 ANSI 端口与同名 `output q`/`reg q`、位宽与 signed、function 内局部变量与形参不进表、
integer=32、注释/字符串里的 `wire` 不索引、例化路径（含自动判顶层与**例化环不挂死**）、
符号→VCD 候选与收窄/fuzzy、`moduleAtLine`；vcd-index 组末尾 1 条 `findVcdPathsByName`
（两条同名 q、空入参安全）。

**5. `tools/e2e-rtl.mjs`（+9 条 F 段，23→32）**：F 段自带两文件 fixture（`counter.sv` 例化
`sub.v`，**两个模块里都有 q** → 跨模块同名），`setSourceFiles` 后**跑一次真实仿真**，再用
`__wpsim` 探针核对「代码符号 → 真实 VCD 全路径」。

**验证（全绿）**：

| 套件 | 结果 |
|---|---|
| `node --check`（rtl-nav / vcd-index / ui-bridge / e2e-rtl） | 全过 |
| `node tools/regression.mjs` | **75/75**（第十四轮 68 + B1 新增 7 条） |
| `node tools/e2e-rtl.mjs` | **32/32**（真实 Edge；第十四轮 23 + F1~F9） |
| `node tools/e2e-sim.mjs` | 失败 0 项 |
| `node tools/probe-param.mjs` | 全部通过 |
| `node tools/e2e-ui.mjs` | **73/73**（真实 Edge） |
| `node tools/exe-smoke.mjs` | 真 exe 冒烟通过（端口 17817、core/wpf/doc/canvas/汉化全在、无异常） |

**F 段实测输出（真实 VCD 核对）**：`symbolIndex` = `topName:counter / moduleCount:2 /
symbolCount:10 / paths:["tb.dut","tb.dut.u_sub"]`；点 `counter.sv` L7 的 reg q →
`["tb.dut.q"]`；点 L5 端口 q → `["tb.dut.q"]`；点 `sub.v` L2 的 reg q → `["tb.dut.u_sub.q"]`
（跨模块同名不串味）；只给名字 `q` → 两条候选；名称兜底 `vcdPathsByName('q')` =
`["tb.q","tb.dut.q","tb.dut.u_sub.q"]`（覆盖符号侧全部候选）；`wire acc`(L8) → `tb.dut.acc`；
不存在符号 → 空候选；越界 fileIndex/line → 因「收窄为空则忽略」回退到全部同名候选；
**符号声明位宽 4 == VCD 实际位宽 4（vector）**。

**exe**：已按 C1 重建 —— `WavePaintClean.exe` **21,930,496 B**、时间戳 **2026-09-10 21:06:52**、
`version.txt` = `v0.4.0 build 2026-09-10 21:06:52 db7a98f`。C8 特征串（`rg -a -c`）：
`buildSymbolIndex`=3、`scanModuleSymbols`=2、`findVcdPathsByName`=3。

**范围与后续**：#76 B1 **数据层闭环**（本轮无阻塞）。下一步 = **B4 代码内点/选中变量 → 加波形**
（复用 `__wpsim.symbolVcdPaths` / `findSymbols` → `state.simWatches` +
`pickVcdSignalIntoWave`（#85）→ `scrollWaveToWatchPath`；候选 >1 只对代码操作弹选择器，
**不引入单独“信号层次选择框”**；同步统一「运行仿真后不再全量自动加信号」）→ B3 → B5 →
**#87②**。**未改 `sim/engine.js` 一行**（C9 守住）。

### 4.14 ✅ 已完成：#76 B4 —— 代码内点/选中变量 → 加波形（2026-09-10 第十六轮，唯一加信号主路径）

用户指令：「按照规划继续进行」→ 按 08 §1.2 实施 **#76 B4**。B4 是第十二轮澄清后定下的
**唯一加信号主路径**（仿 Verdi nWave「中追」/ Ctrl+W），本轮同时**收敛**了「运行仿真后把
所有可看变量全量灌进画布」的旧做法（用户明确不要）。

**1. `js/sim/rtl-panel.js`（取词纯函数 + 编辑器触发面）**

- 新增导出纯函数 **`symbolNameAt(text, from, to)`**：在给定文本与位置（或选区）上取“用户
  想加进波形的那一个信号名”。内部：`VERILOG_IDENT` / `IDENT_SCAN` / `IDENT_CHAR`
  （标识符字符集）、`BITSEL_LOOKBACK`（回看是否处在 `q[3:0]` 这类位选之后）、
  `VERILOG_KEYWORDS`（~110 词，排除 `always`/`begin`/`end`/`if` 等关键字）、
  `baseSymbolName()`（剥掉 `q[3:0]` 的位选与下标）、`firstSymbolIn()`（`a.b.c` 取末段）、
  `isIdentAdjacent()`（判定给定位置是否真的贴着这个标识符）。
- `installCodeEditor(...)` 增第 5 个参数 **`onAddSymbol`**（回调）；内部新增 `readContext()`
  产出 `{name, line, selection, exact, source}`（`exact` = 是否精确命中一个完整标识符；
  `source` = `'cm'` | `'textarea'`）；返回对象新增 `getContext()` 与 `focus()`。
- **触发面（三条入口，全部进同一个 `onAddSymbol`）**：① `dblclick`（**冒泡阶段**，要求
  `ctx.exact`）—— 双击变量名；② `contextmenu`（`preventDefault()`）—— 右键菜单项；
  ③ `keydown` **捕获阶段** `Ctrl+Alt+W`。
  **刻意不用 `Ctrl+W`**：Edge `--app` 窗口把 `Ctrl+W` 当关窗快捷键，页面收不到（见 06 P33）。
- **未改** `tools/cm6-entry.js` / `lib/codemirror.bundle.js`：取词触发挂在**宿主 DOM** 上、
  不依赖 CM 扩展，因此**不需要重跑 esbuild**。

**2. `js/sim/ui-bridge.js`（接线 + 浮层选择器 + 收敛全量灌信号）**

- `installCodeEditor` 调用处新增 `onAddSymbol: (context) => addSymbolFromCode(context)`。
- 新增 **`addSymbolFromCode(context)`**：`currentSymbolIndex()` → `moduleAtLine`（行 → 模块）
  → `resolveSymbolVcdPaths(index, name, {moduleName, fileIndex, line})`；**仅当候选为空**才用
  `findVcdPathsByName` 兜底（精确与兜底**不做并集**，见 06 P33）；唯一候选 →
  `pickVcdSignalIntoWave(path)`（#85 链路）；多候选 → `showSymbolPicker(候选)`；未命中 → 中文提示。
- 新增单例浮层选择器 `symbolPicker` / `showSymbolPicker()` / `closeSymbolPicker()`；对应 DOM/CSS
  是**代码区旁的轻量浮层** `.sim-symbol-picker`（**不是**单独“信号层次选择框”，不放侧栏、
  不放 RTL 树）。
- **`replaceInjectedOutputs` 改名 `syncSimRows()`**，并**不再把 `outputs` 全量灌进画布**：只同步
  “由真实 VCD 路径登记的观察行”（`state.simWatches`）。这就是用户要的「点运行仿真之后不要
  把所有可看的变量全添加上去」。
- `window.__wpsim` 新增探针：`addSymbolFromCode` / `codeContext` / `symbolPickerOptions` /
  `clickSymbolPickerOption` / `closeSymbolPicker` / `nativeValuesOfOutput` / `outputs` /
  `simWatches`（供 e2e-rtl G 段黑盒核对）。

**3. `index.html`**：新增 `.sim-symbol-picker` / `-title` / `-item` 系列 CSS（+39 行，插在
`.sim-status` 之后、`#sim-panel` 之前）。

**4. `tools/regression.mjs`（+2 条，75→77）**：新增 `group("rtl-panel.js（#76 B4 代码取词纯函数）")`，
断言 `symbolNameAt` 在“标识符中间 / 位选 `q[3:0]` / `a.b.c` / 关键字 / 空白处”的取词行为。

**5. `tools/e2e-sim.mjs`**：导出清单扩 `syncSimRows` 等；断言区改为「**不自动灌信号**」+
「登记真实 VCD 路径后，观察行与原生信号**等长同子步**」。

**6. `tools/e2e-rtl.mjs`（+7 条 G 段，32→39）**：G 段 fixture = `counter.sv` 例化两次 `sub`
（`u_a` / `u_b`），两个文件里都有 `reg [3:0] q`（跨模块同名，用于验证“多候选”）。

**验证（全绿）**：

| 套件 | 结果 |
|---|---|
| `node tools/regression.mjs` | **77/77** |
| `node tools/e2e-rtl.mjs` | **39/39**（G 段 7 项全 PASS） |
| `node tools/e2e-sim.mjs` | 失败 0 项（含「仿真后未自动灌信号」断言 ✅） |
| `node tools/e2e-ui.mjs` | **73/73**（真实 Edge） |
| `node tools/probe-param.mjs` | 全部通过 |
| `node tools/exe-smoke.mjs` | 真 exe 冒烟通过（端口 17817、core/wpf/doc/canvas/汉化全在、无异常） |

**G 段实测输出（真实浏览器 + 真实 VCD）**：G1 `autoInjected:0 / autoWatch:0`（仿真后画布
**没有**被自动灌信号）；G2 点 `counter.sv` 的 `q`（`{name:'q',fileIndex:0,line:7}`）→
`tb.dut.q`、`uniquePicker:null`（唯一候选直接加，不弹选择器）；G3 点 `sub.v` 的 `q`
（`{fileIndex:1,line:2}`）→ `["tb.dut.u_a.q","tb.dut.u_b.q"]` 两条候选且**先不加入**；
G4 `clickSymbolPickerOption` → 加入 `tb.dut.u_b.q` 且 `pickerClosed:true`；G5 未知符号 →
`unknownDelta:0`（零副作用）+ 中文提示；G6 右键 / `Ctrl+Alt+W` 派发到 `#verilog-cm-host` 走
同一条链路；G7 `codeContext.source === 'cm'`。

**exe**：已按 C1 重建 —— `WavePaintClean.exe` **21,947,904 B**、时间戳 **2026-09-10 21:33:06**、
`version.txt` = `v0.4.0 build 2026-09-10 21:33:05 ebce2b5`。C8 特征串（全字节计数）：
`symbolNameAt`=4、`addSymbolFromCode`=5、`sim-symbol-picker`=11、`syncSimRows`=3、
`resolveSymbolVcdPaths`=6（全部 > 0）。

**用户可感知的变化（本批两条）**：① 代码里**双击变量名 / 右键 / 按 `Ctrl+Alt+W`** 就能把该
信号加进波形（多实例同名时在代码区旁弹一个轻量选择器让用户挑）；② 点「运行仿真」后**不再把
所有可看变量全量灌进画布**（只保留用户自己加的观察行）。

**范围与后续**：#76 B4 闭环（本轮无阻塞）。**未改 `sim/engine.js` 一行**（C9 守住）。
下一步 = **B3 代码 ↔ 树双向跳转**（用本轮新增的 `getContext()` 拿“代码侧符号/行”，配 B1 的
`moduleAtLine`/`findSymbols`）→ B5（信号组入 `.wp`）→ **#87②**。

### 4.15 ✅ 已完成：#76 B3 —— 代码 ↔ 树双向跳转（2026-09-10 第十七轮，仿 nTrace「光标即高亮」）

用户指令：「按照规划继续」→ 按 08 §1.2 实施 **#76 B3**。既有方向是「**树 → 代码**」（#86 A2：
点模块行跳定义、点实例行跳定义/例化点），本轮补上**反向**：「**代码里的光标/选中 → 树节点
同步高亮 + 滚动**」。**纯视觉、零副作用**：不加信号、不弹框、不新增面板、不改 RTL 树口径
（仍然不带出端口/信号行，见 §4.10）。

**取词与映射底座全部复用现成的两块，绝不另写解析**：取词 = B4 的 `getContext()`（`symbolNameAt`
口径）；定位/映射 = B1 的 `moduleAtLine` / `findSymbols` / `resolveSymbolVcdPaths`。

**1. `js/sim/rtl-panel.js`（行匹配纯函数 + 光标回调 + 树行元数据）**

- 新增导出纯函数：
  - **`rowMatchScore(row, target)`** —— 「树行 vs 目标」打分：**目标带 `kind` 时同类是硬条件**
    （不同类直接 0）；**必须有位置证据**（行号相等，或 `instanceName`/`moduleName`/`name`
    相等），否则 0；分数 = 同类 **+16** / 行号命中 **+12** / 名称命中 **+8** / `fileIndex` 命中 **+6**。
  - **`pickRtlRowIndex(rows, target)`** —— 返回命中下标（无命中 **-1**，同分**取先出现者**）。
  - **`datasetToRtlRow(element)`** —— 从 DOM 行的 `data-rtl-*` 还原行描述（`fileIndex`/
    `moduleName`/`instanceName` 用 `dataset` 的 camelCase 读法；缺 `line` → 0，缺 `fileIndex` → NaN）。
- 新增导出函数：`clearRtlHighlight(container)` / `clearVcdHighlight(container)`（清 `.rtl-active` /
  `.vcd-active`，返回清理条数）、**`highlightRtlRow(container, target)`**（清旧 → 按分数命中 →
  加 class → **向上把祖先 `<details>` 逐个 `open = true`** → `scrollIntoView({block:'nearest'})`
  → 返回命中行描述；无命中返回 null）、**`highlightVcdSignal(container, path)`**（按
  `[data-vcd-path]` **精确定位**加 class，返回 path；空/未找到返回 null）。
- `installCodeEditor` 新增第 6 参 **`onCursorMove`**（内部 `let emitCursor`）：订阅
  **`selectionchange`（挂 `ownerDocument`）** + 宿主 `mouseup`/`keyup`（无 CodeMirror 时退回
  textarea `keyup`）；内部按 `` `${source}|${name}|${line}|${selection}` `` **位置签名去重**
  （同一位置不重复发），且**只在焦点位于编辑器内**时才发；`setText()` 重建编辑器后**强制补发
  一次**（换文档后即使签名相同，高亮指向的树节点也可能已经换人）。
- RTL 树行新增 `data-rtl-*` 元数据（`applyRtlRowMeta`）：模块行 `kind=module / fileIndex /
  line=mod.moduleLine / moduleName / name`；实例行 `kind=instance / fileIndex / line=inst.line /
  moduleName / instanceName / name`。VCD 信号行新增 **`data-vcd-path`**。`makeJumpRow` 增一个
  `meta` 参数承载上述元数据。
- ⚠ **未改 `lib/codemirror.bundle.js` / `tools/cm6-entry.js`**：没有接
  `EditorView.updateListener`，靠上面四条 DOM 路径覆盖（**免 esbuild 重打包**，见 07 D17）。

**2. `js/sim/ui-bridge.js`（联动状态机）**

- 新增模块级状态：`activeHighlight`（当前联动状态 `{name,fileIndex,line,target,path,fallbackTarget}`）
  与 `activeSyncTimer`（防抖句柄）。
- **`syncActiveFromCode(context)`**：context 缺省读 `sourceCodeView.getContext()`（与 B4 同一
  取词口径）；无 `name`/`line` → 清空并返回 null。规则（**与 06 P34 / 07 D17 一致**）：
  1. 光标所在行 → `moduleAtLine` → **高亮所属模块行**（仿 nTrace「当前 scope」常亮）；
  2. 光标正好停在**实例名**上（`findSymbols` 命中 `kind === 'instance'` 且行号一致）→ 高亮
     **实例行**（实例名不是 VCD 信号，**不参与 VCD 高亮**），并记 `fallbackTarget` = 所属模块行；
  3. 其余符号 → `resolveSymbolVcdPaths(index, name, {moduleName, fileIndex, line})`，
     **候选数 === 1 才**高亮 VCD；符号侧为空才用 `findVcdPathsByName` 兜底，**同样要求唯一**
     （**歧义宁可不亮，绝不猜**）；
  4. 没有任何目标（既不在模块内、名字也不是符号）→ **清空**。
- **`scheduleActiveSync(context)`**：**180ms 防抖**（`currentSymbolIndex()` 是全量解析，不能每次
  按键都算）。
- **`applyActiveHighlight()`** / **`clearActiveHighlight()`**：前者在树重建后**重放**高亮
  （实例行没命中时退回 `fallbackTarget` 模块行；VCD 只在 path 非空时亮），后者清状态 + 两棵树。
- 接线三处：`installCodeEditor({ ..., onCursorMove: scheduleActiveSync })`；
  **`gotoSource()` 末尾**调 `syncActiveFromCode()`（**树 → 代码 之后立即闭环**：点模块行时光标
  落到定义行、该模块行保持高亮）；**`refreshStructureTrees()` 末尾**调 `applyActiveHighlight()`
  （两棵树都是 `replaceChildren` 全量重建，**不重放就必丢高亮**，见 06 P34）。
- `window.__wpsim` 探针新增：`syncActiveFromCode`、`clearActiveHighlight`、`get activeSymbol`
  （`{name,fileIndex,line,path,targetKind}` 或 null）、`get highlightedRtlRow`（读 DOM `data-rtl-*`，
  含 `text`）、`get highlightedVcdPath`（无则 null）。

**3. `index.html`（只加 CSS，不动布局）**

- 新增 `.rtl-jump-btn.rtl-active` 与 `.vcd-signal-row.vcd-active` 两条高亮样式
  （`--accent-soft` 背景 + `--accent` 边框 + `inset 2px 0 0` 左侧标记），**不新增任何尺寸、
  不改任何面板结构**。

**4. 测试**

- `tools/regression.mjs` **+2 条**（新增 group「#76 B3 代码 → 树反向定位的行匹配纯函数」）：
  ① 行匹配打分 **14 断言**（同类硬条件、行号/实例名命中、跨文件消歧、无位置证据 → -1、
  空目标/空候选、`fileIndex` 加分比较）；② `datasetToRtlRow` DOM 还原 **4 断言**（完整
  dataset / 缺属性安全 / null 元素）→ 合计 **79/79**。
- `tools/e2e-rtl.mjs` **+7 条 H 段**（真实 Edge + 真实 VCD，复用 G 段 fixture）→ 合计 **46/46**：
  **H1** 光标在 `counter.sv:7` 的 `q` → RTL 高亮 `module counter` 行（`line=1`）+ VCD 高亮唯一
  路径 `tb.dut.q`；**H2** `sub.v:2` 的 `q`（同名模块被例化两次）→ 高亮 `module sub`、**VCD 有
  歧义不猜**（`vcd:[]`）；**H3** 实例名 `u_b`（`counter.sv:13`）→ 高亮**实例行**（`line=13`）、
  不误亮 VCD；**H4** 未知符号 → **不误亮信号**（无 VCD、不亮实例行），只保留所在模块 scope
  高亮；**H4b** 光标既不在模块内、名字也不是符号（行号越界）→ **高亮全部清空**（清空路径仍在）；
  **H5** 点「解析 RTL」触发全量重建后高亮**被重放不丢**；**H6** 高亮**不带出**端口/信号行
  （树里 `.rtl-port`/`.vcd-signal-row` 计数仍为 0）、`clearActiveHighlight()` **一键清空**。

**5. 验证与产物（2026-09-10 第十七轮实测）**

| 套件 | 命令 | 结果 |
|---|---|---|
| 单元回归 | `node tools/regression.mjs` | **79/79** |
| 浏览器 RTL | `node tools/e2e-rtl.mjs` | **46/46**（H 段 7 项全 PASS） |
| 浏览器 UI | `node tools/e2e-ui.mjs` | **73/73**（真实 Edge） |
| 端到端仿真 | `node tools/e2e-sim.mjs` | 失败 0 项 |
| 参数探针 | `node tools/probe-param.mjs` | 全部通过 |
| 真 exe 冒烟 | `node tools/exe-smoke.mjs` | 通过（端口 17817、core/wpf/doc/canvas/汉化全在、无异常） |

**H 段实测输出（真实浏览器 + 真实 VCD）**：H1 `{rtl:['module'], vcd:['tb.dut.q'],
row:{kind:'module',fileIndex:0,line:1,moduleName:'counter'}, sym:{name:'q',fileIndex:0,line:7,
path:'tb.dut.q',targetKind:'module'}}`；H2 `{rtl:['module'], vcd:[], path:null,
row.moduleName:'sub', row.fileIndex:1, row.line:1}`；H3 `{rtl:['instance'],
row:{kind:'instance',line:13,instanceName:'u_b'}, vcd:[]}`；H4 `{rtl:['module'], vcd:[],
sym:{path:'', targetKind:'module'}}`；H4b `{rtl:[], vcd:[], row:null, sym:null}`；
H5 `before:1` → 重建后仍 `rtl:['module'] / vcd:['tb.dut.q']`；H6 `treePortRows:0`、清空后
`rtl:0 / vcd:0`。

**exe**：已按 C1 重建 —— `WavePaintClean.exe` **21,964,288 B**、时间戳 **2026-09-10 22:06:08**、
`version.txt` = `v0.4.0 build 2026-09-10 22:06:08 4fac9de`（⚠ `4fac9de` = **构建时 HEAD**，即
第十六轮的纯文档补记 commit；承载 B3 代码的 commit 是它的**下一个** —— **别误判 exe 落后**，
口径见 05/09 第十六轮补记）。C8 特征串（全字节计数，**全部 > 0**）：`highlightRtlRow`=8、
`highlightVcdSignal`=6、`syncActiveFromCode`=4、`rtl-active`=6、`vcd-active`=5、
`datasetToRtlRow`=4、`clearActiveHighlight`=4（另 `symbolNameAt`=5、`addSymbolFromCode`=6 仍在）。

**用户可感知的变化**：在代码区把光标点到某个变量名/实例名上，右侧 RTL 树会自动**展开并高亮
你所在的模块行**（点在实例名上则高亮实例行）、VCD 树同时高亮**该信号**（同名有歧义就**不亮**，
宁缺勿错）；点树上的行跳回代码后，高亮**仍停在落点处**，来回都是一致的。（纯视觉，不会加信号、
不会弹框。）

**范围与后续**：#76 B3 闭环（本轮无阻塞）。**未改 `sim/engine.js` 一行**（C9 守住）。RTL 树口径
未变（仍纯层级浏览，见 §4.10 / 03 表 F）。下一步 = **B5 信号组/观察行随 `.wp` 存档**（沿用第十四轮
A4 的存档桥，不要另造格式）→ **#87②**（模块全接口 Ctrl+4）。

---

### 4.16 ✅ 已完成：#76 B5 —— 画布观察行随 `.wp` 工程存档与恢复（2026-09-10 第十八轮）

用户指令：「按照规划继续」→ 按 08 §1.2 实施 **#76 B5 的「观察行随工程往返」**（B1 + B4 + B3 已
完成）。**目标**：在代码里点/双击变量加进来的**观察行**（`state.simWatches` @ `__simInjected`）
必须随 `.wp` 工程存档，重开工程后**回到画布**，且**仍然只是观察行**（不得变成用户画的激励信号）。

**先做的一次范围勘察（重要，避免误判“信号组要不要另存”）**：读核心 `js/wavepaint.clean.js`
（**C9：一行未改**）确认两件事 ——

1. **信号组无需额外存档**：`buildDocumentJson`（L1406~1515）对每个 `m_signals` 项**逐字段**存
   `name/type/color/values/.../groupName/groupColor/groupPath`（L1449~1451），`loadFromFileContent`
   （L1553~）逐字段还原（L1642~1644）；`GroupManager` 是**纯函数派生**（`getGroups`/`createGroup`
   /… 在 L1163~1404，**无独立状态**）→ **B5 的「信号组入 `.wp`」天然已由核心闭环**。
2. **观察行则相反，必须由桥兜底**：核心**不认得**注入行 —— 存档时它把观察行**当普通信号**一并写进
   `signals`（含 `values`），载入时 `new Signal(...)` 重建后**丢掉了 `__simInjected`/`__simWatchPath`/
   `width`/`msb`/`lsb`**。后果有两级：① 丢了注入身份 → 会被 `readWaveDocument()` 当**用户画的激励**
   去生成 TB（**脏激励**），且重新仿真也不刷新；② 丢了位宽元数据 → 名字列丢掉 `[3:0]`。

**1. `js/sim/ui-bridge.js` —— 存档桥从「源码桥」泛化为「工程附加状态桥」**

- **`injectArchiveSourceFiles(json, files, activeIndex)` → `injectArchiveFields(json, fields)`**
  （泛化，**旧函数名已不存在**）：`fields` = `[[名, 值], …]` 数组，仍是**文本拼接**（在最后一个
  `}` 前插入 `JSON.stringify(v, null, 2)`；空文档 `{}` 不加逗号；非对象字面量原样返回）。之所以
  坚持文本拼接：波形文档可能很大，保存时不该把整份文档再 `JSON.parse` 一遍（`stringify` 才是大头）。
- **新增 `archiveSimWatches()`**：`state.simWatches` → `{path, name, width, reference}`（`width` 取
  `Math.max(1, Number(...) || 1)`）。**只存「怎么找回它」的元数据** —— 波形数据本身已在核心的
  `signals` 里，这里不重复存一份。
- **`window.buildDocumentJson` 包裹**改为注入三个字段：`sourceFiles` / `activeSourceIndex` /
  **`simWatches`**（保存与分享链接共用，因核心是动态查表 `buildDocumentJson(item)`）。
- **`window.loadFromFileContent` 包裹**改为调 **`applyArchivedExtras(text)`**（原
  `applyArchivedSourceFiles` 拆解为 `applySourceFilesFromArchive` + `applySimWatchesFromArchive`）。
- **新增 `applyArchivedExtras(text)`**（载入工程后的统一接线）：`JSON.parse` 失败 → **静默 return**
  （分享链接的压缩载荷走的是核心自己的路径，桥不该插手、也不该报错）→ **先清 `state.vcd = null` /
  `state.outputs = []` / `state.simWatches = []`**（⚠ **画布已整体换人**：上一份设计留下的 VCD 对
  新画布毫无意义，不清就会拿旧 VCD 去刷新刚载入的观察行 = **数据张冠李戴**）→ `applySourceFilesFromArchive`
  → `applySimWatchesFromArchive` → 面板未就绪（启动即带 `#d=` 链接）则直接 return（`init()` 会用新
  state 渲染）→ `refreshVcdTree(); syncSimRows(); render();` → 状态栏拼接「已从工程恢复 N 个源码
  文件并自动解析；已恢复 M 个观察行。」（**两件事合成一条状态**，避免后一条覆盖前一条）。
- **新增 `applySimWatchesFromArchive(parsed)`**：带 `simWatches` → 覆盖 `state.simWatches` +
  `adoptArchivedWatchRows(watches)`，返回数量；**不带该字段（旧工程）→ 返回 0，且 `state.simWatches`
  保持「已被上面清空」的状态** —— 口径是「**观察行以工程为准**」：新画布不该残留上一个工程的观察行，
  也不能因为工程没这个字段就沿用内存里的旧登记。
- **新增 `adoptArchivedWatchRows(watches)`**（**本轮核心**）：按 **「行名 == 观察路径」** 认领 ——
  `buildWatchSignal` 本来就用 `path` 当行名，所以存档里那行普通信号的 `name` 就是 VCD 全路径。
  认领后置 `__simInjected = true` + `__simWatchPath`，并用存档元数据**补回核心不还原的位宽字段**
  （`width` / `kind = width>1 ? 'vector' : 'logic'` / `msb = width-1` / `lsb = '0'`）—— 因为核心
  `displaySignalName` 只认 `item.width` / `item.msb`，不补名字列就丢 `[3:0]`。已是注入行的**跳过**
  （`if (signal.__simInjected) continue`），保证幂等。
- **`syncSimRows()`：让观察行能从「刚载入的工程」里回来**（原实现无条件 `buildWatchSignal`，而该
  函数依赖 `state.vcd`，刚载入工程时 `state.vcd` 为空 → 观察行被**静默丢弃**）。改后先建
  `liveByPath`（当前画布上带 `__simWatchPath` 的行），过滤 `state.simWatches` 时改用它（语义不变，
  只是不再每次 `some()` 扫全表）；`buildWatchSignal(...)` 返回空时**仅在没有 VCD 的情况下**退回
  `liveByPath.get(path)`（= 用工程里带回来的那一行，它的 `values` 就是存档数据）。**口径**：
  **有 VCD 就以 VCD 为准**（缺该路径 = 未 dump → 丢弃，保证「重新仿真 → 数据刷新」），
  **无 VCD（刚载入工程）则按工程带回来的那一行保留**。这同时修掉了「载入工程渲染一次 → 观察行
  消失」的坑（与 06 P34 的「重建后必须重放」同源，见 06 P35）。
- **`resetSourceFiles()` 扩展为「新工程全复位」**：除原 `files` / `active` / `design` /
  `renderFileTabs` / `refreshStructureTrees` 外，新增 `state.vcd = null`、`state.outputs = []`、
  `state.lastTestbench = ""`、`state.simWatches = []`，并补 `refreshVcdTree(); updateTbViewer();
  render();`（与 C12「新建就地重置」一致：**新画布不残留上一个工程的任何东西**）。
- **`__wpsim` 增探针**：`get designSignalNames`（= `stripInjectedSignals(m_signals).map(name)`，
  即 `readWaveDocument` 真正会喂给 TB 的那一批），供 e2e 核验「观察行不参与激励」。`simWatches`
  探针（B5 之前已有）继续可用。

**2. `tools/e2e-rtl.mjs` —— 新增 I 段（7 条落点 6 条断言，真实 Edge + 真实 VCD）**

**I1** 观察行随工程存档：`buildDocumentJson` 产出含 `simWatches`（`path='tb.dut.q'` / `width=4`），
**且核心 `signals` 里也留了一份原样副本**（`archivedSignalsHasWatch:true` —— 正是这条说明核心不认得
注入行，桥才必须认领）；**I2** 载入工程 → `simWatches` 恢复（1 条），画布行回到注入语义
（`__simInjected:true` / `__simWatchPath:'tb.dut.q'`）且**位宽元数据补回**（`width:4` / `msb:'3'` /
`lsb:'0'` / `kind:'vector'`）；**I3** **观察行不被当激励**（`designSignalNames` 里没有它）+ 状态栏
含「观察行」字样；**I4** 新建（就地重置）→ 登记 / 注入行 / 源码集合同时复位
（`beforeReset:1 → afterResetWatches:0 / afterResetInjected:0 / afterResetFiles:'design.sv'`）；
**I5** 向后兼容：重新载入带 `simWatches` 的工程可**反复往返**（`reentryWatches:1`），再载入
**不带该字段的旧工程** → `legacyWatches:0` / `legacyInjected:0`（观察行清空、不报错）；
**I6** 非法载荷（坏 JSON / 分享链接压缩串）→ 桥**静默跳过、不抛异常**（`badJsonThrew:false`）。
**首跑即 52/52 全 PASS，本轮无「改断言还是改实现」的取舍**。

**3. 验证与产物（2026-09-10 第十八轮实测）**

| 套件 | 命令 | 结果 |
|---|---|---|
| 单元回归 | `node tools/regression.mjs` | **79/79**（B5 纯 DOM/VCD 相关，按判断未加单元用例，交给 e2e 覆盖） |
| 浏览器 RTL | `node tools/e2e-rtl.mjs` | **52/52**（新增 I1~I6 全 PASS，无 404、无控制台异常） |
| 浏览器 UI | `node tools/e2e-ui.mjs` | **73/73**（真实 Edge） |
| 端到端仿真 | `node tools/e2e-sim.mjs` | 失败 0 项 |
| 参数探针 | `node tools/probe-param.mjs` | 全部通过 |
| 真 exe 冒烟 | `node tools/exe-smoke.mjs` | 通过（端口 17817、core/wpf/doc/canvas/汉化全在、无异常） |

**I 段实测输出（真实浏览器 + 真实 VCD）**：`{"beforeArchive":["tb.dut.q"],"savedCount":1,
"savedPath":"tb.dut.q","savedWidth":4,"archivedSignalsHasWatch":true,"loadOk":true,
"restoredCount":1,"restoredPath":"tb.dut.q","restoredWidth":4,"rowInjected":true,
"rowPath":"tb.dut.q","rowWidth":4,"rowMsb":"3","rowLsb":"0","rowKind":"vector",
"restoreStatus":"已从工程恢复 2 个源码文件并自动解析；已恢复 1 个观察行。","designHasWatch":false,
"beforeReset":1,"afterResetWatches":0,"afterResetInjected":0,"afterResetFiles":"design.sv",
"reentryWatches":1,"legacyOk":true,"legacyWatches":0,"legacyInjected":0,"legacyNames":"legacy_a",
"badJsonThrew":false}`

**exe**：已按 C1 重建 —— `WavePaintClean.exe` **21,969,408 B**、时间戳 **2026-09-10 22:23:52**、
`version.txt` = `v0.4.0 build 2026-09-10 22:23:51 5ec07e7`（⚠ `5ec07e7` = **构建时 HEAD**，即
第十七轮 B3 的 commit；承载 B5 代码的 commit 是它的**下一个** —— **别误判 exe 落后**，
口径见 05/09 第十六轮补记）。C8 特征串（全字节计数，**全部 > 0**）：`injectArchiveFields`=2、
`archiveSimWatches`=2、`applyArchivedExtras`=2、`applySimWatchesFromArchive`=2、
`adoptArchivedWatchRows`=4、`designSignalNames`=1、`simWatches`=35（另 `sourceFiles`/`activeSourceIndex`
仍在，第十四轮 A4 的源码桥已并入新函数）。

**用户可感知的变化**：把信号加进波形后**保存工程**，下次**打开该 `.wp`**，这些观察行会**原样回到
画布上**（连名字列的 `[3:0]` 位宽都在），并且它们**仍然只是观察行** —— 不会被当成你画的激励信号
一起去生成 TB；直接点「运行仿真」也不会因为多了这几行而产出错误的测试激励。点「新建」会把
观察行 / 上一次的仿真结果 / 源码集合**一并清空**（不残留上一个工程的东西）。

**范围与后续**：#76 B5 闭环（本轮无阻塞）。**未改 `sim/engine.js` 一行**（C9 守住），
**未改 `js/wavepaint.clean.js` 一行**（信号组存档由核心天然闭环，桥只补观察行）。
RTL 树口径未变（仍纯层级浏览，见 §4.10）。下一步 = **#87②（模块全部接口 Ctrl+4）**，
沿用 B4 的 `getContext()` + `symbolNameAt` 取词口径（拆解见 08 §1.2）—— **已于第十九轮落地
（实际触发键 `Ctrl+Alt+4`，见 §4.17）**。

### 4.17 ✅ 已完成：#87② 模块/实例全部接口一键入波形（仿 nWave `Ctrl+4`，第十九轮 2026-09-10）

> 用户指令：「按照规划继续」（承接第十八轮，其当时的下一项 = #87②）。#87② = 在**代码区**把光标所在
> **模块（或实例）的全部接口（端口）**一次加为观察行，对齐 Verdi nWave `Ctrl+4`（Get Signals 语义）。
> **零核心改动**：`js/wavepaint.clean.js` 与 `js/sim/engine.js` **一行未改**（C9 守住）。

**两条硬口径（先看这个，别踩）**
- **触发键 = `Ctrl+Alt+4`，不是 `Ctrl+4`**：Chromium/Edge 把 `Ctrl+数字` 当**浏览器级「切换标签页」
  加速键**，页面根本收不到 keydown（与 `Ctrl+W` 同源，见 06 P33/P36）。实现认
  `key==="4" || code==="Digit4" || code==="Numpad4"` + `(ctrlKey||metaKey) && altKey`，并挂在
  keydown **捕获阶段**（`preventDefault()+stopPropagation()`）。
- **「全部接口」= 模块端口（`kind === "port"`）**：含模块头 ANSI 端口 + 体内 `input/output/inout`
  声明，`modulePorts` 按名去重；体内 `wire/reg` **不批量灌**（仍走 B4 单点加入）。目标作用域 =
  **例化路径**（顶层模块自动映射到 `tb.dut`），与 VCD 全路径同口径。

**实现落点**
- `js/sim/rtl-panel.js`：文件头补第 5 条职责；`installCodeEditor` 增第 7 参 `onAddScope`；
  触发块重构为统一的 `request(via, event, handler)`（handler 缺省回落 B4 单符号入口；**未接线的手势
  静默 return、不吞事件**）；`Ctrl+Alt+4` → `onAddScope(context)`；`Ctrl+Alt+W`（B4）行为不变。
- `js/sim/ui-bridge.js`：浮层**泛化** —— `showSymbolPicker` 拆出通用 `openPicker(titleText, items,
  anchor, mode)`（`items=[{label,title,onPick}]`、`box.dataset.pickerMode=mode`），薄封装
  `showSymbolPicker`（`mode="symbol"`，**选项文本仍是 VCD 全路径、B4 探针口径不变**）与 `showScopePicker`
  （`mode="scope"`，选项 = `scope.path`）。新增 `moduleScopes(index, moduleName)` / `modulePorts(index,
  moduleName)` / `addVcdPathsToWave(paths)`（**批量、只 render 一次**、末尾 `scrollWaveToWatchPath`、
  **不设状态栏**，返回 `{ready,added[],existed[],missing[]}`）/ `modulePortsStatus(scopePath, portCount,
  result)`（唯一汇总文案入口）/ `addModulePortsToWave(scope)` / `addModulePortsFromCode(context)`。
  三处提示追加 `Ctrl+Alt+4`（**G1 断言的 `/双击变量名/` 仍在**）；`__wpsim` 增探针
  `addModulePortsFromCode`/`moduleScopesOf`/`modulePortsOf`/`addVcdPathsToWave`/`get pickerMode`。
- `tools/e2e-rtl.mjs` 新增 **J 段（J0~J7，9 条）**，见下。

**兼容口径**
- 光标在**模块体内**（非实例）→ 取该模块端口，作用域按「模块名 → 例化路径」解析；顶层模块映射到
  `tb.dut`。光标在**实例名**上 → 取**被例化模块**的端口，作用域 = 该实例的例化路径。多候选（同名模块
  多处例化 / 同名实例名）→ 弹 `mode="scope"` 浮层让用户选，**不猜**。
- 重复触发**幂等**（已在画布的行进 `existed` 桶，不重复加）。无 VCD 数据 / 目标未 dump → 给中文说明。

**本轮修掉的真 bug**
`addModulePortsFromCode` 分支①（光标在实例名上）原想用 `findSymbols` 命中项的 `moduleName` 查作用域
——**错的**：`buildSymbolIndex` 里 `entry.symbols.push({...symbol, moduleName: entry.name})` 会把**实例
符号**的 `moduleName` 覆盖成**定义所在模块**（被例化模块名在符号上已丢）。改为按「**实例名后缀**」直接查
`index.instancePaths`（那里的 `moduleName` 才是被例化模块）。e2e-rtl J4 守着这条（见 06 P36）。

**验证（2026-09-10 第十九轮实测）**
- regression **79/79**；e2e-rtl **61/61**（新增 J0~J7 共 9 条：一次加 4 端口 `tb.dut.clk|rst_n|en|q`
  （`moduleRowsDelta===4`、`pickerMode===null`）/ 重复触发幂等 / `sub.v` 同名两例化 → `pickerMode==='scope'`
  候选 `['tb.dut.u_a','tb.dut.u_b']`、点 `tb.dut.u_b` 加 `tb.dut.u_b.clk` / 光标在实例名 `u_a` → 唯一作用域
  直加（真 bug 修复点）/ `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / **只按 `Ctrl+4`（无 Alt）不触发** /
  探针 `modulePortsOf('counter')`=4、`modulePortsOf('sub')`=1、`moduleScopesOf('sub')`=2、RTL 树仍无端口行 /
  `addVcdPathsToWave` 三桶分类）；e2e-ui 73/73；e2e-sim 0 失败；probe-param 全过；真 exe 冒烟通过。
- **J 段首跑踩坑（测试自身设计错误，已写 06 P36）**：首跑 58/61，3 条失败 → J2b/J3 用
  `clearWatches()` 清理观察行，但它只 `m_signals.splice`、未清 `state.simWatches` →
  `render()`/`syncSimRows()` 按登记把行**重建回来** → 删除该断言，改用 J7 三桶分类覆盖 `added` 桶；
  J4 是**真 bug**（见上），改实现不改断言。
- exe 重建：`WavePaintClean.exe` **21,982,720 B**、时间戳 **2026-09-10 22:49:32**、
  `version.txt` = `v0.4.0 build 2026-09-10 22:49:32 a201338`（`a201338` = **构建时 HEAD**，
  承载 #87② 的 commit 是它的**下一个**）；C8 特征串 `openPicker`=3、`showScopePicker`=3、
  `addModulePortsFromCode`=4、`modulePortsStatus`=2、`addVcdPathsToWave`=4、`pickerMode`=4、
  `hotkey4`=1、`Ctrl+Alt+4`=12（全 >0）。

**范围与后续**：#87② 闭环（本轮无阻塞）。**#76（B1~B5）+ #87①②③ 至此全部收口**。
下一项 = **侧栏 / 整体 UI 重构设计方案**（08 §2，**先出方案给用户 review，不直接开工**）；
#84/#77 已推迟远期（08 §3）。RTL 树口径未变（仍纯层级浏览，见 §4.10）。详见 07 D19 / 06 P36 /
08 §1.3 / 日志 2026-09-10 第十九轮。

### 4.18 🧭 已交付（方案，未实施）：侧栏 / 整体 UI 重构设计方案（第二十轮 2026-09-10）

> 用户指令：「按照规划继续」（承接第十九轮，其下一项 = 侧栏 / 整体 UI 重构设计方案）。
> **本轮只出方案，未动任何受版本控制代码** → **不触发 C1，本轮不重建 exe**（仅记忆同步）。
> 方案正文 = **`08-ROADMAP.md` §2.1~§2.9**（本节是摘要与入口，细节以 08 为准）。

**本轮做了什么（只读调研 + 写方案）**
- 建 `.e2e-tmp/ui-audit.mjs`（临时审计脚本，`.gitignore` 覆盖，**不入库**）：扫 `index.html` 全部
  静态 `id=`、扫 `js/**/*.js` 的 `getElementById`/`querySelector(All)`/`el("…")`，输出
  「js 引用但 DOM 无此 id」清单 + 仿真栏 24 个 id 的 `(el)` 归属，作为**契约面证据源**。
- 实测数据（**全部实算，非估算**）：`index.html` **904 行**、静态 id **82** 个、
  「js 引用但 DOM 无 id」**31** 个（多为动态创建，真遗留见 08 §2.1 P3 表）；
  内联 `<style>` 在 **L26~L471**（`</style>` L471，`</head>` L489）；侧栏 DOM 在 **L733~L803**；
  仿真栏 24 个静态 id **全部**由 `ui-bridge.js` `el(...)`/`getElementById` 抓取。
- 纠正上一轮两处口径：① 「e2e 不依赖 CSS 选择器」**不成立** —— `tools/e2e-rtl.mjs` 有 **28 处
  CSS 选择器依赖**（`#vcd-tree .vcd-signal-row`、`#rtl-tree .rtl-inst`、`#rtl-tree .rtl-active`、
  `#vcd-tree .vcd-active`、`#rtl-tree [data-rtl-kind]` 等），`e2e-ui.mjs` 依赖
  `.tool-btn[data-tool="…"]`；② 侧栏 DOM 里**已无「收起」按钮**（收起只靠点表头），
  `ui-bridge.js` 的 `el("sim-collapse")` 抓到 `null`（代码容错）→ 登记为**死引用**。

**方案要点（四段）**
1. **现状问题清单（08 §2.1，五类）**：P1 空间（328px 单栏 + 180/240/240/160px 固定高 + 7 按钮
   两列网格，固定需求 ≈900px+ 而可用高度 ≈900px，四条独立滚动条）；P2 数量（4 张卡片 = 四种
   工作模式被压成同质竖排）；P3 语义遗留（`#sim-addsignals` 文案与「代码内点变量 = 主路径」
   易混、`#sim-collapse` 死引用、菜单 `toggle-vcd-panel` 指向已被 `display:none!important`
   永久压制的 legacy 面板、legacy VCD 整族 10 个 id + 赞助面板死引用）；P4 结构（RTL 树与 VCD 树
   同层并列、职责未分级）；P5 实现（CSS 双轨：侧栏样式全在 `index.html` 内联，`css/*.css` 仅 8 行）。
2. **目标布局草案（08 §2.2~§2.3，仿 Verdi 三区 + 一条控制带）**：① 层级树区 = RTL 结构树纯层级
   浏览；② 代码区 = CM6 + 加信号主路径（B4/B4②）+ Active Annotation 预留位；③ 波形区 = 画布 +
   **VCD 树移入**；④ 仿真控制带 = 文件/按钮/顶层选择/状态/TB（折叠）收敛为一条。附「面板/按钮
   归位表」（08 §2.3）与**三条取舍选项**（面板形态 / 位置 / 迁移方式，**待用户拍板**）。
3. **衔接点与契约面（08 §2.4~§2.5）**：B4/B4②/B3/B5/#85/服务自愈六条衔接点写明「不得改动之处」；
   **冻结清单** = 24 个 id + `.rtl-inst`/`.rtl-active`/`.vcd-signal-row`/`.vcd-active`/
   `[data-rtl-kind]`/`[data-vcd-path]`/`.tool-btn[data-tool]`/`.sim-symbol-picker-item` +
   VCD 行 `title` 全路径 + `body.sim-open`/`#sim-panel.collapsed`/`wavedrom-debug-open`
   等状态类。**遗留待确认项**：`data-action="theme"` 的实际落点本轮未追到（登记为方案待办）。
4. **分期计划（08 §2.6，P0/P1/P2）** + **「UI 设计交给其它 AI」评估（08 §2.7）** + **交互清单
   （08 §2.8）**。P0 = 纯 CSS/布局（风险低，只做折叠/自适应/分区标题 + 死引用与文案清理）；
   P1 = DOM 重排（保 id/class，改父容器）；P2 = 多面板拖拽 + session 级面板状态。**每期独立
   commit + push，且每期完成都要 C1 重建 exe + C8 核验 + 全量测试 + C17 记忆同步**。

**评估结论（08 §2.7，建议不替用户拍板）**：把 UI 设计交给其它 AI **可行但只限「出稿」**
（布局对比图/视觉规范/交互流程稿，不进代码）；**契约面判定、e2e 影响面、与 B3/B4/B5 触发链的
耦合必须由本仓自有记忆与测试基线把关**；落地路径 = AI 出稿 → 人类 review → 本 AI 受约束落地。

**范围与后续**：方案状态 = **待用户 review**。**未动任何受版本控制代码**（无 exe 重建，
C1 未触发）；`wavepaint.clean.js`、`sim/engine.js`、`index.html`、`css/` 本轮**一行未改**。
用户拍板后按 08 §2.6 **P0 开工**。详见 08 §2、07 D20、日志 2026-09-10 第二十轮。

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
  `__simInjected:true` 不进 `readWaveDocument`（绝不生成激励）；重仿真时 `syncSimRows`（第十六轮由 `replaceInjectedOutputs` 改名而来）
  按路径重建 = 自动刷新 + 去重；删行即摘登记不复活（可重新点行加入）。
- **教程 = 只留副作用**：汉化版隐藏教程 UI 后，教程重跑只剩“挂高亮 + 拦键盘”两类副作用；随机端口下 localStorage 每会话全新，必须在 `clean.js` 前预置 `wavepaint_tutorial_done`，并拦截「帮助→教程」菜单。
- **sim 失败先分死因**：`/api/sim` 失败必须探活区分「进程死 / 自愈窗口 / 在线但请求超时」；进程死才提示重启，自愈窗口自动重试一次，超时给准确文案。
- **自动化探测注意**：核心模态 Enter=Escape 会自行关闭；探测按键拦截必须先把弹窗关掉。`wpModalState` 是词法全局，`window.wpModalState` 取不到。
- **exe-smoke 端口文件**：按最近写入时间选 `WavePaintClean_port_*.txt`（残留旧文件的数字可能更大）。
- **死窗口陷阱（#82）**：Edge 同 profile 的 `--app` 窗口合并进一个 msedge 进程、无法按
  命令行区分 URL；`HasWindow()` 只看标题 → 残留窗口会让旧实例永不退出。重启/重建后开
  新窗前必须 `CloseLegacyWindows()` 收掉全部同名窗口，否则死端口页面会持续欺骗用户。
- **服务可用性（第十三轮·2026-09-10）**：仿真服务端口**固定首选 17817**（页面 origin
  跨会话稳定）；判活必须用带 `PING_TAG` 的 `/api/ping`（裸 `ok` 会把第三方服务误认成自己）；
  `/api/ping` 应答格式 = `WAVEPAINT-SERVICE\n端口\nbuildStamp\n`，前端与 dev-server 必须一致。
- **换版本首启陷阱（2026-09-10）**：extract 分支（每次 exe 重建后首启必走）里 `ivlRoot`
  曾经只在 cache 分支赋值 → `Path.Combine(null,…)` 崩溃、服务根本没起来。凡是「只在
  cache 命中分支初始化」的变量都是定时炸弹；`EnsureIvlReady` 现已每轮仿真前兜底。
- **恢复 = 改 `simApiBase` / 同端口重拉，禁止自动跳转**：本应用没有自动保存，整页跳转会
  丢用户未保存画布；`relaunch()` 只能用隐藏 iframe（顶层跳转会被手势策略拦、协议未注册时
  还会顶掉页面）。
- **实例识别（#86 A1）**：RTL 树的实例一律走自写 `rtl-nav.scanInstances`（源码级平衡括号
  扫描，行号取自真实下标），engine 的 `parseInstances` 只作兜底 —— 它漏多实例同语句、
  会把字符串 `"mod u(x);"` 当例化。**不要**为了修这个去改 `engine.js`（仿真链路最易碎），
  见 06 P31。
- **实例行两种语义（#86 A2）**：左键 = 跳**模块定义**（`resolveModuleDef`，跨文件切 tab，
  同名优先同文件、大小写模糊会在状态栏说明）；右键 / Alt+左键 = 跳**例化点**。黑盒/外部 IP
  给中文提示并退回例化点。
- **源码集合存档（#86 A4）**：`sourceFiles`/`activeSourceIndex` 由 ui-bridge **包裹核心**
  `window.buildDocumentJson`/`loadFromFileContent` 注入与恢复（文本拼接、不二次 parse）；
  旧工程不带该字段 → 保持现状不清空用户源码。**这意味着「源码集合」是 `.wp` 的一等公民**，
  以后新增的代码侧上下文（如 B5 信号组）照同一包裹口径扩展。
- **观察行随工程存档（#76 B5）**：观察行是「**桥造出来的、核心不认识的东西**」→ 存档时**只由桥补找回
  元数据**（`.wp` 的 `simWatches` = `{path,name,width,reference}`），**波形数据留在核心 `signals` 里不重复存**；
  载入时必须**先清 `vcd`/`outputs`/`simWatches`（画布换人）再恢复**，并按「行名 == 观察路径」认领 +
  **补回核心一定会丢的 `width`/`kind`/`msb`/`lsb`**；`syncSimRows` **无 VCD 时以工程带回来的行为准、
  有 VCD 仍以 VCD 为准**；旧工程无该字段 → 观察行清空（向后兼容）。**信号组不用另存**（核心已逐字段存还原）。
  改这套前先读 06 P35 / 07 D18 / e2e-rtl I1~I6。
- **符号索引（#76 B1）**：`rtl-nav.buildSymbolIndex(buildRtlNav(files), {topName})` 是**纯计算
  函数**（无副作用、不碰画布）；`buildRtlNav` 每个模块现在多了 `endLine` 与 `symbols`
  （组序 = 体内声明 → 端口 → 头部参数 → 实例名）。符号扫描一律跑在
  `blankInnerScopes(maskStrings(blanked))` 上 —— **抹白必须等长**（否则行号失真），
  函数/任务体被整体抹白是**故意**的（局部变量不该进符号表）。三条有意边界（不索引 `assign`
  隐式 net / 自定义类型变量 / named begin 局部变量）由 `vcd-index.findVcdPathsByName` 兜底。
- **`findSymbols` 收窄契约（B1，给 B4 用）**：`{moduleName, fileIndex, line}` **能收窄才收窄，
  收窄后为空则忽略该条件** —— 行号不精确时不会返回空；有 e2e-rtl F8 断言守着，改前先看它。
- **B1 只是数据层**：`__wpsim.symbolIndex / symbolsOf / symbolVcdPaths / vcdPathsByName` 是
  **探针入口**，不是交互；**B4 才把它们接到代码区的点选/快捷键上**。不要因为 B1 完成就去改
  RTL 树（RTL 树仍是纯层级浏览，B2 已撤销）。

- **加信号只有一条主路径（#76 B4，已落地）**：**代码里双击变量 / 右键 / `Ctrl+Alt+W`** →
  `onAddSymbol` → `addSymbolFromCode` → `pickVcdSignalIntoWave`。不要再给 RTL 树或别处加
  第二条加信号入口；也不要新写一套符号解析（B1 的 `resolveSymbolVcdPaths` 就够）。
- **为什么不用 `Ctrl+W`**：Edge `--app` 窗口把 `Ctrl+W` 当关窗快捷键，页面根本收不到；所以
  用 `Ctrl+Alt+W` 并挂在 **keydown 捕获阶段**（`preventDefault` + `stopPropagation`）。任何给
  exe 内 Web 界面设计快捷键的场合，都要**先假设浏览器会吞**（见 06 P33）。
- **名称兜底必须「为空才用」**：`resolveSymbolVcdPaths` 有候选就**只用它**，只有候选为空才调
  `findVcdPathsByName`。两者语义不同（精确 vs 宽松），**并集会让 1 条候选变 3 条**（点 `q` 变
  `tb.q`/`tb.dut.q`/`tb.dut.u_sub.q`），这是 06 P33 记录的根本原因。
- **仿真后不再全量灌信号**：`syncSimRows()`（原 `replaceInjectedOutputs`）只同步
  `state.simWatches` 里**由真实 VCD 路径登记**的观察行，不再把 `outputs` 全量推入画布。这是
  用户明确要求的口径 —— 不要为了“方便”改回全量。
- **取词触发挂在宿主 DOM，不碰 CM bundle**：`symbolNameAt` 与三个触发面都在 `rtl-panel.js` /
  `ui-bridge.js` 内、监听挂在代码宿主元素上，因此**不需要重跑 esbuild**
  （`lib/codemirror.bundle.js` 与 `tools/cm6-entry.js` 本轮未改）。

- **代码 → 树反向联动（#76 B3，已落地）**：`ui-bridge.syncActiveFromCode()` 是**唯一入口** ——
  取词用 B4 的 `getContext()`、映射用 B1 的 `moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`，
  **不要另写解析**。语义：光标行 → 所属**模块行**常亮（nTrace 式「当前 scope」）；光标在
  **实例名**上 → 高亮**实例行**；其余符号 → VCD **唯一**候选才亮，**歧义宁可不亮**；
  完全没有目标 → 清空。**RTL 树仍只做层级浏览**（高亮不带出端口/信号行，见 06 P34 / 07 D17）。
- **联动状态必须能在树重建后重放**：`activeHighlight` 是模块级状态，`refreshStructureTrees()`
  末尾必须 `applyActiveHighlight()`（两棵树都是 `replaceChildren` 全量重建，**不重放就丢高亮**）；
  `gotoSource()` 末尾也要 `syncActiveFromCode()` 做「树 → 代码 → 树」闭环。改这两处接线前先看
  e2e-rtl H5/H6。
- **光标联动的事件源**：**只挂 `keyup`/`mouseup` 覆盖不到纯光标移动**，必须同时订阅
  `ownerDocument` 的 `selectionchange`；再配合位置签名去重 + 「焦点在编辑器内」判定，
  以及 `setText()` 重建后**强制补发**（见 06 P34）。
- **全部接口批量加波形（#87②，已落地）**：唯一入口 = `ui-bridge.addModulePortsFromCode(context)`，
  批量落库 = **`addVcdPathsToWave(paths)`**（**只 render 一次**、三桶 `added/existed/missing`、
  **不设状态栏**、末尾滚动定位）—— 「全部接口」**只指模块端口**（`kind === "port"`，`modulePorts`
  按名去重），体内 `wire/reg` 仍走 B4 单点加；**不要**为了「顺手」把 `wire/reg` 也批量灌。作用域一律
  按**例化路径**（顶层模块 → `tb.dut`）。多候选只复用**代码区旁轻量浮层** `openPicker` `mode="scope"`，
  **不得**另建“信号层次选择框”，也不放到 RTL 树上。改前读 07 D19 / 06 P36 / e2e-rtl J0~J7。
- **`Ctrl+数字` 一律别用作应用快捷键**：Chromium/Edge 把 `Ctrl+数字` 当**浏览器级「切换标签页」**
  加速键，页面收不到 keydown（与 `Ctrl+W` 同源）。所以 B4 用 `Ctrl+Alt+W`、#87② 用 `Ctrl+Alt+4`。
  以后给 exe 内 Web 界面配快捷键，**先假设浏览器会吞**（见 06 P33/P36）。
- **实例符号的 `moduleName` 会被索引覆盖**：`buildSymbolIndex` 里
  `entry.symbols.push({...symbol, moduleName: entry.name})` → 实例符号的 `moduleName` = **定义所在模块**，
  不是**被例化模块**。要拿被例化模块名，走 `index.instancePaths[...]` 的 `moduleName`（按实例名后缀查）。
  见 06 P36。
- **e2e 观察行清理陷阱**：`clearWatches()` 只 `m_signals.splice`、**不清 `state.simWatches`** →
  `render()`/`syncSimRows()` 会按登记把行**重建回来**。写观察行相关断言时，要么同时清登记，
  要么改用「桶分类」口径（e2e-rtl J7 即此）。
---

## 7. 维护规则

每次任务开始/结束时，更新：
1. 本文件第 1 节状态快照
2. 第 4 节进行中/待交接
3. 当日日志 `memory/logs/YYYY-MM-DD.md`
4. 若需求变化，同步 `03-REQUIREMENTS.md`
