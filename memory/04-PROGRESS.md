# 04 · 项目进展同步（跨 AI 接手必读）

> 本文件回答“现在做到哪了、下一步做什么、最近一轮发生了什么”。
> 每次任务开始/结束都必须更新本文件，保证下一个 AI 不用翻完整日志也能接手。

---

## 1. 当前状态快照（2026-09-13，第二十七轮后）

| 项 | 状态 |
|---|---|
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 代码状态 | 主线可用，`main` 分支 |
| 构建产物 | `D:\Files\Code\波形\WavePaintClean.exe` |
| 最近完成（第二十一轮） | **侧栏「可拖拽多面板」落地（2026-09-11 第二十一轮，见 §4.19 + 08 §2.2/§2.6）** —— 用户拍板「面板形态采用可拖拽多面板，暂不将层次树左置，实践步骤自行规划」后，**当轮直接落地**（不再是原 P2 远期）：`#sim-panel` 内 4 张卡片（源码 / RTL 树 / VCD 树 / TB）改为 `<section class="sim-card">` + `.sim-card-head`（可折叠）+ 卡片间 **3 条纵向 `.sim-split` 拖拽分隔条**；侧栏左缘新增 `#sim-resize-x` 竖向拖拽改宽度（clamp 280 ~ min(760, 视口*60%)）；布局状态**只存 `sessionStorage`**（key `wavepaint.sim-panel-layout.v1`，**绝不进 `.wp`**）；**所有既有 id/class 一个未改**（契约面全数保住）。新增 `js/sim/panel-layout.js`（约 520 行）。**顺带修掉一个真 bug（= 用户反复报「点仿真无响应」的又一根因）**：矮窗口（750×485）下源码卡被压到 80px、170px 的 `.source-toolbar` 被裁 → `#sim-run` 点击坐标落到 VCD 卡上、仿真根本不触发 → 新增 `measureMinHeight`/`applyMinHeights` + `.sim-panel-body{overflow-y:auto}` + `#sim-status{position:sticky}` 修复。exe 已重建（22,012,416 B / 2026-09-11 00:15:01） |
| 最近完成需求 | **#87②：模块/实例全部接口一键入波形（2026-09-10 第十九轮落地，见 §4.17）**；**第二十一轮新增「UI 形态拍板」：可拖拽多面板 + 侧栏保持右侧 + 层次树暂不左置（见 §4.19 / 08 §2.2）**。此前 **#76 已收口**：B5（第十八轮，§4.16）、B3（第十七轮）、B4（第十六轮）、B1（第十五轮）、**#86 A1~A4**（第十四轮）、**#86 服务在线性**（第十三轮）、**#85**（第十轮）、第十二轮 RTL 树瘦身、第六轮 5 项 + #93 收官 |
| 最近完成文档 | **第二十一轮记忆同步**（2026-09-11）：新增 §4.19（可拖拽多面板落地全记录 + 矮窗口工具栏裁剪修复）、08 §2.2/§2.6 把三条取舍写成**已拍板结论**并重写分期（本轮一次落地原 P2 核心）、07 D20 升级为「**已采纳：可拖拽多面板**」+ 新增 **D21**、09 §3 切第二十一轮、当日日志「第二十一轮」、`05-LOGS.md` 索引、`INDEX.md` 页脚、03「其它规划」段。叠加生效的仍是**第十二轮澄清**：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4，**已落地**）；RTL 结构树为纯代码层级浏览（文件→模块→实例），不显示接口信号、不承载加信号交互（原 #76 B2 撤销）。见 §4.10 / 03 表 F/H / 08 §1.2/§2 |
| 最近一轮（第二十一轮，2026-09-11） | **侧栏「可拖拽多面板」落地（用户拍板后首轮 UI 实施，详见 §4.19）**。用户三条裁决：① 面板形态 = **可拖拽多面板**（splitter）；② 侧栏**保持右侧**、`#main-area` 骨架不动；③ 层次树**暂不左置**；实施步骤授权 AI 自定 → **当轮一次落地（原 P2 核心，不再远期）**。① `index.html`：`#main-area` padding-right 与 `#sim-panel` width 改读 `var(--sim-panel-w,328px)`；新增 `.sim-panel-body`（纵向 flex + `overflow-y:auto`）/`.sim-card*`（卡片+折叠头）/`.sim-split`（10px 纵向拖拽条 + `.disabled`）/`#sim-resize-x`（左缘 7px 宽度条）/`body.sim-resizing`；**`#sim-status` 加 `position:sticky;bottom:0`**；DOM 重排为 4 个 `<section class="sim-card" data-sim-card>` + 3 个 `<div class="sim-split" data-sim-split>`，新增 `#sim-panel-body`/`#sim-resize-x`，**所有既有 id/class 一个未改**；`#sim-tb-copy` 移进 TB 卡片头；`#sim-addsignals` 的 `title` 降级说明。② `js/sim/panel-layout.js`（新增约 520 行）：`installSimPanelLayout({panel,body,handle,storageKey,onLayout})` —— 折叠（标题行内 button/a/input/select/textarea/label 点击不折叠，保护 `#sim-tb-copy`）、像素权重高度（`flex-grow=权重/总权重*100`+`flex-basis:0`，默认 `{source:300,rtl:245,vcd:245,tb:190}`）、**`measureMinHeight`/`applyMinHeights`**（固定块按实测高、弹性块按自身 min-height，`min-height=min(实测, 面板可视高*0.8)`）、splitter 拖拽（`resizePair` 重分配 + `body.sim-resizing` + 折叠则 `.disabled`）、`setWidth` clamp 280~min(760,视口*60%) + rAF 节流派发 `window resize`、**仅 `sessionStorage`**（`wavepaint.sim-panel-layout.v1`，`{v,w,c,width}`，220ms 防抖）、键盘可达（splitter `ArrowUp/Down` ±16px、`#sim-resize-x` `ArrowLeft/Right`）、导出 `{getState,setWidth,reset,destroy}`。③ `js/sim/ui-bridge.js`：接入 `installSimPanelLayout` + `initPanelLayout()`（`bindEvents()` 后）、`refs.panelBody`/`refs.resizeHandle`、**删死引用 `el("sim-collapse")`**、`__wpsim` 增 `panelLayout`/`setPanelWidth`/`resetPanelLayout` 探针。④ `js/sim/rtl-panel.js`：`installCodeEditor` 返回值加 `remeasure()`（CM6 ResizeObserver <75ms 跳过保护会导致拖 splitter 漏重排）。⑤ `tools/e2e-ui.mjs` +**I0~I8（13 条）→ 86/86**。**本轮真 bug 修复**：headless Edge 视口 750×485 下源码卡只剩 80px、其 `.source-toolbar` 实测 170px → 工具栏被裁 → `#sim-run` 坐标点击落到 VCD 卡、仿真不触发（= 用户反复报的「点仿真无响应」又一根因）；`verify-recovery2` D1/D1b 首跑即复现，修复后 17/17。exe 重建（22,012,416 B / 2026-09-11 00:15:01）。**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9） |
| 更早（第二十二轮，2026-09-13，**纯规划 / 零产品代码改动**） | **面板系统重构方案成文 + 后端能力盘点**（用户要求「确认现在完成的功能 + 汇报后端支持如何 + 做出详细项目安排」）。落盘 **08 §6**：§6.1 后端能力表（传输/仿真/解析/激励/回显/存档/快照/可用性，全部带文件行号证据）/ §6.2 后端缺口 **G1~G8**（G1 TB 只读=最大缺口、G2 无日志与进度、G3 编译选项不可配、G4 无取消、G5 VCD 全量文本、G6 `/api/snapshot` 未接线、G7 单顶层、G8 解析器是 SV 子集）/ §6.3 前端面板现状 / §6.4 差距表 / §6.5 选型（**自研 dock 引擎为主**，Lumino/golden-layout 备选，React 系与 iframe 多窗否决）/ §6.6 目标架构（PanelRegistry + LayoutTree + DockDnD 三层，左/中/右/下四区 + 页内浮动层）/ §6.7 契约面与 e2e 影响面 / §6.8 分期 **#94 D0~D4 + #95 E1~E5 + #96 W1~W3** / §6.9 验收与回滚 / §6.10 四条待拍板 / §6.11 与远期关系。**本轮不重建 exe**（C1 未触发）。详见 04 §4.20、03 表 K、07 D22、日志 2026-09-13。**下一步 = 用户对 08 §6.10 四条拍板后才开工（D20「先方案后实施」）** |
| 上一轮（第二十三轮，2026-09-13） | **用户四条拍板（全部通过）+ 交付零后端纯前端 UI 原型**（详见 §4.21）。拍板：① 面板形态 = **页内浮动面板**（不做真独立 OS 窗口）；② **解除**「侧栏保持右侧」；③ **解除**「层次树暂不左置」；④ 布局**暂不写 `.wp`**。另令：**G1~G8 全部暂不实现**（#95 整线后延）、**布局/预设/手感可先不做**，先只交付「假界面」给用户 review。产出：新增 `prototype/`（`ui-mockup.html` 9,625 B + `ui-mockup.css` 19,279 B + `ui-mockup.js` 45,656 B ≈960 行）= **完整轻量停靠引擎原型**（`split`/`tabs` 布局树、8 面板、3 预设、四向停靠 + Tab 合并 + 最外环新建区、浮出/最大化/收回、分隔条像素→比例、`Ctrl+Alt+1/2/3/0`、`localStorage['wavepaint.mock.layout.v1']` 400ms 防抖、`window.__mock` 探针）；主题变量逐条抄自真机 `:root`、类名统一 `mk-` 前缀、**与真前端零命名冲突**。验收：新增 `tools/mock-probe.mjs`（真实 Edge headless + CDP + dev-server）**34/34 全通过**，含真实鼠标拖拽、浮窗拖动、布局体检 F1~F10（无裁切/无溢出/图片全加载）。**原型内修掉 4 个真缺陷**（忽略 `opts.x/y` / `applyPreset` 忽略预设名 / 浮窗拖动无落点提示 / `pointerup` 无坐标）。**C1 未触发、未重建 exe**，`prototype/` 与 `tools/` 均不进 `resources.txt` |
| 上一轮（第二十四轮，2026-09-13） | **控件与工具栏规范化 U 线：方案定稿（08 §7）+ 可复算审计工具转正 + 原型 U0 重排完成（全绿，等用户拍板）**（详见 §4.22）。用户原话：「UI 排布在大体上基本正确，**小的按钮上的排布以及控制栏的排布还需要斟酌，现在似乎有一些混乱**，大体上可以按照此方案进行改动，**请给出之后的工作方案**」→ 判定 = **形态层已通过（第二十三轮四区 dock / 页内浮窗 / 多 Tab / 3 预设），本轮只做控件层**，编号 **U0~U4**。产出三件：① **`08 §7` 方案全文**（§7.1~§7.10，含实测问题清单 **P-UI-01~09** + 铁律 **R1~R9** + 目标分层 **L0~L4** + 主方案 **D-UI-A**（14 个波形类控件从全局带下沉到波形面板上下文带，全局带 **34→14 个顶层元素**）/ 备选 D-UI-B + 刻度规范 + 溢出降级 + U0~U4 分期 + 与 §6 D 线合并总排期 ≈8~9 工作日 + 四条待拍板）；② **`tools/ui-audit.mjs` 转正**（真实 Edge headless + CDP 测量工具，`--mock`/`--real`/`--all`/`--check`/`--widths=`，`violationsOf()` 与 R3/R5/R6/R8/R9 一一对应）；③ **原型 U0 重排**（`prototype/ui-mockup.{html,css,js}`：`#toolbar` 重写为 L1 11 项 + `⋯`、波形/源码/树/文件/属性面板带全部改 `.mk-tbg` 分组 + `⋯`、新增 `setupBands()` 按 `data-ovp` 收组 / `setupFlyouts()` / `setupCtlFeedback()` 假交互、:`:root` 加 6 个刻度变量、删 `.mk-hintbar`（R9）与全部散落 margin（R5）、状态栏三段化 + `#st-ctx`）。**实测**（全部实跑）：`tools/mock-probe.mjs` **34/34**、`tools/ui-audit.mjs` mock **1680 与 1280 两档违规 0**（此前 3 / 6）；真机基线（未改，**待 U3 修**）= 1920 违规 1 / 1440 溢 32px / 1280 溢 192px。**C1 未触发（只改 `prototype/` + 新增 `tools/`，均不进 `resources.txt`）→ 未重建 exe** |
| 上一轮（第二十五轮，2026-09-13） | **U0-R 顶栏统一（撤销 D-UI-A）+ 真机面板 splitter 高度模型根本重写 + 三条真 bug 修复 + 混淆残留清零**（详见 §4.23）。用户原话：「**波形的时间标 1234 等错误地放在了源码区**」「**波形区的子波形区现在不添加功能栏，功能栏仍旧放在统一的顶栏**」「现在各个窗口的**大小拖拽有 bug，似乎和鼠标坐标对不上**」「**已有绘图 UI 尽量不做改动**」「编辑栏先不做修改」。**① 原型 U0-R（`prototype/ui-mockup.{html,css,js}`）**：把第二十四轮 D-UI-A 下沉到波形面板带的控件**全部收回统一顶栏** `#toolbar`（5 组 18 个绘图/编辑控件，带 `data-ovp`），**整条 `.mk-toolrow` 从波形面板删除**（波形区零子功能栏），帮助浮层 §5 与 `mk-version` 同步（→ `mock-3（顶栏统一 U0-R）`）。**② 真机 `js/sim/panel-layout.js` 重写 splitter 高度模型**（旧实现三处叠加缺陷：`onMove` 把累计位移当增量反复叠加 → 越拖越飞；`weights` 被当像素值但 `applyWeights()` 归一化成占比；`flex-basis:0` + 占比模型触到 `min-height` 后 px↔权重无恒定系数）→ 新模型 `cardBaseline`/`pairSlackPx`/`resizePairTo`/`resizePair`：`applyWeights` 改 `flexBasis = 基线 px + flexGrow = 占比*100 + flexShrink 0`；`applyMinHeights` **同时写 `minHeight` 与 `flexBasis`（同源）**。**③ 三条真 bug**：a) **「时间标跑进源码区」真正根因 = 原型 `.mk-gutter` 未 `white-space:pre`** → 行号换行吃掉宽度（实测 `gutW 369→32`、`bodyW 59→396`；修复后源码区 `ticksInSource 0`）；b) 原型波形刻度类名与菜单勾选冲突 `.mk-tick` → 改 **`.mk-wave-tick`**；c) 原型信号名列宽拖拽完全无效（`closest` → `querySelector`）+ 时间轴与波形轨横滚同步。**实测（全部实跑）**：`e2e-ui` **88/88**（I1 改口径 + 新增 **I4c 指针拖拽**）、`regression` 79/79、`e2e-rtl` 61/61、`e2e-sim` 0 失败、`mock-probe` 34/34、`ui-audit --mock` 1680/1280 两档违规 0。**④ 混淆复查**：`js/wavepaint.clean.js` 无混淆残留，**另清除 9 个残留 `_0x_` 前缀局部变量**（`_0x_wpf*` → `wpf*`，正文 `_0x` 归零）→ **触发 C1，exe 已重建**（`v0.4.0 build 2026-09-13 16:52:06 83fab85`，C8 特征串核验通过） |
| 最新一轮（第二十六轮，2026-09-13） | **原型打包为可双击运行的 exe（交付方式升级）+ 记忆同步**（详见 §4.24）。用户上一轮 review 方式为 `node tools/dev-server.mjs 8951` + 手输 URL，反馈「提供的网页链接无法打开」→ 本轮把第二十五轮 U0-R 原型打包成**双击即用、零依赖、零命令行**的 `WavePaintMockup.exe`。① **新增 `MockupLauncher.cs`（528 行，独立于真机 `WavePaintLauncher.cs`，后者一行未改 → C1 未触发）**：内嵌静态资源 HTTP 服务，端口优先 **17820**（真机 17817）被占则换随机端口，`/api/ping` 返回 **`WAVEPAINT-MOCKUP <构建戳>`**（与真机 `WAVEPAINT-SERVICE` 身份不混），`/mockup-version.txt` 暴露构建戳，`MapPathToResource` 映射（`/`→`prototype/ui-mockup.html`、`ui-mockup.*`→`prototype/`、其余按内嵌资源名、含 `..` 一律 404）；单实例发现 `%TEMP%\WavePaintMockup_service.txt`（`tag=`/`port=`）+ ping 判活；**开窗 = Edge `--app=` 无地址栏窗口**（无 Edge 退默认浏览器），`EnumWindows` + 标题含「原型」判窗口存活（真机标题不含「原型」→ 互不误伤），窗口关掉 **12 秒后自动退出**，最长存活 12 小时；参数 `/nolaunch`（只起服务）/`/port=N`。② **新增 `build-prototype.ps1`（64 行）**：独立构建脚本，**不写 `resources.txt`、不动 `version.txt`、不碰 `WavePaintClean.exe`**；内嵌 `prototype/**` + `img/**` + `mockup-version.txt`；产物 `WavePaintMockup.exe` + `mockup-version.txt`（**脚本必须带 UTF-8 BOM**，否则 PS5.1 读中文乱码 → 06 P38）。③ **新增 `tools/mockup-exe-smoke.mjs`（143 行）无浏览器自检**：`/nolaunch` 起服务后核验 ping 身份 / 首页与静态资源状态码·Content-Type·字节数与磁盘源码逐一相等 / 构建戳 / 404 分支 / HEAD / 4 条原始 socket 路径穿越非 200 → **41/41 ✅**。④ `tools/mock-probe.mjs` 支持外部 `MOCK_BASE`（`argv[2]` / `process.env.MOCK_BASE`），默认行为不变；`prototype/ui-mockup.html` 末尾抓 `/mockup-version.txt` 把构建戳插进顶部绿条（`#mock-version`），dev-server 下 404 静默跳过；`.gitignore` 加 `WavePaintMockup.exe` / `mockup-version.txt`。**实测（全部实跑）**：`build-prototype.ps1` → `csc exit: 0` / `res count: 27` / exe **186,368 B**；`mockup-exe-smoke` **41/41**；`mock-probe`（源码 dev-server）**34/34**；**对 exe 服务跑同一探针 34/34**；`ui-audit --mock` 违规 0；真实双击路径实测（`%TEMP%` 服务文件 `tag=WAVEPAINT-MOCKUP` / `port=17820`、可见窗口标题「WavePaint UI 原型（假界面 · 未连接后端）」、截图 1050×999 / 207 色非白屏、WM_CLOSE 关窗后第 12 秒自动退出、第二实例自动交接退出）。**C1 未触发 → 真机 `WavePaintClean.exe` 未重建**（仍 22,015,488 B / 16:52:06） |
| 最新一轮（第二十七轮，2026-09-13） | **① 修两条用户报的真 bug（拖拽预览≠落位 / 拖动中按钮乱闪，同一根因）+ ② 原型「1:1 完全照搬真机」重构 + ③ 审计口径按 D26 校准 + exe 重新打包**（详见 §4.25）。用户原话：「目前各个面板的**拖动仍然有问题，拖动的预览和最后实际的效果不一致**，且**拖动按钮在拖动时的显示也有 bug**」「代码显示区和菜单栏的显示等**并没有照搬原本的源码**…我要 **1:1 完全一样的效果**，完全一致的效果**起码波形显示区是这样的**」。**① 两条真 bug = 同一根因（06 P39 / 07 D27）**：拖拽闭包**缓存了 DOM 引用**（`el`/`handle`/`slots`），拖拽中途 `afterLayout()` 的 `setTimeout(60ms) → dispatchEvent('resize')` → 原型 `renderFloats()` **重建整棵 DOM** → 缓存的引用变成**游离节点**（实测 `elConnected=false`），样式写进空气 → 预览与落位不一致；`el.classList` 判拖动态失效 → 按钮显隐 CSS 不生效 → 乱闪。**修法（三条）**：a) split 节点补**稳定 id**（`'s-'+(++seq)`）+ `el.dataset.splitId`；b) 拖拽 `move` 里**每次现查活节点**（`[data-float=…]`/`[data-split-id=…]`，`|| el` 兜底），不再用缓存引用；c) `pointermove/up/cancel` **从 handle 改挂 `window`** + 跨重建的拖动态用**模块级变量** `draggingFloatId`（`renderFloats()` 按它拼 `.dragging` 类）+ 松手统一 `renderFloats()`/`persist()` 收尾。加 **I1~I5 五条回归**（重建后仍在拖动 / 预览==落位 / 清理状态 / 分隔条跟随且只改相邻两格 / 逐像素相等）。**② 1:1 照搬**：新增 `tools/gen-mock-page.mjs`（**从真机 `index.html` 逐字生成** `prototype/ui-mockup.html`：机械替换资源路径为 `../css` `../js` `../lib` `../img` + 内联 module 说明符 + 注入 `ui-mockup.css` + 追加 `prototype/mock-tail.html` 外壳；真机文件一律只读）+ 新增 `prototype/mock-tail.html`（工作区宿主/状态栏/帮助浮层/拖拽引擎）；**菜单栏 / 工具带 / 代码区（CodeMirror 宿主）/ 波形显示区 = 真机原样 DOM + 真机原样 CSS + 真机原样 JS**，不再「按预测效果复刻」。实测 `node .e2e-tmp/r37e.mjs` = **13 same / 1 diff**（唯一 diff = sim 卡片 DOM 顺序 `[source,rtl,vcd,tb]→[rtl,source,vcd,tb]`，无害；菜单栏/工具带 outerHTML·矩形·35 个子元素矩形/CodeMirror 文本·行数·字体·颜色·背景/verilog-source 兜底/rtl-tree 前缀/sim-status 文本/主题变量全 SAME）；**像素 diff：波形画布 908×609 `diffPx=78/552972 = 0.0141%`（只差网格虚线抗锯齿亚像素）、chrome band 1680×86 = 0.4713%** → **波形显示区 1:1 达成**。**③ 审计口径（07 D26）**：`tools/ui-audit.mjs` 的 **R5/R6(隐式溢出)/R8 三条「真机自身规范化」规则改为只在 `target==='real'` 判定**，mock 豁免（原型继承真机原生间距 `{4,6,8,10,12,18}` / 真机 1280 溢 192px / 步数越界，属真机待优化 P-UI-02，不是原型缺陷）→ `--mock` **1680/1280 两档违规 0**。**④ exe 重新打包**：`build-prototype.ps1` 内嵌目录由仅 `prototype/` 扩为 **`prototype/ img/ css/ js/ lib/` 五目录（res count 27→54）** → `WavePaintMockup.exe` **186,368 B → 1,709,056 B**；`tools/mockup-exe-smoke.mjs` 资源清单同步（新增 css/js/lib 三项字节数逐一相等；首页断言改 `#workbench`/`#mk-park`/`#menu-bar`/`#toolbar`）→ **56/56 ✅**。**实测（全部实跑）**：`mock-probe` **55/55**（源码 dev-server）+ **对 exe 服务（17899）55/55**；`ui-audit --mock` 两档违规 0；`mockup-exe-smoke` 56/56；真机 vs 原型 13 same/1 diff + 像素 diff 0.0141%。**C1 未触发 → 真机 `WavePaintClean.exe` 未重建**（仍 22,015,488 B / 16:52:06） |
| 当前阻塞 | 无。**U1 闸门已拍板**（第二十五轮用户裁决「波形区不再有子功能栏、功能栏统一放顶栏」→ 否决 D-UI-A / 采纳 U0-R）；**第二十七轮用户再次明确「1:1 完全照搬真机」优先于旧审计口径（D26）**，`08 §7.9-③④`（`⋯` vs 折行 / 刻度 28·24·4·12）用户未提异议，按默认执行。当前唯一待办 = **等用户 review 第二十七轮重新打包的 `WavePaintMockup.exe`**（1:1 真机界面 + 拖拽修复），通过后进 D0+U2。 |
| 下一步主线 | **① 等用户 review 第二十七轮重新打包的 `WavePaintMockup.exe`**（双击 `D:\Files\Code\波形\WavePaintMockup.exe` → Edge 无地址栏窗口打开 **1:1 真机界面**的原型，顶部绿条显示构建戳；**零依赖、零命令行**；关窗约 12s 后进程自动退出）。⚠ 原型页现由 **`node tools/gen-mock-page.mjs` 从真机 `index.html` 生成**：**改真机骨架后必须先重跑生成器、再 `.\build-prototype.ps1`**（exe 内是**构建时快照**）。**② 用户通过后按 08 §7.8 总排期推进**（U 线与 D 线合并；**D-UI-A 已作废**：真机 21 个图标按钮**不下沉**、全部留在 `#toolbar`，U3 只做分组 / 刻度 / 尺寸 / 溢出）：**U2 工具带数据驱动化**（新增 `js/sim/ui/toolbar-spec.js`，24 个冻结 id 不改名，触发 C1 重建 exe）与 **D0 面板注册表 + 宿主容器抽象**（像素级零视觉变化）**合并同批** → **U3 真机工具带落地 + P-UI-02 真 bug 修复**（真机 1440/1280 不再越界）→ **D1 停靠引擎**（把原型的 `split`/`tabs` 模型 + `hitTest` + 落点框搬进 `js/sim/dock/*.js`，**必须遵守 D27：禁止缓存 DOM 引用**）→ **D2** 页内浮动 + 最大化 + 键盘 → **D3** 持久化（sessionStorage + localStorage + 3 预设 + reset，**不写 `.wp`**）→ **D4 + U4** 打磨 + 闸门工具化。**#95（G1~G8）** 已由用户明确暂不实现（方案保留 08 §6.2，恢复前须重新确认意图）；**08 §2.6 三项剩余**（VCD 树移入波形区 / TB 控制带收敛 / 层次树左置）并入 #94 D1；**#84 波形查看增强 / #77 Active Annotation / #78** 仍远期（08 §3）；RTL 树只做代码层级浏览；服务自愈（§4.11）为独立专项（C19 不变量） |
| 测试基线 | regression **79/79**；e2e-rtl **61/61**；**e2e-ui 88/88**（第二十一轮 I0~I8；**第二十五轮 I1 改口径**〔基线模型：`flex-basis` = 卡片基线 px + `flexGrow` 占比 + `flexShrink 0`〕**+ 新增 I4c 指针拖拽**〔拖 DY → 上下卡各 ±DY 且总高守恒、同手势拖回高度可逆〕）；e2e-sim 0 失败；probe-param 全过；**2026-09-13 第二十五轮实测复跑（全部实测）：regression 79/79、e2e-ui 88/88、e2e-rtl 61/61、e2e-sim 0 失败、mock-probe 34/34、probe-param 全过、真 exe 冒烟通过、`verify-recovery2` 17/17**（B4 起「仿真后不全量灌信号」的 e2e-sim 断言仍在守） |
| 原型 / 控件测试基线（第二十七轮更新，**全部实跑**） | **交付方式 = `WavePaintMockup.exe`（双击即用）**；**原型页生成链 = `node tools/gen-mock-page.mjs`（真机 index.html → 1:1 原型页）→ `.\build-prototype.ps1`（内嵌 `prototype/ img/ css/ js/ lib/` 五目录，res count 54）**；无浏览器自检 `node tools/mockup-exe-smoke.mjs` → **56/56 ✅**；**`node tools/mock-probe.mjs` → 55/55**（源码 dev-server 与 exe 服务**两种承载都 55/55**：对 exe 用 `node tools/mock-probe.mjs http://127.0.0.1:<port>`；含 I1~I5 拖拽重建回归）；**`node tools/ui-audit.mjs --mock` → 1680 / 1280 两档违规 0 ✅**（**D26 新口径**：R5 / R6 隐式溢出 / R8 只在真机判定，mock 保留 R3 / R6 控制带禁换行 / R9；产物 `.e2e-tmp/ui-audit-mock.json`）；**真机基线（未修，U3 目标）= 1920 违规 1 / 1680 违规 1 / 1440 违规 3（`#toolbar` 溢 32px）/ 1280 违规 3（溢 192px）**（P-UI-02）；**真机 vs 原型 1:1 比对 = 13 same / 1 diff**（`.e2e-tmp/r37e.mjs`；唯一 diff = sim 卡片 DOM 顺序，无害）+ **像素 diff：波形画布 0.0141% / chrome band 0.4713%**（`.e2e-tmp/r37f.mjs`）；**第二十七轮只动 `prototype/` + `tools/` + `build-prototype.ps1` → 真机四档数字不变、真机 exe 未重建** |
| UI 基线 | e2e-rtl **61/61**（含 #85 D1~D6 + 第十二轮 B3 RTL 树纯层级浏览 + 第十四轮 E1~E6 + 第十五轮 F1~F9 + 第十六轮 G1~G7 + 第十七轮 H1/H2/H3/H4/H4b/H5/H6 + 第十八轮 I1~I6 + 第十九轮 J0~J7）；**e2e-ui 88/88**（真实 Edge；第二十一轮 I0~I8：4 卡 + 3 splitter 装配 / `flex-grow` 归一化 100 且 `flex-basis:0px` / 折叠 `.collapsed`+`display:none`+相邻 splitter disabled+aria / 展开还原 / `ArrowDown` `source=原高+16`·`rtl=原高-16` / 宽度 420·下限 280·上限 760 / sessionStorage v1 落盘 / reset 回 328+展开+300-245-245-190 / 矮窗口 750×485 下 `#sim-run` 命中自身**）；probe-tutorial / probe-addbtn / probe-simfail 全过；真 exe 冒烟通过（端口 17817、core/wpf/doc/canvas/汉化全在、无异常）；**第二十五轮 `js/sim/panel-layout.js` splitter 高度模型根本重写**（`cardBaseline` / `pairSlackPx` / `resizePairTo` + `applyMinHeights` 同源写 `flexBasis`）→ e2e-ui **88/88**（I1 改口径 + 新增 I4c 指针拖拽，用户报的「拖拽和鼠标坐标对不上」根因即旧 `onMove` 累计位移反复叠加）；第十三轮自愈专测 `verify-recovery2.mjs` 17/17 + 真实 Edge 协议探针 `probe-protocol.mjs` |
| 交付提醒 | 重启应用、从唯一路径启动、面板版本号自查（应显示 **`v0.4.0 build 2026-09-13 16:52:06 83fab85`**；⚠ `83fab85` = **构建时 HEAD**（第二十四轮 commit），承载第二十五轮代码的 commit 是它的**下一个** —— **别误判 exe 落后**，口径见 05/09 第十六轮补记）；本次 exe 内置 **第二十五轮 `js/sim/panel-layout.js` splitter 基线模型重写 + 混淆残留清零**、第二十四轮 U 线原型、第二十一轮可拖拽多面板（卡片折叠 + 纵向 splitter + 侧栏宽度 + session 级持久化 + 矮窗口工具栏裁剪修复）、第十九轮 #87②（`Ctrl+Alt+4`）、第十八轮 #76 B5、第十七轮 #76 B3、第十六轮 #76 B4（+ 不再仿真后全量灌信号）、第十五轮 #76 B1、第十四轮 #86 A1~A4、第十三轮服务自愈（端口 17817 + `WPServiceGuard` + `#sim-recover` 按钮）、第十二轮 RTL 树瘦身、#85 与第六轮收官 clean.js。**首次**自愈时浏览器会弹一次「是否允许打开 wavepaint:」，勾选「始终允许」后无感（浏览器安全策略，无法绕过）。**原型交付物（第二十七轮更新）**：`D:\Files\Code\波形\WavePaintMockup.exe` = **1,709,056 B**（2026-09-13 18:55:12；构建戳 `v0.4.0-mock build 2026-09-13 18:55:12 b93ad07`；**内嵌 `prototype/ img/ css/ js/ lib/` 五目录共 54 项资源**；**菜单栏 / 工具带 / 代码区 / 波形区 = 真机 1:1 原样 DOM+CSS+JS**；拖拽「预览==落位」「拖动中按钮不乱闪」已修），双击即用、零依赖、端口 17820，与真机 `WavePaintClean.exe` **互不影响、可同时运行**（身份探针 `WAVEPAINT-MOCKUP` / `WAVEPAINT-SERVICE`）。⚠ **重新打包前必须先关掉正在运行的旧 `WavePaintMockup.exe`**，否则 `csc` 报 `CS0016 未能写入输出文件…另一个程序正在使用此文件`（本轮实测踩到）。原型页由 `node tools/gen-mock-page.mjs` 从真机 `index.html` 生成 → 改真机骨架后**必须先重跑生成器、再 `.\build-prototype.ps1`** |

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
| 2026-09-11 | 第二十一轮：**侧栏「可拖拽多面板」落地（用户拍板后首轮 UI 实施）** | 用户拍板：① 面板形态 = **可拖拽多面板**；② 侧栏**保持右侧**、`#main-area` 骨架不动；③ 层次树**暂不左置**；实施步骤授权 AI 自定 → **当轮一次落地（原 P2 核心，不再远期）**。`index.html` 4 卡改 `<section class="sim-card">` + `.sim-card-head`（可折叠）+ 3 条纵向 `.sim-split` 拖拽条 + 侧栏左缘 `#sim-resize-x` 改宽度（clamp 280~min(760,视口*60%)）；新增 `js/sim/panel-layout.js`（约 520 行 `installSimPanelLayout`：折叠 / 像素权重高度 / splitter / 宽度 / 键盘可达，**只存 sessionStorage**）；`ui-bridge.js` 接线 + 删 `sim-collapse` 死引用 + 探针；`rtl-panel.js` `installCodeEditor` 加 `remeasure()`。**所有既有 id/class 一个未改**（契约面全数保住）。**顺带修掉一个真 bug（= 用户反复报「点仿真无响应」的又一根因）**：矮窗口 750×485 下源码卡只剩 80px、170px 工具栏被裁 → `#sim-run` 坐标点击落到 VCD 卡、仿真不触发 → `measureMinHeight`/`applyMinHeights` + `.sim-panel-body{overflow-y:auto}` + `#sim-status` 吸底修复。`tools/e2e-ui.mjs` +I0~I8（13 条）→ 86/86。验证：regression 79/79、e2e-ui 86/86、e2e-rtl 61/61、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过、`verify-recovery2` 17/17；exe 重建（22,012,416 B / 2026-09-11 00:15:01）；**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9） |
| 2026-09-13 | 第二十二轮：**面板系统重构方案成文 + 后端能力盘点（纯规划文档，零产品代码改动）** | 用户要求「确认现在完成的功能 + 汇报后端支持如何 + 做出详细项目安排」，并给出终局目标 = **Verdi 式波形/代码/代码树等窗口的 Word 式自由排列组合与自由拖拽**。本轮交付 **08 §6**（§6.1 后端能力表 / §6.2 缺口 G1~G8 / §6.3 前端现状 / §6.4 差距表 / §6.5 选型 / §6.6 目标架构 / §6.7 契约面与 e2e 影响面 / §6.8 分期 #94 D0~D4 + #95 E1~E5 + #96 W1~W3 / §6.9 验收与回滚 / §6.10 四条待拍板 / §6.11 与远期关系）。**关键实测结论**：① 后端闭环已通（画布→自动 TB→iverilog→VCD→观察行），但只覆盖「单顶层 + 画布即激励」；关键常量 `ProcessTimeoutMs=30000`、`MaxBodyBytes=8 MiB`、`MaxSnapshots=20`；② **最大缺口 G1 = TB 只读**（`#tb-source` readonly，`ui-bridge.js:1305` 只能自动生成），其次 G2 无日志/进度、G3 无编译选项、G4 无取消、G5 VCD 全量文本、G6 `/api/snapshot` 未接线、G7 单顶层、G8 解析器为 SV 子集；③ 选型建议**自研轻量 dock 引擎**（`js/sim/dock/*.js`，契约面可控 + 复用 D21 `remeasure()` 经验），Lumino/golden-layout 备选，React 系与 iframe 多窗否决（后者重踩 #82 老坑）；④ 架构三层 = `PanelRegistry`（复用现有 DOM 节点、只搬父容器 → id 天然不变）+ `LayoutTree` + `DockDnD`，四区 + 页内浮动层；⑤ 分期 **D0 零视觉变化是关键闸门**（回滚=1 commit）；**#95 E1+E2 与 #94 正交、建议并行优先**；⑥ 门禁 = 用户对 §6.10 四条拍板（解除「侧栏保持右侧」/解除「层次树暂不左置」/浮出=页内浮动 vs 真独立窗口/布局是否进 `.wp`）。本轮不触发 C1、不重建 exe；见 04 §4.20、03 表 K、07 D22、日志 2026-09-13 |
| 2026-09-13 | 第二十三轮：**四条拍板 + 零后端纯前端 UI 原型交付（D-1 闸门）** | 用户拍板 §6.10 四条**全部通过**（页内浮动面板 / 解除「侧栏保持右侧」/ 解除「层次树暂不左置」/ 布局暂不写 `.wp`），并下令 **G1~G8 全部暂不实现**、**布局与预设可先不做**，要求先做**不连后端、无功能的假界面**供 review。本轮交付 `prototype/ui-mockup.{html,css,js}`（≈960 行轻量停靠引擎：`split`/`tabs` 布局树 + 8 面板 + 3 预设 + 四向停靠/Tab 合并/最外环新建区 + 浮出/最大化/收回 + 分隔条像素↔比例 + `Ctrl+Alt+1/2/3/0` + `localStorage` 400ms 防抖 + `window.__mock` 探针；主题变量抄自真机 `:root`，类名 `mk-` 前缀零冲突）。验收：`tools/mock-probe.mjs`（真实 Edge headless + CDP + dev-server）**34/34 全通过**（含真实鼠标拖拽 B0~B3、浮窗拖动 C 组、布局体检 F1~F10）。原型内修 4 个真缺陷。**C1 未触发、未重建 exe**（`prototype/`、`tools/` 均不进 `resources.txt`）。**下一步 = 等用户 review 原型形态**，通过后进 D0/D1 真接线。详见 §4.21 / 07 D22 / 08 §6.10 / 日志 2026-09-13 |
| 2026-09-13 | 第二十四轮：**控件与工具栏规范化 U 线 —— 方案定稿（08 §7）+ 审计工具转正 + 原型 U0 重排（等用户 U1 拍板）** | 用户 review 第二十三轮原型后判定「**UI 排布在大体上基本正确**，小的按钮上的排布以及控制栏的排布还需要斟酌，现在似乎有一些混乱」，授权「大体上可以按照此方案进行改动」并要求「**给出之后的工作方案**」→ **形态层通过、只做控件层**（编号 **U0~U4**）。交付三件：① **`08 §7` 全文**（§7.2 **P-UI-01~09** 实测问题清单〔含 **P-UI-02 = 真机 `#toolbar` 1440 溢 32px / 1280 溢 192px 的真 bug**〕/ §7.3 **R1~R9 铁律** / §7.4 **L0~L4 分层 + 主方案 D-UI-A**（真机 21 个图标按钮中 **14 个波形类控件下沉到波形面板上下文带**，全局带 **34 → 14 个顶层元素**）/ 备选 D-UI-B / §7.5 刻度规范 / §7.6 `⋯` 溢出降级 / §7.7 **U0~U4 分期** / §7.8 **之后的工作方案（与 §6 D 线合并总排期 ≈8~9 工作日）** / §7.9 **四条待拍板**）；② **`tools/ui-audit.mjs` 由临时脚本转正入库**（真实 Edge headless + CDP 量测，`--mock` / `--real` / `--all` / `--check` / `--widths=`，`violationsOf()` 与 R3/R5/R6/R8/R9 一一对应）；③ **原型 U0 重排**（`prototype/ui-mockup.{html,css,js}`：`#toolbar` 重写为 L1 11 项 + `⋯`、各面板带改 `.mk-tbg` 分组 + `⋯`、`:root` 加 6 个刻度变量、删 `.mk-hintbar`、状态栏三段化 + `#st-ctx`、新增 `setupBands()` / `setupFlyouts()` / `setupCtlFeedback()`）。**实测**：`tools/mock-probe.mjs` **34/34**；`tools/ui-audit.mjs` 原型 mock **1680/1280 两档违规 0**（改动前 3/6）；**真机基线未修 = 1440 溢 32px / 1280 溢 192px（P-UI-02，待 U3）**。**C1 未触发、未重建 exe** |
| 2026-09-13 | 第二十五轮：**U0-R 顶栏统一（撤销 D-UI-A）+ 真机 splitter 高度模型重写 + 三条真 bug 修复 + 混淆残留清零** | 用户四条原话：① 「**波形的时间标 1234 等错误地放在了源码区**」；② 「**编辑栏先不做修改**……保存图标、撤回图标、放大缩小图标等**还放到此位置**（统一顶栏），**波形区的子波形区现在不添加功能栏**，功能栏仍旧放在统一的顶栏那里」；③ 「现在各个窗口的**大小拖拽有 bug，似乎和鼠标坐标对不上**，而且检查显示等其他 bug」；④ 「**已有绘图 UI 尽量不做改动**……如果是很混淆过的，请查明问题之前做过的所有代码的解混淆和剔除工作」。**① 原型 U0-R**：`prototype/ui-mockup.{html,css,js}` —— 撤销第二十四轮 D-UI-A，把下沉到波形面板带的控件**全部收回 `#toolbar`**（5 组 18 项，`data-ovp`），**删除波形面板整条 `.mk-toolrow`**（波形区零子功能栏），帮助浮层 §5 + `mk-version`（→ `mock-3（顶栏统一 U0-R）`）同步。**② 真机 `js/sim/panel-layout.js` 根因重写**：`cardBaseline` / `pairSlackPx` / `resizePairTo` / `resizePair`；`applyWeights` = `flexBasis: 基线px` + `flexGrow: 占比*100` + `flexShrink: 0`；`applyMinHeights` **同源同时写 `minHeight` 与 `flexBasis`**（此前窗口 resize 只重算 min-height → flex-basis 留在旧值 = 拖拽错位根因之一）。**③ 三条真 bug**：a) **时间标跑进源码区根因 = 原型 `.mk-gutter` 缺 `white-space:pre`** → 行号换行吃掉宽度（`gutW 369→32`、`bodyW 59→396`，修复后 `ticksInSource 0`）；b) 原型 `.mk-tick` 与菜单勾选类名冲突 → 波形刻度改 **`.mk-wave-tick`**；c) 原型信号名列宽拖拽全失效（`closest` → `querySelector`）+ 时间轴与波形轨横滚同步（`tracks.scrollLeft` → `axisScroll.scrollLeft`）。**④ 混淆复查**：`js/wavepaint.clean.js` 无混淆残留（`_0x55bf` / `\xNN` 等均在注释或为 ✕ 字符 / 产品功能），**另清除 9 个残留 `_0x_` 前缀局部变量**（`_0x_wpf*` → `wpf*`）→ 正文 `_0x` 归零。**实测（全部实跑）**：e2e-ui **88/88**（I1 改口径 + 新增 I4c）、regression 79/79、e2e-rtl 61/61、e2e-sim 0 失败、mock-probe 34/34、ui-audit --mock 1680/1280 违规 0；真机四档数字不变（U3 修）。**C1 触发（改了 `js/`）→ exe 已重建**（22,015,488 B / 2026-09-13 16:52:06 / `v0.4.0 build 2026-09-13 16:52:06 83fab85`，C8 特征串核验通过） |
| 2026-09-13 | 第二十六轮：**原型打包为可双击运行的 exe（交付方式升级：网页链接 → 零依赖 exe）** | 用户反馈「提供的网页链接无法打开，请按照原本之前的方式一样打包成一个可直接运行的点 exe 供我 review」→ 上一轮 review 链路（`node tools/dev-server.mjs 8951` + 手输 `http://127.0.0.1:8951/prototype/ui-mockup.html`）需 Node + 手输地址，本轮改为**双击 exe 即用**。① **新增 `MockupLauncher.cs`（528 行）**：自包含静态资源 HTTP 服务 + Edge `--app` 无地址栏窗口；端口优先 **17820**（真机 17817），冲突则随机；`/api/ping` = **`WAVEPAINT-MOCKUP <构建戳>`**（与真机 `WAVEPAINT-SERVICE` 身份隔离）；`/mockup-version.txt` 暴露构建戳；单实例发现 `%TEMP%\WavePaintMockup_service.txt`（`tag=`/`port=`）+ ping 判活；`EnumWindows` + 标题含「原型」判定窗口存活（真机标题不含「原型」→ 互不误伤）；关窗 **12s 后自动退出**、最长 12h；`/nolaunch`、`/port=N` 两参数。**独立于真机 `WavePaintLauncher.cs`（一行未改）**。② **新增 `build-prototype.ps1`（64 行）**：不写 `resources.txt`、不动 `version.txt`、不碰 `WavePaintClean.exe`，只产 `WavePaintMockup.exe` + `mockup-version.txt`（**须带 UTF-8 BOM**，见 06 P38）。③ **新增 `tools/mockup-exe-smoke.mjs`（143 行）** 无浏览器冒烟 **41/41**。④ `tools/mock-probe.mjs` 支持 `MOCK_BASE`（argv[2]/env）；`prototype/ui-mockup.html` 顶部绿条显示构建戳；`.gitignore` 加两产物。**实测：exe 186,368 B / 2026-09-13 17:08:12，构建戳 `v0.4.0-mock build 2026-09-13 17:08:12 2d1636a`；mockup-exe-smoke 41/41、mock-probe 34/34（源码 + exe 双跑）、ui-audit --mock 违规 0、真实双击路径全流程实测通过**。**C1 未触发 → 真机 exe 未重建**（仍 22,015,488 B / 16:52:06） |
| 2026-09-13 | 第二十七轮：**拖拽两条真 bug 修复（同一根因）+ 原型「1:1 完全照搬真机」重构 + 审计口径校准 + exe 重打包** | 用户原话：① 「目前各个面板的**拖动仍然有问题，拖动的预览和最后实际的效果不一致**，且**拖动按钮在拖动时的显示也有 bug**」；② 「代码显示区和菜单栏的显示等**并没有照搬原本的源码**，我希望**完全照搬它的源码，做出 1:1 的效果**，只是原本是全屏的，现在是面板而已，而不是按照预测的显示效果等进行复刻，我要 **1:1 完全一样的效果**，完全一致的效果**起码波形显示区是这样的**」。**① 拖拽两 bug = 同一根因（06 P39 / 07 D27）**：拖拽闭包**缓存 DOM 引用**，拖拽中途 `afterLayout()`（60ms `setTimeout` + `resize`）触发 `renderFloats()` **重建整棵 DOM** → 缓存引用变**游离节点**（实测 `elConnected=false`）→ 写样式进空气（预览≠落位）、`classList` 判拖动态失效（按钮乱闪）。修法：split 补**稳定 id** + `data-split-id`；`move` 里**每次现查活节点**（`|| el` 兜底）；`pointermove/up/cancel` **挂 `window`** + 模块级 `draggingFloatId` 承载拖动态 + 松手统一 `renderFloats()/persist()`；新增 `.mk-float.dragging` 样式；加 **I1~I5 五条回归**、`E2` 过滤 `ERR_ABORTED`。**② 1:1 照搬**：新增 `tools/gen-mock-page.mjs`（**从真机 `index.html` 逐字生成** `prototype/ui-mockup.html`：资源路径 → `../css ../js ../lib ../img` + 内联 module 说明符 + 插 `ui-mockup.css` + 追加外壳；真机文件**只读**）+ 新增 `prototype/mock-tail.html`（工作区/状态栏/帮助浮层/拖拽引擎）；菜单栏·工具带·代码区·波形区 = **真机原样 DOM+CSS+JS**。实测 `.e2e-tmp/r37e.mjs` = **13 same / 1 diff**（唯一 diff = sim 卡片 DOM 顺序，无害）+ 像素 diff **波形画布 0.0141% / chrome band 0.4713%** → **波形显示区 1:1 达成**。**③ 审计口径（07 D26）**：R5/R6 隐式溢出/R8 改为**只在真机判定**，mock 豁免 → `ui-audit --mock` 两档违规 0。**④ exe 重打包**：内嵌目录扩为 `prototype/ img/ css/ js/ lib/`（res 27→54）→ `WavePaintMockup.exe` **186,368 B → 1,709,056 B**；`mockup-exe-smoke` **56/56**。⚠ 打包前须 `taskkill /F /IM WavePaintMockup.exe`（否则 `CS0016 文件被占用`）。**实测：mock-probe 55/55（源码 + exe 双跑）、ui-audit --mock 违规 0、mockup-exe-smoke 56/56**。**C1 未触发 → 真机 exe 未重建**（仍 22,015,488 B / 16:52:06） |

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
> ⚠ **本段（第二十轮）结论已被第二十一轮取代**：用户已于 2026-09-11 拍板（可拖拽多面板 / 侧栏保持右侧 / 层次树暂不左置）并当轮落地，见 04 §4.19、08 §2.2·§2.6、07 D20/D21、日志 `2026-09-11.md`。

