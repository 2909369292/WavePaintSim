# WavePaint 项目长期记忆（重要记忆总纲 · 跨 AI 通用）

> 本文件是项目最重要的记忆入口。任何 AI 新开对话都应先读本文件，再按需读
> `REQUIREMENTS.md`（需求清单）与 `2026-08-30.md`~`2026-09-04.md`（每日日志）、`docs/`（设计/重构细节）。
> 本文件自包含：关键信息不用跳读也能承接项目。

## 〇、项目定位（先读这一段）

- **WavePaint 是一款普通软件**：Windows 波形编辑 + Verilog 仿真工具。对终端用户**不强调**其代码来源。
- **核心引擎 `js/wavepaint.clean.js` 由早期混淆发布的代码还原（de-obfuscate）得到**——这是
  **开发内部事实**，只记在此记忆 / 日志 / `docs/`，**不出现在软件 UI 与 README 正文强调**（用户明确要求）。
- 仓库根 `D:/Files/Code/波形/` **即项目本体**（无子项目目录）。GitHub 仓库 `2909369292/WavePaintSim`，
  默认分支 `main`，已强推为干净项目；tags `v0.1.0`/`v0.2.0` 保留，**暂未发新 release**。
- 产品 exe 文件名固定为 `WavePaintClean.exe`（用户要求不改文件名/变量名）。

## 一、用户的硬性特殊需求（每次改动必须照做）⚠

1. **改任意会被嵌入 exe 的代码后 → 必须重建 exe 并同步 git**：
   - 凡改动 `js/`、`index.html`、`css/`、`img/`、`lib/`、`WavePaintLauncher.cs` 等会被
     `build.ps1` 内嵌进 `WavePaintClean.exe` 的文件，**必须**重跑 `.\build.ps1` 重建 exe，
     **且必须** `git commit` 并 `git push` 到 `main`（用户原话：每次改动代码后都要重建 exe 并更新 git）。
   - 仅改 `README.md` / `docs/` / `.workbuddy/memory/` 等**不参与打包**的文件，不需重建 exe，但仍应提交 git。
2. **构建前直接结束正在运行的进程，无需向用户确认**：
   `taskkill /F /IM WavePaintClean.exe`（旧版也叫 `WavePaint.exe` 则一并杀）。
   Git Bash 里参数是 `/F /IM`（单斜杠），`//F //IM` 会报错。
   用户原话：「永远都是直接结束进程并构建，并将其写入记忆，其他 AI 也照此执行」。
3. **交付 exe 后提醒用户**：重启应用、必须从唯一正确路径启动（防误启旧副本）。
4. **用户报 bug 但本地全绿时，先怀疑启动路径 / 旧 exe 副本，不要急着改代码**。

## 二、构建：三个必须知道的坑

### 1. `build.ps1` 必须带 UTF-8 BOM ⚠
- 无 BOM 时 Windows PS 5.1 按系统 ANSI(GBK) 解码，中文 UTF-8 多字节被错判为 GBK 双字节，
  破坏引号/括号/换行，报 `字符串缺少终止符` / `语句块或类型定义中缺少右 }`，**构建直接不执行**。
- 改完 `build.ps1` 后确认 BOM 仍在（`head -c 3 | od -An -tx1` 应为 `ef bb bf`）。

### 2. 编译器失败码（commit 50fafd3 已修）
- 旧脚本只在末尾 `Write-Host` 退出码，失败时外层仍 exit 0（"假成功"）。
- 现已改：csc 非零即 `throw`；产物缺失 throw；产物时间戳未刷新打印 WARNING。
- 产物路径用 `Join-Path $PSScriptRoot "WavePaintClean.exe"`（绝对路径），杜绝 cwd 漂移写错目录。

### 3. exe 内嵌资源，改了被嵌入的文件必须重建
- `WavePaintLauncher.cs:ExtractResources` 把 `js/css/img/lib` + `index.html` 内嵌进 exe，
  每次启动 `Directory.Delete(root,true)` 后重新解压到 `%TEMP%/WavePaintClean_<user>/`。
