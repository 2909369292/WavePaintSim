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
- **根因**：核心模态（wavepaint.clean.js `openWpModal()` 内注册的 keydown 处理器，旧混淆名
  `_0x2507bb`，2026-09-09 第 7 pass 后为局部 `v8`）在 Enter=Escape 时 `preventDefault` +
  关闭自己；派发合成 Enter 会先把弹窗关掉，后续“检测模态显示”自然拿不到。
- **解法**：探测顺序 = 先查 overlay（`#wp-modal-overlay` 不带 `.hidden`）与标题 → 点 OK/确定 关掉弹窗 → 再派发按键断言无拦截。判断“教程钩子是否残留”必须以**弹窗关闭后**的按键探测为准。
- **预防**：涉及模态的自动化断言先搞清楚模态键位语义；调试用裸 `wpModalState`（核心词法全局），`window.wpModalState` 是 undefined，会误导。

## P25 · exe-smoke 选端口文件要按 mtime，不能按“最大文件名”

- **症状**：冒烟连上页面但 core/wpf/canvas 全是 undefined、`zh:false`——连到了已死端口。
- **根因**：`WavePaintClean_port_*.txt` 文件名是随机端口数字；残留旧文件的数字可能比新实例大，`sort()` 取最后一个会选到陈旧文件（旧实例已退出 → Edge 拿到错误页）。
- **解法**：`tools/exe-smoke.mjs` 改为按 `mtimeMs` 取最近写入的端口文件。
- **预防**：任何“读最新状态文件”的逻辑不要假设文件名单调；按写入时间排。清理旧端口文件需谨慎（C 盘 Temp 删除被策略拦时，直接改读取逻辑）。

## P26 · 遗留 Edge 窗口停在死随机端口 → “直接无法仿真”假象 + 旧实例永不退出（#82）

- **症状**：用户报“存在仿真失败的问题，直接无法仿真”；服务端本身健康（headless 直连
  能正常仿真），但用户正看的那个 Edge 页面 `/api/*` 全断。
- **根因**：exe 每次启动用随机端口；重建/崩溃/手动杀进程时，其 Edge `--app` 窗口不会
  自己消失（Edge 把同 profile 的 app 窗口合并进一个浏览器进程，无 `--app=` 命令行可查）。
  launcher 的 `HasWindow()` 只看 msedge `MainWindowTitle` → 残留任意同名窗口就判定
  “有窗口在服务” → 旧实例永不满足退出条件；`OpenExistingInstance()` 只开新窗不收旧窗
  → 死端口窗口越积越多。用户点开死窗口 = 页面同源 `/api/*` 连到已死端口 = “无法仿真”。
- **解法**：`WavePaintLauncher.cs` 新增 `CloseLegacyWindows()`：开窗前对所有标题含
  `WavePaint`/`WaveWorkbench` 的可见顶层窗口 `PostMessage(WM_CLOSE)`（最多等 ~2.5s），
  `MainCore`（全新启动）与 `OpenExistingInstance`（接管已有实例）两处 `Process.Start`
  前都调用。验证：真机 5 个死/重窗口一次收成 1 个新窗口。
- **预防**：改“窗口/服务存活”相关逻辑时，记住 **Edge 同 profile 的 app 窗口不可按
  进程命令行区分 URL**；`HasWindow()` 只该证明“有没有同名窗口”，不能证明“窗口指向
  我这个端口/构建”。重启/重建后开新窗必须先把旧窗口收掉，否则死页面会永久欺骗用户。
  交付提醒永远包含：先结束旧进程/旧窗口，再从唯一路径启动一次。

## P27 · 写 memory 长文本换行损坏：游离 CR 吞掉行首字符

- **症状**：`memory/logs/2026-09-09.md` 第十轮登记出现两处断行损坏——“js/sim/ui-bridge.js ”
  后跟游离 `\r`（0D）再接下一段，段首字符被吞（`refreshVcdTree` → `efreshVcdTree`）；
  “验证计划：”后整行只剩 `ode --check`（`node` 的 `n` 被吞）。文件末尾还残留一个游离 CRLF。
- **根因**：用带 CR 的换行/回显写文件时，工具把 `\r` 当换行分割（.NET ReadAllLines 也会按
  CR 切行），后续写回把 `\r` 后紧跟的首字符当作换行符丢弃 → 只丢一个字符很难肉眼发现。