---
### 4.19 ✅ 已完成：侧栏「可拖拽多面板」落地（第二十一轮 2026-09-11）—— 用户拍板后的首轮 UI 实施

> 用户指令：「面板形态采用可拖拽多面板，暂不将层次树左置，至于具体的实践步骤和实践方式，
> 自行规划」。→ 三条裁决（① 面板形态 = **可拖拽多面板**；② 侧栏**保持右侧**、`#main-area`
> 骨架不动；③ 层次树**暂不左置**）+ 实施步骤授权 AI 自定 → **本轮一次性落地**（不是原 P2 远期）。
> 08 §2.6 分期据此重写；07 D20 由「待 review」升级为「**已采纳**」。

**本轮做了什么**

1. `index.html`
   - `#main-area` 的 `padding-right` 与 `#sim-panel` 的 `width` 改读 CSS 变量
     `var(--sim-panel-w, 328px)`；新增 `body.sim-resizing #main-area{transition:none}`（拖拽时关过渡）。
   - 新增整套 CSS：`.sim-panel-body`（纵向 flex 容器，`overflow-y:auto; overflow-x:hidden`）、
     `.sim-card` / `.sim-card-head` / `.sim-card-chevron` / `.sim-card-body`、`.sim-split`
     （10px 纵向 splitter + `.disabled` 态）、`#sim-resize-x`（侧栏左缘 7px 竖向拖拽条）。
   - **`#sim-status` 加 `position:sticky; bottom:0`**（面板区整体滚动时状态条吸底，仿真进度不被顶出视口）。
   - DOM 重排：4 张卡片 = `<section class="sim-card" id="sim-card-source|rtl|vcd|tb" data-sim-card="…">`，
     每张含 `.sim-card-head`（`data-sim-card-toggle`）+ `.sim-card-body`；卡片间 3 条
     `<div class="sim-split" data-sim-split="source:rtl|rtl:vcd|vcd:tb">`；新增 `#sim-panel-body` 与 `#sim-resize-x`。
   - **所有既有 id / class 一个未改**（契约面全数保住）；`#sim-tb-copy` 从 `.tb-title-row` 移进 TB 卡片头；
     `#sim-addsignals` 的 `title` 顺带改为「按端口给画布建激励（不加入 VCD 观察行；加波形请在代码里双击变量）」。

