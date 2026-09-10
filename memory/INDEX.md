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
*最后更新：2026-09-10（第十八轮：**#76 B5 落地 —— 画布观察行随 `.wp` 工程存档与恢复**；
**#76 至此收口：B1 ✅ + B4 ✅ + B3 ✅ + B5 ✅**，B2 已按第十二轮口径撤销）。`ui-bridge.js` 存档桥由
「源码桥」**泛化**为 `injectArchiveFields(json, fields)`（文本拼接口径不变）+ `archiveSimWatches`
（**只存找回元数据** `{path,name,width,reference}`）+ `applyArchivedExtras`（坏载荷静默 → **先清
`vcd`/`outputs`/`simWatches`（画布换人）** → 恢复源码 → 恢复观察行 → 面板就绪则刷新 + 状态栏合并
文案）+ `applySourceFilesFromArchive`/`applySimWatchesFromArchive`/`adoptArchivedWatchRows`
（「行名 == 观察路径」认领 + 补回 `width`/`kind`/`msb`/`lsb`，幂等）+ `syncSimRows`「**无 VCD 时
回退工程带回来的行**」+ `resetSourceFiles` 「新工程全复位」+ `__wpsim.designSignalNames` 探针。
**信号组无需另存**（核心已逐字段存还原，`GroupManager` 纯函数派生）。验证 regression **79/79** +
e2e-rtl **52/52**（I1~I6：存档含 `simWatches`、载入回注入语义 + 位宽补回、观察行不进激励、新建全
复位、反复往返 + 旧工程兼容、坏 JSON 不抛）+ e2e-ui 73/73 + e2e-sim 0 失败 + probe-param 全过 +
真 exe 冒烟通过，exe 重建 `22:23:52`（`v0.4.0 build 2026-09-10 22:23:51 5ec07e7`，`5ec07e7` = **构建时
HEAD**，不代表落后）；**未改 `wavepaint.clean.js` 与 `sim/engine.js` 一行**（C9 守住）。新增
04 §4.16（§1 快照 + §2 时间线补记第十七/十八轮 + §4.4 #76 收口 + §6 补 B5 口径）、06 P35（观察行随
工程存档三坑）、07 D18（B5 存档口径）、03 表 F/H #76 状态（**B1~B5 全部完成**）、08 文件头/§1/§1.2
（B5 ✅ + #87② 开工点）、09 全篇切第十九轮、`05-LOGS.md` 索引、本页脚、`memory/logs/2026-09-10.md`
「第十八轮」。同轮序列：第十七轮 #76 B3、第十六轮 #76 B4、第十五轮 #76 B1、第十四轮 #86 A1~A4、
第十三轮服务在线性根治。**主线下一项 = #87②**（模块全部接口一键入波形，仿 nWave `Ctrl+4`）；其后
侧栏/整体 UI 重构为并行方案线（08 §2，**先出方案给用户 review**）；#84/#77 已推迟远期。
维护者：任何接手的 AI。*
