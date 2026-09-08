# WavePaint 项目总纲（跨 AI · 跨对话 · 单一真相源）

> **本文件是项目的最高层总纲**：项目介绍、思路、做法、全部约束与对应操作、
> 完整功能需求台账（含历史）、路线图、进行中任务交接。任何 AI 新开对话
> **先完整读本文件**，再按需查阅：
> - `.workbuddy/memory/MEMORY.md` —— 铁律细节速查（与本文件第四章互补）
> - `.workbuddy/memory/REQUIREMENTS.md` —— 需求台账明细（与本文件第五章同源）
> - `.workbuddy/memory/2026-08-30.md` ~ 当日日志 —— 逐日流水账
> - `docs/00_功能总览.md`、`docs/03_代码与目录规范.md` —— 现行技术文档（旧文档在 `docs/attic/`）
>
> **维护规则（铁律级）**：每次修改代码/完成/放弃任何任务，必须同步更新本文件
> 第六章（进行中）与第五章（状态标记），并 commit。这是项目本身的硬性要求。

---

## 一、项目介绍

**WavePaint** 是一款 Windows 桌面软件：**手绘波形替代手写 Testbench 的 Verilog 仿真工具**。
用户在画布上用画笔/框选/生成器绘制数字波形 → 软件自动生成 testbench → 调用内嵌的
iverilog 编译仿真 → VCD 结果回填画布对照查看。目标用户是 RTL 学习者与中小型设计者，
核心卖点是**零门槛（双击即用、自包含 iverilog）+ 手绘直觉 + 代码↔波形联动**。

- 仓库：`https://github.com/2909369292/WavePaintSim`，默认分支 `main`，仓库根即项目本体。
- 交付物：`D:\Files\Code\波形\WavePaintClean.exe`（22MB，自包含：资源 + iverilog + 本地 HTTP 服务 + Edge 应用窗口）。
- 技术栈：解混淆还原的核心引擎（js/wavepaint.clean.js，33K 行，顶层全局作用域）
  + editor/core/sim 分层模块 + C# 启动器（WavePaintLauncher.cs，HttpListener）+ build.ps1（csc 内嵌打包）。
- 仿真后端：**iverilog+vvp**（ivl.zip 便携包内嵌）。选型结论见第七章：VCS 等商业仿真器
  不可用（许可+Linux-only），Verilator 为远期可选，iverilog 保持为主后端。

## 二、项目思路（演进史，读历史决策必看）

| 阶段 | 时间 | 关键决策 |
|---|---|---|
| 1. 混淆核心 + 外挂 | 08-30 前 | 原始产品为混淆发布的 js；功能扩展靠 feature-*.js 外挂 + hack（合成事件框选、MutationObserver 弹窗抑制等 6 类 hack） |
| 2. 解混淆 | 09-01 | `tools/deobfuscate.mjs` 三阶段还原 19090 处字符串 → 33K 行 clean.js，像素级 UI 一致验证；**决策：直接维护还原代码，不再外挂** |
| 3. 重构收编 | 09-02 | Phase0~4：`__core` 官方桥接、editor/sim/core 目录化、6 类 hack 全部清除或下沉核心补丁段 `[PATCH-A*]` |
| 4. 正确性收口 | 09-03~04 | 私有 divisor 模型（信号可带独立 subSteps）、值解析唯一入口 wpf.parseValue、launcher 自愈、五类历史回归根治 |
| 5. 功能增强 + Verdi 路线 | 09-04~ | 文件菜单复活（.wp 工程存取）、实时预览、DUT 内部信号回显、顶层模块选择、版本显示；**下一大步 = Verdi 式代码↔波形联动（第七章路线图）** |

用户对工具的定位（原话要旨）：**核心目的 = 手绘波形替代编写 TB 做 RTL 仿真，支持多模块、
模块间调用、多文件等复杂功能**。用户已确认：接受 exe 增大几 MB 上 Monaco（最强方案）；
外接 VSCode 扩展作为备选；"body" 即指 Verdi（Novas）。

## 三、架构与数据模型（改代码前必读）

### 3.1 模块职责（js/ 分层）

