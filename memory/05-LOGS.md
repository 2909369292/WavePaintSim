# 05 · 操作日志索引

> 本文件是每日日志的导航页。详细流水账在 `memory/logs/`。
> 每次工作结束后，必须在当日日志追加记录，并在本文件更新索引。

---

## 1. 阅读顺序

1. 先看本文件，找到相关日期。
2. 再打开 `memory/logs/YYYY-MM-DD.md` 看细节。
3. 若要了解当前状态，回到 `04-PROGRESS.md`。

---

## 2. 日志索引

| 日期 | 主题 | 关键结论 |
|---|---|---|
| 2026-08-30 | 接手 + 实证定位“仿真恒为 0” | 真根因是 `rst_n` 低有效复位被默认激励恒置 0；stride 问题真实存在但不是恒 0 根因 |
| 2026-08-31 | 仿真修复 + 常见信号预填 | `e2e-sim` 固化，时钟/复位预填，主题改浅色 |
| 2026-09-01 | 解混淆核心完成 | 33K 行 `wavepaint.clean.js`，1:1 复刻验证 |
| 2026-09-02 | 分层重构完成 | `__core`/`wpf`/`editor`/`sim` 体系建立，历史 hack 清零 |
| 2026-09-03 | 私有 divisor 与交互收口 | stride 全链路统一，`parseValue` 唯一入口 |
| 2026-09-04 | 批次1~10 + 大轮收尾 | 文件菜单、实时预览、DUT 回显、顶层选择、版本显示、launcher 自愈 |
| 2026-09-08 | 参数化位宽 + 总纲 | 位宽算术交给 iverilog；regression 49/49 |
| 2026-09-09 | 记忆体系重构 + #75 Verdi P0 + #81 Bug 自研修复 + #82 遗留窗口收拢 + #93 插队混淆清理（第七轮死代码清理 + 第八轮标识符重命名）+ 第六轮收官 #89 信号名位宽显示（第九轮）+ Verdi 先行批 #85 VCD 点信号→观察行（第十轮） | 上午收敛记忆；下午完成 CM6 代码视图 / RTL Tree / VCD 全路径索引（58/58）；晚间完成 sim 瞬时离线自愈重试 / 添加信号按钮消失根治 / 教程隐形重启拦截，探针全过 + exe 重建；深夜完成「旧 Edge 窗口停死端口 → 直接无法仿真」根治（launcher 收窗 5→1，全链路验证 + exe 重建）；随后（第七轮插队）clean.js 死代码清理 33,110→17,164 行 + 删混淆源 / index.obf.html / deobfuscate.mjs / probe-core.mjs，regression 58/58、exe 重建；（第八轮·第 7 pass）把残留 `_0x…` 标识符按 ESLint-scope 绑定图重命名可读名（19,132 处 / 4,291 变量，BINDINGS OK），17,164→13,115 行、正文 `_0x` 清零，regression 58/58 + e2e-ui 73/73 + exe 重建；然后（第九轮）完成第六轮收官 #89 信号名位宽显示：clean.js 新增 `[PATCH-A6]` `displaySignalName` 仅显示层拼 `name[msb:lsb]`（不改 sig.name），测宽/宽度缓存键/`drawSignalName` fillText 两处消费，regression 62/62 + e2e-ui 73/73 + exe 重建（17:35:49）；最后（第十轮）完成 Verdi 先行批 #85：VCD 树点信号 → 画布「观察行」（ui-bridge.js `state.simWatches` + `pickVcdSignalIntoWave`，观察行 `__simInjected:true` 不进激励、重仿真按 VCD 路径自动刷新去重、删行不复活可重加；e2e-rtl 新增 D1~D6），e2e-rtl 15/15 + regression 62/62 + e2e-ui 73/73 + exe 重建（19:31:28） |
| 2026-09-09 | 第十一轮：优先级重排（纯规划文档） | 用户拍板：推迟 #84 波形查看增强与 #77 Active Annotation 打入远期；近期主线改 #86 → #76（重点：底层支持更多 Verilog 代码互动 + 代码解析能力；交互层仿 Verdi），其后 #87①/②；#87 优先级提高；侧栏/整体 UI 重构设计优先级提高（并行方案线）。更新 03/04/05/08/09 + 当日日志第十一轮；未动代码无需重建 exe | 
| 2026-09-09 | 第十二轮：加信号路径澄清 + RTL 树瘦身（纯文档 + 首批实施） | 用户拍板：**通过代码直接下信号**（代码内点/选中变量 → 画布，“中追”式 = #87①/#76 B4 唯一主路径），RTL tree 仅用于看代码层级、不需要看到接口信号 → 纯文档 commit 修订记忆口径（03/04/05/08/09 + 当日日志第十二轮）；随后**首批实施 RTL 树瘦身**：`renderRtlTree` 删「端口 Ports / 参数 Parameters」分组与模块行端口计数（meta 只显示实例数+行号），只留 文件→模块→实例 跳转；`index.html` 注释同步；e2e-rtl 新增 B3 断言；数据层 `buildRtlNav` 不动（ports/params 供解析与 B1 scope 映射复用）；e2e-rtl 16/16、regression 62/62、e2e-ui 73/73、真 exe 冒烟通过、exe 已重建（22:19:04） | 
| 2026-09-10 | 第十三轮：本地仿真服务自愈根治（#86 服务在线性专项） | 用户报「本地仿真失败/请求无响应」并要求「每次点仿真必须调用服务、必须成功」→ 查清**四类并存死因**：① exe 进程死（端口无监听、`ERR_CONNECTION_REFUSED`，旧实现只会提示重启）② 旧版每次随机端口（已开页面 origin 钉死旧端口，刷新无效）③ 端口被第三方占用（请求发给别人）④ **换版本后首次启动必崩**（`ivlRoot` 只在 cache 分支赋值 → extract 分支 `Path.Combine(null,…)`，日志 `IVL repair failed: ArgumentNullException path1`）——④ 解释了「每次重建 exe 后重启就仿真不了」的反复。根治：launcher 固定首选端口 **17817** + `/api/ping` 带 `PING_TAG` 身份标识 + extract 分支统一 `ivlRoot` 赋值 + `EnsureIvlReady` 每轮仿真前兜底 + `wavepaint://start?port=` 协议**同端口**重拉；新增 `js/core/service-guard.js`（192 行：`pingOrigin` 身份校验判活 / `discover` 同源+17817 / `relaunch` 隐藏 iframe / `recover → alive\|restarted\|elsewhere\|dead`，**绝不自动跳转**因为本应用无自动保存）；`index.html` 引入守卫 + 新增 `#sim-recover` 手动自愈按钮；`ui-bridge.js` 失败路径重写为三段自愈（在线→只给准确文案 / 不在线→快速发现并自动重试一次 / 进程真死→亮按钮+重拉+自动重试，失败才给手动指引）+ `probePlainPing`/`showRecoverPending`；`dev-server.mjs` `/api/ping` 对齐身份格式。验证：regression 62/62、e2e-sim 0 失败、e2e-rtl 16/16、e2e-ui 73/73（复跑确认）、真 exe 冒烟无异常、自建 `verify-recovery2.mjs` **17/17**（含「点运行仿真+服务已死→自愈→仿真完成」「重拉回同一端口 17817」「页面全程未跳转」）、真实 Edge 协议探针证明**隐藏 iframe 可拉起 exe**而顶层跳转/`window.open`/`<a target=_blank>` 均被 `user gesture is required` 拦下；exe 重建（20:05:06、21,881,344 B、`v0.4.0 build 2026-09-10 20:05:06 72116e0`） |
| 2026-09-10 | 第十四轮：**#86 A1~A4 全部落地**（实例→模块定义跳转 + 磁盘导入源码 + 源码集合随 `.wp` 存档） | 用户「继续回到原来的任务，按规划进行」→ 按 08 §1.1 实施 #86 全部子项。**A1 底层**：`rtl-nav.js` 新增源码级实例扫描器 `scanInstances`（字符流 + `matchParen` 平衡括号 + 多实例同语句循环 + `;` 收尾，行号取真实下标）、`maskStrings`（字符串换**等长**空格，修未闭合串少 1）、`mergeInstances`（扫描器优先/engine 兜底，engine 条目过「`isReservedName` 排门原语 + 抹白文本须真存在 `<实例名> (`」两道闸）、`collectModuleDefs`/`findModuleDefCandidates`/`resolveModuleDef`（同名多处→同文件优先、大小写模糊标 `fuzzy`）——**只读扫描，绕开 `sim/engine.js` 最易碎区（C9），未改 engine 一行**。**A2 交互**：`rtl-panel.js makeJumpRow` 增第 6 参 `secondaryJump` → 实例行**左键跳 module 定义、右键/Alt+左键跳例化点**；payload 扩 `{fileIndex,line,moduleName,instanceName,name,kind}`（`instance`/`instanceSite`）；`ui-bridge.js gotoSource` 跨文件先切 tab 再跳，黑盒给中文提示（「未找到模块 X 的源码定义（可能是黑盒或外部 IP），已定位到例化点第 N 行。」）。**A3**：`index.html` 侧栏新增「导入源码」按钮（`sim-import`）+ `importSourceFiles`（`showOpenFilePicker` 优先、隐藏 `<input type=file>` 兜底、同名去重）。**A4**：`installProjectArchiveBridge` 包裹核心 `buildDocumentJson`/`loadFromFileContent`，`injectArchiveSourceFiles` **文本拼接**注入 `sourceFiles`/`activeSourceIndex`（空文档 `{}` 不多逗号、旧工程向后兼容、桥须早于核心初始化），`flushEditorIntoSourceFiles` **故意不走 `syncEditor()`**（避免误清 design/outputs/TB），`file-menu.js onNew()` 复位源码集合，导出 `window.__wpsim` 探针入口。验证：`node --check` 全过、regression **68/68**（+6 条）、e2e-rtl **23/23**（+E1~E6）、e2e-sim 0 失败、probe-param 全过、e2e-ui 73/73、真 exe 冒烟通过、C8 特征串核验通过；exe 重建（20:36:16、21,910,016 B、`v0.4.0 build 2026-09-10 20:36:16 327acf7`）。踩坑记入 06 P31；主线下一项 = #76 B1 |
| 2026-09-10 | 第十五轮：**#76 B1 数据层落地**（模块体内符号索引 + 例化路径 + 符号→VCD 全路径映射） | 按 08 §1.2 开工近期主线第二项 #76 的**第一顺位 B1（底层解析底座）**，本轮只做数据层、不碰 UI 交互。`js/sim/rtl-nav.js` 新增 `scanModuleSymbols`（体内 wire/reg/logic/integer/genvar/parameter/localparam/端口/实例名 → 名+种类+方向+位宽+行号；`function/task/specify/table` 体先经 `blankInnerScopes` 抹**等长**空白 → 形参与局部变量不进表）、`declRangeInfo`/`readDeclStatement`/`splitDeclItems`（位宽与多标识符声明解析，参数化位宽保留原文 width=0）、`mergeSymbols`（同名同行去重 + 按行排序）、`buildInstancePaths`（模块例化路径，path = `tb.dut.u_sub` 式**不含信号名**的 scope 前缀；自动判顶层；例化环保护）、`buildSymbolIndex`（模块表 + 展平符号表 + 例化路径）、`moduleAtLine`、`findSymbols`（`moduleName/fileIndex/line` 逐级收窄，**收窄为空则忽略**，大小写模糊标 `fuzzy`）、`resolveSymbolVcdPaths`；`buildRtlNav` 每模块新增 `endLine`/`symbols`。`js/sim/vcd-index.js` 新增 `findVcdPathsByName`（隐式 net / TB 本地信号的名字兜底）。`js/sim/ui-bridge.js` 新增 `currentSymbolIndex()`（纯计算）并扩 `window.__wpsim`（`symbolIndex`/`symbolsOf`/`symbolVcdPaths`/`vcdPathsByName` 探针入口）。**未改 `sim/engine.js` 一行（C9 守住）**。验证：regression **75/75**（+7 条 B1 断言）、e2e-rtl **32/32**（新增 F1~F9，真实 VCD 核对：点代码符号 → `tb.dut.q` / `tb.dut.u_sub.q`，跨模块同名不串味，符号位宽 4 == VCD 位宽 4）、e2e-sim 0 失败、probe-param 全过、e2e-ui 73/73、真 exe 冒烟通过、C8 特征串核验通过；exe 重建（21:06:52、21,930,496 B、`v0.4.0 build 2026-09-10 21:06:52 db7a98f`）。踩坑记入 06 P32；下一项 = **#76 B4**（代码内点/选中变量 → 加波形 = 唯一加信号主路径） |
| 2026-09-10 | 第十六轮：**#76 B4 交互落地**（代码内点/选中变量 → 加波形 = 唯一加信号主路径） | 用户「按照规划继续进行」→ 按 08 §1.2 实施 **#76 B4**（第十二轮口径：代码点变量是**唯一**加信号主路径，仿 Verdi nWave「中追」）。`rtl-panel.js` 新增导出纯函数 `symbolNameAt(text, from, to)`（`VERILOG_IDENT`/`IDENT_SCAN`/`IDENT_CHAR`/`BITSEL_LOOKBACK` 字符集 + ~110 词 `VERILOG_KEYWORDS` 排除 + `baseSymbolName` 剥 `q[3:0]` 位选 / `firstSymbolIn` 取 `a.b.c` 末段 / `isIdentAdjacent`），`installCodeEditor` 增第 5 参 `onAddSymbol` 与返回对象 `getContext()`/`focus()`，内部 `readContext()` 产出 `{name,line,selection,exact,source}`；**触发面 = 双击变量（要求 `exact`）/ 右键菜单（preventDefault）/ keydown 捕获阶段 `Ctrl+Alt+W`**（**不用 `Ctrl+W`**：Edge `--app` 吞它当关窗）。`ui-bridge.js` 新增 `addSymbolFromCode`（`currentSymbolIndex` → `moduleAtLine` 行→模块收窄 → `resolveSymbolVcdPaths(index, name, {moduleName,fileIndex,line})`，**仅当候选为空才** `findVcdPathsByName` 兜底）→ 唯一候选直加 `pickVcdSignalIntoWave`（#85 链路）、多候选弹**代码区旁轻量浮层** `.sim-symbol-picker`（单例、点外部/Esc 收起，**不是**单独“信号层次选择框”）；`syncSimRows()`（原 `replaceInjectedOutputs` **改名**）**不再灌 outputs** = 收敛「仿真后全量自动加信号」。验证：regression **77/77**（+2 条 `symbolNameAt`）、e2e-rtl **39/39**（+G1~G7 真实浏览器：不自动灌信号 `autoInjected:0/autoWatch:0` / 模块内唯一候选直加 `tb.dut.q` / 多实例候选先不加入 + 轻量选择器 / 点选择器项后加入 `tb.dut.u_b.q` 且自动收起 / 未知名零副作用 + 中文提示 / 右键与 `Ctrl+Alt+W` 同链路 / `codeContext.source==='cm'`）、e2e-sim 0 失败、e2e-ui 73/73、probe-param 全过、真 exe 冒烟通过、C8 特征串核验通过；exe 重建（21:33:05、21,947,904 B、`v0.4.0 build 2026-09-10 21:33:05 ebce2b5`）。踩坑记入 06 P33；下一项 = **#76 B3**（代码 ↔ 树双向跳转） |
| 2026-09-10 | 第十七轮：**#76 B3 落地**（代码 ↔ 树双向跳转 = 代码光标 → RTL/VCD 树反向高亮，仿 nTrace「光标即高亮」） | 用户「按照规划继续」→ 按 08 §1.2 实施 **#76 B3**（补「代码 → 树」反向联动；「树 → 代码」由 #86 A2 早已具备）。**纯视觉、零副作用**：不加信号、不弹框、不新增面板、RTL 树纯层级口径不变（不带出端口/信号行）。`js/sim/rtl-panel.js` 新增导出纯函数 `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow`（**目标带 kind 时同类是硬条件 + 必须位置证据 + 同分取先出现者**，无命中 -1）与 `clearRtlHighlight`/`clearVcdHighlight`/`highlightRtlRow`/`highlightVcdSignal`（清旧 → 命中 → 加 `.rtl-active`/`.vcd-active` → **展开祖先 `<details>`** → `scrollIntoView`）；`installCodeEditor` 增第 6 参 `onCursorMove`（`selectionchange`(ownerDocument) + 宿主 `mouseup`/`keyup`，位置签名去重、仅焦点在内时发、`setText()` 重建后强制补发；**未改 CM bundle，免跑 esbuild**）；RTL 树行补 `data-rtl-*` 元数据、VCD 信号行补 `data-vcd-path`。`js/sim/ui-bridge.js` 新增模块级 `activeHighlight`/`activeSyncTimer` + `syncActiveFromCode`（`getContext` → `moduleAtLine` 模块行 / `findSymbols` 实例名 → 实例行 / `resolveSymbolVcdPaths` **唯一才亮 VCD**、符号侧空才 `findVcdPathsByName` 兜底同样要求唯一 / 无目标清空；**歧义宁可不亮**）+ `scheduleActiveSync`（180ms 防抖）+ `applyActiveHighlight`/`clearActiveHighlight`（**树全量重建后重放**），`gotoSource()` 末尾闭环、`refreshStructureTrees()` 末尾重放；`__wpsim` 增 `syncActiveFromCode`/`clearActiveHighlight`/`activeSymbol`/`highlightedRtlRow`/`highlightedVcdPath` 探针。`index.html` 只加 `.rtl-jump-btn.rtl-active` 与 `.vcd-signal-row.vcd-active` 两条 CSS（无新面板、无尺寸变化）。**本轮唯一一次「修 bug」取舍**：首跑 e2e-rtl 时 H4 失败——断言写成「未知符号 → 高亮全部清空」，但实现的模块行 fallback 是刻意设计（仿 nTrace「当前 scope」常亮）→ 判定 **H4 的断言才是错的 spec**，改断言而非改实现：H4 改为「未知符号 → **不误亮信号**（无 VCD、不亮实例行），只保留所在模块 scope 高亮」，新增 **H4b**「光标既不在任何模块内（行号越界）且名字不是符号 → 高亮全部清空」。验证：regression **79/79**（+2 条 B3 纯函数 test）、e2e-rtl **46/46**（+H1/H2/H3/H4/H4b/H5/H6，真实 Edge + 真实 VCD）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建（22:06:08、21,964,288 B、`v0.4.0 build 2026-09-10 22:06:08 4fac9de`；⚠ `4fac9de` = **构建时 HEAD**，承载 B3 的 commit 是它的下一个，别误判 exe 落后）、C8 特征串核验通过（`highlightRtlRow`=8/`highlightVcdSignal`=6/`syncActiveFromCode`=4/`rtl-active`=6/`vcd-active`=5/`datasetToRtlRow`=4/`clearActiveHighlight`=4，全 >0）；**未改 `sim/engine.js` 一行**（C9 守住）。踩坑记入 06 P34、决策 07 D17；下一项 = **#76 B5**（信号组/观察行随 `.wp` 工程存档与恢复） |
| 2026-09-10 | 第十八轮：**#76 B5 落地**（画布观察行随 `.wp` 工程存档与恢复，#76 收口） | 用户「按照规划继续」→ 按 08 §1.2 实施 **#76 B5**。**先范围勘察**（只读核心，未改一行）：信号组已由核心 `buildDocumentJson`/`loadFromFileContent` 逐字段存还原 + `GroupManager` 纯函数派生 → **无需另存**；观察行必须桥兜底（核心把它当普通信号写进 `signals`，载入后丢 `__simInjected`/`__simWatchPath`/`width`/`msb`/`lsb` → 脏激励 + 名字列丢 `[3:0]`）。`js/sim/ui-bridge.js`：`injectArchiveSourceFiles` **泛化**为 `injectArchiveFields(json, fields)`（文本拼接口径不变，旧名已不存在）；新增 `archiveSimWatches`（只存 `{path,name,width,reference}` **找回元数据**，波形数据留核心 `signals` 不重复存）、`applyArchivedExtras`（坏载荷静默 → **先清 `vcd`/`outputs`/`simWatches`（画布换人）** → 恢复源码 → 恢复观察行 → 面板就绪则刷新 + 状态栏合并文案）、`applySourceFilesFromArchive`、`applySimWatchesFromArchive`、`adoptArchivedWatchRows`（「行名 == 观察路径」认领 + 补回 `width`/`kind`/`msb`/`lsb`，幂等）；`syncSimRows` 增「**无 VCD 时回退工程带回来的行**」（有 VCD 仍以 VCD 为准）；`resetSourceFiles` 扩为「新工程全复位」；`__wpsim` 增 `designSignalNames` 探针。`tools/e2e-rtl.mjs` 新增 **I 段（7 落点 / 6 断言，46→52）**：存档含 `simWatches`、载入回注入语义 + 位宽补回、观察行不进激励、新建全复位、反复往返 + 旧工程兼容、坏 JSON 不抛。验证：regression **79/79**、e2e-rtl **52/52**（I 段首跑即全 PASS，无 404/无控制台异常）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建（22:23:52、21,969,408 B、`v0.4.0 build 2026-09-10 22:23:51 5ec07e7`，`5ec07e7` = 构建时 HEAD）、C8 特征串核验通过（`injectArchiveFields`=2/`archiveSimWatches`=2/`applyArchivedExtras`=2/`applySimWatchesFromArchive`=2/`adoptArchivedWatchRows`=4/`designSignalNames`=1/`simWatches`=35，全 >0）；**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9 守住）。踩坑记入 06 P35、决策 07 D18；**#76 收口（B1~B5 全部完成）**，下一项 = **#87②**（模块全接口 Ctrl+4） |
| 2026-09-10 | 第十九轮：**#87② 落地**（模块/实例全部接口一键入波形，仿 nWave `Ctrl+4`） | 用户「按照规划继续」→ 按 08 §1.2 实施 **#87②**（#76 已于第十八轮收口）。**两条硬口径**：① 触发键 = **`Ctrl+Alt+4`**（**不是 `Ctrl+4`** —— Chromium/Edge 把 `Ctrl+数字` 当浏览器级「切换标签页」加速键，页面收不到 `keydown`，与 `Ctrl+W` 同源，见 06 P36）；② **「全部接口」= 模块端口（`kind === "port"`）**（含模块头 ANSI 端口 + 体内 `input/output/inout`，`modulePorts` 按名去重），体内 `wire/reg` 仍走 B4 单点加入、**不批量灌**；目标作用域 = **例化路径**（顶层模块自动映射到 `tb.dut`）。`js/sim/rtl-panel.js`：`installCodeEditor` 增第 7 参 `onAddScope`；触发块重构为 `request(via, event, handler)`（handler 缺省回落 B4 单符号入口；**未接线手势静默放过、不吞事件**）；keydown 捕获阶段识别 `key==="4" \|\| code==="Digit4" \|\| code==="Numpad4"`，命中 `preventDefault()+stopPropagation()` → `onAddScope`。`js/sim/ui-bridge.js`：浮层泛化 `openPicker(title, items, anchor, mode)`（`items=[{label,title,onPick}]`、`box.dataset.pickerMode=mode`）+ 薄封装 `showSymbolPicker`（mode `"symbol"`，**B4 选项文本仍是 VCD 全路径、探针口径不变**）/ `showScopePicker`（mode `"scope"`）；新增 `moduleScopes`（按 `instancePaths[].moduleName`）/ `modulePorts` / **`addVcdPathsToWave`**（**批量、只 `render()` 一次**、末尾滚动定位、**不设状态栏**，返回 `{ready,added[],existed[],missing[]}`）/ `modulePortsStatus`（唯一汇总文案入口）/ `addModulePortsToWave` / `addModulePortsFromCode`；接线 `onAddScope`；三处提示追加 `Ctrl+Alt+4`；`__wpsim` 增探针（`addModulePortsFromCode`/`moduleScopesOf`/`modulePortsOf`/`addVcdPathsToWave`/`get pickerMode`）。`tools/e2e-rtl.mjs` 新增 **J0~J7（+9 → 61/61）**。**修掉一个真 bug**：分支①（光标在实例名上）**不能**用 `findSymbols` 命中项的 `moduleName` 查作用域 —— `buildSymbolIndex` 把它覆盖成**定义所在模块**、被例化模块名已丢；改为按「**实例名后缀**」查 `index.instancePaths`。验证：regression **79/79**、e2e-rtl **61/61**（J 段首跑 58/61 → 3 条失败中 2 条为**测试自身设计错误**（`clearWatches()` 只 `splice` 未清 `state.simWatches` → `render()` 复活行）、1 条为**真 bug**（改实现不改断言）；最终全绿，无 404/无控制台异常）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建（22:49:32、21,982,720 B、`v0.4.0 build 2026-09-10 22:49:32 a201338`，`a201338` = 构建时 HEAD）、C8 特征串核验通过（`openPicker`=3/`showScopePicker`=3/`addModulePortsFromCode`=4/`modulePortsStatus`=2/`addVcdPathsToWave`=4/`pickerMode`=4/`hotkey4`=1/`Ctrl+Alt+4`=12，全 >0）；**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9 守住）。踩坑记入 06 P36、决策 07 D19；**#76（B1~B5）+ #87①②③ 全部收口**，下一项 = **侧栏 / 整体 UI 重构设计方案**（08 §2，先出方案 review） |

---

## 3. 日志模板

```markdown
# YYYY-MM-DD WavePaint 工作日志

## 本轮目标
1. ...

## 做了什么
- ...

## 关键结论
- ...

## 验证结果
- `node tools/regression.mjs`：...
- `node tools/e2e-sim.mjs`：...
- `node tools/probe-param.mjs`：...

## 遗留问题
- ...

## 交付提醒
- 重启应用
- 从唯一路径启动
- 面板版本号自查
```

---

## 4. 日志维护规则

- 每次工作新建或追加当日日志。
- 日志只记“做了什么、为什么、验证结果、遗留问题”，不重复需求台账。
- 涉及新坑，同步写入 `06-PITFALLS.md`。
- 涉及新决策，同步写入 `07-DECISIONS.md`。
- 涉及路线图变化，同步写入 `08-ROADMAP.md`。
