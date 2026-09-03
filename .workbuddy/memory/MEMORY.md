# WavePaintSim 长期记忆（项目约定与必须记住的坑）

## 一、构建：三个必须知道的坑

### 1. `build.ps1` 必须带 UTF-8 BOM ⚠
- 文件是 UTF-8。**无 BOM 时 Windows 的 PS 5.1 会按系统 ANSI(GBK) 解码**，
  中文的 UTF-8 多字节序列被错判为 GBK 双字节字符，会破坏引号/括号/换行结构，
  报 `字符串缺少终止符` / `语句块或类型定义中缺少右 }`，**构建直接不执行**。
- 2026-08-31 实测：新增含中文的行后即触发；原版文件因字节组合恰好不错位而侥幸可解析
  （属潜在隐患，不是"原版没问题"）。**加 BOM 后 PS 5.1 / PS 7 均正确解析。**
- 结论：以后所有改动 `build.ps1` 后，确认 BOM 仍在（`head -c 3 | od -An -tx1` 应为 `ef bb bf`）。

### 2. 编译器失败码（2026-09-03 已修，commit 50fafd3）
- 旧脚本只在末尾 `Write-Host "csc exit: $LASTEXITCODE"`，失败时**外层仍 exit 0**（"假成功"）。
- 现已改：csc 非零即 `throw`；产物缺失 throw；**产物时间戳未刷新会打印 WARNING**。
- 同一提交还把产物路径改成 `Join-Path $PSScriptRoot "WavePaintClean.exe"`（绝对路径），
  彻底杜绝 cwd 漂移把 exe 写到别的目录（历史事故见第十节）。
- 排查仍建议把输出重定向到日志再读（PowerShell 工具 stdout 可能整会话失效，见第十节）。

### 3. exe 内嵌 JS 资源，改了 JS 必须重建
- `WavePaintLauncher.cs:ExtractResources` 把 js/css/img/lib 内嵌进 exe，
  每次启动 `Directory.Delete(root,true)` 后重新解压到 `%TEMP%/WavePaintSim_<user>/`。
- **只改磁盘文件不重建 exe = 用户看到的还是旧代码。**
- 验证新代码是否真的进 exe：`grep -ac "新代码里的独特字符串" WavePaintClean.exe`

## 二、仿真链路：改动禁区

- 链路：画布 → `readWaveDocument` → `buildAutoTestbench` → iverilog+vvp → VCD → `vcdToProjectOutputs`
- `js/sim-bridge.js` 是**最易碎**的文件。做 UI / feature 类需求时**优先不动它**；
  只要不碰它，`e2e-sim.mjs` 就能守住"仿真没坏"这条底线。
- ⛔ **绝不要做"生成时翻转 + 采样时再翻转"的时钟双写逻辑**
  （2026-08-31 第五轮因此把仿真搞崩：时钟沿丢失 → DUT 无时钟 → 输出恒 0/x，已回退）。
- ⛔ 不要用 `isAlternating` 之类脆弱启发式去猜信号语义（会把真实交替的数据信号误判为时钟）。
- 时钟激励保持**主步级 0101**（第四轮 P1 的 `createPortStimulus` 是单一真相源，已验证可用）。

## 三、数据模型

- `m_sampleCount`=主步数，`m_subStepCount`=子步；`stride = 子步 + 1`；
  `sig.values` 长度 = `主步数 × (子步+1)`。
- 整步写入 = 写满该主步的 stride 个下标；子步写入 = 只写命中下标。
- ⚠ stride 口径不一致曾导致"仿真结果恒为 0"（第四轮已修），**别再动这个口径**，
  除非重跑全量回归。
- ⚠ **双 divisor 模型（2026-09-03 框选根治定论）**：单信号可带私有 subSteps（`divisorOf(sig)=
  (sig.subSteps>0)? own+1 : stride()`），同行 sampleIndex 跨行含义不同。选框/端点一律用
  **globalSampleIndex**（x 决定）；行内写入统一经 **wpf.cellsInRange(sig,lo,hi)**（main-step
  float 中转+夹取）；粒度收敛用 `divisorOf(sig)`，勿用全局 stride。详细见 2026-09-03.md。

## 四、验证门槛（缺一不可）

| 命令 | 用途 | 期望 |
|---|---|---|
| `node tools/regression.mjs` | 逻辑/快照（不跑真实仿真） | 35/35（新增用例后对应数量全过） |
| `node tools/e2e-sim.mjs` | 真跑 iverilog，验证仿真链路 | 失败 0 项 |
| `node --check <js>` | 语法检查（防浏览器整段加载失败） | OK |
| **浏览器实操** | UI 类改动（Bug A/C/D 等） | 必须真点一遍，不能只改 CSS 就提交 |

