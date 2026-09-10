# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | **#87②：模块/实例全部接口一键入波形（2026-09-10 第十九轮）** —— 代码区按 **`Ctrl+Alt+4`** 把光标所在**模块（或实例）的全部接口（端口）**一次加为观察行：唯一作用域直加；同名模块/实例多作用域 → **代码区旁轻量浮层**（`mode="scope"`）选作用域；重复触发幂等；无 VCD 数据给中文说明。**不用 `Ctrl+4`**（Chromium/Edge 把 `Ctrl+数字` 当浏览器级「切换标签页」加速键，页面收不到 keydown）。**「全部接口」只指模块端口**（`kind === "port"`），体内 `wire/reg` 仍走 B4 单点加。实现：`rtl-panel.js` `installCodeEditor` 第 7 参 `onAddScope` + 捕获阶段 `Ctrl+Alt+4`（未接线不吞事件）；`ui-bridge.js` 浮层泛化 `openPicker` + `showScopePicker` + `moduleScopes`/`modulePorts`/`addVcdPathsToWave`（批量、只 render 一次、三桶返回、不设状态栏）/`modulePortsStatus`/`addModulePortsToWave`/`addModulePortsFromCode`；`tools/e2e-rtl.mjs` +J0~J7（→ **61/61**）。**本轮真 bug 修复**：光标在实例名上时不能拿实例符号的 `moduleName` 查作用域（`buildSymbolIndex` 把它覆盖成「定义所在模块」）→ 按实例名后缀查 `instancePaths`。regression **79/79**、e2e-rtl **61/61**、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建 22:49:32；**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9）。详见 04 §4.17、07 D19、06 P36、日志 2026-09-10 第十九轮。此前：**#76 已收口**（B5 第十八轮 / B3 第十七轮 / B4 第十六轮 / B1 第十五轮）、**#86 A1~A4**（第十四轮）、**第十三轮服务在线性根治**、**#85 观察行**（第十轮）、**第十二轮 RTL 树瘦身**、第六轮 5 项 + #93 收官 |
| 最近完成文档 | **第十九轮记忆同步**（2026-09-10）：04 新增 §4.17（§1 快照 + §2 时间线补记第十九轮 + §4.4 后续指向 + §6 补 #87② 口径）、06 新增 P36（三坑：`Ctrl+4` 被浏览器吞 / 实例符号 `moduleName` 被索引覆盖 / 「只 splice 不清登记 → render 复活行」）、07 新增 D19（`Ctrl+Alt+4` 选型 + 「全部接口 = 端口」+ 多候选复用代码区旁轻量浮层）、03 表 F·H #87 状态（**①②③ 全部落地**）、08 文件头 + §1 表 + §1.2 状态 + **新增 §1.3（#87② 拆解与实现）**、本文件全篇切第二十轮、`05-LOGS.md` 索引、`INDEX.md` 页脚、当日日志「第十九轮」。叠加生效的仍是**第十二轮澄清**：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4，**已落地**）；**RTL 结构树为纯代码层级浏览**（文件→模块→实例，跳源码），不显示接口信号、不承载加信号交互（原 #76 B2 撤销）。见 04 §4.10 / 03 表 F/H / 08 §1.2/§2 |
| 测试基线 | regression **79/79**；e2e-rtl **61/61**（#85 D1~D6 + 第十二轮 B3 + 第十四轮 E1~E6 + 第十五轮 F1~F9 + 第十六轮 G1~G7 + 第十七轮 H1/H2/H3/H4/H4b/H5/H6 + 第十八轮 I1~I6 + **第十九轮 J0~J7（模块体一次加 4 端口 / 幂等 / 同名两例化 `mode="scope"` 选择器 / 实例名直加（真 bug 修复点）/ `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / 只按 `Ctrl+4` 不触发 / 探针 + RTL 树仍无端口行 / `addVcdPathsToWave` 三桶分类）**）；e2e-ui 73/73（真实 Edge）；e2e-sim 0 失败（含「仿真后不自动灌信号」）；probe-param 全过；probe-tutorial/addbtn/simfail 全过；#82 真机冒烟通过；#93 绑定一致性 BINDINGS OK；**2026-09-10 第十九轮全量复跑全绿** + 第十三轮自愈专测 `verify-recovery2.mjs` 17/17 + 真实 Edge 协议探针 `probe-protocol.mjs` |
| 当前阻塞 | 无 |
| 下一步 | **#87② 已完成（第十九轮）→ #76（B1~B5）+ #87①②③ 全部收口**。**下一项 = 侧栏 / 整体 UI 重构设计方案（08 §2）** —— 侧栏现状已超规划（按钮 + 代码 + RTL 树 + VCD 树 + 仿真控制 + 状态区挤在一起），**先出「UI 重构设计方案」给用户 review（现状问题清单 + 布局草案 + 与主线衔接点 + 交付边界），确认后再实施，不直接开工**；「把 UI 设计交给其它 AI 出稿 + 人类 review」作为该方案线的一个工作方式选项（需先备好交互清单 / 现状 DOM 结构 / 术语表）。**#84 / #77 已推迟远期**（08 §3）；RTL 树只做代码层级浏览；服务在线性不变量见 02 C19 / 07 D15。开工前先读 08 §1.3/§2、04 §4.17、06 P36、07 D19 与 `memory/logs/2026-09-10.md` 第十九轮 |

---

## 2. 你必须先做的三件事

1. **读 `01-PROJECT.md`**
   - 理解架构、数据流、模块职责、唯一入口。
2. **读 `02-WORKFLOW.md`**
   - 理解 C1~C19 铁律，尤其是改代码后必须重建 exe、更新记忆、commit/push，以及 C19
     服务在线性不变量（固定端口 / 身份标识判活 / 恢复禁止跳转）。
3. **读 `04-PROGRESS.md`**
   - 确认当前进度，不要重做已完成工作。

---

## 3. 当前进度：**侧栏 / 整体 UI 重构 —— 「可拖拽多面板」已落地（第二十一轮）**；下一项 = **08 §2.6「剩余（可选/暂缓）」或用户新指令**

> **2026-09-11 第二十一轮（当前生效，已交付）**：用户拍板三条 —— ① 面板形态 = **可拖拽多面板**；
> ② 侧栏**保持右侧**（`#main-area` 骨架不动）；③ 层次树**暂不左置**；实施步骤授权 AI 自定。
> **本轮已把 08 §2.6 的 P0+P1+P2 核心一次性落地**：侧栏 4 个功能区卡片化
> （`section.sim-card` / `[data-sim-card=source|rtl|vcd|tb]` + 可折叠标题行
> `[data-sim-card-toggle]`）、3 条纵向分栏条（`[data-sim-split="source:rtl|rtl:vcd|vcd:tb"]`）、
> 侧栏宽度可拖（`#sim-resize-x` → CSS 变量 `--sim-panel-w`）、布局状态**只存 sessionStorage**
> （key `wavepaint.sim-panel-layout.v1`，**绝不进 `.wp`**）。**契约面一个未改**：24 个仿真栏
> id / class / dataset / 状态类全数保留（`#sim-tb-copy` 只是移进 TB 卡片头，id 不变）。
> **本轮还修掉一个真 bug**：矮视口（headless 默认 `750x485`）下源码卡只剩 80px、`.source-toolbar`
> （实测 170px，`.source-actions` 9 按钮折行）被 `overflow` 裁掉 → 坐标点击 `#sim-run` 落到 VCD 卡
> → **「点仿真无响应」**；已用 `measureMinHeight`（`min-height = min(实测内容高, 面板可视高*0.8)`）
> + `.sim-panel-body{overflow-y:auto}` + `#sim-status{position:sticky;bottom:0}` 修复。
> **已触发 C1** → exe 重建 `v0.4.0 build 2026-09-11 00:15:01 69b84d0`（`69b84d0` = **构建时 HEAD**，
> 承载本轮代码的 commit 是它的**下一个**，别误判 exe 落后）。全文见 04 §4.19 / 08 §2.2·§2.6 /
> 07 D21 / 日志 `2026-09-11.md` 第二十一轮。
> **主线下一项 = 08 §2.6「⏳ 剩余（可选/暂缓）」** —— VCD 树移入波形区 / TB 控制带收敛 /
> 层次树左置（**用户明确「暂不左置」**）；三项皆属可选/暂缓，**开工前先与用户确认范围与优先级**。
> **#84/#77 仍为远期**（第十一轮）；第十二轮澄清仍生效：加信号主路径 = **代码内点/选中变量（#76 B4）**，
> RTL 树只做代码层级浏览。

> **2026-09-10 第二十轮（其「待 review」状态已被第二十一轮取代）**：侧栏 / 整体 UI 重构设计方案成文 =
> `08-ROADMAP.md` §2.1~§2.9（§2.1 现状问题清单 / §2.2 目标布局 + 三条取舍 / §2.3 面板按钮归位表 /
> §2.4 主线衔接点 / §2.5 契约面冻结清单 / §2.6 分期 / §2.7「UI 设计交给其它 AI」评估 / §2.8 交互清单 /
> §2.9 状态）。**第二十一轮用户已拍板并落地（见上）**；方案的 P0/P1/P2 已按「一次性完成核心」执行，
> **不再需要逐期 review**。本轮零产品代码改动、未重建 exe（历史事实，保留备查）。

