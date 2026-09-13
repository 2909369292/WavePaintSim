# 08 · 路线图（Verdi 借鉴 + 远期方向）

> 本文件记录下一阶段主线与远期可选方向。完成一项后，同步更新 `03-REQUIREMENTS.md` 与 `04-PROGRESS.md`。
>
> **优先级口径（2026-09-09 第十一轮用户重排）**：
> ① 近期先做 **#86 → #76**（代码↔波形交互 + 底层解析能力）；
> ② **#87 优先级提高**（其中 ① 源码选中变量→加波形、② 模块全接口入波形紧跟主线）；
> ③ **侧栏 / 整体 UI 重构设计的优先级提高**；
> ④ **#84 波形查看增强、#77 Active Annotation 推迟打入远期**。
> 用户原话记录见 `memory/logs/2026-09-09.md` 第十一轮；台账状态见 `03-REQUIREMENTS.md` 表 F/H。
> **第十二轮澄清（2026-09-09 用户拍板，叠加生效）**：
> ⑤ **加信号主路径 = 代码内点/选中变量（仿 Verdi “中追”/nWave Ctrl+W）**，不是 RTL 树；
> ⑥ **RTL 结构树降级为纯代码层级浏览**（文件 → 模块 → 实例，跳源码），**删「端口/参数」分组、
> 不显示接口信号、不承载任何加信号交互**（原 #76 B2 撤销）。
> **第十三轮插队专项（2026-09-10，用户当轮唯一诉求）**：
> ⑦ **先做 #86 的独立子项「服务在线性根治」** —— 用户报「本地仿真失败/请求无响应，必须从
> 根本上解决；每次点击仿真必须调用仿真服务、必须仿真成功」。已落地：固定首选端口 `17817`
> + `/api/ping` 带 `PING_TAG` 身份标识 + `ivlRoot` 换版本首启崩溃修复 + 页面侧
> `js/core/service-guard.js` 自动重连/重新拉起服务并自动重试仿真。**此子项不改变主线顺序，
> #86 A1~A4 仍未开工**（详见 04 §4.11、07 D15、日志 2026-09-10）。
> **第十四轮实施（2026-09-10，用户「继续回到原来的任务，按规划进行」）**：
> ⑧ **#86 A1~A4 全部落地** —— ① 底层 `rtl-nav.js` 新增源码级实例扫描器 `scanInstances`
> （字符流 + 平衡括号，覆盖「多实例同语句 / 参数化例化 / generate 内例化」）与模块定义索引
> `collectModuleDefs` / `resolveModuleDef`（同名多处→同文件优先，大小写模糊标 `fuzzy`）；
> ② 交互：RTL 树实例行**左键跳模块定义 / 右键（或 Alt+左键）跳例化点**，黑盒/外部 IP 给
> 中文提示；③ 交互：侧栏新增「导入源码」按钮（`.v/.sv` 磁盘多选 → `state.files` → 自动
> 解析刷新树）；④ **源码集合随 `.wp` 工程存档/恢复**（包裹核心 `buildDocumentJson` /
> `loadFromFileContent`，旧工程向后兼容）—— A4 已由用户「按规划进行」拍板实施，不再是待定项。
> 验证全绿（regression 68/68、e2e-rtl 23/23、e2e-ui 73/73、e2e-sim 0 失败、真 exe 冒烟），
> exe 重建 `2026-09-10 20:36:16 327acf7`（详见 04 §4.12、06 P31、日志 2026-09-10 第十四轮）。
> **第十五轮实施（2026-09-10，用户「继续回到原来的任务，按规划进行」）**：
> ⑨ **#76 B1 数据层落地** —— `rtl-nav.js` 新增 `scanModuleSymbols`（模块体内声明/端口/参数/
> 实例名 → 行号 + 位宽 + 方向 + 值；先 `blankInnerScopes` 抹白 `function/task/specify/table`
> 体，函数局部变量不进表、抹白等长故行号不失真）、`buildInstancePaths`（例化点分作用域前缀，
> 自动判顶层 + 例化环保护）、`buildSymbolIndex`（统一索引 + `moduleAtLine`/`findSymbols`/
> `resolveSymbolVcdPaths`，`findSymbols` 收窄后为空则忽略该条件）；`buildRtlNav` 每模块新增
> `endLine`/`symbols`；`vcd-index.js` 新增 `findVcdPathsByName`（名称末段兜底候选）；
> `ui-bridge.js` 只加探针 `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`
> （纯计算无副作用，**界面无可见变化**）。验证全绿（regression **75/75**、e2e-rtl **32/32**
> 含 F1~F9 真实 VCD 宽度核对、e2e-ui 73/73、e2e-sim 0 失败、真 exe 冒烟），exe 重建
> `2026-09-10 21:06:52 db7a98f`；**未改 `sim/engine.js` 一行**（C9）。
> 详见 04 §4.13、06 P32、日志 2026-09-10 第十五轮。
> **第十六轮实施（2026-09-10，用户「按照规划继续进行」）**：
> ⑩ **#76 B4 交互落地** —— `rtl-panel.js` 新增导出纯函数 `symbolNameAt(text, from, to)`
> （标识符扫描 + `baseSymbolName` 剥 `q[3:0]` 位选 + `firstSymbolIn` 取 `a.b.c` 末段 +
> ~110 词关键字排除 + `exact` 判定），`installCodeEditor` 增第 5 参 `onAddSymbol` 与
> `getContext()`/`focus()`；触发面 = 双击变量 / 右键菜单 / **捕获阶段 `Ctrl+Alt+W`**
> （**不用 `Ctrl+W`**：Edge `--app` 会吞它当关窗，见 06 P33）；`ui-bridge.js` 新增
> `addSymbolFromCode`（`currentSymbolIndex` → `moduleAtLine` 收窄 → `resolveSymbolVcdPaths`，
> **仅当候选为空**才 `findVcdPathsByName` 兜底）→ 唯一候选直加 `pickVcdSignalIntoWave`、
> 多候选弹**代码区旁轻量选择器** `.sim-symbol-picker`（**不是**单独“信号层次选择框”）；
> 同时**收敛「运行仿真后全量自动灌信号」**（`replaceInjectedOutputs` 改名 `syncSimRows`，
> 不再灌 outputs）。验证全绿（regression **77/77**、e2e-rtl **39/39** 含 G1~G7、e2e-ui 73/73、
> e2e-sim 0 失败、真 exe 冒烟），exe 重建 `2026-09-10 21:33:05 ebce2b5`；**未改
> `sim/engine.js` 一行**（C9）。详见 04 §4.14、07 D16、06 P33、日志 2026-09-10 第十六轮。
> **第十七轮（2026-09-10）**：**#76 B3 落地 = 代码 → 树 反向联动**（仿 nTrace「光标即高亮」）——
> `rtl-panel.js` 新增导出纯函数 `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow`（**同类硬条件
> + 必须位置证据**）与 `highlightRtlRow`/`highlightVcdSignal`/`clearRtlHighlight`/`clearVcdHighlight`，
> `installCodeEditor` 增 `onCursorMove`（`selectionchange` + `mouseup`/`keyup` + 签名去重 +
> `setText()` 后强制补发）；`ui-bridge.js` 新增 `syncActiveFromCode`（`moduleAtLine` 模块行 /
> 实例名 → 实例行 / `resolveSymbolVcdPaths` **唯一才亮** VCD，歧义不猜、无目标清空）+ 180ms 防抖
> + `applyActiveHighlight` 重建后重放，`gotoSource()` 末尾闭环、`refreshStructureTrees()` 末尾重放；
> `index.html` 只加两条高亮 CSS（无新面板）。验证全绿（regression **79/79**、e2e-rtl **46/46**
> 含 H1/H2/H3/H4/H4b/H5/H6、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟），
> exe 重建 `2026-09-10 22:06:08`；**未改 `sim/engine.js` 一行**（C9）。详见 04 §4.15、07 D17、
> 06 P34、日志 2026-09-10 第十七轮。
> **第十八轮实施（2026-09-10，用户「按照规划继续」）**：
> ⑪ **#76 B5 落地** —— **观察行随 `.wp` 工程存档/恢复**。存档桥由「源码桥」泛化为
> `injectArchiveFields(json, fields)`（**文本拼接**口径不变，不动核心 parse），
> `buildDocumentJson` 注入 **`simWatches`**（`archiveSimWatches()` **只存找回元数据**
> `{path,name,width,reference}`；波形数据仍在核心 `signals` 里，不重复存）；载入
> `applyArchivedExtras(text)`：坏载荷（坏 JSON / 分享链接压缩串）**静默跳过** → **先清
> `vcd`/`outputs`/`simWatches`**（画布整体换人）→ `applySourceFilesFromArchive` →
> `applySimWatchesFromArchive` → **`adoptArchivedWatchRows`**（按「行名 == 观察路径」认领，
> 补回核心丢掉的 `width`/`kind`/`msb`/`lsb`，已是注入行则跳过 → 幂等）→ 面板就绪则
> `refreshVcdTree`/`syncSimRows`/`render` + 状态栏合并文案。`syncSimRows` 先建 `liveByPath`，
> **无 VCD 时回退工程带回来的那一行**（有 VCD 仍以 VCD 为准 → 保证重仿真刷新）；
> `resetSourceFiles()` 扩为「新工程全复位」（含 `vcd`/`outputs`/`simWatches`/`lastTestbench`，
> 与 C12 一致）；旧工程无该字段 → 观察行清空（**观察行以工程为准**，向后兼容）。
> **信号组无需另写桥**：核心 `buildDocumentJson`（L1449~1451）/`loadFromFileContent`
> （L1642~1644）已逐字段存还原 `groupName`/`groupColor`/`groupPath`，`GroupManager`
> （L1163~1404）是**纯函数派生、无独立状态** → 天然闭环。验证全绿（regression **79/79**、
> e2e-rtl **52/52** 含 I1~I6、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟），
> exe 重建 `2026-09-10 22:23:52`；**`wavepaint.clean.js` 与 `sim/engine.js` 一行未改**（C9）。
> 详见 04 §4.16、07 D18、06 P35、日志 2026-09-10 第十八轮。
> **第十九轮实施（2026-09-10，用户「按照规划继续」）**：
> ⑫ **#87② 落地 = 模块/实例全部接口一键入波形（仿 nWave `Ctrl+4`）** —— **两条硬口径**：
> ① 触发键 = **`Ctrl+Alt+4`**（**不是 `Ctrl+4`** —— Chromium/Edge 把 `Ctrl+数字` 当浏览器级
> 「切换标签页」加速键，页面收不到 keydown，与 `Ctrl+W` 同源，见 06 P33/P36）；
> ② **「全部接口」= 模块端口（`kind === "port"`）**（含模块头 ANSI 端口 + 体内 `input/output/inout`，
> 按名去重），体内 `wire/reg` 仍走 B4 单点加入、**不批量灌**；目标作用域 = **例化路径**
> （顶层模块自动映射到 `tb.dut`），与 VCD 全路径同口径。`rtl-panel.js`：`installCodeEditor` 增第 7 参
> `onAddScope`，触发块重构为 `request(via, event, handler)`（**未接线的手势静默放过、不吞事件**），
> 捕获阶段识别 `key==="4" || code==="Digit4" || code==="Numpad4"`。`ui-bridge.js`：浮层泛化
> `openPicker(title, items, anchor, mode)`（B4 = `mode="symbol"` 选项仍是 VCD 全路径、**口径不变**；
> #87② = `mode="scope"` 选项 = `scope.path`）+ `showScopePicker`；新增 `moduleScopes` / `modulePorts` /
> **`addVcdPathsToWave`**（**批量、只 render 一次**、末尾滚动定位、**不设状态栏**，返回
> `{ready,added[],existed[],missing[]}`）/ `modulePortsStatus`（唯一汇总文案入口）/
> `addModulePortsToWave` / `addModulePortsFromCode`；三处提示追加 `Ctrl+Alt+4`；`__wpsim` 增探针。
> **本轮真 bug 修复**：光标在实例名上时**不能**用 `findSymbols` 命中项的 `moduleName` 查作用域 ——
> `buildSymbolIndex` 把实例符号的 `moduleName` 覆盖成**定义所在模块**，被例化模块名在符号上已丢；
> 改为按「**实例名后缀**」查 `index.instancePaths`（那里的 `moduleName` 才是被例化模块，见 06 P36）。
> 验证全绿（regression **79/79**、e2e-rtl **61/61** 含 J0~J7、e2e-ui 73/73、e2e-sim 0 失败、
> probe-param 全过、真 exe 冒烟），exe 重建 `2026-09-10 22:49:32`；
> **`wavepaint.clean.js` 与 `sim/engine.js` 一行未改**（C9）。详见 04 §4.17、07 D19、06 P36、§1.3。
> **主线下一项 = 侧栏 / 整体 UI 重构设计方案（08 §2）** —— **#76（B1~B5）+ #87①②③ 已全部收口**；
> **先出方案给用户 review，不直接开工**；#84/#77 仍为远期（§3）。

---

## 1. 主线（近期，先做）：Verdi 代码↔波形交互 + 底层解析能力 —— #86 → #76 → #87①/②

> 用户第十一轮原话要点：「先完成 #86 #76。重点是**在底层支持更多 Verilog 代码的互动**以及
> **代码的解析能力**，**交互层需要仿照 Verdi 进行规划**。」
>
> 含义：本批不是“接两条 UI 跳转”就完事，而是把**解析/索引底座**（识别更多 Verilog 构造、
> 让代码里的符号可被“互动”）与**交互层**（nTrace / nWave / Get Signals 语义：点实例跳定义、
> 点符号加波形、树↔代码双向跳转）一起向前推。已完成底座：#75 P0（CM6 + RTL 树 + VCD 全路径）、
> #85（VCD 树点信号 → 画布观察行，`simWatches` 链路即所有“加波形”的复用底座）。