- **解法**：发现后字节级扫描全文游离 CR（0D 后非 0A），把损坏段整体重写为规范文本即可。
- **预防**：写 memory/文档长文本用 `apply_patch` 或纯 UTF-8 追加（LF 行尾），**不要**把多行
  中文内容经 shell 回显/管道/读改写搬进文件；改完长文档用脚本核对：全文无“0D 后非 0A”、
  无行首意外丢字（如 `efreshVcdTree`/`ode --check` 这类畸形词）。命令输出落盘再读时用
  `cmd /c "... > file 2>&1"`，避免 PowerShell 管道改写目标文件编码。

## P28 · `ivlRoot` 只在 cache 命中分支赋值 → 换版本后首次启动必崩，服务根本没起来

- **症状**：重建 exe 后重启应用，**点击仿真无任何响应 / 服务不在线**，页面像是连不上本地
  服务；用户感受 = 「直接无法仿真」。而同一份代码在「第二次启动」时却正常——极易被误判成
  「偶发」「环境问题」。
- **根因**：`WavePaintLauncher.cs` 资源准备有 cache / extract 两条路径。`ivlRoot` **只在
  cache 命中分支**被赋值；换版本后 cache 失效 → 走 extract 分支 → 后续 `Path.Combine(ivlRoot, …)`
  在 `ivlRoot == null` 上抛 `ArgumentNullException` → 资源准备中断 → **HttpListener 从未启动**。
  日志实证（`%TEMP%\WavePaintClean_sim.log`）：
  `BOOT resources=extract` → `IVL repair failed: ArgumentNullException path1`；
  修复后同路径变为 `SERVER start pid=… port=17817` + 首仿正常。
- **解法**：① extract 分支**末尾统一** `ivlRoot = Path.Combine(root, "ivl")`（不再依赖分支）；
  ② 新增 `EnsureIvlReady(out string error)` 二次兜底，**并且在每轮 `/api/sim` 之前也调用**
  —— iverilog 被删/损坏时从内嵌 `ivl.zip` 现补，补不了返回**可读中文错误**而不是静默 500。
- **预防**：凡是「只在 cache 命中分支初始化」的变量都是定时炸弹；**每次 exe 重建后的第一次
  启动都必然走 extract 分支**，所以「重建 → 首启」这条路径必须每轮回归验证（本项目的
  `verify-recovery2.mjs` / exe 冒烟即覆盖它）。看到 `ArgumentNullException` + `path1` 直查此坑。

## P29 · 随机端口 + 只看窗口标题判活 + 固定目录整删重解（服务可用性三连）

- **症状**：三类表现，用户统称「仿真请求无响应」：① 点仿真立刻失败（`ERR_CONNECTION_REFUSED`）；
  ② 重启应用后**老页面**永远连不上，刷新也没用；③ 请求返回 404/乱码（像是发给了别人）。
  另有「重建后第一次启动必崩」（见 P28）。
- **根因**：① exe 每次启动用**随机端口** → 页面 origin（含端口）跨会话变化，已打开页面被
  钉死在旧端口上；② `HasWindow()` 只看 `msedge` 窗口标题（`MainWindowTitle`），无法证明
  「窗口指向我这个端口/构建」，残留同名窗口就误判服务在线（#82 已收窗，但判活口径仍脆）；
  ③ 端口无身份标识 → 端口被第三方程序占用时，页面会把 `/api/sim` 发给**别人的**本地服务。
- **解法**：① **固定首选端口 `PreferredPort = 17817`**（启动失败才换，并标注
  `fallback-port`）⇒ 页面 origin 跨会话稳定、可直接重连；② 窗口存活改 `FindWaveWindowHandles()`
  枚举全部可见顶层窗口（与 `CloseLegacyWindows()` 同源，真值来源唯一），`HasWindow()` 探测
  失败时返回 `true` **保守**（宁可多活一会儿也不误杀服务）；退出条件收紧为
  `everSeen && windowProbeOk && gone>24 && idle>90000`；③ `/api/ping` 应答带身份标识
  `WAVEPAINT-SERVICE\n端口\nbuildStamp\n`（+ `Cache-Control: no-store`），前端
  `service-guard.pingOrigin` **必须校验首行**才认，第三方占用同端口一律判为离线。