- **只改磁盘文件不重建 exe = 用户看到的还是旧代码。** 验证新代码是否真进 exe：
  `grep -ac "新代码里的独特字符串" WavePaintClean.exe`。

## 三、仿真链路：改动禁区

- 链路：画布 → `readWaveDocument` → `buildAutoTestbench` → iverilog+vvp → VCD → `vcdToProjectOutputs`
- `js/sim-bridge.js`（注：仿真桥接逻辑现主要在 `js/sim/engine.js` + `js/sim/ui-bridge.js`）是
  **最易碎**处。做 UI / feature 类需求时**优先不动它**；只要不碰它，`e2e-sim.mjs` 就能守住"仿真没坏"。
- ⛔ **绝不要做"生成时翻转 + 采样时再翻转"的时钟双写逻辑**（曾因此把仿真搞崩：时钟沿丢失 → DUT 无时钟 → 输出恒 0/x）。
- ⛔ 不要用 `isAlternating` 之类脆弱启发式去猜信号语义（会把真实交替的数据信号误判为时钟）。
- 时钟激励保持**主步级 0101**（`createPortStimulus` 是单一真相源）。

## 四、数据模型

- `m_sampleCount`=主步数，`m_subStepCount`=子步；`stride = 子步 + 1`；
  `sig.values` 长度 = `主步数 × (子步+1)`。
- 整步写入 = 写满该主步的 stride 个下标；子步写入 = 只写命中下标。
- ⚠ stride 口径不一致曾导致"仿真结果恒为 0"，**别再动这个口径**，除非重跑全量回归。
- ⚠ **双 divisor 模型（框选根治定论）**：单信号可带私有 subSteps（`divisorOf(sig)=
  (sig.subSteps>0)? own+1 : stride()`），同行 sampleIndex 跨行含义不同。选框/端点一律用
  **globalSampleIndex**（x 决定）；行内写入统一经 **wpf.cellsInRange(sig,lo,hi)**（main-step
  float 中转+夹取）；粒度收敛用 `divisorOf(sig)`，勿用全局 stride。详细见 `2026-09-03.md`。

## 五、验证门槛（缺一不可）

| 命令 | 用途 | 期望 |
|---|---|---|
| `node tools/regression.mjs` | 逻辑/快照（不跑真实仿真） | 全过（用例数随新增增长） |
| `node tools/e2e-sim.mjs` | 真跑 iverilog，验证仿真链路 | 失败 0 项 |
| `node --check <js>` | 语法检查（防浏览器整段加载失败） | OK |
| **浏览器实操** | UI 类改动 | 必须真点一遍，不能只改 CSS 就提交 |

- UI 改动 AI 无法在本环境用浏览器实测，**必须明确告诉用户需人工验收**。

## 六、主题

- 主题 = `body.dark` class；CSS `:root` 默认即浅色，深色只是覆盖。
- 默认浅色由 `feature-common.js` 启动时 `applyTheme('light')` **只干预一次**
  （`localStorage: wpf.defaultLightThemeApplied`），尊重用户后续选择。
- `WavePaintSkins`（Black/Sunset/Forest）只影响波形颜色，与背景无关。

## 七、进制/标签与弹窗的正确姿势（Phase-3 定论）

- **标签唯一实现 = 核心 `WaveDocument.valueToLabel`**（已改入 wavepaint.clean.js）：
  位串按位宽换算 + 去 0x/0b 前缀，x/z 位串→X/Z，-1→X，数字值按 radix.toString。
  外部一律 `wpf.valueLabel(value, radix?)` 转发，**不要再写第二个换算实现**。
- **弹窗唯一入口 = `__core.prompt`** → 核心 `wpQuickPrompt`（回车/有值失焦=提交、
  空值失焦/Esc/X/遮罩=取消、非法输入红框重开）。外部模块不碰弹窗 DOM。