```
js/wavepaint.clean.js   核心引擎（还原自混淆，行为=原版+补丁段 [PATCH-A*]；顶层全局作用域）
js/core/__core.js       官方桥接（state 快照/selection/prompt/ready）
js/core/wpf.js          共享层（坐标换算 divisorOf/cellsInRange、parseValue 唯一解析、undo、openFormDialog）
js/core/heartbeat.js    页面→launcher 心跳（Web Worker 计时，防后台节流）
js/editor/*.js          画布编辑域：draw/value-input/selection/resize/shortcuts/measure/generator/templates/file-menu
js/sim/engine.js        仿真纯逻辑（RTL 解析/端口匹配/TB 生成/VCD 解析/回填）★最易碎
js/sim/ui-bridge.js     仿真面板（多文件/解析/TB/运行/回显注入）
js/sim/project-model.js 值格式化（normalizeVectorValue/formatVectorValue）+ 工程模型（预留）
WavePaintLauncher.cs    C# 壳：解压资源→HttpListener(/api/sim|ping|snapshot|version.txt)→Edge app→自愈保活
build.ps1 / gen-resources.mjs  打包（资源清单→csc 内嵌）
tools/  regression.mjs(46+) / e2e-sim.mjs(真 iverilog) / e2e-ui.mjs(真 Edge 35 项) / exe-smoke.mjs / probe-core.mjs / probe-param.mjs(参数化端到端) / dev-server.mjs / deobfuscate.mjs
```

### 3.2 数据模型口径（⚠ 破坏即仿真崩坏，历史上多次踩坑）

- `m_sampleCount`=主步数，`m_subStepCount`=全局子步数；**stride = 子步数+1**（子步 0 合法）；
  `sig.values` 长度 = 主步数 × divisor。
- **私有 divisor 模型**：信号可带私有 `sig.subSteps`（divisor=own+1，不随全局变）。
  一切换算只准走 `wpf.divisorOf(sig)` / `wpf.stride()`，**严禁手写 `(m_subStepCount||1)+1`**（已两度致错）。
- 选区端点 = 全局子步空间下标；行内写入一律经 `wpf.cellsInRange(sig,lo,hi)`（主步坐标中转）。
- 值解析唯一入口 `wpf.parseValue(raw,sig)`：dec 下 `10` 是数值；hex 进制数字串按 16 进制；
  bin 下 0/1 串是位串；含 x/z → 位串；裸 hex 全串校验。Bit 只认单字符 1/0/x/z/u/d。
- 弹窗唯一入口 `__core.prompt`（预览钩子 onPreview 见 value-input）；undo 唯一入口
  `wpf.pushUndoSnapshot()/wpf.undo()/wpf.redo()`（= document_wave API）。
- 时钟激励 = 主步级 0101（`createPortStimulus` 单一真相源）；1 位信号 TB 逐格分数时间驱动，
  时间基准 = 信号自身 `cellStride`。
- ⛔ 永久禁区：时钟「生成翻转+采样再翻转」双写；`isAlternating` 类启发式猜信号语义。

## 四、项目约束与对应做法（C1~C18，逐条照做）