- **预防**：改端口策略 / 窗口判活 / ping 格式前先读本条。**17817 是设计而非巧合**：
  origin 稳定还顺带让 localStorage 跨会话保留（缓解 #81 Bug3 教程隐形重跑）。
  新写「判活」逻辑时永远带身份标识，绝不能只看 `ok/200`。

## P30 · 跨端口整页跳转会丢未保存画布内容（本应用没有自动保存）

- **症状**：本想在服务换端口时「跳过去自动修好」，结果用户画布上未保存的编辑内容**全部消失**
  —— 比原来的「仿真失败」严重得多。
- **根因**：本应用**没有自动保存/草稿恢复**：波形数据只活在当前页面内存 + 用户手动导出。
  任何 `location.href = 别处` / `location.replace` 都会静默销毁当前文档。同理，用
  `<a target=_blank>` / `window.open` / 顶层跳转去触发 `wavepaint:` 协议也有两个额外风险：
  ① 被浏览器 `user gesture is required` 策略拦下（实测）；② 协议未注册时顶层跳转会把
  当前页面顶掉。
- **解法**：恢复路径一律**不跳转**：① 服务在**另一个回环端口** → 只把 API 基址改过去
  （`simApiBase`，服务端对回环 origin 放行 CORS，`text/plain` 属简单请求不触发预检）；
  ② 服务死了 → 用 `wavepaint://start?port=<本页端口>` **把服务拉回当前端口**（同源，无需跳转
  ⇒ 未保存内容原地保留）；③ 触发协议**只用隐藏 iframe**（`relaunch()`），失败最多静默。
- **预防**：`service-guard.recover()` 的返回值 `alive|restarted|elsewhere|dead` 是**上报**，
  不是命令 —— 调用方**禁止**把它翻译成跳转。以后任何「自动修复」设计，先问一句
  「会不会让用户丢未保存内容」。

## P31 · 例化语句解析三坑：多实例同语句 / 字符串里的假例化 / 抹白长度错位（#86 A1）

- **症状**：RTL 结构树的「实例 Instances」分组**漏实例**（`sub u1(a), u2(b);` 只出现 u1）、
  **多出幽灵实例**（`$display("mod u(x);")` 里的文本被当成例化）、或**行号整体漂移**
  （点实例跳到错误的行）。
- **根因**（三条互相独立，藏在不同层）：
  1. **引擎侧**：`engine.parseInstances` 的连接表用懒匹配 `([^;]*?)`，遇到
     「一条语句例化多个实例」时会把 `u2(b)` 整个吞进 u1 的连接串 → 只认出一个实例；
     且它要求「模块名 + 实例名」之间有空白，`mod#(.P(1)) u(…)` 这类参数覆盖紧贴模块名的
     写法识别不到；实例行号靠「模块内首次出现该标识符」的启发式推断，实例名与某个
     信号/端口同名时会定位到错误的行。
  2. **字符串**：引擎是在**原始文本**上跑正则的，字符串字面量里的
     `"mod u(x);"` 也会被它当成一条例化 → 幽灵实例。
  3. **自写抹白**：`maskStrings` 把字符串内容换等长空格时，未闭合串的长度一开始用
     `end` 而不是 `scan` 计算（差 1），一旦长度不等长，后面**所有行号整体偏移**。
- **解法**（#86 A1，全部落在 `js/sim/rtl-nav.js`，不动 engine）：
  ① 新增源码级扫描器 `scanInstances`（字符流 + 平衡括号 `matchParen` + 多实例循环 +
     必须有 `;` 收尾），实例名/语句位置都取自**真实下标** ⇒ 行号精确；
  ② engine 的 `parseInstances` 结果只作**兜底**，且补进结果前过两道闸 ——
     **关键字过滤**（`isReservedName` 排除门原语 `and g1(o,a,b);`）+
     **抹白文本里必须真的存在 `<实例名> (`**（挡掉字符串里的假例化）；
  ③ `mergeInstances(scanned, fromEngine)` 以 `moduleName.toLowerCase()|instanceName` 为 key
     去重、按行号排序；
  ④ `maskStrings` 未闭合串改成 `inner = Math.max(0, scan - index - 1)` 保证**等长**。
