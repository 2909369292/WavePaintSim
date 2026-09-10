# 02 · 工作流 SOP 与硬性约束（跨 AI 必读）

> 本文件回答“接手后怎么干活、什么绝对不能做、验证门槛是什么、如何交付”。
> 这些约束来自真实事故，不是建议；违反任何一条都可能导致假成功、旧 exe、
> 记忆断档或仿真链路回归。

---

## 1. 标准任务流程（任何代码任务）

```text
① 读 memory/INDEX.md
② 读 memory/09-HANDOFF.md，确认当前任务与环境
③ 读 memory/01-PROJECT.md（架构 + 数据口径）
④ 读 memory/02-WORKFLOW.md（本文件）
⑤ 读 memory/04-PROGRESS.md，确认当前状态
⑥ 若涉及需求，读 memory/03-REQUIREMENTS.md
⑦ 若涉及历史坑，读 memory/06-PITFALLS.md
⑧ 若涉及技术取舍，读 memory/07-DECISIONS.md
⑨ 改代码前，在 04-PROGRESS 登记“进行中”
⑩ 改代码
⑪ 按改动类型跑验证
⑫ 若改了内嵌资源，重建 exe
⑬ 更新 03-REQUIREMENTS / 04-PROGRESS / 05-LOGS / 06-PITFALLS / 07-DECISIONS / 08-ROADMAP
⑭ commit + push main
⑮ 交付时按 §5 提醒用户
```

---

## 2. 硬性约束 C1~C19

| # | 约束 | 对应做法 |
|---|---|---|
| C1 | **改任何会被内嵌 exe 的文件**（`js/`、`index.html`、`css/`、`img/`、`lib/`、`WavePaintLauncher.cs`、`build.ps1`）→ **必须重建 exe** | ① `taskkill /F /IM WavePaintClean.exe`（用户已授权直接杀）② `powershell -NoProfile -Command "Set-Location -LiteralPath 'D:\Files\Code\波形'; .\build.ps1"` ③ 确认 `csc exit: 0` + 产物时间戳刷新 |
| C2 | 任何改动 → `git commit` + `git push main` | 每个逻辑批次独立 commit；message 写清动机 + 改法 + 验证结果；不 push = 下个 AI 看不到 |
| C3 | 提交前全量验证（见 §3） | 跳过验证的提交是项目事故 |
| C4 | 交付 exe 后必须提醒用户 | 给出唯一绝对路径 + “重启应用、必须从该路径启动” + 让用户对照面板版本号自查 |
| C5 | 用户报 bug 但本地全绿 → **先怀疑旧 exe 副本**，勿急着改代码 | `rg -a -c "<修复特征串>" WavePaintClean.exe`；`find /d/Files -iname "WavePaint*.exe"`；旧副本改名为 `*.stale-<日期>`（可逆） |
| C6 | 删除/隔离必须可恢复 | 死文件 → `D:/Files/Code/.trash-<日期>/`，不裸删 |
| C7 | `build.ps1` 必须带 UTF-8 BOM | 改完用 `head -c 3 build.ps1` 检查应为 `ef bb bf`；无 BOM 时 PS5.1 按 GBK 解码，中文破坏引号括号，构建直接失败 |
| C8 | exe 内嵌资源，验证新代码是否真进 exe | `rg -a -c "新代码独特字符串" WavePaintClean.exe` 命中 ≥1 |
| C9 | **仿真链路最易碎区**：`engine.js` 的 `matchSignalsToPorts` / `createPortStimulus` / stride 口径 / VCD 回填；能不动就不动 | 动了必须 regression + e2e-sim + 重建 exe 三连 |
| C10 | 唯一入口约定：弹窗（`__core.prompt`）/值解析（`wpf.parseValue`）/坐标（`divisorOf`/`cellsInRange`）/undo（`wpf.undo`） | 新功能禁止自建 modal、自写解析、手推 stride |
| C11 | 核心 `initMenuHandlers` 按**英文文本**绑定老菜单；`file-menu.js` 按**中文文本**重绑 | 改 `index.html` 菜单文案必须同步 `file-menu.js` 的 handlers 表，否则菜单又变死 |
| C12 | 「新建」必须**就地重置** `document_wave` | 核心内部词法引用无法从外部更新；禁止 `window.document_wave = new WaveDocument()` 换对象 |
| C13 | PowerShell 工具 stdout 捕获可能整会话失效（exit 0 无输出） | 结果写 D 盘文件再读；Bash 工具正常可交叉验证 |
| C14 | C 盘多次 0GB 满盘，临时目录元凶 | 先 `df -h /c`；清 `%TEMP%` 的 `workbuddy-update-x64` / `WaveWorkbench_build` / `wavepaint-ivl-cache` / `CrashDumps` |
| C15 | exe 冒烟必须**一条命令**完成 | `taskkill→删 port 文件→启动→等 port 文件≤15s→smoke→taskkill` 全在一条命令；port 读最新 |
| C16 | 沙箱会回收从 bash 后台起的 GUI exe | exe 冒烟/保活验证用非沙箱方式启动 |
| C17 | **每次改代码必须同步更新记忆/文档/日志** | `04-PROGRESS` + `logs/当日日志` +（涉需求）`03-REQUIREMENTS`；与代码同一 commit |
| C18 | 版本号自查 | `build.ps1` 自动生成 `version.txt`（`v主版本+时间+git短哈希`）；发大版本时手动升主版本号 |
| C19 | **服务在线性不变量（2026-09-10 第十三轮确立，勿破坏）**：① 端口固定首选 `17817`；② `/api/ping` 必须回 `PING_TAG`（`WAVEPAINT-SERVICE`）+ 端口 + 构建戳，前端只认带标识的应答；③ 服务自愈**禁止自动整页跳转**（本应用无自动保存），只能「改 `simApiBase` / 同端口重拉」；④ 触发 `wavepaint:` 协议只用隐藏 iframe；⑤ `ivlRoot` 等资源变量不得只在 cache 命中分支赋值 | 动这五项任一项前先读 `07-DECISIONS.md` D15 与 `06-PITFALLS.md` P28/P29/P30；「点仿真无响应」= 必须修到「点即成功」，只给「请重启应用」提示视为未完成 |

