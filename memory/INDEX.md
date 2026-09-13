# 📌 WavePaint 记忆中心（唯一入口）

> **任何 AI 新开对话，从本文件开始。**
> `memory/` 是项目全部跨 AI 记忆的唯一家园；其他目录不得再存放记忆文件。
> 旧目录 `.workbuddy/` 与 `docs/` 已删除，请勿再从其他位置接手记忆。

---

## 一、读我顺序

1. **`01-PROJECT.md`** —— 这是什么项目、架构如何、数据怎么流。
2. **`02-WORKFLOW.md`** —— 怎么干活、什么绝对不能做、验证门槛是什么。
3. **`03-REQUIREMENTS.md`** —— 需求台账，包含全部历史需求与状态。
4. **`04-PROGRESS.md`** —— 当前做到哪、下一步做什么。
5. **`09-HANDOFF.md`** —— 下一任 AI 交接页。

如需历史细节：

6. **`05-LOGS.md`** —— 每日日志索引。
7. **`06-PITFALLS.md`** —— 历史坑库。
8. **`07-DECISIONS.md`** —— 关键技术决策。
9. **`08-ROADMAP.md`** —— 路线图与远期方向。

---

## 二、记忆体系结构

| 文件 | 类型 | 何时更新 |
|---|---|---|
| `01-PROJECT.md` | 项目知识与架构 | 架构 / 口径变化时 |
| `02-WORKFLOW.md` | 工作流与硬性约束 | 流程 / 约束变化时 |
| `03-REQUIREMENTS.md` | 需求台账 | 每次新增或变更需求 |
| `04-PROGRESS.md` | 当前进展 | 每次任务开始 / 结束 |
| `05-LOGS.md` | 日志索引 | 每次工作后 |
| `06-PITFALLS.md` | 坑库 | 踩到新坑时 |
| `07-DECISIONS.md` | 技术决策 | 做出重要取舍时 |
| `08-ROADMAP.md` | 路线图 | 规划变化或完成阶段时 |
| `09-HANDOFF.md` | 交接说明 | 每次会话结束或暂停 |
| `logs/*.md` | 每日操作日志 | 每次工作新建或追加 |

---

## 三、维护铁律

| 触发 | 必须更新 |
|---|---|
| 修改任何代码 | `04-PROGRESS` + 当日日志 |
| 新增 / 变更需求 | `03-REQUIREMENTS` |
| 改动会被内嵌 exe | 另按 `02-WORKFLOW` C1 重建 exe |
| 踩到新坑 | `06-PITFALLS` |
| 做出重要取舍 | `07-DECISIONS` |
| 完成路线图项 | `08-ROADMAP` + `04-PROGRESS` |
| 交接 / 暂停 | `09-HANDOFF` |

---

## 四、禁止事项

- 禁止在 `memory/` 之外新建记忆目录。
- 禁止删除历史日志，只能追加或更新。
- 禁止只改代码不更新记忆。
- 禁止绕过 `01/02/04/09` 直接从旧目录接手。
- 禁止重做已完成的解混淆、重构、批次1~10。

