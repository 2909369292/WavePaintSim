# 01 · 项目简介与架构（跨 AI 单一真相源）

> 本文件回答“这是什么项目、代码在哪里、数据怎么流、哪些口径绝对不能碰”。
> 下一任 AI 接手时，先读本文件，再读 `02-WORKFLOW.md` 和 `09-HANDOFF.md`。

---

## 1. 一句话定位

**WavePaint = 手绘波形替代手写 Testbench 的 Verilog 仿真工具（Windows 桌面软件）。**

用户在画布上绘制数字波形 → 软件自动生成 testbench → 内嵌 iverilog 编译仿真 →
VCD 结果回填画布，实现“画波形即可仿真 RTL”。

---

## 2. 关键事实卡

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/2909369292/WavePaintSim` |
| 分支 | `main` |
| 项目根 | `D:\Files\Code\波形\` |
| 交付物 | `D:\Files\Code\波形\WavePaintClean.exe` |
| 运行形态 | 本地 HTTP 服务 + Edge App 窗口 + 内嵌 iverilog |
| 核心引擎 | `js/wavepaint.clean.js`（解混淆 + 2026-09-09 解混淆收尾【死代码清理+标识符重命名】后直接维护，约 13K 行，正文无 `_0x` 残留） |
| 后端 | C# 启动器 `WavePaintLauncher.cs` + iverilog/vvp |
| 构建脚本 | `build.ps1` + `tools/gen-resources.mjs` |
| 当前版本 | `v0.4.0 build <时间> <git短哈希>` |
| 主要用户 | RTL 学习者、中小型数字设计工程师 |
| 核心卖点 | 双击即用、自包含 iverilog、手绘波形替代 TB、后续 Verdi 式代码↔波形联动 |

---

## 3. 产品定位与演进史

| 阶段 | 时间 | 关键决策 |
|---|---|---|
| 1. 混淆核心 + 外挂 | 2026-08-30 前 | 原产品为混淆 JS，扩展靠 `feature-*.js` 外挂与 6 类 hack |
| 2. 解混淆 | 2026-09-01 | `tools/deobfuscate.mjs` 还原 19090 处字符串，得到 33K 行可维护核心（混淆源与脚本已于 2026-09-09 清理删除，git 可查） |
| 3. 重构收编 | 2026-09-02 | 建立 `__core` 桥接、`core/editor/sim` 分层，清除全部历史 hack |
| 4. 正确性收口 | 2026-09-03~04 | 私有 divisor 模型、`wpf.parseValue` 唯一解析、launcher 自愈、历史回归根治 |
| 5. 功能增强 | 2026-09-04~08 | 工程存取、实时预览、DUT 回显、顶层选择、版本显示、参数化位宽 |
| 6. Verdi 借鉴 P0 | 2026-09-09 | CM6 代码视图 / RTL Tree / VCD 全路径索引完成；下一步 P1 点变量加波形 |
| 7. 死代码清理 | 2026-09-09 | 剔除 obfuscator.io 遗留解码器别名/数值映射/解码器/反调试闭包等死代码，33,110 → 17,164 行；删除混淆源 `wavepaint.63e6dade.js`、`index.obf.html` 与一次性脚本（git 可恢复） |
| 8. 解混淆收尾（标识符重命名） | 2026-09-09 | 按 ESLint-scope 绑定图把残留 `_0x…` 局部标识符重命名为可读名（19,132 处 / 4,291 变量，绑定一致性验证通过），17,164 → 13,115 行，正文 `_0x` 残留清零；`wavepaint.clean.js` 为最终唯一维护版 |

---

## 4. 总体架构

```text
┌──────────────────────────────┐
│ index.html + js/wavepaint.clean.js │
│  ├─ js/core/__core.js       │  官方桥接：state / selection / prompt / ready
│  ├─ js/core/wpf.js          │  共享层：坐标、解析、undo、弹窗、进制
│  ├─ js/core/heartbeat.js    │  Web Worker 心跳，防后台节流
│  ├─ js/editor/*.js          │  画笔、框选、快捷键、测量、生成器、模板、文件菜单
│  └─ js/sim/*.js             │  RTL 解析、TB 生成、VCD 回填、仿真面板
└──────────────┬───────────────┘
               │ /api/sim
┌──────────────▼───────────────┐
│ WavePaintLauncher.cs         │
│  ├─ 解压内嵌资源              │
│  ├─ HttpListener 本地服务     │
│  ├─ iverilog + vvp 调用       │
│  └─ Edge --app 窗口          │
└──────────────────────────────┘
```

### 4.1 前端脚本加载顺序（敏感，勿乱动）

1. `lib/wavedrom-skin.js`
2. `lib/wavedrom.min.js`
3. `js/wavepaint.clean.js`
4. `js/core/__core.js`
5. `js/core/wpf.js`
6. `js/core/heartbeat.js`
7. `js/editor/value-input.js`
8. `js/editor/draw.js`
9. `js/editor/resize.js`
10. `js/editor/shortcuts.js`
11. `js/editor/selection.js`
12. `js/editor/measure.js`
13. `js/editor/generator.js`
14. `js/editor/templates.js`
15. `js/editor/file-menu.js`
16. `js/sim/ui-bridge.js`（ES module）

> #75 P0 补充：`lib/codemirror.bundle.js` 以普通 script 在 ui-bridge 之前执行，挂
> `globalThis.WPCm`；`ui-bridge.js` 作为 ESM import `js/sim/rtl-nav.js` /
> `js/sim/vcd-index.js` / `js/sim/rtl-panel.js`（随模块图一并加载）。

---

## 5. 目录与模块职责

| 路径 | 职责 |
|---|---|
| `index.html` | 入口页面，内嵌进 exe |
| `css/` | 样式 |
| `img/` | 图标与图片资源 |
| `lib/` | 第三方库（wavedrom、`codemirror.bundle.js`=esbuild 预打包 CM6，挂 `globalThis.WPCm`） |
| `js/wavepaint.clean.js` | 解混淆核心引擎（直接维护），行为=原版 + 补丁段 `[PATCH-A*]`；头部含维护说明，改它= C1/C17 |
| `js/core/__core.js` | 唯一官方核心桥接：state、selection、prompt、ready |
| `js/core/wpf.js` | 共享层：stride、divisor、parseValue、undo、进制、弹窗 |
| `js/core/heartbeat.js` | 页面 → launcher 心跳，Web Worker 计时 |
| `js/editor/draw.js` | TimeGen 式画笔、橡皮擦、插值补齐 |
| `js/editor/value-input.js` | Bit/Vector 值输入、实时预览、Ctrl+Vector 联动 |
| `js/editor/selection.js` | 框选、浮动工具条、批量写值 |
| `js/editor/resize.js` | 步数/子步自适应伸缩 |
| `js/editor/shortcuts.js` | 键盘快捷键、任意工具 Ctrl+C/V |
| `js/editor/measure.js` | 时间光标 A/B/Δ 测量 |
| `js/editor/generator.js` | 波形生成器 |
| `js/editor/templates.js` | SPI/I2C/UART 协议模板 |
| `js/editor/file-menu.js` | 中文文件菜单重绑，.wp 工程存取 |
| `js/sim/engine.js` | RTL 解析、端口匹配、TB 生成、VCD 解析回填（最易碎区） |
| `js/sim/project-model.js` | 值归一化、进制格式化、工程模型 |
| `js/sim/ui-bridge.js` | 仿真面板 UI、多文件、顶层选择、运行与回显 |
| `js/sim/rtl-nav.js` | #75 RTL 树数据源：复用 engine 解析，为节点定位文件+行号（纯函数） |
| `js/sim/vcd-index.js` | #75 VCD 全路径索引：parseVcd 产物 → 点分作用域树（纯函数） |
| `js/sim/rtl-panel.js` | #75 DOM 渲染层：CM6 挂载、RTL/VCD 树渲染与跳转交互 |
| `tools/cm6-entry.js` | CM6 bundle 的 esbuild 构建源（tools/ 不进 exe） |
| `js/util/id.js` | 通用工具：uid、deepClone、clamp |
| `tools/` | 构建、回归、e2e、探针、开发服务器 |
| `memory/` | 项目唯一记忆目录（本文件所在） |
| `WavePaintLauncher.cs` | C# 壳：资源解压、HTTP、仿真、Edge 启动、自愈 |
| `build.ps1` | 构建脚本，必须 UTF-8 BOM |
| `ivl.zip` | iverilog 便携包 |

---

## 6. 核心数据流

```text
画布波形
  → readWaveDocument()
  → buildAutoTestbench()
  → buildSimulationPayload()
  → /api/sim
  → iverilog + vvp
  → wave_out.vcd
  → parseVcd()
  → vcdToProjectOutputs()
  → 回填画布
```

### 6.1 数据模型铁律

- `m_sampleCount` = 主步数
- `m_subStepCount` = 每主步子步数
- `stride = m_subStepCount + 1`
- `sig.values.length = m_sampleCount × stride`
- Bit 编码：`0=低, 1=高, -1=x, 2=z, 3=u, 4=d`
- Vector：位串字符串，长度 = `width`
- 每个信号可有独立 `subSteps` / `divisor`
- 读写统一走 `wpf.divisorOf()` / `wpf.stride()` / `wpf.cellsInRange()`
- **禁止任何模块自行推导 stride**

---

## 7. 关键 API 与唯一入口

| 能力 | 唯一入口 |
|---|---|
| 核心状态快照 | `window.__core.state()` |
| 选区操作 | `window.__core.selection` |
| 弹窗 | `window.__core.prompt()` |
| 值解析 | `wpf.parseValue(raw, sig)` |
| 坐标换算 | `wpf.divisorOf(sig)` / `wpf.stride()` / `wpf.cellsInRange()` |
| 撤销/重做 | `wpf.undo()` / `wpf.redo()` |
| 进制换算 | `wpf.valueLabel()` / `wpf.refreshBusLabels()` |
| RTL 解析 | `sim.parseVerilogDesign()` |
| TB 生成 | `sim.buildAutoTestbench()` |
| VCD 解析 | `sim.parseVcd()` / `sim.vcdToProjectOutputs()` |
| 工程存取 | `editor/file-menu.js` 调核心 `.wp` API |
| RTL 树数据 | `js/sim/rtl-nav.js` `buildRtlNav(files)`（#75） |
| VCD 层次索引 | `js/sim/vcd-index.js` `buildVcdHierarchy(parsed)`（#75） |
| 代码视图写入口 | `ui-bridge` `setEditorText` / `jumpToEditorLine`（#75，textarea 为数据镜像） |

---

## 8. 构建与验证命令

```powershell
# 语法
node --check js/sim/engine.js

# 逻辑/快照回归（当前 58 项）
node tools/regression.mjs

# 真实 iverilog 仿真链路
node tools/e2e-sim.mjs

# 参数化位宽端到端
node tools/probe-param.mjs

# 真实 Edge UI 回归（需要本机 Edge）
node tools/e2e-ui.mjs

# #75 浏览器冒烟：CM6 / RTL Tree / VCD 树（需要本机 Edge，非沙箱执行）
node tools/e2e-rtl.mjs

# 开发服务器
node tools/dev-server.mjs 8947

# 重建 exe（改任何内嵌资源后必须执行）
.\build.ps1
```

---

## 9. 当前已知残留与注意事项

- 混淆源 `js/wavepaint.63e6dade.js`、对照页 `index.obf.html`、一次性脚本
  `tools/deobfuscate.mjs` / `tools/probe-core.mjs` 已于 2026-09-09 删除（git 历史可恢复），
  **不要**再引入混淆源码或试图重跑解混淆；核心只维护 `js/wavepaint.clean.js`。
- 空目录 `WavePaintSim/` 曾因句柄占用无法删除，内容已隔离，可手动 `rmdir`。
- `package.json` 无 `"type": "module"`，Node 会以 ESM 探测加载，出现无害警告。
- `WavePaintClean.exe` 为 gitignored 构建产物，不提交。
- `version.txt` 由 `build.ps1` 自动生成，勿手改。
- `ivl.zip` 为便携 iverilog，构建时内嵌进 exe。
- 任何 UI 视觉/交互改动，AI 无法完全替代人工验收，交付时必须明确提示用户。

---

## 10. 相关记忆

- 工作流与硬性约束：`memory/02-WORKFLOW.md`
- 需求台账：`memory/03-REQUIREMENTS.md`
- 当前进展：`memory/04-PROGRESS.md`
- 日志索引：`memory/05-LOGS.md`
- 坑库：`memory/06-PITFALLS.md`
- 决策库：`memory/07-DECISIONS.md`
- 路线图：`memory/08-ROADMAP.md`
- 交接说明：`memory/09-HANDOFF.md`
