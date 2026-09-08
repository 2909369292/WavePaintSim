# 06 · 坑库（Pitfalls）

> 本文件汇总项目历史上真实踩过的坑。每个坑按“症状 / 根因 / 解法 / 预防”组织。
> **新增坑时必须追加到本文件**，不要只写在日志里。

---

## P01 · 仿真恒为 0

- **症状**：计数器输出始终 `0000`。
- **根因**：`rst_n` 低有效复位被默认激励恒置 0，导致复位一直有效。
- **解法**：未绑定的低有效复位端口默认给释放电平 1，并补上电复位脉冲。
- **预防**：不要把“未绑定输入”简单等同于全 0；必须识别复位极性。

---

## P02 · stride 口径不一致

- **症状**：子步错位、半格漂移、框选范围与视觉不一致。
- **根因**：不同模块各自推导 `stride`。
- **解法**：统一 `wpf.stride()` / `wpf.divisorOf(sig)` / `wpf.cellsInRange()`。
- **预防**：任何新代码禁止手写 `(m_subStepCount || 1) + 1`。

---

## P03 · 值解析多入口

- **症状**：多 bit 输入被截成 0 或 1 位。
- **根因**：不同模块各自写解析逻辑，`sig.width` 幽灵判定。
- **解法**：唯一入口 `wpf.parseValue(raw, sig)`。
- **预防**：禁止再写第二套解析。

---

## P04 · 文件菜单全死

- **症状**：新建/打开/另存为等菜单点击无效。
- **根因**：核心 `initMenuHandlers` 按英文文本绑定，汉化后失效。
- **解法**：`editor/file-menu.js` 按中文文本重绑。
- **预防**：改菜单文案必须同步 `file-menu.js` 的 handlers 表。

---

## P05 · `document_wave` 对象身份撕裂

- **症状**：新建工程后核心内部仍引用旧对象。
- **根因**：外部执行 `window.document_wave = new WaveDocument()`。
- **解法**：就地重置，不换对象。
- **预防**：任何“新建”都必须走 `file-menu.js` 的就地重置逻辑。

---

## P06 · 仿真服务运行一段时间后“不在线”

- **症状**：界面提示 Failed to fetch / 服务不在线。
- **根因**：后台节流导致心跳失效，launcher 误判页面关闭。
- **解法**：`heartbeat.js` 用 Web Worker 计时；launcher 退出语义收口为“用户真关页”。
- **预防**：不要用普通 `setInterval` 做关键心跳。

---

## P07 · launcher 假退出 / 并发杀进程

- **症状**：第二个仿真还在跑，进程却被杀。
- **根因**：单布尔计数，先完成者清零。
- **解法**：`/api/sim` 用 `Interlocked` 计数。
- **预防**：所有并发计数必须用原子操作。

---

## P08 · `build.ps1` 无 BOM

- **症状**：PowerShell 5.1 解析中文乱码，构建直接失败。
- **根因**：无 UTF-8 BOM 时按 ANSI/GBK 解码。
- **解法**：保持 UTF-8 BOM。
- **预防**：改完脚本检查前 3 字节 `EF BB BF`。

---

## P09 · csc 假成功

- **症状**：编译失败但外层命令 exit 0。
- **根因**：脚本只 `Write-Host` 退出码，不抛错。
- **解法**：`csc` 非零即 `throw`。
- **预防**：所有关键外部命令必须检查 `$LASTEXITCODE`。

---

## P10 · 产物路径漂移

- **症状**：exe 落到别的目录，用户误启旧副本。
- **根因**：相对路径 + cwd 漂移。
- **解法**：`build.ps1` 用 `$PSScriptRoot` 绝对路径。
- **预防**：产物路径必须绝对化。

---

## P11 · 旧 exe 假象

- **症状**：用户说修复没生效，本地全绿。
- **根因**：用户启动了旧副本。
- **解法**：搜索所有 `WavePaint*.exe`，旧副本改名隔离。
- **预防**：交付时提醒唯一路径和版本号自查。

---

## P12 · C 盘临时目录爆盘

- **症状**：命令输出 ENOSPC，exe 静默挂起。
- **根因**：Edge / 更新器 / 临时文件堆积。
- **解法**：定期清理 `%TEMP%` 的 `workbuddy-update-x64`、`WaveWorkbench_build`、`CrashDumps`。
- **预防**：C 盘空间不足时先清理再跑 UI 测试。

