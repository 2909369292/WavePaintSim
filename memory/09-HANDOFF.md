# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | **#76 B4：代码内点/选中变量 → 加波形（2026-09-10 第十六轮，唯一加信号主路径）** —— ① `rtl-panel.js` 导出纯函数 `symbolNameAt(text, from, to)` 取词（`baseSymbolName` 剥位选 / `firstSymbolIn` 取末段 / ~110 词关键字排除），`installCodeEditor` 增第 5 参 `onAddSymbol`，触发面 = 双击变量 / 右键菜单 / **捕获阶段 `Ctrl+Alt+W`**（不用 `Ctrl+W`：Edge `--app` 吞它当关窗）；② `ui-bridge.js` 新增 `addSymbolFromCode`（`currentSymbolIndex` → `moduleAtLine` 收窄 → `resolveSymbolVcdPaths`，**仅候选为空才** `findVcdPathsByName` 兜底）→ 唯一候选直加、多候选弹**代码区旁轻量选择器** `.sim-symbol-picker`；③ `replaceInjectedOutputs` 改名 `syncSimRows` 且**不再全量灌 outputs** = 收敛「仿真后全量自动加信号」。详见 04 §4.14、06 P33、07 D16、日志 2026-09-10 第十六轮。此前：**#76 B1**（第十五轮，04 §4.13/06 P32）、**#86 A1~A4**（第十四轮）、**第十三轮服务在线性根治**、**#85 观察行**（第十轮）、**第十二轮 RTL 树瘦身**、第六轮 5 项 + #93 收官 |
| 最近完成文档 | **第十六轮记忆同步**（2026-09-10）：04 新增 §4.14、06 新增 P33（代码取词加信号四坑）、07 新增 D16（三入口 + 精确优先 + 代码区旁浮层）、03 表 F/H #76 状态（B1 ✅ + B4 ✅）、08 文件头/§1/§1.2、本文件全篇、`05-LOGS.md` 索引、`INDEX.md` 页脚、当日日志「第十六轮」。叠加生效的仍是**第十二轮澄清**：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4，**已落地**）；**RTL 结构树为纯代码层级浏览**（文件→模块→实例，跳源码），不显示接口信号、不承载加信号交互（原 #76 B2 撤销）——见 04 §4.10 / 03 表 F/H / 08 §1.2/§2；第十一轮规划重排仍生效（#86 → #76 → #87①/②，#84/#77 远期） |
| 测试基线 | regression **77/77**（第十五轮 75 + **第十六轮 B4 新增 2 条** `symbolNameAt` 取词断言）；e2e-rtl **39/39**（含 #85 D1~D6 + 第十二轮 B3 + 第十四轮 E1~E6 + 第十五轮 F1~F9 + **第十六轮 G1~G7**）；e2e-ui 73/73（真实 Edge，含 D2/F/G/H 段）；e2e-sim 0 失败（含「仿真后不自动灌信号」断言）；probe-param 全过；probe-tutorial/addbtn/simfail 全过；#82 真机冒烟（收窗 5→1 + 端到端仿真 + UIA 真实点击 RUN→RESULT）通过；#93 绑定一致性 BINDINGS OK；**2026-09-10 第十六轮全量复跑全绿（regression 77/77、e2e-sim 0 失败、e2e-rtl 39/39、e2e-ui 73/73、probe-param 全过、真 exe 冒烟通过）+ 第十三轮自愈专测 `verify-recovery2.mjs` 17/17 + 真实 Edge 协议探针 `probe-protocol.mjs`（隐藏 iframe 可拉起 exe；顶层跳转/`window.open`/`<a target=_blank>` 被 `user gesture` 拦）** |
| 当前阻塞 | 无 |
| 下一步 | **#76 B1 ✅ + B4 ✅ 已完成（第十五/十六轮 2026-09-10）**。主线下一项 = **#76 B3：代码 ↔ 树双向跳转**（取词底座现成：B4 的 `getContext()` + B1 的 `moduleAtLine`/`findSymbols`；补“代码符号/行 → 反向高亮/定位 RTL 树与 VCD 树节点”）→ B5 信号组入 `.wp` → **#87②**。RTL 树只做代码层级浏览，不承载加信号。侧栏/整体 UI 重构（08 §2）为**并行方案线**：先出方案给用户 review，不直接开工。开工前先读 `08-ROADMAP.md` §1.2、`03-REQUIREMENTS.md` 表 H、04 §4.10~§4.14、06 P31/P32/P33、07 D16 与 `memory/logs/2026-09-10.md` 第十三~十六轮 |

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