### 3.1 目标

**#76 已收口（B1~B5）；#87② 已于第十九轮落地；侧栏 UI 重构「可拖拽多面板」已于第二十一轮落地（全文见 08 §1.2/§1.3、04 §4.19）**

1. **B1 ✅ 底层：模块体内符号索引 + VCD scope 映射（第十五轮完成，勿重做）**：产物 =
   `rtl-nav.scanModuleSymbols` / `buildInstancePaths` / `buildSymbolIndex` / `moduleAtLine` /
   `findSymbols` / `resolveSymbolVcdPaths`、`vcd-index.findVcdPathsByName`、
   `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`。改之前先读 04 §4.13 与 06 P32。
2. **B4 ✅ 交互：代码内点/选中变量 → 加波形（第十六轮完成，勿重做）**（= #87① / “中追”式 =
   **唯一加信号主路径**）。实现要点：`rtl-panel.js` 导出纯函数 `symbolNameAt(text, from, to)`（剥 `q[3:0]`
   位选 / `a.b.c` 取末段 / ~110 词关键字排除 + `exact` 判定），`installCodeEditor` 增第 5 参 `onAddSymbol`
   （返回对象加 `getContext()`/`focus()`）；`ui-bridge.js` `addSymbolFromCode`（`currentSymbolIndex` →
   `moduleAtLine` 收窄 → `resolveSymbolVcdPaths`，**仅候选为空才** `findVcdPathsByName` 兜底）→ 唯一候选
   `pickVcdSignalIntoWave`（#85 链路），多候选弹 `.sim-symbol-picker`。**三条硬口径（勿违反）**：
   ① 快捷键是**捕获阶段 `Ctrl+Alt+W`**，不是 `Ctrl+W`（Edge `--app` 会吞 `Ctrl+W` 当关窗）；② 精确候选与
   名称兜底**不取并集**；③ 多候选选择器**只能挂在代码区旁**，严禁另建“信号层次选择框”。
   同时 `syncSimRows`（原 `replaceInjectedOutputs`）**不再灌 outputs**（收敛「仿真后全量自动灌信号」）。
   详见 04 §4.14 / 06 P33 / 07 D16。
3. **B3 ✅ 树 ↔ 代码双向跳转（第十七轮完成，勿重做）**：「树 → 代码」#86 A2 早有
   （实例行左键跳定义 / 右键跳例化点）；本轮补「**代码符号/行 → 反向高亮** RTL 树与 VCD 树节点」。
   实现：`rtl-panel.js` 导出 `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow` + `highlightRtlRow`/
   `highlightVcdSignal`/`clearRtlHighlight`/`clearVcdHighlight` + `installCodeEditor` 第 6 参 `onCursorMove`；
   `ui-bridge.js` `syncActiveFromCode` + `scheduleActiveSync`（180ms 防抖）+ `applyActiveHighlight`/
   `clearActiveHighlight`（重建后重放），`gotoSource()` 末尾闭环；`index.html` 只加两条 CSS。
   **六条硬口径（勿违反）**：① 联动状态模块级 + **树重建后重放**；② 纯光标移动只能靠 `selectionchange`；
   ③ `setText()` 重建后**必须强制补发**；④ **歧义宁可不亮**；⑤ 行匹配**必须有位置证据**（目标带 kind
   时同类硬条件）；⑥ 未知符号**保留模块 scope 高亮**（H4），完全无目标才全清（H4b）。
   **取词/映射完全复用 B4 的 `getContext()` + B1 的 `moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`，
   没有另写解析**。详见 04 §4.15 / 06 P34 / 07 D17。
4. **B5 ✅ 信号组 / 观察行随 `.wp` 工程存档与恢复（第十八轮完成，勿重做）**：观察行走
   `state.simWatches`，**只有桥认得它**（核心会丢 `__simInjected`/`__simWatchPath`/`width`/`msb`/`lsb`）→
   存档时桥只写**找回元数据** `simWatches = [{path,name,width,reference}]`（`archiveSimWatches`），
   载入时 `applyArchivedExtras` **先清 `vcd`/`outputs`/`simWatches`（画布换人）** 再
   `adoptArchivedWatchRows` 按「行名 == 观察路径」认领 + **补回位宽字段**；`syncSimRows` **无 VCD 时
   回退工程带回来的行**（有 VCD 仍以 VCD 为准）。存档桥已由「源码桥」泛化为 **`injectArchiveFields`**
   （原 `injectArchiveSourceFiles` 已不存在）。**信号组不用另写桥**（核心 `buildDocumentJson`/
   `loadFromFileContent` 已逐字段存还原 `groupName`/`groupColor`/`groupPath`，`GroupManager` 纯函数
   派生）。详见 04 §4.16 / 06 P35 / 07 D18。
5. **#87② ✅ 模块/实例全部接口一键入波形（第十九轮完成，勿重做）**：触发键 = **`Ctrl+Alt+4`**
   （**不是 `Ctrl+4`**）；「全部接口」= **模块端口**（`kind === "port"`），体内 `wire/reg` 仍走 B4
   单点加；作用域 = **例化路径**（顶层模块 → `tb.dut`）。落点：`rtl-panel.js` `installCodeEditor`
   第 7 参 `onAddScope` + 触发块 `request(via,event,handler)`（未接线手势静默放过）+ 捕获阶段
   `Ctrl+Alt+4`；`ui-bridge.js` `openPicker`/`showScopePicker`/`moduleScopes`/`modulePorts`/
   **`addVcdPathsToWave`**（批量、只 render 一次、三桶返回、不设状态栏）/`modulePortsStatus`/
   `addModulePortsToWave`/`addModulePortsFromCode`。**本轮修掉一个真 bug**：光标在实例名上时
   **不能**用 `findSymbols` 命中项的 `moduleName` 查作用域（`buildSymbolIndex` 把实例符号的
   `moduleName` 覆盖成「定义所在模块」）→ 改为按「**实例名后缀**」查 `index.instancePaths`。
   详见 04 §4.17 / 07 D19 / 06 P36 / e2e-rtl J0~J7。
6. **✅ 侧栏 / 整体 UI 重构「可拖拽多面板」（第二十一轮完成）**：用户拍板三条取舍后一次性落地
   （见本节顶部引用块）。实现在 **`js/sim/panel-layout.js`（新增）** + `index.html`（CSS + DOM 卡片化）
   + `ui-bridge.js`（接线 + `refs.panelBody`/`refs.resizeHandle` + `initPanelLayout()` + `__wpsim`
   探针 `get panelLayout`/`setPanelWidth(px)`/`resetPanelLayout()`）/ `rtl-panel.js`
   （`installCodeEditor` 返回值新增 `remeasure()`）。验收基线 `tools/e2e-ui.mjs` **86/86**（I 段 I0~I8）。
   **08 §2.6 的「P0/P1/P2」已视为完成**；剩余项见下条。
7. **下一项 = 08 §2.6「⏳ 剩余（可选/暂缓）」**：① VCD 树移入波形区；② TB 控制带收敛；
   ③ 层次树左置（**用户 2026-09-11 明确「暂不」**）。三项皆未开工，**开工前先与用户确认范围与优先级**；
   也可按用户新指令插队（**服务在线性类问题永远最高优先**，见 3.2 第 8 条）。

### 3.2 建议顺序

1. ✅ **#85（VCD 树点信号 → 观察行，第十轮完成）**：VCD 侧别重做。
2. ✅ **#86 A1~A4 + 服务在线性子项（第十三/十四轮完成）**：别重做。
3. ✅ **#76 B1（第十五轮）+ B4（第十六轮）+ B3（第十七轮）+ B5（第十八轮）完成**：别重做。
4. ✅ **#87②（第十九轮完成）**：模块/实例全部接口一键入波形（触发键 `Ctrl+Alt+4`）。
5. ✅ **侧栏 / 整体 UI 重构方案（08 §2.1~§2.9，第二十轮完成）**：已成文、已被拍板。
6. ✅ **侧栏 / 整体 UI 重构「可拖拽多面板」（第二十一轮完成）**：卡片化 + 折叠 + 纵向 splitter +
   侧栏宽度 + session 级持久化；已随 exe 交付。
7. **下一项（用户未指定，建议按此推进）**：08 §2.6「⏳ 剩余（可选/暂缓）」三选一 ——
   ① VCD 树移入波形区（改动中等，动 `.vcd-tree` 所在父容器，**仍需保契约面**）；
   ② TB 控制带收敛（纯 CSS/布局，最低风险）；③ 层次树左置（**用户已明确暂不，除非再次拍板**）。
   **开工前先与用户确认**；**每批次都要 C1 重建 exe + C8 核验 + 全量测试 + C17 记忆同步**
   （测试基线：regression 79 / e2e-rtl 61 / **e2e-ui 86**）。
8. **服务在线性永远插队最高优先**：任何「点仿真无响应 / 服务不在线」类反馈，先按 06 P28/P29
   排查自愈链路（端口 17817 / `PING_TAG` / 隐藏 iframe 重拉），**不要**重写自愈设计。

### 3.3 不要做

