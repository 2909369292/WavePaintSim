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
*最后更新：2026-09-11（第二十一轮：**侧栏「可拖拽多面板」落地 —— 用户对第二十轮 UI 方案拍板后
的首轮 UI 实施**）。三条裁决：① 面板形态 = **可拖拽多面板**（splitter）；② 侧栏**保持右侧**
（`#main-area` 骨架不动）；③ 层次树**暂不左置**。**一次性落地 08 §2.6 的 P0+P1+P2 核心**：
新增 `js/sim/panel-layout.js`（卡片折叠 / 像素权重高度 / `measureMinHeight` 保护 / 纵向 splitter /
宽度 clamp `280~min(760,视口*60%)` / **持久化只走 sessionStorage**（key
`wavepaint.sim-panel-layout.v1`，**绝不进 `.wp`**）/ 键盘可达）+ `index.html`（CSS `--sim-panel-w`
+ DOM 卡片化：4 个 `section.sim-card[data-sim-card]` + 3 个 `.sim-split[data-sim-split]` +
`#sim-resize-x`；`#sim-status` 吸底；`#sim-tb-copy` 移进 TB 卡片头）+ `ui-bridge.js`（接线 +
删 `refs.collapseBtn` 死引用与 `bindEvents` 死分支 + `initPanelLayout()` + `__wpsim` 探针）+
`rtl-panel.js`（`installCodeEditor` 增 `remeasure()`）。**契约面 24 个 id / class / dataset / 状态类
一个未改**。**修掉一个真 bug**：矮视口 `750x485` 下源码卡只剩 80px、`.source-toolbar`（170px）
被 overflow 裁掉 → 坐标点击 `#sim-run` 落到 VCD 卡 → **「点仿真无响应」**；修复 = `measureMinHeight`
（`min(实测内容高, 面板可视高*0.8)`）+ `.sim-panel-body{overflow-y:auto}` + `#sim-status` 吸底
（`.e2e-tmp/verify-recovery2.mjs` **17/17**）。验证全绿：regression **79/79**、e2e-ui **86/86**
（+I0~I8 共 13 条，404=0/异常无）、e2e-rtl **61/61**（404=0/异常无）、e2e-sim 0 失败、probe-param 全过、
真 exe 冒烟通过、`build.ps1` `csc exit: 0`+`res count: 52`（仍 UTF-8 BOM）；exe 重建 **22,012,416 B /
2026-09-11 00:15:01**、`version.txt` = `v0.4.0 build 2026-09-11 00:15:01 69b84d0`（`69b84d0` =
**构建时 HEAD**，承载本轮代码的 commit 是它的下一个）；C8 特征串全 >0。
新增/更新记忆：04 §4.19 + §1/§2 快照、08 §2.2/§2.6、07 **D20 升级 + D21 新增**、09 §3 全篇切
第二十一轮、03「其它规划 / 侧栏 UI 重构」段、`05-LOGS.md` 索引、`memory/logs/2026-09-11.md`。
**下一项 = 08 §2.6「⏳ 剩余（可选/暂缓）」**（VCD 树移入波形区 / TB 控制带收敛 / 层次树左置），
**开工前先与用户确认范围与优先级**；#84/#77 仍为远期。维护者：任何接手的 AI。*
