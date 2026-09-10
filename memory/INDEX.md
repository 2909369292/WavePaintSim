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
*最后更新：2026-09-10（第十七轮：**#76 B3 落地 —— 代码 ↔ 树双向跳转（代码光标 → RTL/VCD 树
反向高亮，仿 Verdi nTrace「光标即高亮」）**，**纯视觉、零副作用**：`rtl-panel.js` 新增
`rowMatchScore`/`pickRtlRowIndex`/`datasetToRtlRow` + `highlightRtlRow`/`highlightVcdSignal`
（清旧 → 加 `.rtl-active`/`.vcd-active` → 展开祖先 `<details>` → `scrollIntoView`）+
`installCodeEditor` 第 6 参 `onCursorMove`；`ui-bridge.js` `syncActiveFromCode`（`moduleAtLine`
模块行 / 实例名 → 实例行 / `resolveSymbolVcdPaths` **唯一才亮**、歧义不猜、无目标清空）+
180ms 防抖 + `applyActiveHighlight`/`clearActiveHighlight`（**树重建后重放**），`gotoSource()`
末尾闭环；`index.html` 只加两条高亮 CSS（无新面板）。验证 regression **79/79** + e2e-rtl
**46/46**（H1/H2/H3/H4/H4b/H5/H6）+ e2e-ui 73/73 + e2e-sim 0 失败 + probe-param 全过 +
真 exe 冒烟通过，exe 重建 `22:06:08`。新增 04 §4.15（§2 时间线补记第十七轮）、
`06-PITFALLS.md` P34（反向高亮五坑）、07 D17（代码 → 树反向联动口径）、03 表 F/H #76 状态
（B1 ✅ + B4 ✅ + B3 ✅，下一顺位 B5）、08 文件头/§1/§1.2（B3 ✅ + B5 开工点）、
09 §1/§3/§4/§5/§6/§7/§9、`memory/logs/2026-09-10.md`「第十七轮」、`05-LOGS.md` 索引。
同轮序列：第十五轮 #76 B1、第十六轮 #76 B4、第十四轮 #86 A1~A4、第十三轮服务在线性根治。
**主线下一项 = #76 B5**（信号组/观察行随 `.wp` 工程存档与恢复）；其后 #87②（模块全接口
Ctrl+4）；侧栏/整体 UI 重构为并行方案线（08 §2）。
维护者：任何接手的 AI。*