| 期 | 内容 | 状态 | 关键点 |
|---|---|---|---|
| #86 | 实例 → 模块定义源码跳转 + 源码文件导入 + 例化解析增强 | ✅ **A1~A4 全部完成 2026-09-10（第十四轮）**；服务在线性子项 ✅ 同日第十三轮 | 底层：模块定义索引（全量 module 表 `file+moduleLine` 已就绪）**已补**「源码级实例扫描器 + 模块定义候选索引」，覆盖参数化例化 `#(.p(v))`、命名/位置端口例化、generate 内例化、多实例同语句、多文件同名模块歧义（同文件优先）；交互（仿 nTrace）：实例行**左键跨文件跳定义行，右键/Alt 跳“例化点”**，黑盒给中文提示，磁盘多选导入 `.sv/.v` 进 `state.files`（= Verdi filelist 语义的本地等价）；**源码集合随 `.wp` 存档恢复**（A4）。**2026-09-10 第十三轮另做了独立子项「服务在线性根治」**（固定端口 17817 + 身份标识判活 + `ivlRoot` 首启崩溃修复 + 服务自愈，见 04 §4.11）。实现细节见 04 §4.12、06 P31 |
| #76 | 代码点变量 → 加波形 + 树↔代码双向跳转 + 信号组入 `.wp` | ✅ **B1~B5 全部完成（B2 已撤销）**：B1 ✅ 第十五轮 / B4 ✅ 第十六轮 / B3 ✅ 第十七轮 / **B5 ✅ 第十八轮**（#85 的 VCD 侧更早完成） | 底层：**模块体内符号索引**（reg/wire/net/端口/实例名 → 行号 → 映射到 VCD scope 全路径）**✅ B1 已落地**（`scanModuleSymbols`/`buildInstancePaths`/`buildSymbolIndex`/`findSymbols` + `vcd-index.findVcdPathsByName` 名称兜底；多实例歧义候选数据就绪 = `resolveSymbolVcdPaths` 返回多条 path）；交互（仿 Verdi Get Signals/nWave）：**代码内点/选中变量 → 加波形 = 唯一主路径**（**✅ B4 已落地**：双击 / 右键 / 捕获阶段 `Ctrl+Alt+W` → `symbolNameAt` 取词 → `resolveSymbolVcdPaths`，唯一候选直加、多候选弹代码区旁轻量选择器；并收敛「仿真后不再全量自动灌信号」）、**树 ↔ 代码双向跳转**（树→代码 ✅ #86 A2；**代码→树 ✅ B3 第十七轮落地**：光标即在模块行/实例行高亮 + VCD 唯一候选高亮、歧义不猜、重建后重放）、信号组/观察行随 `.wp` 存档恢复（**✅ B5 第十八轮落地**，沿用 A4 存档桥并泛化为 `injectArchiveFields`，观察行只存找回元数据 + 无 VCD 以工程为准）。实现细节见 04 §4.13/§4.14/§4.15/§4.16、06 P32/P33/P34/P35、07 D16/D17/D18 |
| #87①/②/③ | 源码选中变量 → 加波形（Ctrl+W）、模块全部接口一键入波形（Ctrl+4）、信号组入 `.wp` | ✅ **①②③ 全部落地 2026-09-10**（① = #76 B4 第十六轮；③ = #76 B5 第十八轮；**② = 第十九轮**） | 用户第十一轮将 #87 整体优先级提高。① 已并入 #76 B4 实现（代码内点/选中变量 → 加波形，`Ctrl+Alt+W`）；② **第十九轮落地**：`Ctrl+Alt+4` 批量加入**模块端口**（`kind === "port"`；见 §1.3 / 04 §4.17 / 07 D19）；③ 已并入 #76 B5（信号组由核心天然闭环，观察行随 `.wp` 往返）；④ Active Annotation 随 #77 **仍为远期**。均为交互语义对齐，**不做** nSchema 原理图 / FSDB / 重后端 |

### 1.1 #86 拆解（近期第一项，建议小步 commit）

> **状态：✅ A1~A4 全部完成（2026-09-10 第十四轮，exe 重建 20:36:16）。**
> 实现细节与验证表见 04 §4.12；踩坑记录见 06 P31。下面的条目保留为“当初的拆解口径”。

- **A1 ✅ 底层解析/索引增强**：`rtl-nav.js` 新增 `scanInstances(text, from, to, lineOf)`
  —— 字符流 + `matchParen` 平衡括号 + 多实例循环 + 必须 `;` 收尾，行号取自真实下标；
  新增 `maskStrings(source)`（字符串内容换**等长**空格）；新增 `mergeInstances`
  （扫描器优先、engine 兜底，兜底条目过两道闸：`isReservedName` 排除门原语 + 抹白文本里
  必须真存在 `<实例名> (`）；新增 `collectModuleDefs` / `findModuleDefCandidates` /
  `resolveModuleDef`。**核心动机：绕开 `sim/engine.js` 的 `matchSignalsToPorts` 最易碎区（C9），
  另写一套只读扫描器。**
- **A2 ✅ 交互：实例 → 定义跳转**：`rtl-panel.js makeJumpRow(...)` 增第 6 参 `secondaryJump`
  —— 左键 = 跳 `module` 定义，**右键 `contextmenu` / Alt+左键 = 跳例化点**；实例行 payload
  扩为 `{fileIndex,line,moduleName,instanceName,name,kind}`（`"instance"` 跳定义 /
  `"instanceSite"` 跳例化点）；`ui-bridge.js gotoSource(fileIndex, line)` 跨文件先
  `syncEditor()` → 切 `state.active` → `renderFileTabs()` → `jumpToEditorLine`；无定义给中文
  提示「未找到模块 X 的源码定义（可能是黑盒或外部 IP），已定位到例化点第 N 行。」
- **A3 ✅ 交互：磁盘导入源码文件**：`index.html` 侧栏 `.source-actions` 新增
  `<button id="sim-import">导入源码</button>`；`ui-bridge.js` 新增 `SOURCE_FILE_ACCEPT` /
  `readSourceFilesViaInput()` / `pickSourceFilesFromDisk()`（优先核心 `showOpenFilePicker`，
  隐藏 `<input type=file>` 兜底）/ `uniqueSourceFileName()`（同名去重）/ `importSourceFiles()`
  → 文本进 `state.files`（真实文件名）→ 自动解析 + 刷新 RTL 树。**不做全盘扫盘。**
- **A4 ✅ 源码集合随 `.wp` 工程存档/恢复**（用户「按规划进行」= 拍板实施）：
  `installProjectArchiveBridge()` 包裹核心 `window.buildDocumentJson` / `window.loadFromFileContent`
  （失败 `console.warn` 静默降级）；`injectArchiveSourceFiles()` **文本拼接**在末尾 `}` 前注入
  `sourceFiles`/`activeSourceIndex`（空文档 `{}` 不多逗号）；`flushEditorIntoSourceFiles()`
  **故意不用 `syncEditor()`**（避免清掉 design/outputs/TB）；`applyArchivedSourceFiles()`
  带 `sourceFiles` → 整体替换，旧工程 → 保持现状；`file-menu.js` `onNew()` 里
  `resetSourceFiles()`。**桥必须在核心初始化前安装**（分享链接 `#d=` 载入发生在初始化期）。

### 1.2 #76 拆解（近期第二项，建议小步 commit；第十二轮口径：代码点变量 = 唯一加信号主路径）

> **状态：✅ #76 全部完成 —— B1 ✅ + B4 ✅ + B3 ✅ + B5 ✅（2026-09-10 第十五~十八轮，regression
> 79/79、e2e-rtl 52/52 全绿，exe 重建 22:23:52）；**#87② 也已于第十九轮落地（见 §1.3）**；
> **#76 + #87①②③ 全部收口，主线下一项 = 侧栏 / 整体 UI 重构设计方案（§2）**。**
> 可复用底座：#86 A1 的 `rtl-nav.js` `scanInstances` / `collectModuleDefs` / `resolveModuleDef` /
> `maskStrings`（抹白字符串与注释，供符号扫描安全复用）；A4 的 `.wp` 存档桥
> （`installProjectArchiveBridge` / **`injectArchiveFields`** —— 原 `injectArchiveSourceFiles`
> 已在 B5 泛化，并用它把 `simWatches` 一并写进 `.wp`）。

- **B1 ✅ 底层：模块体内符号索引 + scope 映射（2026-09-10 第十五轮完成）**：
  `rtl-nav.js` 新增 `scanModuleSymbols`（体内声明 → `{name,kind,direction,width,msb,lsb,
  range,value,line}`，先 `blankInnerScopes` 抹白 function/task/specify/table 体）+
  `buildInstancePaths`（例化点分作用域前缀 `tb.dut.u_a`，自动判顶层、带环保护）+
  `buildSymbolIndex`（统一索引；`moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`，
  收窄后为空则忽略该条件、大小写不一致标 `fuzzy`）；`buildRtlNav` 每模块加 `endLine`/`symbols`；
  `vcd-index.js` 新增 `findVcdPathsByName`（名称末段兜底：隐式 net / TB 本地信号 / 自定义类型
  变量）；`ui-bridge.js` 暴露 `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`
  （纯计算探针，**不动 UI**）。验证：regression **75/75**、e2e-rtl **32/32**（F1~F9 真实 VCD
  核对，含符号位宽 == VCD 位宽）。细节 04 §4.13、坑 06 P32。
- **B2（撤销，第十二轮）**：原「RTL 树点行加波形」取消 —— 用户明确 RTL 树只做代码层级浏览，
  不显示接口/信号、不承担加信号交互。不再实施。**RTL 树瘦身（删端口/参数分组与端口计数）的
  首批实施已完成 2026-09-09**（rtl-panel.js UI 只删不增，数据层不变；e2e-rtl 16/16 +
  exe 重建 22:19:04，见 04 §4.10）。
- **B3 ✅ 交互：代码 ↔ 树双向跳转（2026-09-10 第十七轮完成）**：已有“树 → 代码”（#86 A2 双语义）；
  本轮补“**代码符号/行 → 反向高亮/定位 RTL 树与 VCD 树节点**”（仿 nTrace「光标即高亮」）。
  取词完全复用 B4 的 `getContext()`/`symbolNameAt`，映射完全复用 B1 的 `moduleAtLine`/
  `findSymbols`/`resolveSymbolVcdPaths` —— **没有另写解析**。实现：`rtl-panel.js` 新增导出
  `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow`（**同类硬条件 + 必须位置证据 + 同分取
  先出现者**）与 `highlightRtlRow`/`highlightVcdSignal`/`clearRtlHighlight`/`clearVcdHighlight`
  （清旧 → 加 `.rtl-active`/`.vcd-active` → **展开祖先 `<details>`** → `scrollIntoView`），
  `installCodeEditor` 增第 6 参 `onCursorMove`（`selectionchange`(ownerDocument) + 宿主
  `mouseup`/`keyup`，位置签名去重、仅焦点在内时发、`setText()` 后强制补发），RTL 树行补
  `data-rtl-*`、VCD 信号行补 `data-vcd-path`；`ui-bridge.js` 新增 `syncActiveFromCode`
  （模块行 / 实例行 / **VCD 唯一候选才亮**、无目标清空）+ `scheduleActiveSync`（180ms 防抖）
  + `applyActiveHighlight`/`clearActiveHighlight`（**重建后重放**），`gotoSource()` 末尾闭环、
  `refreshStructureTrees()` 末尾重放；`index.html` 只加两条高亮 CSS（无新面板、无布局变化）。
  验证：regression **79/79**（+2 纯函数 test）、e2e-rtl **46/46**（H1/H2/H3/H4/H4b/H5/H6）、
  e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建 `22:06:08`。
  细节 04 §4.15、决策 07 D17、坑 06 P34。
- **B4 ✅ 交互：代码内点变量名 → 加波形（2026-09-10 第十六轮完成）**（= #87① / “中追”式）：
  三条入口进同一个 `onAddSymbol` —— **双击变量（要求 `exact`）/ 右键菜单 / 捕获阶段
  `Ctrl+Alt+W`**（**不用 `Ctrl+W`**：Edge `--app` 会吞它当关窗，见 06 P33）；取词走纯函数
  `symbolNameAt(text, from, to)`（剥 `q[3:0]` 位选、`a.b.c` 取末段、~110 个关键字排除，并给出
  `exact` 判定）；映射用 B1 的 `resolveSymbolVcdPaths`（`moduleAtLine` 收窄），**候选为空才**
  `findVcdPathsByName` 兜底（精确与兜底**不能取并集**，见 06 P33）；唯一候选直接
  `pickVcdSignalIntoWave`（#85 链路），多候选弹**代码区旁的轻量浮层** `.sim-symbol-picker`
  （单例、点外部/Esc 关闭，**不是**单独“信号层次选择框”，也不放在 RTL 树上）。
  同时落地「**运行仿真后不再全量自动灌信号**」：`replaceInjectedOutputs` → `syncSimRows`
  （只同步真实 VCD 路径登记的观察行，不再把 `outputs` 全量推入画布）。
  验证：regression **77/77**、e2e-rtl **39/39**（G1~G7）、e2e-ui 73/73、e2e-sim 0 失败、
  真 exe 冒烟通过；exe 重建 `21:33:05`。细节 04 §4.14、决策 07 D16、坑 06 P33。
- **B5 ✅ 交互：信号组 / 观察行随 `.wp` 工程存档与恢复（2026-09-10 第十八轮完成）**：存档桥由
  「源码桥」泛化为 **`injectArchiveFields(json, fields)`**（「文本拼接 + 不动核心 parse」口径不变；
  旧函数名 `injectArchiveSourceFiles` / `applyArchivedSourceFiles` **已不存在**），
  `buildDocumentJson` 注入 **`simWatches`**（`archiveSimWatches()` 只存 `{path,name,width,reference}`
  **找回元数据**，波形数据仍在核心 `signals` 里不重复存）；载入 **`applyArchivedExtras(text)`**：
  坏载荷静默跳过 → **先清 `vcd`/`outputs`/`simWatches`**（画布换人）→ `applySourceFilesFromArchive`
  → `applySimWatchesFromArchive`（不带该字段 → 0，保持已清空）→ **`adoptArchivedWatchRows`**
  （「行名 == 观察路径」认领 + 补回核心丢掉的 `width`/`kind`/`msb`/`lsb`，幂等）→ 面板就绪则
  `refreshVcdTree`/`syncSimRows`/`render` + 状态栏合并文案；`syncSimRows` **无 VCD 时回退工程带
  回来的行**（有 VCD 仍以 VCD 为准）；`resetSourceFiles` 扩为「新工程全复位」；旧工程无该字段 →
  观察行清空（向后兼容）。**信号组不用另写桥**：核心 `buildDocumentJson`（L1449~1451）/
  `loadFromFileContent`（L1642~1644）已逐字段存还原 `groupName`/`groupColor`/`groupPath`，
  `GroupManager`（L1163~1404）纯函数派生。验证：regression **79/79**、e2e-rtl **52/52**
  （I1~I6：存档含 `simWatches`、载入回注入语义 + 位宽补回、观察行不进激励、新建全复位、
  反复往返 + 旧工程兼容、坏 JSON 不抛）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、
  真 exe 冒烟通过；exe 重建 `22:23:52`。细节 04 §4.16、决策 07 D18、坑 06 P35。
  **未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9）。

