# WavePaint 离线版 + Verilog 仿真（WavePaint Offline & Simulator）

## 内置 Verilog 仿真（原生 Icarus Verilog）
- 点击工具栏「仿真」按钮打开仿真面板。
- **多文件 DUT**：在代码区粘贴/多个文件写你的 Verilog 模块（支持模块互调、多文件），点「＋添加文件」可加更多文件。
- **手绘激励**：在左侧波形画布上手绘输入信号（时钟自动识别），点「1 解析端口」识别信号，点「2 生成TB」自动生成 testbench（不用手写 TB）。
- **3 编译仿真**：单文件 `WavePaint.exe` 内嵌了 **iverilog（Icarus Verilog 原生）**，运行时自动解压并起本地服务，仿真结果（VCD）自动回填并渲染波形，输入/输出对照查看。
- 完全离线、免安装、免管理员权限。仅需 Windows 10/11 + Microsoft Edge。

WavePaint 数字时序图绘制工具的**本地离线版本**。所有资源已本地化，**无需联网**即可使用，通过 **Microsoft Edge** 打开运行。

## 使用方法

1. 双击 **`WavePaint.exe`** 即可启动。
2. 程序会自动定位本机安装的 Microsoft Edge，并以**独立应用窗口**（`--app` 模式）打开本地应用。
3. 完全离线运行，不依赖任何网络。

> **独立单文件**：`WavePaint.exe` 为**自包含单文件**，已将全部应用资源（index.html、css、js、img、lib）**内嵌进 exe**。运行时自动解压到临时目录再由 Edge 打开，**不依赖同目录的任何文件**。把这个 exe 单独发给任何一台安装了 Microsoft Edge 的 Windows 电脑即可运行（需 Windows 10/11，自带 .NET Framework 4.x 运行时）。

## 目录结构

```
WavePaintOffline/
├── WavePaint.exe          ← 启动器（双击运行）
├── index.html             ← 应用主页面
├── privacy.html           ← 隐私说明页
├── css/                   ← 样式
├── js/                    ← 主程序逻辑
├── img/                   ← 图标/图片
└── lib/                   ← 本地化的 WaveDrom 库（离线依赖）
```

## 说明

- 本项目是从官网 `https://www.wavepaint.net/app/` 下载的静态 Web 应用并做**离线本地化**处理：
  - 移除了在线广告脚本（Google AdSense）。
  - 将 CDN 依赖（WaveDrom 库）改为本地 `lib/` 目录加载。
  - 所有图片、样式、脚本已完整下载，`file://` 协议下零外部请求、零报错。
- 为做成**纯粹的本地波形编辑软件**，已去除所有商业化/在线元素：
  - 移除右侧 **Sponsors 赞助商面板**，画布占满全宽。
  - 移除菜单栏的 **“Your Data is Protected” 隐私盾牌**标识。
  - 移除工具栏的 **Donate 捐赠**按钮。
  - 移除页面右上角的 **About / Report Bug / Learn / Blog / Privacy / GitHub** 链接。
- **Steps / Sub-Steps 输入改为“提交后更新”**：输入步数时不再每敲一次键盘就重绘波形（避免波形闪烁/消失，如 20→40 删 0 会先变 2）。现在输入完整数字后，**点击其他区域（失焦）或按回车**才一次性更新波形。实现见 `js/step-commit-patch.js`。
- **时钟信号相位修正**：添加的 Clock 信号由“先低后高”改为“**先高后低**”，使上升沿落在主网格实线上（而非子步虚线上）。修改位于 `js/wavepaint.63e6dade.js` 的 `addClockSignal` 方法（时钟初始电平由 0 改为 1）。
- **默认时间步数**：Steps 默认改为 **30**，Sub-Steps 默认改为 **1**。
- **界面汉化**：菜单、工具栏、下拉菜单、步数标签等静态界面已全部翻译为中文；添加信号等动态弹窗（`#wp-modal`）通过 `js/zh-lang-patch.js` 在运行时翻译为中文。
- **去除开屏引导弹窗**：打开软件时弹出的教程/引导弹窗已彻底隐藏（通过 CSS 隐藏 `.wp-tutorial-*` 容器）。
- 应用数据（主题、设置等）通过浏览器 `localStorage` 保存在本地。
- **注意**：WavePaint Web 应用本体为专有软件（非开源），此处仅做本地离线镜像与打包，供个人离线使用。

## 重新生成启动器

若需重新编译 `WavePaint.exe`（需 .NET Framework 4.x，Windows 10/11 自带）：

```powershell
& "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /r:System.Windows.Forms.dll /out:WavePaint.exe WavePaintLauncher.cs
```