---
*最后更新：2026-09-14（第三十六~三十九轮：**源码面板精简为「文件标签条 + 代码框」两件套 + 「自动加信号 / 运行仿真」收进编辑栏末端 + 工具带窄屏换行 + 「仿真状态」升级为全应用唯一文本状态流（框套框彻底退役）+ 后端 `@@LOG:` / `@@VCD:` 分段协议 + exe 重建**）。
用户原话（第三十八~三十九轮）：「将仿真完成的框**放到仿真状态里**，**不是让框放到另外一个框下面**，而是**直接把框里的内容就是仿真完成的日志，直接的文本直接从仿真状态中输出**就可以了……如果**代码编译不过，可以把编译的问题、编译的报错直接输入到仿真状态这个窗口中**，通过文本输出，相当于这是一个**通用的端口或者说状态的一个显示部分**。可以将**其他各种状态显示的信息汇总到这里**」。
用户原话（第三十六~三十七轮）：源码块「**块里面好像套了一个块，有双层的标题栏**，请将下面这个标题栏直接去除掉」；源码栏「只放两个东西，一个是**文件的列表**……然后保留这个**代码框**」；
「将**自动加信号和运行仿真**两个按钮放到**编辑栏**……**解析 RTL 和生成 TB 不需要**这两个功能……**导入源码也不要**这个按钮」；文件增删「**通过一个加号和一个减号来实现**添加文件和移除文件的功能……**类似于浏览器新标签页的添加方式和标签页的关闭方式**」。
**第三十六~三十七轮**（代码 commit `8d530c2` / 4 files / +505 −19）：`css/workspace.css` 在停靠模式用 CSS 隐藏 `#sim-card-*` 第二层标题栏（**隐藏不删节点** —— 宿主 id 不可动）+ `#toolbar{flex-wrap:wrap}`；
`index.html` `.source-actions` 整组加 `hidden`（须补 `.source-actions[hidden]{display:none!important}`，作者 `display:grid` 会盖掉 UA `[hidden]` = **06 P47**）、删「添加文件 / 移除文件」、「自动加信号 + 运行仿真」进编辑栏末端 `#sim-tool-actions`、
`#sim-panel` 的 `top` 由硬编码 `92px` 改 `calc(40px + var(--wp-toolbar-h,46px) + 6px)`；`js/sim/ui-bridge.js` `renderFileTabs()` 重写（`.source-chip` + **兄弟节点** `.source-chip-close`）+ 新增 `removeFileAt()` + `syncToolbarHeight()`。
**「点运行仿真没反应」真根因 = `#toolbar` 窄屏溢出**（`flex-wrap:nowrap` + `overflow:visible`，内容总宽 ≈1470px → 750px 窗口下末端控件被推出视口，`elementFromPoint` 返 `null`；换行后二次根因 = `#sim-panel` 硬编码 `top:92px` 盖住按钮）= **06 P48 / 07 D35**；**禁用 `overflow-x:auto` 修**（会把 `overflow-y` 变成 `auto` → 裁掉绝对定位的 `.dropdown-content` / `.submenu-content` 弹出菜单）。
**第三十八~三十九轮**（代码 commit `24dab0a` / 8 files / +276 −149）：**否决第 37 轮「框套框」形态** —— `#sim-console-notes` + `#port-preview` / `#module-preview` 两个 `.helper-box` **连 CSS 物理删除**（**已退役，不得复活**）；
后端 `WavePaintLauncher.cs` 成功路径改回 **`"@@LOG:\n" + simLog + "\n@@VCD:\n" + vcd`**（日志为空退化为纯 VCD = 旧格式），`tools/dev-server.mjs` `execFileSync` → `spawnSync`（两条路径行为必须一致）；
前端 `js/sim/dock/workspace.js` 新增 `CONSOLE_MAX = 300` / `CONSOLE_KIND_CLASS` / `consoleAppend(text, kind)` / `window.wpConsoleAppend` / `flash()`，契约 = **一行一条 `div.mk-cline`**（`dock-probe` 按它统计行数，**不可改名**）+ 首行 `[HH:MM:SS]` 时间戳 + `kind` 着色 + 自动滚底；
`js/sim/ui-bridge.js` 删 2 个 ref + 新增 `consoleOut()` / `firstLine()` + **23 处**原「写 helper 框」改写成文本行 + **E2 分段解析**（**只有 `startsWith("@@LOG:")` 才分段**，否则整体当 VCD = **新 exe / 旧 exe / dev-server 三兼容**）；
`index.html` 删 `#sim-console-notes` 及 4 处 `.helper-box` / `.helper` CSS → `#sim-console` 子节点恰好 3 个；`css/workspace.css` 日志皮肤**从 `body.wp-dock` 提为全局** + 4 条 kind 配色 + §6 **逃生口垫片**（`#sim-console-log{flex:0 1 auto;min-height:64px;max-height:38vh;overflow:auto}`，**绝不能 `display:none`**）。
**关键结论**：**成功路径也必须回文本**（否则 iverilog warning 与 `$display` 输出全被丢弃）；**Windows 是 CRLF** → 切行必须 `/\r?\n/` + 逐行 `replace(/\r/g,'')`；`#sim-status` 是**单行元素**（多行先 `firstLine()`，否则挤成一坨 = **06 P50**）；**C# 字面量坑**（脚本改 `.cs` 时 `"@@LOG:\n"` 的 `\n` 必须是两个字符，写成真实换行会 `CS1010` / `CS1646` = **06 P49**）。
**实测**：`regression` 79/79 / `e2e-ui` 88/88 / `e2e-rtl` **66/66** / `e2e-sim` 0 失败 / `probe-param` 全过 / `source-panel-probe` ✓ / `dock-probe` ✓（`{"groups":4,"vis":6,"hidden":0}`）；`ui-audit --all --check` 仅剩 **R5 间距 19 处**（U3 / D4 旧基线，**非本轮引入**）；`ui-audit real` 1280 / 1440 工具带溢出 **192px / 32px → 0px**。
**触发 C1 → exe 重建 `22,115,840 B` / `v0.4.0 build 2026-09-14 00:17:03 24dab0a`**（C8 特征串 `@@LOG:` = 4 / `mk-err` = 4 / `consoleAppend` = 5）+ `exe-smoke` 全过 + 真机 `/api/sim` 直连（正常 / 语法错误两路）+ 真机端到端（headless Edge 连 exe 17817）全过。
同步 `04 §4.28 / §4.29` + §1 快照、`07 D35 + D36`、`06 P47~P50`、`03` 表 K **#98**、`08 §2.3 / §2.5 / §6.7 / §7.9 / §7.10`、`09 §3.0`（第三十六~三十七轮）/ `09 §3.1`（第三十八~三十九轮，**当前生效**）、`05-LOGS` 索引 2 行、当日日志「第三十六~三十七轮」段 + 新建 `memory/logs/2026-09-14.md`。
**下一步 = 等用户 review 真机 `WavePaintClean.exe`** → **D2**（页内浮窗最大化 / 键盘 / 多浮窗层级）→ **D3**（持久化 + 3 预设收口，**不写 `.wp`**）→ **D4 + U3**（真机工具带分组 / 刻度 / 尺寸 / `⋯` 溢出，修 **P-UI-02** 的 R5 间距 19 处基线）；**#95（G1~G8）** 用户明确暂缓；**#84 / #77 / #78** 远期。维护者：任何接手的 AI。

<details>
<summary>上一轮记录（第二十九~三十五轮：回归真机基线四区停靠 UI + 浮窗/菜单真 bug 修复 + 无死局护栏 + exe 重建）</summary>