- 不要做 #84 / #77（用户第十一轮已推迟远期）——除非用户再次拍板。
- 不要做 nSchema 原理图 / FSDB / 重后端 / 全盘自动扫盘（研究期已排除）。
- 不要换主仿真器。
- 不要重写核心引擎。
- 不要绕过 `__core` / `wpf` 直接抓内部标识符。
- 不要改 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填（最易碎区）。
- 不要重做 #85 的 VCD 侧（观察行链路已闭环）；也**不要给 RTL 树加回「点行加波形」**
  （#76 B2 已按第十二轮澄清撤销，RTL 树只做代码层级浏览）。
- 不要重做 #86 A1~A4（第十四轮已完成且全绿）：实例扫描器 `scanInstances`、模块定义索引
  `collectModuleDefs`/`resolveModuleDef`、实例行双语义跳转、导入源码按钮、`.wp` 源码存档桥
  —— 都是 #76 B1/B5 的地基，动之前先读 04 §4.12 与 06 P31。
- 不要重做 #76 B1（第十五轮已完成且全绿）：符号索引 `scanModuleSymbols`/`buildSymbolIndex`/
  `findSymbols`/`resolveSymbolVcdPaths`、例化路径 `buildInstancePaths`、名称兜底
  `findVcdPathsByName` —— **B4 直接调用它们即可**，不要再写第二套符号解析；也不要因为 B1
  完成就去动 RTL 树或画布（**B1 是纯数据层，接线是 B4 的事**）。动之前先读 04 §4.13 与 06 P32。
- 不要重做 #76 B4（第十六轮完成且全绿）：加信号唯一主路径 = 代码内点/选中变量；三条硬口径
  （`Ctrl+Alt+W` 捕获阶段 / 精确与兜底**不取并集** / 选择器只在代码区旁）见 04 §4.14、06 P33、07 D16。
- 不要重做 #76 B5（第十八轮完成且全绿）：观察行随 `.wp` 存档/恢复（`injectArchiveFields` /
  `archiveSimWatches` / `applyArchivedExtras` / `applySourceFilesFromArchive` /
  `applySimWatchesFromArchive` / `adoptArchivedWatchRows`；`syncSimRows` 的「无 VCD 回退」、
  `resetSourceFiles` 的「新工程全复位」）—— **三条硬口径**：① 观察行**只存找回元数据**（`{path,name,
  width,reference}`），波形数据留在核心 `signals` 里**不重复存**；② 载入工程**必须先清 `vcd`/
  `outputs`/`simWatches` 再恢复**（画布整体换人，否则旧 VCD 刷载入的行 = 数据张冠李戴）；
  ③ **无 VCD 时以工程带回来的行为准、有 VCD 仍以 VCD 为准**（旧工程无该字段 → 观察行清空，向后兼容）。
  **信号组不用另存**（核心天然闭环）。改前读 04 §4.16、06 P35、07 D18、e2e-rtl I1~I6。
- 不要重做 #76 B3（第十七轮完成且全绿）：代码 → 树反向高亮（`rowMatchScore`/`pickRtlRowIndex`/
  `datasetToRtlRow`、`highlightRtlRow`/`highlightVcdSignal`、`onCursorMove`、`syncActiveFromCode`、
  `applyActiveHighlight`）—— **纯视觉、零副作用**，**不要**借它往画布塞信号/弹框/加面板；
  六条硬口径（重建后重放 / `selectionchange` / `setText()` 补发 / 歧义不亮 / 位置证据 / 模块 scope
  fallback）见 04 §4.15、06 P34、07 D17。**动之前先读这三处。**
- 不要重做 #87②（第十九轮完成且全绿）：模块/实例全部接口一键入波形。**三条硬口径**：① 触发键 =
  **`Ctrl+Alt+4`**，**不是 `Ctrl+4`**（Chromium/Edge 把 `Ctrl+数字` 当浏览器级「切换标签页」加速键，
  页面收不到 keydown，与 `Ctrl+W` 同源，见 06 P36）；② **「全部接口」只指模块端口**（`kind === "port"`），
  体内 `wire/reg` 仍走 B4 单点加入、**不批量灌**；③ 多候选作用域**只能复用代码区旁轻量浮层**
  （`openPicker` `mode="scope"`），**不得**另建“信号层次选择框”，也不放在 RTL 树上。改前读 04 §4.17、
  06 P36、07 D19、e2e-rtl J0~J7。
- 不要重做第二十一轮的侧栏多面板（已完成且全绿）：卡片折叠 / 像素权重高度 / `measureMinHeight`
  保护 / 纵向 splitter / 侧栏宽度 clamp / sessionStorage 持久化 —— **八条硬口径**见 07 D21；
  动之前先读 04 §4.19 与 e2e-ui I 段（I0~I8）。**`measureMinHeight` 那条是修过的真 bug
  （矮窗口工具栏被裁 → 点仿真无响应），别把它当冗余删掉。**
- **不要改名 / 移除 08 §2.5 契约面冻结清单里的任何标识**：24 个仿真栏 id（`sim-toggle-btn` /
  `sim-panel` / `sim-panel-header` / `source-files` / `sim-addfile` / `sim-import` / `sim-removefile` /
  `sim-parse` / `sim-addsignals` / `sim-tb` / `sim-run` / `verilog-source` / `verilog-cm-host` /
  `port-preview` / `module-preview` / `sim-top-row` / `sim-top-select` / `rtl-tree` / `vcd-tree` /
  `sim-tb-copy` / `tb-source` / `sim-status` / `sim-recover` / `app-version`）、`.rtl-inst` / `.rtl-active` /
  `.vcd-signal-row` / `.vcd-active` / `[data-rtl-kind]` / `[data-vcd-path]` / `.tool-btn[data-tool]` /
  `.sim-symbol-picker-item`、VCD 行的 `title` 全路径、以及 `body.sim-open` / `#sim-panel.collapsed` /
  `wavedrom-debug-open` 等状态类 —— 这些是 `tools/e2e-rtl.mjs`（**28 处 CSS 选择器依赖**）与
  `tools/e2e-ui.mjs`（**86 项**）的定位锚点，改名即回归全线失守。第二十一轮**一个未改**（新增的
  `[data-sim-card]` / `[data-sim-split]` / `.sim-card*` / `.sim-panel-body` / `#sim-resize-x`
  是**新增**，不属冻结面）。
- 不要**删 legacy VCD 核心死代码 / legacy 面板**：legacy VCD 整族 10 个 id、`#sponsors-panel`、
  `#wavedrom-preview-refresh`、`#sim-collapse` 死引用、菜单 `data-action="toggle-vcd-panel"`
  等属 **#93 类「清理死引用」范畴**，需**单独拍板**并**逐项**确认无 JS/e2e 依赖后再删。
  （第二十一轮已顺手删掉 `refs.collapseBtn = el("sim-collapse")` 这条 JS 死引用与 `bindEvents`
  死分支，**未删 `#sim-collapse` 相关 CSS** —— CSS 清理仍待单独拍板。）
- 不要把**面板状态写进 `.wp`**：观察行已由 #76 B5 走 `simWatches` 元数据（见 04 §4.16 / 07 D18），
  UI 面板折叠态 / 高度权重 / 侧栏宽度等纯视图状态**只允许 sessionStorage**
  （key `wavepaint.sim-panel-layout.v1`，见 07 D21），**不得**塞进工程存档（否则污染 B5 契约）。
- 不要恢复「仿真后全量自动灌信号」、不要恢复 legacy `.vcd-hierarchy-panel`、不要给 RTL 树加
  端口/信号行、不要另建「信号层次选择框」（第十二轮澄清 + #76 B2 撤销，见 08 §2.4）。
- **层次树左置暂缓**（用户 2026-09-11 明确「暂不」）：侧栏保持右侧、`#main-area` 骨架不动；
  除非用户再次拍板，否则不要动整体骨架。
- 不要动服务自愈的设计口径（2026-09-10 第十三轮）：端口固定 `17817`、`/api/ping` 必须带
  `PING_TAG`、**恢复一律不跳转**、外部协议只用隐藏 iframe —— 动之前先读 07 D15 与 06 P28/P29/P30。
- 不要重做第十三轮的服务在线性根治（已完成且全绿）；若又见「点仿真无响应」，先按
  06 P28/P29 逐条排查，而不是重写自愈逻辑。


---

## 4. 立即可用的命令

```powershell
node --check js/sim/engine.js
node tools/regression.mjs
node tools/e2e-sim.mjs
node tools/probe-param.mjs
node tools/e2e-ui.mjs   # 侧栏/整体 UI 冒烟 86 项（含第二十一轮 I 段 I0~I8：多面板/折叠/splitter/宽度/持久化/矮窗口；需真实 Edge）
node tools/e2e-rtl.mjs   # #75 P0/#85/#86/#76(B1~B5)/#87② 浏览器冒烟 61 项含 B/C/D/E/F/G/H/I/J 段（需真实 Edge，非沙箱执行）
.\build.ps1
```

### 4.1 Bug 自研修复探针（#81 遗留，可复跑回归）

```powershell
node .e2e-tmp/probe-simfail.mjs    # Bug1：selfheal/dead/abort 三场景
node .e2e-tmp/probe-addbtn.mjs     # Bug2：添加信号按钮/图标可见性全场景
node .e2e-tmp/probe-tutorial.mjs   # Bug3：教程不隐形重启、无键盘拦截
node tools/exe-smoke.mjs           # 先启动真 exe 再跑（读最新端口文件）
```