| # | 约束 | 对应做法（SOP） |
|---|---|---|
| C1 | 改任何会被内嵌 exe 的代码（js/、index.html、css/、img/、lib/、WavePaintLauncher.cs、build.ps1）→ 必须重建 exe | `taskkill /F /IM WavePaintClean.exe`（Git Bash 单斜杠）→ 绝对路径调 `powershell -NoProfile -Command "Set-Location -LiteralPath 'D:\Files\Code\波形'; .\build.ps1"` → 确认 csc exit 0 + 时间戳刷新 |
| C2 | 任何改动 → git commit + push main | 每个逻辑批次一个 commit（用户要求可随意增减/回退），message 写清动机+验证结果 |
| C3 | 提交前全量验证 | `node --check`（所有改过的 js）→ `node tools/regression.mjs`（46+，须全绿）→ `node tools/e2e-sim.mjs`（真 iverilog，0 失败）→ UI 改动另跑 `node tools/e2e-ui.mjs`（真 Edge 35 项）→ exe 改动跑 `node tools/exe-smoke.mjs` |
| C4 | 交付 exe 后提醒用户 | 给唯一绝对路径 + 「重启应用、必须从该路径启动」+ 让用户对照面板上的版本号自查（v0.4.0 build 时间 git哈希） |
| C5 | 用户报 bug 但本地全绿 → 先怀疑旧 exe 副本 | grep 修复特征串在 exe 中命中数；`find /d/Files -iname "WavePaint*.exe"` 找同名副本；勿急着改代码 |
| C6 | 删除/隔离必须可恢复 | 死文件/旧副本 → `D:/Files/Code/.trash-<日期>/` 或 `*.stale-<日期>` 重命名，不裸删 |
| C7 | build.ps1 必须带 UTF-8 BOM | 改完 `head -c 3 build.ps1` 应为 `ef bb bf`；无 BOM 时 PS5.1 按 GBK 解码直接构建失败 |
| C8 | exe 内嵌资源，磁盘改动≠exe 更新 | 验证新代码是否进 exe：`grep -ac "新代码独特字符串" WavePaintClean.exe` |
| C9 | 仿真链路（engine.js 的 matchSignalsToPorts / createPortStimulus / stride 口径 / VCD 回填）是最易碎区 | 能不动就不动；动了必须 regression + e2e-sim + 重建 exe 三连 |
| C10 | 弹窗/值解析/坐标换算唯一入口 | 见 3.2；新功能禁止自建 modal、自写解析、手推 stride |
| C11 | 核心按【英文文本】绑定老菜单；我们按【中文文本】在 file-menu.js 重绑 | 改 index.html 菜单文案必须同步 file-menu.js 的 handlers 表 |
| C12 | 「新建」必须就地重置 document_wave | 核心内部词法引用无法从外部更新；禁止 `window.document_wave = new WaveDocument()` 换对象（身份撕裂） |
| C13 | PowerShell 工具 stdout 捕获可能整会话失效 | 一律「结果写 D 盘文件再 Read」旁路；Bash 工具正常可交叉验证 |
| C14 | C 盘多次 0GB 满盘（临时目录元凶） | 先查 C 盘空间；清 `%TEMP%` 的 workbuddy-update-x64/WaveWorkbench_build/wavepaint-ivl-cache/CrashDumps |
| C15 | exe 冒烟必须一条命令完成（60s 心跳时序） | 启动 exe + 等 port 文件 ≤15s + smoke + taskkill 放同一条命令；port 文件读最新（`ls -t | head -1`） |
| C16 | 沙箱会回收后台 GUI exe | exe 冒烟/保活验证用非沙箱方式启动（Bash 工具 dangerouslyDisableSandbox） |
| C17 | 每次改代码后必须更新跨 AI 文档 | 更新本文件第六章状态 + REQUIREMENTS.md 对应行 + 当日日志，随代码同一 commit |
| C18 | 版本可自查 | build.ps1 自动生成 version.txt（v主版本+时间+git短哈希）；发版时手动升 build.ps1 里的主版本号 |

## 五、功能需求台账（汇总；明细见 REQUIREMENTS.md）

状态：✅已完成 / 🔧进行中 / ⬜未开始。历史需求 #1~#58 为 08-30~09-04 上午完成（明细查
REQUIREMENTS.md A~E 组），此处列结论；#59 起为本仓库根时期的批次化工作。

### A. 已完成的历史功能（#1~#72，全部 ✅，摘要）

- **功能**：常见信号预填典型波形；unbound 端口中文诊断；默认浅色主题；总线值输入/进制右键/标签修正；
  时钟子步跟随；位值输入弹窗；写入粒度统一（整步/子步）；交互统一+撤销；输入预览/进制联动/非法红框；
  波形生成器（正弦/三角/锯齿 50% 阈值电平/随机/毛刺时钟）；协议模板（SPI/I2C/UART 8N1）；
  步数智能自适应 resize；快捷键绘制；框选批量（设1/0/x/翻转/输值）；测量光标 A/B/Δ；
  私有 divisor 全链路；**.wp 工程保存/打开/分享链接（file-menu.js 复活死菜单）**；
  **R6 输入实时预览（核心弹窗 onPreview 钩子）**；**任意工具 Ctrl+C/V/X**；
  **DUT 内部信号回显（tb.dut 层次）**；**多文件 + 顶层模块选择器**；版本显示
