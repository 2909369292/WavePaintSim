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
> **主线下一项 = #76 B1**（模块体内符号索引 + VCD scope 映射）。

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
| #76 | 代码点变量 → 加波形 + 树↔代码双向跳转 + 信号组入 `.wp` | ⬜ **近期下一项（#86 已收官，第一顺位开工 B1）**（#85 的 VCD 侧已完成） | 底层：**模块体内符号索引**（reg/wire/net/端口/实例名 → 行号 → 映射到 VCD scope 全路径）、多实例歧义候选数据（同名模块 N 次例化 → 让用户选 instance scope）；交互（仿 Verdi Get Signals/nWave）：**代码内点变量名加波形为唯一主路径**（B4，“中追”式 = #87①；第十二轮澄清 RTL 树不再点行加信号）、树↔代码双向跳转、信号组/观察行随 `.wp` 存档恢复（`sourceFiles` 已由 A4 打通，B5 直接沿用同一存档桥） |
| #87①/② | 源码选中变量 → 加波形（Ctrl+W）、模块全部接口一键入波形（Ctrl+4） | ⬜ 优先级提高 | 用户将 #87 整体优先级提高；① 即“代码内点变量名→加波形”（与 #76 目标合流，建议并入 #76 实现而非另起）；② 是模块/实例全部接口批量入波形（= “Ctrl+4”），建议紧跟 #76 收尾落地；③ 信号组管理与 #76 信号组入 `.wp` 合流；④ Active Annotation 随 #77 移远期 |

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

> **状态：⬜ 未开工；#86 已于第十四轮收官，本批为近期下一项（第一顺位 = B1）。**
> 可直接复用 #86 A1 打好的解析底座：`rtl-nav.js` 的 `scanInstances` / `collectModuleDefs` /
> `resolveModuleDef` / `maskStrings`（抹白字符串与注释，供符号扫描安全复用）；A4 的 `.wp`
> 存档桥（`installProjectArchiveBridge` / `injectArchiveSourceFiles`）也是 B5 信号组存档的现成入口。

- **B1 底层：模块体内符号索引 + scope 映射**：`parseVerilogDesign`/`rtl-nav` 只覆盖模块头
（端口/参数/实例）；要“点代码变量加波形”，需补模块体内声明索引（reg/wire/参数/端口/
实例名 → 行号），并把符号映射到 VCD 点分 scope（模块例化路径 + 信号名）。这是本批
“解析能力增强”的核心，也是“双向跳转/反向高亮”的底座。
- **B2（撤销，第十二轮）**：原「RTL 树点行加波形」取消 —— 用户明确 RTL 树只做代码层级浏览，
  不显示接口/信号、不承担加信号交互。不再实施。**RTL 树瘦身（删端口/参数分组与端口计数）的
  首批实施已完成 2026-09-09**（rtl-panel.js UI 只删不增，数据层不变；e2e-rtl 16/16 +
  exe 重建 22:19:04，见 04 §4.10）。
- **B3 交互：代码 ↔ 树双向跳转**：已有“树 → 代码”；补“代码符号/行 → 反向高亮/定位
  RTL 树与 VCD 树节点”。
- **B4 交互：代码内点变量名 → 加波形**（= #87① / “中追”式）：源码选中/悬停变量 +
  快捷键（仿 Ctrl+W）→ 经 B1 映射 + #85 `pickVcdSignalIntoWave` 链路加入波形。**这是唯一的
  加信号主路径**（第十二轮澄清）；同名模块多次例化时经 B1 的 instance scope 候选数据弹
  选择器（不放在 RTL 树上）；不引入单独“信号层次选择框”，只对代码操作（用户明确不想要）。
  同时把“运行仿真后全量自动加信号/回填”（#83③c 遗留）与 B4 语义统一为“用户主动点”。
- **B5 交互：信号组入 `.wp`**：GroupManager 组 + 观察行（`simWatches`）随工程存档恢复；
  （承接 A4 的话）源码集合一并存档。

---

## 2. 规划线（优先级提高）：侧栏 / 整体 UI 重构（仿 Verdi 布局）

> 用户第十一轮明确“侧栏 UI 重构设计的优先级提高”。现状：侧栏已超规划（按钮 + 代码 +
> RTL 树 + VCD 树 + 仿真控制 + 状态区挤在一起），且主线交互（Get Signals 语义、源码行内
> 交互、双向跳转）落地后侧栏还会继续变——**UI 重构应与功能主线并行推进设计**，不宜拖到
> 最后。

- **目标布局草案（仿 Verdi nTrace/nWave 三区语义；第十二轮口径修正）**：
  ① 层级树区（**RTL 树只做代码层级浏览**：文件 → 模块 → 实例，点击跳源码，无端口/参数/
     加信号能力；信号浏览与“加入波形”统一走 VCD 树 + 代码区点选）；
  ② 代码区（CM6 + 行内交互：**点/选中变量加波形** = 加信号主路径、Active Annotation 位）；
  ③ 波形画布区 + 仿真控制/工具条整理收敛。
- **节奏建议**：先出一版「UI 重构设计方案」（含现状问题清单、布局草案、与主线的衔接点）
  给用户 review；方案确认后再实施。侧栏现有“功能已超越原规划”的按钮/面板归类与隐藏策略
  一并设计。
- **工作方式**：可评估“把 UI 设计交给其它 AI / 设计模型出稿、人类 review”的可行性与
  输入素材要求（需先把交互清单/现状 DOM 结构写清楚）——作为本规划线的一个选项，等用户拍板。

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
