# Changelog

## v0.2.0 (2026-08)

### 仿真修复（此前"点击 Sim 结果恒为 0"的四层根因）
- `feature-draw.js`：修复双引号语法错误导致模块加载失败
- TimeGen 绘制在默认无工具时也接管（此前仅 paint 工具时接管），修复落回原版写子步奇数下标
- `sim-bridge.js`：`sampleMainValue` 兜底采样——主值为 x 时取步内第一个确定值，修复画奇数下标采不到
- `sim.js`：`matchSignalsToPorts` 按 name→fuzzy→unbound 匹配，unbound 输入端口生成默认全 0 激励
- 实测：counter 例程正确仿真 q=0xE

### 新增增强功能（feature-*.js 模块）
- TimeGen 式绘制：信号带上半区画 1、下半区画 0，拖动连续绘制
- 编辑力度切换（整步 / 子步）、总线进制切换（Dec/Hex/Bin）
- Auto RTL 按钮：自动识别 RTL 输入端口并添加到画布
- 波形生成器（正弦/三角/锯齿/随机/毛刺时钟）、协议模板（SPI/I2C/UART）
- 测量光标（Alt+点击 A/B 光标）、框选批量设值/翻转/复制/粘贴
- 快捷键（1/0/X/Z/U/D、方向键绘制、Ctrl+Z/Y）

### 其他
- 数据模型对齐：添加信号长度 = 步数 × (子步+1)
- 单实例保护 + 仿真期间不退出（WavePaintLauncher.cs）
- 界面乱码修复、F7/F8 菜单补齐
- 新增 tools/regression.mjs（33 项黄金快照回归测试）

## v0.1.0

- Separated waveform rendering from the old result window
- Seeded default stimulus signals
- Routed simulation outputs back into the waveform canvas
- Added TB preview/copy support
- Fixed waveform overlay visibility