*最后更新：2026-09-13（第三十五轮：**回归真机基线四区停靠 UI + 浮窗/菜单真 bug 修复 + 无死局护栏 + exe 重建**）。
用户原话：「经测试，**别的 Agent 写的 UI 不可靠**，请还是按照**原来基线原来的 UI** 进行修改，修改 bug 逐步完善并实现。……
实现**左中右下分块的模式，不同块的界面可以相互拖拽**，布局和 **Verdi** 一样，其中最重要的**中间的波形区需要特殊一些，
波形区的显示直接套用原本波形区显示的代码，要求显示完全一样**，然后**之前的编辑栏位置不变**，
**所有的分栏、所有的块儿都在之前编辑栏的下边**。……**尽量采用成熟的 UI 方案或者 UI 套件**……**保证 UI 的稳定性**」。
**本轮裁决 = 废弃外部 UI Agent 路线（07 D28）**，全部 UI 改动回归真机基线：**新增 `js/sim/dock/workspace.js`（1,169 行自研停靠引擎）
`css/workspace.css`（20,024 B / 309 行 / 84 条规则）+ `index.html` 外壳（`#workbench` / `#wp-status-bar`）** →
默认预设 **`sim`** = 左 `[rtl/vcd]` 19% / 中 `[wave]` 55% / 右 `[source/tb]` 26% / 下 `[console]`，
**全部位于吸顶 `#menu-bar` + `#toolbar`（编辑栏）之下且编辑栏位置不变**；波形区 = `#main-area` **原样搬入（1:1，绘制代码一行未改）**。
能力：拖动页签 = 停靠（并入 / 分栏 / 外缘新建）/ 双击·中键页签 = 浮出页内浮窗 / 分隔条比例 / `✕` = 隐藏（**有护栏**）/
页签条 `＋` = 恢复面板与 3 预设 / `?dock=off` 逃生口。**面板一律整块搬家不克隆**（未显示时摘到 `#mk-park`，`#sim-panel` 原地保留）。
**修掉的真 bug（06 P40~P46）**：`#workbench` 塌成 19px / 画布停旧尺寸 / 拖拽僵尸态 / 「并入」被外缘环带顶掉 /
浮窗永远被吸进组 / `✕` 无护栏空工作区死局 / **`render()` 按 `.mk-split` 清根致「四区变六区」**。
**实测**：`node tools/dock-probe.mjs` **81/81 全绿**（真实 Edge headless + CDP，1680×980）；regression 79/79；e2e-ui 88/88（`?dock=off`）；
e2e-rtl 61/61；e2e-sim 0 失败；真机 `exe-smoke` 全过。**触发 C1** → exe 重建 **22,096,896 B / `v0.4.0 build 2026-09-13 22:36:31 aec17e8`**。
同步 `04 §4.27` + §1 快照、`07 D28~D34`、`06 P40~P46`、`09 §3.2`、`05-LOGS` 索引、当日日志「第二十九~三十五轮」段、
`08 §2.2 / §2.6 / §6.10 / §7.10`。**下一步 = 等用户 review 真机 `WavePaintClean.exe` 的四区停靠 UI**；
之后 D2 → D3 → D4 + U3（修 P-UI-02）；**#95（G1~G8）** 暂缓。维护者：任何接手的 AI。

</details>

<details>
<summary>上一轮记录（第二十八轮：给外部 UI Agent 的「提示词 + 交接文档」）</summary>