2. `js/sim/panel-layout.js`（**新增，约 520 行**）
   - 导出 `installSimPanelLayout({panel, body, handle, storageKey, onLayout})`，**只做布局**：
     - **折叠**：点卡片头（或聚焦 Enter/Space）切 `.collapsed`；标题行内
       `button/a/input/select/textarea/label` 的点击**不折叠**（保护 `#sim-tb-copy`）。
     - **高度**：按「像素权重」记账，写 `flex-grow = 权重/总权重*100` + `flex-basis:0`；
       默认权重 `{source:300, rtl:245, vcd:245, tb:190}`。
     - **`measureMinHeight` / `applyMinHeights`**（本轮关键修复）：固定块按实测 `offsetHeight`、
       弹性块按自身 `min-height`，再补卡片体 padding / rowGap；`card.el.style.minHeight =
       min(实测最小高, 面板可视高*0.8)`；在 `commit()`、初始装配、`setWidth()`、`window resize` 都调用。
     - **splitter 拖拽**：`pointerdown` 记录相邻两卡 `offsetHeight`，按 `resizePair` 重分配；
       拖拽时 `body.sim-resizing`；相邻卡片折叠 → splitter `.disabled`。
     - **宽度**：`setWidth` 写 `--sim-panel-w`，clamp 280 ~ min(760, 视口*60%)；拖拽时 rAF 节流派发
       `window` `resize`（`js/editor/measure.js:187` 监听它重排画布）。
     - **持久化：仅 `sessionStorage`**（key `wavepaint.sim-panel-layout.v1`，结构
       `{v:1,w:{},c:{},width}`），220ms 防抖。**绝不进 `.wp`**。
     - **键盘可达**：splitter `ArrowUp/Down` ±16px；`#sim-resize-x` `ArrowLeft` 加宽 / `ArrowRight` 变窄。
     - 导出 `{getState, setWidth, reset, destroy}`；DOM 缺节点 → 返回 `null`（CSS 兜底）。