- UI 改动我（AI）无法在本环境用浏览器实测，**必须明确告诉用户需人工验收**。

## 五、主题

- 主题 = `body.dark` class；CSS `:root` 默认即浅色，深色只是覆盖。
- 默认浅色由 `feature-common.js` 启动时 `applyTheme('light')` **只干预一次**
  （`localStorage: wpf.defaultLightThemeApplied`），尊重用户后续选择。
- `WavePaintSkins`（Black/Sunset/Forest）只影响波形颜色，与背景无关。

## 六、其它约定

- 仓库根是父仓库 `D:/Files/Code/波形/`（git root 也是它）。**合并后的主项目是 `WavePaintClean/`**
  （解混淆核心 + 分层 js/），其余未跟踪目录/内容不碰。git 提交只 add WavePaintClean 下路径。
- `WavePaintClean.exe` 是构建产物，**不要提交回 git**；构建前 `taskkill /F /IM WavePaintClean.exe`。
- 应用跑在 **HTTP**（启动器的 HttpListener，127.0.0.1），不是 file://，
  所以 `<script type="module">` 能正常加载（不存在 file:// 的 CORS 问题）。

## 七、进制/标签与弹窗的正确姿势（Phase-3 定论，2026-09-02）

- **标签唯一实现 = 核心 `WaveDocument.valueToLabel`**（已改入 wavepaint.clean.js）：
  位串按位宽换算 + 去 0x/0b 前缀，x/z 位串→X/Z，-1→X，数字值按 radix.toString。
  外部一律 `wpf.valueLabel(value, radix?)` 转发，**不要再写第二个换算实现**。
- **弹窗唯一入口 = `__core.prompt`** → 核心 `wpQuickPrompt`（回车/有值失焦=提交、
  空值失焦/Esc/X/遮罩=取消、非法输入红框重开）。外部模块不碰弹窗 DOM。
- `wpf.refreshBusLabels` 保留，职责只剩「按信号自身 radix 批量重算」（没有 radix 才退回
  全局）——「右键给单个信号切进制」靠它生效。⚠ 反例（2026-08-31 踩过）：只读全局进制。
- **已删除**（勿再引入）：patchCoreValueToLabel 原型补丁、localFormatVector/busRadixLabel
  内联换算、zh.js DOM 汉化、MutationObserver 弹窗抑制器、value-input 自驱弹窗 DOM、
  step-commit 补丁（`js/patch/` 目录整体清零，spin 已由核心绑 change 提交）。
- **核心右键菜单自带进制转换项**：不自绘、不注入（用户否决过）。混淆字符串是拆分的，
  grep 用片段法；验证进制用 ≥10 的值（255→FF）；**媒体查询里的 CSS 规则也要查**。

## 八、磁盘与验证（2026-09-02 新坑）

- ⚠ **C 盘曾 0GB 满盘（三次，2026-09-03 又犯）**：
  ① Edge headless `--user-data-dir` 指 C 盘 Temp → 滚到 400MB+；
  ② **即使 profile 在 D 盘，headless Edge 组件更新器仍写 C 盘 %TEMP%**
  （`msedge_url_fetcher_*` 150MB+/次 + edge-cdp/core/diag 各 ~30MB）→ e2e-ui 卡死。
  ③ 2026-09-03 新元凶：`%TEMP%\workbuddy-update-x64`(463MB)、`WaveWorkbench_build`(155MB)、
  `wavepaint-ivl-cache`(75MB)、`CrashDumps`(59MB)。**C 盘 0MB 时命令输出捕获全 ENOSPC**
  （exit 0 但无 stdout），exe launcher 静默挂起不产 port 文件 → 先把这些目录清掉。
  **对策（e2e-ui/exe-smoke 已内置）**：Edge 加 `--disable-component-update`；
  spawn env 把 TEMP/TMP/TMPDIR 指到 D 盘；**所有临时产物统一 `D:/Files/Code/波形/.e2e-tmp/`**
  （.git/info/exclude 已本地排除）。别再让 Edge 碰 C 盘。
- **node 沙箱拦 rmSync 递归删大目录**（SAFE_DELETE_BULK_CONFIRM_REQUIRED，>50 文件抛错）：
  e2e 脚本用**唯一 profile 名**（edge-prompt-<Date.now()>）每次全新，不在 node 里删大目录；
  历史 profile 事后用 Bash `rm -rf .e2e-tmp` 清。
- **后台 PowerShell 跑 `.\build.ps1` 会落错目录**（cwd 漂移 → 解析到 WavePaintSim 旧脚本，
  产物变 WavePaint.exe 且 exit 仍 0）→ 用 Set-Location + **绝对路径**调 build.ps1，
  产物名/时间戳不符即怀疑跑错目录。