*最后更新：2026-09-13（第二十八轮：**给外部 UI Agent 的「提示词 + 交接文档」（纯文档，零产品代码改动）**）。
用户原话：「写一段提示词和一段交接文档，我将交由其他 AI Agent 进行 UI 设计和前端界面的设计，要求就是之前和你说的那样，
**组件的分布就按照 Verdi 一样分布**，之前我批准过的**可滑动组件加上最左侧、中间、最右侧和底下的布局**，
其中**波形界面就是以前的代码，完全的照搬**，我将交由 AI Agent 单独进行 UI 设计的 AI Agent 进行 UI 代码的编写」。
**本轮唯一交付 = 两份对外文档（零产品代码改动）**：**`docs/ui-agent/PROMPT.md`**（7,615 B / 95 行，可整段复制粘贴的**入口提示词**：
角色定位（Verdi/ModelSim 类 EDA UI 工程师）→ 第一步必读 HANDOFF → 唯一目标 → 10 条硬性要求 → 黑名单 →
三件套交付物（`prototype/` 源码 + `WavePaintMockup.exe` + 改动说明）→ 4 条自检命令 → 回答格式）；
**`docs/ui-agent/HANDOFF.md`**（44,174 B / 749 行 / 围栏 30，**唯一权威规格** 12 节 + 附录 A 一页纸速查 + 附录 B 完整命令序列：
§0 TL;DR / §1 项目简介与事实卡（目录地图 + 原型四文件）/ §2 写入白名单·黑名单 / §3 环境·运行·构建 + PowerShell 5.1 五条陷阱 + 测试脚本 /
§4 目标 UI 规格（Verdi 对照表 / 8 面板清单与宿主 id / `sim` 默认预设树 / splitter 8 条 / 拖拽停靠 7 动作 / 控件铁律 R1~R9 + G0~G8 分组 +
刻度变量 / 状态栏三段）/ §5 **波形区·代码区 = 1:1 照搬铁律**（13 same / 1 diff、像素 diff 0.0141%、黄金基线尺寸、生成器三条机械替换）/
§6 冻结契约面（24 id / class·dataset / 状态类 / 属性 / `#mk-park` 搬运模式）/ §7 交互红线 6 条 / §8 可复用资产 /
§9 硬约束 C 线 + D 线 + U0-R / §10 验收口径与自检 / §11 故意不做 + 总排期 / §12 术语表）。
**写作前只读复核（不靠记忆）**：`index.html` **24 个冻结 id 全部命中**（`main-area:838`/`sim-panel:846`/`sim-card-source:861`/
`sim-card-rtl:898`/`sim-card-vcd:909`/`sim-card-tb:919`/`wave-view:839`/`wave-canvas:840`/`tb-source:926`/`sim-status:929`/`sim-recover:933` …）；
`status-bar` 确认为**原型独有**（真机无）；`prototype/ui-mockup.js` 的 `PANELS`(8)/`HOME_ZONE`/`HOST_ID`(5)/3 预设/`hitTestOp`/`simulateDrop`/
`computeDrop`/`startPanelDrag`/`localStorage['wavepaint.mock.layout.v1']`/`window.__mock` 全在；
`mock-tail.html` 7 个原型元素（`#workbench`/`#mk-drop`/`#mk-caret`/`#mk-floats`/`#mk-park`/`#status-bar`/`#help-overlay`）全在；
`tools/gen-mock-page.mjs` 三条机械替换确认。
**本轮新量到的事实（已写进 HANDOFF §4.6「最容易犯的两个错」）**：原型 `#toolbar` = 真机逐字复制，含 **21 个带 `.tool-btn` 类**的元素
（`tool-open`/`tool-save`/`tool-undo`/`tool-redo`/`tool-zoom-out|in|fit`/`add-signal-btn`/`tool-cut`/`tool-paint-color`/`tool-bit-state`/`tool-paint`/
`tool-erase`/`tool-select`/`tool-arrow`/`tool-time-span`/`tool-marker`/`tool-time-jump`/`tool-text`/`tool-select-object`/`tool-properties`），
且**其中没有「运行仿真」**（`#sim-run` 在面板 `source` 里）→ 防外部 Agent 把 **G0~G8 目标分组表当成现状**去重排工具带。
**边界写死**：外部 Agent **写入白名单只有 `prototype/**`（+ `docs/ui-agent/**` 新增）**，`index.html`/`js/`/`css/`/`lib/`/`img/`/`memory/`/`tools/`/`*.cs`/`*.ps1` 一律只读；
本阶段 = **零后端 mock 沙盘**（不触发 C1）；**接线真机 = 阶段 2，必须等用户明确授权**（D0+U2 → U3 → D1 → D2 → D3 → D4 + U4）；
**唯一验收口径 = 用户双击 `WavePaintMockup.exe` 亲自拖一遍**（不接受链接 / 截图 / 设计稿）；
**D26 口径**（原型继承真机工具带间距与溢出特征，R5/R6/R8 只在真机判定）与 **D27 铁律**（跨重建交互禁止缓存 DOM 引用）已一并写进文档。
**未改任何产品代码**（`index.html`/`js/`/`css/`/`img/`/`lib/`/`prototype/`/`tools/`/`*.cs`/`*.ps1` 全未动）→ **C1 未触发**，
真机 exe 仍 22,015,488 B / 16:52:06 / `v0.4.0 build 2026-09-13 16:52:06 83fab85`，原型 exe 仍 1,709,056 B / 18:55:12 / `b93ad07`。
同步 `04 §4.26`、`05-LOGS` 索引、当日日志「第二十八轮」段、本页脚。
**下一步 = 用户把两份文档交给外部 UI Agent** → 等对方产出**新版 `WavePaintMockup.exe`** → 用户 review 通过（闸门 U-1 关闭）→
阶段 2：**D0 + U2** 合并同批（像素级零视觉变化）→ **U3**（真机工具带落地 + 修 **P-UI-02**）→ D1 → D2 → D3 → D4 + U4。
维护者：任何接手的 AI。

</details>

<details>
<summary>上一轮记录（第二十七轮：拖拽两条真 bug 修复 + 原型「1:1 完全照搬真机」重构 + 审计口径校准 + exe 重打包）</summary>