## 3. 下一项任务：#76 B3 代码 ↔ 树双向跳转（B1 + B4 已完成）

> **2026-09-10 第十六轮（当前生效）**：**#76 B4 已落地**并随 exe 重建交付
> （`v0.4.0 build 2026-09-10 21:33:05 ebce2b5`）：代码里**双击变量 / 右键 / `Ctrl+Alt+W`**
> 即可把该信号加进波形（多实例同名时在**代码区旁**弹轻量选择器 `.sim-symbol-picker`），
> 且**运行仿真后不再全量自动灌信号**。实现与验证见 04 §4.14、踩坑 06 P33、决策 07 D16。
> **主线下一项 = #76 B3（代码 ↔ 树双向跳转）**。拆解：`08-ROADMAP.md` §1.2（#76 B1~B5，B2 已撤销）；
> 台账 03 表 H；04 §4.12（#86）/§4.13（B1）/§4.14（B4）。第十一轮重排仍生效（#86 → #76 → #87①/②，
> #84/#77 远期）；第十二轮澄清仍生效：加信号主路径 = **代码内点/选中变量（#76 B4，已落地）**，
> RTL 树只做代码层级浏览。

### 3.1 目标

**#76（下一步，从 B4 起；全文见 08 §1.2）**

1. **B1 ✅ 底层：模块体内符号索引 + VCD scope 映射（第十五轮完成，勿重做）**：产物 =
   `rtl-nav.scanModuleSymbols` / `buildInstancePaths` / `buildSymbolIndex` / `moduleAtLine` /
   `findSymbols` / `resolveSymbolVcdPaths`、`vcd-index.findVcdPathsByName`、
   `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`。改之前先读 04 §4.13 与 06 P32。
2. **B4 ✅ 交互：代码内点/选中变量 → 加波形（2026-09-10 第十六轮完成，勿重做）**（= #87① / “中追”式 =
   **唯一加信号主路径**）。实现要点：`rtl-panel.js` 导出纯函数 `symbolNameAt(text, from, to)`（剥 `q[3:0]`
   位选 / `a.b.c` 取末段 / ~110 词关键字排除 + `exact` 判定），`installCodeEditor` 增第 5 参 `onAddSymbol`
   （返回对象加 `getContext()`/`focus()`）；`ui-bridge.js` `addSymbolFromCode`（`currentSymbolIndex` →
   `moduleAtLine` 收窄 → `resolveSymbolVcdPaths`，**仅候选为空才** `findVcdPathsByName` 兜底）→ 唯一候选
   `pickVcdSignalIntoWave`（#85 链路），多候选弹 `.sim-symbol-picker`。**三条硬口径（勿违反）**：
   ① 快捷键是**捕获阶段 `Ctrl+Alt+W`**，不是 `Ctrl+W`（Edge `--app` 会吞 `Ctrl+W` 当关窗）；② 精确候选与
   名称兜底**不取并集**（精确命中就不看兜底）；③ 多候选选择器**只能挂在代码区旁**，严禁另建“信号层次选择框”。
   同时 `replaceInjectedOutputs` → `syncSimRows` 且**不再灌 outputs**（收敛「仿真后全量自动灌信号」，用户明确不要）。
   详见 04 §4.14 / 06 P33 / 07 D16。
3. **B3 树 ↔ 代码双向跳转（下一项、开工点）**：已有“树 → 代码”（#86 A2 已扩为“实例→定义/例化点”双语义）；
   补“代码符号/行 → 反向高亮 RTL 树与 VCD 树节点”。**取词底座现成**：B4 的 `getContext()`（`{name,line,selection,exact,source}`）
   + B1 的 `moduleAtLine`/`findSymbols` —— **不要另写一套解析**（见 08 §1.2 B3、04 §4.13/§4.14）。