### 1.3 #87② 拆解与实现（第十九轮已完成 2026-09-10；仿 nWave `Ctrl+4`）

> **状态：✅ 已完成（2026-09-10 第十九轮）**。regression 79/79、e2e-rtl **61/61**（新增 J0~J7 共
> 9 条）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建 22:49:32。
> 实现细节与验证表见 04 §4.17；决策 07 D19；坑 06 P36；日志 2026-09-10 第十九轮。
> **`wavepaint.clean.js` 与 `sim/engine.js` 一行未改**（C9）。下面的口径保留为“实现契约”。

**用户诉求**：复刻 Verdi nWave 的「模块全部接口一键入波形」（`Ctrl+4` Get Signals 语义）—— 在**代码区**
把某个**模块或实例**的**全部接口**一次加进画布，**不从 RTL 树操作**、**不给 RTL 树加端口行**。

**两条硬口径（本轮实测确定，勿违背）**
1. **触发键 = `Ctrl+Alt+4`**（**不是 `Ctrl+4`**）：Chromium/Edge 把 **`Ctrl+数字`** 当**浏览器级
   「切换标签页」加速键**，页面根本收不到 keydown（与 `Ctrl+W` 同源，06 P33/P36）。实现认
   `key==="4" || code==="Digit4" || code==="Numpad4"` + `(ctrlKey||metaKey) && altKey`，挂 keydown
   **捕获阶段**（`preventDefault()+stopPropagation()`）。e2e-rtl J6 守着「只按 `Ctrl+4`（无 Alt）不触发」。
2. **「全部接口」= 模块端口（`kind === "port"`）**：含模块头 ANSI 端口 + 体内 `input/output/inout`
   声明；`modulePorts` **按名去重**。体内 `wire/reg` **不批量灌**（仍走 B4 单点加入）。
   作用域 = **例化路径**（顶层模块自动映射到 `tb.dut`），与 VCD 全路径同口径。

**落地拆解**
- **R1 取词（复用 B4，不新写解析）**：`installCodeEditor` 增第 7 参 `onAddScope`；触发块重构为统一的
  `request(via, event, handler)`（handler 缺省回落 B4 单符号入口；**未接线的手势静默 return、不吞事件**）；
  `Ctrl+Alt+4` → `onAddScope(context)`（context 即 B4 的 `getContext()`：`{name,line,selection,exact,source}`）。
- **R2 映射**：`ui-bridge.moduleScopes(index, moduleName)` 返回该模块的全部**例化路径**；
  `modulePorts(index, moduleName)` 返回该模块的**端口**列表。光标在**模块体内** → 模块名取 scope；
  光标在**实例名**上 → 按「**实例名后缀**」查 `index.instancePaths` 拿**被例化模块**名与实例路径
  （**不要**用 `findSymbols` 命中项的 `moduleName` —— 它被索引覆盖成「定义所在模块」，见 06 P36）。
  多候选作用域 → `showScopePicker`（`mode="scope"`）让用户选，**不猜**。
- **R3 批量落库**：`addVcdPathsToWave(paths)` —— **批量、只 `render()` 一次**、末尾
  `scrollWaveToWatchPath` 定位、**不设状态栏**，返回 `{ready, added[], existed[], missing[]}` 三桶；
  `modulePortsStatus(scopePath, portCount, result)` 是**唯一汇总文案入口**（不逐行刷状态栏）。
- **R4 浮层泛化（不新建“选择框”）**：`showSymbolPicker` 拆出通用 `openPicker(titleText, items,
  anchor, mode)`（`items=[{label,title,onPick}]`、`box.dataset.pickerMode=mode`），薄封装
  `showSymbolPicker`（`mode="symbol"`，**B4 选项文本仍是 VCD 全路径、探针口径不变**）与
  `showScopePicker`（`mode="scope"`，选项 = `scope.path`）。**仍只挂在代码区旁**，严禁另建
  “信号层次选择框”，也不放在 RTL 树上。
- **R5 探针与 e2e**：`__wpsim` 增 `addModulePortsFromCode` / `moduleScopesOf` / `modulePortsOf` /
  `addVcdPathsToWave` / `get pickerMode`；`tools/e2e-rtl.mjs` 新增 **J0~J7**（9 条）。

**验收（e2e-rtl J 段）**：一次加 4 端口 `tb.dut.clk|rst_n|en|q`（`moduleRowsDelta===4`、
`pickerMode===null`）/ 重复触发幂等 / `sub.v` 同名两例化 → `pickerMode==='scope'`、候选
`['tb.dut.u_a','tb.dut.u_b']`、点 `tb.dut.u_b` 加 `tb.dut.u_b.clk` / 光标在实例名 `u_a` → 唯一作用域直加
（**真 bug 修复点**）/ `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / **只按 `Ctrl+4` 不触发** /
探针 `modulePortsOf('counter')`=4、`modulePortsOf('sub')`=1、`moduleScopesOf('sub')`=2、RTL 树仍无端口行 /
`addVcdPathsToWave` 三桶分类。

**不做**：nSchema 原理图 / FSDB / 重后端；**不改** `sim/engine.js`；**不给 RTL 树加端口行**；
**不建**“信号层次选择框”；**不恢复**“仿真后全量灌信号”。

---

## 2. 规划线（优先级提高）：侧栏 / 整体 UI 重构（仿 Verdi 布局）

> 用户第十一轮明确“侧栏 UI 重构设计的优先级提高”。现状：侧栏已超规划（按钮 + 代码 +
> RTL 树 + VCD 树 + 仿真控制 + 状态区挤在一起），且主线交互（Get Signals 语义、源码行内
> 交互、双向跳转）落地后侧栏还会继续变——**UI 重构应与功能主线并行推进设计**，不宜拖到
> 最后。

> **2026-09-10 第二十轮：本节已扩写为完整《侧栏 / 整体 UI 重构设计方案》（§2.1~§2.9）。
> 本轮只出方案、未动任何受版本控制代码**（仅记忆同步，因此本轮不重建 exe —— C1 未触发）。
> ~~**方案状态 = 待用户 review；用户拍板后再按 §2.6 分期实施。**~~ ⚠ **已被下一段取代**（2026-09-11 第二十一轮已拍板并当轮落地）。
>
> **2026-09-11 第二十一轮：用户拍板**（① 面板形态 = **可拖拽多面板**；② 侧栏**保持右侧**、
> `#main-area` 骨架不动；③ 层次树**暂不左置**；实施步骤由 AI 自定）**→ 已当轮落地**（4 卡改
> 可折叠 `.sim-card` + 卡片间 3 条纵向 `.sim-split` + 侧栏左缘 `#sim-resize-x` 改宽度 +
> session 级持久化；**所有既有 id/class 一个未改**）。**§2.2 的「三条取舍」已改记为已定结论，
> §2.6 分期已按实际重写。** 细节见 04 §4.19、07 D20/D21、日志 2026-09-11。

### 2.1 现状问题清单（2026-09-10 第二十轮实测，证据可复算）

> 复算入口：`.e2e-tmp/ui-audit.mjs`（临时审计脚本，已被 `.gitignore` 覆盖；跑法
> `node .e2e-tmp/ui-audit.mjs .`）—— 扫 `index.html` 全部静态 `id=`，扫 `js/**/*.js` 的
> `getElementById(...)`/`querySelector(All)`/`el("…")`，输出「js 引用但 DOM 无此 id」清单 +
> 仿真栏 24 个 id 的 `(el)` 归属，作为**契约面证据源**。以下数字均为实测，不是估算。

**P1 · 空间：328px 单栏里塞 4 张卡片 + 状态区，纵向被四方争抢**

| 竞争者 | 现状尺寸（样式多在 `index.html` 内联 `<style>`） | 行号 |
|---|---|---|
| 侧栏总宽 | `#sim-panel{width:328px; top:92px}`；`body.sim-open #main-area{padding-right:328px}` | L131~144 / L129~131 |
| Verilog 源码区 | `#verilog-source{height:180px}`（CM6 挂载后同高） | L198 / L185 |
| RTL 结构树 | `.rtl-tree, .vcd-tree{max-height:240px; overflow:auto}` | L368 |
| VCD 信号层次 | 与 RTL 树**共用同一条 CSS 规则**（同 240px） | L368 |
| Testbench | `#tb-source{height:160px}`（`resize:vertical`，可被用户拖大） | L213 |
| 按钮区 | `.source-actions{grid-template-columns:repeat(2,minmax(0,1fr))}`，共 **7 个按钮**，`#sim-run` 占整行 | L171 / L174 |

→ 固定需求合计 ≈ 180 + 240 + 240 + 160 + 按钮/预览区 ≈ **900px+**；1080p 屏侧栏可用高度约 900px
（顶栏 92px 起算）。**任何一项展开都在挤压其它项**，且四块各自 `overflow:auto` —— 用户要在
**四条独立滚动条**之间来回找内容，没有任何一屏能看到全局。

**P2 · 数量：侧栏「功能已超越原规划」**

- 侧栏 DOM = `index.html` **L733~L803**，骨架固定：
  `#main-area`(L733) → `#wave-view`/`#wave-canvas` → `#sim-toggle-btn`(L740) → `#sim-panel`(L741)
  → `.sim-panel-header`(L742，内含 `#app-version`) + `.sim-panel-body`(L747)。
- `.sim-panel-body` 内 4 张卡片（统一卡片样式规则 `.sim-panel-body > div:not(.sim-status):not(.sim-btns)`，L159）：
  ① Verilog/SV 源码 ② RTL 结构树 ③ VCD 信号层次 ④ Testbench；卡片外还有 `#sim-status`、`#sim-recover`。
- 这 4 块其实对应 **四种不同「工作模式」**（写代码 / 看代码层级 / 看波形数据 / 看 TB 文本），
  却被压成一条**同质竖排流**，没有任何主次或分区。

**P3 · 语义：按钮与口径的遗留**

| 项 | 实测事实 | 处置建议（方案，本轮不实施） |
|---|---|---|
| `#sim-addsignals`「自动加信号」 | `index.html:757` → `ui-bridge.js:430`(refs) + `:1929`(click → `addPortSignalsToCanvas`，定义 `:1459`)。**只往画布灌激励端口**（跳过 `direction==="output"`，时钟/复位经 `createPortStimulus` 预填），**不碰 VCD/观察行**，与 #76 B4「仿真后不全量灌信号」口径**不冲突**；但 `title` 文案「自动识别 RTL 端口信号并添加到绘图区」是历史遗留，与「代码内点变量 = 加信号主路径」**极易混淆** | 降级/改名（如「按端口建激励」）或收进溢出菜单；**不被任何 e2e 依赖**（`tools/e2e-sim.mjs:81/90` 只是**注释**提到 `addPortSignalsToCanvas` 口径，实际测试自调 `bridge.toNativeSignal`）→ 改动风险低 |
| `#sim-collapse` | `ui-bridge.js` 用 `el("sim-collapse")` 抓，但 **DOM 里已无此元素**（`refs.collapseBtn = null`，代码容错；收起只靠点表头）→ **纯死引用** | 删除该 ref 与相关 null 分支 |
| 菜单项 `data-action="toggle-vcd-panel"` | `index.html:548`，指向 legacy `.vcd-hierarchy-panel` —— 该面板已被 `index.html` L313~314 的 `#main-area.with-vcd-panel{…!important}` + `.vcd-hierarchy-panel{display:none!important}` **永久压制** | 菜单项移除，或改指向现役 `#vcd-tree`（**需用户拍板**） |
| legacy VCD 面板整族 **10 个 id** | `#vcd-hierarchy-panel`/`#vcd-hierarchy-tree`/`#vcd-signal-list`/`#vcd-signal-count`/`#vcd-status`/`#vcd-search-input`/`#vcd-close-btn`/`#vcd-transfer-btn`/`#vcd-transfer-all-btn`/`#vcd-splitter-handle` —— 全部属「js 引用但 DOM 无此 id」（引用方在 `wavepaint.clean.js`） | 只登记；**删核心死代码不在本规划线范围**（属 #93 类工作，需单独拍板） |
| `#sponsors-panel`/`#sponsors-panel-toggle`、`#wavedrom-preview-refresh` | 同类死引用；`.sponsors-panel{display:none!important}`（L322）压制 | 同上，只登记 |

> 实测总量：`index.html` 静态 id 共 **82** 个；「js 引用但 DOM 无 id」共 **31** 个 —— 其中绝大多数
> 是**动态创建**（`#properties-panel` 系、`#wp-toast`/`#wp-beta-overlay`/`#wpf-select-overlay` 等），
> 属正常；上表列出的是**真正的遗留 / 死引用**。

**P4 · 结构：两棵树平级、职责未分级**

- RTL 树 `#rtl-tree`（`.rtl-tree`）与 VCD 树 `#vcd-tree`（`.vcd-tree`）**在同一竖排层级并列**，
  且共用同一组 CSS（`.rtl-tree summary, .vcd-tree summary` L376/L398 等）—— 说明二者被当成
  **同质组件**。但职责完全不同：
  - RTL 树 = **代码层级**（文件 → 模块 → 实例；第十二轮已瘦身为纯导航，无端口/参数/加信号）；
  - VCD 树 = **数据层级**（仿真后 `$scope` 全路径；点击 = 加入波形，即 #85）。
- 仿 Verdi 语义，二者应分属 **nTrace（层级树区）** 与 **nWave（波形区）**，而不是并列在同一条流里。

**P5 · 实现：CSS 双轨（技术债）**

- `css/wavepaint.e7b903ef.css` 仅 **8 行**（压缩成 1 行超长文本），只含 `#menu-bar`/`.tool-btn`/
  `.sponsors-panel`/`.vcd-hierarchy-panel` 等少量规则；