### 4.1.1 服务自愈专项探针（2026-09-10 第十三轮，可复跑回归）

```powershell
node .e2e-tmp/verify-recovery2.mjs   # 17/17：身份标识判活 / recover 四态 / relaunch URL 带 port
                                     #   / 「点运行仿真 + 服务死 → 自愈 → 仿真完成」/ 回同一端口 17817
                                     #   / 「relaunch 不顶掉页面」「页面全程未跳转」
node .e2e-tmp/probe-protocol.mjs     # 真实 Edge + 预置协议允许表：证明隐藏 iframe 能拉起 exe、
                                     #   顶层跳转/window.open/<a target=_blank> 被 user gesture 拦
```

> 这两支探针在 `.e2e-tmp/`（不进 git）。若已随工作区清理丢失，重写要点：
> 用 CDP 驱动 headless Edge；服务死亡用 `taskkill`，重拉用
> `powershell Start-Process 'wavepaint://start?port=<port>'` 模拟 OS 协议回调
> （headless 不会真调外部协议，真实协议拉起由 `probe-protocol.mjs` 单独证明）。

`.e2e-tmp/` 已被 `.gitignore` 覆盖，探针不进 git；需要长期保留时再提炼成正式
`tools/e2e-*.mjs`（未做，属可选）。

### 4.2 #82 遗留窗口收拢（2026-09-09 第四轮，交付内容）

**问题**：用户报“存在仿真失败的问题，直接无法仿真”。实证 = 服务与代码都健康，真凶是
重建/杀进程后旧 Edge `--app` 窗口停在**上一个已死实例的随机端口**（同源 `/api/*` 全断），
且残留窗口让 `HasWindow()` 误判 → 旧实例永不退出 → 死端口窗口越积越多。

**改法**：`WavePaintLauncher.cs` 新增 `CloseLegacyWindows()`（枚举可见、标题含
`WavePaint/WaveWorkbench` 的顶层窗口 → `PostMessage(WM_CLOSE)` → 最多等 2.5s），在
`MainCore`（全新启动）与 `OpenExistingInstance`（接管已有实例）的 `Process.Start` 前调用。

**验证**：日志 `CLOSE-LEGACY 5 window(s)`（真机 5→1）；新实例端到端仿真通过（零异常
零网络失败）；真实前台窗口 UIA 点 `sim-run` → RUN→RESULT；regression 58/58；
e2e-sim 0 失败。exe 已重建并核验特征串（`CloseLegacyWindows`/`EnumWindows`/`WM_CLOSE`）。

**注意（行为变化）**：用户已有活窗口时再次双击 exe（走 `OpenExistingInstance`）会
关旧开新 —— 活页未保存内容会丢；正常“关窗即退再启动”不受影响。详见
`07-DECISIONS.md` D13 与 `memory/logs/2026-09-09.md` 第四轮。

---

## 5. 当前已知环境注意点

- `build.ps1` 必须保持 UTF-8 BOM。
- Git Bash 下 `taskkill` 参数用单斜杠：`/F /IM`。
- 中文路径 git 操作建议加 `git -c core.quotepath=false`。
- `e2e-ui` 依赖本机 Edge，C 盘满会卡死组件更新。
- `package.json` 无 `"type": "module"`，Node 会以 ESM 探测加载，出现无害警告。
- `WavePaintClean.exe` 为构建产物，不提交。
- 改 `lib/codemirror.bundle.js` 依赖重跑 `npx esbuild tools/cm6-entry.js`（见该文件头注释），再重建 exe。
- `memory/logs/2026-09-09.md` 记录了 #75 P0 的实现细节与设计决策，P1 开工前建议先读。
- `memory/logs/2026-09-09.md` 第三轮记录了 #81 Bug 修复的根因/验证与探针用法。
- `memory/logs/2026-09-09.md` 第四轮记录了 #82（遗留窗口收拢）的完整排查与验证；
  交付出现在凌晨（2026-09-09 深夜~次日）。用户若再报“无法仿真”，先查桌面是不是还
  有多个「WavePaint 波形编辑」窗口 / 是不是旧 exe 进程还活着 —— 而不是先怀疑代码。
- `memory/logs/2026-09-10.md` 记录了第十三~十九轮：第十三轮服务自愈、第十四轮 #86 A1~A4、
  第十五轮 #76 B1、第十六轮 #76 B4、第十七轮 #76 B3、第十八轮 #76 B5、**第十九轮 #87②**。
  开工前建议通读「第十六轮」（G 段 + B4 三条硬口径）、「第十七轮」（H 段 + B3 六条硬口径 + H4/H4b
  spec 取舍）、「第十八轮」（I 段 + B5 三条硬口径 + 信号组无需另存）与「**第十九轮**」（J 段 +
  #87② 两条硬口径 + 实例符号 `moduleName` 被索引覆盖的真 bug）。
- 行尾差异：`js/`、`tools/`、`memory/`、`index.html` **均为 LF、无 BOM**（2026-09-10 第十六轮按字节
  实测；`index.html` 往返写入 byteDiff=0）。历史「`index.html` 是 CRLF」的说法**已过时**，别据此
  做行尾转换（转换反而会产出整文件 diff）。
- **exe 内嵌版本串 = 构建那一刻的 HEAD（不是承载该批代码的 commit）**：当前交付的
  `v0.4.0 build 2026-09-10 22:49:32 a201338` 里的 `a201338` 是**构建时 HEAD**（= 第十八轮
  #76 B5 那个 commit），代码内容其实是**第十九轮 #87②**（已由 C8 特征串核验：
  `openPicker`=3/`showScopePicker`=3/`addModulePortsFromCode`=4/`modulePortsStatus`=2/
  `addVcdPathsToWave`=4/`pickerMode`=4/`hotkey4`=1/`Ctrl+Alt+4`=12，另 `injectArchiveFields`/
  `archiveSimWatches`/`adoptArchivedWatchRows` 仍在，全 >0）。**看到 `a201338` 不等于 exe 落后**，
  不必为了对齐 hash 重跑 `build.ps1`（如需版本串等于 HEAD 才重建，且重建后要同步更新 04/09 与
  本文件的版本号口径）。
- PowerShell 环境（本机 Codex desktop）：**无 `sed`**、`head` 不可用（用
  `Select-Object -First/Last`）；内联 JS 会被转义破坏 → 探针一律写成 `.mjs` 再 `node` 跑。

---

## 6. 交付时必须提醒用户

1. 重启应用。
2. 从唯一路径启动：
   `D:\Files\Code\波形\WavePaintClean.exe`
3. 在面板查看版本号，确认不是旧副本（本批应显示 `v0.4.0 build 2026-09-10 22:49:32 a201338`；
   ⚠ `a201338` = **构建时 HEAD**（第十八轮 B5 的 commit），不代表落后）。内置第十九轮 #87② +
   第十八轮 #76 B5 + 第十七轮 #76 B3 + 第十六轮 #76 B4 + 第十五轮 #76 B1 + 第十四轮 #86 A1~A4 +
   第十三轮服务自愈 + 第十二轮 RTL 树瘦身 + #85 观察行链路。
   **本批用户可见变化**：在代码区把光标停在**某个模块体内或某个实例名**上，按 **`Ctrl+Alt+4`**，即可把
   该模块/实例的**全部接口（端口）**一次加为观察行（同名模块/实例多作用域时，在代码区旁弹轻量浮层选
   作用域；重复按是**幂等**的，不会加重复行）。叠加第十八轮：把信号**加进波形**后**保存工程（`.wp`）**，
   下次**打开该工程**，观察行**原样回到画布**且**仍然只是观察行**（不会被当激励生成 TB），点「新建」
   会一并清空；第十七轮：代码区**移动光标** → 右侧 RTL/VCD 树同步高亮（纯视觉）；第十六轮：代码里
   **双击变量名 / 右键 / 按 `Ctrl+Alt+W`** 把该信号加进波形，且点「运行仿真」后**不再全量灌信号**。
4. 若此前桌面/任务栏堆积了多个「WavePaint 波形编辑」窗口，先全部关掉，再确认没有
   `WavePaintClean.exe` 旧进程残留后重新启动一次（#82 起 launcher 会自动收旧窗）。

---

## 7. 你接手后不要重做的事

- 解混淆核心
- Phase 重构
- 批次1~10
- 参数化位宽修复
- 记忆体系重构
- #75 Verdi 借鉴 P0（CM6 代码视图 / RTL Tree / VCD 全路径索引）
- #81 Bug 自研修复（sim 探活自愈重试 / 教程 localStorage 预置与菜单拦截 / 添加信号 CSS 防御）
- #82 遗留窗口收拢（launcher `CloseLegacyWindows` 收旧窗；真机已验证）
- #85 VCD 点信号 → 画布观察行（第十轮完成；`state.simWatches`/`pickVcdSignalIntoWave` 已在内嵌
  js 与 exe）——VCD 侧别重做；**加信号主路径已统一为 #76 B4（代码内点/选中变量，第十六轮落地）**
