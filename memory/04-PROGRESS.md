# 04 · 项目进展同步（跨 AI 接手必读）

> 本文件回答“现在做到哪了、下一步做什么、最近一轮发生了什么”。
> 每次任务开始/结束都必须更新本文件，保证下一个 AI 不用翻完整日志也能接手。

---

## 1. 当前状态快照（2026-09-09）

| 项 | 状态 |
|---|---|
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 代码状态 | 主线可用，`main` 分支 |
| 构建产物 | `D:\Files\Code\波形\WavePaintClean.exe` |
| 最近完成需求 | #75 Verdi 借鉴 P0（CM6 代码视图 + RTL Tree + VCD 全路径索引） |
| 最近完成文档 | #80 记忆体系重构（已完成，旧目录已删除） |
| 当前阻塞 | 无 |
| 下一步主线 | #75 Verdi 借鉴 P1（点变量加波形 + 双向跳转 + 信号组入 `.wp`） |
| 测试基线 | regression 58/58、e2e-sim 0 失败、probe-param 全过 |
| UI 基线 | e2e-rtl 9/9（#75 浏览器冒烟）；e2e-ui 35 项（环境正常时全绿） |
| 交付提醒 | 重启应用、从唯一路径启动、面板版本号自查 |

---

## 2. 里程碑时间线

| 日期 | 里程碑 | 关键结论 |
|---|---|---|
| 2026-08-30 | 接手并实证定位“仿真恒为 0” | 真根因是 `rst_n` 低有效复位被默认激励恒置 0；stride 问题真实存在但不是恒 0 根因 |
| 2026-08-31 | 仿真链路修复与常见信号预填 | `e2e-sim` 固化，时钟/复位预填，主题改浅色 |
| 2026-09-01 | 解混淆核心完成 | `wavepaint.clean.js` 33K 行可维护源码，1:1 复刻验证 |
| 2026-09-02 | 分层重构完成 | `__core`/`wpf`/`editor`/`sim` 体系建立，历史 hack 清零 |
| 2026-09-03 | 私有 divisor 与交互收口 | 全链路统一 stride 口径，`parseValue` 成为唯一入口 |
| 2026-09-04 | 批次1~10 完成 | 文件菜单、实时预览、DUT 回显、顶层选择、版本显示、launcher 自愈 |
| 2026-09-08 | 参数化位宽修复 | 位宽算术交给 iverilog，regression 49/49 |
| 2026-09-09 | 记忆体系重构 | 所有跨 AI 记忆统一收敛到 `memory/` |
| 2026-09-09 | #75 Verdi 借鉴 P0 完成 | CM6 代码视图 + RTL Tree + VCD 全路径索引；regression 58/58、e2e-rtl 9/9、exe 已重建 |

---

## 3. 已完成主线

1. **解混淆与重构**
   - 还原核心引擎并保持原版行为。
   - 建立 `core/editor/sim` 分层，清除 6 类历史 hack。
2. **仿真链路健壮化**
   - 端口精确匹配、私有 divisor、参数化位宽、VCD 层次回填。
   - `e2e-sim` 与 `probe-param` 全绿。
3. **交互与编辑增强**
   - 整步/子步统一、值输入唯一入口、框选、快捷键、测量、生成器、模板。
   - 工程存取、实时预览、任意工具复制粘贴。
4. **交付与运维**
   - exe 自包含 iverilog，本地 HTTP 服务，自愈保活。
   - 版本号自查，旧副本隔离策略，单实例。
5. **记忆体系**
   - `.workbuddy`、`docs/attic`、旧总纲全部收敛到 `memory/`。

---

## 4. 当前进行中 / 待交接

### 4.1 ✅ 已完成：#75 Verdi 借鉴 P0（2026-09-09）

- **CM6 代码视图**：`tools/cm6-entry.js` esbuild 预打包为 `lib/codemirror.bundle.js`（305KB，挂 `globalThis.WPCm`）；`rtl-panel.installCodeEditor` 挂载；textarea 保留为数据镜像（display:none），旧读路径 `refs.sourceEditor.value` 不变；bundle 缺失自动降级纯 textarea。
- **RTL Tree**：`js/sim/rtl-nav.js` 纯函数复用 `parseVerilogDesign` 为 module/port/param/instance 定位「文件+行号」（注释抹平等长空格保行号）；点击行跳转源码（跨文件先切标签页），状态栏显示「已定位到 module …」。
- **VCD 全路径索引**：`js/sim/vcd-index.js` 纯函数把 `parseVcd` 产物转点分作用域树，信号 title = 完整路径（如 `tb.q`）；`state.vcd` 存最近一次成功解析结果，仿真失败时清空防过期展示。
- 接入点全部在 `ui-bridge.js`：`initSourceCodeView` / `setEditorText` / `jumpToEditorLine` / `refreshStructureTrees` / `refreshVcdTree`。

### 4.2 【下一步主线】#75 Verdi 借鉴 P1

**目标**
- 点变量 → 加波形（复用 `toNativeSignal` 注入链路）。
- 树 ↔ 代码双向跳转。
- 信号组入 `.wp` 工程。

**已有地基**
- P0 的 RTL 树 / VCD 层次树已能点击跳源码（跨文件）。
- `engine.js` 已解析模块、端口、参数、实例；VCD 带层次路径。
- P1 需处理：多实例歧义选择器、未 dump 信号提示、点信号加波形回调。

**建议顺序**
1. 先把「VCD/结构树信号行 → 加波形」的回调接到仿真面板。
2. 再做树 ↔ 代码双向跳转（代码行 → 反向高亮树节点）。
3. 最后做信号组写入 `.wp` 工程并回归存档。

---

## 5. 已知未排期方向

- 边缘对齐辅助线
- Ctrl+滚轮缩放增强
- 导出增强
- X 首现追溯
- 波形 diff
- VSCode 外接扩展

---

## 6. 近期重要结论（防遗忘）

- **stride 口径**：`stride = m_subStepCount + 1`，任何模块不得自推。
- **值解析**：唯一入口 `wpf.parseValue(raw, sig)`。
- **文件菜单**：核心按英文文本绑定，`file-menu.js` 必须按中文重绑。
- **新建工程**：必须就地重置 `document_wave`，禁止换对象。
- **参数化位宽**：TB 内嵌参数定义，最终由 iverilog 求值。
- **旧 exe 假象**：本地全绿但用户异常时，先查启动路径与版本号。
- **CM6 降级策略**：textarea 永远保留为数据镜像；CM 不可用只隐藏宿主，不影响任何旧逻辑。
- **行号真相源**：RTL/代码跳转行号一律按原始文件文本计算（注释抹成等长空格），不能从渲染后的 DOM 反推。
- **VCD 完整路径**：信号全路径 = 作用域点分 path + `.` + signal.name（`vcd-index.buildVcdHierarchy` 口径），P1/P2 直接复用。

---

## 7. 维护规则

每次任务开始/结束时，更新：
1. 本文件第 1 节状态快照
2. 第 4 节进行中/待交接
3. 当日日志 `memory/logs/YYYY-MM-DD.md`
4. 若需求变化，同步 `03-REQUIREMENTS.md`
