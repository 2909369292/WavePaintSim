# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | **#76 B1：模块体内符号索引 + 例化路径 + 符号 → VCD 全路径映射（2026-09-10 第十五轮）** —— ① `rtl-nav.js` 新增 `scanModuleSymbols`/`buildInstancePaths`/`buildSymbolIndex`/`moduleAtLine`/`findSymbols`/`resolveSymbolVcdPaths`（`buildRtlNav` 每模块加 `endLine`/`symbols`）；② `vcd-index.js` 新增 `findVcdPathsByName`（名称末段兜底）；③ `ui-bridge.js` 暴露 `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`（**纯数据层，界面无可见变化**）。详见 04 §4.13、06 P32、日志 2026-09-10 第十五轮。此前：**#86 A1~A4**（第十四轮，04 §4.12/06 P31）、**第十三轮服务在线性根治（自愈）**、**#85：VCD 树点信号 → 画布「观察行」**（第十轮）、第六轮 #90/#88/#92/#91/#89 与 #93 混淆清理收官、**第十二轮 RTL 树瘦身** |
| 最近完成文档 | **第十五轮记忆同步**（2026-09-10）：04 新增 §4.13（并在 §2 时间线补记第十四/十五轮）、06 新增 P32（符号索引三坑）、03 表 H #76 状态（B1 ✅）、08 §1/§1.2、本文件 §1/§3/§4/§6/§9、当日日志「第十五轮」、`INDEX.md` 页脚。叠加生效的仍是**第十二轮澄清**：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4），**RTL 结构树为纯代码层级浏览**（文件→模块→实例，跳源码），不显示接口信号、不承载加信号交互（原 #76 B2 撤销）——见 04 §4.10 / 03 表 F/H / 08 §1.2/§2；第十一轮规划重排仍生效（#86 → #76 → #87①/②，#84/#77 远期） |
| 测试基线 | regression **75/75**（第十四轮 68 + **第十五轮 B1 新增 7 条**符号索引/例化路径/名称兜底断言）；e2e-sim 0 失败；probe-param 全过；e2e-rtl **32/32**（含 #85 D1~D6 + 第十二轮 B3 + 第十四轮 E1~E6 + **第十五轮 F1~F9**）；e2e-ui 73/73（真实 Edge，含 D2/F/G/H 段）；probe-tutorial/addbtn/simfail 全过；#82 真机冒烟（收窗 5→1 + 端到端仿真 + UIA 真实点击 RUN→RESULT）通过；#93 绑定一致性 BINDINGS OK；**2026-09-10 第十五轮全量复跑全绿（regression 75/75、e2e-sim 0 失败、e2e-rtl 32/32、e2e-ui 73/73、probe-param 全过、真 exe 冒烟通过）+ 第十三轮自愈专测 `verify-recovery2.mjs` 17/17 + 真实 Edge 协议探针 `probe-protocol.mjs`（隐藏 iframe 可拉起 exe；顶层跳转/`window.open`/`<a target=_blank>` 被 `user gesture` 拦）** |
| 当前阻塞 | 无 |
| 下一步 | **#76 B1 ✅ 已完成（第十五轮 2026-09-10）**。主线下一项 = **#76 B4：代码内点/选中变量 → 加波形**（“中追”式 / 仿 Ctrl+W = **唯一加信号主路径**；拆解见 08 §1.2）→ B3 双向跳转 / B5 信号组入 `.wp` → **#87②**。RTL 树只做代码层级浏览，不承载加信号。侧栏/整体 UI 重构（08 §2）为**并行方案线**：先出方案给用户 review，不直接开工。开工前先读 `08-ROADMAP.md` §1.2、`03-REQUIREMENTS.md` 表 H、04 §4.10~§4.13、06 P31/P32 与 `memory/logs/2026-09-10.md` 第十三/十四/十五轮 |

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

## 3. 下一项任务：#76 B4 代码内点/选中变量 → 加波形（B1 已完成）

> **2026-09-10 第十五轮（当前生效）**：**#76 B1 已落地**并随 exe 重建交付
> （`v0.4.0 build 2026-09-10 21:06:52 db7a98f`）：模块体内符号索引 + 例化路径 + 符号→VCD
> 全路径映射（**纯数据层，界面无可见变化**）。实现与验证见 04 §4.13、踩坑见 06 P32。
> **主线下一项 = #76 B4**。拆解：`08-ROADMAP.md` §1.2（#76 B1~B5，B2 已撤销）；
> 台账 03 表 H；04 §4.12（#86）/§4.13（B1）。第十一轮重排仍生效（#86 → #76 → #87①/②，
> #84/#77 远期）；第十二轮澄清仍生效：加信号主路径 = **代码内点/选中变量（#76 B4）**，
> RTL 树只做代码层级浏览。

### 3.1 目标

**#76（下一步，从 B4 起；全文见 08 §1.2）**

1. **B1 ✅ 底层：模块体内符号索引 + VCD scope 映射（第十五轮完成，勿重做）**：产物 =
   `rtl-nav.scanModuleSymbols` / `buildInstancePaths` / `buildSymbolIndex` / `moduleAtLine` /
   `findSymbols` / `resolveSymbolVcdPaths`、`vcd-index.findVcdPathsByName`、
   `__wpsim.symbolIndex/symbolsOf/symbolVcdPaths/vcdPathsByName`。改之前先读 04 §4.13 与 06 P32。