3. `js/sim/ui-bridge.js`
   - 新增 `import { installSimPanelLayout } from "./panel-layout.js"` + 模块级 `let panelLayout = null`；
     `initRefs()` 新增 `refs.panelBody` / `refs.resizeHandle`；**删除死引用**
     `refs.collapseBtn = el("sim-collapse")` 及其 `bindEvents` 死分支（第二十轮登记的 P3 语义遗留之一，本轮顺手清掉）。
   - 新增 `initPanelLayout()`（在 `init()` 中 `bindEvents()` 后调用）；`onLayout` 中 reason 以 `split`
     开头时调 `sourceCodeView?.remeasure?.()`。
   - `window.__wpsim` 新增探针：`get panelLayout()`、`setPanelWidth(px)`、`resetPanelLayout()`。

4. `js/sim/rtl-panel.js`
   - `installCodeEditor` 返回值新增 `remeasure()`（内部 `view.requestMeasure()`，无 CM 时空转）。
     原因：CM6 自带 ResizeObserver 有「刚更新过 <75ms 就跳过」保护，拖 splitter 时可能漏重排。

5. `tools/e2e-ui.mjs` —— 新增 I 段（本轮唯一入库测试改动）
   - `I0~I8` 共 13 项检查：装配 4 卡 + 3 splitter + 探针 / `flex-grow` 归一化到 100 且 `flex-basis:0px` /
     折叠 source（`.collapsed` + `display:none` + 高度缩小 + 相邻 splitter disabled + aria 同步）/
     展开还原 / splitter `ArrowDown`（`source=原高+16`、`rtl=原高-16`）/
     宽度直设 420·下限 280·上限 `min(760, 1440*0.6)=760` / sessionStorage v1 落盘 /
     reset 回默认（328 / 全展开 / 300-245-245-190）/
     **I8 回归守卫：矮窗口 `750x485` 下 `#sim-run` 命中测试命中自身**。

**本轮发现并修复的真 bug（重要）**

- **现象**：`.e2e-tmp/verify-recovery2.mjs` 的 D1 失败 —— 点 `#sim-run` 后仿真不启动
  （状态栏停在「暂无仿真结果」），D1b 同时失败。**这正是用户反复报的「点仿真无响应」的另一个根因。**
- **根因**：headless Edge 默认视口 **750x485**。四卡按权重分配后源码卡只剩 **80px**，而其
  `.source-toolbar` 实测 **170px**（`.source-actions` 的 9 个按钮 grid 折行后高 134px）→ 工具栏被
  `overflow` 裁掉 → 坐标点击 `#sim-run`（中心 y=342）实际落在 VCD 卡上 → **仿真根本不触发**。
- **修复**：即上面的 `measureMinHeight` / `applyMinHeights`（源码卡在 750x485 下 `min-height`
  写到 **272px**）+ `.sim-panel-body` 改 `overflow-y:auto` + `#sim-status` 吸底。修复后 D1/D1b 全部通过。

**验证（全绿，均已实测复跑）**

| 命令 | 结果 |
|---|---|
| `node --check js/sim/panel-layout.js` / `tools/e2e-ui.mjs` | ✅ exit 0 |
| `node tools/regression.mjs` | ✅ **79/79** |
| `node tools/e2e-ui.mjs` | ✅ **86/86**（73 → +13），资源 404 = 0，控制台异常 = 无 |
| `node tools/e2e-rtl.mjs` | ✅ **61/61**，资源 404 = 0，控制台异常 = 无 |
| `node tools/e2e-sim.mjs` | ✅ 失败 0 |
| `node tools/probe-param.mjs` | ✅ 全过 |
| `node tools/exe-smoke.mjs` | ✅ 通过（弹窗汉化正常 / 异常 无） |
| `.e2e-tmp/verify-recovery2.mjs` | ✅ **17/17**（修复后 D1/D1b 恢复） |
| `build.ps1` | ✅ `csc exit: 0`，`res count: 52`，`build.ps1` 仍 UTF-8 BOM |
| C8 特征串核验 | ✅ `applyMinHeights`=5 / `measureMinHeight`=2 / `MIN_CARD_CAP_RATIO`=2 / `installSimPanelLayout`=4 / `sim-resize-x`=12 / `sim-panel-body`=7 / `sim-card`=39 / `sim-split`=16 |

**范围与后续**：`js/wavepaint.clean.js` 与 `js/sim/engine.js` **一行未改**（C9 守住）。
面板状态**只存 sessionStorage、绝不进 `.wp`**（守住 B5 存档契约）。exe 已重建
（**22,012,416 B / 2026-09-11 00:15:01**，`version.txt` = `v0.4.0 build 2026-09-11 00:15:01 69b84d0`）。
详见 08 §2.2/§2.6、07 D20/D21、日志 2026-09-11 第二十一轮。

---

### 4.20 🧭 已交付（方案 + 后端盘点，未实施）：面板系统重构（dockable / Word 式自由拖拽）+ 后端能力汇报（第二十二轮 2026-09-13）

**用户指令**：「请确认现在完成的功能，我最终想实现的就是一个画波形的，可以直接进行仿真的这样一个
仿真器。请汇报现在具体后端功能支持的如何？我最终的目标是模仿 Verdi 一样可以实现波形窗口、代码
窗口、代码树窗口以及其他等窗口的类似 Word 一样的自由排列组合，以及自由拖拽，也就是说目前的 UI
可能要大改。请确认现在的情况，并对此计划做出详细的项目安排。」

**本轮 = 只出方案 + 现状盘点，零产品代码改动** → **不触发 C1、不重建 exe**（与第二十轮同规格）。

**① 后端能力盘点（结论：闭环已通，范式单一）**

后端**已打通完整闭环**：`画布波形 → 激励 → buildAutoTestbench → iverilog -g2012 → vvp →
wave_out.vcd → 文本回传 → parseVcd → 画布观察行`；iverilog 自愈（内嵌 `ivl.zip`）、固定端口
17817、`PING_TAG` 身份判活、`service-guard` 四态自愈、单实例收窗全部在线。**但只覆盖「单顶层 +
画布即激励」一种范式**。关键实测常量：`ProcessTimeoutMs = 30000`（编译/运行各 30 s）、
`MaxBodyBytes = 8 MiB`、`MaxSnapshots = 20`、`$dumpvars(0, tb)`、`-s tb` 固定、VCD **整文件文本**
一次性返回。完整表见 08 §6.1。

**② 后端缺口 G1~G8（按影响排序，全部登记进 08 §6.2）**

| ID | 缺口 | 关键证据 |
|---|---|---|
| G1 | **TB 只读**（`#tb-source` readonly，内容只能由 `buildAutoTestbench` 生成）→ 无法手写 `initial` / `$readmemh` / 多时钟域 | `index.html` L926、`ui-bridge.js:1305` |
| G2 | **无编译/仿真日志与进度**（成功路径的 stdout/stderr 被丢弃；看不到 `$display`） | `RunSimulationCore` 仅失败分支回传 |
| G3 | **编译选项不可配**（`-D` / `+define+` / `-I` / `-y` / filelist 全无） | `BuildCompileBatches` 硬编码 |
| G4 | **无取消 / 无进度**（30 s 硬超时） | `:17` |
| G5 | **VCD 全量文本一次回传**（无分片、无流式、无时间窗） | `:529~:535` |
| G6 | **`/api/snapshot` 前端未接线**（服务端已实现，白放着；本应用无自动保存） | `:580` + 全仓 `rg` 仅 README |
| G7 | **单顶层**（`-s tb` 固定） | `BuildCompileBatches` |
| G8 | 解析器是 SV 子集（无 generate 展开 / package / interface / class / `` `include`` 递归） | `parseVerilogDesign` / `scanModuleSymbols` |

**③ 前端面板现状**：`index.html` 1038 行；`#main-area`(L838) 内 `#wave-view`/`#wave-canvas` +
右侧 `#sim-panel`(L846) 单列 4 张可折叠卡（source/rtl/vcd/tb）+ 3 条 `.sim-split` + `#sim-resize-x`
（clamp 280~min(760,视口*60%)）+ `#sim-status` 吸底；布局只存 sessionStorage。已有雏形 = 折叠 /
纵向拖高 / 侧栏拖宽 / session 持久化；**缺** = 跨区停靠 / 左右重排 / 横向切分 / 浮出 / Tab /
最大化 / 多实例 / 预设。

**④ 差距等级**：区域划分 **大**、面板停靠 **大**、横向切分 **大**、浮出 **大**、Tab **中**、
最大化 **中**、布局持久化 **中**、预设 **小**、拖拽反馈 **中**（表见 08 §6.4）。

**⑤ 选型结论（建议）**：**自研轻量 dock 引擎**（≈800~1200 行，新增 `js/sim/dock/*.js`）为主 →
契约面 100% 可控、无新依赖、可复用 D21 的 CM6 `remeasure()` 经验；**备选** Lumino `DockPanel`
（JupyterLab 同款，功能最贴但 ~100 KB + 需适配画布/CM6/主题）、golden-layout v2；
**否决** React/Vue 系（dockview / rc-dock / flexlayout，本项目无前端框架）与 **iframe 多窗口**
（会重踩 #82 多窗口抢端口老坑 → 浮出只做**页内浮动层**）。工程上引入库**可行**（仓库已有
esbuild 先例 `tools/cm6-entry.js` → `lib/codemirror.bundle.js`），故非禁区，仅按性价比否决。