---

## 3. 验证门槛（按改动类型递增）

| 命令 | 用途 | 期望 | 适用 |
|---|---|---|---|
| `node --check <改过的js>` | 语法 | OK | 任何 JS 改动 |
| `node tools/regression.mjs` | 逻辑/快照回归 | 全过（当前 **75 项**：第十四轮 68 + 第十五轮 #76 B1 新增 7） | 任何 JS 改动 |
| `node tools/e2e-sim.mjs` | 真跑 iverilog 全链路 | 失败 0 项 | `sim/engine` / `ui-bridge` / `launcher` 改动 |
| `node tools/probe-param.mjs` | 参数化设计真 iverilog 端到端 | 全过 | `engine` 参数 / TB 生成改动 |
| `node tools/e2e-ui.mjs` | 真实 Edge 交互（73 项） | 73/73 | `editor` / `core` / `index.html` 改动 |
| `node tools/e2e-rtl.mjs` | #75/#85/#86/#76-B1 冒烟：CM6 / RTL Tree / VCD 树 / 观察行 / 实例跳定义 / 符号→VCD 映射（**32 项**，含 B~F 段） | 32/32 | `rtl-nav/vcd-index/rtl-panel/ui-bridge/index.html` 改动 |
| `node .e2e-tmp/verify-recovery2.mjs` | 服务自愈：判活 / 重连 / 重拉 / 自动重试（17 项） | 17/17 | `service-guard` / `ui-bridge` / `launcher` / `index.html` 改动 |
| `node tools/exe-smoke.mjs` | 真实 exe 冒烟 | 通过 | exe 重建后 |
| 浏览器人工验收 | UI 视觉/交互 | 用户确认 | AI 无法完整实测的 UI 改动，必须明确告知用户 |

