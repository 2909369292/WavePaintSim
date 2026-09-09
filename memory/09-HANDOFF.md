# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | Verdi 先行批第一步 **#85：VCD 树点信号 → 画布「观察行」**（2026-09-09 第十轮，ui-bridge.js `state.simWatches` + `pickVcdSignalIntoWave`，观察行 `__simInjected:true` 不进激励、重仿真按 VCD 路径自动刷新去重、删行不复活可重加；e2e-rtl 15/15 含 D1~D6）；第六轮 #90/#88/#92/#91/#89 与 #93 混淆清理已收官；**第十二轮首批实施 RTL 树瘦身**（renderRtlTree 删「端口 Ports / 参数 Parameters」分组与端口计数，RTL 树只做代码层级浏览） |
| 最近完成文档 | **第十二轮澄清**（2026-09-09）：加信号主路径 = 代码内点/选中变量（“中追”式 = #87①/#76 B4），**RTL 结构树降级为纯代码层级浏览**（文件→模块→实例，跳源码），删端口/参数分组、不显示接口信号、不承载加信号交互（原 #76 B2 撤销）——见 04 §4.10 / 03 表 F/H / 08 §1.2/§2；第十一轮规划重排仍生效（#86 → #76 → #87①/②，#84/#77 远期） |
| 测试基线 | regression 62/62（含 #89 新增 4 断言）；e2e-sim 0 失败；probe-param 全过；e2e-rtl 16/16（含 #85 D1~D6 + 第十二轮 B3）；e2e-ui 73/73（真实 Edge，含 D2/F/G/H 段）；probe-tutorial/addbtn/simfail 全过；#82 真机冒烟（收窗 5→1 + 端到端仿真 + UIA 真实点击 RUN→RESULT）通过；本批真 exe 冒烟 22:19 通过；#93 绑定一致性 BINDINGS OK |
| 当前阻塞 | 无 |
| 下一步 | 第十二轮澄清后的近期主线 = **#86 → #76 B1/B4 → #87②**；**#76 B4（代码内点/选中变量加波形 = 唯一加信号主路径）是最终目标，RTL 树只做代码层级浏览**。先开工 **#86**（实例→模块定义源码跳转 + 源码文件导入 + 例化解析增强，拆解 A1~A4 见 08 §1.1），随后 #76 B1 符号索引/scope 映射 → B4。开工前先读 `08-ROADMAP.md` §1/§1.2、`03-REQUIREMENTS.md` 表 H、04 §4.9/§4.10 与 `memory/logs/2026-09-09.md` 第十一轮（重排）+ 第十二轮（澄清）+ 第五轮（Verdi 语义）+ 第十轮（#85） |

---

## 2. 你必须先做的三件事

1. **读 `01-PROJECT.md`**
   - 理解架构、数据流、模块职责、唯一入口。
2. **读 `02-WORKFLOW.md`**
   - 理解 C1~C18 铁律，尤其是改代码后必须重建 exe、更新记忆、commit/push。
3. **读 `04-PROGRESS.md`**
   - 确认当前进度，不要重做已完成工作。

---

## 3. 下一步任务：#86 实例→模块定义源码跳转 + 源码文件导入（近期主线第一项）

> **2026-09-09 第十一轮用户重排（当前生效）**：推迟 #84/#77 入远期；近期主线 =
> #86 → #76 → #87①/②（重点：底层支持更多 Verilog 代码互动 + 代码解析能力；交互层仿照
> Verdi 规划）。#85 已完成（第十轮，VCD 树点信号 → 观察行，`simWatches` 链路是所有
> “加波形”的复用底座，别重做）。拆解与进度状态：`08-ROADMAP.md` §1.1（#86 A1~A4）、
> §1.2（#76 B1~B5）；台账 03 表 H；04 §4.5/§4.9/§4.10。
> **2026-09-09 第十二轮澄清（叠加生效）**：加信号主路径 = **代码内点/选中变量（#76 B4）**，
> RTL 树只做代码层级浏览（已删 ports/params，不再点行加信号 = B2 撤销），别再加回。

### 3.1 目标

**#86（先做）**
1. A1 底层：`rtl-nav.js` 模块表补“模块定义候选”索引；例化行识别增强（参数化例化
   `#(.p(v))` / 命名/位置端口例化 / generate 内例化 / 多文件同名模块歧义）。
2. A2 交互：RTL 树实例节点单击 → 按 `moduleName` 跳定义行（同文件直跳 / 跨文件切 tab）；
   无定义给中文提示；「跳到例化点行」保留为次入口。