- **仿真栏全部样式在 `index.html` 内联 `<style>` 里**（L26~L471，`</style>` 在 L471，`</head>` L489）。
- → 改侧栏样式必须动 `index.html`（904 行大文件），且两轨之间的优先级/覆盖关系未文档化。

### 2.2 目标布局草案（仿 Verdi nTrace / 编辑器 / nWave 三区 + 一条控制带）

> 四条**不可违反**的红线：**不新增「信号层次选择框」**（用户明确否决）、
> **不给 RTL 树加端口/信号行**、**不恢复「仿真后全量灌信号」**、
> **加信号主路径 = 代码区内点/选中变量（B4）**。

**目标分区（三区 + 一条仿真控制带）**

1. **层级树区（仿 nTrace）**：只放 **RTL 结构树**（文件 → 模块 → 实例）。点实例行 = 跳源码
   （现 #86 A2 行为）；**不显示接口信号、不承载加信号交互**。
2. **代码区（编辑器本体 + 行内交互）**：CM6 + **加信号主路径**（B4 双击/右键/`Ctrl+Alt+W`；
   B4② `Ctrl+Alt+4` 加整模块端口）；预留 **Active Annotation 位**（#87④ / #77 **远期**，仅预留不改）；
   作用域/符号选择浮层（`.sim-symbol-picker`、`mode="symbol"`/`"scope"`）仍**挂在代码区旁**。
3. **波形区（仿 nWave）**：`#wave-view`/`#wave-canvas` 画布 + **VCD 信号层次树**
   —— 把 VCD 树从「侧栏第 3 张卡片」**移入波形区**（它服务的是波形数据，不是代码）。
4. **仿真控制带**：`#source-files` + 7 按钮 + `#sim-top-row` + `#sim-status` + `#sim-recover` +
   TB（折叠收纳）整理成**一条控制带**，代替现在的竖排 4 卡片。

**关键取舍 —— ✅ 已拍板（2026-09-11 第二十一轮，用户裁决）**

> 用户原话：「面板形态采用可拖拽多面板，暂不将层次树左置，至于具体的实践步骤和实践方式，
> 自行规划」。→ 原「待拍板」表改记为**已定结论**；实施步骤由 AI 自定（本轮已一次落地）。

| 取舍 | ✅ 已采纳结论 | 备注 |
|---|---|---|
| 面板形态 | **可拖拽多面板**（`#sim-panel` 内卡片纵向 splitter + 侧栏左缘可拖宽） | 原「选项 B」；**当轮一次落地**，不是原 P2 远期 |
| 位置 | **侧栏保持右侧**（`#main-area` 骨架不动） | 原「选项 A」；左置方案保留但不排期 |
| 层次树左置 | **暂不左置**（`#rtl-tree` 仍留在侧栏卡片内） | 用户明确「暂不」；等后续再拍板 |
| 迁移方式 | **一次性完成**（等价于原 P0+P1+P2 核心合并） | 契约面全数保住 + 全量测试通过 → 一次性落地风险可控 |

**实施结果（第二十一轮已交付）**：4 张卡片（源码 / RTL 树 / VCD 树 / TB）改为可折叠
`<section class="sim-card">`；卡片间 3 条纵向 `.sim-split` 拖拽条；侧栏左缘 `#sim-resize-x`
改宽度（clamp 280 ~ min(760, 视口*60%)）；布局状态**只存 `sessionStorage`**
（`wavepaint.sim-panel-layout.v1`，**绝不进 `.wp`**）；**所有既有 id/class 一个未改**。
细节见 04 §4.19。

### 2.3 面板 / 按钮归位表（现状 → 目标）

| 现状元素 | 目标归属 | 动作 |
|---|---|---|
| `#source-files` + 7 按钮（`#sim-addfile`/`#sim-import`/`#sim-removefile`/`#sim-parse`/`#sim-addsignals`/`#sim-tb`/`#sim-run`） | 仿真控制带 | 分主次：`#sim-run` 主按钮；其余进「文件/解析」分组；`#sim-addsignals` 降级或改名 |
| `#verilog-source` / `#verilog-cm-host` | 代码区 | **保 id**；高度由固定 180px 改为区域内自适应 |
| `#port-preview` / `#module-preview` | 代码区底部 helper | 折叠收纳（解析后看，非持续所需） |
| `#sim-top-row` / `#sim-top-select` | 仿真控制带 | 保持「默认 `display:none`、解析后出现」的现有逻辑 |
| `#rtl-tree` | **层级树区** | 独立分区；保留 `.rtl-inst`/`.rtl-active`/`[data-rtl-kind]` |
| `#vcd-tree` | **波形区** | 移入波形区；保留 `.vcd-signal-row`/`.vcd-active`/`[data-vcd-path]` 与行 `title` 全路径 |
| `#tb-source` + `#sim-tb-copy` | TB 折叠区 | 默认折叠，生成后自动展开 |
| `#sim-status` / `#sim-recover` | 控制带末端状态位 | 保持（`#sim-recover` 仍默认 `display:none`；**服务自愈逻辑不改**） |
| `#sim-toggle-btn` / `body.sim-open` / `#sim-panel.collapsed` | 开关骨架 | **保持类名与语义**（契约面，见 §2.5） |

### 2.4 与主线（已落地功能）的衔接点

1. **B4 加信号主路径**（第十六轮）：代码区双击/右键/`Ctrl+Alt+W` → `addSymbolFromCode` → 唯一候选直加 /
   多候选弹 `.sim-symbol-picker`。UI 重构**只能改代码区的容器与尺寸，不能改触发链**。
2. **B4② 整模块端口**（第十九轮）：`Ctrl+Alt+4` → `addModulePortsFromCode` → `mode="scope"` 浮层；
   锚点仍须在**代码区旁**。
3. **B3 双向高亮**（第十七轮）：`.rtl-active`/`.vcd-active` 靠 `applyActiveHighlight` 在**树重建后重放**；
   重构若改变树的重建时机，**必须保证重放**（否则高亮丢失）。
4. **B5 存档**（第十八轮）：观察行/源码集合随 `.wp` 恢复，与布局无关；**若要把每面板折叠态/宽度
   也持久化，建议只做 session 级，不改 `.wp` 格式**（避免动存档契约）。
5. **#85 VCD 点信号入波形**：VCD 树移动位置后，点击行为与 `title` 全路径展示保持不变。
6. **服务在线性（第十三轮）**：`#sim-recover` 的三段自愈与 `WPServiceGuard` **不属于 UI 重构范围**，
   重构不得改动其判定/文案链路（C19）。

### 2.5 交付边界 / 契约面（**冻结清单：重构中不得改名、不得移除**）

> 实测来源：`tools/e2e-rtl.mjs`（**28 处 CSS 选择器依赖**）、`tools/e2e-ui.mjs`
> （`.tool-btn[data-tool="…"]` 4 处）、`tools/regression.mjs`、`tools/e2e-sim.mjs`。

**id（24 个，仿真栏）**：`sim-toggle-btn`、`sim-panel`、`sim-panel-header`、`source-files`、
`sim-addfile`、`sim-import`、`sim-removefile`、`sim-parse`、`sim-addsignals`、`sim-tb`、`sim-run`、
`verilog-source`、`verilog-cm-host`、`port-preview`、`module-preview`、`sim-top-row`、`sim-top-select`、
`rtl-tree`、`vcd-tree`、`sim-tb-copy`、`tb-source`、`sim-status`、`sim-recover`、`app-version`
（**全部**由 `ui-bridge.js` 以 `el(...)`（L405 定义 / L409 `initRefs()`）或 `getElementById` 抓取）。

**class / dataset**：`.rtl-inst`、`.rtl-active`、`.vcd-signal-row`、`.vcd-active`、`[data-rtl-kind]`、
`[data-vcd-path]`、`.tool-btn` 与 `.tool-btn[data-tool="…"]`、`.sim-symbol-picker-item`。

**属性**：VCD 信号行的 `title` 仍是 `tb.dut.q` 这类**全路径**（e2e 按 `title` 找行）。

**状态类**：`body.sim-open`（展开态，`#main-area` padding 随之变）、`#sim-panel.collapsed`、
`wavedrom-debug-open`（`index.html:812` + clean.js 分发）、`sponsors-ready`/`sponsors-collapsed`
（已压制，**勿复用这两个名字承载新语义**）。

> ⚠ **待确认项**：主题（`data-action="theme"`，`index.html:538`）的实际落点本轮未追到具体
> class/属性名 —— 动主题相关样式前必须先定位（登记为方案待办，不是遗漏）。

**P0 之内允许改的**：`index.html` 内联 `<style>` 的**新规则追加**、现有规则中**不影响上述选择器
语义的**尺寸/间距/布局属性、新增包裹容器（但**不改被包裹元素的 id**）。

### 2.6 分期计划（P0 → P1 → P2）—— 2026-09-11 第二十一轮据用户拍板重写

> 用户拍板后，原「P0 纯 CSS → P1 DOM 重排 → P2 拖拽」的分期**已合并执行**：第二十一轮一次性
> 落地了原 **P2 核心（可拖拽多面板 + session 级面板状态）**，并把原 P0 的折叠 / 自适应高度 /
> 死引用清理（`el("sim-collapse")`）与 `#sim-addsignals` 文案一并做掉。**契约面全数保住 +
> 全量测试通过**，因此分期表按「已完成 / 剩余」重写。

**✅ 已完成（第二十一轮 2026-09-11，含原 P0+P1+P2 核心）**

| 已交付 | 内容 | 验收 |
|---|---|---|
| 卡片化 + 折叠 | 4 卡改 `.sim-card` + `.sim-card-head`（键盘可达），标题行内控件点击不误折叠 | e2e-ui I0~I3 |
| 可拖拽高度 | 3 条纵向 `.sim-split`（拖拽 + `ArrowUp/Down` ±16px），像素权重记账 | e2e-ui I1/I4 |
| 侧栏宽度可调 | `#sim-resize-x` 拖宽（`ArrowLeft/Right`），clamp 280 ~ min(760, 视口*60%)，拖拽时 rAF 节流重排画布 | e2e-ui I5a~I5c |
| 面板状态持久化 | **仅 `sessionStorage`**（`wavepaint.sim-panel-layout.v1`），220ms 防抖，**绝不进 `.wp`** | e2e-ui I6/I7 |
| 矮窗口自愈 | `measureMinHeight`/`applyMinHeights` + `overflow-y:auto` + 状态条吸底（修 `#sim-run` 被裁） | e2e-ui I8 + `verify-recovery2` D1/D1b |
| 死引用清理 | 删 `el("sim-collapse")` 死引用 + `#sim-addsignals` `title` 降级 | 全量回归 |

**⏳ 剩余（可选 / 暂缓，等用户再拍板）**

| 项 | 内容 | 说明 |
|---|---|---|
| VCD 树移入波形区 | 把 VCD 树从侧栏卡片移到波形区（原 P1 内容） | 需改 DOM 父容器；**当前未做**（用户本轮只要求面板形态） |
| TB 控制带收敛 | 把 4 卡进一步收敛为「一条控制带 + 折叠 TB」 | 优先级下降；现有卡片已可折叠 |
| 层次树左置 | `#rtl-tree` 移到左侧独立区（原「选项 B 位置」） | **用户明确「暂不」**，等后续拍板 |

**验收口径（每批）**：C1 重建 exe + C8 特征串核验 + 全量测试（regression / e2e-ui / e2e-rtl /
e2e-sim / probe-param / exe-smoke）+ C17 记忆同步 + C2/C3 独立 commit + push `main`。
P0 完成前不启动 P1 的旧节奏**已作废**（本轮已合并完成）。

### 2.7 工作方式评估：「把 UI 设计交给其它 AI」可行吗？

- **结论（建议，不替用户拍板）**：**可行，但只能做「出稿」环节，不能替代 review 与落地。**
  - ✅ 适合交给 AI/设计模型的：**布局方案对比图、视觉规范（间距/字号/分组）、交互流程稿**
    —— 产出物是「图 + 文字规格」，**不进代码**。
  - ⚠ 不适合完全交给 AI 的：**契约面判定**（哪些 id/class 不能动）、**e2e 影响面**、
    **与 B3/B4/B5 触发链的耦合** —— 这些必须由本仓自有记忆与测试基线把关（外部 AI 无此上下文，
    极易破坏）。
  - 建议落地路径：**AI 出稿 → 人类 review → 本 AI 按 §2.5 边界 + §2.6 分期实施**（本 AI 只做
    「受约束的落地」）。
- **交付素材清单（交给外部 AI 前必须先准备好，可直接取自本文件）**：
  1. **现状 DOM 结构**：`index.html` L733~L803 的侧栏树形结构 + 元素 id 清单（§2.5）。
  2. **交互清单**：见 §2.8。
  3. **现状尺寸表**：§2.1 的 P1 表 + `#sim-panel{width:328px; top:92px}`。
  4. **术语表**：RTL 结构树（代码层级：文件→模块→实例）、VCD 信号层次（数据层级：`$scope` 全路径）、
     观察行（画布上的 `__simInjected` 信号行）、例化路径（`tb.dut`）、
     作用域选择浮层（`mode="scope"`）、加信号主路径（代码区点/选中变量）。
  5. **视觉基调**：浅色主题 + CSS 变量体系（`--toolbar-bg`/`--border-color`/`--section-bg`/
     `--radius-md` 等，定义在 `index.html` 内联 `:root`），需与主界面保持一致。

### 2.8 交互清单（现状，供设计稿对齐；实测自 `js/editor/shortcuts.js` 与仿真侧栏接线）

- **核心 / 编辑器**：`Ctrl+Z`/`Ctrl+Y`/`Ctrl+Shift+Z`、`Ctrl+C`/`Ctrl+V`、`Delete`/`Backspace`、
  `Escape`、方向键（移动 + 写值）、`1/0/x/z/u/d` 切位状态
  （`js/editor/shortcuts.js`，**捕获阶段** `document.addEventListener('keydown', onKeyDown, true)`；
  `isEditableTarget` 对 input/textarea/contentEditable 直接放过）。