*最后更新：2026-09-13（第二十七轮：**拖拽两条真 bug 修复 + 原型「1:1 完全照搬真机」重构 + 审计口径校准 + exe 重打包**）。
用户原话：「目前各个面板的**拖动仍然有问题，拖动的预览和最后实际的效果不一致**，且**拖动按钮在拖动时的显示也有 bug**。
此外，代码显示区和菜单栏的显示等**并没有照搬原本的源码**，我希望**完全照搬它的源码，做出 1:1 的效果**，只是原本是全屏的，
现在是面板而已……我要 **1:1 完全一样的效果**，完全一致的效果**起码波形显示区是这样的**」。
**① 拖拽两条 bug 同一根因（06 P39 / 07 D27）= 真 bug**：拖拽闭包**缓存 DOM 引用**，而拖拽中途 `afterLayout()` 的
`setTimeout(60ms) → window.dispatchEvent('resize')` 触发原型 `render()`/`renderFloats()` **重建整棵 DOM** →
闭包里的 `el`/`handle`/`slots` 成**游离节点**，样式与类名写进空气（实证 `[fdrag.up] elConnected=false`）→
既致「预览 ≠ 落位」（往游离节点写 `style.transform`）又致「`⧉ ▣ ✕` / 页签 `✕` 乱闪」（游离 `classList` 判拖动态失效）。
**修法三条铁律**：**稳定 id**（`split()`/`cloneTree()` 给 split 补 `id='s-'+(++seq)` + `el.dataset.splitId`）/
**每次现查活节点**（`liveSplit()` / `floatsLayer.querySelector('[data-float="id"]') || el`，绝不用缓存引用）/
**监听挂 `window`**（`pointermove`/`up`/`cancel` 从 handle 改挂 window，跨重建拖动态用模块级 `draggingFloatId`，
松手统一 `renderFloats()` + `persist()`）；`ui-mockup.css` 新增 `.mk-float.dragging` 系列（`z-index:500` / accent 边框 / `cursor:grabbing`）。
**新增回归 I1~I5**（专打「拖拽中途被 render 重建」）→ mock-probe **34 → 55 项全过**。
**② 原型「1:1 完全照搬真机」重构**：新增 **`tools/gen-mock-page.mjs`**（**唯一正确来源 = 真机 `index.html`**）：
读真机全文（只读）→ 机械替换 `css/ js/ lib/ img/` → `../*` → 内联 module 说明符 `'./js/sim/*'` → `'../js/sim/*'` →
head 内联 `<style>` 后插一行 `ui-mockup.css` → `</body>` 前追加 **新增 `prototype/mock-tail.html`**（原型外壳：工作区 `#mk-park` /
状态栏 / 帮助浮层 / 拖拽引擎，**与真机 chrome 彻底分离**）→ **`ui-mockup.html` = 64,658 B / 1,133 行（真机骨架逐字 + 原型外壳）**。
由此**菜单栏 / 工具带 / 代码区（CodeMirror 宿主）/ 波形显示区 = 真机原样 DOM + 真机原样 CSS + 真机原样 JS 资源**。
**真机 vs 原型 1:1 比对（`.e2e-tmp/r37e.mjs`）= 13 same / 1 diff**：`#menu-bar`/`#toolbar` outerHTML（归一化 `../img/` 后）SAME、
矩形 + 菜单项(4) + 工具条子元素(**35**) 矩形全 SAME、CodeMirror 文本/行数/字体·颜色·背景 SAME、`verilog-source` 兜底 /
`rtl-tree` 前缀 / `sim-status` / 主题 CSS 变量 SAME；唯一 diff = sim 卡片 **DOM 顺序**（`[source,rtl,vcd,tb]` vs `[rtl,source,vcd,tb]`，无害）；
画布宽度相同（1540）高度差 = 面板高度。**像素 diff（`.e2e-tmp/r37f.mjs`）：波形画布 908×609 = `78/552972 = 0.0141%`**
（只差网格虚线抗锯齿亚像素 `(240,240,240)` vs `(242,242,242)`）/ chrome band 1680×86 = `0.4713%` →
**波形显示区 1:1 达成**。**真机黄金基线（1680×1000 headless）**：`#menu-bar` h=40、`#toolbar` t=40 h=46、`#main-area` t=86；
原型 `#workbench` t=86 h=888、`#status-bar` t=974 h=26；波形面板 `#wave-view` 908×609。
**③ 审计口径校准（07 D26）**：`tools/ui-audit.mjs` 的 **R5 间距刻度 / R6 禁隐式溢出 / R8 不被裁切** 三条改为
**只在 `target==='real'` 判定**（原型继承真机原生间距与 1280 `#toolbar` 溢 192px 等 = 真机待优化项 **P-UI-02**，属 U3，**不是原型缺陷**）；
mock 仍保留 R3 主按钮唯一 / R6 控制带禁换行 / R9 提示不进工具带。**理由（用户口径）**：「1:1 完全一致」优先于旧审计口径。
**④ exe 重打包**：`build-prototype.ps1` 内嵌目录扩为 **`prototype/ img/ css/ js/ lib/`**（`res count 27 → 54`）→
`WavePaintMockup.exe` **186,368 B → 1,709,056 B**（`v0.4.0-mock build 2026-09-13 18:55:12 b93ad07`）；
⚠ **打包前必须 `taskkill /F /IM WavePaintMockup.exe`**，否则 `csc` 报 `CS0016 未能写入输出文件…另一个程序正在使用此文件`；
`tools/mockup-exe-smoke.mjs` 同步（资源清单加 css/js/lib 逐字节比长度、首页断言改 `#workbench`+`#mk-park`+`#menu-bar`+`#toolbar`、
404 分支改 `/js/sim/engine.js.bak`）→ **56/56**。
**实测全绿**：mock-probe 源码 dev-server **55/55** / exe 服务 **55/55**、ui-audit `--mock` 1680+1280 违规 **0**、
smoke **56/56**、`r37c` 落点预览矩阵 **10/10**、`r37d` 分隔条 + 拖拽按钮 **8/8**、`r37e` 13 same / 1 diff、`r37f` 0.0141% / 0.4713%。
**真机一行未改**（`js/` `index.html` `css/` `img/` `lib/` `WavePaintLauncher.cs` `build.ps1`）→ **C1 未触发、真机 exe 未重建**
（仍 `v0.4.0 build 2026-09-13 16:52:06 83fab85` / 22,015,488 B）；24 个冻结 id 全在；未动 `js/sim/engine.js`（C9）。
同步 `04 §4.25` + §1/§2、`09 §3.3`（**重编号**：原 3.1~3.9 顺延为 3.3~3.11）、`06 P39`、`07 D26 + D27`、`05-LOGS` 索引、当日日志。
**下一步 = 等用户 review 第二十七轮 `WavePaintMockup.exe`** → 通过后按 **08 §7.8**：U2 + D0 合并同批 → U3（含 P-UI-02）→ D1 → D2 → D3 → D4+U4。
维护者：任何接手的 AI。

