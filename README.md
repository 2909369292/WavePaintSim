# WavePaintSim — 离线波形编辑器 + Verilog 仿真器

在浏览器中**手绘数字时序波形**，自动生成 testbench，调用内嵌的 **Icarus Verilog** 真实仿真，再把 VCD 结果回填到画布对照查看。完全离线、免安装，仅需 Windows 10/11 + Microsoft Edge。

## 特性

- **波形绘制**：画笔/橡皮擦/选择工具；时钟/计数/复位/脉冲/PWM/斜坡/走查/格雷码等预定义信号；位状态 0/1/x/z/u/d。
- **TimeGen 式绘制**：在信号带**上半区点击画 1、下半区画 0**，按住拖动连续绘制；编辑力度可切换（整步 / 子步）。
- **自动识别 RTL 端口**：粘贴 Verilog/SystemVerilog，点「Auto RTL」自动把输入端口信号添加到画布，省去手动添加。
- **真实仿真**：内嵌 Icarus Verilog（iverilog/vvp），点「Sim」编译运行，VCD 结果自动回填输出信号（如 q）。语法错误/编译错误在面板内显示。
- **步数自适应**：修改步数/子步数时，时钟按周期自动延续、其它信号延续最后值。
- **快捷键**：`1/0/X/Z/U/D` 切换位状态、方向键绘制、`Ctrl+Z/Y` 撤销重做。
- **框选批量**：选择工具框选后一键设 1/设 0/翻转/复制/粘贴。
- **波形生成器**：正弦/三角/锯齿/随机/带毛刺时钟。
- **协议模板**：SPI / I2C / UART 读写时序一键生成。
- **测量光标**：Alt+点击放置 A/B 双光标，显示步数差。
- **总线显示**：矢量信号 Dec/Hex/Bin 进制切换。
- **导入导出**：WaveDrom JSON、VCD、PNG/SVG/JPG、TXT、CSV。

## 使用方法

1. 双击 **`WavePaint.exe`** 启动（单文件自包含，内嵌全部资源与 iverilog）。
2. 在左侧画布绘制激励波形（或用「Auto RTL」从 RTL 自动添加）。
3. 右侧仿真面板：粘贴/编写 RTL →「Parse」→「TB」→「Sim」，结果回填画布。

## 构建

```powershell
# 需 .NET Framework 4.x（Windows 自带）
Set-Location WavePaintSim
.\build.ps1        # 产出 WavePaint.exe（内嵌 index.html/js/css/img/lib/ivl.zip）
```

## 目录结构

```
WavePaintSim/
├── WavePaint.exe          # 启动器（构建产物，双击运行）
├── WavePaintLauncher.cs   # C# 启动器（HttpListener + Edge --app + 单实例）
├── build.ps1              # 构建脚本
├── index.html             # 应用主页面
├── js/
│   ├── wavepaint.63e6dade.js  # ⚠ 混淆核心（WavePaint Web 抓取，勿改，只当引擎）
│   ├── sim-bridge.js          # 仿真桥（画布↔激励↔TB↔VCD）
│   ├── sim.js / model.js      # TB 生成 / 矢量值处理
│   └── feature-*.js           # 增强模块（绘制/resize/快捷键/框选/测量/生成器/模板）
├── css/ img/ lib/         # 样式 / 图标 / WaveDrom 库
├── docs/                  # 规划与实施文档
├── tools/                 # regression.mjs（回归测试）/ e2e-sim.mjs（端到端仿真测试）
└── ivl.zip                # 内嵌 Icarus Verilog 便携包（构建输入）
```

## 技术说明

- 本项目是 WavePaint Web（`https://www.wavepaint.net/`）的**本地离线增强版**：波形绘制引擎为混淆核心（专有软件，仅作引擎调用），在其上外挂仿真、自动端口识别、TimeGen 绘制等增强功能（`feature-*.js`）。
- **数据模型**：每个信号 `values.length = 步数 × (子步+1)`，主值为每步第 1 个下标；仿真按主值采样。
- 回归测试：`node tools/regression.mjs`（33 项黄金快照）；端到端：`node tools/e2e-sim.mjs`。
- **注意**：WavePaint Web 应用本体为专有软件（非开源），本仓库仅含离线镜像与增强代码，供个人/学习使用。

## License

代码基于 MIT（见 [LICENSE](LICENSE)）。WavePaint 应用本体版权归原作者所有。