- **画布**：`Ctrl+滚轮` 缩放（`js/wavepaint.clean.js`）。
- **仿真侧栏（B4 / B4②）**：`Ctrl+Alt+W` 加光标所在符号；`Ctrl+Alt+4` 加模块/实例全部端口；
  双击变量；右键菜单（`js/sim/rtl-panel.js` 捕获 keydown，条件 `(ctrlKey||metaKey) && altKey`）。
- **⛔ 禁用键**：**不要用 `Ctrl+数字`、`Ctrl+W`** —— Chromium/Edge 浏览器级加速键会吞掉，页面收不到
  keydown（见 06 P33/P36）。

### 2.9 方案状态

- **2026-09-10 第二十轮：方案成文**（§2.1~§2.9），状态 = 待用户 review。
- **2026-09-11 第二十一轮：用户拍板**「可拖拽多面板 / 侧栏保持右侧 / 层次树暂不左置 / 实施步骤
  由 AI 自定」，**并已当轮落地** → 状态 = **已采纳并部分实施完成**（原 P0+P1+P2 核心落地；
  VCD 树移入波形区、层次树左置为剩余可选 / 暂缓项，见 §2.6）。
- 落地细节 = **04 §4.19**、**07 D20（升级为已采纳）/ D21**、日志 2026-09-11 第二十一轮。
  交付：exe **22,012,416 B** / `version.txt` = `v0.4.0 build 2026-09-11 00:15:01 69b84d0`。

---

## 3. 远期（用户第十一轮推迟 / 打入）

| 项 | 内容 | 说明 |
|---|---|---|
| #84 | 波形查看增强（reload 重载 / 完整层次路径显示开关 / 游标快速移首末） | 2026-09-09 第十一轮**用户推迟改入远期**；原为先行批第三步，现不做排期 |
| #77 | P2：Active Annotation + driver/load 高亮 | 2026-09-09 第十一轮**打入远期**；#87④ Active Annotation 与之合流，同样远期 |
| #78 | P3（备选）：X 首现追溯 / 波形 diff / VSCode 外接扩展 | 维持备选；VSCode 扩展复用 launcher `/api` + `%TEMP%/WavePaintClean_port_*.txt` |
| 其它 | 边缘对齐辅助线 / Ctrl+滚轮缩放增强 / 导出增强（图片/CSV/VCD）等 | 维持远期未排期 |

---

## 4. 开源借鉴清单

| 项目 | 借鉴点 |
|---|---|
| Verdi（nTrace/nWave） | 交互语义基准：点实例跳定义、Get Signals 树、Ctrl+W/Ctrl+4、双向跳转、Active Annotation |
| Verible | Verilog 符号/格式化，WASM 解析精度方案 |
| TerosHDL | 项目管理、FSM viewer、交互组织 |
| mshr-h/vscode-verilog-hdl-support | 模块树、文档符号、RTL Tree 交互 |
| Surfer | 现代波形查看器、层次树、值格式化、会话 |
| GTKWave | 测量、标记、传统波形交互 |
| WaveTrace | 编辑器内嵌波形布局 |

---

## 5. 不做 / 暂缓

- **不换主仿真器**：iverilog 保持主后端，Verilator 仅远期可选。
- **不重做解混淆 / 重构**：已完成，禁止重复劳动（`wavepaint.clean.js` 正文不再有 `_0x`；
  后续核心改动一律走补丁段 `[PATCH-A*]` + 重建 exe，勿再引入混淆产物）。
- **不引入 Electron / WebView2**：当前 C# + Edge App 方案满足需求。
- **不把 Verdi 功能一次性做完**：按 #86 → #76 → #87①/② 分期；#84/#77/P3 一律远期。
- **不做 nSchema 原理图 / FSDB / 重后端**（#87 研究期已排除）。
- **不做全盘自动扫盘**：“自动找例化模块源码”= filelist/源码全录入 + 模块定义跳转语义正确，
  不引入扫盘逻辑。
- **不做自动整页跳转（服务自愈场景）**：本应用无自动保存，跳转 = 丢用户未保存画布；恢复一律
  「改 `simApiBase` / 同端口重拉」（07 D15、06 P30）。`wavepaint:` 协议只用隐藏 iframe 触发。

---

## 6. 面板系统重构（dockable 多窗口 / Word 式自由拖拽）—— 方案 + 分期

> **2026-09-13 第二十二轮**。用户原话：「请确认现在完成的功能，我最终想实现的就是一个画波形的，
> 可以直接进行仿真的这样一个仿真器。请汇报现在具体后端功能支持的如何？我最终的目标是模仿 Verdi
> 一样可以实现波形窗口、代码窗口、代码树窗口以及其他等窗口的类似 Word 一样的自由排列组合，以及
> 自由拖拽，也就是说目前的 UI 可能要大改。请确认现在的情况，并对此计划做出详细的项目安排。」
>
> 本轮 = **现状盘点 + 方案 + 分期 + 后端能力汇报，零产品代码改动**（不触发 C1、不重建 exe；
> 与第二十轮同规格）。按 **D20「先方案后实施」**：用户对 §6.10 的四条待裁决项拍板后才开工。
> 本节的**上位目标**：把 WavePaint 从「波形编辑器 + 附属仿真侧栏」重构成
> **「波形 / 代码 / 层次 / 控制台 四类面板可自由停靠、拖拽、浮出、组合的仿真工作台」**。

### 6.1 后端能力盘点（2026-09-13 实测，证据可复算）

**一句话结论**：后端**已经打通「画布波形 → 激励 → 自动 testbench → iverilog 编译 → vvp 运行 →
VCD 回传 → 解析回画布观察行」的完整闭环**，是"可画可仿"的真闭环，不是演示壳。但**只覆盖
「单顶层 + 画布即激励」这一种仿真范式**；离"通用仿真器"还差 **TB 可编辑 / 日志与进度 / 编译选项 /
大波形处理** 四块（见 §6.2）。

| 层次 | 能力 | 现状（实测） | 证据 |
|---|---|---|---|
| 传输 | 本地 HTTP 服务 | C# 单文件 `HttpListener`；固定首选端口 **17817**（被占才回退随机 + 写发现文件） | `WavePaintLauncher.cs:28` |
| 传输 | 身份判活 | `/api/ping` 返回 `PING_TAG`（`WAVEPAINT-SERVICE`）+ 监听端口 + 构建戳 | `:31`、`:397` |
| 传输 | 请求体上限 | `MaxBodyBytes = 8 MiB`（`/api/sim` 与 `/api/snapshot` 共用） | `:18` |
| 传输 | 子进程超时 | **单次 30 s**（编译、运行各 30 s）；超时 `KillTree` 杀整棵进程树（含 `ivlpp` 孤儿） | `:17`、`Run()` |
| 传输 | 单实例 / 收窗 | 互斥体单实例；开新窗前收拢全部同名旧 Edge 窗口 | D13、04 §4.2 |
| 仿真 | 源码接收 | 前端 `@@FILE:<名>` / `@@END` 文本协议拼包 → 服务端拆包落 `%TEMP%\ivl_work_<guid>\` | `ui-bridge.js:1326`、`:457` |
| 仿真 | iverilog 自愈 | 每轮 `EnsureIvlReady`：exe 内嵌 `ivl.zip` 解到临时目录，缺/坏自动补齐 | `:443~:455` |
| 仿真 | 编译 | `iverilog -g2012 -s tb -o sim.vvp <files>`；含 `.sv/.svh` 时追加 fallback 批（`.sv→.v` 别名重编） | `BuildCompileBatches` |
| 仿真 | 运行 | `vvp sim.vvp`（TB 内 `$dumpfile("wave_out.vcd")` + `$dumpvars(0, tb)`） | `:519`、`engine.js:825` |
| 仿真 | 波形回传 | 读 `wave_out.vcd` **整文件文本**，`text/plain` 一次性返回（无分片、无流式、无进度） | `:529~:535` |
| 解析 | RTL 解析 | 自研 `parseVerilogDesign`（module / port / param / 位宽 / ANSI 风格） | `engine.js:381` |
| 解析 | 结构导航 | `scanInstances`（源码级例化扫描）/ `collectModuleDefs` / `resolveModuleDef` / `scanModuleSymbols`（体内 `wire/reg/param/inst` + 行号 + 位宽）/ `buildInstancePaths` / 符号→VCD 全路径 | `rtl-nav.js`（40 KB） |
| 激励 | 自动 TB | `buildAutoTestbench`：内嵌参数定义、端口声明、DUT 例化、**1 格子 ≡ 1 时间单位**、同刻先 clock 后数据、未绑定输入给「无效电平」、低有效复位给释放电平 | `engine.js:758~920` |
| 回显 | VCD → 画布 | `parseVcd` / `vcdToProjectOutputs` / `diagnoseSimulation`（中文诊断） | `engine.js:938/1021/636` |
| 存档 | 工程 | `.wp` JSON 存档 / 恢复（源码集合 + 观察行元数据 + 信号组，旧工程向后兼容） | #76 B5、`clean.js` `buildDocumentJson` |
| 快照 | `/api/snapshot` | 服务端**已实现**（`%TEMP%\...\wave_*.json` + `latest.json`，保留 20 份） | `:580` |
| 可用性 | 前端自愈 | `service-guard.js`：`alive / restarted / elsewhere / dead` 四态，**绝不自动跳转**，失败自动重试一次 | C19、D15 |
| 边界 | 明确不做 | 无 Verilator、无 FSDB/FST、无增量仿真、无覆盖率、无波形 diff（远期项，§6.11） | `08 §5` |

### 6.2 后端缺口清单（按「对用户目标的影响」排序）

| ID | 缺口 | 影响 | 现状证据 | 归宿 |
|---|---|---|---|---|
| G1 | **TB 只读**（`#tb-source` 是 `readonly` textarea，内容只能由 `buildAutoTestbench` 生成） | 用户无法写自定义 `initial` / `$readmemh` / 多时钟域 / 定向激励 → **只能测「画布能画出来的激励」** | `index.html` L926、`ui-bridge.js:1305` | #95 E1 |
| G2 | **无编译/仿真日志与进度回显**（stdout/stderr 只在失败时随错误串返回；成功后丢弃） | 仿真要等 30 s 超时才知道出事；看不到 `$display` 输出 | `RunSimulationCore` 仅失败分支返回 `err1/err2` | #95 E2 |
| G3 | **编译选项不可配**（`-D` 宏 / `-I` include 目录 / `-y` 库目录 / filelist / `+define+` plusargs） | 带 `` `include`` / 宏开关 / 多目录工程的 RTL 直接编不过 | `BuildCompileBatches` 硬编码 | #95 E3 |
| G4 | **无请求取消 / 无进度**（30 s 硬超时，用户无法中止） | 长仿真只能干等；想改参数得等超时 | `:17` | #95 E2 |
| G5 | **VCD 全量文本一次性回传** | 大设计 VCD 可能几十 MB → 内存/解析尖峰；无按需取数、无时间窗裁剪 | `:529` | #95 E4（可选） |
| G6 | **`/api/snapshot` 前端未接线** | 已实现的「工程快照 + latest.json」白放着；本应用无自动保存，崩溃即丢画布 | 全仓 `rg api/snapshot` 仅 README + launcher | #96 W2（可选） |
| G7 | **单顶层**（`-s tb` 固定；`#sim-top-select` 只选 DUT 顶层，不选 TB） | 多顶层 / 多 TB 场景不支持 | `BuildCompileBatches`、`index.html` `#sim-top-row` | #95 E5（可选） |
| G8 | **解析器是 SV 子集**（无 generate 展开、无 package/interface/class、无 `` `include`` 递归、无 `` `ifdef`` 展开） | 复杂工程的符号索引/位宽会退化（不崩，但结果保守） | `parseVerilogDesign` / `scanModuleSymbols` | 远期（#95 附注） |

> **重要边界**：G1~G5 全部属于**「后端能力」**，与 §6 的面板重构**正交**，可并行推进；
> 面板重构不需要等后端。但用户要的「直接可以进行仿真的仿真器」**最终要靠 #95 补齐**。

### 6.3 前端现状（面板形态，2026-09-13 实测）

- `index.html` **1038 行**；顶层骨架：`#app-loader` → `#menu-bar` → `#toolbar` → 编辑工具条 →
  **`#main-area`(L838)** → `#wave-view`(L839) / `#wave-canvas`(L840) → `#sim-toggle-btn`(L845)
  → **`#sim-panel`(L846)**（右侧固定侧栏）。
- `#sim-panel` 内部 = **单列 4 张可折叠卡片**（源码 `source` / RTL 树 `rtl` / VCD 树 `vcd` /
  Testbench `tb`）+ 卡片间 **3 条纵向 `.sim-split`** + 左缘 **`#sim-resize-x`** 拖宽
  （clamp `280 ~ min(760, 视口*60%)`）+ 底部 `#sim-status`（吸底）/ `#sim-recover`。
- 布局状态只存 **`sessionStorage`**（`wavepaint.sim-panel-layout.v1`），**绝不进 `.wp`**。
- 代码编辑器 = 侧栏第 1 张卡内的 CM6 单实例（`#verilog-cm-host`）；画布 = 全屏单实例
  （`#wave-canvas`，`#wave-view` 内）。
- 已有雏形能力（第二十一轮）：**卡片折叠 / 卡片间纵向拖高 / 侧栏左缘拖宽 / session 持久化**。
  **缺的**：跨区域停靠、左右重排、横向切分、浮出、Tab 页签、最大化、多实例、布局预设。

### 6.4 差距分析：现状 vs 「Verdi 式四区 + Word 式自由排布」

| 能力 | Verdi / Word 语义 | WavePaint 现状 | 差距等级 |
|---|---|---|---|
| 区域划分 | nTrace（源码+层次树）/ nWave（波形）/ 控制台 / 控制带 | 全部挤在右侧单栏 4 卡 | **大** |
| 面板停靠 | 可在左右下任意停靠区之间拖动 | 只能在同一列内上下调高 | **大** |
| 横向切分 | 同一区域可左右分栏 | 无（`#main-area` 只有「画布 + 右 padding」） | **大** |
| 浮出窗口 | 面板可浮出为独立小窗（Word 式） | 无 | **大** |
| Tab 页签 | 多文档/多视图以页签聚合 | 无（画布与代码各只有一份） | 中 |
| 最大化/还原 | 单面板一键最大化 | 无（只有整栏折叠） | 中 |
| 布局持久化 | 会话/工程级布局记忆 | 仅 sessionStorage（刷新即丢，工程里不存） | 中 |
| 布局预设 | 多套工作区（如 debug / review） | 无 | 小 |
| 拖拽反馈 | 停靠预览框 / 吸附指示 | 无 | 中 |
| 面板实例 | 同一面板可开多份 | 每面板唯一实例（可接受，见 §6.10） | 小 |