- **Bug 修复**：侧边栏收起/展开/重设计；任务栏图标；二次仿真失败；拖动漏格；多 bit 写值变 0
  （去 width 幽灵，parseValue 唯一入口）；fuzzy 端口误配；服务掉线（心跳+自愈）；框选稳定性
  （NotFoundError 根治）；启动旧副本问题（绝对路径构建+失败传播+版本显示）
- **治理**：解混淆+重构 Phase0~4；js 目录化；6 类 hack 清零；死代码清理；docs/attic 归档；
  跨 AI 记忆体系（MEMORY/REQUIREMENTS/日志）；每批次独立 commit 可回退

### B. 当前批次（#59~#74，2026-09-04~09-08）

| ID | 需求 | 状态 | 备注 |
|----|------|------|------|
| #59~#72 | 批次1~10（私有divisor/值解析/交互/仿真解析/launcher自愈/清理/文件菜单/预览/CtrlCV/DUT回显/顶层选择/版本） | ✅ | 9 个 commit 已推送（fc0b61b…4530721），回归 46 项+e2e 全绿 |
| #73 | **参数化位宽完整支持**：求值器升级（递归参数/$clog2/移位/sized字面量）+ TB 内嵌参数定义（iverilog 裁决位宽）+ fmtWidth 兜底 + parametric 端口可绑矢量 | 🔧 **代码已完成且经真 iverilog 端到端验证（tools/probe-param.mjs 三用例全过），但 regression 有 2 条测试断言未对齐 → 见第六章交接** | 涉及 js/sim/engine.js、tools/regression.mjs |
| #74 | 跨 AI 总纲文档（本文件） | ✅ | 维护规则见文件头 |

## 六、⚠ 进行中 / 待交接（下一个 AI 从这里开始）

### 6.1 【交接任务】#73 parameter 修复收尾（预计 30 分钟）

**背景**：用户报告 parameter 位宽运算问题。定位结论：**iverilog 没有问题，是我们 TB 生成侧
的表达式求值器局限**（旧版只支持一层参数代入，嵌套参数/$clog2/移位/sized 字面量全回退 1 位）。
代码修复已实现并经**真实 iverilog 编译运行验证**（`node tools/probe-param.mjs` 三用例全过：
嵌套参数/$clog2/sized 字面量的 TB 均编译运行成功出 VCD）。

**已完成**（未提交，在工作区）：
- `js/sim/engine.js`：tryEvalExpr 重写（递归参数展开 8 层防循环、$clog2、`<< >>`、
  sized 字面量循环归约）；resolvePortWidths 失败时保留原始表达式+parametric 标记；
  buildAutoTestbench 内嵌 `parameter` 定义进 TB + 参数化端口拼接原始表达式声明
  （rangeResolvable 校验标识符全部有定义才拼，否则回退标量）；
  fmtWidth=max(端口宽,信号宽) 兜底激励格式化；widthCompatible 对 parametric 端口不设限
- `tools/regression.mjs`：新增 4 组用例
- `tools/probe-param.mjs`：新增（真 iverilog 端到端探针，保留为长期工具）

**待办（按序）**：
1. `node tools/regression.mjs` → 当前红 2 条，**均为测试断言过时/笔误，非功能问题**：
   a. 旧用例「parameter 代入求值成具体位宽，TB 不出现参数名」断言 `!/WIDTH/` —— 已过时：
      现在 TB **合法地**内嵌 `parameter WIDTH = 8;` 定义。改为断言参数定义存在 + din 为 [7:0]。
   b. 新用例「TB 内嵌参数定义…」断言 `/\[9:0\]\s*(reg|wire)\s+addr/` —— 正则把顺序写反了，
      实际输出是 `reg [9:0] addr;`（关键字在前）。改为 `/(reg|wire)\s+\[(?:9:0|AW-1:0)\]\s+addr/`。
2. 跑 `node tools/e2e-sim.mjs`（0 失败）→ `node --check js/sim/engine.js`。
3. 重建 exe（C1 流程）+ commit（写明 #73 完成）+ push。
4. 更新本文件：#73 状态 → ✅，第六章本节删除；更新 REQUIREMENTS.md #73 行。

### 6.2 【路线图主线】Verdi 借鉴：代码↔波形联动（已 review 待开工）