4. **B5 信号组入 `.wp`**：GroupManager 组 + 观察行（`simWatches`）随工程存档恢复；
   源码集合已在 #86 A4 打通，沿用同一存档桥（`installProjectArchiveBridge`/
   `injectArchiveSourceFiles`）。
5. **#87② 模块全接口 Ctrl+4**：#76 收尾后紧跟。

### 3.2 建议顺序

1. ✅ **#85（VCD 树点信号 → 观察行，第十轮完成）**：VCD 侧别重做。
2. ✅ **#86 A1~A4 + 服务在线性子项（第十三/十四轮完成）**：别重做。
3. ✅ **#76 B1（第十五轮）+ B4（第十六轮）完成**：别重做。
4. **#76 B3 → B5**：B3 = 代码 ↔ 树双向跳转（用 B4 的 `getContext()` + B1 的 `moduleAtLine`/`findSymbols`）；
   B5 = 信号组/观察行随 `.wp` 存档（沿用 A4 存档桥 `installProjectArchiveBridge`/`injectArchiveSourceFiles`）。
5. **#87②（模块全接口 Ctrl+4）** 紧跟 #76。
6. **侧栏 / 整体 UI 重构（08 §2）并行方案线**：先出「UI 重构设计方案」给用户 review，
  确认后再实施，不直接开工。

### 3.3 不要做

- 不要做 #84 / #77（用户第十一轮已推迟远期）——除非用户再次拍板。
- 不要做 nSchema 原理图 / FSDB / 重后端 / 全盘自动扫盘（研究期已排除）。
- 不要一次性做完 #86~#87 全部子项：按 08 §1 的 A/B 小步推进。
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
node tools/e2e-ui.mjs
node tools/e2e-rtl.mjs   # #75 P0/#85/#86/#76-B1/#76-B4 浏览器冒烟 39 项含 B/C/D/E/F/G 段（需真实 Edge，非沙箱执行）
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
- `memory/logs/2026-09-10.md` 记录了第十三/十四/十五/十六轮：第十三轮服务自愈、第十四轮 #86
  A1~A4、第十五轮 #76 B1、第十六轮 #76 B4。做 #76 B3 前建议通读「第十六轮」段（含 G 段实测输出
  与三条硬口径）。
- 行尾差异：`js/`、`tools/`、`memory/`、`index.html` **均为 LF、无 BOM**（2026-09-10 第十六轮按字节
  实测；`index.html` 往返写入 byteDiff=0）。历史「`index.html` 是 CRLF」的说法**已过时**，别据此
  做行尾转换（转换反而会产出整文件 diff）。
- PowerShell 环境（本机 Codex desktop）：**无 `sed`**、`head` 不可用（用
  `Select-Object -First/Last`）；内联 JS 会被转义破坏 → 探针一律写成 `.mjs` 再 `node` 跑。

---

## 6. 交付时必须提醒用户

1. 重启应用。
2. 从唯一路径启动：
   `D:\Files\Code\波形\WavePaintClean.exe`
3. 在面板查看版本号，确认不是旧副本（本批应显示 `v0.4.0 build 2026-09-10 21:33:05 ebce2b5`，
   内置第十六轮 #76 B4 + 第十五轮 #76 B1 + 第十四轮 #86 A1~A4 + 第十三轮服务自愈 + 第十二轮 RTL 树瘦身 +
   #85 观察行链路）。**本批有两条用户可见变化**：① 代码里**双击变量名 / 右键 / 按 `Ctrl+Alt+W`** 就能把该信号
   加进波形（多实例同名时在代码区旁弹轻量选择器挑一个）；② 点「运行仿真」后**不再把所有可看变量全量灌进画布**
   （只保留用户自己加的观察行）。
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
- 无功能阻塞。#76 进行中（**B1 ✅ 第十五轮、B4 ✅ 第十六轮**；B3 双向跳转（下一项）/ B5 信号组入
  `.wp` 待做），#87② 紧随其后 —— 为下一主线。
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