---

## P13 · PowerShell stdout 捕获失效

- **症状**：命令 exit 0 但无输出。
- **根因**：PowerShell 工具输出流被吞。
- **解法**：关键结果写 D 盘文件再读。
- **预防**：需要可靠输出时使用 Bash 或文件旁路。

---

## P14 · e2e-ui 卡死

- **症状**：UI 回归无输出、长时间不退出。
- **根因**：Edge profile / 组件更新 / 端口占用 / C 盘满。
- **解法**：使用唯一 profile、禁组件更新、重定向 TEMP、确保端口空闲。
- **预防**：UI 回归前先检查 Edge 进程和 C 盘。

---

## P15 · 参数化位宽求值局限

- **症状**：`[WIDTH-1:0]` 回退成 1 位。
- **根因**：本地求值器只支持简单代入，不支持嵌套参数、`$clog2`、移位、sized 字面量。
- **解法**：TB 内嵌参数定义，位宽算术交给 iverilog。
- **预防**：不要把 iverilog 能做的事重复实现一遍。

---

## P16 · 核心内部标识符直接引用

- **症状**：代码脆弱，重构后随机崩。
- **根因**：绕过 `__core`/`wpf` 直接抓核心内部变量。
- **解法**：统一走 `__core.state()`、`wpf.*`。
- **预防**：任何“需要碰核心内部”的能力先在 `__core` 登记语义方法。

---

## P17 · 需求/文档/日志不同步

- **症状**：代码已完成但下一个 AI 不知道。
- **根因**：只 commit 代码，不更新记忆。
- **解法**：代码 + 记忆同一 commit。
- **预防**：每次改动必须更新 `03/04/05/06/07/08/09` 中相关文件。

---

## P18 · 删除不可恢复

- **症状**：误删后无法回溯。
- **根因**：直接裸删。
- **解法**：统一移入 `D:/Files/Code/.trash-<日期>/`。
- **预防**：任何删除/隔离必须可恢复。

---

## P19 · ANSI 头部内部端口行号串行（#75）

- **症状**：ANSI 风格 `module m ( input clk, rst_n, data_in )` 多行书写时，所有端口行号都被定位到首行；`clk/rst_n/data_in` 全落在模块头第一行。
- **根因**：行号定位用「模块内第一个方向关键字 + 端口名」正则，共享的 input 关键词一旦跨行/复用，就把后面端口全算到第一处 input 上。
- **解法**：`rtl-nav.js` 对 ANSI 头部内部做精确处理——从头部「列表开括号 `lastIndexOf("(")`」到「分号」逐段重定位每个端口；共享方向单行列表 `input a, b` 同列 1；非 ANSI 落到体内方向声明行。
- **预防**：任何行号计算都以“原始文本 + 括号/分号边界”为准，禁止依赖方向关键字第一次出现的位置；新增解析必须进 `regression.mjs` 单测。

## P20 · `.cm-content` 的 textContent 不含换行（#75 e2e 陷阱）

- **症状**：e2e 用 `.cm-content.textContent` 与 textarea `.value` 比对“内容同步”误报不同步。
- **根因**：CodeMirror 的 `.cm-content` 按行渲染，`textContent` 会丢换行符；textarea 保留 `\r\n`/`\n`，直接比对必然不等。
- **解法**：断言改为“去掉全部换行后全等”（`replace(/[\r\n]/g,'')`），e2e-rtl A2 用此法通过。
- **预防**：涉及 CM 内容与外部文本的断言一律先归一化换行；不要假设 DOM textContent 保留原始换行。

---

## P21 · 仿真失败要先分“进程死”与“自愈窗口”（#81 Bug1）

- **症状**：用户反馈“仿真服务不在线”，点运行仿真提示“请重启应用”，但服务其实马上恢复，再点一次就成功。
- **根因**：launcher 的 AcceptLoop 异常自愈（RestartServer 同端口重绑）会制造“瞬时不可达窗口”，窗口内 `/api/sim` 请求被丢弃；旧 UI 把所有 fetch 失败一律按“进程已退出”提示。
- **解法**：`ui-bridge.probeServerAlive()` 快速 GET `api/ping`（800ms 超时）区分死因：探活成功且未自动重试 → 静默自动重试一次（`simAutoRetried`，手动点击复位）；探活成功但已重试 → “服务在线，本次请求未完成”（iverilog 超时/被丢弃，给 45s 超时文案）；探活失败 → 才提示重启应用。
- **预防**：任何 fetch 失败不得直接给“重启应用”；先探活。exe 内置服务（WavePaintLauncher.cs）与 dev-server.mjs 都必须有 `api/ping`，两边语义一致。

