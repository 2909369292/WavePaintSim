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