**⑥ 目标架构（三层）**：`PanelRegistry`（**每个面板 = 一个已存在的 DOM 节点，只搬父容器、不重建
→ id 天然不变**，正是第二十一轮验证过的路径）+ `LayoutTree`（`split|leaf`，可序列化）+ `DockDnD`
（drag ghost / 五向 drop 命中 / 预览框）。四区 = LEFT（RTL/VCD 树）/ CENTER（主视图 Tab：波形画布）
/ RIGHT（源码 CM6）/ BOTTOM（控制台 / TB / 状态）+ `#dock-floats` 浮动层。三条硬约束：搬容器后
**必须**重排画布与 CM6（`ResizeObserver` <75 ms 跳过的坑）、**不得改冻结 id/class/dataset**、
`render(tree)` **必须幂等**。

**⑦ 分期**：**#94 D0**（注册表 + 宿主抽象，**零视觉变化**，关键闸门，回滚=1 commit）→ **D1**
（停靠引擎：四区 + 拖拽换区/排序/切分 + Tab）→ **D2**（页内浮动 + 最大化 + 键盘）→ **D3**
（sessionStorage 保底 + localStorage 跨会话 + 3 套预设 + reset）→ **D4**（打磨/空态/a11y/拖拽期
挂起画布重绘）；**#95 E1~E5**（E1 TB 可编辑 / E2 日志+进度+取消 / E3 编译选项 / E4 大 VCD /
E5 多顶层）与 #94 正交、**E1+E2 建议并行优先**；**#96 W1~W3**（W2 接 `/api/snapshot` 做崩溃恢复，
**恢复必须用户点选**；W3 布局进 `.wp` 待拍板）。

**⑧ 契约面 / e2e 影响面**：冻结面（24 id + class/dataset + 状态类 + VCD `title` 全路径 +
`#sim-status` 常驻 + `#sim-run` 可点）继续有效；`e2e-ui` **86 条风险最高**（I0~I8 直指布局）→
允许改断言但 **I 段语义必须有等价新断言**；`e2e-rtl` 61 条只要冻结面保活即零改；`regression`
79 条纯 Node 不受影响；`e2e-sim` 只需控制带搬家不改语义。

**⑨ 待用户拍板四条（开工门禁，08 §6.10）**：① 是否**解除「侧栏保持右侧」**（不解除则无法做到
Verdi 式左右分栏）；② 是否**解除「层次树暂不左置」**（不解除则「代码树窗口独立成区」不成立）；
③ 浮出窗口边界 = **页内浮动面板**（推荐）vs 真独立窗口；④ 布局是否写进 `.wp`（默认**只做会话 +
跨会话记忆，不写 `.wp`**）。默认已定两条：每类面板**保持唯一实例**；首次进入默认布局 = `sim`
预设（波形居中最大 / 树在左 / 代码在右 / 控制台在下）。

**⑩ 与 §2 的关系**：§2 = 右侧单栏卡片化（第二十一轮已交付）；**§6 = 面板升级为可停靠窗口系统，
是 §2 的上位替代**；§2.6 的三项剩余（VCD 树移入波形区 / TB 控制带收敛 / 层次树左置）**并入
#94 D1**，不再单独排期。#84 / #77 / #78 **仍为远期**。

**本轮零产品代码改动** → 无 exe 重建；新增/更新记忆：08 **§6**（新增，约 200 行）、03 表 K
（#94/#95/#96）、本 §4.20、§1 快照（日期 + 最新一轮行 + 下一步主线行）、07 D22、09 §1/§3、
`05-LOGS.md` 索引、`memory/logs/2026-09-13.md`。

---

### 4.21 ✅ 已完成（原型，零后端）：纯前端 UI 原型 `prototype/ui-mockup.*`（第二十三轮 2026-09-13）

> **本节的成品 = 给用户 review 的「假界面」**：可停靠 / 可拖拽 / 可浮出的多面板工作台外观，
> **完全假数据、零后端、零功能**。目的：在动真前端（`index.html` / `js/` / `css/`）之前，
> 先让用户对**形态**拍板，避免大改后返工。**本轮 C1 未触发**（见下「不做的事」）。
>
> 用户原话：「G1 到 G8 暂不实现，可以解除侧栏解除层次树暂不左置，页内浮动面板，布局可以暂时不写。
> 由于此项改动对于前端页面的改动比较大，为了减少工作量，可以先做一个**虚假的纯前端界面**，
> 也就是不连接后端没有任何功能的前端界面。做出这样一个前端界面之后，给我看，我 review 完了、
> 确认完了之后再进行后端连接的工作。」

**① 用户本轮四条拍板（承接第二十二轮 08 §6.10，全部通过 —— 见 07 D22 / 08 §6.10）**

| # | 条目 | 结论 |
|---|------|------|
| 1 | 面板形态 | **页内浮动面板**（**不做**真独立 OS 窗口）—— 与 08 §6.6「浮动层」一致 |
| 2 | 「侧栏保持右侧」 | **解除**（原 08 §2.2 约束作废，可做 Verdi 式左右分栏） |
| 3 | 「层次树暂不左置」 | **解除**（原 08 §2.2 约束作废，树可独立成区、可左置） |
| 4 | 布局写进 `.wp` | **暂不写**（`.wp` 保持纯激励语义；原型阶段持久化只用 `localStorage`） |

**另加两条本轮指令**：⑤ **G1~G8 全部暂不实现**（`#95` 整线后延，方案保留在 08 §6.2）；
⑥ **布局 / 预设 / 拖拽手感可先不做**，本阶段只交付「能看」的原型。
→ 实施路径落盘为 **D-1（原型评审闸门）**：**D-1 用户 review 通过 → 才做 D0/D1 接线**。

**② 交付物（新增 `prototype/`，3 个文件，全部纯静态）**

| 文件 | 体量 | 内容 |
|------|------|------|
| `prototype/ui-mockup.html` | 9,625 B | 原型横幅 + 菜单栏（文件/编辑/视图/**布局/面板/窗口**/帮助）+ 工具栏（**复用 `../img/*.svg` 真图标**）+ `#workbench` + `#mk-drop`/`#mk-caret` + `#mk-floats` + 状态栏（`#st-text`/`#st-layout`/`#st-panels`）+ 交互说明浮层 |
| `prototype/ui-mockup.css` | 19,279 B | 主题变量**逐条抄自** `css/wavepaint.e7b903ef.css` 的 `:root`（浅色绿，视觉与真机一致）；全部类名统一 `mk-` 前缀，**与真前端零命名冲突** |
| `prototype/ui-mockup.js` | 45,656 B（≈960 行） | 完整**轻量停靠引擎原型**（见下 ③） |
| `tools/mock-probe.mjs` | 19,923 B | 真实 Edge headless + CDP 自动化验收探针（见下 ⑤） |

**③ 原型引擎能力（`ui-mockup.js`）**

- **模型**：`split{kind:"split",dir:"row"|"col",sizes[],children[]}` / `tabs{kind:"tabs",id,panels[],active}`
  —— 与 08 §6.6 目标架构的 `LayoutTree` **同构**，将来可 1:1 搬到 `js/sim/dock/layout-tree.js`。
- **8 个面板**：`wave`（波形画布，含**真实绘制**的 7 行信号 + 总线标签）/ `source`（代码）/ `rtl`（层次树）
  / `vcd`（VCD 树）/ `tb`（激励）/ `console`（控制台）/ `files`（工程文件）/ `props`（属性）。
  `PANEL_ORDER` 定序 + `HOME_ZONE` 定默认区。
- **3 套预设**：`presetSim`（仿真态：波形居中最大 / 树在左 / 代码在右 / 控制台在下）/ `presetEdit`（编辑态）
  / `presetReview`（审阅态，**预置 2 个浮动窗**）。
- **命中测试** `hitTest()` → `tab` / `split` / `edge`：拖到**中心** = 合并为 Tab；拖到**四边** = 同区切分；
  拖到**最外环** = 新建区。
- **交互**：拖拽停靠（ghost + 蓝色落点框 + 插入光标 caret）/ 分隔条像素→比例双向换算 / Tab 切换 /
  **中键或双击浮出** / ✕ 关闭 / 浮动窗**拖动 + 右下角 resize + ▣ 最大化 + ⤓ 收回** /
  键盘 `Ctrl+Alt+1|2|3` 切预设、`Ctrl+Alt+0` 重置。
- **持久化**：`localStorage['wavepaint.mock.layout.v1']`，400 ms 防抖 —— **明确不写 `.wp`**（用户第 4 条拍板）。
- **探针**：`window.__mock` 暴露 `root`/`floats`/`visiblePanels`/`applyPreset`/`floatPanel`/`dockPanel`/
  `hidePanel`/`showPanel`/`render`/`hitTest`/`placePanel`/`persistState`/`reset`（供自动化与将来接线复用）。

**④ 本轮修掉的 4 个原型真实缺陷**（都通过探针实测发现，非纸上推演）

1. `floatPanel(id, opts)` **忽略** `opts.x/opts.y` → `presetReview` 预置浮窗坐标丢失。**已修**：读取 opts。
2. `applyPreset(name, hard)` 的 `hard` 分支**直接返回 `presetSim()`**，忽略传入预设名 →
   `__mock.reset()` 与 `Ctrl+Alt+0` 语义混乱。**已修**：统一走 `PRESETS[name]`。
3. **浮动窗拖动时不显示落点提示**（与停靠拖拽体验不一致）。**已修**：`startFloatDrag` 的 `move` 补
   `showIndicator(hitTest(...))`，`up` 补 `hideIndicator()`。
4. 浮动窗拖动松手时 `pointerup` 可能**无坐标** → 落点不更新。**已修**：`if (typeof e.clientX === 'number') move(e)`。

**⑤ 验证：`node tools/mock-probe.mjs` → 34/34 全通过（退出码 0）**

- 环境写法**照抄 `tools/e2e-ui.mjs`**：真实 Edge headless + CDP 9532 + `tools/dev-server.mjs 8951`，
  `--disable-component-update`、`TEMP/TMP/TMPDIR` → `.e2e-tmp/system-tmp`、唯一 `--user-data-dir`、
  `Emulation.setDeviceMetricsOverride 1680x1000`。
- 断言分组：**A 结构** M0~M10 / **B 真实鼠标拖拽** TB→波形合并 Tab B0~B3 / **C 浮出 + 拖动 + 收回**
  C1/C2a/C2b/C3 / **D 预设切换 + 隐藏恢复 + localStorage** D1~D3 / **E 无 JS 异常 + 无资源加载失败**
  E1/E2 / **F 布局体检** F1~F10（无横向溢出 / 三段不重叠 / 工作区 875 of 1000 / 四窗格尺寸 /
  波形 7 行路径与总线标签 / **无裁切文本** / 图片全加载 / 浅色主题生效 / 审阅预设 2 浮窗 / 帮助浮层）。
- 实测布局：窗口 1680×1000；`#chrome` y=24 h=75；工具栏底=98；工作区 y=99 h=875（99→974）；
  状态栏 974→1000；四组 = `rtl+vcd` 314×633 / `wave` 910×633 / `source+tb` 430×633 / `console` 1668×223。
- 截图产物（`.e2e-tmp/`，已 gitignore）：`mock-1-sim.png` / `mock-2-drag.png` / `mock-3-merged.png` /
  `mock-4-floats.png` / `mock-5-floats-dragged.png` / `mock-6-sim-clean.png` / `mock-7-edit-preset.png` /
  `mock-8-review-preset.png` / `mock-9-help.png`。

**⑥ 本轮「不做的事」（重要，防下一位 AI 误判）**

- **未改** `index.html` / `js/**` / `css/**` / `img/**` / `lib/**` / `WavePaintLauncher.cs` / `build.ps1`
  → **C1 未触发，未重建 exe**（exe 基线仍为 22,012,416 B / 2026-09-11 00:15:01）。
- `prototype/` **不进 `resources.txt`**（`tools/gen-resources.mjs` 只扫 `index.html` + `css/js/img/lib` + `ivl.zip`），
  即**不参与 exe 内嵌**；`tools/` 同理。评审后可删、可转正，均不影响产品产物。
- **未实现 G1~G8 任何一条**；未接任何后端；原型里所有信号/波形/日志都是**假数据常量**。

**⑦ 如何跑给用户看**

```powershell
node tools/dev-server.mjs 8951
# 浏览器打开 http://127.0.0.1:8951/prototype/ui-mockup.html
```

**必须是 `http://`（经 dev-server）**：`file://` 下 `../img/*.svg` 受同源策略限制，图标会全丢。

**⑧ 下一步（门禁）**：**等用户 review 原型形态**。通过后按 08 §6.8 开工 **D0**（面板注册表 + 宿主容器
抽象，**零视觉变化**）→ **D1**（停靠引擎，把本原型的模型/命中测试/落点框搬进 `js/sim/dock/*.js`）。
用户若要求调预设默认值 / 分区归属 / 视觉细节，**先改原型再接线**（原型是零风险沙盘）。

---

### 4.22 🟡 方案已定稿 + ✅ 原型 U0 已完成（零产品代码改动）：控件与工具栏规范化 U 线（第二十四轮 2026-09-13）

> **背景**：第二十三轮交付的零后端原型（§4.21）经用户 review，结论 = **形态层通过、控件层要改**。
> 用户原话：「UI 排布在大体上基本正确，**小的按钮上的排布以及控制栏的排布还需要斟酌，现在似乎有一些混乱**，
> 大体上可以按照此方案进行改动，**请给出之后的工作方案**」。
> → **形态层**（四区 dock / 页内浮窗 / 多 Tab / 3 预设）**不动**（归 `08 §6` D 线）；本轮**只做控件层**，编号 **U0~U4**。
> **C1 未触发**（只改 `prototype/**` + 新增 `tools/`）→ **未重建 exe**（exe 基线仍为 22,012,416 B / 2026-09-11 00:15:01）。

**① 交付物（三件）**

| # | 产物 | 内容 |
|---|------|------|
| 1 | `memory/08-ROADMAP.md` **§7**（新增，约 130 行，本线主要产物） | §7.1 基线实测表 / §7.2 问题清单 **P-UI-01~09** / §7.3 铁律 **R1~R9** / §7.4 目标分层 **L0~L4** + 主方案 **D-UI-A** + 备选 **D-UI-B** / §7.5 刻度规范（可直接写成 CSS 变量）/ §7.6 溢出与降级 / §7.7 分期 **U0~U4** / §7.8 **之后的工作方案（与 §6 D 线合并总排期）** / §7.9 四条待拍板 / §7.10 红线 |
| 2 | `tools/ui-audit.mjs`（**临时脚本转正入库**） | 真实 Edge headless + CDP 量测：`--mock` / `--real` / `--all` / `--check` / `--widths=`；输出 `#toolbar` 溢出量、相邻间距值域与种类数、面板带行数、可见 primary 数、图标尺寸档、`offscreen` 数、长文本裁剪、分组序列；`violationsOf()` 与 **R3/R5/R6/R8/R9 一一对应**；`--check` 时违规非零即退出码非零 |
| 3 | `prototype/ui-mockup.{html,css,js}`（U0 重排，见 ⑤） | L1 工具带重写 + 全部面板带 `.mk-tbg` 分组 + `⋯` 溢出 + 刻度变量 + 状态栏三段化 |

**② 实测问题清单（P-UI-01~09，全部由 `ui-audit` 量出，非臆测；级别与证据见 08 §7.2）**