- **#86 A1~A4（第十四轮完成，勿重做/勿回退）**：`rtl-nav.js` 的源码级实例扫描器
  `scanInstances` + `maskStrings`（字符串换等长空格）+ `mergeInstances`（扫描器优先、engine
  兜底过两道闸）+ 模块定义索引 `collectModuleDefs`/`resolveModuleDef`；`rtl-panel.js` 实例行
  左键跳定义 / 右键(Alt+左键)跳例化点；`ui-bridge.js` `gotoSource` / `importSourceFiles` /
  `.wp` 源码存档桥（`installProjectArchiveBridge` 必须在核心初始化前安装）；`index.html`
  「导入源码」按钮；`file-menu.js` `onNew()` 复位源码集合。**改这些之前先读 04 §4.12、06 P31。**
- **#76 B4（第十六轮完成，勿重做/勿回退）**：加信号唯一主路径 = 代码内点/选中变量。落点 5 处：
  `rtl-panel.js` `symbolNameAt` 纯函数 + `installCodeEditor` 第 5 参 `onAddSymbol` + 触发面（双击/右键/
  捕获阶段 `Ctrl+Alt+W`）；`ui-bridge.js` `addSymbolFromCode` + 浮层 `showSymbolPicker`/`closeSymbolPicker`
  + `syncSimRows`（原 `replaceInjectedOutputs`，**已不再灌 outputs**）；`index.html` `.sim-symbol-picker` CSS。
  **三条硬口径**：`Ctrl+Alt+W`（非 `Ctrl+W`）/ 精确与兜底**不取并集** / 选择器只在代码区旁。**不要**恢复
  “仿真后全量自动灌信号”，也**不要**建“信号层次选择框”。改前读 04 §4.14、06 P33、07 D16。
- **#76 B3（第十七轮完成，勿重做/勿回退）**：代码 ↔ 树双向跳转的「代码 → 树」反向高亮，仿 nTrace
  「光标即高亮」。落点：`rtl-panel.js` `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow` +
  `highlightRtlRow`/`highlightVcdSignal`/`clearRtlHighlight`/`clearVcdHighlight` + `installCodeEditor`
  第 6 参 `onCursorMove`（RTL 树行 `data-rtl-*` / VCD 信号行 `data-vcd-path`）；`ui-bridge.js`
  `syncActiveFromCode` + `scheduleActiveSync`（180ms 防抖）+ `applyActiveHighlight`/
  `clearActiveHighlight`（重建后重放），`gotoSource()` 末尾闭环、`refreshStructureTrees()` 末尾重放；
  `index.html` `.rtl-active`/`.vcd-active` 两条 CSS。**六条硬口径**：联动状态模块级 + 树重建后重放 /
  纯光标移动靠 `selectionchange` / `setText()` 后强制补发 / **歧义宁可不亮** / 行匹配必须有位置证据
  （同类硬条件）/ 未知符号保留模块 scope（H4）、完全无目标才全清（H4b）。**纯视觉、零副作用**
  （不加信号、不弹框、无新面板），**不要**借它违反 RTL 树纯层级口径。改前读 04 §4.15、06 P34、07 D17。
- **#87②（第十九轮完成，勿重做/勿回退）**：模块/实例全部接口一键入波形。落点：`rtl-panel.js`
  `installCodeEditor` 第 7 参 `onAddScope` + 触发块 `request` + 捕获阶段 `Ctrl+Alt+4`；`ui-bridge.js`
  `openPicker`/`showScopePicker`/`moduleScopes`/`modulePorts`/`addVcdPathsToWave`/`modulePortsStatus`/
  `addModulePortsToWave`/`addModulePortsFromCode`。**三条硬口径**（`Ctrl+Alt+4` 非 `Ctrl+4` / 全部接口 =
  端口非 `wire/reg` / 多候选只复用代码区旁浮层）见 §3.3；**不要**建“信号层次选择框”，**不要**给 RTL 树
  加端口行。改前读 04 §4.17、06 P36、07 D19。
- 第十一轮规划重排（纯文档已完成）：近期主线 = #86 → #76 → #87①/②、#84/#77 远期、
  UI 重构设计提级 —— 不要再按旧的“#85 → #86 → #84”建议顺序推进（见 08 §1/§3）
- **第十二轮澄清 + 首批实施（勿回退）**：加信号主路径 = 代码内点/选中变量（#76 B4）；
  **RTL 树已瘦身为纯层级浏览（删「端口 Ports / 参数 Parameters」分组与端口计数；实施已
  commit + exe 重建 22:19:04）——不要给 RTL 树加回端口/参数/信号行，也不要在 RTL 树上做
  “点行加波形”入口**（B2 撤销，见 08 §1.2）
- #93 插队混淆残留清理（第七轮死代码清理 + 第八轮·第 7 pass 标识符重命名；`wavepaint.clean.js`
  已是解混淆收尾完毕的唯一直接维护核心，正文无 `_0x` 残留 —— 别再引入混淆源或重跑
  deobfuscate；本任务全部完成，无需再动）

---

## 8. 如果你不确定

1. 先查 `06-PITFALLS.md`。
2. 再查 `07-DECISIONS.md`。
3. 最后查 `memory/logs/`。
4. 仍不确定时，优先保守：**不改动 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填**。

---

## 9. 本轮遗留

- 2026-09-11 第二十一轮完成 **侧栏「可拖拽多面板」落地**（用户对第二十轮 UI 方案的三条裁决：
  ① 面板形态 = **可拖拽多面板**；② 侧栏**保持右侧**（`#main-area` 骨架不动）；③ 层次树**暂不左置**；
  实施步骤授权 AI 自定）—— 一次性把 08 §2.6 的 **P0+P1+P2 核心**落地：
  ① **新增 `js/sim/panel-layout.js`**（≈520 行，`installSimPanelLayout({panel,body,handle,storageKey,onLayout})`
  → `{getState,setWidth,reset,destroy}`；缺 DOM 节点返回 `null` 走 CSS 兜底）。口径：卡片折叠（标题行内
  `button/a/input/select/textarea/label` 点击不折叠，保护 `#sim-tb-copy`）/ 像素权重高度
  （`flex-grow=权重/总*100`+`flex-basis:0`，默认 `{source:300,rtl:245,vcd:245,tb:190}`）/
  **`measureMinHeight`**（`min(实测内容高, 面板可视高*0.8)`，`MIN_BODY_PX=24`、`MIN_CARD_CAP_RATIO=0.8`）
  / 纵向 splitter（`pointerdown`→`resizePair`，相邻卡折叠则 `.disabled`）/ 宽度 clamp `280~min(760,视口*60%)`
  / **持久化只走 sessionStorage**（key `wavepaint.sim-panel-layout.v1`，`{v:1,w:{},c:{},width}`，220ms 防抖，
  **绝不进 `.wp`**）/ 键盘可达（splitter `ArrowUp/Down` ±16px、`#sim-resize-x` `ArrowLeft/Right`）。
  ② **`index.html`**：CSS 约 L130~L272（`--sim-panel-w` 变量 + `.sim-card*`/`.sim-split`/`.sim-panel-body`/
  `#sim-resize-x`/`body.sim-resizing`）；DOM 约 L839~L934 卡片化（4 个 `section.sim-card[data-sim-card]`
  + 3 个 `.sim-split[data-sim-split]`）；`#sim-status` 加 `position:sticky;bottom:0`；`#sim-tb-copy` 移进 TB
  卡片头（id 不变）；`#sim-addsignals` 的 `title` 降级为「按端口给画布建激励（不加入 VCD 观察行；加波形请在
  代码里双击变量）」（**按钮文案未改**）。**契约面 24 id / class / dataset / 状态类一个未改、未移除。**
  ③ **`js/sim/ui-bridge.js`**：`import { installSimPanelLayout }` + `let panelLayout`；`initRefs()` 增
  `refs.panelBody`/`refs.resizeHandle`；**删死引用** `refs.collapseBtn = el("sim-collapse")` 与 `bindEvents`
  死分支；新增 `initPanelLayout()`（`init()` 中 `bindEvents()` 后调用），`onLayout` reason 以 `split` 开头时调
  `sourceCodeView?.remeasure?.()`；`__wpsim` 增探针 `get panelLayout`/`setPanelWidth(px)`/`resetPanelLayout()`。
  ④ **`js/sim/rtl-panel.js`**：`installCodeEditor` 返回值新增 `remeasure()`（`view.requestMeasure()`；
  CM6 自带 ResizeObserver 有「<75ms 跳过」保护，拖 splitter 会漏重排）。
  ⑤ **`tools/e2e-ui.mjs` 新增 I 段 I0~I8（13 条，73→86）**：装配 4 卡 + 3 splitter + 探针 / flex-grow 归一 100
  且 flex-basis:0px / 折叠 source（`.collapsed`+`display:none`+高度缩小+相邻 splitter `.disabled`+aria）/
  展开还原 / splitter `ArrowDown`（`source=原高+16`、`rtl=原高-16`，**比较实测像素而非权重**）/
  宽度 420·下限 280·上限 760 / sessionStorage v1 落盘（含 `c.vcd===true`）/ reset 回默认（328+全展开+
  300-245-245-190）/ **矮窗口 `750x485` 下 `#sim-run` 命中自身**。
  ⑥ **本轮修掉一个真 bug（= 用户反复报「点仿真无响应」的又一根因）**：headless 默认视口 `750x485` 下
  源码卡只剩 **80px**，`.source-toolbar` 实测 **170px**（`.source-actions` 9 按钮 grid 折行后高 134px）→
  被 `overflow` 裁掉 → 坐标点击 `#sim-run`（中心 y=342）**落到 VCD 卡** → 仿真根本不触发。修复 =
  `measureMinHeight`/`applyMinHeights`（源码卡 `min-height=272px`）+ `.sim-panel-body{overflow-y:auto}`
  + `#sim-status` 吸底；`.e2e-tmp/verify-recovery2.mjs` 由 D1/D1b 失败 → **17/17** 全过。
  验证全绿：`node --check` exit 0、regression **79/79**、e2e-ui **86/86**（404=0、控制台异常=无）、
  e2e-rtl **61/61**（404=0、异常=无）、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过、build.ps1
  `csc exit: 0` / `res count: 52` / 仍 UTF-8 BOM；C8 特征串 `applyMinHeights`=5 / `measureMinHeight`=2 /
  `MIN_CARD_CAP_RATIO`=2 / `installSimPanelLayout`=4 / `sim-resize-x`=12 / `sim-panel-body`=7 /
  `sim-card`=39 / `sim-split`=16（全 >0）。**exe 重建 22,012,416 B / 2026-09-11 00:15:01**、`version.txt` =
  `v0.4.0 build 2026-09-11 00:15:01 69b84d0`（`69b84d0` = **构建时 HEAD**，承载本轮代码的 commit 是它的下一个）。
  对应 04 §4.19 / 08 §2.2·§2.6 / 07 D20（升级）+ D21（新增）/ 03「其它规划」段 / 本日志「第二十一轮」。
  **下一项 = 08 §2.6「⏳ 剩余（可选/暂缓）」**（VCD 树移入波形区 / TB 控制带收敛 / 层次树左置），
  **开工前先与用户确认范围与优先级**。