### 6.5 技术选型：自研 dock 引擎 vs 引入第三方库

**硬约束（决定选型）**：
1. 应用是 **Edge `--app` 里的普通网页**，**无 Electron / WebView2**（`08 §5` 明确不引入）；
2. **契约面冻结**（§6.6）：24 个 id / class / dataset 必须存活 → 任何库都必须能「**接管容器、
   不改被包裹元素 id**」；
3. 应用代码是**原生 ES Module 直接跑**（`js/**.js` 不经打包）；但仓库**已有 esbuild 打包先例**
   （`tools/cm6-entry.js` → `lib/codemirror.bundle.js`），所以「引入库并打包进 `lib/`」在
   工程上是**可行的**，不是禁区；
4. e2e 基线重（86 + 61 + 79）→ 库的 DOM 自由度越少、越可控。

| 方案 | 代表 | 优点 | 风险 / 代价 | 结论 |
|---|---|---|---|---|
| **A. 自研轻量 dock 引擎** | 本项目 `js/sim/dock/*.js` | 契约面 100% 可控；无新依赖；可精确控制 CM6/canvas 重排时机（D21 的 `remeasure()` 经验可直接复用）；体量可控（≈800~1200 行） | 工作量大（约 3~4 轮）；拖拽手感/边界场景要自己磨 | ✅ **推荐主路径** |
| B. Lumino `DockPanel` | `@lumino/widgets`（JupyterLab 同款，MIT） | 语义最贴「Word 式停靠」：split / tab / 拖拽 / 浮出全有；成熟 | ~100 KB+CSS；**自带 DOM 壳与拖拽层**，需适配 `#wave-canvas` 尺寸与 CM6 `ResizeObserver`；主题需重写；e2e 坐标断言可能整段失效 | ⚠ 备选（若自研拖拽手感不达标，D1 后评估切换） |
| C. golden-layout v2 | `golden-layout`（MIT） | 轻、经典停靠 + 浮出、API 简洁 | 生态偏旧；仍需适配层 + 同样的契约/主题问题 | ⚠ 备选 |
| D. dockview / rc-dock / flexlayout | React/Vue 系 | 功能强 | **本项目无前端框架** → 需引入框架或大量适配，得不偿失 | ❌ 否决 |
| E. iframe 多窗口 | 原生 `window.open` | 真·独立窗口 | Edge `--app` 下多窗口 = 又回到「多窗口抢端口/收窗」的 #82 老坑；跨窗通信成本高 | ❌ 否决（浮出只做**页内浮动层**，不做 OS 窗口） |

> **选型结论（建议，待用户确认）**：**A 为主**，按 D0 先抽出「面板注册表 + 宿主容器」这一层——
> 该层与具体 dock 实现解耦，若 D1/D2 发现自研拖拽手感不足，**可在 D3 前整体换成 B/C**，
> 前面的抽象层不白做。

### 6.6 目标架构蓝本（自研方案）

```
┌─ #menu-bar ────────────────────────────────────────────────────────────┐
├─ #toolbar（绘图工具，非 dockable）─────────────────────────────────────┤
├─ #sim-toolbar（仿真控制带：文件/解析/生成 TB/运行/顶层/状态，非 dockable）┤
├─ #dock-root ───────────────────────────────────────────────────────────┤
│  ┌──────────┬──────────────────────────────┬──────────┐               │
│  │ LEFT     │ CENTER                       │ RIGHT    │               │
│  │ [层次树] │  ┌────────────────────────┐  │ [源码]   │               │
│  │  RTL 树  │  │ 主视图（Tab 组）        │  │  编辑器  │               │
│  │  VCD 树  │  │ 波形画布 | 属性 | ...   │  │          │               │
│  │  (同组)  │  └────────────────────────┘  │          │               │
│  ├──────────┴──────────────────────────────┴──────────┤               │
│  │ BOTTOM（Tab 组）：控制台 / 日志 / TB / 状态          │               │
│  └────────────────────────────────────────────────────┘               │
│  ┌─ float layer（#dock-floats）：可拖出的浮动面板，绝对定位 ─┐         │
└───────────────────────────────────────────────────────────────────────┘
```

**三层模型（建议）**：
1. **面板注册表 `PanelRegistry`**：`{ key, title, icon, element(现有 DOM 节点), defaultZone,
   minSize, canFloat }`；**每个面板 = 一个已存在的 DOM 节点**（`#wave-view`、`#rtl-tree` 卡片体、
   `#verilog-source` 卡、`#tb-source` 卡、`#sim-status`…），**注册时不复制、不重建节点，只搬父容器**
   → **id 天然不变**（这正是第二十一轮验证过的路径）。
2. **布局树 `LayoutTree`**：`split(orientation, ratio, [a,b]) | leaf(panelKeys[], activeKey)`；
   序列化为 `{v:1, root:{...}, floats:[{key,x,y,w,h}]}`。所有渲染由 `render(tree)` 单向下发。
3. **停靠交互 `DockDnD`**：`pointerdown` on `.dock-tab` / `.dock-header` → 生成 **drag ghost**
   → 命中测试出 **drop 目标**（zone 的 上/下/左/右/中心 五向）→ 半透明预览框 → `pointerup` 提交
   布局树变更。拖出到 `#dock-floats` = 浮出。键盘可达（`Alt+方向` 移动活动面板）。

**必须遵守的三条**（沿用 D21 教训）：
- 搬动父容器后**必须重排 `#wave-canvas`**（`resize` + 画布自身 resize 钩子）与 **CM6 `remeasure()`**
  （D21 已证明 CM6 `ResizeObserver` 有 <75 ms 跳过保护，漏重排会错位）；
- 面板 DOM 移动**不得改 id / class / dataset / title**（§6.7）；
- 布局渲染**必须幂等**，`render(tree)` 可重复调用（e2e 与自愈重放都依赖这一点）。

### 6.7 契约面与 e2e 影响面（重构的验收底线）

**冻结面（D20/§2.5，本轮继续有效，一个不许改名/移除）**：
- id 24 个：`sim-toggle-btn`、`sim-panel`、`sim-panel-header`、`source-files`、`sim-addfile`、
  `sim-import`、`sim-removefile`、`sim-parse`、`sim-addsignals`、`sim-tb`、`sim-run`、
  `verilog-source`、`verilog-cm-host`、`port-preview`、`module-preview`、`sim-top-row`、
  `sim-top-select`、`rtl-tree`、`vcd-tree`、`sim-tb-copy`、`tb-source`、`sim-status`、
  `sim-recover`、`app-version`；
- class / dataset：`.rtl-inst`、`.rtl-active`、`.vcd-signal-row`、`.vcd-active`、
  `[data-rtl-kind]`、`[data-vcd-path]`、`.tool-btn[data-tool]`、`.sim-symbol-picker-item`；
- 状态类：`body.sim-open`、`#sim-panel.collapsed`、`wavedrom-debug-open`；
- 属性：VCD 信号行 `title` = 全路径；**`#sim-status` 必须始终可见**（`sticky` 语义保活）；
  **`#sim-run` 必须始终可点**（D21 的真 bug 就是它被裁 → 别让新布局重演）。

**e2e 影响面（重构前必须预估，重构后必须全绿）**：

| 套件 | 条数 | 对 DOM 的依赖 | 重构风险 | 对策 |
|---|---|---|---|---|
| `regression` | 79 | 纯 Node，无 DOM | 无 | 保持 |
| `e2e-ui` | 86 | 侧栏 4 卡 / splitter / clamp / sessionStorage / 矮窗口命中 | **高**（I0~I8 13 条直指布局） | 允许**改断言**以匹配新布局，但 **I 段语义（折叠/拖拽/持久化/`#sim-run` 命中）必须逐条有等价新断言** |
| `e2e-rtl` | 61 | 28 处选择器（`.rtl-inst`/`.vcd-signal-row`/`title` 全路径…） | **中**（只要 id/class 不变则安全） | 冻结面保活即可零改 |
| `e2e-sim` | 0 失败 | 仿真链路 | **低** | 仿真控制带只搬家不改语义 |
| `probe-*` / `exe-smoke` | 全过 | 端口/身份/汉化 | 低 | C19 不变量不动 |

**允许**：新增 `.dock-*` 结构（新容器、新 class、新 dataset）。
**禁止**：把冻结 id 换成 `.dock-*`；把 `#wave-canvas` 换成新 canvas；改 `#sim-status` 的存在性。

### 6.8 分期计划（建议编号 #94 / #95 / #96）

#### #94 面板系统重构（dockable / 自由拖拽）—— 主线

| 期 | 名称 | 范围（做什么） | 交付物 / 验收口径 |
|---|---|---|---|
| **D-1** | **零后端纯前端原型（mock）—— 第二十三轮新增，用户要求的实施路径** | 新建 `prototype/`（**不进 exe 内嵌资源清单 → 不触发 C1、不重建 exe**）：`ui-mockup.html` / `ui-mockup.css` / `ui-mockup.js` = **完整停靠布局引擎的假界面**（假数据波形 / 源码 / RTL 树 / VCD 树 / TB / 控制台 / 源文件 / 端口面板；拖动停靠 + 四方向切分 + Tab 合并 + 最外环新建区 + 浮出 / 最大化 / 收回 + 分隔条 + 3 套预设 + localStorage 记忆）。**不改 `index.html` / `js/**` / `css/**`**，类名一律 `mk-` 前缀，零后端。复跑探针 = `node tools/mock-probe.mjs`（真实 Edge + CDP：34 条断言 + 布局体检 + 9 张截图到 `.e2e-tmp/`） | **用户 review 通过** = 唯一验收口径（形态 / 分区默认值 / 交互手感）。**不满足则继续改 mock，绝不进 D0**；通过后 D0 起按 mock 的骨架接真实 DOM |
| **D0** | **面板注册表 + 宿主容器抽象（零视觉变化）** | 抽出 `js/sim/dock/registry.js`：把 6 个面板（波形画布 / 源码 / RTL 树 / VCD 树 / TB / 控制台状态）登记为 `{key,title,element,minSize}`；`#sim-panel` 与 `#main-area` 现有结构**原样保留**，只把「谁在哪个容器里」改成查表驱动；`render()` 幂等 | **页面像素级不变**；e2e-ui/e2e-rtl/e2e-sim 全绿；新增 §6.7 冻结面自检（id 存在性 + 卡在正确父容器） |
| **D1** | **停靠引擎（区域 + 拖拽重排 + Tab）** | `dock/layout.js`（布局树 split/leaf 模型）+ `dock/render.js`（渲染）+ `dock/dnd.js`（拖拽 + drop 预览）；引入 `#dock-root` 与左/中/右/下四区；**画布进 CENTER、源码进 RIGHT、RTL/VCD 进 LEFT、TB/状态进 BOTTOM**；面板头部可拖 → 换区/换序/切分；同区多面板 = Tab 页签 | 真实 Edge e2e 新增 **K 段**（≥12 条：拖拽换区 / 拖拽排序 / 切分 / Tab 切换 / 冻结 id 全部存活 / 画布与 CM6 尺寸正确 / `#sim-run` 命中）；旧 I 段改写为等价新断言；**不追求像素还原**，追求「操作可复现 + 契约面完整」 |
| **D2** | **浮动窗口 + 最大化 + 键盘** | `dock/float.js`：拖出到浮动层（页内绝对定位，非 OS 窗口）、浮动面板可拖/可缩放/可吸附回区；单面板最大化/还原；键盘可达（`Alt+方向` 换区、`Alt+Tab` 组内切换、`Esc` 取消拖拽） | e2e 新增 **K2 段**（浮出 / 吸回 / 最大化还原 / 键盘换区 / 焦点不丢） |
| **D3** | **布局持久化 + 预设 + 复位** | 布局状态升级为 `{v:1,root,floats,active}`：**sessionStorage 保底**（刷新复位）+ `localStorage` 记忆**跨会话默认布局**；内置 3 套预设（`sim` 仿真态 / `edit` 编码态 / `review` 波形审阅态）+ 一键复位；**默认不进 `.wp`**（除非用户在 §6.10 拍板要） | e2e 新增 **K3 段**（预设切换 / reset / 跨会话 localStorage / session 与 local 优先级） |
| **D4** | **打磨（可选）** | 拖拽手感（吸附阈值/动画/阴影）、面板空态、`#sim-status` 常驻形态、a11y（`role="tablist"` / `aria-grabbed`）、拖拽时暂停画布重绘 | e2e 回归全绿 + 手工验收清单 |

> **两道闸门**：**D-1 = 用户 review 纯前端 mock（唯一验收口径）**，未通过不得进 D0；
> **D0 = 像素级零视觉变化的关键闸门**，完成时视觉未变却已换好骨架 —— 若此时用户反悔，回滚成本 = 一个 commit。

#### #95 仿真后端能力增强（与 #94 正交，可并行）

| 期 | 名称 | 范围 | 验收 |
|---|---|---|---|
| **E1** | **TB 可编辑（最大缺口）** | `#tb-source` 去 `readonly`，加「自动生成 / 手动编辑」双态：手动态下 `#sim-run` 直接用用户文本（不再 `buildAutoTestbench` 覆盖）；`#sim-tb` = 「重新生成并覆盖」（需确认弹窗，C10）；TB 文本随 `.wp` 存档 | e2e-sim 新断言：手写 TB 生效 / 自动生成仍走原路径 / 覆盖前有确认 / 手写 TB 里 `$display` 能被 E2 捕获 |
| **E2** | **编译 / 仿真日志与进度回显** | launcher：`/api/sim` 成功路径也返回 `stdout/stderr` 分段载荷（用现有「文本协议 + 前缀段」扩展，如 `@@LOG:` / `@@VCD:`，**保持失败时旧格式兼容**）；前端：控制台面板显示编译命令、警告、`$display` 输出、耗时；请求可取消（AbortController + 服务端 `simActive` 已有的中断钩子） | e2e-sim + 手工：有 `$display` 的 TB 输出可见；编译告警可见；点「取消」能在 30 s 前终止 |
| **E3** | **编译选项可配** | 控制带加「编译选项」入口：`-D 宏`、`+define+`、`-I` include 目录、`-y` 库目录、filelist（`.f`）导入；选项随 `.wp` 存档；不做全盘扫盘 | 带 `` `include`` 与 `` `ifdef`` 的最小工程能编过；选项往返存档 |
| **E4** | **大 VCD 处理（可选）** | 超阈值时改为「服务端截断到时间窗 / 前端分片请求 + 增量索引」；至少做到**解析不卡 UI**（Web Worker 或分片 `parseVcd`） | 用大 VCD（≥10 MB）实测：解析有进度、UI 不冻结 |
| **E5** | **多顶层 / 多 TB（可选）** | `#sim-top-select` 扩展为「DUT 顶层 + TB 顶层」；支持用户手写的多 TB 切换 | 双 TB 工程可分别运行 |