---

## 4. 构建 SOP

1. 确认 `build.ps1` 带 UTF-8 BOM。
2. 直接结束主进程：
   ```powershell
   taskkill /F /IM WavePaintClean.exe
   ```
3. 进入项目根并构建：
   ```powershell
   powershell -NoProfile -Command "Set-Location -LiteralPath 'D:\Files\Code\波形'; .\build.ps1"
   ```
4. 确认输出包含：
   - `csc exit: 0`
   - `res count: ...`
   - `exe out: D:\Files\Code\波形\WavePaintClean.exe`
   - 新的构建时间戳
5. 用特征串验证代码确实进 exe：
   ```powershell
   rg -a -c "本次修复特征串" WavePaintClean.exe
   ```
6. 若改了 `version.txt` 或发大版本，确认面板版本号同步。

---

## 5. 交付 SOP

1. 重建 exe（C1）。
2. 用特征串确认代码真进 exe（C8）。
3. 搜索旧副本：
   ```powershell
   find /d/Files -iname "WavePaint*.exe"
   ```
4. 若存在旧副本，改名为 `*.stale-<日期>`（可逆）。
5. 回复用户时给出：
   - 唯一路径：`D:\Files\Code\波形\WavePaintClean.exe`
   - “请重启应用”
   - “必须从该路径启动”
   - “可在面板查看版本号自查”

---

## 6. 记忆维护义务

| 触发 | 必须更新 |
|---|---|
| 修改任何代码 | `04-PROGRESS` + `logs/当日日志` |
| 新增/变更需求 | `03-REQUIREMENTS` |
| 改动会被内嵌 exe | 另按 C1 重建 exe |
| 踩到新坑 | `06-PITFALLS` |
| 做出重要取舍 | `07-DECISIONS` |
| 完成路线图项 | `08-ROADMAP` + `04-PROGRESS` |
| 交接/暂停任务 | `09-HANDOFF` |

### 6.1 日志写法

- 文件：`memory/logs/YYYY-MM-DD.md`
- 每次工作新建或追加当日日志
- 结构建议：
  1. 本轮目标
  2. 做了什么
  3. 关键结论
  4. 验证结果
  5. 遗留问题
  6. 交付提醒

---

## 7. 跨 AI 工作流

### 7.1 开始

1. 读 `memory/INDEX.md`
2. 读 `memory/09-HANDOFF.md`
3. 读 `memory/01-PROJECT.md`
4. 读本文件
5. 读 `memory/04-PROGRESS.md`

### 7.2 结束

1. 确认验证全绿
2. 更新 `04-PROGRESS`
3. 更新当日日志
4. 若涉需求，更新 `03-REQUIREMENTS`
5. 若涉新坑，更新 `06-PITFALLS`
6. 若涉取舍，更新 `07-DECISIONS`
7. commit + push
8. 若交付 exe，按 §5 提醒用户

### 7.3 永远不要

- 重做已完成的解混淆 / 重构 / 批次1~10
- 绕过 `__core` / `wpf` 直接抓核心内部标识符
- 自建第二套值解析或坐标推导
- 改 `sim/engine.js` 后不跑 `e2e-sim`
- 只改磁盘不重建 exe
- 不更新记忆就 commit
- 假设“本地全绿”时用户也在跑同一份 exe

---

## 8. 常用命令速查

```powershell
# 语法
node --check js/sim/engine.js

# 回归
node tools/regression.mjs

# 仿真端到端
node tools/e2e-sim.mjs

# 参数化端到端
node tools/probe-param.mjs

# UI 端到端
node tools/e2e-ui.mjs

# 开发服务器
node tools/dev-server.mjs 8947

# 重建
.\build.ps1

# 检查 exe 特征
rg -a -c "rangeResolvable" WavePaintClean.exe
```
