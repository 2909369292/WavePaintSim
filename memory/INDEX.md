# 📌 WavePaint 记忆中心（唯一入口）

> **任何 AI 新开对话，从本文件开始。**
> `memory/` 是项目全部跨 AI 记忆的唯一家园；其他目录不得再存放记忆文件。
> 旧目录 `.workbuddy/` 与 `docs/` 已删除，请勿再从其他位置接手记忆。

---

## 一、读我顺序

1. **`01-PROJECT.md`** —— 这是什么项目、架构如何、数据怎么流。
2. **`02-WORKFLOW.md`** —— 怎么干活、什么绝对不能做、验证门槛是什么。
3. **`03-REQUIREMENTS.md`** —— 需求台账，包含全部历史需求与状态。
4. **`04-PROGRESS.md`** —— 当前做到哪、下一步做什么。
5. **`09-HANDOFF.md`** —— 下一任 AI 交接页。

如需历史细节：

6. **`05-LOGS.md`** —— 每日日志索引。
7. **`06-PITFALLS.md`** —— 历史坑库。
8. **`07-DECISIONS.md`** —— 关键技术决策。
9. **`08-ROADMAP.md`** —— 路线图与远期方向。

---

## 二、记忆体系结构

| 文件 | 类型 | 何时更新 |
|---|---|---|
| `01-PROJECT.md` | 项目知识与架构 | 架构 / 口径变化时 |
| `02-WORKFLOW.md` | 工作流与硬性约束 | 流程 / 约束变化时 |
| `03-REQUIREMENTS.md` | 需求台账 | 每次新增或变更需求 |
| `04-PROGRESS.md` | 当前进展 | 每次任务开始 / 结束 |
| `05-LOGS.md` | 日志索引 | 每次工作后 |
| `06-PITFALLS.md` | 坑库 | 踩到新坑时 |
| `07-DECISIONS.md` | 技术决策 | 做出重要取舍时 |
| `08-ROADMAP.md` | 路线图 | 规划变化或完成阶段时 |
| `09-HANDOFF.md` | 交接说明 | 每次会话结束或暂停 |
| `logs/*.md` | 每日操作日志 | 每次工作新建或追加 |

---

## 三、维护铁律

| 触发 | 必须更新 |
|---|---|
| 修改任何代码 | `04-PROGRESS` + 当日日志 |
| 新增 / 变更需求 | `03-REQUIREMENTS` |
| 改动会被内嵌 exe | 另按 `02-WORKFLOW` C1 重建 exe |
| 踩到新坑 | `06-PITFALLS` |
| 做出重要取舍 | `07-DECISIONS` |
| 完成路线图项 | `08-ROADMAP` + `04-PROGRESS` |
| 交接 / 暂停 | `09-HANDOFF` |

---

## 四、禁止事项

- 禁止在 `memory/` 之外新建记忆目录。
- 禁止删除历史日志，只能追加或更新。
- 禁止只改代码不更新记忆。
- 禁止绕过 `01/02/04/09` 直接从旧目录接手。
- 禁止重做已完成的解混淆、重构、批次1~10。

---
*最后更新：2026-09-10（第十九轮：**#87② 落地 —— 模块/实例全部接口一键入波形（仿 nWave `Ctrl+4`）**；
**#76（B1~B5）+ #87①②③ 至此全部收口**）。两条硬口径：**触发键 = `Ctrl+Alt+4`**（**不是 `Ctrl+4`** ——
Chromium/Edge 把 `Ctrl+数字` 当浏览器级「切换标签页」加速键，页面收不到 keydown，与 `Ctrl+W` 同源，
见 06 P36）；**「全部接口」= 模块端口**（`kind === "port"`，`modulePorts` 按名去重），体内 `wire/reg`
仍走 B4 单点加入；目标作用域 = **例化路径**（顶层模块 → `tb.dut`），与 VCD 全路径同口径。
落点：`rtl-panel.js` `installCodeEditor` 第 7 参 `onAddScope` + 触发块统一 `request(via,event,handler)`
（未接线的手势**静默放过、不吞事件**）+ 捕获阶段 `Ctrl+Alt+4`
（`key==="4"||code==="Digit4"||code==="Numpad4"`）；`ui-bridge.js` 浮层泛化
`openPicker(title,items,anchor,mode)`（B4 `mode="symbol"` 选项文本口径不变）+ `showScopePicker`
(`mode="scope"`) + `moduleScopes`/`modulePorts`/**`addVcdPathsToWave`**（**批量、只 render 一次**、
三桶 `added/existed/missing`、**不设状态栏**）/`modulePortsStatus`（唯一文案入口）/`addModulePortsToWave`/
`addModulePortsFromCode` + 三处提示追加 `Ctrl+Alt+4` + `__wpsim` 探针。**本轮修掉一个真 bug**：光标在
实例名上时**不能**用 `findSymbols` 命中项的 `moduleName` 查作用域（`buildSymbolIndex` 把实例符号的
`moduleName` 覆盖成「定义所在模块」，被例化模块名在符号上已丢）→ 改为按「**实例名后缀**」查
`index.instancePaths`。验证 regression **79/79** + e2e-rtl **61/61**（J0~J7：一次加 4 端口 / 幂等 /
同名两例化 `mode="scope"` 选择器 / 实例名直加 / `Ctrl+Alt+4` 与 `Ctrl+Alt+W` 同链路 / **只按 `Ctrl+4`
不触发** / 探针 + RTL 树仍无端口行 / `addVcdPathsToWave` 三桶）+ e2e-ui 73/73 + e2e-sim 0 失败 +
probe-param 全过 + 真 exe 冒烟通过，exe 重建 `22:49:32`（`v0.4.0 build 2026-09-10 22:49:32 a201338`，
`a201338` = **构建时 HEAD**，不代表落后）；**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9 守住）。
新增 04 §4.17、06 P36、07 D19、08 §1.3、03 表 F/H #87 状态（①②③ 全部落地）、09 全篇切第二十轮、
`05-LOGS.md` 索引、`memory/logs/2026-09-10.md`「第十九轮」。同轮序列：第十八轮 #76 B5、第十七轮 #76 B3、
第十六轮 #76 B4、第十五轮 #76 B1、第十四轮 #86 A1~A4、第十三轮服务在线性根治。
**下一项 = 侧栏 / 整体 UI 重构设计方案**（08 §2，**先出方案给用户 review，不直接开工**）；
#84/#77 仍为远期。维护者：任何接手的 AI。*
