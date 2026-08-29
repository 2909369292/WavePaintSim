# WavePaint 绘图版（纯波形绘制，不含仿真）

独立的**波形绘制软件**（已汉化，含全部既有修改，**不含 Verilog 仿真**）。

## 功能
- 手绘数字时序波形（位信号/矢量信号/时钟/计数器等预定义信号）
- 打开/保存/导入导出（WaveDrom JSON / VCD / TXT / CSV / 图片）
- 步数、子步数、缩放、标记、时间跨度、文本标注、选择对象等
- Steps 默认 30、Sub-Steps 默认 1；Steps/Sub-Steps 输入改为**失焦/回车后更新**（避免输入时波形闪烁）
- 时钟信号相位修正（先高后低，上升沿对齐主网格实线）
- 已去除广告、赞助、捐赠、隐私标识、右上角链接；已隐藏开屏教程弹窗
- 全部界面中文化

## 使用
- 双击 `WavePaint.exe`（**自包含单文件**，1.7MB），自动用 Microsoft Edge 打开。
- 需要：Windows 10/11（自带 .NET Framework 4.x）+ 已安装 Microsoft Edge。
- 完全离线、免安装、免管理员权限。

## 目录
- `WavePaint.exe`：自包含单文件启动器（内嵌全部网页资源，解压到临时目录后由 Edge 打开）
- `index.html` / `css/` / `js/` / `img/` / `lib/`：网页源码
- `build.ps1` + `WavePaintLauncher.cs`：重新编译 exe 用

## 说明
本版本是"绘图"独立项目，与 "WavePaintSim（绘图+仿真版）" 相互独立、互不影响。