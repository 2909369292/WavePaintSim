# 08 · 路线图（Verdi 借鉴 + 远期方向）

> 本文件记录下一阶段主线与远期可选方向。完成一项后，同步更新 `03-REQUIREMENTS.md` 与 `04-PROGRESS.md`。

---

## 1. 主线：Verdi 借鉴（代码↔波形联动）

| 期 | 内容 | 状态 | 关键点 |
|---|---|---|---|
| P0 | **CodeMirror 6 代码视图 + RTL Tree 面板 + VCD 全路径索引** | ✅ | 已完成 2026-09-09：CM6 预打包入 `lib/`；`rtl-nav/vcd-index/rtl-panel`；回归 58/58、e2e-rtl 9/9、exe 重建 |
| P1 | **点变量 → 加波形 + 树↔代码双向跳转 + 信号组入 `.wp`** | ⬜ | 复用 `toNativeSignal` 注入链路 + P0 的完整路径数据源；多实例歧义选择器；未 dump 信号提示 |
| P2 | **Active Annotation + driver/load 高亮** | ⬜ | 波形游标时刻 → 代码行内标值；driver/load 启发式高亮 |
| P3 | **X 首现追溯 / 波形 diff / VSCode 外接扩展** | ⬜ 备选 | VSCode 扩展复用 launcher HTTP `/api`；扩展读取 `%TEMP%/WavePaintClean_port_*.txt` 获取端口 |

---

## 2. P0 具体拆解

> **P0 已于 2026-09-09 完成**，实现记录见当日日志 `memory/logs/2026-09-09.md`；P1 直接复用 P0 的数据源与渲染层。

### 2.1 CodeMirror 6 代码视图

- 目标：内嵌轻量代码编辑器，支持 Verilog 语法高亮。
- 方案：预打包单文件入 `lib/`，esbuild 一次性构建。
- 备选：Monaco（用户已接受 +4MB），若需要 VSCode 级体验再切换。

### 2.2 RTL Tree 面板

- 目标：显示模块、实例、端口、参数层次树。
- 数据源：`parseVerilogDesign()` 已解析 module / ports / instances / params。
- 交互：点击树节点跳转代码；后续支持点变量加波形。

### 2.3 VCD 全路径索引

- 目标：建立 VCD 层次路径 → 信号的完整索引。
- 数据源：`parseVcd()` 已可解析层次路径。
- 用途：支持 P1 的点变量加波形、P2 的 Active Annotation。

---

## 3. 开源借鉴清单

| 项目 | 借鉴点 |
|---|---|
| Verible | Verilog 符号/格式化，WASM 解析精度方案 |
| TerosHDL | 项目管理、FSM viewer、交互组织 |
| mshr-h/vscode-verilog-hdl-support | 模块树、文档符号、RTL Tree 交互 |
| Surfer | 现代波形查看器、层次树、值格式化、会话 |
| GTKWave | 测量、标记、传统波形交互 |
| WaveTrace | 编辑器内嵌波形布局 |

---

## 4. 远期可选方向

- 边缘对齐辅助线
- Ctrl+滚轮缩放增强
- 导出增强（图片 / CSV / VCD）
- X 首现追溯
- 两次仿真 diff
- VSCode 外接扩展
- Verilator 第二后端（远期，非当前主线）

---

## 5. 不做 / 暂缓

- **不换主仿真器**：iverilog 保持主后端，Verilator 仅远期可选。
- **不重做解混淆 / 重构**：已完成，禁止重复劳动。
- **不引入 Electron / WebView2**：当前 C# + Edge App 方案满足需求。
- **不把 Verdi 功能一次性做完**：按 P0 → P1 → P2 → P3 分期。