- **预防**：任何「抹白 / 替换后再按下标算行号」的逻辑，**必须逐字符等长**，并配一条
  「抹白前后长度相等」的断言测试（regression 里已有含中文 / 未闭合行 / 转义引号的用例）。
  给 RTL 树加实例识别能力时**不要**去改 engine 的那三处（仿真链路最易碎），照 A1 的口径
  在旁边另写扫描器、让引擎结果只做兜底。

## P32 · 符号索引三坑：函数体误入表 / 同名多声明的“收窄”语义 / 测试里的 title 前缀（#76 B1）

- **症状**（第十五轮 B1 实现期实际踩到或刻意规避的三类问题）：
  1. **函数/任务体内的形参与局部变量混进符号表** → 「点代码变量加波形」时会给出根本不是
     模块信号的候选（`function automatic [W-1:0] addone(input [W-1:0] v); reg local_thing;`
     里的 `v` / `local_thing`）。
  2. **同名多声明（`output [3:0] q` + `reg [3:0] q`）与“按行收窄”把候选收成空** →
     若实现成「行号不精确即返回空」，B4 点代码时会静默无候选，表现为“点了没反应”。
  3. **e2e 断言用 `title === 'tb.dut.q'` 恒不命中** → VCD 树行 title 的真实格式是
     `完整路径：tb.dut.q`（带中文前缀），断言全假但页面其实完全正常。
- **根因**：
  1. 直接对**原文**跑关键字扫描时，`function…endfunction` / `task…endtask` / `specify…endspecify`
     / `table…endtable` 体与模块体语法同形，无关键字隔离就必然误收。
  2. `findSymbols` 的 `{moduleName,fileIndex,line}` 是**可选收窄条件**，代码区给出的行号
     可能来自 CM 视图（与原文行号有偏差），把它当硬过滤会把正确候选全部滤掉。
  3. VCD 树渲染层在 `title` 上拼了中文可读前缀（给用户看的），与「点分全路径」不是同一串。
- **解法**（#76 B1，全部落在 `js/sim/rtl-nav.js` 与 `tools/e2e-rtl.mjs`）：
  ① `blankInnerScopes(text)` 把上述四类**整体抹成等长空格**（保留换行）后再扫；
  ② `findSymbols` 的收窄规则定为「**能收窄才收窄，收窄后为空则忽略该条件**」，并配
     e2e-rtl **F8** 断言（越界 fileIndex/line → 回退到全部同名候选）；
  ③ e2e 断言一律用 `title.includes('tb.dut.q')`（与第十轮 D 段口径一致）。
- **预防**：给「代码侧输入 → 精确匹配」的逻辑留**兜底语义**（找不到就退一层），不要把
  前端给出的行号/文件号当真理；写 UI 断言时**先打印一次真实 DOM 属性再写等值比较**，
  尤其是带中文前缀/图标的渲染层。函数体抹白沿用 P31 的**等长**硬要求。
## P33 · 代码取词加信号四坑：浏览器吞 Ctrl+W / 双击取词的时机 / 名称兜底“并入”反而更差 / 多候选不能换个地方复活“层次选择框”（#76 B4）

- **症状**（第十六轮 B4 实现期实际踩到或刻意规避的四类问题）：
  1. **`Ctrl+W` 在 exe 里“没反应”，而且会直接关掉整个窗口** —— Edge `--app` 窗口把
     `Ctrl+W` 当浏览器关闭标签/窗口的快捷键，页面 `keydown` 收不到（或收到时窗口已在关）。
  2. **双击变量有时取不到词、或取到半个词/整行** —— CodeMirror6 的双击选择是**视图内部**
     行为，`dblclick` 事件到达宿主时 `selection` 可能还没更新完；且点击位置落在
     `q[3:0]` 这类带位选/位宽的词上时，`getSelection()` 只给出 `q` 或 `q[3:0]` 两种形态。
  3. **把「名称兜底」当主路径会让候选从 1 条变多条** —— 明明模块体符号索引已能唯一定位
     `tb.dut.q`，但若同时把 `findVcdPathsByName('q')` 的候选并进去，就会变成 3 条候选
     （`tb.q` / `tb.dut.q` / `tb.dut.u_sub.q`），用户看到多余的选择器，体验反而更差。
  4. **「多候选选择器」曾被用户明确否掉**（不要单独一个“信号层次选择框”）—— 如果为了省事
     把选择器做成侧栏或模态面板，等于把用户否掉的形态**换个地方复活**。