</details>

<details>
<summary>上一轮记录（第二十六轮：原型打包为可双击运行的 exe（交付方式升级：网页链接 → 零依赖 exe））</summary>

*最后更新：2026-09-13（第二十六轮：**原型打包为可双击运行的 exe（交付方式升级：网页链接 → 零依赖 exe）**）。
用户原话：「**提供的网页链接无法打开**，请按照**原本之前的方式**一样打包成一个**可直接运行的点 exe** 供我 review」
→ 上一轮 review 链路（`node tools/dev-server.mjs 8951` + 手输 URL）对用户不可用。**本轮 = 交付方式升级，不改原型界面本身**：
① 新增 **`MockupLauncher.cs`（528 行）** 原型专用启动器（自包含静态资源 HTTP 服务 + Edge `--app` 无地址栏窗口 + 单实例发现 +
关窗 12s 自动退出 + 最长 12h；端口优先 **17820**、`/api/ping` = **`WAVEPAINT-MOCKUP`**、单实例文件 `%TEMP%\WavePaintMockup_service.txt`、
窗口标题含「原型」→ **与真机四重身份隔离**），**独立于真机 `WavePaintLauncher.cs`（一行未改）**；
② 新增 **`build-prototype.ps1`**（**不写 `resources.txt` / 不动 `version.txt` / 不碰 `WavePaintClean.exe`**；须带 UTF-8 BOM）；
③ 新增 **`tools/mockup-exe-smoke.mjs`** 无浏览器自检 **41/41**；④ `tools/mock-probe.mjs` 支持 `MOCK_BASE` → **exe 服务上同样 34/34**；
⑤ `prototype/ui-mockup.html` 顶部绿条显示构建戳；⑥ `.gitignore` 加两产物。**交付物 = `WavePaintMockup.exe`**
（186,368 B / 2026-09-13 17:08:12 / `v0.4.0-mock build 2026-09-13 17:08:12 2d1636a`）。
**C1 未触发 → 真机 exe 未重建**（仍 `v0.4.0 build 2026-09-13 16:52:06 83fab85` / 22,015,488 B）。
同步 `04 §4.24` + §1/§2、`09 §3.3`（原 3.1~3.8 顺延为 3.3~3.10）、`07 D25`、`02 §3/§8`、`06 P38`、`05-LOGS` 索引、当日日志。
**下一步 = 等用户 review `WavePaintMockup.exe`** → 通过后按 **08 §7.8**：U2 + D0 合并同批 → U3（含 P-UI-02）→ D1 → D2 → D3 → D4+U4。
维护者：任何接手的 AI。

</details>

<details>
<summary>上一轮记录（第二十五轮：U0-R 顶栏统一（撤销 D-UI-A）+ 真机 splitter 高度模型根本重写 + 三条真 bug + 混淆残留清零）</summary>