| 编号 | 问题 | 关键证据 | 级别 |
|------|------|----------|------|
| P-UI-01 | **间距不是刻度值** | 真机相邻间距 6 种值 {4,6,8,10,12,18}（17 处非刻度）/ 原型 5 种 {4,6,8,10,12}（13 处）—— 这是「看着乱」的**直接量化根因** | 高 |
| P-UI-02 | **真机 `#toolbar` 隐性溢出（真 bug）** | 1440 溢 **32px** / 1280 溢 **192px**；「步数 / 子步数」整组被推出工具栏（1280 实测越界 `步数:▲▼ 子步数:▲@1196~1472`），且工具带压在侧栏上层 | **严重** |
| P-UI-03 | **主按钮不唯一** | 原型 3 处「运行仿真」，其中 2 处可见且都带 `.primary` | 中 |
| P-UI-04 | **面板控制带折行** | 1280 下 32→51px；元凶是带尾的**上下文信息 chip** 被挤到第二行 | 中 |
| P-UI-05 | **提示条永远看不全** | `.mk-hintbar` 368px 装 50 字，必然 `ellipsis` 截断 | 低~中 |
| P-UI-06 | **控件尺寸不齐** | 真机图标按钮两档 28×28 / 42×28；原型第三档 26×26 | 中 |
| P-UI-07 | **职责重叠 / 分层缺失** | 视图类（缩小/放大/适应窗口）在全局带与波形带**各一份**；绘制类**全在全局带**，而波形专属的「运行」却在面板带 | 高 |
| P-UI-08 | **原型与真机不同源** | 真机 `#toolbar` = **34 个顶层元素**（21 图标按钮 + 2 分段组 + 2 步进组 + 13 分隔符），原型只有 17 图标按钮 → **用户 review 到的形态 ≠ 最终形态** | 高 |
| P-UI-09 | **分组失控** | 真机 13 条分隔符把 34 个元素切成 12 段（平均 2.8 个/段）→ 分隔符多到失去语义 | 中 |

**③ 铁律 R1~R9（摘要；全文见 08 §7.3）**

| 规则 | 内容 |
|------|------|
| R1 三层职责单一 | L1 只放跨面板动作；单面板动作必须在面板上下文带；状态栏只读、不放按钮 |
| R2 同类动作唯一入口 | 同一动作全应用只有一个入口（原型 3 处「运行仿真」→ 1 处；源码带重复项删除） |
| R3 主按钮唯一 | 可见 `primary` 恒 ≤ 1，且只能是「运行仿真」 |
| R4 尺寸三档 | 图标 28×28（图标 16×16，含 ▼ 也按 28 网格）；文本 / 下拉 / 分段 / 输入框高 24；带高 36（面板）/ 44（全局） |
| R5 间距只用刻度 | 组内 4 / 组间 12（= 1px 分隔线 + 两侧 4）/ 带首尾 8；**禁止组件自带 margin**（真机 5 处 + 原型 5 处散落 margin 全删） |
| R6 禁止隐式溢出 | 一律 `nowrap`；放不下按优先级把**整组**收进 `⋯`；**不允许** `flex-wrap`（原型旧状）或 `overflow:visible`（真机旧状） |
| R7 图标必可读 | 每个图标按钮带 `title` + `aria-label`；禁用态用 `disabled` + `title` 说明原因 |
| R8 不得被裁切 | 四档宽度下带内控件 `offscreen` 必须为空 |
| R9 提示不进工具带 | 长文本 / 上下文 chip 一律放状态栏或面板头右侧 |

**④ 目标分层与主方案 D-UI-A**

- **L0** 菜单栏（不动）→ **L1 应用工具带**（11 项 + `⋯`：运行仿真〔**唯一 primary**〕｜打开·保存｜撤销·重做·剪切·画笔颜色｜步数·子步数〔右对齐、**永不被收**〕）
  → **L2 波形面板上下文带**（T1 视图 / T2 绘制 / T3 状态 / T4 标注 / T5 对象，共 18 项）→ **L3 源码面板带**（打开…·保存｜解析 RTL·生成 TB，**删重复的「运行仿真」**）
  → **L4 状态栏**（三段只读：服务与消息｜当前文件 / TB｜布局 / 面板计数）。
- **主方案 D-UI-A**：真机 21 个图标按钮中的 **14 个波形类控件下沉**到 L2 → 全局带 **34 → 14 个顶层元素**（治本，也是 Verdi nWave 的做法）。
- **备选 D-UI-B**（不推荐）：全部留在全局带，只做分组 + 刻度 + 溢出 —— 改动小、见效少，只解决 P-UI-01/02/06/09。
- 二者取一由用户在 **U1** 拍板（08 §7.9-①）。

**⑤ 原型 U0 实际改了什么（`prototype/ui-mockup.*`）**

- **HTML**：`#toolbar` 重写为 **L1**（`#sim-run` 唯一 primary + 3 个 `.mk-tbg` 组 + `#tool-overflow` + `.mk-spacer` + 2 个步进组）；
  **删 `.mk-hintbar`**（R9）；横幅版本 → `mock-2（控件规范化 U0）`；`#status-bar` 加 `#st-ctx` + `.mk-st-sep`；帮助浮层加「5. 控件分层（第二十四轮 U0 重排）」。
- **CSS**：`:root` 加 6 个刻度变量（`--ui-icon-h:28` / `--ui-ctl-h:24` / `--ui-band-h:36` / `--ui-bar-h:44` / `--ui-gap-in:4` / `--ui-gap-out:12`）；
  `#toolbar` = `nowrap` + `height:44` + `gap:12` + `padding:0 8px`；组间分隔线改**伪元素**（`…>.mk-tbg+.mk-tbg::before`，不影响审计的间距判定）；
  `.tool-btn` 28×28 + `.disabled`；`.mk-run` 主按钮；`.mk-seg` 分段；`.has-caret`；`.mk-dd*` / `.mk-ovf*` 下拉与溢出菜单；
  `.mk-toolrow` = `nowrap` + `height:36` + `gap:12`；**删** `button.primary` 旧样式 / `.mk-sep` / `.mk-chip`；`#status-bar` + `.mk-st-sep` + `#st-ctx` 省略号。
- **JS**：`panelWave()` 的 L2 五组（带 `data-ovp` 优先级 + `⋯`）；`panelSource()` = L3（**删「运行仿真」**）；`panelRtl/Vcd/Tb/Files/Props` 全部 `.mk-tbg` + `⋯`；
  新增 **§5.5 控件层** = `setupBands()`（按 `data-ovp` 把整组收进 `⋯`；**关键修复**：还原顺序必须无条件 `order.forEach(el => band.appendChild(el))`）+
  `setupFlyouts()` + `setupCtlFeedback()`（分段切换 `.on`、步进器 ±1 假反馈）；`render()` 末尾与 `resize` 监听都调用 `setupBands()`；`window.__mock` 导出 `setupBands`。

**⑥ 验证（全部实跑，非推演）**

| 目标 | 命令 | 结果 |
|------|------|------|
| 原型回归 | `node tools/mock-probe.mjs` | **34/34**（失败 0；原型渲染 + 交互 + 布局体检 F1~F10 无回归） |
| 原型控件审计 | `node tools/ui-audit.mjs --mock` | **1680 违规 0 / 1280 违规 0**（改动前 3 / 6）✅ |
| 真机控件审计（**未修**） | `node tools/ui-audit.mjs --real` | 1920 违规 1 / 1680 违规 1 / 1440 违规 3（`#toolbar` 溢 32px）/ 1280 违规 3（溢 192px）→ **U3 目标** |

- 1280 实测：L2 的 **T5 对象组**（添加信号 / 选择对象 / 属性）被收进 `⋯`，菜单可正常展开。
- 多宽度特写截图（`.e2e-tmp/`，已 gitignore）：`ctl-{1920,1680,1440,1280}-toolbar.png`、`ctl-{1920,1680,1440,1280}-waveband.png`、`ctl-full-1680.png`、`ctl-1280-ovf-open.png`。

**⑦ 下一步 = 「之后的工作方案」（08 §7.8 总排期，U 线与 D 线合并视图）**

| 顺序 | 批次 | 依赖 | C1/exe | 预估 |
|------|------|------|--------|------|
| 1 | **U0** 原型控件重排（本轮**已完成**） | 无 | 否 | 0.5 天 |
| 2 | **U1** 用户 review 控件终稿（闸门 **U-1**，含 §7.9 四条拍板） | U0 | 否 | 等用户 |
| 3 | **D0 + U2** 面板注册表 + 宿主容器抽象 + 工具带 spec 数据驱动化（**像素级零视觉变化**） | U1 | 是 | 1~1.5 天 |
| 4 | **U3** 真机工具带落地 + **修 P-UI-02 真 bug**（1440 / 1280 不再越界） | U2 | 是 | 1 天 |
| 5 | **D1** 停靠引擎（四区 + 拖拽 + Tab；把原型的 `split` / `tabs` / `hitTest` / 落点框搬进 `js/sim/dock/*.js`） | U3 | 是 | 2~3 天 |
| 6 | **D2** 页内浮动 + 最大化 + 键盘 | D1 | 是 | 1 天 |
| 7 | **D3** 持久化（session + 跨会话 + 3 预设 + reset；**不写 `.wp`**） | D1 | 是 | 1 天 |
| 8 | **D4 + U4** 打磨（空态 / a11y / 拖拽期暂停重绘）+ 闸门工具化（`ui-audit --check` 进提交前清单） | D2/D3 | 否 | 1 天 |

**总预估 ≈ 8~9 个 AI 工作日**；每批 = 独立 commit + push（C2/C3）；D0 / U2 / U3 / D1 / D2 / D3 各触发一次 C1 重建（C8 核验）。

**⑧ 四条待用户拍板（U1 闸门一并确认；原文见 08 §7.9）**

1. **工具归位**：接受 **D-UI-A**（14 个波形类控件下沉、全局带 34→14）还是 **D-UI-B**（全留全局带）？*建议 D-UI-A。*
2. **`#sim-run` 位置**：保留在**全局带常驻**作为全应用唯一 primary（推荐，满足「始终可点」契约）？
3. **溢出策略**：窄窗口用 **`⋯` 溢出菜单**（推荐）还是允许折成第二行（现状）？
4. **刻度值**：图标 28×28 / 文本 24 高 / 组内 4 / 组间 12（推荐）？

**⑨ 不做的事（防下一位 AI 误判）**

- **不动形态层**（四区 dock / 页内浮窗 / 预设 / 持久化 = `08 §6` D1~D3）；本线只在既有容器里重排控件，**U2/U3 才动真机**。
- **不动 24 个冻结 id**（D20 / 08 §2.5）：可移 DOM 位置、可换父容器，**不可改名、不可移除**。
- `#sim-status` 常驻可见 + `#sim-run` 始终可点（契约硬约束）。
- **不重做 #88~#92**（编辑模式点 bus 误入框选 / 信号名标位宽 / 步进 ▲▼ ±1 / 步长变化 clock 填充 / 框选后点其它处自动提交）：五项**已于第九轮全部 ✅**，本轮实测未见回归。
- **未重建 exe**：`prototype/**`、`tools/**` 均不进 `resources.txt`。
- `#95（G1~G8）` 仍为用户明确暂缓；`#84 / #77 / #78` 仍为远期。

### 4.23 ✅ 已完成（原型 U0-R + 真机 splitter 重写 + 三条真 bug + 混淆残留清零）：第二十五轮 2026-09-13

> **一句话**：用户对第二十四轮 U 线原型给出四条修改指令 → 本轮**撤销 D-UI-A（顶栏统一 U0-R）**、
> **重写真机面板 splitter 高度模型**（用户报「拖拽和鼠标坐标对不上」）、修掉**三条真 bug**（其中
> 「时间标跑进源码区」的真根因是原型行号槽缺 `white-space:pre`），并**复查混淆残留**（顺手清零 9 个
> `_0x_wpf*` 局部名）→ **触发 C1，exe 已重建**。

**用户四条原话（逐条对账）**

| # | 用户原话 | 判定与落点 |
|---|---------|-----------|
| 1 | 「波形的时间标 **1234** 等错误地放在了源码区」 | **真 bug**：原型 `.mk-gutter` 缺 `white-space:pre` → 行号槽被换行撑成 369px、源码区被挤到 59px，波形刻度视觉上「跑进」源码区。改 CSS 一字（+ 波形刻度类名去冲突）→ `ticksInSource 0`（§下「真 bug 清单」a/b） |
| 2 | 「编辑栏先不做修改……**保存 / 撤回 / 放大缩小**等还放到此位置（统一顶栏）；**波形区的子波形区不加功能栏**」 | **推翻第二十四轮 D-UI-A**（把波形类控件下沉到波形面板上下文带）→ 改为 **U0-R 顶栏统一**：原型 `#toolbar` 收回 5 组 18 项，波形面板 `.mk-toolrow` **整条删除**。真机本就未动（真机 `#toolbar` 一直含保存/撤销/缩放），无需改 |
| 3 | 「各个窗口的**大小拖拽有 bug，和鼠标坐标对不上**，而且检查显示等其他 bug」 | **真机 `js/sim/panel-layout.js` 根因重写**（旧 `onMove` 把累计位移当增量反复叠加 → 越拖越飞）+ 原型三处拖拽/滚动 bug（§下「真 bug 清单」c） |
| 4 | 「**已有绘图 UI 尽量不改动**……如果是很混淆过的，请查明之前的解混淆与剔除工作」 | 绘图 UI（`wavepaint.clean.js` 的画布/绘制）**一行未改**；混淆复查结论 = **无残留混淆**（详见下） |

**① 原型 U0-R（`prototype/ui-mockup.{html,css,js}`）—— 撤销 D-UI-A**

- `prototype/ui-mockup.html` `#toolbar`（L90 起）新增 **5 组 18 个绘图 / 编辑控件**（带 `data-ovp` 表达溢出优先级）：
  打开/保存组 = 5、撤销组 = 4、视图 = 1、绘制 = 3、编辑状态 = 2、标注 = 2、对象 = 1。
- `panelWave()` 里**整条 `.mk-toolrow` 删除** → 波形区**零子功能栏**（对齐用户「功能栏统一放顶栏」）。
- 帮助浮层 §5、`mk-version` → `v0.4.0 · 原型 mock-3（顶栏统一 U0-R）`。
- 其余面板（源码 / RTL / VCD / TB / 文件 / 属性）的 `.mk-toolrow` **保留**（那是**面板专属**动作，不是波形的功能栏）。

**② 真机 `js/sim/panel-layout.js` splitter 高度模型根本重写**

旧实现**三处缺陷叠加**（这就是「鼠标坐标对不上」的真根因）：

1. **`onMove` 把累计位移当增量反复叠加** → 每次 pointermove 都在上一次结果上再加，越拖越飞。
2. **`weights` 被当像素值用**，但 `applyWeights()` 会把它归一化成占比 → 量纲不一致。
3. **`flex-basis:0` + 权重占比模型**：一旦卡片触到 `min-height`，px ↔ 权重之间**没有恒定换算系数** → 拖拽目标算不准。

新模型（`cardBaseline` L157 / `pairSlackPx` L161 / `applyWeights` ~L170 / `applyMinHeights` ~L233 / `resizePairTo` L344 / `resizePair` L372）：

- `cardBaseline(card)` = 该卡 `el.style.minHeight`（像素基线）；`pairSlackPx()` = 可见卡「渲染高 − 基线」之和。
- `resizePairTo(pair, targetAPx)`：把 A 卡的**渲染高度**设到绝对目标 `clamp(targetAPx, baseA, total − baseB)`；再按 `k = free / wSum` 反解**本对**权重 `nextWA = (nextA − baseA) / k`，B = 本对权重和 − nextWA。
- `applyWeights()`：`flexBasis = cardBaseline(card) + 'px'` + `flexGrow = 占比 * 100` + `flexShrink = '0'`。
- **`applyMinHeights()` 现在同时写 `minHeight` 与 `flexBasis`（同源）** ← 最后修掉的关键 bug：窗口 resize 只重算 min-height 会让 `flex-basis` 留在旧值。
- `resizePair(pair, deltaPx)` 保留键盘增量语义（薄包装 `resizePairTo(..., offsetHeight + deltaPx)`）。
- `onPointerDown` 守卫改用 `cardBaseline` 之和，记录 `startHeightA`；`onMove` 走 `resizePairTo(split.pair, startHeightA + delta)`。
- `#sim-resize-x` 侧栏宽度分支（`startWidth + delta` 绝对量）本来就对，**未改**。
- **24 个冻结 id / class / dataset 一个未改**（契约面全保）。