## P22 · 教程高亮 class 曾进 CSS 隐藏列表 → 真实控件永久消失（#81 Bug2）

- **症状**：`#add-signal-btn`（+图标）偶发消失，刷新/切主题后可能复现。
- **根因**：汉化版为“隐藏教程弹窗”写的 CSS 把 `.wp-tutorial-highlight` 也放进 `display:none !important` 列表；而教程 JS 恰恰把这个 class 标到**真实控件**（按钮/下拉/菜单项/输入框）上 → 控件被永久隐藏。
- **解法**：隐藏列表只放瞬态教程元素（overlay/tooltip/quickstart/arrow/进度条）；真实控件的高亮用防御规则保证可见可点（`visibility:visible; pointer-events:auto; animation:none; box-shadow:none` + `.tool-btn`/`.dropdown` 的 display 修正）。
- **预防**：新增隐藏类时先确认它只会出现在瞬态弹窗上；`.wp-tutorial-highlight` 表示“引导指向的真实控件”，永远不许 display:none。

## P23 · 随机端口 ⇒ localStorage 每会话全新 ⇒ 教程每次启动隐形重跑（#81 Bug3）

- **症状**：键盘 Enter/Space/方向键偶发“失灵”；真实控件偶发出现高亮残留；其实都是教程在重跑。
- **根因**：exe 每次启动随机端口，Edge 的 localStorage 按 origin（含端口）隔离 → 教程完成标记 `wavepaint_tutorial_done` 永不跨会话保留 → 教程每次启动都隐性执行；汉化版又把教程 UI 整体隐藏，用户只见副作用（document 上 keydown preventDefault + 控件挂高亮）不见引导。
- **解法**：`index.html` 在 `<head>`、核心 `clean.js` 解析**之前**用内联脚本预置 `wavepaint_tutorial_done='true'`（try/catch 包裹）；`file-menu.js` 捕获阶段拦截「帮助→教程」（核心 handler 会 `removeItem` + `queueTutorial` 重启隐形教程），改弹中文提示。
- **预防**：凡是“只跑一次”的状态，不能假设 localStorage 会跨会话保留；exe 场景必须把默认值写进启动脚本或干脆不要依赖持久化。`window.__wavepaintTutorialQueued` 出现 true 不代表教程会播（runTutorial 仍查 done），判定副作用要测“高亮数 + 按键是否被拦截”。

## P24 · 核心模态 Enter=Escape 会自行关闭（自动化探测陷阱）

- **症状**：自动化脚本“先派发 Enter 探测键盘 → 再断言弹窗还开着”永远失败；或误判“教程键盘钩子导致按键失灵”。
- **根因**：核心模态（wavepaint.clean.js `_0x2507bb`）在 Enter=Escape 时 `preventDefault` + 关闭自己；派发合成 Enter 会先把弹窗关掉，后续“检测模态显示”自然拿不到。
- **解法**：探测顺序 = 先查 overlay（`#wp-modal-overlay` 不带 `.hidden`）与标题 → 点 OK/确定 关掉弹窗 → 再派发按键断言无拦截。判断“教程钩子是否残留”必须以**弹窗关闭后**的按键探测为准。
- **预防**：涉及模态的自动化断言先搞清楚模态键位语义；调试用裸 `wpModalState`（核心词法全局），`window.wpModalState` 是 undefined，会误导。

## P25 · exe-smoke 选端口文件要按 mtime，不能按“最大文件名”

- **症状**：冒烟连上页面但 core/wpf/canvas 全是 undefined、`zh:false`——连到了已死端口。
- **根因**：`WavePaintClean_port_*.txt` 文件名是随机端口数字；残留旧文件的数字可能比新实例大，`sort()` 取最后一个会选到陈旧文件（旧实例已退出 → Edge 拿到错误页）。
- **解法**：`tools/exe-smoke.mjs` 改为按 `mtimeMs` 取最近写入的端口文件。
- **预防**：任何“读最新状态文件”的逻辑不要假设文件名单调；按写入时间排。清理旧端口文件需谨慎（C 盘 Temp 删除被策略拦时，直接改读取逻辑）。