*最后更新：2026-09-13（第二十五轮：**U0-R 顶栏统一（撤销 D-UI-A）+ 真机面板 splitter 高度模型根本重写 + 三条真 bug + 混淆残留清零**）。
用户四条原话：①「**波形的时间标 1234 等错误地放在了源码区**」；②「**编辑栏先不做修改**……保存图标、撤回图标、放大缩小图标等**还放到此位置**，
**波形区的子波形区现在不添加功能栏**，功能栏仍旧放在统一的顶栏那里」；③「现在各个窗口的**大小拖拽有 bug，似乎和鼠标坐标对不上**，而且检查显示等其他 bug」；
④「**已有绘图 UI 尽量不做改动**，直接照搬即可；如果是很混淆过的，请查明问题之前做过的所有代码的解混淆和剔除工作」。
**① 原型 U0-R**（`prototype/ui-mockup.{html,css,js}`）：撤销第二十四轮 **D-UI-A** —— 14 个下沉控件**全部收回统一顶栏** `#toolbar`（5 组 18 项 + `data-ovp`），
**`panelWave()` 整条 `.mk-toolrow` 删除 = 波形区零子功能栏**，帮助浮层 §5 + `mk-version`（→ `mock-3（顶栏统一 U0-R）`）同步；决策落 **07 D24**、**08 §7.4 / §7.9① / §7.10**。
**② 真机 `js/sim/panel-layout.js` splitter 高度模型根本重写**（「拖拽和鼠标坐标对不上」真根因 = 旧实现三处叠加缺陷：`onMove` 累计位移当增量反复叠加 / `weights` 被当像素但 `applyWeights()` 归一化成占比 /
`flex-basis:0` + 占比触到 `min-height` 后 px↔权重无恒定系数）：新增 `cardBaseline`/`pairSlackPx`/`resizePairTo`/`resizePair`，
`applyWeights` = `flexBasis 基线px` + `flexGrow 占比*100` + `flexShrink 0`，**`applyMinHeights` 同源同时写 `minHeight` 与 `flexBasis`**。
**③ 三条真 bug**：a) **时间标跑进源码区**根因 = 原型 `.mk-gutter` 缺 `white-space:pre`（`gutW 369→32`、`bodyW 59→396`，修复后 `ticksInSource 0`）；b) 原型 `.mk-tick` 类名冲突 → 波形刻度改 **`.mk-wave-tick`**；
c) 原型信号名列宽拖拽失效（`closest`→`querySelector`）+ 时间轴与波形轨横滚同步。**④ 混淆复查**：`js/wavepaint.clean.js` **无残留**（`_0x`/`\xNN` 均在注释或为产品功能；`lib/*.min.js` 是第三方正常压缩），
另清 **9 个残留 `_0x_` 前缀局部变量**（`_0x_wpf*` → `wpf*`，32 处）→ **正文 `_0x` 归零**。
**实测（全部实跑）**：`e2e-ui` **88/88**（I1 改口径 + 新增 **I4c 指针拖拽**）、`regression` **79/79**、`e2e-rtl` **61/61**、`e2e-sim` 0 失败、`mock-probe` **34/34**、`ui-audit --mock` 1680/1280 两档违规 **0**；
真机四档数字不变（1920 违规 1 / 1440 违规 3 / 1280 违规 3 = **U3 修 P-UI-02**）。
**C1 触发 → exe 已重建**（**22,015,488 B / 2026-09-13 16:52:06 / `v0.4.0 build 2026-09-13 16:52:06 83fab85`**，C8 特征串核验通过、`_0x_wpf`=0）。
同步 `03` 表 K（**#97** 措辞）、`04 §4.23` + §1/§2、`07 D24`、`08 §7`、`09 §3.3`（原 3.1~3.7 顺延为 3.3~3.9）、`05-LOGS` 索引、当日日志。
**下一步 = 等用户 review 第二十五轮原型** → 未提异议即按 **08 §7.8** 推进：**U2（工具带 spec 数据驱动化）+ D0（面板注册表，零视觉变化）合并同批** → **U3 真机落地 + 修 P-UI-02** → D1 → D2 → D3 → D4 + U4。
**提醒**：**波形区不加子功能栏**、**已有绘图 UI 不照改**（`js/wavepaint.clean.js` 绘制层 / `js/sim/engine.js` C9 一律不碰）。
维护者：任何接手的 AI。
</details>

<details>
<summary>上一轮记录（第二十四轮：控件与工具栏规范化 U 线 —— 方案定稿 08 §7 + 审计工具转正 + 原型 U0 重排）</summary>

*最后更新：2026-09-13（第二十四轮：**控件与工具栏规范化 U 线 —— 方案定稿（`08 §7`）+ 可复算审计工具转正 + 原型 U0 重排完成，等用户 U1 拍板**）。
用户 review 第二十三轮原型的结论：「**UI 排布在大体上基本正确，小的按钮上的排布以及控制栏的排布还需要斟酌，现在似乎有一些混乱**，大体上可以按照此方案进行改动，**请给出之后的工作方案**」
→ **形态层通过、只做控件层**，编号 **U0~U4**。**交付三件**：① **`08-ROADMAP.md §7` 全文**（§7.2 **P-UI-01~09 实测问题清单** / §7.3 **R1~R9 铁律** /
§7.4 **L0~L4 分层 + 主方案 D-UI-A**（真机 21 个图标按钮中 **14 个波形类控件下沉到波形面板上下文带**，全局带 **34 → 14 个顶层元素**）/ 备选 D-UI-B /
§7.5 刻度规范 / §7.6 `⋯` 溢出降级 / §7.7 U0~U4 / §7.8 **之后的工作方案（与 §6 D 线合并总排期 ≈8~9 工作日）** / §7.9 **四条待拍板**）；
② **`tools/ui-audit.mjs` 转正入库**（真实 Edge headless + CDP 量测，`--mock` / `--real` / `--all` / `--check` / `--widths=`，`violationsOf()` 与 R3/R5/R6/R8/R9 一一对应）；
③ **原型 U0 重排**（`prototype/ui-mockup.{html,css,js}`：`#toolbar` → L1 11 项 + `⋯`、面板带 `.mk-tbg` 分组 + `⋯`、`:root` 6 个刻度变量、删 `.mk-hintbar`、状态栏三段化）。
**实测**：`tools/mock-probe.mjs` **34/34**；`tools/ui-audit.mjs` 原型 mock **1680 / 1280 两档违规 0**（改动前 3 / 6）；**真机基线未修 = 1440 溢 32px / 1280 溢 192px（P-UI-02 真 bug，U3 修）**。
**C1 未触发、未重建 exe**（`prototype/**`、`tools/**` 均不进 `resources.txt`）。同步 `03` 表 K（**#97**）、`04 §4.22` + §1/§2、`07 D23`、`08 §7`、`09 §3.3`、`02 §3`、`05-LOGS` 索引、当日日志、本页脚。
**下一步 = 等用户在 U1 拍板 `08 §7.9` 四条 → D0 + U2（面板注册表 + 宿主容器抽象 + 工具带 spec 化，像素级零视觉变化）→ U3（真机落地 + 修 P-UI-02）→ D1~D3（停靠引擎 / 页内浮动 / 持久化）→ D4 + U4。**

