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
| 最近完成需求 | #81 Bug 自研修复（sim 瞬时离线自愈重试 / 添加信号图标消失 / 教程隐形重启拦截） |
| 最近完成文档 | #80 记忆体系重构（已完成，旧目录已删除） |
| 当前阻塞 | 无 |
| 下一步主线 | #76 Verdi 借鉴 P1（点变量加波形 + 双向跳转 + 信号组入 `.wp`） |
| 测试基线 | regression 58/58、e2e-sim 0 失败、probe-param 全过 |
| UI 基线 | e2e-rtl 9/9（#75 浏览器冒烟）；e2e-ui 35 项（环境正常时全绿）；probe-tutorial / probe-addbtn / probe-simfail 全过；真 exe 冒烟通过 |
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
| 2026-09-09 | #81 Bug 自研修复完成 | sim 瞬时离线自愈重试+45s 超时；添加信号按钮消失根治（教程 CSS/高亮）；教程隐形重启+键盘拦截拦截；exe 已重建 |

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

### 4.1 ✅ 已完成：#81 Bug 自研修复（2026-09-09，用户本轮交付）

用户报告：① 仿真服务“有可能不在线”；② 添加信号按钮图标“有时候会消失”。调查中又发现
③ 教程隐形重启（键盘拦截 + 给真实控件挂隐藏 class）。三个根因全部定位并修复：

- **Bug1 sim 瞬时离线**（`js/sim/ui-bridge.js`）：launcher 自愈（RestartServer）会造成
  “瞬时不可达窗口”，旧 UI 把窗口内被丢弃的请求一律误报“请重启应用”。修复 =
  `probeServerAlive()`（GET `api/ping`，800ms 超时）区分“进程死 / 自愈窗口”；
  `/api/sim` 挂 45s `AbortController`；网络失败且探活成功 → 自动静默重试一次
  （`simAutoRetried` 每次手动点击复位）；在线但请求未完成 → 准确定位超时/被丢弃。
- **Bug2 添加信号按钮图标消失**（`index.html`）：汉化 CSS 把 `.wp-tutorial-highlight`
  与瞬态教程元素一起 `display:none`，而教程 JS 把该 class 标到真实控件
  （`#add-signal-btn` 等）上 → 控件被永久隐藏。修复 = 隐藏列表移除该 class +
  防御规则保证真实控件（tool-btn/dropdown/menu-item/input）带高亮时仍可见可点。
- **Bug3 教程隐形重启**（`index.html` + `js/editor/file-menu.js`）：随机端口 ⇒
  localStorage 每会话全新 ⇒ 教程每次启动重跑（键盘拦截 + 高亮副作用）。修复 =
  `<head>` 内联脚本在 `clean.js` 前预置 `wavepaint_tutorial_done='true'`；
  `file-menu.js` 捕获阶段拦截「帮助→教程」，改弹中文提示，杜绝 `removeItem+queueTutorial`。

探针（`.e2e-tmp/`，gitignore 覆盖）与套件全部通过：probe-simfail 3 场景、probe-addbtn
全场景、probe-tutorial T1/T2、regression 58/58、probe-param、e2e-sim 0 失败、真 exe
冒烟通过。exe 已重建（C1）并核验 5 个特征串。完整过程见 `memory/logs/2026-09-09.md` 第三轮。

> 编号说明：用户会话里把本次任务称为「把 73 完成」，与台账 #73（参数化位宽，09-08 已
> 完成）数字相同但**不是同一件事**；为避免台账冲突，本 Bug 任务登记为 #81。

### 4.2 ✅ 已完成：#75 Verdi 借鉴 P0（2026-09-09）

- **CM6 代码视图**：`tools/cm6-entry.js` esbuild 预打包为 `lib/codemirror.bundle.js`（305KB，挂 `globalThis.WPCm`）；`rtl-panel.installCodeEditor` 挂载；textarea 保留为数据镜像（display:none），旧读路径 `refs.sourceEditor.value` 不变；bundle 缺失自动降级纯 textarea。
- **RTL Tree**：`js/sim/rtl-nav.js` 纯函数复用 `parseVerilogDesign` 为 module/port/param/instance 定位「文件+行号」（注释抹平等长空格保行号）；点击行跳转源码（跨文件先切标签页），状态栏显示「已定位到 module …」。
- **VCD 全路径索引**：`js/sim/vcd-index.js` 纯函数把 `parseVcd` 产物转点分作用域树，信号 title = 完整路径（如 `tb.q`）；`state.vcd` 存最近一次成功解析结果，仿真失败时清空防过期展示。
- 接入点全部在 `ui-bridge.js`：`initSourceCodeView` / `setEditorText` / `jumpToEditorLine` / `refreshStructureTrees` / `refreshVcdTree`。

### 4.3 【下一步主线】#76 Verdi 借鉴 P1

> 编号口径：台账中 P1 = #76（#75 是已完成的 P0）；此前 04/09 文档把 P1 误写成
> “#75 P1”，2026-09-09 第三轮已纠正。

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
- **教程 = 只留副作用**：汉化版隐藏教程 UI 后，教程重跑只剩“挂高亮 + 拦键盘”两类副作用；随机端口下 localStorage 每会话全新，必须在 `clean.js` 前预置 `wavepaint_tutorial_done`，并拦截「帮助→教程」菜单。
- **sim 失败先分死因**：`/api/sim` 失败必须探活区分「进程死 / 自愈窗口 / 在线但请求超时」；进程死才提示重启，自愈窗口自动重试一次，超时给准确文案。
- **自动化探测注意**：核心模态 Enter=Escape 会自行关闭；探测按键拦截必须先把弹窗关掉。`wpModalState` 是词法全局，`window.wpModalState` 取不到。
- **exe-smoke 端口文件**：按最近写入时间选 `WavePaintClean_port_*.txt`（残留旧文件的数字可能更大）。

---

## 7. 维护规则

每次任务开始/结束时，更新：
1. 本文件第 1 节状态快照
2. 第 4 节进行中/待交接
3. 当日日志 `memory/logs/YYYY-MM-DD.md`
4. 若需求变化，同步 `03-REQUIREMENTS.md`