- **根因**：
  1. 浏览器快捷键在**应用窗口层级**先被消费，页面 JS 无法阻止；`--app` 模式尤其直接关窗。
  2. 双击的 `selection` 更新与事件派发存在**时序差**；词法本身也有多种合法形态
     （`q` / `q[3:0]` / `u_a.q` / `top.u_a.q`）。
  3. 符号索引（精确：按模块 + 行收窄）与名称兜底（宽松：扫全 VCD 信号的末段）**语义不同**：
     前者是“我确定就是这个”，后者只是“可能相关”；把两者取并集当候选，等于把精确结果稀释了。
  4. **形态（放在哪里）与能力（有没有）是两个维度**，用户否掉的是形态。
- **解法**（#76 B4，落在 `js/sim/rtl-panel.js` + `js/sim/ui-bridge.js` + `index.html`）：
  1. 快捷键改用 **`Ctrl+Alt+W`**，并挂在 **keydown 捕获阶段**（`{capture:true}` +
     `preventDefault()` + `stopPropagation()`）；同时在 `contextmenu` 与 `dblclick` 上提供
     同样入口 —— **三条路径进同一个 `onAddSymbol`**，用户总能找到一条能用的。
  2. 取词一律走**纯函数 `symbolNameAt(text, from, to)`**：先取选区、再回退到光标处扫
     `IDENT_SCAN` 字符集；`baseSymbolName()` 剥掉 `q[3:0]` 的位选（`BITSEL_LOOKBACK` 回看
     是否为声明位宽）、`firstSymbolIn()` 处理 `a.b.c` 取末段、`isIdentAdjacent()` 判定相邻性；
     `readContext()` 同时给出 `exact`（是否精确命中一个完整标识符）与 `source`
     （`'cm'` / `'textarea'`），**只有 `exact` 才触发**，避免把半截词当信号。
  3. 兜底顺序硬编码为「**先精确、空了才兜底**」：`resolveSymbolVcdPaths(...)` 有候选就**只用
     它**；候选为空才调 `findVcdPathsByName`。这样“点 `q` 变 3 候选”不会发生。
  4. 多候选时弹**代码区旁边的轻量浮层** `.sim-symbol-picker`（`position:absolute` 挂在代码
     宿主内、单例、点外部/Esc 关闭），**不复用侧栏、不新建面板**，保持用户要的形态。
- **预防**（通用）：
  - 给 exe 里的 Web 界面做快捷键：**先假设浏览器会吞**，选一个浏览器不用的组合
    （`Ctrl+Alt+*`）并挂捕获阶段；关键功能永远保留**第二条鼠标入口**（右键/双击）。
  - 事件驱动的取词/取行号：**不要相信事件那一刻的 DOM/编辑器状态**（存在时序差），用纯函数
    从**文本 + 位置**重算，并把“是否可信”作为返回值的一等字段（`exact`）。
  - 多来源候选合并前先问「它们的语义是否同级」：精确结果与宽松兜底**不能取并集**，只能是
    **降级 fallback**（有精确就不用宽松）。这是本次体验差异的根因。
  - 用户否掉的是**形态**不是**能力**：换个位置（代码区旁的浮层）继续提供同一能力，而不是把
    能力砍掉、或把能力做回用户否掉的形态。

---

## P34 · 反向高亮五坑：树全量重建抹掉高亮 / 纯光标移动收不到事件 / 重建后签名去重会吞掉补发 / 歧义绝不能猜 / 行匹配必须有位置证据（#76 B3）