- exe 端口/解压目录仍写 %TEMP%（launcher 行为）：跑 exe 冒烟前先删旧
  `WavePaintClean_port_*.txt`，读端口用**最新**文件（`ls -t | head -1`，勿 sort().pop()），
  测完清 WavePaintClean_* 与进程。
- ⚠ **exe-smoke 必须一条命令完成（60s 时序坑）**：launcher 无窗口时 ~60s 无页面心跳即退出。
  「启动 exe + 立即跑 smoke」放同一命令（先 taskkill 旧实例 → 删 port 文件 → 启动 → 等
  port 文件 ≤15s → smoke → taskkill），页面心跳会在 60s 内接管保活。exe 单实例：若旧实例
  未杀，新启动会走 OpenExistingInstance 直接退出不写 port 文件。
- 端口匹配（engine.js matchSignalsToPorts，2026-09-03 修）：精确匹配两级（原始名优先 +
  归一化名仅唯一未占用时）；claimed 一对一贯穿两轮；fuzzy 三重约束（单字符/长度比/最相似）。
  改归一化或匹配规则必须重跑 regression + e2e-sim 并重建 exe。
- 回归门槛（WavePaintClean/tools）：regression.mjs（35 项）→ e2e-sim.mjs（真实 iverilog）
  → e2e-ui.mjs（真实 Edge **35 项**：A–D 源码级 valueToLabel/进制/弹窗流 + spin 提交 +
  **E 组框选回归**：整步/子步粒度、反向拖动、跨私有 divisor 行写入零越界、vector 'A'→10、
  稳定性三连拖+输入框半输入不误提交、Esc 清理）→ exe-smoke.mjs（真实 exe 汉化冒烟）。
  UI 改动仍需用户人工验收。
- ⚠ **沙箱回收后台 GUI exe**：从 bash 沙箱里 `./WavePaintClean.exe &`，命令结束后进程会被
  回收 → 端口文件在但服务秒死、exe-smoke 连不上（不是产品 bug）。**exe 冒烟/保活验证必须
  用非沙箱方式启动 exe 并保持存活**再跑 exe-smoke.mjs。
- ⚠ **PowerShell 工具的 stdout 捕获会整会话失效**（exit 0 但完全无输出，且**不是** C 盘满导致；
  2026-09-03 22:40 起持续复现）→ 一律用「把结果写到 D 盘文件，再用 Read 读」的旁路，
  不要据此误判命令失败。Bash 工具捕获正常，可交叉验证。
- 服务保活定论（2026-09-03）：页面 `js/core/heartbeat.js` 每 2s 打 `api/ping` → launcher
  `lastActivity` 持续刷新 → 退出判据 `gone>24 && idle>20000` 只在页面真关（心跳停）后触发；
  dev-server.mjs 也带同款 /api/ping。改这两个文件任一处都需 rebuild exe。

## 九、交付 exe 的硬性流程（2026-09-03 血泪定论）

- ⚠ **用户默认双击的是 `WavePaintSim\WavePaintClean.exe`，而正确产物是
  `WavePaintClean\WavePaintClean.exe`——同名、隔壁目录。** 2026-09-03 用户报告「五个 bug
  全没修好」，实际是启动了 9-02 的旧副本（grep 修复特征串命中 0）。
- 每次交付 exe 前必须按顺序做：
  1. 重建（绝对路径调 `build.ps1`，用 PowerShell 工具；`taskkill` 已授权直接执行）；
  2. **grep 本次修复的独特字符串**确认代码真进了这个 exe（别只信时间戳）；
  3. `find /d/Files -iname "WavePaint*.exe"` **确认没有同名旧副本**；有就问用户是否隔离
     （用户本次选择重命名为 `*.stale-<date>`，可逆、不删数据）；
  4. 回复里给出**唯一绝对路径**并提醒「重启应用、必须从该路径启动」。
- 用户报 bug 但自己测出全绿时，**先怀疑启动路径/旧副本，不要急着改代码**。

## 十、用户长期约定（2026-09-01 确认，所有 AI 照此执行）

- **构建前直接结束主项目进程，无需再向用户确认**：
  `taskkill /F /IM WavePaintClean.exe`（若旧版仍在则也杀 WavePaint.exe）。
  Git Bash 里参数是 `/F /IM`（单斜杠），`//F //IM` 会报错。
  用户原话：「永远都是直接结束进程并构建，并将其写入记忆，其他 AI 也照此执行」。
  这也意味着**用户可能正在用旧 exe 测试**，构建/交付后务必提醒重启应用。