- `wpf.refreshBusLabels` 职责只剩「按信号自身 radix 批量重算」（没有 radix 才退回全局）。
- **已删除**（勿再引入）：patchCoreValueToLabel 原型补丁、localFormatVector/busRadixLabel
  内联换算、zh.js DOM 汉化、MutationObserver 弹窗抑制器、value-input 自驱弹窗 DOM、
  step-commit 补丁（`js/patch/` 目录整体清零，spin 已由核心绑 change 提交）。
- **核心右键菜单自带进制转换项**：不自绘、不注入。混淆字符串是拆分的，grep 用片段法；
  验证进制用 ≥10 的值（255→FF）；**媒体查询里的 CSS 规则也要查**。

## 八、磁盘与验证（环境坑）

- ⚠ **C 盘曾 0GB 满盘（多次）**：headless Edge 组件更新器写 C 盘 %TEMP%，e2e-ui 卡死；
  `workbuddy-update-x64`(463MB)、`WaveWorkbench_build`、`wavepaint-ivl-cache`、`CrashDumps` 占空间。
  **C 盘 0MB 时命令输出捕获全 ENOSPC**（exit 0 但无 stdout），exe launcher 静默挂起不产 port 文件
  → 先清这些目录。对策：Edge 加 `--disable-component-update`；spawn env 把 TEMP/TMP 指到 D 盘；
  临时产物统一 `D:/Files/Code/波形/.e2e-tmp/`。
- **node 沙箱拦 rmSync 递归删大目录**（>50 文件抛错）：e2e 用唯一 profile 名每次全新，不在 node 里删大目录。
- **后台 PowerShell 跑 `.\build.ps1` 会落错目录**（cwd 漂移 → 产物名/时间戳不符即怀疑跑错目录）
  → 用 Set-Location + **绝对路径**调 build.ps1。
- exe 端口/解压目录写 %TEMP%：跑 exe 冒烟前先删旧 `WavePaintClean_port_*.txt`，
  读端口用**最新**文件（`ls -t | head -1`，勿 sort().pop()），测完清 `WavePaintClean_*` 与进程。
- ⚠ **exe-smoke 必须一条命令完成（60s 时序坑）**：launcher 无窗口时 ~60s 无页面心跳即退出。
  「启动 exe + 立即跑 smoke」放同一命令（先 taskkill 旧实例 → 删 port 文件 → 启动 → 等
  port 文件 ≤15s → smoke → taskkill），页面心跳会在 60s 内接管保活。exe 单实例：旧实例未杀，
  新启动走 OpenExistingInstance 直接退出不写 port 文件。
- 端口匹配（engine.js matchSignalsToPorts）：精确匹配两级（原始名优先 + 归一化名仅唯一未占用时）；
  claimed 一对一贯穿两轮；fuzzy 三重约束（单字符/长度比/最相似）。改归一化或匹配规则必须重跑回归 + e2e-sim 并重建 exe。
- 回归门槛（tools）：regression.mjs → e2e-sim.mjs（真实 iverilog）→ e2e-ui.mjs（真实 Edge：
  A–D 源码级 valueToLabel/进制/弹窗流 + spin 提交 + **E 组框选回归**：整步/子步粒度、反向拖动、
  跨私有 divisor 行写入零越界、vector 'A'→10、稳定性三连拖+输入框半输入不误提交、Esc 清理）
  → exe-smoke.mjs（真实 exe 汉化冒烟）。UI 改动仍需用户人工验收。
- ⚠ **沙箱回收后台 GUI exe**：从 bash 沙箱里 `./WavePaintClean.exe &`，命令结束后进程被回收 →
  端口文件在但服务秒死、exe-smoke 连不上（不是产品 bug）。**exe 冒烟/保活验证必须用非沙箱方式启动 exe**。
- ⚠ **PowerShell 工具的 stdout 捕获会整会话失效**（exit 0 但完全无输出，非 C 盘满导致）
  → 一律用「把结果写到 D 盘文件，再用 Read 读」的旁路。Bash 工具捕获正常，可交叉验证。
- 服务保活（2026-09-03）：页面 `js/core/heartbeat.js` 每 2s 打 `api/ping` → launcher `lastActivity`
  刷新 → 退出判据 `gone>24 && idle>20000` 只在页面真关（心跳停）后触发；dev-server.mjs 也带同款 /api/ping。
  改这两个文件任一处都需 rebuild exe。