- **症状**（第十七轮 B3「代码 → 树」反向联动实现期实际踩到或刻意规避的五类问题）：
  1. **点「解析 RTL」重建树之后，高亮凭空消失** —— 高亮 class 加在 DOM 行上，而
     `refreshStructureTrees()` 是 `container.replaceChildren(...)` **全量重建**，旧节点连同
     class 一起被丢掉。
  2. **用方向键移动光标（或程序化移动）时高亮不更新** —— 只挂 `keyup`/`mouseup` 时，
     纯光标移动既不按键也不点鼠标，事件根本不触发。
  3. **`setText()` 换了文档之后，光标还在“同一个位置”，高亮却指向了旧树的节点** ——
     位置签名（`source|name|line|selection`）与上次完全相同 → 去重逻辑把这次**应当补发**的
     同步吃掉了。
  4. **同名信号落在多个实例下（`u_a`/`u_b`）时若“挑一个亮的”就会亮错** —— 例如点
     `sub.v:2` 的 `q`，VCD 里同时存在 `tb.dut.u_a.q` 与 `tb.dut.u_b.q`。
  5. **没有位置证据的行也会被“匹配”上** —— 例如目标行 `line=13` 却命中了 `line=1` 的模块行，
     或者目标 `kind='instance'` 却命中了 `kind='module'` 的行。
- **根因**：
  1. 高亮是**渲染产物**不是**状态**：状态在模块级变量里才是持久的，DOM 只是投影。
  2. 事件源覆盖不全：`selectionchange` 才覆盖**选区/光标变化**（含方向键、点击定位后无按键），
     而它是**全局**事件（任意元素都会发），所以要配合「焦点在编辑器内」+ 位置签名去重。
  3. 去重键只在「同一份文档、同一份树」内有效；文档换了、树重建了，键虽然相同但**语义已变**。
  4. 歧义候选的“猜”没有任何依据可依 —— 用户要的是「宁可不亮，也不能亮错」（与 B4 的
     「精确优先、不取并集」同源）。
  5. 行号/名字/实例名/模块名是**位置证据**：没有证据的“匹配”就是随机亮行，比不亮更糟。
- **解法**：
  1. 把联动结果存成模块级 `activeHighlight`，`refreshStructureTrees()` 末尾**重放**
     （`applyActiveHighlight()`）；`gotoSource()` 末尾 `syncActiveFromCode()` 做闭环。
  2. `installCodeEditor` 同时订阅 `ownerDocument` 的 `selectionchange` + 宿主 `mouseup`/`keyup`
     （无 CM 时退回 textarea `keyup`），只有焦点在编辑器内才发。
  3. `setText()` 重建编辑器后**强制补发一次** `emitCursor()`（注释里写明原因：换文档后即使
     签名相同也必须重发）。
  4. `resolveSymbolVcdPaths` 候选数 **=== 1** 才亮 VCD；符号侧为空才 `findVcdPathsByName`
     兜底，**同样要求唯一**；实例名不是 VCD 信号 → 只亮 RTL 实例行。
  5. `rowMatchScore(row, target)`：**目标带 `kind` 时同类是硬条件**；**必须有位置证据**
     （行号相等 或 实例名/模块名/名字相等），否则 0 分；`pickRtlRowIndex` 同分**取先出现者**。
- **预防**（通用）：
  - 凡是「状态 → DOM 视觉标记」的系统，**状态一律提到模块级**，渲染函数尽量纯；**重建后重放
    是必经步骤**，并在 e2e 里专门断言「重建后仍在」（本轮 = e2e-rtl H5）。
  - 事件源选择先列「用户可能通过哪些方式到达这个状态」（键盘 / 鼠标 / 程序化 / 文档切换），
    再逐个接线；DOM 事件覆盖不到程序化移动，`selectionchange` 覆盖不到“选区不变但文档已换”。
  - 去重键要带上「作用域」概念（文档身份 / 树版本）；只有签名不够时，宁可多发一次也不能不发
    （同步是幂等的，漏发才是 bug）。
  - 「高亮/定位」类功能一律遵循 **有唯一证据才亮、歧义宁可不亮**（与 B4 精确优先同源）。
  - 高亮不得改变该 UI 区的既有语义边界：RTL 树仍**只做层级浏览**（高亮**不带出**端口/信号行），
    本轮用 e2e-rtl H6（`.rtl-port`/`.vcd-signal-row` 计数 === 0）钉死。

## P35 · 观察行随工程存档三坑：核心不认注入行 / 载入后无 VCD 会静默丢行 / 载入新工程必须先清旧 VCD（#76 B5）

