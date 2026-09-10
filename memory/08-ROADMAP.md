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
> **方案状态 = 待用户 review；用户拍板后再按 §2.6 分期实施。**
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