**③ 真 bug 清单（本轮三条 + 混淆一项）**

| 编号 | 现象 | 真根因 | 修复 |
|---|---|---|---|
| a | **时间标「1234」跑进源码区** | 原型 `.mk-gutter` 未设 `white-space:pre` → 行号被折行，行号槽实测 `gutW 369`（应 32）、源码区被压到 `bodyW 59` | `.mk-gutter{white-space:pre}` → `gutW 32` / `bodyW 396` / `ticksInSource 0` |
| b | 波形刻度与菜单勾选视觉冲突 | 同用 `.mk-tick` 类名 | 波形刻度改 **`.mk-wave-tick`**（`ui-mockup.js:262`；菜单勾选 `.mk-mi .mk-tick` 保留） |
| c | 原型：信号名列宽拖拽完全无效 + 时间轴不随波形轨横滚 + 游标拖拽偏移 | ① `scope.closest('.mk-wave')` 取到了错节点 → 改 `scope.querySelector('.mk-wave')`；② 游标拖拽未以 `tracks` 视口为基准、未补 `tracks.scrollLeft`；③ 缺 `tracks.scroll → axisScroll.scrollLeft` 同步 | 三处修复；实测横滚 200→200、拖 60 → `dA 60 / dB −60` |
| d | **混淆残留** | 无混淆代码；仅 9 个解混淆后残留 `_0x_` 前缀的局部变量（`_0x_wpfQuickCleanup` / `_0x_wpfSuppressBlur` / `_0x_wpfMarkSuppress` / `_0x_wpfClearError` / `_0x_wpfOnBlur` / `_0x_wpfText` / `_0x_wpfOnInput` / `_0x_wpfOpts`，共 32 处） | 去掉前缀 → `wpf*`（函数内局部作用域，改名零行为变化）；**正文 `_0x` 归零**，仅剩 3 处为文件头注释里的历史说明（保留） |

> ⚠ **注意**：`_0x55bf`（字符串解码器名）等只出现在 `js/wavepaint.clean.js` **头部注释**里，是「当年解混淆做了什么」的档案；
> `\xD7` 是产品功能字符「✕」；`atob` / `fromCharCode` 是 WaveDrom 导入导出功能。**都不是混淆代码**。
> 第三方压缩库 `lib/codemirror.bundle.js`、`lib/wavedrom.min.js` 属**正常压缩**（非混淆），保留。

**④ 实测（全部实跑）**

| 套件 | 结果 |
|---|---|
| `node tools/e2e-ui.mjs` | **88/88 ✅**（本轮改 I1 口径 + 新增 **I4c 指针拖拽**） |
| `node tools/regression.mjs` | **79/79 ✅** |
| `node tools/e2e-rtl.mjs` | **61/61 ✅** |
| `node tools/e2e-sim.mjs` | **失败 0 项 / 已知缺陷 0 项 ✅** |
| `node tools/mock-probe.mjs` | **34/34 ✅**（首跑曾因残留 Edge / 端口占用的**环境态**报「页面未找到」，清理后连跑 3 次均 34/34 —— **非本轮代码引入**） |
| `node tools/ui-audit.mjs --mock` | **1680 / 1280 两档违规 0 ✅** |
| `node tools/ui-audit.mjs --real` | 1920 违规 1 / 1680 违规 1 / 1440 违规 3 / 1280 违规 3 ⚠ **历史遗留（U3 范围），本轮未修** |

**e2e-ui 本轮三条断言改动（重要，勿回退）**

- **I1**：旧断言 `flex-basis=0` 已作废 → 新断言 `bases[i] === mins[i] && /px$/`、`growSum≈100`、`shrinks` 全 `'0'`。
- **I4**（键盘 ArrowDown 16px）：口径改「**渲染高**」—— `hA +16 / hB −16` 且两卡总高守恒。
- **I4c**（新增，指针拖拽）：动态算 `room = hB − batteryBase`、`DY = clamp(floor(room) − 2, 8, 24)`；断言「拖 DY → `dA ≈ DY`、`dB ≈ DY`、总高守恒」+「**同一手势拖回原点 → 高度可逆回出发值**」。

**⑤ exe 重建 + C8 核验**

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1` → `csc exit: 0`，`WavePaintClean.exe` = **22,015,488 B** / 2026-09-13 16:52:06。
- `version.txt` = **`v0.4.0 build 2026-09-13 16:52:06 83fab85`**（`83fab85` = **构建时 HEAD**；承载本轮代码的 commit 是它的**下一个**）。
- `resources.txt` = 52 项。
- C8 特征串：`cardBaseline` = 7、`pairSlackPx` = 3、`resizePairTo` = 3、`applyMinHeights` = 7、`sim-resize-x` = 12、`wpfQuickCleanup` = 5，`_0x_wpf` = **0** ✅；`mk-wave-tick` 命中 0 正确（只在 `prototype/`）。

**⑥ 不做的事（红线）**

- **不碰绘图 UI**：`js/wavepaint.clean.js` 的绘制/画布逻辑一行未改（只改 9 个局部变量名），`js/sim/engine.js` 一行未改（C9）。
- **不重做 #88~#92**（已于第九轮全部 ✅）。
- **不动 24 个冻结 id**；`#sim-status` 常驻可见、`#sim-run` 始终可点。
- **不加波形子功能栏**（用户本轮明确要求）；`D-UI-A` 作废，见 `07 D24` / `08 §7.4`（已改写）。

---

### 4.24 ✅ 已完成（原型打包为可双击运行的 exe + 记忆同步）：第二十六轮 2026-09-13

> **一句话**：上一轮的 review 入口是「`node tools/dev-server.mjs 8951` + 手输 URL」，用户反馈
> 「**提供的网页链接无法打开**」→ 本轮把第二十五轮 U0-R 原型打包成**双击即用、零依赖、零命令行**的
> `WavePaintMockup.exe`（独立启动器 + 独立构建脚本 + 无浏览器冒烟），**真机 `WavePaintClean.exe` 一行未动**（C1 未触发）。

**① 用户请求与判定**

| 项 | 内容 |
|---|---|
| 用户原话 | 「提供的网页链接无法打开，请按照**原本之前的方式**一样打包成一个**可直接运行的 exe** 供我 review」 |
| 判定 | **交付方式问题，不是原型本身问题**。第二十三~二十五轮的 review 链路（起 `dev-server.mjs` + 手输 `http://127.0.0.1:8951/prototype/ui-mockup.html`）要求用户装 Node、开命令行、手输地址 → 对用户不可用 |
| 目标 | 双击 exe → 自动起本地静态服务 → 自动打开 Edge **无地址栏**窗口显示原型；关闭窗口 → 进程自动退出；**不引入新依赖**（`csc` 已在环境里，与真机 exe 同一条构建链） |

**② 交付物清单（本轮新增 3 文件 + 改 3 文件，全部只碰非产品路径）**

| 文件 | 行数 | 作用 | 进 `resources.txt`？ |
|---|---|---|---|
| `MockupLauncher.cs`（新增） | 528 | **原型专用启动器**：内嵌静态资源 HTTP 服务 + 开窗 + 单实例 + 生命周期 | 否（只进原型 exe） |
| `build-prototype.ps1`（新增） | 64 | **原型专用构建脚本**：`csc /target:winexe /win32icon:img\app.ico`，内嵌 `prototype/**` + `img/**` + `mockup-version.txt` | 否 |
| `tools/mockup-exe-smoke.mjs`（新增） | 143 | **无浏览器自检**（对 exe 服务直接发 HTTP，不依赖 Edge） | 否 |
| `tools/mock-probe.mjs`（改） | 236 | 支持外部服务基址 `MOCK_BASE`（`argv[2]` / `process.env.MOCK_BASE`）→ 同一探针可打 **dev-server** 或 **exe 服务** | 否 |
| `prototype/ui-mockup.html`（改） | 260 | 末尾 `<script>`：`fetch(/mockup-version.txt)` 成功则把构建戳写进顶部绿条 `#mock-version`（dev-server 下 404 静默跳过） | 否 |
| `.gitignore`（改） | +2 | 忽略 `WavePaintMockup.exe` / `mockup-version.txt` | — |

**③ 设计要点（与真机严格隔离，三处身份分离）**

| 维度 | 真机（`WavePaintClean.exe`） | 原型（`WavePaintMockup.exe`） |
|---|---|---|
| 端口 | 固定优先 **17817** | 优先 **17820**（被占则 `FreePort()` 随机） |
| `/api/ping` 身份串 | `WAVEPAINT-SERVICE` | **`WAVEPAINT-MOCKUP <构建戳>`** |
| 单实例发现文件 | `%TEMP%\WavePaint_service.txt` | `%TEMP%\WavePaintMockup_service.txt`（`tag=`/`port=`） |
| 窗口判定 | 标题含 `WavePaint` | 标题含 **「原型」**（`EnumWindows` + `GetWindowText`；真机标题不含「原型」→ 互不误伤） |
| 构建脚本 | `build.ps1`（写 `resources.txt`/`version.txt`） | `build-prototype.ps1`（**不写、不动、不碰**上述两者与真机 exe） |

- **静态资源服务**：`MapPathToResource` 映射 —— `/` → `prototype/ui-mockup.html`；`ui-mockup.*` → `prototype/`；其余按内嵌资源名解析；**路径含 `..` 一律 404**（4 条原始 socket 穿越用例已验）。
- **开窗**：优先 Edge `--app="http://127.0.0.1:<port>/prototype/ui-mockup.html"`（无地址栏、无标签栏）；未找到 Edge 则退默认浏览器打开同一 URL。
- **生命周期**：无「原型」窗口连续 12 秒 → 自动退出（用户关窗即退）；进程最长存活 **12 小时**（兜底）。
- **参数**：`/nolaunch`（只起服务不开窗，供自动化用）、`/port=N`（指定端口）。
- **构建戳**：`mockup-version.txt` = `v0.4.0-mock build <时间> <构建时HEAD短哈希>`，随 exe 内嵌 + 写盘 + 页面绿条三处可见。

**④ 实测（全部实跑）**

| 项 | 结果 |
|---|---|
| `build-prototype.ps1` | `csc exit: 0` / `res count: 27` / `WavePaintMockup.exe` = **186,368 B**（2026-09-13 17:08:12） ✅ |
| `node tools/mockup-exe-smoke.mjs` | **41/41 ✅**（ping 身份 / 首页与静态资源 状态码·Content-Type·**字节数与磁盘源码逐一相等** / 构建戳 / 404 分支 / HEAD / 4 条路径穿越非 200） |
| `node tools/mock-probe.mjs`（源码 dev-server） | **34/34 ✅**（默认行为不变） |
| `node tools/mock-probe.mjs http://127.0.0.1:17820`（**对 exe 服务**） | **34/34 ✅** |
| `node tools/ui-audit.mjs --mock` | 违规 **0** ✅ |
| 真实双击路径 | `%TEMP%\WavePaintMockup_service.txt` = `tag=WAVEPAINT-MOCKUP` / `port=17820`；ping 通；可见窗口标题「WavePaint UI 原型（假界面 · 未连接后端）」；截图 `.e2e-tmp/mockup-exe-window.png` 1050×999 / 207 色（非白屏）；WM_CLOSE 关窗 → **第 12 秒自动退出**；第二实例自动交接退出、第一实例仍在 17820 ✅ |

**⑤ 红线 / 不做的事**

- **不碰真机**：`WavePaintLauncher.cs`、`build.ps1`、`js/`、`index.html`、`css/`、`img/`、`lib/` **一行未改** → **C1 未触发**，`.gitignore` 的 exe 重命名绕行机制未动用。
- **不碰真机构建产物**：`resources.txt` 仍 52 项、`version.txt` 仍 `v0.4.0 build 2026-09-13 16:52:06 83fab85`、`WavePaintClean.exe` 仍 22,015,488 B / 16:52:06。
- **不改绘图 UI**（用户既有红线）；**不重做 #88~#92**；**不动 24 个冻结 id**（原型与真机均未动）。
- **`prototype/`、`tools/`、`memory/` 不进 `resources.txt`**（沿用第十二轮起的既有口径）。

### 4.25 ✅ 已完成：拖拽两条真 bug 修复 + 原型「1:1 完全照搬真机」重构 + 审计口径校准 + exe 重打包（第二十七轮 2026-09-13）

**用户请求（原话）**：「目前各个面板的**拖动仍然有问题，拖动的预览和最后实际的效果不一致**，且**拖动按钮在拖动时的显示也有 bug**。此外，代码显示区和菜单栏的显示等**并没有照搬原本的源码**，我希望**完全照搬它的源码，做出 1:1 的效果**，只是原本是全屏的，现在是面板而已，而不是按照预测的显示效果等进行复刻，我要 **1:1 完全一样的效果**，完全一致的效果**起码波形显示区是这样的**。」

**判定**：① 两条拖拽 bug = **同一根因的真 bug**（不是"手感问题"），必须修根因 + 加回归；② 「1:1」是**口径裁决**（07 D26）—— 原型不再是"按预期效果另画一版"，而是**逐字照搬真机源码/样式/脚本**；③ 该口径顺带推翻旧审计规则对原型的适用性 → 校准 `tools/ui-audit.mjs`。

#### ① 拖拽两条真 bug（06 P39 / 07 D27）

**根因（一句话）**：拖拽闭包**缓存了 DOM 引用**，而拖拽中途 `afterLayout()` 的 `setTimeout(60ms) → window.dispatchEvent('resize')` 会让原型 `render()`/`renderFloats()` **重建整棵 DOM** → 闭包里的 `el`/`handle`/`slots` 变成**游离节点**，样式与类名写进空气。

**两个症状同源**：

| 症状 | 机制 | 实证 |
|---|---|---|
| 拖动预览 ≠ 松手后落位 | 往游离 `el` 写 `style.transform` / `dataset` 不生效 | 探针日志 `[fdrag.up] elConnected=false sameEl=false sameF=true`（f.x/f.y 更新了但写在未连接节点上） |
| 拖动中 `⧉ ▣ ✕` / 页签 `✕` 乱闪 | 用游离 `el.classList` 判拖动态 → CSS `body.mk-dragging … opacity:0 !important` 失效 | H4/H5 加断言后可见 |

**修法（`prototype/ui-mockup.js`，三条铁律 → 07 D27）**：

1. **稳定 id**：`split()` / `cloneTree()` 给 split 节点补 `id = 's-' + (++seq)`（原来只有 tabs 有 id），`buildNode()` 落 `el.dataset.splitId`；浮窗本就有 `data-float`。
2. **每次查活节点**：`startSplitDrag` / `startFloatDrag` / `startFloatResize` 的 `move` 一律 `liveSplit()` / `floatsLayer.querySelector('.mk-float[data-float="id"]') || el` **现查**，绝不用缓存引用。
3. **监听挂 `window`**：`pointermove/pointerup/pointercancel` 从 handle 改挂 `window`（手柄被换掉也不中断），补 `pointercancel` 取消分支；跨重建的拖动态用**模块级变量** `draggingFloatId`（`renderFloats()` 按它拼 `.dragging` 类）；松手统一 `renderFloats()` + `persist()` 收尾。