需求（用户点名）：① Verilog 代码查看器（点变量→加波形，像 Verdi/Novas）；
② 打开 top 自动生成例化调用 RTL Tree；③ 其他 Verdi 波形/代码功能借鉴。
结论：**全部可行，地基已有 70%**（engine 已解析 instances 与 VCD 层次路径）。

| 期 | 内容 | 状态 |
|---|---|---|
| P0 | CodeMirror 6 内嵌代码视图（预打包单文件入 lib/，esbuild 一次性构建）+ module 行区间映射 + VCD 全路径索引 + RTL Tree 面板（数据已有） | ⬜ |
| P1 | 点变量→加波形（module归属→层次路径→VCD查找→注入，复用 toNativeSignal；多实例歧义选择器；未 dump 提示）+ 树↔代码双向跳转 + 信号组存入 .wp 工程 | ⬜ |
| P2 | Active Annotation（波形游标时刻→代码行内标值）；driver/load 行高亮（启发式 80%） | ⬜ |
| P3 | X 首现追溯；两次仿真 diff；VSCode 外接扩展（复用 launcher HTTP /api，扩展读 %TEMP%/WavePaintClean_port_*.txt 得端口 POST /api/add-signal） | ⬜ 备选 |

决策记录：代码查看器选 **Monaco 亦可（用户接受 +4MB）**，但首选仍是 CodeMirror 6
（性价比）；若用户明确要 VSCode 级多文件体验，P0 换 Monaco（monaco-verilog 语言包）。
开源借鉴清单：**Verible**（Google，符号/格式化，有 WASM web demo 可借鉴解析精度方案）、
**TerosHDL**（VSCode 全家桶：项目管理/FSM viewer，借鉴交互组织）、
**mshr-h/vscode-verilog-hdl-support**（模块树/文档符号，借鉴 RTL Tree 交互）、
**Surfer**（Rust 现代波形查看器，借鉴层次树/值格式化/会话）、**GTKWave**（测量/标记传统）、
**WaveTrace**（VSCode 波形扩展，借鉴"编辑器内嵌波形"布局）。

## 七、仿真器与工具链选型（调研结论）

- **VCS / Questa / Xcelium**：Verdi 的标配搭档是 VCS，但均为商业许可 + Linux-only，
  **不可内嵌分发**，本项目不可用。
- **iverilog**（现状）：开源、Windows 可用、事件级仿真语义与手绘波形模型匹配，**保持主后端**。
- **Verilator**：开源可编译为 Windows；5.x 有 --timing 支持延迟，但语义为周期级，
  与逐格事件驱动口径有差异；作远期可选第二后端（架构上 /api/sim 已隔离后端，可扩展）。
- 结论：parameter 位宽问题的正确解法是**把位宽算术交给 iverilog**（已实现，见 6.1），
  而不是换仿真器。

## 八、注意事项（高频坑速查）

1. Git Bash 下 taskkill 参数是单斜杠 `/F /IM`。
2. 中文路径 git 操作用 `git -c core.quotepath=false`。
3. e2e-ui 需要真实 Edge；C 盘满会卡死其组件更新（C14）。
4. version.txt 用 `Set-Content -Encoding UTF8` 会带 BOM → 已改 `[IO.File]::WriteAllText` 无 BOM。
5. 空残留目录 `D:/Files/Code/波形/WavePaintSim` 因会话 cwd 占用删不掉，无害，可手动 rmdir。
6. 回归规模随功能增长：当前 46 项（#73 收尾后应 50 项）。
7. 需求/文档同步铁律见 C17——**代码与文档必须同一 commit**。

## 九、跨 AI 工作流（接手 SOP）

1. 读本文件全文 → 6.1 交接任务 → MEMORY.md 铁律 → （按需）当日日志与 docs/。
2. 任何任务：先在本文件第六章登记「进行中」→ 按 C3 验证 → commit（代码+文档同 commit）
   → 完成后改状态为 ✅ 并 push。
3. 发现新坑 → 写进第八章 + 当日日志；新需求 → REQUIREMENTS.md 追加编号并同步第五章。
4. 不要重做的事：解混淆、Phase 重构、批次1~10（全部 ✅）；不要违反 3.2 口径与 C9 禁区。

---
*最后更新：2026-09-08（创建）。维护者：任何接手的 AI。*
