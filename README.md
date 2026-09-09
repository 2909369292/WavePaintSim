# WavePaint — 波形编辑与仿真工具

WavePaint 是一款运行于 Windows 的波形（Waveform）编辑与 Verilog 仿真工具。用户可在画布上
绘制 / 编辑数字波形、管理信号、进行框选与值编辑，并内置 iverilog 仿真后端，可直接解析 RTL
源码、自动识别端口信号、生成 testbench 并运行仿真查看结果。

> 维护背景：本项目的核心引擎由早期混淆发布的代码还原得到，便于长期维护与扩展；该还原过程属于
> 开发内部事项，仅在项目记忆（`memory/`）中记录，不在产品使用
> 层面体现。

## 功能

- **波形绘制与编辑**：画笔 / 橡皮擦 / 选择 / 箭头 / 文本标注 / 时间跨度 / 标记等多种工具
- **信号管理**：添加信号、总线（矢量）进制切换与标签显示
- **框选写入**：整步 / 子步粒度，跨私有 divisor 行写入零越界
- **仿真后端**：解析 RTL、自动加信号、生成 TB、运行 iverilog 仿真
- **独立 exe**：自包含 iverilog，装有 Edge 的任意 Windows 电脑双击即用（HTTP 本地服务 + 本机 Edge 窗口）

## 目录结构

```
css/  img/  lib/         UI 资产（原样）
index.html               入口页面（会被内嵌进 exe）
js/
  wavepaint.clean.js     核心引擎（已解混淆 + 死代码清理，现直接维护，见记忆）
  core/                  官方核心桥接与共享层（__core / wpf / heartbeat）
  editor/                画布编辑域（draw / selection / value-input / shortcuts / measure / resize / generator / templates）
  sim/                   仿真（engine 纯逻辑 / project-model 数据模型 / ui-bridge 面板）
  util/                  工具（id 等）
memory/                  跨 AI 记忆中心（项目 / 工作流 / 需求 / 进展 / 日志 / 坑 / 决策 / 路线图）
tools/                   构建与验证脚本（gen-resources / dev-server / regression / e2e-* / exe-smoke / probe-param）
WavePaintLauncher.cs     启动器（资源解压 + HTTP + sim + Edge）
build.ps1                构建 exe
ivl.zip                  iverilog 便携包
resources.txt            内嵌资源清单（构建时由 gen-resources.mjs 生成）
```

## 构建为独立 exe

```powershell
node tools\gen-resources.mjs   # Node 生成资源清单 resources.txt（递归 js/ 子目录）
.\build.ps1                    # → WavePaintClean.exe（自包含 iverilog）
```

exe 运行时：资源解压到 `%TEMP%\WavePaintClean_<用户>\` → 随机端口 HttpListener
（`/api/sim` iverilog+vvp、`/api/snapshot`、`/api/ping`）→ 自动开本机 Edge `--app=` 窗口；单实例。

## 开发 / 验证

```bash
node tools/dev-server.mjs 8947     # 开发服务器（只依赖 Node 内置模块）
# 浏览器打开 http://127.0.0.1:8947/index.html
node tools/regression.mjs          # 逻辑/快照回归
node tools/e2e-sim.mjs             # 真跑 iverilog 的仿真链路 e2e
node tools/e2e-ui.mjs              # 真实 Edge 的 UI 回归
node tools/exe-smoke.mjs           # 真实 exe 冒烟
```

## 使用

双击 `WavePaintClean.exe`（或开发服务器打开 `index.html`）：在画布上编辑波形，切到「仿真」面板
加载 RTL 源码并运行仿真。

## 详见

- 项目记忆与需求清单：`memory/`（从 `INDEX.md` 进入，支持跨 AI 新对话直接承接）