> **E1 + E2 是用户"通用仿真器"诉求的最小充分集**，建议与 #94 并行优先。

#### #96 工作区与持久化（配套）

| 期 | 名称 | 范围 | 验收 |
|---|---|---|---|
| **W1** | 布局随会话记忆 | D3 的 sessionStorage 版（本就是 D3 内容） | e2e K3 |
| **W2** | **工程自动存档 / 崩溃恢复（可选）** | 复用**已实现但未接线**的 `/api/snapshot`：定时把 `buildDocumentJson` 结果 POST 过去，重开页面时提示「恢复上次画布」；**恢复必须是用户点选，绝不自动覆盖**（D12/无自动保存的红线） | 手工：杀进程 → 重开 → 提示可恢复；点取消则丢弃 |
| **W3** | 布局进 `.wp`（**已拍板 = 不做**，见 07 D22 第 4 条） | 若日后用户改口要"工程级布局"，把 D3 布局写进 `.wp` 新字段（旧工程向后兼容） | 存档往返 + 旧 `.wp` 仍可读 |

### 6.9 验收口径与回滚

- **每期验收**：C1 重建 exe + C8 特征串核验 + 全量测试（regression / e2e-ui / e2e-rtl /
  e2e-sim / probe-param / exe-smoke）+ C17 记忆同步 + C2/C3 独立 commit + push `main`。
- **D0 专项验收**：**像素级零变化**（用 headless Edge 截图对比 D0 前后 `#sim-panel` /
  `#main-area` 的 `getBoundingClientRect` 与 24 个 id 的存在性/父容器）。
- **回滚**：布局引擎全部在**新增文件** `js/sim/dock/*.js` 内；`index.html` 的改动限于「新增容器 +
  搬父节点」。任一期出问题，可只 revert 该期 commit 而不影响仿真链路（#95 独立 commit）。
- **性能红线**：拖拽期间不得触发画布全量重绘（`body.dock-dragging` 时挂起重绘，pointerup 后
  单次重排），否则大工程掉帧。

### 6.10 用户拍板结论（第二十三轮 2026-09-13：**四条全部通过**，D1 形态如下）

> **原「待拍板」四条已由用户全部按 AI 建议拍板**（见 07 D22）。结论：
> ① **解除「侧栏保持右侧」** → D1 采用完整四区 dock（LEFT / CENTER / RIGHT / BOTTOM）；
> ② **解除「层次树暂不左置」** → RTL / VCD 树默认落 LEFT；
> ③ **浮出 = 页内浮动面板**（不做 OS 独立窗口）；
> ④ **布局不写 `.wp`**（只做 sessionStorage + localStorage；工程级布局若确需走 #96 W3）。
>
> 附加裁决（同轮）：**G1~G8 暂不实现**（后端增强全部推迟，`#95` 整体暂缓）；
> **实施路径改为「先 mock 原型 → 用户 review → 再接线」**，见 §6.8 D-1。

### 6.10.1 四条待拍板原始选项与影响面（保留以便追溯）

1. **是否解除「侧栏保持右侧」**（D21②）？
   → 若解除：#94 D1 采用完整四区 dock；**不解除**：则 LEFT/BOTTOM 只能通过与侧栏等价的
   「右侧区内分栏」近似实现，**无法做到 Verdi 式左右分栏**。
   *建议：解除（否则 §6.4 的「大」级差距至少还留 3 项）。*
2. **是否解除「层次树暂不左置」**（D21③）？
   → 若解除：RTL/VCD 树默认落 **LEFT**；不解除：树仍与代码同侧。
   *建议：解除 —— 这是「代码树窗口独立成区」的前提。*
3. **浮动窗口的边界**：接受「**页内浮动面板**」（推荐，无 OS 窗口、无多窗口抢端口风险）
   还是要求「**真·独立窗口**」？（后者会碰 #82 收窗 / 端口自愈的老坑，成本高，不建议。）
4. **布局是否写进 `.wp` 工程**？
   → 建议 **默认只做会话 + 跨会话记忆，不写 `.wp`**（保持存档契约干净）；若用户要工程级布局，
   走 #96 W3。

> 另有两条**默认已定**（如无异议按此执行）：① 每类面板**保持唯一实例**（不做「同一面板开多份」，
> 与 Verdi 的有限差异，成本/收益更优）；② **首次进入默认布局 = `sim` 预设**（波形居中最大、
> 树在左、代码在右、控制台在下），保证与现有用户习惯的连续性。

### 6.11 与远期项的关系

- **#84 波形查看增强**（reload / 完整路径开关 / 游标移首末）、**#77 Active Annotation**、
  **#78 X 追溯 / 波形 diff / VSCode 扩展**：**仍为远期**，不因 §6 上马而提前；
  #94 D1 的「多 Tab 主视图」为它们**预留了位置**（波形窗口可作为主视图 Tab 之一）。
- **#87④ / 波形 diff** 依赖 #95 E4（大 VCD）先落地，顺序上排在 #94/#95 之后。
- **§6 与 §2（侧栏重构）的关系**：§2 = 「右侧单栏内的卡片化」已交付；**§6 = 把面板升级为
  可停靠窗口系统**，是 §2 的**上位替代**。§2.6 的三项剩余（VCD 树移入波形区 / TB 控制带收敛 /
  层次树左置）**直接并入 §6 D1**（D1 一旦落地，这三项自然完成，无需单独排期）。

---

## 7. 控件与工具栏规范化（U 线）—— 第二十四轮 2026-09-13 提出；**第二十五轮 2026-09-13 修订（U0-R）**

> ⚠ **第二十五轮修订（2026-09-13）**：用户已裁决 **不采用 D-UI-A**，改为 **U0-R 顶栏统一** ——
> 所有功能栏（保存 / 撤销 / 缩放 / 绘制 / 标注…）**统一只放 `#toolbar` 一条顶栏**，**波形区不加子功能栏**。
> 据此：**§7.4 的 L2 上下文带作废**（成员归回 L1）、**§7.9-① 关闭**、**§7.7 的 U0/U1/U3 口径调整**、
> **§7.10 新增一条红线**。决策 = `07 D24`；落地与实测 = `04 §4.23`；原型 = `mock-3（顶栏统一 U0-R）`。

> **用户原话**：「UI 排布在大体上基本正确，**小的按钮上的排布以及控制栏的排布还需要斟酌，
> 现在似乎有一些混乱**，大体上可以按照此方案进行改动，请给出之后的工作方案。」
> → **形态层（四区 dock + 页内浮窗 + 多 Tab + 3 预设）已 review 通过，本线不动形态**；
> 本线只解决**控件层**：按钮尺寸 / 间距 / 分组 / 主次 / 分层 / 溢出。编号 **U0~U4**。
> **U 线是 §6 D0/D1 的前置**：工具带属于「宿主容器」的一部分，D0 抽宿主时必须一并抽工具带，
> 否则 D1 之后还要再返工一次。

### 7.1 证据工具（本轮新增，可复算）

```text
node tools/ui-audit.mjs                  # 原型 prototype/ui-mockup.html（1680 / 1280）
node tools/ui-audit.mjs --real           # 真机 index.html 的 #toolbar（1920/1680/1440/1280，不依赖仿真服务）
node tools/ui-audit.mjs --all --check    # 有违规 → 退出码 1（将来接「提交前验证」，见 U4）
```

真实 Edge headless + CDP；报告落 `.e2e-tmp/ui-audit-{mock,real}.json`；判定规则见 §7.3。

**基线（2026-09-13 实测，本线开工前）**

| 目标 | 宽度 | `#toolbar` 溢出 | 相邻间距值域 | 面板控制带 | 可见 primary | 违规数 |
|------|------|----------------|--------------|------------|--------------|--------|
| 原型 mock | 1680 | 0 | {4,6,8,10,12} | 32px 单行 ×3 | **2 个「运行仿真」** | 3 |
| 原型 mock | 1280 | 0 | {4,6,8,10,12} | **51px 折 2 行 ×3** | 2 个 | 6 |
| 真机 real | 1920 | 0 | {4,6,8,10,12,18} | — | 1（`#sim-run`） | 1 |
| 真机 real | 1680 | 0 | 同左 | — | 1 | 1 |
| 真机 real | 1440 | **32px** | 同左 | — | 1 | 3 |
| 真机 real | 1280 | **192px** | 同左 | — | 1 | 3 |

### 7.2 问题清单（P-UI-01 ~ P-UI-09，全部实测，无臆测）

| 编号 | 问题 | 证据 | 级别 | 归属 |
|------|------|------|------|------|
| P-UI-01 | **间距不是刻度值**：真机相邻间距 6 种值 {4,6,8,10,12,18}（17 处非刻度），原型 5 种 {4,6,8,10,12}（13 处）→ 这是「看着乱」的**直接量化原因** | `ui-audit` 的 `gaps/gapKinds`；CSS 来源 5 处（§7.5 末表） | 高 | 两者 |
| P-UI-02 | **真机 `#toolbar` 隐性溢出（真 bug）**：1440 溢 32px / 1280 溢 192px；`#toolbar{flex-wrap:nowrap;overflow:visible;z-index:100}` → 「步数 / 子步数」整组被推出工具栏（1280 实测越界 `步数:▲▼ 子步数:▲@1196~1472`），且工具带会**压在侧栏上层** | `ui-audit --real` 的 `overflow/offscreen`；`css/wavepaint.e7b903ef.css` @12401 | **严重**（窄窗口下步数控件不可用） | 真机 |
| P-UI-03 | **主按钮不唯一**：原型 3 处「运行仿真」（`prototype/ui-mockup.js` L264 / L319 / L403），其中 2 处可见且均带 `.primary` → 用户无法判断「主操作是哪个」 | `ui-audit` 的 `primaries` | 中 | 原型（真机已唯一 = `#sim-run.primary-btn`，`index.html:876`） |
| P-UI-04 | **面板控制带折行**：1280 下三条带 32→51px；元凶不是按钮，而是带尾的**上下文信息 chip**（如「选中信号：data[7:0] · 值 3F @ 420ns（框选后直接输入即可改值）」）被挤到第二行 → 行高跳动、按钮错位 | `ui-audit` 的 `lineCount=2`；`ui-mockup.js:270,320` | 中 | 原型 |
| P-UI-05 | **提示条永远看不全**：`.mk-hintbar{max-width:62ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` → 实测 368px 装 50 字，必然截断 | `ui-audit` 的 `hintbar.clipped=true` | 低~中 | 原型 |
| P-UI-06 | **控件尺寸不齐**：真机图标按钮**两档** 28×28 与 42×28（`#tool-bit-state` 多一个 ▼ 就变宽，破坏网格）；原型是**第三档** 26×26 | `ui-audit` 的 `iconSizes` | 中 | 两者 |
| P-UI-07 | **职责重叠 / 分层缺失**：视图类（缩小/放大/适应窗口）在全局带与波形带**各一份**；绘制工具（画笔/擦除/框选/箭头/标记/文字/时间跳转/时间段）**全在全局带**，而波形专属的「运行」却在面板带 | `ui-audit` 序列 + 原型两条带 | 高 | 两者 |
| P-UI-08 | **原型与真机不同源**：真机 `#toolbar` = **34 个顶层元素**（21 个图标按钮 + 2 分段组〔整步/子步、Dec/Hex/Bin〕+ 2 步进组 + 13 条分隔符），原型只有 **17 图标按钮 + 2 步进组**，缺位状态 / 画笔颜色 / 选择对象 / 属性 / 添加信号下拉 / 编辑力度 / 进制 → **用户 review 到的形态 ≠ 最终形态** | `ui-audit` 的 `kidCount/seq` + `index.html:664~837` | 高 | 原型 |
| P-UI-09 | **分组失控**：真机全局带最大一组 **10 个按钮**（`#tool-paint` → `#tool-properties`），13 条分隔符把 34 个元素切成 12 段（平均 2.8 个一段）→ 分隔符多到失去语义 | `ui-audit` 的 `seq/seps` | 中 | 真机 |

### 7.3 设计原则 R1~R9（本线铁律；`ui-audit --check` 的判定依据）

| 规则 | 内容 |
|------|------|
| **R1 三层职责单一** | L1 应用工具带只放**跨面板**动作；只影响某一面板的动作**必须**在该面板的上下文带；状态栏只读、不放按钮 |
| **R2 同类动作唯一入口** | 同一动作全应用只有一个入口（现状「运行仿真」原型 3 处 → 收敛 1 处；源码带重复的「运行仿真」删掉） |
| **R3 主按钮唯一** | 任一时刻可见的 `primary` 恒 ≤ 1，且只能是「运行仿真」（真机已满足，原型违规） |
| **R4 尺寸三档** | 图标按钮 **28×28**（图标 16×16，含 ▼ 的按钮也按 28 网格，箭头段内嵌）；文本按钮 / 下拉 / 分段控件 / 输入框高 **24**；工具带高固定（面板带 36、全局带 44） |
| **R5 间距只用刻度值** | 组内 **4px**、组间 **12px**（= 1px 分隔符 + 左右各 4px）、带首尾 8px；**禁止组件自带 margin**（`.tool-btn{margin:0 2px}`、`.separator{margin:0 6px}`、`.step-controls{margin-left:8px}`、`.mk-step-group{margin:0 4px}` 一类全部删掉，改由父容器 `gap` + 组容器统一给） |
| **R6 禁止隐式溢出** | 全局带与面板带一律 `nowrap`；放不下时进 **`⋯` 溢出菜单**（按优先级从低到高收），**不允许** `flex-wrap:wrap`（原型现状）/ `overflow:visible` 溢出（真机现状） |
| **R7 图标必可读** | 每个图标按钮带 `title` + `aria-label`；禁用态用 `disabled` + `title` 说明原因（`#tool-properties` 已是范例，推广即可） |
| **R8 不得被裁切** | 1280 / 1440 / 1680 / 1920 四档下，工具带内控件 `offscreen` 必须为空（`ui-audit` 判定） |
| **R9 提示不进工具带** | 长文本（提示语、上下文 chip、状态描述）一律放**状态栏**或面板头右侧；工具带只放**操作** |