</details>

<details>
<summary>上一轮记录（第二十三轮：四条拍板 + 零后端纯前端 UI 原型交付 —— D-1 闸门）</summary>

*最后更新：2026-09-13（第二十三轮：**用户四条拍板 + 零后端纯前端 UI 原型交付（D-1 闸门）**）。
用户原话：「G1 到 G8 暂不实现，可以解除侧栏解除层次树暂不左置，页内浮动面板，布局可以暂时不写……可以先做一个虚假的纯前端界面，
也就是不连接后端没有任何功能的前端界面。做出这样一个前端界面之后，给我看，我 review 完了、确认完了之后再进行后端连接的工作。」
**用户四条拍板全部通过**（对上一轮 `08 §6.10`）：① 面板形态 = **页内浮动面板**（不做真独立 OS 窗口）；② **解除**「侧栏保持右侧」；
③ **解除**「层次树暂不左置」；④ 布局**暂不写 `.wp`**。**附加**：G1~G8 全部暂不实现（#95 整线后延）；布局/预设/手感可先不做。
**交付 = `prototype/ui-mockup.{html,css,js}`**（≈960 行**轻量停靠引擎原型**：`split`/`tabs` 布局树 + 8 面板 + 3 预设 +
四向停靠 / 中心合并 Tab / 最外环新建区 / 浮出·最大化·收回 / 分隔条像素↔比例 / `Ctrl+Alt+1|2|3|0` /
`localStorage['wavepaint.mock.layout.v1']` 400 ms 防抖 / `window.__mock` 探针；主题变量逐条抄自真机 `:root`、类名 `mk-` 前缀零冲突）
**＋ 探针转正 `tools/mock-probe.mjs`**（真实 Edge headless + CDP + dev-server，**34/34 全通过**；含真实鼠标拖拽 B0~B3、
浮窗 C 组、布局体检 F1~F10）。**原型内修 4 个真缺陷**。**C1 未触发、未重建 exe**（`prototype/`、`tools/` 均不进 `resources.txt`）。
同步 `03` 表 K、`04 §4.21` + §1/§2、`07 D22`、`08 §6.8`（新增 D-1 行 + 两道闸门）与 §6.10、`09 §3.3`、`05-LOGS` 索引、当日日志、
`01-PROJECT` 目录说明。**下一步 = 等用户 review 原型形态（D-1 闸门），通过后进 D0/D1 真接线。**

</details>

<details>
<summary>上一轮记录（第二十二轮：面板系统重构方案成文 + 后端能力盘点 —— 纯规划，零产品代码改动）</summary>

用户问：① 现在后端到底支持到什么程度；② 要模仿 Verdi 实现「波形窗口 + 代码窗口 + 代码树窗口 + 其他窗口」
像 Word 一样自由排列组合与自由拖拽（意味着现有 UI 要大改），并要一份详细项目安排。
**本轮交付 `08-ROADMAP.md` §6（约 200 行）**：§6.1 后端能力表（逐条带 `WavePaintLauncher.cs` 行号证据）/ §6.2 后端缺口
**G1~G8** / §6.3 前端面板现状 / §6.4 与 Verdi 的差距表（4 项「大」）/ §6.5 选型对比 / §6.6 目标架构 /
§6.7 契约面与 e2e 影响面 / §6.8 分期 **#94 D0~D4（面板系统）+ #95 E1~E5（真·通用仿真器）+ #96 W1~W3（工程化）** /
§6.9 验收与回滚 / §6.10 **四条待拍板** / §6.11 与远期项关系。同步 `03` 表 K、`04 §4.20`、`07 D22`、`09 §3`。
**核心结论**：后端闭环（`/api/sim` → iverilog → vvp → VCD 整文本回传）已通，但范式单一（单顶层 + 画布即激励）；
**最大缺口 G1 = TB 只读**（`#tb-source` 是 readonly textarea，TB 只能由 `buildAutoTestbench` 生成）→ `#95 E1/E2` 是
「通用仿真器」的最小充分集，建议与 #94 并行优先；**G6** = `/api/snapshot` 后端已实现但前端全仓未接线（→ `#96 W2`）；
**选型建议 = 自研轻量 dock 引擎**（`js/sim/dock/*.js`：`PanelRegistry` + `LayoutTree` + `DockDnD`，面板只是已存在 DOM 节点换父容器
→ 24 个契约 id / class / dataset 天然不变），备选 Lumino / golden-layout，否决 React 系与 iframe 多窗（会重踩 #82 多窗口抢端口老坑）；
**#94 关键闸门 = D0 必须像素级零视觉变化**（回滚 = 1 commit）；08 §2.6 的三项剩余直接并入 #94 D1；#84/#77/#78 仍为远期。
**四条待拍板（08 §6.10 / 07 D22）**：① 是否解除「侧栏保持右侧」（AI 建议**解除**）② 是否解除「层次树暂不左置」
（AI 建议**解除**）③ 浮出 = 页内浮动面板（AI 建议）vs 真独立窗口 ④ 布局是否写进 `.wp`（AI 建议**不写**，只做
sessionStorage + localStorage）。验证：`regression` **79/79**；**C1 未触发、未重建 exe**。维护者：任何接手的 AI。*

</details>
