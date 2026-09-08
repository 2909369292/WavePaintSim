# WavePaint 需求清单（作为记忆 · 跨 AI 可同步更新）

> 本文件汇总项目所有已记录需求：需求内容、完成情况、实现思路/备注。
> **任何新增或变更需求后，必须同步更新本文件**（用户明确要求需求清单作为可同步更新的记忆）。
> 深度实现细节见每日日志 `2026-08-30.md`~`2026-09-04.md` 与 `docs/`；项目铁律与模块职责见 `MEMORY.md`。

图例：状态 = ✅已完成 / 🔄进行中 / ⬜未开始。优先级标注沿用原始排期（P1~P4 / R1~R8 等）。

---

## A. 功能需求（Features）

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #1 | 常见信号预填典型波形 | ✅ | 按信号类型给默认波形初值，降低手动绘制成本 |
| #2 | unbound 端口告警与结果诊断提示 | ✅ | 仿真后未绑定端口给中文可操作提示（engine.js "No module found."→中文） |
| #3 | 默认主题改为浅色背景 | ✅ | `feature-common.js` 启动 `applyTheme('light')` 只干预一次，尊重用户后续选择 |
| #18 | 总线编辑（选择工具输入值） | ✅ | 选择工具下对总线信号输入矢量值，经 `wpf.parseValue` 统一解析 |
| #19 | 总线进制右键菜单与显示修正 | ✅ | 核心右键菜单自带进制项；`refreshBusLabels` 按信号自身 radix 重算，不只读全局 |
| #21 | Clock 仿真跟随子步翻转 | ✅ | 时钟激励主步级 0101，子步翻转跟随（createPortStimulus 单一真相源） |
| #22 | D(13) 虚线渲染修复 | ✅ | 修复特定信号虚线绘制错位 |
| #23 | v0.3.0 R1：Bit 值输入弹窗 | ✅ | 位值输入走 `__core.prompt` 唯一弹窗入口 |
| #24 | v0.3.0 R2：写入粒度统一（整步/子步） | ✅ | 整步写满 stride 下标；子步只写命中；统一经 `wpf.cellsInRange` |
| #25 | v0.3.0 R3/R4：交互统一与撤销 | ✅ | 选区/值输入交互统一；撤销快照走核心 `pushUndoSnapshot` |
| #26 | v0.3.0 R5：与现有功能互不冲突 | ✅ | 回归守门，未破坏既有行为 |
| #27 | v0.3.0 R6-R8：预览/进制联动/非法提示 | ✅ | 输入预览、进制切换联动标签、非法输入红框重开 |

## B. Bug 修复（UI / 交互）

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #6 | Bug A：侧边栏收起后无展开入口 | ✅ | 收起态提供展开入口（#16 最终修复） |
| #7 | Bug B：侧边栏 UI 重新设计 | ✅ | 按钮汉化分组 + 状态文案统一中文（commit f3baaa8） |
| #14 | Bug C：清除左侧空白条 | ✅ | 去除侧边栏左侧空白条 |
| #15 | Bug B：清理侧边栏空框 | ✅ | 去除侧边栏空框 |
| #16 | Bug A：修复收起后展开入口 | ✅ | 闭包元素 `__closing` 判定，避免二次 removeChild 报错 |
| #17 | Bug D：任务栏图标 | ✅ | 配置 `img/app.ico` 任务栏图标 |
| #29 | 修复第二次仿真失败 | ✅ | 仿真状态/资源未清理导致二次失败，已修 |
| #30 | 框选视觉复用核心 range selection | ✅ | 选框绘制复用核心 `drawRangeSelection`（全局 stride），视觉==写入范围 |
| #31 | 修复拖动绘制漏格（拖出时钟） | ✅ | 拖出时钟区域漏格修复 |
| #32 | 恢复 select 工具原生蓝框在画笔工具下也出现 | ✅ | 工具切换时原生选区框正常显示 |
| #40 | 定位「添加信号」bug 根因 | ✅ | 值模型去位宽：删基于不存在 `sig.width` 的悬空逻辑 |
| #41 | 重写框选（selection）实现 | ✅ | selection.js 全量重写，globalSampleIndex 统一端点（详见 2026-09-03.md） |
| #42 | 修复仿真服务运行一段时间后"不在线" | ✅ | 加 `js/core/heartbeat.js` 心跳保活 + launcher 退出判据放宽 |
| #44 | 统一值解析实现（根治多 bit 写值变 0） | ✅ | 全链路唯一入口 `wpf.parseValue(raw,sig)`，删 width 幽灵判定 |

## C. 仿真链路

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #4 | 修 fuzzy 端口误配（P4） | ✅ | matchSignalsToPorts 精确两级匹配 + claimed 一对一（commit 1727bd8，regression 37 项） |
| #20 | 验证与提交 | ✅ | 仿真链路 e2e 0 失败 |
| #28 | 验证、构建与提交 | ✅ | 全量验证绿 + 重建 exe |
| #43 | wpf 增加按信号 divisor 的主步坐标换算 API | ✅ | `divisorOf(sig)` 支持私有 subSteps 行 |