### 7.4 目标分层与成员表（⚠ 第二十五轮已裁决：**D-UI-A 作废 → U0-R 顶栏统一**）

**L0 菜单栏**（`#menu-bar`，7 个菜单）：不动。

**L1 应用工具带 `#toolbar`（**统一顶栏**：分组 + `⋯` 溢出；21 个图标按钮**全部留于此**，时间组 `margin-left:auto` 右对齐）**

| 组 | 成员 | 说明 |
|----|------|------|
| G0 运行 | **运行仿真（全应用唯一 primary）** | **常驻可见**（契约：`#sim-run` 始终可点），放最左或最右固定位 |
| G1 文件 | 打开 / 保存 | |
| G2 编辑 | 撤销 / 重做 / 剪切 / 画笔颜色 | |
| G3 视图 | 缩小 / 放大 / 适应窗口 | **U0-R 收回**（原拟下沉 L2） |
| G4 绘制 | 画笔 / 橡皮擦 / 选择（框选） | **U0-R 收回** |
| G5 状态 | 位状态 / 编辑力度（整步·子步） / 进制（Dec·Hex·Bin） | **U0-R 收回** |
| G6 标注 | 箭头 / 时间段 / 标记 / 文本标注 | **U0-R 收回** |
| G7 对象 | 添加信号 / 选择对象 / 属性 | **U0-R 收回** |
| G8 时间 | 步数 / 子步数 | `margin-left:auto` 右对齐，**优先级最高、永不被收** |
| ⋯ | 溢出菜单 | 按优先级**整组**收纳 G7 → G6 → … |

**~~L2 波形面板上下文带~~（⚠ 第二十五轮作废：用户要求「波形区不加子功能栏」）**

| 组 | 成员 | 现状 |
|----|------|------|
| ~~T1 视图~~ | ~~缩小 / 放大 / 适应窗口 / 时间游标~~ | **作废** → 归 L1 G3 |
| ~~T2 绘制~~ | ~~画笔 / 橡皮擦 / 选择（框选）~~ | **作废** → 归 L1 G4 |
| ~~T3 状态~~ | ~~位状态 / 编辑力度 / 进制~~ | **作废** → 归 L1 G5 |
| ~~T4 标注~~ | ~~箭头 / 时间段 / 标记 / 文本标注~~ | **作废** → 归 L1 G6 |
| ~~T5 对象~~ | ~~添加信号 / 选择对象 / 属性~~ | **作废** → 归 L1 G7 |

**L3 源码面板上下文带（4 项）**：打开… / 保存 │ 解析 RTL / 生成 TB。
**「运行仿真」不在这一带重复**（R2）—— 源码面板的用户要运行，点 L1 的唯一主按钮（或 `Ctrl+Alt+R` 一类快捷键）。

**L4 状态栏（`#status-bar`，三段只读）**：左 = 服务与消息（承接 `#sim-status` 语义）｜中 = 当前文件 / TB｜右 = 布局 / 面板计数。
长提示文本（原 `.mk-hintbar` 那类）**收进这里**，不再放工具带（R9）。

**关键取舍（第二十五轮已裁决 = U0-R 顶栏统一）**：真机现有 21 个图标按钮**全部留在 `#toolbar`**（不再下沉）；
「乱」的根因改用**分组内聚 + 刻度 + 尺寸三档 + `⋯` 溢出**来治。原型已按此重排
（`prototype/ui-mockup.*`：`#toolbar` 5 组 18 项 + `⋯`，**波形面板 `.mk-toolrow` 整条删除**）。
**D-UI-A / D-UI-B 二选一的待拍板项已随本次裁决关闭**（`07 D24`）。
保留原 D-UI-A 的两点思想：**分组（视觉内聚）**与**优先级溢出**仍要做，只是**不收进面板带**。

### 7.5 刻度规范（可直接写成 CSS 变量）

```css
--ui-ctl-h: 24px;      /* 文本按钮 / 下拉 / 分段 / 输入框 */
--ui-icon-h: 28px;     /* 图标按钮（图标 16×16 居中） */
--ui-band-h: 36px;     /* 面板上下文带 */
--ui-bar-h: 44px;      /* 应用工具带 */
--ui-gap-in: 4px;      /* 组内 */
--ui-gap-out: 12px;    /* 组间（由分隔符承担） */
```

现状的间距来源（**全部要删**，改由父容器 `gap` 统一给）：
`#toolbar{gap:4px}` + `.tool-btn{margin:0 2px}` + `.separator{margin:0 6px}` + `.step-controls{margin-left:8px;gap:16px}`
+ `.step-control-group{gap:6px}`（真机 5 处）；`#toolbar{gap:4px}` + `#toolbar .separator{margin:0 2px}` +
`.mk-step-group{margin:0 4px;gap:5px}` + `.mk-toolrow{gap:4px}` + `.mk-toolrow .mk-sep{margin:0 2px}`(原型 5 处)。

### 7.6 溢出与降级策略（R6 的具体化）

1. 全局带：测量「剩余宽度」→ 不足则把**优先级最低的整组**移入 `⋯`；`G3 时间` 永不进 `⋯`。
2. 面板带：同法；`T1 视图` 优先级最高，`T4/T5` 先收。
3. `⋯` 菜单项与正常按钮**同 id / 同事件**（只换容器，不加分支），保证契约面不变。
4. 断点口径：1280 / 1440 / 1680 / 1920 四档全部 `offscreen = 0`（R8）。

### 7.7 分期计划 U0~U4

| 期 | 内容 | 触发 C1/exe | 验收 |
|----|------|------------|------|
| **U0** ✅ | **原型补齐 + 重排（第二十五轮已按 U0-R 完成重排）**（零风险沙盘）：① 把真机缺的 8 类控件补进 `prototype/`（位状态 / 画笔颜色 / 添加信号下拉 / 编辑力度 / 进制 / 选择对象 / 属性 / 时间偏移类）；② 按 R1~R9 重排：删 `.mk-hintbar`（R9）、收敛 primary（R3）、间距刻度化（R5）、面板带 `nowrap + ⋯`（R6）；③ **U0-R 裁决**：撤销 D-UI-A，14 个绘图/编辑控件**收回** `#toolbar`（5 组 18 个，带 `data-ovp`），`panelWave()` 整条 `.mk-toolrow` 删除（**波形区零子功能栏**）；④ 分段控件 / 下拉做成「点了有反馈」的假交互 | **否**（`prototype/`、`tools/` 不进 `resources.txt`） | `node tools/ui-audit.mjs --mock` → 两档违规 **0** ✅；`node tools/mock-probe.mjs` → **34/34** ✅ |
| **U1** | **用户 review 控件终稿**（闸门 **U-1**）：给出每条带的组图 + 控件归位表终稿；同时拍板 §7.9 余下条目。**改动方向已实质拍板（用户裁决 U0-R = 控件不搬离 `#toolbar`），只剩细节确认** | 否 | 用户确认细节（刻度值 / `#sim-run` 位置 / 溢出策略） |
| **U2** | **工具带数据驱动化**：新增 `js/sim/ui/toolbar-spec.js`（控件 = 数据：`id / 图标 / title / 组 / 作用域 / 溢出优先级`）+ 渲染器；真机 `#toolbar` 改由 spec 渲染，**24 个冻结 id 一个不改名** | **是**（`js/` 新文件进 `resources.txt`）→ 重建 exe + C8 核验 | regression **79/79**、e2e-ui **73/73**、e2e-sim 0 失败 |
| **U3** | **真机落地 + 真 bug 修复（控件不搬离 `#toolbar`）**：R5 间距刻度化（删 5 处散落 margin）→ R6 溢出菜单（修掉 **P-UI-02**：真机 1440 溢 32px / 1280 溢 192px，修后不再越界）→ R4 尺寸统一（位状态 42→28 网格）→ **分组 + 刻度 + 尺寸 + `⋯` 溢出**。**不再做「波形类控件下沉到上下文带」**（D-UI-A 已作废，见 §7.4） | **是** | `node tools/ui-audit.mjs --real --check` 四档违规 **0**；全量 e2e 绿 |
| **U4** | **闸门工具化**：把 `ui-audit --check` 写进 `02-WORKFLOW §3` 的提交前清单；补 4 档宽度视觉截图基线（`.e2e-tmp/ui-*.png`） | 否 | 文档 + 脚本就绪 |

> ⚠ **U3 的迁移纪律**：控件可以**换父容器**（DOM 移动），但 ① id 一律不改名、不删除；② 事件绑定走原链路；
> ③ `#sim-status` 常驻可见、`#sim-run` 始终可点；④ 迁移后必须重放 `applyActiveHighlight` 一类重建逻辑（§2.4-3 的老坑）。
> ⑤ `js/sim/engine.js` 一律不碰（C9）；弹窗仍走 `__core.prompt`（C10）。

### 7.8 之后的工作方案（总排期，U 线与 §6 D 线合并视图）

| 顺序 | 批次 | 依赖 | C1/exe | 预估 |
|------|------|------|--------|------|
| 1 | **U0** 原型控件重排（`prototype/` 沙盘） | 无 | 否 | 0.5 天 |
| 2 | **U1** 用户 review（闸门 U-1） | U0 | 否 | 等用户 |
| 3 | **D0 + U2** 面板注册表 + 宿主容器抽象 + 工具带 spec（**像素级零视觉变化**；spec 即 U0-R 后的 5 组 18 控件） | U1 | 是 | 1~1.5 天 |
| 4 | **U3** 真机工具带落地（分组 / 刻度 / 尺寸 / `⋯` 溢出，**控件不搬离 `#toolbar`**）+ P-UI-02 真 bug 修复 | U2 | 是 | 1 天 |
| 5 | **D1** 停靠引擎（四区 + 拖拽 + Tab；把 `prototype/` 的 `split/tabs/hitTest` 搬进 `js/sim/dock/*.js`） | U3 | 是 | 2~3 天 |
| 6 | **D2** 页内浮动 + 最大化 + 键盘 | D1 | 是 | 1 天 |
| 7 | **D3** 持久化（session + 跨会话 + 3 预设 + reset；**不写 `.wp`**） | D1 | 是 | 1 天 |
| 8 | **D4 + U4** 打磨（空态 / a11y / 拖拽期暂停重绘）+ 闸门工具化 | D2/D3 | 否 | 1 天 |

每批 = 独立 commit + push（C2/C3）；D0/U2/U3/D1/D2/D3 各触发一次 C1 重建（C8 核验）。
**总预估 ≈ 8~9 个 AI 工作日**，其中 U0/U1 两步是**零风险 + 用户可见**的最短反馈环。

### 7.9 待用户拍板（U1 闸门一并确认）

1. ~~**工具归位**：D-UI-A（14 个波形类控件下沉到波形面板上下文带）还是 D-UI-B（全部留在全局带）？~~
   **【已关闭 · 第二十五轮用户裁决 = U0-R】** 用户明令「波形区的子波形区现在不添加功能栏，功能栏仍旧放在统一的顶栏那里」→ **采纳 D-UI-B 方向**（控件不搬离 `#toolbar`），**D-UI-A 作废**（见 §7.4 / D24）。
2. **`#sim-run` 位置**：保留在**全局带常驻**作为全应用唯一 primary（推荐，满足「始终可点」契约）？
   → **用户未提异议，按默认执行：常驻全局带**（同 U0-R 后的原型现状）。
3. **溢出策略**：窄窗口用 `⋯` 溢出菜单（推荐）还是允许折成第二行（现状）？
   → **用户未提异议，按默认执行：`⋯` 溢出菜单**（U3 落地时实现；原型已带 `data-ovp`）。
4. **刻度值**：图标按钮 28×28 / 文本 24 高 / 组内 4 / 组间 12（推荐）？
   → **用户未提异议，按默认执行：图标 28×28 / 文本 24 高 / 组内 4 / 组间 12**。

### 7.10 红线与「不做什么」

- **不碰形态层**：四区 dock / 页内浮窗 / 预设 / 持久化由 §6 D1~D3 负责，本线只在既有容器里重排控件。
- **不动这 24 个冻结 id**（D20 / §2.5）：可移动 DOM 位置、可换父容器，**不可改名、不可移除**。
- **`#sim-status` 常驻可见 + `#sim-run` 始终可点**（契约硬约束）→ 决定了「运行仿真」必须留在常驻带上。
- **不重新排期 #88~#92**（编辑模式点 bus 误入框选 / 信号名标位宽 / 步进 ▲▼ ±1 / 步长变化 clock 填充 / 框选后点其它处自动提交）：
  五项**已于第九轮全部 ✅**（03 §I，含 e2e-ui D2/F/G/H 段），第二十四轮实测未见回归 → **勿重做**。
- **远期不受影响**：`#84` 波形查看增强 / `#77` Active Annotation / `#78` X 追溯（08 §3）。
- **C9/C10/C17/C19 照旧**；U2/U3 改 `index.html`/`css/`/`js/` → 必须同步记忆（本文件 §7 + 04 + 07 + 09 + logs）并重建 exe。
- **【第二十五轮新增】不改已有绘图 UI**：`js/wavepaint.clean.js` 绘制层、`js/sim/engine.js`（C9）一律不动；改动只在**布局 / 控件外壳 / 交互壳**层。
- **【第二十五轮新增】波形区不加子功能栏**：任何绘图 / 编辑控件都必须回到统一顶栏 `#toolbar`（U0-R 裁决；原型 `panelWave()` 已删整条 `.mk-toolrow`，真机 U3 落地时同样不得给波形面板加专属工具带）。