**新增样式（`prototype/ui-mockup.css`）**：`.mk-float.dragging{ z-index:500; border-color:var(--accent); box-shadow:… }`、`.mk-float.dragging .mk-float-head{ background:var(--active-bg) }`、拖动中 `cursor:grabbing !important` + `.mk-float-body{ pointer-events:none }`。

**新增回归（`tools/mock-probe.mjs` I 段 5 例，专打"拖拽中途被 render 重建"）**：

| 例 | 断言 | 结果 |
|---|---|---|
| I1 | 重建后仍在拖动状态（`body.mk-dragging` + `.mk-float.dragging`） | `{"swapped":true,"oldConnected":false,"dragging":true,"bodyDrag":true}` ✅ |
| I2 | 重建后松手：落位 == 拖动中最后位置 | 拖动中 `{x:390,y:944}` == 松手后 `{x:390,y:944}` ✅ |
| I3 | 松手后清理拖动态 | ✅ |
| I4 | 分隔条拖动中 `render()` 重建后仍跟随指针 | `314 → 494`（期望 +180）✅ |
| I5 | 分隔条重建后「拖动中 == 松手后」逐像素 | `[494,730,430]` == `[494,730,430]` ✅ |

（另有既有 **H1~H5**：H1 分隔条拖动中==松手后逐像素 `[404,820,430]`、H2 只改相邻两格、H3 +90px、H4/H5 拖拽中 `⧉▣✕` 与页签 `✕` `opacity=0`；**G 段 7 例**：预览矩形 == 落位矩形逐像素相等（波形组左/右/上/下/中心、工作区左外环、底外环）。）

#### ② 原型「1:1 完全照搬真机」重构

**新增 `tools/gen-mock-page.mjs`（原型页生成器，唯一正确来源 = 真机 `index.html`）**：

1. 读真机 `index.html` **全文**（只读，绝不写回）；
2. **机械替换**资源路径：`css/ js/ lib/ img/` → `../css/ ../js/ ../lib/ ../img/`（原型页在 `prototype/` 子目录，URL 层级必须与真机一致，否则 `js/sim` 的 ESM 相对 `import` 会 404）；
3. 内联 module 说明符 `'./js/sim/project-model.js'` → `'../js/sim/project-model.js'`（module 的 import 按**文档 URL** 解析）；
4. 真机 head 内联 `<style>` 之后插一行 `ui-mockup.css`（原型外壳样式**只在最后覆盖**，不改真机任何元素的原生规则）；
5. `</body>` 前追加 **`prototype/mock-tail.html`**（工作区宿主 / 状态栏 / 帮助浮层 / `ui-mockup.js`）。

**新增 `prototype/mock-tail.html`**：原型独有的"外壳"（工作区宿主 `#mk-park`、状态栏、帮助浮层、拖拽引擎脚本引用）—— 与真机 chrome 彻底分离，避免混进真机源码。

**结果**：`prototype/ui-mockup.html` = 64,658 B / 1,133 行（真机骨架逐字 + 原型外壳），**菜单栏 / 工具带 / 代码区（CodeMirror 宿主）/ 波形显示区 = 真机原样 DOM + 真机原样 CSS + 真机原样 JS 资源**。

**真机 vs 原型 1:1 比对（`node .e2e-tmp/r37e.mjs`）= 13 same / 1 diff**：

| 维度 | 结论 |
|---|---|
| `#menu-bar` / `#toolbar` outerHTML（归一化 `../img/` 后） | **SAME** |
| `#menu-bar` / `#toolbar` 矩形、菜单项(4) 矩形、工具条子元素(**35**) 矩形 | **SAME** |
| CodeMirror 源码文本 / 行数 / 字体·颜色·背景 | **SAME** |
| `verilog-source` 兜底值 / `rtl-tree` 前缀 / `sim-status` 文本 / 主题 CSS 变量 | **SAME** |
| sim 卡片 id 集合 | **DIFF**（仅 DOM 顺序：真机 `[source,rtl,vcd,tb]` vs 原型 `[rtl,source,vcd,tb]`，**无害**） |
| 画布尺寸 | 真机 `1540×922` vs 原型 `1540×609`（高度差 = 面板高度，**宽度相同**） |

**像素 diff（`node .e2e-tmp/r37f.mjs`，同一页面内 canvas 比对）**：

| 区域 | 结果 |
|---|---|
| wave canvas `908×609` | `diffPx=78/552972 = **0.0141%**`，`maxDelta=31`（只差网格虚线抗锯齿亚像素 `(240,240,240)` vs `(242,242,242)`） |
| chrome band `1680×86` | `diffPx=681/144480 = **0.4713%**`，`maxDelta=11` |

→ **波形显示区 1:1 达成**。

**真机黄金基线（1680×1000 headless，供日后回归）**：`#menu-bar` l=0 t=0 w=1680 **h=40**；`#toolbar` l=0 **t=40** w=1680 **h=46**；`#main-area` t=86；原型 `#workbench` t=86 h=888、`#status-bar` t=974 h=26；波形面板内 `#wave-view` 908×609、`#wave-canvas` 1540×609。原型布局树：`col[0.74,0.26]` → `row[0.19,0.55,0.26]`（z / rtl+vcd ｜ wave ｜ source+tb）+ z-4 console。

**关键约束（必须遵守）**：

- **绝不能改 `css/` / `js/` / `lib/` 下任何文件**（真机 ESM 相对导入，URL 路径必须与真机一致）；**`js/sim/panel-layout.js:72 if (!cards.length) return null;`** → 4 张卡片被原型搬走后 `panelLayout` 为 null，**无需改任何 js**。
- **U0-R 仍在生效**：波形区**不得加子功能栏**；绘图/编辑控件全留统一顶栏 `#toolbar`；**已有绘图 UI 照搬不改**。

#### ③ 审计口径校准（07 D26）

`tools/ui-audit.mjs` 的 **R5 间距刻度 / R6 禁隐式溢出 / R8 不被裁切** 三条改为**只在 `target==='real'` 判定**；mock 豁免（原型继承真机原生间距 `{4,6,8,10,12,18}`、真机 1280 `#toolbar` 溢 192px、步数/子步数越界 —— 这些是真机待优化项 **P-UI-02**，属 U3，**不是原型缺陷**）。mock 仍保留 **R3 主按钮唯一 / R6 控制带禁换行 / R9 提示不进工具带**。

**理由（用户口径）**：「1:1 完全一致」优先于旧审计口径；**绝不为迁就旧审计去改真机 DOM / 间距 / toolbar 行为**。

#### ④ exe 重新打包

- `build-prototype.ps1` 内嵌目录由仅 `prototype/` 扩为 **`prototype/ img/ css/ js/ lib/`（res count 27 → 54）** → `WavePaintMockup.exe` **186,368 B → 1,709,056 B**（`mockup-version.txt` = `v0.4.0-mock build 2026-09-13 18:55:12 b93ad07`）；`MapPathToResource` 按逻辑名命中，**C# 一行未改**。
- ⚠ **打包前必须关掉正在运行的旧 exe**：本轮首次 `csc` 失败 `CS0016 未能写入输出文件…另一个程序正在使用此文件`（用户上轮 review 留下的进程 PID 47024/70792）→ `taskkill /F /IM WavePaintMockup.exe` 后 `csc exit: 0`。
- `tools/mockup-exe-smoke.mjs` 同步：资源清单加 `css/wavepaint.e7b903ef.css`、`js/wavepaint.clean.js`、`js/sim/ui-bridge.js`、`js/sim/engine.js`、`lib/codemirror.bundle.js`（**与磁盘逐字节比长度**）；首页断言由 `mock-banner` 改为 **`#workbench` + `#mk-park` + `#menu-bar` + `#toolbar`**；404 分支改 `/js/sim/engine.js.bak`（内嵌 `js/` 后 `/js/core/__core.js` 已变 200）→ **56/56 ✅**。

#### ⑤ 实测汇总（全部实跑）

| 项 | 命令 | 结果 |
|---|---|---|
| 原型探针（源码 dev-server） | `MOCK_BASE=http://127.0.0.1:8961 node tools/mock-probe.mjs` | **55/55**，失败 0 ✅ |
| 原型探针（**exe 服务**） | `node tools/mock-probe.mjs http://127.0.0.1:17899` | **55/55** ✅ |
| 控件审计（原型） | `node tools/ui-audit.mjs --mock` | 1680 / 1280 **两档违规 0** ✅（D26 新口径） |
| exe 无浏览器自检 | `node tools/mockup-exe-smoke.mjs` | **56/56** ✅ |
| 真机 vs 原型 1:1 | `node .e2e-tmp/r37e.mjs` | **13 same / 1 diff**（diff = 卡片 DOM 顺序，无害） ✅ |
| 像素 diff | `node .e2e-tmp/r37f.mjs` | 波形画布 **0.0141%** / chrome band **0.4713%** ✅ |
| 落点预览矩阵 | `node .e2e-tmp/r37c.mjs` | 10 例全过 ✅ |
| 分隔条 + 拖拽按钮 | `node .e2e-tmp/r37d.mjs` | 8 例全过 ✅ |

#### ⑥ 改动文件

| 文件 | 改动 |
|---|---|
| `prototype/ui-mockup.js` | **核心修复**（稳定 id + 现查活节点 + 监听挂 window + `draggingFloatId`） |
| `prototype/ui-mockup.css` | 新增 `.mk-float.dragging` 系列样式 |
| `prototype/ui-mockup.html` | **由 `tools/gen-mock-page.mjs` 重新生成**（真机 1:1 骨架，64,658 B / 1,133 行） |
| `prototype/mock-tail.html` | **新增**（原型外壳：工作区/状态栏/帮助浮层/拖拽引擎） |
| `tools/gen-mock-page.mjs` | **新增**（真机 `index.html` → 1:1 原型页生成器） |
| `tools/mock-probe.mjs` | 新增 **I1~I5** 五条拖拽重建回归；`E2` 过滤 `net::ERR_ABORTED`（导航取消 ≠ 加载失败） |
| `tools/mockup-exe-smoke.mjs` | 资源清单加 css/js/lib + 首页断言改真机骨架四件套 + 404 分支调整 → 56/56 |
| `tools/ui-audit.mjs` | **D26 口径**：R5/R6 隐式溢出/R8 只在 `real` 判定 |
| `build-prototype.ps1` | 内嵌目录扩为 `prototype/ img/ css/ js/ lib/` 五目录 |

#### ⑦ 红线 / 不做的事

- **真机一行未改**：`js/`、`index.html`、`css/`、`img/`、`lib/`、`WavePaintLauncher.cs`、`build.ps1` 全部未动 → **C1 未触发**，真机 `WavePaintClean.exe` 仍 22,015,488 B / 16:52:06、`version.txt` 仍 `v0.4.0 build 2026-09-13 16:52:06 83fab85`。
- 24 个冻结 id 全在（`sim-panel`/`verilog-source`/`verilog-cm-host`/`rtl-tree`/`vcd-tree`/`tb-source`/`sim-status`/`sim-recover`/`app-version` …）。
- 不改绘图 UI；不动 `js/sim/engine.js`（C9）；不新建弹窗入口（C10）。
- `prototype/`、`tools/`、`memory/` 不进 `resources.txt`。

---

### 4.26 ✅ 已完成（对外交付文档，零代码改动）：给外部 UI Agent 的「提示词 + 交接文档」（第二十八轮 2026-09-13）

**用户原话**：「写一段提示词和一段交接文档，我将交由其他 AI Agent 进行 UI 设计和前端界面的设计，
要求就是之前和你说的那样，**组件的分布就按照 Verdi 一样分布**，之前我批准过的**可滑动组件加上
最左侧、中间、最右侧和底下的布局**，其中**波形界面就是以前的代码，完全的照搬**，我将交由 AI Agent
单独进行 UI 设计的 AI Agent 进行 UI 代码的编写。」

**交付物（新增目录 `docs/ui-agent/`，2 个文件）**

| 文件 | 字节 / 行数 | 作用 |
|---|---|---|
| `docs/ui-agent/PROMPT.md` | 7,615 B / 95 行 | **提示词**：可直接复制粘贴给外部 UI Agent 的入口 prompt（角色 / 唯一目标 / 10 条硬性要求 / 黑名单 / 三件套交付物 / 自检命令 / 回答格式） |
| `docs/ui-agent/HANDOFF.md` | 44,174 B / 749 行 | **交接文档**：12 节 + 2 附录，唯一权威规格 |

**HANDOFF 目录**：§0 TL;DR ／ §1 项目简介与事实卡（含技术栈 / 目录地图 / 原型四文件）／ §2 职责范围与写入白名单·黑名单
／ §3 环境·运行·构建·PowerShell 5.1 陷阱·测试脚本 ／ §4 目标 UI 规格（Verdi 对照表 / 8 面板清单与宿主 id / `sim` 默认预设
树 / splitter 8 条 / 拖拽停靠 7 种动作 / 控件铁律 R1~R9 + G0~G8 分组 + 刻度变量 / 状态栏三段）／ **§5 波形区·代码区 = 1:1
照搬铁律 + 已达成证据（13 same / 1 diff、波形画布像素 diff 0.0141%）+ 黄金基线尺寸 + 生成器三条机械替换** ／
**§6 冻结契约面（24 id / class·dataset / 状态类 / 属性 / 可新增边界 / `#mk-park` 搬运模式）** ／ **§7 交互红线 6 条** ／
§8 可复用资产（现有停靠引擎能力表 / 主题变量 / `mk-` 前缀 / 帮助浮层）／ §9 硬约束 C1·C2/C3·C8·C9·C10·C17·C19 +
D20/D22/D26/D27 + U0-R ／ §10 验收口径（唯一 = 用户双击 exe 拖一遍）+ 自检命令 + 12 条手工清单 + 汇报格式 ／
§11 故意不做 · 已知未做（P-UI-02 未修是有意的 / G1~G8 暂缓 / #84·#77·#78 远期 / 单实例 / 不写 `.wp` / 页内浮动，
以及"你在总排期中的位置"表）／ §12 术语表 ／ 附录 A 一页纸速查 ／ 附录 B 改完后的完整命令序列。

**两条本轮新增的关键澄清（防止外部 Agent 好心办坏事）**

1. **`#toolbar` 是 1:1 复制，不许重排**：`prototype/ui-mockup.html` 的 `#toolbar` = 真机 `index.html` 逐字复制
   （实测 **21 个带 `.tool-btn` 类**的元素），它**原样继承**真机的间距/溢出问题（D26 口径：R5/R6/R8 只在真机判定）。
   §4.6 明确写出"阶段 1 不要为了让审计好看去改原型工具带"。另实测澄清：**当前工具带里没有"运行仿真"按钮**
   （`#sim-run` 在面板 `source` 里），G0~G8 分组表是**阶段 2 / U3 的目标形态**而非现状。
2. **阶段边界写死**：本阶段只做 `prototype/` 沙盘（不触发 C1）；**"接线到真机"必须等用户明确授权**
   （阶段 2 = D0/U2 → U3 → D1 → D2 → D3 → D4）。

**红线**：本轮**只新增 `docs/ui-agent/` 两个 Markdown 文件**，未改任何受版本控制代码
（`index.html` / `js/` / `css/` / `img/` / `lib/` / `prototype/` / `tools/` / `*.cs` / `*.ps1` 全部未动）
→ **C1 未触发、真机 `WavePaintClean.exe` 未重建**（仍 22,015,488 B / 2026-09-13 16:52:06 / `83fab85`）；
原型 `WavePaintMockup.exe` 亦未重建（仍 1,709,056 B / 18:55:12 / `b93ad07`）。两个文档 LF 行尾、代码围栏配对（2 / 30）。

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