## D. 解混淆 / 重构（开发内部，不在软件层面体现）

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #33 | 创建新项目并复制 UI 资产 | ✅ | 从混淆项目抽取 UI 资产到可维护项目 |
| #34 | 分析字符串数组与解码器结构 | ✅ | 定位 stringArray 解码器 `_0x55bf` + 工厂 `_0x3f97` + rotate IIFE |
| #35 | 编写解混淆脚本还原核心 | ✅ | `tools/deobfuscate.mjs` 三阶段（字符串还原 19090 处 / hex→十进制 / 格式化 33K 行），可重跑 |
| #36 | 真实浏览器验证 UI 完全一致 | ✅ | Edge headless + CDP，`toDataURL()` hash 像素级一致 |
| #37 | wpPrompt 统一入口：删 MutationObserver + zh DOM 拦截 | ✅ | 弹窗收编 `__core.prompt`，删 zh.js DOM 汉化与抑制器 |
| #38 | value-input.js 弹窗流程收编进 __core | ✅ | 外部模块不碰弹窗 DOM |
| #39 | valueToLabel/进制修复改核心内，删原型补丁 | ✅ | 标签唯一实现入核心 `valueToLabel` |
| #45 | 定位「修复没生效」根因：隔离旧 exe 副本 + 加固构建脚本 | ✅ | 三个旧 exe 副本重命名 `*.stale`；build.ps1 产物绝对路径 + csc 失败 throw（50fafd3） |

## E. 项目治理（git / 记忆 / 构建 / 清理）

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #10 | 回退本轮工作区改动 | ✅ | 需要时回退 |
| #11 | 重建 WavePaint.exe 并验证 | ✅ | 重建 + exe-smoke |
| #12 | 撰写给下一位 AI 的详尽交接计划 | ✅ | 形成 MEMORY.md 雏形 |
| #13 | 提交回退并纳入交接文档 | ✅ | |
| #46 | 迁移项目记忆到主项目 | ✅ | `WavePaintSim/.workbuddy/memory/*` → 根 `.workbuddy/memory/*` |
| #47 | 把 WavePaintClean 内容 git mv 到仓库根 | ✅ | 仓库根即项目本体（79 文件） |
| #48 | 删除死项目（回收站/隔离区） | ✅ | 死项目隔离到 `D:/Files/Code/.trash-20260904/`，可恢复 |
| #49 | 盘点根目录与 WavePaintClean 文件冲突 | ✅ | 解决重名冲突 |
| #50 | 提交 WaveWorkbench 未提交改动 | ✅ | 清理前快照 `59ad00c`（独立 git） |
| #51 | 强推 main 到 GitHub | ✅ | `git push -u origin main --force` |
| #52 | 验证最终状态 | ✅ | 远程 main=3aa227b，tags 保留，无新 release |
| #53 | 提交重构并本地 master→main | ✅ | 统一为 main |
| #54 | 从软件 UI 去除"解引用/clean"强调字眼 | ✅ | README 去"解混淆+重构"标题与 `## 解混淆` 段；运行 UI 本就无强调；解引用仅留记忆 |
| #55 | 整理项目文件结构与梳理 | ✅ | 零散构建日志归入 `logs/`；README 目录结构更新（无子项目目录） |
| #56 | 整理重要记忆为单一文件 | ✅ | 本目录 `MEMORY.md` 重写为跨 AI 记忆总纲（含项目定位/铁律/模块职责） |
| #57 | 整理需求列表并作为记忆 | ✅ | 本文件 `REQUIREMENTS.md` |
| #58 | 跨 AI 记忆落地并同步 git | ✅ | MEMORY.md/REQUIREMENTS.md 自包含；本轮改动提交并 push main |

