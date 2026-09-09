# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | 第六轮存量完善：#90 步数/子步 ▲/▼（`1ce6b83`）→ #88 编辑模式点 Vector 不进框选（`e6d7bd1`）→ #92 框选输入后点画布/画布外自动提交（本次）；此前 #82 遗留窗口收拢 / #81 Bug 修复 / #75 Verdi P0 / #80 记忆体系重构 |
| 测试基线 | regression 58/58；e2e-sim 0 失败；probe-param 全过；e2e-rtl 9/9；probe-tutorial/addbtn/simfail 全过；#82 真机冒烟（收窗 5→1 + 端到端仿真 + UIA 真实点击 RUN→RESULT）通过 |
| 当前阻塞 | 无 |
| 下一步 | ⚠ 第六轮 5 项还剩 **#91 步长/子步变化 Clock 自动填充（Task4）→ #89 信号名显示位宽（Task2）**；全部完成后统一 C1 重建 exe + C8 特征串核验 + 全量回归。之后回 Verdi 先行批 #85 → #86 → #84（见 03 表 H / 04 §4.5）。详情见 `memory/logs/2026-09-09.md` 第六轮 |

---

## 2. 你必须先做的三件事

1. **读 `01-PROJECT.md`**
   - 理解架构、数据流、模块职责、唯一入口。
2. **读 `02-WORKFLOW.md`**
   - 理解 C1~C18 铁律，尤其是改代码后必须重建 exe、更新记忆、commit/push。
3. **读 `04-PROGRESS.md`**
   - 确认当前进度，不要重做已完成工作。

---

## 3. 下一步任务：#76 Verdi 借鉴 P1

> 编号纠正：此前 04/09 把 P1 误写成“#75 P1”；台账中 #75 = 已完成的 P0，P1 = #76。
> 2026-09-09 第五轮规划补充：P1 拆出先行批 #85（点信号→加波形）/ #86（实例→模块定义源码跳转 + 源码文件导入）
> / #84（波形查看增强），登记于台账 03 表 H；先做 #85 → #86，P1 其余项（双向跳转、信号组入 `.wp`）随后收。
> 本轮为纯规划，尚未实现，开工前先读 `memory/logs/2026-09-09.md` 第五轮。
> ⚠ 2026-09-09 第六轮起：用户明确「目前不着急做 Verdi 远期」，先完成 5 项存量功能
> （#88~#92，剩 #91/#89），全部收尾重建 exe 后再回本节 Verdi 先行批。

### 3.1 目标

1. **点变量 → 加波形**（复用 P0 的 VCD/结构树完整路径 + `toNativeSignal` 注入链路）。
2. **树 ↔ 代码双向跳转**（P0 已有「代码侧跳转」，补「代码行 → 反向高亮树节点」）。
3. **信号组入 `.wp` 工程**（存档后重开可恢复）。

### 3.2 建议顺序

1. **信号选择 → 加波形**
   - 先确认 P0 数据源输出：`buildVcdHierarchy` 的节点含 `path`（点分作用域）、信号含完整路径 title；`buildRtlNav` 的节点含文件/行号。
   - 处理多实例歧义：同名模块多次例化时需让用户选实例作用域。
   - 未 dump 信号（仿真没跑到 / 被优化掉）给中文提示，不要静默失败。
2. **双向跳转**
   - 点代码里的信号名 → 高亮对应结构树/VCD 树节点。
3. **信号组入 `.wp`**
   - 复用 `editor/file-menu.js` 的 `.wp` 存取链路，P0/P1 新增的面板状态随工程存档/恢复。

### 3.3 不要做

- 不要一次性做 P2/P3。
- 不要换主仿真器。
- 不要重写核心引擎。
- 不要绕过 `__core` / `wpf` 直接抓内部标识符。
- 不要改 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填（最易碎区）。

---

## 4. 立即可用的命令

```powershell
node --check js/sim/engine.js
node tools/regression.mjs
node tools/e2e-sim.mjs
node tools/probe-param.mjs
node tools/e2e-ui.mjs
node tools/e2e-rtl.mjs   # #75 P0 浏览器冒烟 9 项（需真实 Edge，非沙箱执行）
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
3. 在面板查看版本号，确认不是旧副本。
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

---

## 8. 如果你不确定

1. 先查 `06-PITFALLS.md`。
2. 再查 `07-DECISIONS.md`。
3. 最后查 `memory/logs/`。
4. 仍不确定时，优先保守：**不改动 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填**。

---

## 9. 本轮遗留

- 无功能阻塞。#76 Verdi P1（点变量加波形 / 双向跳转 / 信号组入 `.wp`）为下一主线。
- 2026-09-09 第五轮完成 Verdi 功能规划（①查看波形 ②添加信号 ③top→例化模块源码 + 其它好用功能）的
  真实语义研究 + WavePaint 差距拆解，登记 #83~#87（03 表 H / 04 §4.5 / 当日日志第五轮）。**纯规划未动
  代码**；实现前先与用户确认范围，落地顺序建议 #85 → #86 → #84。
- #81 已验证：regression 58/58、probe-param、e2e-sim 0 失败、probe-tutorial/addbtn/simfail
  全过、真 exe 冒烟通过；exe 已按 C1 重建并核验 5 个特征串
  （`simAutoRetried`/`wavepaint_tutorial_done`/`wp-tutorial-highlight`/`probeServerAlive`/
  `SIM_REQUEST_TIMEOUT_MS`）。
- #82 已验证：真机死窗口 5→1（`CLOSE-LEGACY 5 window(s)`）、新实例端到端仿真、真实窗口
  UIA 点击 RUN→RESULT、regression 58/58、e2e-sim 0 失败；exe 已按 C1 重建并核验特征串。
- 交付提醒升级：先 `taskkill /F /IM WavePaintClean.exe`（或任务管理器结束）再启动；
  若桌面又出现多个同名窗口 = 仍在用旧 exe。