3. A3 交互：磁盘导入源码文件入口（`.sv/.v` 多选 → `state.files` → 自动解析刷新树）。
4. A4（待用户拍板）：源码集合随 `.wp` 工程存档/恢复。

**#76（#86 之后，B1~B5 见 08 §1.2）**
1. **代码内点/选中变量 → 加波形（B4 = 唯一加信号主路径；复用 `toNativeSignal` +
   `simWatches` 链路）**。
2. 树 ↔ 代码双向跳转（已有「代码侧跳转」，补「代码行 → 反向高亮树节点」）。
3. 信号组入 `.wp` 工程（存档后重开可恢复）。

### 3.2 建议顺序

1. ✅ **#85（VCD 树点信号 → 观察行，第十轮完成）**：VCD 侧别重做。
2. **#86 A1 → A2 → A3**（建议小步 commit）：先索引/解析增强，再接“实例跳定义”，
   再做磁盘源码导入；A4 等用户拍板。
3. **#76 B1 → B2/B4 → B3/B5**：#76 是 #86 的“近亲”——B1 符号索引/scope 映射直接复用
   A1 的解析底座；**代码内点变量加波形（B4 = #87①“中追”式 = 唯一加信号主路径）复用
   #85 `pickVcdSignalIntoWave` 口径**（B2 RTL 树点行加波形已按第十二轮澄清撤销）；#87②
   （模块全接口 Ctrl+4）紧跟。

### 3.3 不要做

- 不要做 #84 / #77（用户第十一轮已推迟远期）——除非用户再次拍板。
- 不要做 nSchema 原理图 / FSDB / 重后端 / 全盘自动扫盘（研究期已排除）。
- 不要一次性做完 #86~#87 全部子项：按 08 §1 的 A/B 小步推进。
- 不要换主仿真器。
- 不要重写核心引擎。
- 不要绕过 `__core` / `wpf` 直接抓内部标识符。
- 不要改 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填（最易碎区）。
- 不要重做 #85 的 VCD 侧（观察行链路已闭环）；RTL 树点行加波形是 #76 B2 新工作。

---

## 4. 立即可用的命令

```powershell
node --check js/sim/engine.js
node tools/regression.mjs
node tools/e2e-sim.mjs
node tools/probe-param.mjs
node tools/e2e-ui.mjs
node tools/e2e-rtl.mjs   # #75 P0/#85 浏览器冒烟 15 项含 D 段（需真实 Edge，非沙箱执行）
.\build.ps1
```

### 4.1 Bug 自研修复探针（#81 遗留，可复跑回归）

```powershell
node .e2e-tmp/probe-simfail.mjs    # Bug1：selfheal/dead/abort 三场景
node .e2e-tmp/probe-addbtn.mjs     # Bug2：添加信号按钮/图标可见性全场景
node .e2e-tmp/probe-tutorial.mjs   # Bug3：教程不隐形重启、无键盘拦截
node tools/exe-smoke.mjs           # 先启动真 exe 再跑（读最新端口文件）
```

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

---

## 6. 交付时必须提醒用户

1. 重启应用。
2. 从唯一路径启动：
   `D:\Files\Code\波形\WavePaintClean.exe`
3. 在面板查看版本号，确认不是旧副本（本批应显示 `v0.4.0 build 2026-09-09 22:19:04 31402a0`，
   内置第十二轮 RTL 树瘦身 + #85 观察行链路）。
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

- 2026-09-09 第十二轮澄清（用户拍板）+ 首批实施已完成：加信号主路径 = 代码内点/选中变量
  （“中追”式 = #87①/#76 B4）；RTL 树降级为纯代码层级浏览（删 ports/params 分组与端口计数，
  B2 撤销），data 层 `buildRtlNav` 保留 ports/params 供解析与 B1 复用。实施 commit：
  `rtl-panel.js renderRtlTree` UI 只删不增 + `index.html` 注释口径 + e2e-rtl B3 断言 →
  e2e-rtl 16/16、regression 62/62、e2e-ui 73/73、真 exe 冒烟通过、exe 重建 22:19:04。
  对应 03 表 F/H / 04 §4.10 / 08 §1.2/§2 / 本日志第十二轮。
- 2026-09-09 第十一轮完成「优先级重排」（纯文档，未动代码）：近期主线 #86 → #76 →
  #87①/②，#87 优先级提高，侧栏/整体 UI 重构设计提级（并行方案线 08 §2），#84/#77 推迟
  远期（08 §3）。对应台账 03 表 H / 04 §4.9 / 08 §1~§3 / 本日志第十一轮。无需重建 exe。
- 无功能阻塞。#76 Verdi P1（点变量加波形 / 双向跳转 / 信号组入 `.wp`）为下一主线。
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