## F. 正确性收口 + 体验补强 + 永不掉线（2026-09-04 大轮，批次1~10）

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #59 | 私有 divisor 模型全链路收口 | ✅ | resize 按每信号 divisor 重建+锚点重映射；generator/templates 用 `wpf.stride()`（修 (x\|\|1)+1 复活 bug）；sim 采样按 signalDivisor + cellStride；engine NaN 防御（Math.max(1,NaN)=NaN 曾致 #NaN TB） |
| #60 | 值解析统一（唯一入口 wpf.parseValue） | ✅ | 位串分支不再遮蔽纯 0/1 十进制；纯数字按信号 radix 解读（hex→16进制、bin 0/1 串→位串）；裸 hex 全串校验（'1e' 不再静默截断）；删 selection.bitFromText |
| #61 | 交互稳健性 | ✅ | value-input 文档代际守卫+会话结束切回画笔；selection 合成 Esc 走核心状态机（不再直改 #wp-modal-overlay）、setPointerCapture 防拖出窗口卡死；shortcuts Escape 清光标、方向键快照 800ms 合并、undo 走 document_wave API；measure 光标存 mainStep；__core.ready 兜底轮询 + state() 全守卫 |
| #62 | 仿真链路解析健壮性 | ✅ | normalizeSignalName 长前缀在前（in_*/input_* 别名修复）；ANSI 多类型关键字循环剥离；参数化位宽 [WIDTH-1:0] 参数代入求值（求不出回退标量，绝不进 TB）；1 位端口不绑位串矢量 |
| #63 | 仿真服务永不掉线 | ✅ | launcher 接受循环自愈（GetContext 异常→同端口重建，进程不死服务不死）；/api/sim Interlocked 并发计数；退出语义收口=用户真关页；heartbeat 用 Web Worker 计时（后台节流不再击穿 20s 阈值）；静态资源 no-cache；请求体上限；快照目录上限 20 |
| #64 | 死代码清理 + 文档归档 | ✅ | 删 engine 4 个无调用方导出函数；isAlternatingCells/bitFromText/xToGlobalSample 等清零；docs/attic/ 归档 10 份旧架构文档 + docs/README.md |
| #65 | 工程保存/加载 | ✅ | 重大发现：核心按英文文本绑定文件菜单，汉化后 5 项全死（新建/打开/载入示例/另存为/复制分享链接）。新增 editor/file-menu.js 按中文重绑，复用核心 .wp 工程存取；「新建」就地重置 document_wave（防对象身份撕裂） |
| #66 | R6 输入实时预览 | ✅ | 核心 [PATCH-A5] 弹窗加 onPreview 钩子 → __core.prompt 透传；value-input 键入合法值即时写入预览，唯一撤销快照，取消/非法重开自动回退 |
| #67 | 任意工具 Ctrl+C/V + Ctrl+C/V 框选复制粘贴 | ✅ | 核心只在 select 工具生效；shortcuts.js 补任意工具路径（select 下放行核心防双写）；pasteClipboard 自带空剪贴板守卫 |
| #68 | DUT 内部信号回显 | ✅ | VCD 回填范围扩到 tb.dut 层次；同名去重优先浅层（回归：count 回显/q 去重保 4 位浅层） |
| #69 | 多文件/多模块设计 | ✅ | 多文件本就支持（@@FILE: 协议）；新增顶层模块选择器（≥2 module 显示，默认自动检测），生成TB/运行仿真/自动加信号按选定顶层执行 |
| #70 | 版本显示 | ✅ | build.ps1 生成 version.txt（v0.4.0+时间+git 短哈希）内嵌 exe；仿真面板头部显示——防「旧副本假象」 |
| #71 | launcher 其余加固 | ✅ | QuoteArg Windows 反斜杠/引号规则；FreePort try/finally；RunSimulation 异常路径清 work；StartServer 启动失败显式报错 |
| #72 | 每批次 git 记录可随意增减 | ✅ | 批次1~10 每批独立 commit（fc0b61b→4530721），每批全量验证后提交 |

## G. Verdi 借鉴路线 + 参数化支持（2026-09-08 起，总纲见 PROJECT-MASTER.md 第六/七章）

| ID | 需求 | 状态 | 实现思路 / 备注 |
|----|------|------|----------------|
| #73 | 参数化位宽完整支持（嵌套参数/$clog2/移位/sized字面量） | 🔧 **代码完成+真iverilog端到端验证过（tools/probe-param.mjs 全过），剩 2 条 regression 断言未对齐** → 交接步骤见 PROJECT-MASTER.md §6.1 | 定位结论：iverilog 无问题，是 TB 生成侧求值器局限；修法=求值器升级 + TB 内嵌参数定义让 iverilog 裁决位宽 |
| #74 | 跨 AI 总纲文档（PROJECT-MASTER.md：介绍/思路/约束+做法/需求台账/路线图/交接） | ✅ | 每次改代码必须同步更新（铁律 C17） |
| #75 | Verdi 借鉴 P0：CodeMirror6 代码视图 + RTL Tree 面板 + VCD 全路径索引 | ⬜ | 方案与开源借鉴清单见 PROJECT-MASTER.md §6.2/§7 |
| #76 | Verdi 借鉴 P1：点变量→加波形 + 树↔代码跳转 + 信号组入 .wp | ⬜ | 复用 toNativeSignal 注入链路；多实例歧义选择器 |
| #77 | Verdi 借鉴 P2：Active Annotation 值标注 + driver/load 高亮（启发式） | ⬜ | 数据全齐（VCD 层次路径+游标） |
| #78 | Verdi 借鉴 P3（备选）：X 追溯/波形 diff/VSCode 外接扩展 | ⬜ | VSCode 扩展复用 launcher HTTP /api |
| #79 | 仿真器选型定论 | ✅ | VCS/Questa/Xcelium 商业+Linux 不可用；iverilog 保持主后端；Verilator 远期可选（详见总纲 §7） |

## 待办 / 可延续方向（未排期）

- 核心内文案/行为修正走"补丁段"（[PATCH-A*]），保持 deobfuscate 可重跑不丢（仅开发内部关注）。
- 每次改动代码 → 重建 exe + 提交 git 的铁律（见 MEMORY.md 第一节），任何 AI 照此执行。
- 边缘对齐辅助线、缩放增强（Ctrl+滚轮）、导出增强等高级功能仍未排期（见 2026-09-04 分析）。
- 空残留目录 `D:/Files/Code/波形/WavePaintSim` 因会话 cwd 占用仍无法 rmdir，下次会话可清。
