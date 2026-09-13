# WavePaint · UI / 前端交接文档

> **这份文档是给"外部 UI / 前端 Agent"的唯一权威规格。**
> 读完它你应该能：知道这是什么项目、哪些文件可以动、目标界面长什么样、哪些东西一个字都不能改、
> 怎么跑起来、怎么自检、怎么交付。文档里的每一条数字/行号/命令都来自仓库实测，可复算。
>
> 适用版本：`main` @ `b4f90a5`（2026-09-13）。若你拿到的仓库 HEAD 与此不同，请以仓库内
> `memory/` 目录的最新记录为准，并把差异在汇报里列出来。
>
> 配套文件：`docs/ui-agent/PROMPT.md`（给 Agent 的入口提示词）。

---

## 目录

- [0. 30 秒读懂（TL;DR）](#0-30-秒读懂tldr)
- [1. 项目简介与事实卡](#1-项目简介与事实卡)
- [2. 你的职责范围与写入边界](#2-你的职责范围与写入边界)
- [3. 环境、运行、构建](#3-环境运行构建)
- [4. 目标 UI 规格（仿 Verdi 四区工作台）](#4-目标-ui-规格仿-verdi-四区工作台)
- [5. 波形区 / 代码区 = 1:1 照搬（铁律）](#5-波形区--代码区--11-照搬铁律)
- [6. 冻结契约面（不得改名 / 不得移除）](#6-冻结契约面不得改名--不得移除)
- [7. 交互红线](#7-交互红线)
- [8. 可复用资产清单](#8-可复用资产清单)
- [9. 硬约束（C 线 / D 线）](#9-硬约束c-线--d-线)
- [10. 验收口径与自检命令](#10-验收口径与自检命令)
- [11. 故意不做 / 已知未做（别当成 bug 去修）](#11-故意不做--已知未做别当成-bug-去修)
- [12. 术语表](#12-术语表)

---

## 0. 30 秒读懂（TL;DR）

| 问题 | 答案 |
|---|---|
| 这是什么？ | **WavePaint**：画波形当激励 → 本地 iverilog 编译运行 → 波形画回画布。一个"可画的仿真器"。 |
| 我这次做什么？ | 把工作台外壳做成 **Verdi 式可停靠多面板 + 可滑动分隔条**，交付 `WavePaintMockup.exe` 给用户 review。 |
| 在哪里做？ | **`prototype/` 沙盘**（零后端、零依赖、不进真机 exe）。 |
| 什么绝对不能碰？ | 波形画布 / 代码编辑器 / 菜单栏 / 工具带的**外观与 DOM**（1:1 照搬）；`index.html`、`js/`、`css/`、`lib/`、`img/`、`memory/`。 |
| 唯一验收口径？ | **用户双击 `WavePaintMockup.exe` 亲自拖一遍，说"可以"**。不是截图，不是设计稿，不是链接。 |
| 最容易踩的坑？ | ① 拖动预览 ≠ 最终落位；② 缓存了 DOM 引用导致重建后拖不动；③ 手改了自动生成的 `ui-mockup.html`。 |

---

## 1. 项目简介与事实卡

### 1.1 一句话

**WavePaint = 波形绘制工具 + 本地 Verilog 仿真器 + 波形查看器**，三合一，最终以「双击即开的 exe」交付。
用户的核心诉求是：*"我最终想实现的就是一个画波形的、可以直接进行仿真的仿真器"*，
UI 目标是*"像 Verdi 一样有波形窗口、代码窗口、代码树窗口，并且像 Word 一样自由排列组合、自由拖拽"*。

### 1.2 事实卡（2026-09-13 实测）

| 项 | 值 |
|---|---|
| 仓库根 | `D:\Files\Code\波形` |
| 分支 / HEAD | `main` / `b4f90a5` |
| 远端 | `https://github.com/2909369292/WavePaintSim.git` |
| 系统 / 终端 | Windows + PowerShell 5.1（**不是 PowerShell 7**） |
| Node | v24.20.0（**没有 Python**，脚本一律用 `.mjs`） |
| 真机 exe | `WavePaintClean.exe`（22,015,488 B；`v0.4.0 build 2026-09-13 16:52:06 83fab85`） |
| 原型 exe | `WavePaintMockup.exe`（1,709,056 B；`v0.4.0-mock build 2026-09-13 18:55:12 b93ad07`） |
| 前端技术 | 原生 HTML/CSS/JS + ES Module，**零构建、零打包器**；CodeMirror 6 在 `lib/`；波形画布是原生 `<canvas>` |
| 后端技术 | `WavePaintLauncher.cs`（单文件 C#，`HttpListener` 本地服务，首选端口 **17817**） |
| 打包方式 | `csc.exe`（.NET Framework 4.0 编译器）+ `/resource:` 把前端文件内嵌进 exe；启动器再把内嵌资源当 HTTP 静态资源提供 |
| 仿真链路 | 前端 → `/api/sim` → iverilog 编译 → vvp 运行 → VCD 文本回传 → 解析成画布观察行（**已闭环**） |
| 服务身份判活 | `/api/ping` 返回 `WAVEPAINT-SERVICE` 标识 + 端口 + 构建戳 |
| 限制 | 单次仿真 30s 超时；请求体上限 8 MiB；无 Verilator / 无 FSDB / 无增量仿真（远期） |

### 1.3 目录地图（谁负责什么）

| 路径 | 作用 | 你（外部 UI Agent）能否写 |
|---|---|---|
| `index.html` | 真机唯一页面：菜单栏 + 工具带 + 波形区 + 仿真侧栏 | ❌ **只读** |
| `css/wavepaint.e7b903ef.css` | 真机主样式表（**文件名带 hash，不许改名**） | ❌ 只读 |
| `js/` | 真机逻辑（`js/sim/*` 仿真、`js/wavepaint.clean.js` 绘制、`js/sim/engine.js` 核心） | ❌ 只读 |
| `lib/` | 第三方库（CodeMirror 6 等） | ❌ 只读 |
| `img/` | 图标（svg + `app.ico`） | ❌ 只读（原型会以 `../img/` 复用它们） |
| `prototype/` | **零后端 UI 原型沙盘 = 你的主战场** | ✅ **可写** |
| `tools/` | 开发服务器 + e2e 测试 + 原型页生成器 + 控件审计 | ❌ 只读（生成器尤其别改） |
| `memory/` | 项目记忆（10 个文件） | ❌ 只读（由主 Agent 维护） |
| `WavePaintLauncher.cs` + `build.ps1` | 真机打包 | ❌ 只读 |
| `MockupLauncher.cs` + `build-prototype.ps1` | 原型打包 | ❌ 只读（但你要**运行**它） |
| `docs/ui-agent/` | 本交接文档 | 只读（要补充就另开文件） |

### 1.4 `prototype/` 里有什么（你会天天打交道）

| 文件 | 大小 / 行数 | 性质 | 说明 |
|---|---|---|---|
| `prototype/ui-mockup.html` | 64,658 B / 1,133 行 | **自动生成，禁止手改** | 由 `tools/gen-mock-page.mjs` 从真机 `index.html` **逐字**复制 + 机械替换路径 + 追加原型外壳 |
| `prototype/mock-tail.html` | 6,522 B | 手写 | 原型独有外壳：工作区宿主 `#workbench`、`#mk-park` 暂存区、底部状态栏、帮助浮层、拖拽引擎引用 |
| `prototype/ui-mockup.js` | 45,417 B | 手写 | 轻量停靠引擎：布局树（split/tabs）、8 个面板、3 套预设、四向停靠、浮出、分隔条、localStorage 持久化 |
| `prototype/ui-mockup.css` | 17,013 B | 手写 | 原型外壳样式（**只在最后覆盖，不改真机原生规则**；类名统一 `mk-` 前缀） |

---

## 2. 你的职责范围与写入边界

### 2.1 你要做的（本阶段）

**只做"外壳"**：把已经存在的 8 块内容，装进一套可停靠 / 可拖拽 / 可滑动分隔的多面板系统里。
你交付的是**纯前端、零后端、可双击运行的 `WavePaintMockup.exe`**，供用户 review 布局形态与交互手感。

分两阶段，**本阶段只做第 1 阶段**：

| 阶段 | 内容 | 触发重建真机 exe？ | 何时开始 |
|---|---|---|---|
| **阶段 1（本次）** | `prototype/` 沙盘里的停靠系统 + 工具带 + 状态栏 | 否 | 现在 |
| **阶段 2（接线到真机）** | 把沙盘验证过的骨架搬进 `index.html` + `js/sim/dock/*.js` | **是** | **只有在用户明确说"原型 review 通过，开始接线"之后** |

> ⚠ 没有用户明确授权，**不要动真机任何文件**。阶段 2 的规格本文档也写了（第 4/6/9 节），
> 你可以按它设计接口，但不要提前实施。

### 2.2 你的写入清单（白名单）

```
prototype/**                       ← 主战场，可自由改写 / 新增
docs/ui-agent/**                   ← 可新增补充说明文件（不要改本文件）
```

### 2.3 禁止写入（黑名单，除非用户另行书面授权）

```
index.html                          ← 真机骨架，1:1 来源
css/**  js/**  lib/**  img/**       ← 真机资源，一律只读
memory/**                           ← 项目记忆，由主 Agent 维护
tools/**                            ← 测试与生成器（含 gen-mock-page.mjs）
build.ps1  WavePaintLauncher.cs     ← 真机打包链路
build-prototype.ps1  MockupLauncher.cs  ← 原型打包链路（只运行，不修改）
resources.txt  version.txt  mockup-version.txt  ← 构建产物/清单
```

> 这些文件里的 `.exe`、`resources.txt`、`version.txt`、`mockup-version.txt` 已进 `.gitignore`，
> 不要试图提交它们。

---

## 3. 环境、运行、构建

### 3.1 三条常用命令

```powershell
# ① 浏览器里调试原型（改完 prototype/ 立刻看效果；需常驻，请用支持 tty 的终端起）
node tools/dev-server.mjs 8961
#   然后浏览器打开 http://127.0.0.1:8961/prototype/ui-mockup.html

# ② 打包成可双击的 exe（用户 review 用）
taskkill /F /IM WavePaintMockup.exe      # ← 必须先杀，否则 csc 报 CS0016（文件被占用）
.\build-prototype.ps1                     # 看输出里 `csc exit: 0` 和 `res count: N`

# ③ 改过真机 index.html 骨架后，重新生成原型页（顺序：先生成，再打包）
node tools/gen-mock-page.mjs
```

### 3.2 打包脚本会做什么（`build-prototype.ps1`）

1. 写构建戳 `mockup-version.txt` = `v0.4.0-mock build <时间> <git短hash>`；
2. 把 `prototype/`、`img/`、`css/`、`js/`、`lib/` 下所有文件以「相对路径 = 逻辑名」内嵌进 exe
   （`img/css/js/lib` 是真机骨架 `../img`、`../css`、`../js`、`../lib` 的依赖，**必须一起内嵌**）；
3. 用 `csc /target:winexe` 编译 `MockupLauncher.cs` → `WavePaintMockup.exe`。

> 该脚本**不触发**真机的 C1 约束（它不写 `resources.txt`、不动 `version.txt`、不碰 `WavePaintClean.exe`）。

### 3.3 PowerShell 5.1 陷阱（会真的让你卡住）

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| `Get-Content` / `Set-Content` / `Out-File` | 把文件 **LF 改成 CRLF**，破坏行尾一致性 | 读写文本用 **Node**（`readFileSync` / `writeFileSync`，见 `gen-mock-page.mjs` 的写法） |
| 没有 `sed` / `wc` / `head` / `tail` | 命令直接报错 | 用 `rg` / `Select-String`，或写一个临时 `.mjs` 用 Node 切片 |
| `node -e "…"` 带中文 / 多分支 / 引号 | PowerShell 把内容拆成"命令"，报 `The term 'xxx' is not recognized` | **先把脚本写到 `.e2e-tmp\xxx.mjs`，再 `node .e2e-tmp\xxx.mjs`**（`.e2e-tmp/` 已 gitignore） |
| `Start-Process` 起后台服务 | 被环境策略拒绝 | 用支持 `tty` 的终端直接跑 `node tools/dev-server.mjs`（它自己会阻塞） |
| 正则里的 `"` 嵌套 | PowerShell 解析错误 | 同上：写 `.mjs` 文件，不要在命令行里拼字符串 |

### 3.4 测试脚本一览（改完必须跑）

```powershell
node tools/mock-probe.mjs        # 原型渲染 + 交互冒烟（会自己起 dev-server 8951 + headless Edge）
node tools/ui-audit.mjs --mock   # 控件规范审计（间距 / 尺寸 / 溢出），--mock 只看原型
node tools/mockup-exe-smoke.mjs  # 验证 WavePaintMockup.exe 内嵌的确实是当前快照
# 下面这条可以直接拿打包好的 exe 跑原型探针（不自己起服务）：
#   先运行 WavePaintMockup.exe /nolaunch /port=17899
#   $env:MOCK_BASE='http://127.0.0.1:17899'; node tools/mock-probe.mjs
```

> 真机套件（`regression.mjs` / `e2e-ui.mjs` / `e2e-rtl.mjs` / `e2e-sim.mjs` / `probe-param.mjs`）
> 在**阶段 1 不需要跑**（你不碰真机）。阶段 2 必须全绿。

---

## 4. 目标 UI 规格（仿 Verdi 四区工作台）

### 4.1 与 Verdi 的对照（设计参照）

Verdi 是本项目的**形态标杆**。对照关系如下（左 = Verdi 的概念，右 = 本项目落点）：

| Verdi 概念 | 本项目落点 | 备注 |
|---|---|---|
| nTrace（源码 / 层次浏览） | 面板 `rtl`（RTL 结构树）+ 面板 `source`（源码编辑器） | 二者拆成**两个独立面板**，可各自停靠 |
| nWave（波形查看） | 面板 `wave`（=`#main-area` / `#wave-canvas`） | **不改外观**，只搬进中央区 |
| nWave 的信号层次侧栏 | 面板 `vcd`（VCD 信号层次树） | 与波形数据相关，但**独立面板**（可左置） |
| Transcript / Console | 面板 `console` | 原型里是假数据 |
| 工具栏 / 菜单栏 | `#menu-bar` + `#toolbar` | **非 dockable**，永远吸顶 |
| 多窗口联动布局 | 四区 dock（LEFT / CENTER / RIGHT / BOTTOM） | 本项目用**页内浮动**替代 OS 多窗口 |

> ⚠ 与 Verdi 的**有意差异**（已有裁决，不要"纠正"）：
> ① 每类面板**只有唯一实例**（Verdi 可开多个 nWave 窗口）；
> ② 浮出 = **页内浮动面板**，不是 OS 独立窗口；
> ③ **不给波形面板加子工具带**（Verdi 有 nWave 自己的工具条，本项目明令不加）。

### 4.2 面板清单（8 个，id 固定）

| 面板 id | 标题 | 内容来源（真机 DOM 宿主 id） | 默认落区 |
|---|---|---|---|
| `wave` | 波形 | `#main-area`（内含 `#wave-view` / `#wave-canvas`） | CENTER |
| `source` | Verilog / SV 源码 | `#sim-card-source`（含 `#source-files`、`#verilog-source`、`#verilog-cm-host`、`#port-preview`、`#module-preview`、`#sim-top-row`、`#sim-top-select`） | RIGHT |
| `rtl` | RTL 结构树 | `#sim-card-rtl`（内含 `#rtl-tree`） | LEFT |
| `vcd` | VCD 信号层次 | `#sim-card-vcd`（内含 `#vcd-tree`） | LEFT（与 `rtl` 同组，Tab 切换） |
| `tb` | Testbench | `#sim-card-tb`（内含 `#tb-source`、`#sim-tb-copy`） | RIGHT（与 `source` 同组） |
| `console` | 控制台 | 原型新增（真机无对应节点，假数据） | BOTTOM |
| `files` | 源文件 | 原型新增（假数据） | LEFT |
| `props` | 端口 / 模块 | 原型新增（假数据） | RIGHT |

**关键原则**：面板 = **一个已经存在的 DOM 节点**。注册面板时**不复制、不重建节点，只搬父容器**
—— 这样 24 个契约 id 天然不变（第 6 节），迁移风险最低。

### 4.3 默认布局 = `sim` 预设

用户第一次打开时必须是这个形态（波形居中最大、树在左、代码在右、控制台在下）：

```
┌──────────────────────────────────────────────────────────────────────┐
│ #menu-bar（不可停靠）                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ #toolbar（不可停靠，全部功能控件的唯一归属）                            │
├──────────────────────────────────────────────────────────────────────┤
│ #workbench ← 停靠工作区                                               │
│ ┌───────────┬────────────────────┬──────────────┐                    │
│ │ LEFT      │ CENTER             │ RIGHT        │                    │
│ │ [rtl|vcd] │ [wave]             │ [source|tb]  │                    │
│ │ 宽 ≈19%   │ 宽 ≈55%            │ 宽 ≈26%      │                    │
│ ├───────────┴────────────────────┴──────────────┤                    │
│ │ BOTTOM：[console]                             │                    │
│ └───────────────────────────────────────────────┘                    │
│   floats：页内浮动面板层（绝对定位，默认空）                            │
├──────────────────────────────────────────────────────────────────────┤
│ #status-bar（三段只读）                                               │
└──────────────────────────────────────────────────────────────────────┘
```

当前原型里的布局树（可直接作为参考实现）：

```js
split('col', [0.74, 0.26], [
  split('row', [0.19, 0.55, 0.26], [
    tabs(['rtl', 'vcd'], 'rtl'),
    tabs(['wave'], 'wave'),
    tabs(['source', 'tb'], 'source'),
  ]),
  tabs(['console'], 'console'),
]);
```

另外两套预设（已有，保持可用）：

| 预设 | 快捷键 | 形态 |
|---|---|---|
| `sim` 仿真 | `Ctrl+Alt+1` | 波形居中最大（默认） |
| `edit` 编辑 | `Ctrl+Alt+2` | 源码居中最大，树在左，属性在右 |
| `review` 审阅 | `Ctrl+Alt+3` | 波形略缩，VCD 树激活 |
| 恢复默认 | `Ctrl+Alt+0` | 回到 `sim` |

### 4.4 可滑动组件（splitter）规格

用户明确批准"可滑动组件 + 左 / 中 / 右 / 底四区布局"，splitter 是本项目的核心手感，要求：

1. **位置**：任意两个相邻区之间；同区内也可以再切分（递归 split）。
2. **视觉**：默认 1px 细线，hover 加粗/变色，拖动中更明显；`cursor: col-resize`（竖）/`row-resize`（横）。
3. **命中区**：视觉 1px，但**可拖命中区至少 6px**（两侧各外扩 ~3px），否则用户抓不住。
4. **比例守恒**：三列/三行同时存在时，拖中间那条，**其余比例不变**（用比例数组重算，不要写死像素）。
5. **clamp**：单个面板最小 ~160×120 px；单个比例夹在 `0.08 ~ 0.92`；不允许拖到 0 宽（收起要走"隐藏/浮出"）。
6. **拖动期**：挂 `body.dock-dragging`（禁用文本选择、把光标设成 resize、可选：暂停波形画布重绘）；
   **松手后**统一重排一次（画布 resize + 编辑器 remeasure），不要每帧重排。
7. **键盘可达**：分隔条可聚焦，`ArrowLeft/Right/Up/Down` 每次 ±16px。
8. **⚠ 禁止缓存 DOM 引用**：面板会重建，分隔条节点也会重建。拖动时必须
   **每次现查活节点**（例如用 `[data-split-id="s-3"]`），并且监听挂在 `window` 上（含 `pointercancel`）。
   ——上一版就是踩了这个坑，导致"拖动时坐标对不上"。

### 4.5 拖拽停靠交互规格

| 动作 | 期望结果 |
|---|---|
| 按住页签拖到**另一面板中心** | 合并成同一个 Tab 组（成为其中一个页签） |
| 拖到**某面板内部的上/下/左/右边缘** | 在该侧切出新窗格（占该面板约 1/2） |
| 拖到**工作区最外环**（约 20px 环带） | 新建一整行 / 一整列 |
| 拖到工作区空白处 / 松开在非法区域 | **取消**，面板回原位（不许"消失"） |
| 中键点页签 / 双击页签 | 浮出为页内浮动面板 |
| 拖动浮窗标题栏 | 可重新停靠回任意区域 |
| `Esc` | 取消当前拖动 / 关闭菜单 |

**预览框必须 = 最终落位**：正确做法是「先用当前指针位置**模拟**一次布局变更（算出目标树），
再按目标树渲染预览矩形」，松手时提交同一棵树。
**不要**用"指针落在哪就画个示意框"的方式——那样预览与结果是两个独立的判断，必然不一致。

### 4.6 工具带（`#toolbar`）控件规范 —— 本项目铁律 R1~R9

> 全部功能控件**只放这一条顶栏**。这是用户明令（U0-R 裁决）："波形区的子波形区现在不添加功能栏，
> 功能栏仍旧放在统一的顶栏那里"。**不要**给任何面板加专属工具带。

| 规则 | 内容 |
|---|---|
| **R1 三层职责单一** | L1 应用工具带只放**跨面板**动作；状态栏只读、不放按钮 |
| **R2 同类动作唯一入口** | 同一动作全应用只有一个入口（尤其"运行仿真"） |
| **R3 主按钮唯一** | 任一时刻 `primary` 按钮 ≤ 1，且只能是**「运行仿真」** |
| **R4 尺寸三档** | 图标按钮 **28×28**（图标 16×16）；文本按钮 / 下拉 / 输入框高 **24**；工具带高固定（全局带 44） |
| **R5 间距只用刻度** | 组内 **4px**、组间 **12px**、带首尾 8px；**禁止组件自带 margin**，一律由父容器 `gap` 统一给 |
| **R6 禁止隐式溢出** | 工具带一律 `nowrap`；放不下时进 **`⋯` 溢出菜单**（按优先级从低到高整组收纳）；**禁止 `flex-wrap`** |
| **R7 图标必可读** | 每个图标按钮必须有 `title` + `aria-label`；禁用态用 `disabled` + `title` 说明原因 |
| **R8 不得被裁切** | 1280 / 1440 / 1680 / 1920 四档下，工具带内控件 `offscreen` 必须为空 |
| **R9 提示不进工具带** | 长文本（提示语、状态描述）一律放状态栏或面板头右侧；工具带只放**操作** |

**分组顺序**（从左到右，G8 右对齐）：

| 组 | 成员 |
|---|---|
| G0 运行 | **运行仿真（唯一 primary，常驻可见、必须始终可点）** |
| G1 文件 | 打开 / 保存 |
| G2 编辑 | 撤销 / 重做 / 剪切 / 画笔颜色 |
| G3 视图 | 缩小 / 放大 / 适应窗口 |
| G4 绘制 | 画笔 / 橡皮擦 / 选择（框选） |
| G5 状态 | 位状态 / 编辑力度（整步·子步）/ 进制（Dec·Hex·Bin） |
| G6 标注 | 箭头 / 时间段 / 标记 / 文本标注 |
| G7 对象 | 添加信号 / 选择对象 / 属性 |
| G8 时间 | 步数 / 子步数（`margin-left: auto` 右对齐，**永不被收进 `⋯`**） |
| ⋯ | 溢出菜单（收纳顺序 G7 → G6 → …） |

**刻度变量（直接可用）**：

```css
--ui-ctl-h: 24px;      /* 文本按钮 / 下拉 / 分段 / 输入框 */
--ui-icon-h: 28px;     /* 图标按钮（图标 16×16 居中） */
--ui-band-h: 36px;     /* 面板上下文带（本项目未启用，保留刻度） */
--ui-bar-h: 44px;      /* 应用工具带 #toolbar */
--ui-gap-in: 4px;      /* 组内 */
--ui-gap-out: 12px;    /* 组间（由 1px 分隔符 + 左右各 4px 承担） */
```

**⚠⚠ 关于工具带的两条最容易犯的错（务必读完）**

**错误一：重排 / 美化工具带。**
当前 `prototype/ui-mockup.html` 里的 `#toolbar` 是真机 `index.html` 的 **1:1 逐字复制**
（**21 个带 `.tool-btn` 类**的元素 + 原样的 `margin` / `gap` / 分隔符）。
所以它会**原样继承真机的间距问题** —— 这是**有意为之**（用户要求 1:1）。
审计规则 R5/R6/R8 **只在真机上判定，mock 原型豁免**。
**阶段 1 绝对不要为了让审计好看，去改原型的工具带 DOM / 间距 / 数量 / 顺序。**

**错误二：以为「运行仿真」已经在工具带里。**
实情：当前 `#toolbar` 里**没有**"运行仿真"按钮 —— 它现在叫 `#sim-run`，
位于面板 `source`（原仿真侧栏的源码卡片）里。
上面 G0~G8 的分组表描述的是**目标形态（阶段 2 / U3 才实施）**，
其中"运行仿真升为全局带唯一 primary"是**计划**，不是现状。
阶段 1 请**只保留真机原样**，不要提前把它搬进 `#toolbar`、也不要删掉 `#sim-run`。

### 4.7 状态栏（`#status-bar`，原型独有）

三段只读，从左到右：

| 段 | 内容 |
|---|---|
| 左 | 服务状态点 + 消息（承接真机 `#sim-status` 的语义） |
| 中 | 当前文件 / 当前 TB |
| 右 | 布局名 + 面板计数 + 布局菜单 + 帮助按钮 + 构建戳 |

> 构建戳（`mockup-version.txt` 的内容）必须显示出来，用户/测试靠它确认"看到的是不是最新构建"。

---

## 5. 波形区 / 代码区 = 1:1 照搬（铁律）

### 5.1 用户原话

> "我希望**完全照搬它的源码，做出 1:1 的效果**，只是原本是全屏的，现在是面板而已，
> **而不是按照预测的显示效果等进行复刻**。我要 1:1 完全一样的效果，完全一致的效果，起码波形显示区是这样的。"

> "现在已有的所有关于绘图的 UI **尽量不做改动**，现在的关于 UI 的代码应该不是混淆过的，**直接照搬即可**。"

### 5.2 因此：不许"重画"

以下四块**必须**是「真机同一份 DOM + 同一份 CSS + 同一份 JS」，只是被装进面板容器里：

1. `#menu-bar`（菜单栏，4 个菜单）
2. `#toolbar`（工具带，18 个 `.tool-btn` + 分隔符 + 下拉）
3. 波形区（`#wave-view` / `#wave-canvas`，908×609 那套）
4. 代码区（CodeMirror 6 挂载点 `#verilog-cm-host` + 兜底 `#verilog-source`）

**不允许**：用假 DOM 复刻一遍、改字号/颜色/行高/间距去"贴近效果"、用自绘 canvas 仿一个波形出来。

### 5.3 已达成 1:1 的实测证据（可复算）

| 比对项 | 结果 |
|---|---|
| 综合结构比对（真机 vs 原型，1680×1000 headless） | **13 项 same / 1 项 diff** |
| 唯一 diff | sim 卡片区内部的 DOM 顺序（真机 `[source,rtl,vcd,tb]` vs 原型 `[rtl,source,vcd,tb]`）—— 无害 |
| SAME 项 | `#menu-bar` / `#toolbar` 的 outerHTML 与矩形、菜单项(4)矩形、工具条子元素(**35**)矩形、CodeMirror 文本/行数/字体/颜色/背景、`verilog-source` 兜底、`rtl-tree` 前缀、`sim-status`、主题 CSS 变量 |
| 波形画布像素 diff | 908×609 画布：**78 / 552972 = 0.0141%**（只差网格虚线的抗锯齿亚像素） |
| chrome 带像素 diff | 1680×86：**0.4713%** |

### 5.4 黄金基线尺寸（1680×1000 headless；改布局后请复测）

| 元素 | 真机 | 原型 |
|---|---|---|
| `#menu-bar` | `left 0, top 0, w 1680, h 40` | 一致 |
| `#toolbar` | `left 0, top 40, w 1680, h 46` | 一致 |
| `#main-area` / `#workbench` | `top 86` | `#workbench` `top 86, h 888` |
| `#status-bar` | 真机无 | `top 974, h 26` |
| `#wave-view` | 908×609 | 一致 |
| `#wave-canvas` | 1540×609 | 一致 |

### 5.5 生成器口径（`tools/gen-mock-page.mjs` 做的三条机械替换）

原型页**不是手写的**。它 = 真机 `index.html` 全文 + 机械替换 + 追加外壳。三条替换：

1. **资源路径**：`css/` `js/` `lib/` `img/` → `../css/` `../js/` `../lib/` `../img/`
   （原型页在 `prototype/` 子目录，**URL 层级必须与真机一致**，否则 `js/sim` 的 ESM 相对 import 会 404）
2. **内联 module 说明符**：`'./js/sim/project-model.js'` → `'../js/sim/project-model.js'`
   （module 的 import 按**文档 URL** 解析，同样受子目录影响）
3. **插样式 + 追加外壳**：在真机 `<head>` 内联 `<style>` 之后插一行 `ui-mockup.css`；
   在 `</body>` 前追加 `prototype/mock-tail.html`

生成器自带自检：替换不完整、`<head>` 锚点找不到、`</body>` 找不到、产物开头不是 `<!DOCTYPE html>`
都会 `exit 1`。**改完真机骨架（或改完 `mock-tail.html`）必须重跑它，再跑 `build-prototype.ps1`。**

> 同理：`ui-mockup.css` **只在最后覆盖**（插在真机样式之后），只新增 `mk-` 前缀的规则，
> **不去改真机任何元素的原生规则**。

---

## 6. 冻结契约面（不得改名 / 不得移除）

> 这些选择器被 e2e 测试（`tools/e2e-rtl.mjs` **28 处**、`tools/e2e-ui.mjs` 4 处、`regression.mjs`、
> `e2e-sim.mjs`）和 `js/sim/ui-bridge.js`（`initRefs()` 里 `getElementById`）依赖。
> **你可以搬它们的父容器、改它们的尺寸/位置，但绝不能改名、移除、或被"新的等价元素"取代。**

### 6.1 id（24 个，全部必须存在且唯一）

```
sim-toggle-btn   sim-panel        sim-panel-header  source-files
sim-addfile      sim-import       sim-removefile    sim-parse
sim-addsignals   sim-tb           sim-run           verilog-source
verilog-cm-host  port-preview     module-preview    sim-top-row
sim-top-select   rtl-tree         vcd-tree          sim-tb-copy
tb-source        sim-status       sim-recover       app-version
```

### 6.2 class / dataset

```
.rtl-inst      .rtl-active      .vcd-signal-row  .vcd-active
[data-rtl-kind]  [data-vcd-path]
.tool-btn      .tool-btn[data-tool="…"]
.sim-symbol-picker-item
```

### 6.3 状态类

```
body.sim-open            ← 仿真栏展开态（#main-area 的 padding 随之变）
#sim-panel.collapsed     ← 仿真栏折叠态
wavedrom-debug-open      ← 调试面板开关
sponsors-ready / sponsors-collapsed   ← 已压制，⚠ 勿复用这两个名字承载新语义
```

### 6.4 属性

- VCD 信号行的 `title` = **全路径**（如 `tb.dut.q`）；e2e 按 `title` 找行。
- `#sim-status` 必须**常驻可见**；`#sim-run` 必须**始终可点**（历史上真出过"被裁到点不到"的 bug）。

### 6.5 你可以新增的

- 新的 `.dock-*` / `.mk-*` 容器、class、dataset（用于停靠系统本身）。
- **但不许**把冻结 id 换成 `.dock-*`，不许把 `#wave-canvas` 换成新 canvas。

### 6.6 面板宿主节点（阶段 1 里"被搬运"的真机节点）

```
wave   → #main-area
source → #sim-card-source
rtl    → #sim-card-rtl
vcd    → #sim-card-vcd
tb     → #sim-card-tb
```

搬走时**不要 `remove()`**：原型当前的做法是先摘到 `#mk-park`（`display:none` 的暂存区），
保证 `document.getElementById` 仍能命中、真机脚本不会因为"节点不存在"报错。**请沿用这个模式。**

---

## 7. 交互红线

以下 6 条是**用户已经明确否决过**的做法，重复一次就会被返工。**一条都不能违反。**

| # | 红线 | 用户原话 / 依据 |
|---|---|---|
| 1 | **不新增"信号层次选择框"**（不弹一个独立的层次树让你选信号） | "主要是对代码进行操作选择，**而不是单独给我一个框显示它的信号层次**（这是我不希望看到的）" |
| 2 | **不给 RTL 结构树加端口 / 信号行** | "我也不需要在 RTL 的结构树中看到端口信息" |
| 3 | **不恢复"点仿真后把所有可见变量全量灌进波形"** | "改变目前点击运行仿真之后，把所有可看的变量全都添加上去的做法" |
| 4 | **加信号的主路径 = 代码区里点/选中变量**（双击 / 右键 / `Ctrl+Alt+W`；多候选弹 `.sim-symbol-picker` 挂在**代码区旁**） | "直接在代码中点击变量名…就可以将其添加到对应的波形图中" |
| 5 | RTL 结构树的作用**仅仅是方便看代码层级**（点实例 → 跳源码） | "RTL tree 的作用仅仅是为了方便看代码层级" |
| 6 | **不要用 `Ctrl+W`**（Edge `--app` 模式会吞它当"关窗"）；整模块端口用 **`Ctrl+Alt+4`**（不是 `Ctrl+4`，浏览器会吞） | 实测踩坑记录 |

> 阶段 1 里你**不需要实现**红线 4 的功能（那是真机 `js/` 的逻辑，已实现）。
> 你只需要**不要在原型里引入违反它们的 UI 元素**（例如别"顺手"加一个信号选择树面板）。

---

## 8. 可复用资产清单

### 8.1 `prototype/ui-mockup.js` —— 已有的停靠引擎（**强烈建议在其基础上改，而不是重写**）

现成能力（都已能用）：

| 能力 | 实现要点 |
|---|---|
| 布局树模型 | `tabs(panels, active)` 叶节点 + `split(dir, sizes, children)` 容器节点；节点带**稳定 id**（`z-N` / `s-N`） |
| 3 套预设 | `presetSim()` / `presetEdit()` / `presetReview()`，按键 `Ctrl+Alt+1/2/3/0` |
| 面板登记表 | `PANELS`（8 项）+ `HOME_ZONE`（默认落区）+ `HOST_ID`（真机宿主 id 映射） |
| 停靠命中测试 | `hitTestOp(x, y, panelId)` → `{type:'tab'|'split'|'edge'}` |
| **预览 = 落位** | `simulateDrop(panelId, op)` 先算出目标树，`computeDrop()` 返回 `{tree, op}`，预览按树渲染 |
| 拖动引擎 | `startPanelDrag()`，监听挂 `window`，含 `pointercancel`；拖动期用模块级 `drag` 变量 |
| 浮出 / 最大化 / 收回 | `floats[id] = {x,y,w,h,max}` |
| 分隔条 | 像素↔比例互转，**不缓存 DOM**，按 `data-split-id` 现查 |
| 持久化 | `localStorage['wavepaint.mock.layout.v1']`，400ms 防抖 |
| 测试探针 | `window.__mock` = `{ PANELS, root, floats, visiblePanels, … }`（`mock-probe.mjs` 靠它断言） |
| 暂存区 | `#mk-park`（`display:none`），摘下的真机节点挂这里，**绝不 remove** |

> ⚠ 改了 `window.__mock` 的**导出结构**会让 `tools/mock-probe.mjs` 的断言失效。
> 如果你要改，请**同时**在汇报里说明"哪几条断言需要更新"，并给出新的探针用法。

### 8.2 主题变量

原型主题变量**逐条抄自**真机 `css/wavepaint.e7b903ef.css` 的 `:root`。
**不要重新配色**——主题必须与真机一致，用户已经确认过配色。

### 8.3 类名前缀约定

- 原型新增的所有 class / id / CSS 变量：**统一 `mk-` 前缀**（`mk-park`、`mk-tab`、`mk-drop`、
  `mk-floats`、`mk-menu`、`mk-st-dot`、`mk-version`…）。
- 目的：**与真机零冲突**，并且一眼能看出"这是原型外壳还是真机内容"。
- 你新增的停靠系统如果最终要搬进真机（阶段 2），建议改用 `.dock-*` 前缀，与 `mk-` 区分开。

### 8.4 帮助浮层

`#help-overlay` / `#help-box` 是原型自带的"操作说明"浮层（右下角 `?` 按钮打开）。
**请保持它可用**，并**同步更新里面的说明文案**（用户会用它来了解怎么拖面板）。

---

## 9. 硬约束（C 线 / D 线）

> 这些是项目最高优先级的约束。阶段 1 里大部分用不上，但你**必须知道**，
> 因为阶段 2 会用它们验收，而且它们解释了"为什么有些看起来该改的东西不许改"。

### 9.1 C 线（全局硬约束）

| 编号 | 内容 |
|---|---|
| **C1** | 改 `js/`、`index.html`、`css/`、`img/`、`lib/`、`WavePaintLauncher.cs`、`build.ps1` → **必须重建真机 exe**（`taskkill /F /IM WavePaintClean.exe` → `.\build.ps1`，确认 `csc exit: 0`）。<br>`prototype/` + `tools/` + `memory/` + `docs/` **不进** `resources.txt`，所以阶段 1 **不触发 C1**。 |
| **C2 / C3** | 每批工作 = 独立 commit + push（不混提交） |
| **C8** | 每次重建 exe 后核验构建戳/特征串 |
| **C9** | **绝不改 `js/sim/engine.js`**（仿真核心） |
| **C10** | 唯一弹窗入口 `window.__core.prompt`（不许 `alert`/`confirm`） |
| **C17** | 改代码必须同 commit 同步记忆（阶段 1 由主 Agent 负责，你不用改 `memory/`） |
| **C19** | 服务在线性不变量：固定端口 + `/api/ping` 身份标识 `WAVEPAINT-SERVICE` + **禁止自动整页跳转** |

### 9.2 D 线（与 UI 直接相关的裁决）

| 编号 | 内容 |
|---|---|
| **D20 / D22** | 四区 dock 完整版（LEFT / CENTER / RIGHT / BOTTOM）；RTL / VCD 树默认落 LEFT；浮出 = 页内浮动；布局不写 `.wp` |
| **D26（1:1 口径）** | 原型继承真机原生间距/溢出特征；审计 R5 / R6 隐式溢出 / R8 **只在真机判定**（mock 豁免）；**绝不为迁就旧审计去改真机 DOM / 间距 / 工具带行为** |
| **D27（跨重建铁律）** | 拖拽等跨重建交互**禁止缓存 DOM 引用** → ① 用稳定 id ② 每次现查活节点 ③ 监听挂 `window`（含 `pointercancel`）④ 拖动态用模块级变量 ⑤ 松手统一 `render*()` + `persist()` |
| **U0-R** | 所有功能栏（保存/撤销/缩放/绘制/标注…）**统一只放 `#toolbar` 一条顶栏**；**波形区不加子功能栏**；已有绘图 UI 照搬不改 |

### 9.3 与后端/真机相关的边界（阶段 1 用不到，阶段 2 会用）

- 默认每类面板**保持唯一实例**。
- 布局持久化：`sessionStorage` 保底 + `localStorage` 跨会话；**默认不写 `.wp` 工程存档**。
- 搬动父容器后**必须**：重排 `#wave-canvas`（resize 钩子）+ CodeMirror `remeasure()`
  （历史上 CM6 的 `ResizeObserver` 有 <75ms 跳过保护，漏重排会错位）。
- 面板 DOM 移动**不得改 id / class / dataset / title**。
- 布局渲染**必须幂等**（`render(tree)` 可重复调用）。

---

## 10. 验收口径与自检命令

### 10.1 唯一验收口径

> **用户双击 `WavePaintMockup.exe`，亲自把面板拖一遍，说"可以"。**

这之外的一切（截图、录屏、设计稿、网页链接）**都不能代替它**。
用户曾经明确反馈过"提供的网页链接无法打开"，所以**必须交 exe**。

### 10.2 交付前必须全过的自检

```powershell
# 1) 原型渲染 + 交互冒烟（含布局体检 + 自动截图到 .e2e-tmp/）
node tools/mock-probe.mjs

# 2) 控件规范审计（只看原型）
node tools/ui-audit.mjs --mock

# 3) 打包 + 验证 exe 里嵌的确实是当前快照
taskkill /F /IM WavePaintMockup.exe
.\build-prototype.ps1
node tools/mockup-exe-smoke.mjs
```

### 10.3 手工验收清单（逐条自查，汇报时给出结论）

- [ ] 8 个面板全部可见、可拖、可停靠；默认形态 = `sim` 预设。
- [ ] 拖到**中心** = 合并 Tab；拖到**四条边** = 切分；拖到**最外环** = 新建整行/整列。
- [ ] **每种拖动的预览框 = 松手后的真实结果**（这是重点，逐一试）。
- [ ] 拖动页签时的"抓手/幽灵"显示正常（不闪烁、不残留、不改鼠标指针语义）。
- [ ] 分隔条能拖动、比例守恒、鼠标坐标与视觉位置**对得上**。
- [ ] 浮出 / 最大化 / 收回 / 拖回停靠 全部可用；`Esc` 能取消拖动。
- [ ] 刷新页面后布局保留；`布局 ▾ → 恢复默认布局` 能回到出厂状态。
- [ ] 波形画布在面板尺寸变化后**正确重绘**（不变形、不模糊、不裁切）。
- [ ] 代码区在面板尺寸变化后**正确重排**（行号对齐、选中不错位）。
- [ ] 1280 / 1440 / 1680 / 1920 四档宽度下，工具带控件**没有被裁掉**。
- [ ] 构建戳显示的是**最新一次构建**的时间。
- [ ] 帮助浮层文案与当前实际交互一致。

### 10.4 汇报格式

```
1. 关键约束复述（证明你读了本文档）
2. 疑问（无则写"无"）
3. 实施计划（分步）
4. 改动文件清单
5. 自检命令的实际结论（每条贴结果，别只写"通过了"）
6. 交付物绝对路径（尤其 WavePaintMockup.exe）
7. 已知不足 / 需要用户拍板的点
```

---

## 11. 故意不做 / 已知未做（别当成 bug 去修）

> 这一节的每一条都是**有意的**。改了会返工，甚至会被回滚。

| 项 | 状态 | 说明 |
|---|---|---|
| **真机 `#toolbar` 在窄窗口溢出的问题（P-UI-02）** | **未修，排期在后面** | 真机 1440 宽溢出 32px、1280 宽溢出 192px。修法已定（R5 间距刻度化 + R6 `⋯` 溢出菜单），但要动真机，**阶段 1 不做**。<br>⚠ 原型会**原样继承**这个溢出——**这是故意的**，不要去"顺手修好"。 |
| **G1~G8 仿真后端增强** | **整体暂缓** | TB 可编辑、编译日志/进度、编译选项、大 VCD、多顶层… 用户已明令"暂不实现"。 |
| **`#84` 波形查看增强 / `#77` Active Annotation / `#78` X 追溯** | **远期** | 不因 UI 重构而提前。 |
| **每类面板多开** | **不做** | 有意与 Verdi 不同（成本/收益考量）。 |
| **布局写进 `.wp` 工程存档** | **不做** | 只用 sessionStorage + localStorage。 |
| **真·OS 独立窗口（多窗口）** | **不做** | 会重踩"多窗口抢端口 / 收窗"的老坑；只做页内浮动。 |
| `#88~#92` 五项编辑体验优化 | **已完成，勿重做** | 编辑模式点 bus 误入框选 / 信号名标位宽 / 步进 ▲▼ ±1 / 步长变化 clock 填充 / 框选后点其它处自动提交。 |
| `#76 / #86 / #87` 加信号与源码导航 | **已完成，勿重做** | 符号索引、代码点变量加波形、代码↔树双向高亮、实例→模块跳转、磁盘导入源码、`Ctrl+Alt+4` 全接口入波形。 |
| 原型里 `console` / `files` / `props` 三块是假数据 | **有意** | 真机没有对应节点，用来演示更多窗格形态。 |
| 原型点"运行仿真"不会真的仿真 | **有意** | 原型已禁用协议唤醒，纯前端演示。 |

### 11.1 总排期（你在其中的位置）

| 顺序 | 批次 | 触发真机 exe | 预估 | 状态 |
|---|---|---|---|---|
| 1 | U0 原型控件重排 | 否 | 0.5 天 | ✅ 已完成 |
| 2 | U1 用户 review（闸门） | 否 | 等用户 | 进行中 |
| **3** | **← 你在这里：prototype 停靠系统成形 + 交付 mock exe** | 否 | — | **本次任务** |
| 4 | D0 + U2 面板注册表 + 宿主容器抽象 + 工具带 spec（像素级零视觉变化） | 是 | 1~1.5 天 | 待用户放行 |
| 5 | U3 真机工具带落地 + 修 P-UI-02 | 是 | 1 天 | 待 |
| 6 | D1 停靠引擎搬进真机（四区 + 拖拽 + Tab） | 是 | 2~3 天 | 待 |
| 7 | D2 页内浮动 + 最大化 + 键盘 | 是 | 1 天 | 待 |
| 8 | D3 持久化（session + 跨会话 + 3 预设 + reset） | 是 | 1 天 | 待 |
| 9 | D4 + U4 打磨 + 闸门工具化 | 否 | 1 天 | 待 |

---

## 12. 术语表

| 术语 | 含义 |
|---|---|
| **真机 / real** | 走 `index.html` + `js/` + `css/` 的正式页面；改动它会触发 C1（必须重建 `WavePaintClean.exe`） |
| **原型 / mock** | `prototype/` 下的沙盘页面；零后端、可自由改，**不触发 C1** |
| **面板 / panel** | 停靠系统的基本单位，共 8 个（wave / source / rtl / vcd / tb / console / files / props） |
| **停靠树 / layout tree** | `{kind:'split', dir, sizes, children}` 与 `{kind:'tabs', panels, active}` 组成的树 |
| **Tabs 组** | 同一格内多个面板合并成的页签组 |
| **浮出 / float** | 把面板变成**页内**绝对定位浮动面板（不是 OS 窗口） |
| **页内浮动** | 浮动面板仍活在同一页面 DOM 里 |
| **preset / 预设** | 一套预定义布局（sim / edit / review） |
| **splitter / 分隔条** | 可拖动的面板间分隔线 |
| **契约面** | 第 6 节那批 id / class / dataset / 状态类，e2e 与真机脚本依赖 |
| **1:1 照搬** | 波形区/代码区/菜单栏/工具带必须是真机同一份 DOM+CSS+JS |
| **C 线 / D 线 / U 线** | 项目的三类约束编号：C = 硬约束，D = 决策/裁决，U = 工具带规范化 |
| **闸门（gate）** | 必须用户确认才能进入下一阶段；本阶段的闸门 = 用户 review 通过 |
| **黄金基线** | 第 5.4 节那组尺寸，用来验证 1:1 是否被破坏 |

---

## 附录 A · 一页纸速查

```text
仓库        D:\Files\Code\波形        （Windows + PowerShell 5.1 + Node 24，无 Python）
我能写      prototype/**   docs/ui-agent/**（新增）
我禁写      index.html css/ js/ lib/ img/ memory/ tools/ *.ps1 *.cs

跑起来      node tools/dev-server.mjs 8961
            → http://127.0.0.1:8961/prototype/ui-mockup.html
改真机骨架  node tools/gen-mock-page.mjs   （会重新生成 prototype/ui-mockup.html，勿手改）
交 exe      taskkill /F /IM WavePaintMockup.exe ; .\build-prototype.ps1
自检        node tools/mock-probe.mjs / node tools/ui-audit.mjs --mock / node tools/mockup-exe-smoke.mjs

布局        四区 dock：LEFT(树) / CENTER(波形) / RIGHT(源码) / BOTTOM(控制台) + 可拖动分隔条
默认        sim 预设（波形居中最大）；Ctrl+Alt+1/2/3 切预设，Ctrl+Alt+0 复位
红线        不许重画波形区/代码区/菜单栏/工具带；不许手改 ui-mockup.html；
            不许给波形区加子工具带；不许缓存 DOM 引用；预览必须 = 落位
唯一验收    用户双击 WavePaintMockup.exe 拖一遍说"可以"
```

## 附录 B · 改完之后的完整命令序列（照抄即可）

```powershell
# 0) 如果改到了真机 index.html 的骨架（阶段 1 一般不会），先重新生成原型页
node tools/gen-mock-page.mjs

# 1) 浏览器里自查
node tools/dev-server.mjs 8961
#   （另开一个终端 / 或让用户开浏览器访问）
#   http://127.0.0.1:8961/prototype/ui-mockup.html

# 2) 自动自检
node tools/mock-probe.mjs
node tools/ui-audit.mjs --mock

# 3) 打包交付
taskkill /F /IM WavePaintMockup.exe
.\build-prototype.ps1
node tools/mockup-exe-smoke.mjs

# 4) 确认产物
Get-Item .\WavePaintMockup.exe | Select-Object Length, LastWriteTime
Get-Content .\mockup-version.txt
```

> 交付时请把 **`WavePaintMockup.exe` 的绝对路径** + **构建戳内容** + **每条自检命令的结论**一并汇报，
> 并说明"这一版验证了什么 / 还有哪些没做"。