- 2026-09-10 第二十轮交付 **侧栏 / 整体 UI 重构设计方案（只出方案，未动产品代码）**：
  ① **本轮唯一交付物 = `08-ROADMAP.md` §2.1~§2.9**（§2 由原先 3 条 bullet 扩写为
  §2.1 现状问题清单 P1~P5 / §2.2 目标布局草案 + 三条取舍 / §2.3 面板按钮归位表 /
  §2.4 六条主线衔接点 / §2.5 契约面冻结清单 / §2.6 分期 P0~P2 / §2.7「UI 设计交给其它 AI」评估 /
  §2.8 交互清单 / §2.9 状态）；§2 原正文前的第十一轮引用块**保留**，其后新增第二十轮引用块。
  ② **零产品代码改动**：`index.html`/`css/`/`js/`/`WavePaintLauncher.cs`/`build.ps1` **一行未改**
  → **C1 未触发，本轮不重建 exe**（当前交付仍是第十九轮 exe：
  `v0.4.0 build 2026-09-10 22:49:32 a201338`）。唯一新增文件 `.e2e-tmp/ui-audit.mjs`
  被 `.gitignore` 覆盖，**不入库**。
  ③ **实测证据源（可复算）**：`node .e2e-tmp/ui-audit.mjs .` → `index.html` **904 行**、
  内联 `<style>` **L26~L471**、`</head>` L489、侧栏 DOM **L733~L803**、静态 id **82**、
  「js 引用但 DOM 无 id」**31**（多为动态创建，真遗留见 08 §2.1 P3）；仿真栏 **24 个静态 id
  全部**由 `ui-bridge.js` 的 `el(...)`/`getElementById` 抓取；固定高度需求 ≈900px+ vs 可用 ≈900px。
  ④ **纠正上一轮两处口径**：`tools/e2e-rtl.mjs` 实为 **28 处 CSS 选择器依赖**（非「零依赖」）、
  `e2e-ui.mjs` 依赖 `.tool-btn[data-tool]`；侧栏 DOM **已无「收起」按钮**，
  `el("sim-collapse")` 是**死引用**。唯一未闭环信息：`data-action="theme"` 实际落点本轮未追到，
  已登记为方案待办。
  ⑤ **状态 = 待用户 review（三条取舍 + P0 范围）**；**拍板前不得先动 UI 代码**。
  对应 08 §2、04 §4.18、07 D20、`05-LOGS.md` 索引、本日志「第二十轮」。
  **下一项 = 等用户拍板 → 按 08 §2.6 开工 P0（纯 CSS/布局，风险最低）**。
