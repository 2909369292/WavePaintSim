# WavePaintSim 长期记忆（项目约定与必须记住的坑）

## 一、构建：三个必须知道的坑

### 1. `build.ps1` 必须带 UTF-8 BOM ⚠
- 文件是 UTF-8。**无 BOM 时 Windows 的 PS 5.1 会按系统 ANSI(GBK) 解码**，
  中文的 UTF-8 多字节序列被错判为 GBK 双字节字符，会破坏引号/括号/换行结构，
  报 `字符串缺少终止符` / `语句块或类型定义中缺少右 }`，**构建直接不执行**。
- 2026-08-31 实测：新增含中文的行后即触发；原版文件因字节组合恰好不错位而侥幸可解析
  （属潜在隐患，不是"原版没问题"）。**加 BOM 后 PS 5.1 / PS 7 均正确解析。**
- 结论：以后所有改动 `build.ps1` 后，确认 BOM 仍在（`head -c 3 | od -An -tx1` 应为 `ef bb bf`）。

### 2. `build.ps1` 不传播编译器失败码 → 会表现成"假成功"
- 脚本只在末尾 `Write-Host "csc exit: $LASTEXITCODE"`，解析失败/编译失败时**外层仍 exit 0**。
- **判断构建是否真的成功，只能看 exe 时间戳/体积是否变化**，不能信 exit code。
- 建议排查方式：把输出重定向到日志再读（`& powershell -File .\build.ps1 *>&1 | Out-File build.log`）。

### 3. exe 内嵌 JS 资源，改了 JS 必须重建
- `WavePaintLauncher.cs:ExtractResources` 把 js/css/img/lib 内嵌进 exe，
  每次启动 `Directory.Delete(root,true)` 后重新解压到 `%TEMP%/WavePaintSim_<user>/`。
- **只改磁盘文件不重建 exe = 用户看到的还是旧代码。**
- 验证新代码是否真的进 exe：`grep -ac "新代码里的独特字符串" WavePaint.exe`

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

## 四、验证门槛（缺一不可）

| 命令 | 用途 | 期望 |
|---|---|---|
| `node tools/regression.mjs` | 逻辑/快照（不跑真实仿真） | 33/33（新增用例后对应数量全过） |
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

- 仓库根是父仓库 `D:/Files/Code/波形/`，**只动 `WavePaintSim/`**，父仓库其余未跟踪内容不碰。
- `WavePaint.exe` 是构建产物，已从 git 移除，**不要提交回 git**。
- 混淆核心 `js/wavepaint.63e6dade.js`（1.43MB）**不要改**，只能基于它导出的全局
  （`window.__wpf` / `document_wave` / `SignalType` / `Radix` / `mapCanvasPosition`）编程。
- 应用跑在 **HTTP**（启动器的 HttpListener，127.0.0.1），不是 file://，
  所以 `<script type="module">` 能正常加载（不存在 file:// 的 CORS 问题）。