2. **B4 交互：代码内点/选中变量 → 加波形（下一项、开工点）**（= #87① / “中追”式 = **唯一加信号主路径**；仿
   Ctrl+W）。复用 `state.simWatches` 链路（`pickVcdSignalIntoWave`/`toNativeSignal`，见 #85）；
   映射用 B1 的 `symbolVcdPaths` / `findSymbols`（候选 >1 时**只对代码操作**弹选择器），
   **不引入单独“信号层次选择框”**（用户明确不想要）。**同时把
   “运行仿真后全量自动加信号/回填”（#83③c 遗留）与 B4 统一为“用户主动点”**。
   建议落点：`js/editor/` 代码区（CM6 视图）监听「右键菜单 / Ctrl+W / 双击变量」→ 取光标处
   标识符 → `__wpsim.symbolVcdPaths(name, {fileIndex, line})` → 命中即
   `pickVcdSignalIntoWave(path)` + `scrollWaveToWatchPath`；未命中 → 名称兜底
   `vcdPathsByName` 给候选；多候选弹轻量选择器（**挂在代码区，不是新面板**）。
3. **B3 树 ↔ 代码双向跳转**：已有“树 → 代码”（#86 A2 已扩为“实例→定义/例化点”双语义）；
   补“代码符号/行 → 反向高亮 RTL 树与 VCD 树节点”。
4. **B5 信号组入 `.wp`**：GroupManager 组 + 观察行（`simWatches`）随工程存档恢复；
   源码集合已在 #86 A4 打通，沿用同一存档桥（`installProjectArchiveBridge`/
   `injectArchiveSourceFiles`）。
5. **#87② 模块全接口 Ctrl+4**：#76 收尾后紧跟。

### 3.2 建议顺序

1. ✅ **#85（VCD 树点信号 → 观察行，第十轮完成）**：VCD 侧别重做。
2. ✅ **#86 A1~A4 + 服务在线性子项（第十三/十四轮完成）**：别重做。
3. ✅ **#76 B1（第十五轮完成）**：别重做。
4. **#76 B4 → B3 → B5**：B4 是主路径（复用 B1 的 `symbolVcdPaths`/`findSymbols` + #85 的
   `pickVcdSignalIntoWave` 口径，见 04 §4.13）；B3/B5 收尾。
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
node tools/e2e-rtl.mjs   # #75 P0/#85/#86/#76-B1 浏览器冒烟 32 项含 B/C/D/E/F 段（需真实 Edge，非沙箱执行）
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
- `memory/logs/2026-09-10.md` 记录了第十三/十四/十五轮：第十三轮服务自愈、第十四轮 #86
  A1~A4、第十五轮 #76 B1。做 #76 B4 前建议通读「第十五轮」段（含 F 段实测输出与三条边界）。
- 行尾差异：`js/`、`tools/`、`memory/` 为 **LF**；**`index.html` 是 CRLF** —— 用脚本改写时
  别把 `index.html` 换成 LF（会产出整文件 diff）。
- PowerShell 环境（本机 Codex desktop）：**无 `sed`**、`head` 不可用（用
  `Select-Object -First/Last`）；内联 JS 会被转义破坏 → 探针一律写成 `.mjs` 再 `node` 跑。

---

## 6. 交付时必须提醒用户

1. 重启应用。
2. 从唯一路径启动：
   `D:\Files\Code\波形\WavePaintClean.exe`
3. 在面板查看版本号，确认不是旧副本（本批应显示 `v0.4.0 build 2026-09-10 21:06:52 db7a98f`，
   内置第十五轮 #76 B1 + 第十四轮 #86 A1~A4 + 第十三轮服务自愈 + 第十二轮 RTL 树瘦身 +
   #85 观察行链路）。**本批对用户界面无可见变化**（B1 是纯数据层，可感知的新行为要等 B4）。
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
  js 与 exe）——VCD 侧别重做；后续加信号走**代码内点选变量（#76 B4）**
- **#86 A1~A4（第十四轮完成，勿重做/勿回退）**：`rtl-nav.js` 的源码级实例扫描器
  `scanInstances` + `maskStrings`（字符串换等长空格）+ `mergeInstances`（扫描器优先、engine
  兜底过两道闸）+ 模块定义索引 `collectModuleDefs`/`resolveModuleDef`；`rtl-panel.js` 实例行
  左键跳定义 / 右键(Alt+左键)跳例化点；`ui-bridge.js` `gotoSource` / `importSourceFiles` /
  `.wp` 源码存档桥（`installProjectArchiveBridge` 必须在核心初始化前安装）；`index.html`
  「导入源码」按钮；`file-menu.js` `onNew()` 复位源码集合。**改这些之前先读 04 §4.12、06 P31。**
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
- 无功能阻塞。#76 进行中（**B1 ✅ 第十五轮**；B4 点变量加波形 / B3 双向跳转 / B5 信号组入
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