## 九、交付 exe 的硬性流程（血泪定论）

- ⚠ **用户可能误启旧 exe 副本**（同名、不同目录）：曾因启动 9-02 旧副本导致「五个 bug 全没修好」
  实际是旧构建（grep 修复特征串命中 0）。
- 每次交付 exe 前必须按顺序做：
  1. 重建（绝对路径调 `build.ps1`，用 PowerShell 工具；`taskkill` 已授权直接执行）；
  2. **grep 本次修复的独特字符串**确认代码真进了这个 exe（别只信时间戳）；
  3. `find /d/Files -iname "WavePaint*.exe"` **确认没有同名旧副本**；有就问用户是否隔离
     （用户曾选重命名为 `*.stale-<date>`，可逆、不删数据）；
  4. 回复里给出**唯一绝对路径**并提醒「重启应用、必须从该路径启动」。

## 十、用户长期约定

- **构建前直接结束主项目进程，无需再向用户确认**（见第一节第 2 条）。
- 用户可能正在用旧 exe 测试，构建/交付后务必提醒重启应用。
- **所有删除 / 隔离操作必须可恢复**：死项目 / 旧副本统一先移到隔离区
  `D:/Files/Code/.trash-<日期>/`（或回收站）再清理，不裸删。

## 十一、文件结构与模块职责（整理后的项目梳理）

```
D:/Files/Code/波形/               仓库根 = 项目本体
├─ index.html                     入口（被内嵌进 exe）
├─ css/ img/ lib/                 UI 资产
├─ js/
│  ├─ wavepaint.clean.js          核心引擎（还原自混淆核心，黑盒底线，行为=原版）
│  ├─ core/  (__core / wpf / heartbeat)   官方桥接 + 历史共享层 + 心跳保活
│  ├─ editor/ (draw/selection/value-input/shortcuts/measure/resize/generator/templates)  画布编辑
│  ├─ sim/    (engine / project-model / ui-bridge)   仿真
│  └─ util/  (id)   工具
├─ docs/    功能总览 / 补丁清单 / 重构方案 / 代码规范 / 解混淆调研（开发记忆）
├─ tools/   deobfuscate / gen-resources / dev-server / regression / e2e-* / exe-smoke / probe-core
├─ WavePaintLauncher.cs  启动器
├─ build.ps1  构建脚本（需 UTF-8 BOM）
├─ ivl.zip  iverilog 便携包
├─ resources.txt  内嵌资源清单（构建时生成，gitignored）
├─ WavePaintClean.exe  构建产物（gitignored，不提交）
├─ README.md  软件说明（不强调代码来源）
├─ .gitignore
└─ .workbuddy/memory/  项目记忆（本文件 + REQUIREMENTS.md + 每日日志）
```
- 死项目（WavePaintSim / WavePaintSim_GitHub / WaveWorkbench / codex-feishu-bridge）已隔离到
  `D:/Files/Code/.trash-20260904/`，可恢复；仓库根只留唯一主项目。
- 残留空目录 `D:/Files/Code/波形/WavePaintSim`（0 文件）被本会话句柄 + safe-delete 锁目录失败而删不掉，
  内容已入隔离区，无害，下次会话可 `rmdir`。

## 十二、跨 AI 使用说明

- 本 `MEMORY.md` 与同目录 `REQUIREMENTS.md` 是项目记忆总纲，位于 `.workbuddy/memory/`，
  **任何新对话 / 不同 AI 直接读取即可承接项目**，无需重复探索。
- 深度细节：每日日志 `2026-08-30.md`~`2026-09-04.md`；设计/重构/规范见 `docs/`。
- **新增 / 变更需求后，必须同步更新 `REQUIREMENTS.md`**（用户要求需求清单作为可同步更新的记忆）。
- **涉及「改代码 → 重建 exe → 提交 git」的铁律见第一节，任何 AI 改动都照此执行。**