- 2026-09-10 第十九轮完成 **#87② 落地**（**模块/实例全部接口一键入波形**，仿 nWave `Ctrl+4`；
  `wavepaint.clean.js` 与 `sim/engine.js` **一行未改**，C9 守住）：
  ① **两条硬口径**：**触发键 = `Ctrl+Alt+4`**（**不是 `Ctrl+4`** —— Chromium/Edge 把 `Ctrl+数字`
  当浏览器级「切换标签页」加速键，页面收不到 keydown，与 `Ctrl+W` 同源，见 06 P36）；**「全部接口」
  = 模块端口**（`kind === "port"`，含模块头 ANSI 端口 + 体内 `input/output/inout`，`modulePorts`
  按名去重），体内 `wire/reg` 仍走 B4 单点加入、**不批量灌**；目标作用域 = **例化路径**（顶层模块
  自动映射到 `tb.dut`），与 VCD 全路径同口径。
  ② `js/sim/rtl-panel.js`：文件头补第 5 条职责；`installCodeEditor` 增第 7 参 `onAddScope`；触发块
  重构为 `request(via, event, handler)`（handler 缺省回落 B4 单符号入口；**未接线的手势静默放过、
  不吞事件**）；keydown 捕获阶段识别 `key==="4" || code==="Digit4" || code==="Numpad4"` 且
  `(ctrlKey||metaKey) && altKey` → `preventDefault()+stopPropagation()` → `onAddScope`。
  ③ `js/sim/ui-bridge.js`：浮层泛化 `openPicker(titleText, items, anchor, mode)`
  （`items=[{label,title,onPick}]`、`box.dataset.pickerMode=mode`）+ 薄封装 `showSymbolPicker`
  （`mode="symbol"`，**B4 选项文本仍是 VCD 全路径、探针口径不变**）/ `showScopePicker`（`mode="scope"`，
  选项 = `scope.path`）；新增 `moduleScopes` / `modulePorts`（`kind==="port"` 按名去重）/
  **`addVcdPathsToWave(paths)`**（**批量、只 render 一次**、末尾 `scrollWaveToWatchPath`、**不设状态栏**，
  返回 `{ready,added[],existed[],missing[]}`）/ `modulePortsStatus`（唯一汇总文案入口）/
  `addModulePortsToWave` / `addModulePortsFromCode`；接线 `onAddScope`；三处提示追加 `Ctrl+Alt+4`
  （G1 断言的 `/双击变量名/` 仍在）；`__wpsim` 增探针 `addModulePortsFromCode`/`moduleScopesOf`/
  `modulePortsOf`/`addVcdPathsToWave`/`get pickerMode`。
  ④ **本轮真 bug 修复**：`addModulePortsFromCode` 分支①（光标在实例名上）若用 `findSymbols` 命中项的
  `moduleName` 查作用域是**错的** —— `buildSymbolIndex` 里 `entry.symbols.push({...symbol, moduleName: entry.name})`
  把实例符号的 `moduleName` 覆盖成**定义所在模块**；已改为按「**实例名后缀**」直接查 `index.instancePaths`
  （那里的 `moduleName` 才是被例化模块），多候选 → `showScopePicker`。
  ⑤ `tools/e2e-rtl.mjs` 新增 **J 段（J0~J7，9 条）**：一次加 4 端口 `tb.dut.clk|rst_n|en|q` / 幂等 /
  同名两例化弹 `mode="scope"` 选择器并点选 `tb.dut.u_b` 加对作用域 / 光标在实例名 `u_a` → 唯一作用域
  直加（真 bug 修复点）/ `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / **只按 `Ctrl+4`（无 Alt）不触发** /
  探针 `modulePortsOf('counter')`=4、`modulePortsOf('sub')`=1、`moduleScopesOf('sub')`=2、RTL 树仍无
  端口行 / `addVcdPathsToWave(['tb.dut.clk','tb.en','tb.no_such_signal_xyz'])` 三桶分类。
  验证全绿：regression **79/79**、e2e-rtl **61/61**（J 段首跑踩坑：`clearWatches()` 只 `m_signals.splice`
  未清 `state.simWatches` → `render()`/`syncSimRows()` 把行**重建回来**，属**测试自身设计错误**，
  已改用 J7 三桶分类覆盖）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；
  exe 重建 **21,982,720 B / 22:49:32**、`version.txt` = `v0.4.0 build 2026-09-10 22:49:32 a201338`
  （`a201338` = **构建时 HEAD**，承载 #87② 的 commit 是它的下一个），C8 特征串 `openPicker`=3、
  `showScopePicker`=3、`addModulePortsFromCode`=4、`modulePortsStatus`=2、`addVcdPathsToWave`=4、
  `pickerMode`=4、`hotkey4`=1、`Ctrl+Alt+4`=12（全 >0）；**未改 `sim/engine.js` 一行**（C9 守住）。
  对应 04 §4.17 / 06 P36 / 07 D19 / 08 §1.3 / 03 表 H / 本日志第十九轮。
  **下一项 = 侧栏 / 整体 UI 重构设计方案（08 §2，先出方案给用户 review）**。
- 2026-09-10 第十八轮完成 **#76 B5 落地**（**画布观察行随 `.wp` 工程存档与恢复**；`wavepaint.clean.js`
  与 `sim/engine.js` **一行未改**，C9 守住）：
  ① **先做范围勘察**（读核心确认，避免误判“信号组要不要另存”）：核心 `buildDocumentJson`（L1406~1515，
  逐字段存 `groupName`/`groupColor`/`groupPath` @L1449~1451）与 `loadFromFileContent`（L1553~，逐字段
  还原 @L1642~1644）**已让信号组天然闭环**，`GroupManager`（L1163~1404）是**纯函数派生、无独立状态**；
  而**观察行必须桥兜底**（核心把它当普通信号写进 `signals`，载入后丢 `__simInjected`/`__simWatchPath`/
  `width`/`msb`/`lsb` → 脏激励 + 名字列丢 `[3:0]`）。
  ② `js/sim/ui-bridge.js`：`injectArchiveSourceFiles` **泛化为** `injectArchiveFields(json, fields)`
  （文本拼接口径不变；旧函数名已不存在）；新增 `archiveSimWatches`（只存 `{path,name,width,reference}`
  **找回元数据**）、`applyArchivedExtras`（坏载荷静默跳过 → **先清 `vcd`/`outputs`/`simWatches`**
  （画布换人）→ 恢复源码 → 恢复观察行 → 面板就绪则 `refreshVcdTree`/`syncSimRows`/`render` + 状态栏
  合并文案）、`applySourceFilesFromArchive`、`applySimWatchesFromArchive`、`adoptArchivedWatchRows`
  （「行名 == 观察路径」认领 + 补回 `width`/`kind`/`msb`/`lsb`，幂等）；`syncSimRows` 增「**无 VCD
  时回退工程带回来的行**」（有 VCD 仍以 VCD 为准）；`resetSourceFiles` 扩为「新工程全复位」；
  `window.__wpsim` 增 `designSignalNames` 探针（供 e2e 核验观察行不进激励）。
  ③ `tools/e2e-rtl.mjs` 新增 **I 段（7 条落点 / 6 条断言）**：I1 存档含 `simWatches` + 核心 `signals`
  留原样副本；I2 载入回注入语义 + 位宽补回；I3 观察行**不在** `designSignalNames`（不当激励）；I4 新建
  全复位；I5 反复往返 + 旧工程（无字段）兼容；I6 坏 JSON 静默不抛。
  验证全绿：regression **79/79**、e2e-rtl **52/52**（I1~I6 **首跑即全 PASS**，无 404/无控制台异常）、
  e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建 **21,969,408 B / 22:23:52**、
  `version.txt` = `v0.4.0 build 2026-09-10 22:23:51 5ec07e7`（`5ec07e7` = **构建时 HEAD**，承载 B5 的
  commit 是它的下一个），C8 特征串 `injectArchiveFields`=2、`archiveSimWatches`=2、
  `applyArchivedExtras`=2、`applySimWatchesFromArchive`=2、`adoptArchivedWatchRows`=4、
  `designSignalNames`=1、`simWatches`=35（全 >0）；**未改 `sim/engine.js` 一行**（C9 守住）。
  对应 04 §4.16 / 06 P35 / 07 D18 / 08 §1.2 / 03 表 F·H / 本日志第十八轮。**下一项 = #87②**。

- 2026-09-10 第十七轮完成 **#76 B3 落地**（**代码 ↔ 树双向跳转 = 代码光标 → RTL/VCD 树反向高亮**，
  仿 Verdi nTrace「光标即高亮」；**纯视觉、零副作用**）：
  ① `js/sim/rtl-panel.js` 新增导出纯函数 `rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow`
  （**目标带 kind 时同类是硬条件 + 必须有位置证据**，同分取先出现者，无命中 -1）+ `clearRtlHighlight`/
  `clearVcdHighlight`/`highlightRtlRow`/`highlightVcdSignal`（清旧 → 加 `.rtl-active`/`.vcd-active` →
  **展开祖先 `<details>`** → `scrollIntoView`），`installCodeEditor` 增第 6 参 `onCursorMove`
  （`selectionchange`(ownerDocument) + 宿主 `mouseup`/`keyup`，位置签名去重、仅焦点在内时发、
  `setText()` 重建后强制补发）+ RTL 树行 `data-rtl-*` / VCD 信号行 `data-vcd-path`；**未改**
  `tools/cm6-entry.js` / `lib/codemirror.bundle.js`（光标事件挂宿主 DOM，**不需重跑 esbuild**）。
  ② `js/sim/ui-bridge.js` 新增模块级 `activeHighlight`/`activeSyncTimer` + `syncActiveFromCode`
  （`getContext` → `moduleAtLine` 模块行 / `findSymbols` 实例名 → 实例行 / `resolveSymbolVcdPaths`
  **唯一才亮** VCD、符号侧空才 `findVcdPathsByName` 兜底同样要求唯一 / 无目标清空）+ `scheduleActiveSync`
  （180ms 防抖）+ `applyActiveHighlight`/`clearActiveHighlight`（**树全量重建后重放**），`gotoSource()`
  末尾闭环、`refreshStructureTrees()` 末尾重放；`__wpsim` 增探针（`syncActiveFromCode`/
  `clearActiveHighlight`/`activeSymbol`/`highlightedRtlRow`/`highlightedVcdPath`）。
  ③ `index.html` 只加 `.rtl-jump-btn.rtl-active` 与 `.vcd-signal-row.vcd-active` 两条 CSS（无新面板）。
  ④ `tools/regression.mjs` +2 条 → **79/79**；⑤ `tools/e2e-rtl.mjs` +7 条 H 段 → **46/46**。
  **本轮唯一一次「修 bug」取舍**：首跑 H4 失败 → 判定 **H4 断言才是错的 spec**（模块行 fallback =
  仿 nTrace「当前 scope 常亮」是刻意设计），**改断言而非改实现**：H4 改为「不误亮信号、只保留模块
  scope 高亮」，新增 H4b「越界 + 未知符号 → 全清」。
  验证全绿：regression **79/79**、e2e-rtl **46/46**（H1 `{rtl:['module'],vcd:['tb.dut.q'],row:{kind:'module',fileIndex:0,line:1,moduleName:'counter'}}`；
  H2 模块 `sub` 内 `q` 两实例歧义 → `vcd:[]` 不亮；H3 实例名 `u_b` → 实例行；H4/H4b 见上；H5 重建后
  高亮仍在；H6 `treePortRows:0`（RTL 树口径未破））、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、
  真 exe 冒烟通过；exe 重建 **21,964,288 B / 22:06:08**、`version.txt` =
  `v0.4.0 build 2026-09-10 22:06:08 4fac9de`（`4fac9de` = **构建时 HEAD**，承载 B3 的 commit 是它的
  下一个），C8 特征串 `highlightRtlRow`=8、`highlightVcdSignal`=6、`syncActiveFromCode`=4、
  `rtl-active`=6、`vcd-active`=5、`datasetToRtlRow`=4、`clearActiveHighlight`=4（全 >0）；
  **未改 `sim/engine.js` 一行**（C9 守住）。
  对应 04 §4.15 / 06 P34 / 07 D17 / 08 §1.2 / 03 表 F·H / 本日志第十七轮。（该轮当时的下一项 = #76 B5，已于第十八轮完成。）
- 2026-09-10 第十六轮完成 **#76 B4 交互落地**（**代码内点/选中变量 → 加波形 = 唯一加信号主路径**，
  仿 Verdi nWave 中追 / `Ctrl+W`；同时收敛「仿真后全量自动灌信号」）：
  ① `js/sim/rtl-panel.js` 新增导出纯函数 `symbolNameAt(text, from, to)`（`VERILOG_IDENT`/`IDENT_SCAN`/
  `IDENT_CHAR`/`BITSEL_LOOKBACK` + ~110 词 `VERILOG_KEYWORDS` + `baseSymbolName` 剥 `q[3:0]` 位选 +
  `firstSymbolIn` 取 `a.b.c` 末段 + `isIdentAdjacent`）、`installCodeEditor` 增第 5 参 `onAddSymbol`，
  新增 `readContext()` → `{name,line,selection,exact,source}` 与返回对象 `getContext()`/`focus()`；
  触发面 = 双击变量（要求 `exact`）/ 右键菜单（`preventDefault`）/ **捕获阶段 `Ctrl+Alt+W`**
  （**刻意不用 `Ctrl+W`**：Edge `--app` 吞它当关窗）；**未改** `tools/cm6-entry.js` / `lib/codemirror.bundle.js`
  （触发挂宿主 DOM，**不需重跑 esbuild**）。② `js/sim/ui-bridge.js` 新增 `onAddSymbol` → `addSymbolFromCode`
  （`currentSymbolIndex()` → `moduleAtLine` 收窄 → `resolveSymbolVcdPaths`，**仅当候选为空**才
  `findVcdPathsByName` 兜底）→ 唯一候选 `pickVcdSignalIntoWave`、多候选 `showSymbolPicker`
  （单例 `symbolPicker`/`closeSymbolPicker`，即时 `syncSimRows`）；`replaceInjectedOutputs` **改名
  `syncSimRows` 且不再灌 `outputs`**；`window.__wpsim` 新增探针（`addSymbolFromCode`/`codeContext`/
  `symbolPickerOptions`/`clickSymbolPickerOption`/`closeSymbolPicker`/`nativeValuesOfOutput`）。
  ③ `index.html` 新增 `.sim-symbol-picker`/`-title`/`-item` CSS（+39 行，`.sim-status` 后、`#sim-panel` 前）。
  ④ `tools/regression.mjs` +2 条（`symbolNameAt` 取词）→ **77/77**；⑤ `tools/e2e-sim.mjs` 断言改
  「不自动灌信号」+「登记真实 VCD 路径后观察行等长同子步」；⑥ `tools/e2e-rtl.mjs` +7 条 G 段 → **39/39**。
  验证全绿：regression **77/77**、e2e-rtl **39/39**（G1~G7：`autoInjected:0/autoWatch:0`；点 `counter.sv`
  的 `q` → `tb.dut.q` 唯一候选不弹选择器；点 `sub.v` 的 `q` → `["tb.dut.u_a.q","tb.dut.u_b.q"]` 先不加入；
  点选择器项 → 加入且 `pickerClosed:true`；未知名 → `unknownDelta:0` + 中文提示；右键/`Ctrl+Alt+W`
  同链路；`codeContext.source === 'cm'`）、e2e-ui 73/73、e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；
  exe 重建 **21,947,904 B / 21:33:06**、`version.txt` = `v0.4.0 build 2026-09-10 21:33:05 ebce2b5`，
  C8 特征串 `symbolNameAt`=4、`addSymbolFromCode`=5、`sim-symbol-picker`=11、`syncSimRows`=3、
  `resolveSymbolVcdPaths`=6（全 >0）；**未改 `sim/engine.js` 一行**（C9 守住）。
  对应 04 §4.14 / 06 P33 / 07 D16 / 08 §1.2 / 03 表 F·H / 本日志第十六轮。**下一项 = #76 B3**。
