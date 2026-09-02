# WavePaintClean — 混淆核心解混淆项目

目标：对 `WavePaintSim` 中的混淆核心 `js/wavepaint.63e6dade.js`（1.4MB 单行
obfuscator.io）做**解混淆**，UI 与功能与原版**完全一致**（原样引用，不是复刻），
后端实现不关心。

## 结果

| 产物 | 说明 |
|------|------|
| `js/wavepaint.clean.js` | **解混淆产物**（33K 行、1.44MB），由源混淆核心自动生成 |
| `js/wavepaint.63e6dade.js` | 源混淆核心（保留，作基线与对照） |
| `index.html` | 已引用 `js/wavepaint.clean.js`（UI 原样，未改任何布局/样式） |
| `index.obf.html` | 引用原混淆核心的对照版（仅脚本引用不同） |
| `tools/deobfuscate.mjs` | 解混淆管线（可重跑） |

## 解混淆做了什么

`tools/deobfuscate.mjs` 三阶段：

1. **字符串还原**（阶段 0/1）
   - 定位 stringArray 机制：解码器 `_0x55bf` + 数组工厂 `_0x3f97` + 顶部 rotate IIFE
   - 把这三段抽取为独立解码环境，在 `node:vm` 中执行得到 `lookup(idx)`
   - AST（acorn）遍历 + 父引用就地替换：所有解码调用（含 1742 个链式别名、
     832 个数值对象字面量间接引用）**19,090 处全部还原为字符串字面量，失败 0**
   - 例如 `_0x55bf(0x1c4)+_0x55bf(0xeb5)` → `"m_sampleCo"+"unt"` → 已拼接可读
2. **hex → 十进制**（escodegen 重生成自动处理，如 `_0x7405df: 0x82c` → `2092`）
3. **格式化**：单行 → 33K 行缩进代码

**不做**（风险/收益考量）：控制流平坦化（`while(!![])` dispatcher）还原——
会破坏行为等价性。变量 `_0x…` 标识符名因混淆是单向的，永久无法恢复，
但函数/方法名（`drawRangeSelection`、`TimeJump`…）多数保留，字符串还原后
可读性已大幅提升。解码器 + 数组作为兜底保留在产物中（未被替换的调用仍能跑）。

## 行为一致性验证（真实浏览器，Edge headless + CDP）

对 `index.html`（clean）与 `index.obf.html`（原混淆）做了像素级比对：

- 全局 API：`document_wave` / `mapCanvasPosition` / `mapToSignalSample` /
  `__wpf` / `SignalType` / `WaveDrom` 全部就绪，两侧一致
- **画布像素级一致**：`wave-canvas.toDataURL()` hash **完全相同**
- 添加信号渲染：`clk:bit:60` 一致
- 控制台异常：两侧 **0 错误**
- 交互：select 工具单击 → 整步框选 `[4,5]` + 工具条弹出（扩展 feature-*.js
  在 clean 核心上正常工作）

## 怎么用

```bash
# 起本地服务器（含 /api/sim 仿真端点，Node 侧 iverilog/vvp）
node tools/dev-server.mjs 8947
# 浏览器打开 http://127.0.0.1:8947/index.html  （clean 版，默认）
#           http://127.0.0.1:8947/index.obf.html（原混淆对照）

# 重新跑解混淆管线（改完源核心后）
node tools/deobfuscate.mjs
```

打包 exe 的方式参照 WavePaintSim 的 `build.ps1`（本目录未复制，需要时从
`../WavePaintSim/build.ps1` 拷入并按 `js/wavepaint.clean.js` 打包）。

## 目录

```
css/  img/  lib/        原样复制（UI 资产，未改）
index.html              引用了 clean 核心
index.obf.html          引用了原混淆核心（对照）
js/wavepaint.clean.js   解混淆产物（33K 行）
js/wavepaint.63e6dade.js 源混淆核心
js/feature-*.js ...     现有扩展模块（WavePaintSim 自带，非混淆）
tools/deobfuscate.mjs   解混淆管线
tools/dev-server.mjs    开发服务器（含 /api/sim）
tools/probe-core.mjs    混淆核心语句级探查（定位关键函数用）
```

## 打包为独立 exe（在装有 Edge 的任意 Windows 电脑上运行）

与 WavePaintSim 相同的封装方式：

```powershell
# 1. 构建（需 .NET Framework 4 的 csc，Win7+ 自带）
.\build.ps1     # 产出 WavePaintClean.exe（22.4MB，自包含）

# 2. 运行：双击 exe 或命令行启动
WavePaintClean.exe
```

exe 运行时：
- 把内嵌资源（index.html + css/img/js/lib + ivl.zip iverilog 便携包）解压到
  `%TEMP%\WavePaintClean_<用户名>\`
- 本机随机端口起 HttpListener（`http://127.0.0.1:<port>`），含 `/api/sim`
  （iverilog 编译 + vvp 仿真，返回 VCD）、`/api/snapshot`、`/api/ping`
- 自动找到本机 Edge（`msedge.exe`，注册表 + 常见路径），以
  `--app="http://127.0.0.1:<port>/index.html"` 打开应用窗口
- 单实例保护：mutex `WavePaintClean_SingleInstance`；端口文件
  `%TEMP%\WavePaintClean_port_<PID>.txt`

打包内容：`js/*` 全部内嵌但**排除源混淆核心** `wavepaint.63e6dade.js`
（功能已由解混淆产物 `wavepaint.clean.js` 替代）。

exe 端到端验证（本机 Edge headless + CDP，走 exe 的 HTTP 服务）：
- 全局 API 就绪；RTL 解析 → 添加信号 clk/rst_n；激励绘制
  `clk=11001100`（每主步交替）
- 仿真：`Simulation done: 1 signals, tmax 30000`，q 输出正常计数
- 运行时控制台异常 0

构建脚本注意（与 WavePaintSim 相同）：build.ps1 需保留 UTF-8 BOM
（PowerShell 5.1 无 BOM 会按 GBK 解码中文注释导致解析失败）；
csc 失败时脚本仍 exit 0 —— 判断成功看 `WavePaintClean.exe` 体积/时间戳。

## 目录

```
css/  img/  lib/        原样复制（UI 资产，未改）
index.html              引用了 clean 核心
index.obf.html          引用了原混淆核心（对照）
js/wavepaint.clean.js   解混淆产物（33K 行）
js/wavepaint.63e6dade.js 源混淆核心
js/feature-*.js ...     现有扩展模块（WavePaintSim 自带，非混淆）
tools/deobfuscate.mjs   解混淆管线
tools/dev-server.mjs    开发服务器（含 /api/sim）
tools/probe-core.mjs    混淆核心语句级探查（定位关键函数用）
WavePaintLauncher.cs    exe 启动器（资源解压 + HttpListener + /api/sim + Edge 启动）
build.ps1               构建脚本（内嵌全部资源 → WavePaintClean.exe）
ivl.zip                 iverilog 便携包（仿真引擎）
```

## 后续可做（未做）

- 删除已失效的死代码（数组声明、解码器、rotate IIFE），进一步瘦身
- 用语义工具（jsnice 等）给关键 _0x… 变量/函数批量重命名
- 逐步手工还原核心业务模块（画布渲染、range selection、JSON 导入导出…），
  替换为具名实现 —— 但注意任何手工改写都必须再跑一轮像素级对比验证