- **症状**：
  1. 保存 `.wp` 再打开，代码里加进来的**观察行**（`state.simWatches` / `__simInjected`）要么被当成
     **用户画的激励信号**（点「运行仿真」会拿它去生成 TB = 脏激励），要么名字列丢了 `[3:0]` 位宽；
  2. 载入工程后画布**渲染一次，观察行就消失了**（登记还在、行没了）；
  3. 载入工程后观察行确实回来了，但**值/波形是上一份设计的数据**（张冠李戴）；
  4. 点「新建」后画布**残留上一个工程**的观察行 / 仿真结果 / 源码集合。
- **根因**：
  1. 核心 `js/wavepaint.clean.js` **不认得**注入行：`buildDocumentJson` 把它当**普通信号**写进
     `signals`（含 `values`），`loadFromFileContent` 里 `new Signal(...)` 重建后**丢掉**
     `__simInjected` / `__simWatchPath` / `width` / `msb` / `lsb`。两级后果：① 丢注入身份 →
     `readWaveDocument()` 把它当**用户激励**去生成 TB；② 丢位宽元数据 → `displaySignalName`
     拼不出 `[3:0]`。
  2. `syncSimRows()` 原实现无条件 `buildWatchSignal(path)`，而该函数**依赖 `state.vcd`**；刚载入
     工程时 `state.vcd` 为空 → 行被**静默丢弃**（登记在 `simWatches` 里，但画布拿不到 signal 对象）。
  3. 载入工程时**没清 `state.vcd`** → `syncSimRows` 拿**上一份设计**的 VCD 去刷新刚载入的行
     （路径恰好同名时数据全错）。
  4. `resetSourceFiles()` 原只复位源码集合（`files`/`active`/`design`），不复位
     `vcd`/`outputs`/`simWatches`/`lastTestbench`。
- **解法**：
  1. **桥只存「怎么找回观察行」的元数据**：`archiveSimWatches()` → `{path, name, width, reference}`
     （波形数据本身已在核心 `signals` 里，**不重复存**）；`adoptArchivedWatchRows(watches)` 按
     **「行名 == 观察路径」**认领（`buildWatchSignal` 本就用 `path` 当行名），置回
     `__simInjected` + `__simWatchPath` 并**补回核心不还原的字段**（`width` /
     `kind = width>1?'vector':'logic'` / `msb = width-1` / `lsb = '0'`）；已是注入行则 `continue`（幂等）。
  2. `syncSimRows()` 先建 `liveByPath`，`buildWatchSignal(...)` 返回空时**仅在没有 VCD 时**退回
     `liveByPath.get(path)`。口径：**有 VCD 以 VCD 为准**（缺路径 = 未 dump → 丢弃，保证重仿真刷新），
     **无 VCD（刚载入工程）按工程带回来的那一行保留**。
  3. `applyArchivedExtras(text)` 载入工程时**先清** `state.vcd = null` / `state.outputs = []` /
     `state.simWatches = []`，再恢复 —— **画布整体换人**，上一份设计的 VCD 对新画布毫无意义。
  4. `resetSourceFiles()` 扩为「新工程全复位」（加 `vcd`/`outputs`/`simWatches`/`lastTestbench` +
     `refreshVcdTree`/`updateTbViewer`/`render`），与 C12「新建就地重置」一致。
- **预防**（通用）：
  - 「**带元数据的注入产物**」存档时**一律只存找回元数据**，波形/值交给核心；并且**要假设核心一定
    丢元数据** —— 凡是被渲染或生成 TB 依赖的字段（注入标记 / 位宽 / 路径），恢复时都要显式补回。
  - 任何「**依赖外部状态（VCD）派生**」的渲染链路，都要写明「外部状态为空时」的语义（此处 =
    用工程带回来的行），否则表现就是**静默丢弃**（不报错、只是没了）。
  - 载入新文档的**第一步永远是清空上一份文档派生的全部状态**；「换人（换设计）」与「重建（重渲染）」
    是两件事，不能混。
  - 向后兼容要显式：旧工程**无该字段 → 观察行清空**（口径 = 观察行以工程为准），**不沿用内存旧登记**；
    用 e2e-rtl I5 钉死（旧工程载入后 `legacyWatches:0` / `legacyInjected:0` 且不报错）。