- 2026-09-10 第十五轮完成 **#76 B1 数据层落地**：① `rtl-nav.js` 新增 `scanModuleSymbols`
  （关键字表 26 词 + `blankInnerScopes` 抹白 function/task/specify/table 体（**等长**，行号从
  原文取）+ `declRangeInfo` 位宽 + `readDeclStatement`/`splitDeclItems` 声明语句读取 +
  `mergeSymbols` 同名同行去重排序），产出 `{name,kind,direction,width,msb,lsb,range,value,line}`；
  ② `buildInstancePaths`（例化点分作用域前缀，自动判顶层 + 例化环保护）、`buildSymbolIndex`
  （统一索引 + `moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`，**收窄后为空则忽略该条件**、
  大小写不一致标 `fuzzy`）；`buildRtlNav` 每模块加 `endLine`/`symbols`；
  ③ `vcd-index.js` `findVcdPathsByName`（名称末段兜底：隐式 net / TB 本地信号 / 自定义类型变量）；
  ④ `ui-bridge.js` 暴露 `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`
  （`currentSymbolIndex()` 纯计算无副作用）。验证：regression **75/75**（+7）、e2e-rtl **32/32**
  （F1~F9，真实 VCD 核对含「符号位宽 == VCD 位宽」）、e2e-ui 73/73、e2e-sim 0 失败、
  probe-param 全过、真 exe 冒烟通过；exe 重建 **21,930,496 B / 21:06:52**，C8 特征串
  （`buildSymbolIndex`=3、`scanModuleSymbols`=2、`findVcdPathsByName`=3）核验通过；
  **未改 `sim/engine.js` 一行**。对应 03 表 H / 04 §4.13 / 06 P32 / 08 §1/§1.2 / 本日志第十五轮。
  **下一项 = #76 B4**（代码内点/选中变量 → 加波形）。
- 2026-09-10 第十四轮完成 **#86 A1~A4 全部落地**：① `rtl-nav.js` 新增源码级实例扫描器
  `scanInstances`（字符流 + `matchParen` 平衡括号 + 多实例循环 + `;` 收尾；行号取真实下标）
  + `maskStrings`（字符串换等长空格）+ `mergeInstances`（扫描器优先、engine 兜底过两道闸）
  + `collectModuleDefs`/`findModuleDefCandidates`/`resolveModuleDef`（同名多处→同文件优先、
  大小写模糊标 `fuzzy`）；② `rtl-panel.js makeJumpRow` 增第 6 参 `secondaryJump`：实例行
  左键跳 `module` 定义、右键/Alt+左键跳例化点；`ui-bridge.js gotoSource` 跨文件先切 tab 再跳，
  黑盒给中文提示；③ 侧栏「导入源码」按钮（`showOpenFilePicker` + `<input type=file>` 兜底 +
  同名去重）；④ `installProjectArchiveBridge` 包裹核心 `buildDocumentJson`/
  `loadFromFileContent`，源码集合随 `.wp` 存取（文本拼接注入、空文档不多逗号、旧工程向后兼容）。
  验证：regression **68/68**（+6 条）、e2e-rtl **23/23**（E1~E6）、e2e-ui 73/73、
  e2e-sim 0 失败、probe-param 全过、真 exe 冒烟通过；exe 重建 **21,910,016 B / 20:36:16**，
  C8 特征串核验通过。对应 03 表 H / 04 §4.12 / 06 P31 / 08 §1/§1.1/§1.2 / 本日志第十四轮。
- 2026-09-10 第十三轮完成 #86 独立子项「服务在线性根治」（插队专项，已全绿；详见 04 §4.11）；
  已并入 exe（20:36:16 版本同时含第十三轮自愈 + 第十四轮 A1~A4）。
- 2026-09-09 第十二轮澄清（用户拍板）+ 首批实施已完成：加信号主路径 = 代码内点/选中变量
  （“中追”式 = #87①/#76 B4）；RTL 树降级为纯代码层级浏览（删 ports/params 分组与端口计数，
  B2 撤销），data 层 `buildRtlNav` 保留 ports/params 供解析与 B1 复用。实施 commit：
  `rtl-panel.js renderRtlTree` UI 只删不增 + `index.html` 注释口径 + e2e-rtl B3 断言 →
  e2e-rtl 16/16、regression 62/62、e2e-ui 73/73、真 exe 冒烟通过、exe 重建 22:19:04。
  对应 03 表 F/H / 04 §4.10 / 08 §1.2/§2 / 本日志第十二轮。
- 2026-09-09 第十一轮完成「优先级重排」（纯文档，未动代码）：近期主线 #86 → #76 →
  #87①/②，#87 优先级提高，侧栏/整体 UI 重构设计提级（并行方案线 08 §2），#84/#77 推迟
  远期（08 §3）。对应台账 03 表 H / 04 §4.9 / 08 §1~§3 / 本日志第十一轮。无需重建 exe。
- 无功能阻塞。#76 进行中（**B1 ✅ 第十五轮、B4 ✅ 第十六轮、B3 ✅ 第十七轮**；**B5 信号组/观察行
  入 `.wp` = 下一项开工点**），#87②（模块全接口 Ctrl+4）紧随其后 —— 为下一主线。
- 2026-09-09 第十轮完成 #85（VCD 树点信号 → 画布观察行：regression 62/62、e2e-rtl 15/15、
  e2e-ui 73/73、e2e-sim 0 失败，exe 重建 19:31:28）；下一主线 = #86 → #76 → #87①/②
  （第十一轮重排），开工前先读 08 §1 / 03 表 H / 04 §4.5/§4.9 与当日日志第十一轮。
- 2026-09-09 第五轮完成 Verdi 功能规划（①查看波形 ②添加信号 ③top→例化模块源码 + 其它好用功能）的
  真实语义研究 + WavePaint 差距拆解，登记 #83~#87（03 表 H / 04 §4.5 / 当日日志第五轮）。**纯规划未动
  代码**；实现前先与用户确认范围（第十一轮已拍板新顺序 #86 → #76 → #87①/②，原 #85 → #86 → #84
  建议作废）。
- #81 已验证：regression 58/58、probe-param、e2e-sim 0 失败、probe-tutorial/addbtn/simfail
  全过、真 exe 冒烟通过；exe 已按 C1 重建并核验 5 个特征串
  （`simAutoRetried`/`wavepaint_tutorial_done`/`wp-tutorial-highlight`/`probeServerAlive`/
  `SIM_REQUEST_TIMEOUT_MS`）。
- #82 已验证：真机死窗口 5→1（`CLOSE-LEGACY 5 window(s)`）、新实例端到端仿真、真实窗口
  UIA 点击 RUN→RESULT、regression 58/58、e2e-sim 0 失败；exe 已按 C1 重建并核验特征串。
- 交付提醒升级：先 `taskkill /F /IM WavePaintClean.exe`（或任务管理器结束）再启动；
  若桌面又出现多个同名窗口 = 仍在用旧 exe。
