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

---

## P36 · #87② 三坑：`Ctrl+数字` 被浏览器吞 / 实例符号的 `moduleName` 被索引覆盖 / 「只 splice 不清登记 → render 复活行」（2026-09-10 第十九轮）

> 背景：#87②「模块/实例全部接口一键入波形（仿 nWave `Ctrl+4`）」实现过程中踩到三个坑。前两个
> **必须写进后续任何键盘交互 / 符号映射的实现准则**，第三个是**测试自身的设计错误**（首跑 J 段
> 58/61 的三条失败里有两条由它造成）。

### 坑 1：`Ctrl+数字` 被 Chromium/Edge 当**浏览器级加速键**吞掉，页面收不到 `keydown`

- **现象**：把触发键按「照抄 nWave `Ctrl+4`」实现（监听 `keydown` 判 `ctrlKey && key === "4"`）后，
  真人按 `Ctrl+4` **毫无反应**，而 `Ctrl+Alt+4` 立刻生效。
- **根因**：Chromium/Edge 把 **`Ctrl+数字` 注册为「切换到第 N 个标签页」的浏览器级加速键**，
  在**页面看到 `keydown` 之前**就被浏览器截走（与 `Ctrl+W` 被 `--app` 吞掉同理，见 **P33**）。
  页面侧无论挂**捕获阶段**还是 `preventDefault` 都收不到 —— 这不是「冒泡被谁停了」，是**根本没派发**。
- **解法**：触发键取 **`Ctrl/Cmd+Alt+4`**（加 `Alt` 让浏览器不再认作标签页切换）。判定要同时认三种
  输入源，避免键盘布局/小键盘差异：`key === "4" || code === "Digit4" || code === "Numpad4"`，
  并要求 `ctrlKey || metaKey` **且** `altKey`；命中后 `preventDefault() + stopPropagation()`。
- **预防（通用，务必遵守）**：
  - 给「跑在浏览器 / `--app` 窗口里的界面」设计快捷键时，**先假设浏览器会吞**：`Ctrl+W`（关窗）、
    `Ctrl+T`（新标签）、`Ctrl+N`（新窗口）、**`Ctrl+数字`（切标签页）**、`Ctrl+Shift+数字` 全部默认
    不可用；要么加修饰键（`Alt`/`Shift` 组合），要么换非冲突键位。
  - **「页面收不到事件」≠「事件被谁拦了」**：先分辨是**浏览器保留键**还是**页面级拦截**。前者
    在 `document` 捕获阶段也测不到，只能换键位；后者才谈得上去 `preventDefault`。
  - **未接线的手势必须静默放过、不吞事件**：本轮把触发块重构成 `request(via, event, handler)`，
    handler 缺省时**不调用 `preventDefault`/`stopPropagation`**（否则会把宿主里别处的同名按键一起废掉）。

### 坑 2：实例符号的 `moduleName` **被符号索引覆盖成「定义所在模块」**，被例化模块名丢失

- **现象**：`Ctrl+Alt+4` 在**实例名**上触发时（如光标停在 `u_a`），要查「这个实例是哪个模块 →
  取其全部端口」，但用 `findSymbols(index, name)` 命中项里的 `moduleName` 去查作用域，**查不到 / 查错**。
- **根因**：`buildSymbolIndex` 把每个模块体内的符号统一塞进展平表时写的是
  `entry.symbols.push({ ...symbol, moduleName: entry.name })` —— 这里的 `moduleName` 是**符号定义
  所在的模块**（实例名 `u_a` 定义在父模块 `tb` 里 → `moduleName = "tb"`），而**被例化的模块名**
  （`sub`）**只存在于 `index.instancePaths`**（`buildInstancePaths` 的 `{ path, moduleName, ... }`，
  那里的 `moduleName` 才是被例化模块）。**一个字段名，两处语义**，极易误用。
- **解法**：实例名 → 作用域**一律查 `index.instancePaths`**，按「**实例名后缀**」匹配
  （`path === name` 或 `path.endsWith("." + name)`）；多候选 → 弹 `mode="scope"` 浮层让用户选。
  **不要**用 `findSymbols` 命中项的 `moduleName` 去推被例化模块。
- **预防**：**同名不同义的字段是索引层最危险的物种**。给符号/节点造索引时，凡是可能被下游按名
  取用的字段，都要在注释里写清「这是**定义所在**模块」还是「这是**被例化**模块」；跨层查询（实例
  → 模块、符号 → scope）优先查**语义唯一**的那张表，而不是顺手复用刚命中的对象。

### 坑 3（测试陷阱）：`clearWatches()` **只 `splice` 信号数组、没清 `state.simWatches` 登记** → `render()`/`syncSimRows()` 按登记把行**重建回来**

- **现象**：下一条测试想「先清空观察行，再断言 `addVcdPathsToWave` 新加了 N 条」，于是调
  `clearWatches()`，结果断言数量时**总有残留**（被删的行又回来了），误判为「批量加入没去重 / 加了重复行」。
- **根因**：观察行是**双份状态** —— 画布上的**行**（核心 `m_signals`）和桥的**登记**
  （`state.simWatches`）。`clearWatches()` 只把行 `splice` 掉；而 `render()` / `syncSimRows()` 会**按
  登记重建行**（这正是 B5「重开工程回到画布」的机制）。只删一份 = 下次渲染复活。
- **解法 / 预防（写测试与被测试代码都适用）**：
  - 清空观察行必须**同时**清「行」与「登记」两份状态；给测试提供**唯一的清空入口**（如
    `clearAllWatches()` = `m_signals.splice` + `state.simWatches = []` + `render()`）。
  - **断言别依赖「全局清空」的副作用**：本轮该断言改为用 `addVcdPathsToWave` 返回的
    三桶 `{ added, existed, missing }` 与「新增行数」对照（e2e J7），**不再靠“先清空再数总量”**。
  - 通用规律：**凡是「派生渲染」的状态（画布行 / 高亮 / 树节点），源头与产物都要能各自清、各自
    验**；只清产物会在下一次派生时打回原形。

---

## P37 · 第二十五轮四坑：splitter「拖拽与鼠标对不上」三因叠加 / 行号列缺 `white-space:pre` 吃掉整块宽度 / 类名冲突跨面板串味 / 原型残留 `_0x_` 前缀（2026-09-13）

> 背景：用户报「波形的时间标跑进源码区」「窗口大小拖拽和鼠标坐标对不上」「已有绘图 UI 尽量别改」。
> 前两坑是**真 bug 的真根因**（都是「看起来像 A、其实是 B」的类型），第三坑是原型类名治理，
> 第四坑是解混淆收尾。**改 splitter / 布局 / 波形刻度 / 源码行号列之前先读本节。**

### 坑 1：splitter 拖拽量与视觉位移脱钩 —— 三处模型缺陷**叠加**，只修任何一处都无效

- **现象**：拖拽面板分隔条时，鼠标移 30px，卡边界却移 60px / 几乎不动 / 越拖越飞；「和鼠标坐标对不上」。
- **根因（三处，缺一不可地共同致错）**：
  1. **把累计位移当增量反复叠加**：`onMove` 里用 `ev.clientY - startY` 得到的是**从起点算的总位移**，
     旧实现却把它当作「本帧增量」再累加进权重 → 每帧重复计入，**越拖越飞**。
  2. **单位不一致**：`weights` 语义上被当**像素**使用，但 `applyWeights()` 会把它**归一化成占比**
     （`flex-grow = w / Σw * 100`）后再写 DOM → 像素与占比两套单位在同一变量上打架。
  3. **触到 `min-height` 后无恒定换算系数**：旧模型 `flex-basis: 0` + `flex-grow: 占比`，一旦某卡被
     `min-height` 顶住，剩余空间分配就不再线性 —— **px ↔ 权重之间不再有恒定比例**，
     于是「拖多少 ≠ 动多少」。
- **解法（现役模型，勿改回）**：`js/sim/panel-layout.js`
  - `applyWeights` = **`flexBasis: <卡片基线 px>`** + **`flexGrow: <占比>*100`** + **`flexShrink: 0`**
    （`flexBasis` 用**像素**兜底，`flexGrow` 只做**剩余空间**的按比例分配 → 单位不再混用）；
  - **`applyMinHeights` 同源同时写 `minHeight` 与 `flexBasis`**（此前窗口 resize 只重算 `min-height`，
    `flex-basis` 留在旧值 = 错位根因之一）；
  - `onPointerDown` 记录 **`startHeightA`（起始高度快照）**，`onMove` 走
    **`resizePairTo(pair, startHeightA + delta)`**（基于**快照 + 当前总位移**，**不是**逐帧累加）；
  - 辅助函数 `cardBaseline` / `pairSlackPx` 提供「基线 px / 可分配余量」两个稳定量。
- **预防（拖拽类交互通用）**：① **指针移动必须用「起始快照 + 累计位移(相对起点)」计算**，禁止把
  `clientX/Y - startX/Y` 再累加；② **一个变量只承载一种单位**（像素就像素、比例就比例，转换点写清）；
  ③ 只要布局里存在 `min-*` 约束，就必须用「基线 + 增量 + 钳制」模型，**不能**假设 `grow` 与像素成线性。

### 坑 2：行号列（gutter）缺 `white-space: pre` → 行号换行吃掉宽度，**时间标被挤进源码区**

- **现象**：波形区的时间刻度 `1 2 3 4…` **错误地显示在源码区**（用户以为是波形绘制错位）。
- **根因**：源码行号列 `.mk-gutter` 未设 `white-space: pre` → 多行行号在窄容器里**自动换行**，
  行号列被撑到可容纳最长文本的宽度（实测 `gutW 369`，正常应为 `32`），把源码 `bodyW` 挤到 `59`，
  于是相邻的波形刻度看起来「跑进了源码区」。**不是绘制层的问题，是 CSS 缺一个属性。**
- **修法 / 证据**：加 `white-space: pre` → `gutW 369→32`、`bodyW 59→396`，断言 `ticksInSource === 0`。
- **预防**：**行号 / 刻度 / 标签这类「一行一项、不参与断行」的窄列，必须显式 `white-space: pre`
  （或 `nowrap`）**；否则任何容器收窄都会触发换行并把整块布局挤歪。同类窄列同样适用 `min-width:0`
  配合 `flex-shrink` 的写法。

### 坑 3：类名冲突跨面板串味 —— `.mk-tick` 同时是「波形刻度」与「菜单勾选」

- **现象**：波形刻度样式被菜单勾选样式污染（或反之），视觉错乱但功能不报错。
- **根因**：原型里两个不相干语义共用了 `.mk-tick` 类名。
- **修法**：波形刻度改名为 **`.mk-wave-tick`**（语义化前缀）。
- **预防**：**短类名（`.tick`/`.dot`/`.tag`/`.item`）在同一样式表里是冲突高发区**；原型/多面板
  项目应给类名加**模块前缀**（如 `.mk-wave-*` / `.mk-menu-*`），或直接 `data-*` 作用域限定。

### 坑 4：解混淆**收尾残留** —— 函数名早已可读，局部变量仍留 `_0x_` 前缀

- **现象**：`js/wavepaint.clean.js` 正文里还能 grep 到 `_0x`（例如 `_0x_wpfQuickCleanup`）。
- **根因**：第七/第八轮解混淆（死代码清理 + 标识符重命名）处理了**主体标识符**，但有一批
  **局部变量/内部回调名**（`_0x_wpf*`）漏网，共 32 处。
- **修法**：`_0x_wpfXxx` → `wpfXxx`（去掉前缀即可，**名字本身已可读**）；**正文 `_0x` 归零**
  （仅保留文件头注释 3 处历史说明）。**触发 C1 → 必须重建 exe + C8 核验**（`_0x_wpf` 计数应为 0）。
- **预防**：解混淆「完成」的判定标准 = **正文（排除注释）里 `_0x`/`\xNN` 正则命中为 0**，
  不能只抽查函数名。`lib/*.min.js` 是**第三方正常压缩**，**不算**混淆代码，不要动。

---

## P38 · 第二十六轮两坑：PS5.1 按 GBK 读无 BOM 的 `.ps1` 中文全乱 / Edge `--app` 窗口不能靠 `CommandLine` 判活（2026-09-13）

### 坑 1：PowerShell 5.1 读**无 BOM** 的 `.ps1` 会把中文读成乱码

- **现象**：新写的 `build-prototype.ps1` 执行报“字符串缺少终止符”之类语法错，或中文提示语变乱码，但文件内容看起来完全正常。
- **根因**：PowerShell 5.1 对**无 BOM** 的脚本文件按**系统 ANSI（中文机 = GBK / CP936）**解码；`.ps1` 里只要有一个中文，字节就可能被解释成引号/括号，直接破坏语法。
- **修法**：项目内**所有** `.ps1`（`build.ps1`、`build-prototype.ps1`、临时脚本）都必须存成 **UTF-8 with BOM**；写完用 `Format-Hex -Path x.ps1 -Count 3` 或 `head -c 3` 确认前 3 字节为 `EF BB BF`。
- **连带坑**：`$home` 是 PowerShell 的**只读内置变量**（指向用户主目录），**不能当普通变量名**用（赋值会失败或污染环境）；本项目里改用 `$homePage`。
- **预防**：新建/改写任何 `.ps1` 后，**第一件事**是核 BOM，再执行；**注意**：这条只针对 `.ps1`，`memory/**.md`、`js/**` 等本文件族是**UTF-8 无 BOM**，不要顺手加 BOM（会污染 diff）。

### 坑 2：Edge `--app` 打开后，**不能**用 `Win32_Process.CommandLine` 判定窗口/进程是否存活

- **现象**：启动器已用 `msedge.exe --app=...` 弹窗，但按 `CommandLine` 里是否含 `--app` 去筛进程时，要么一个都筛不到、要么筛到一堆不相关 Edge 主体进程，导致“窗口还开着却判定已退出”（提前自杀）或“窗口已关却判定还开着”（永不退出）。
- **根因**：`--app` 参数只出现在**根启动进程**的命令行上，Edge 会把它交接给已有的浏览器主进程 / 新起的子进程，**子进程命令行不含 `--app`**；用 `CommandLine` 匹配既不稳定又容易误伤用户正常在用的 Edge 窗口。
- **修法**：改用 Win32 `EnumWindows` + `GetWindowText`，**按窗口标题**判定；原型启动器判定条件 = 存在任一同进程族的顶层窗口，标题**含「原型」**（即 `WavePaint UI 原型（假界面 · 未连接后端）`）。找不到 ⇒ 视为已关闭 ⇒ 12 秒宽限期后自动退出。
- **预防**：任何“等 GUI 关闭后收尾”的逻辑，**判据一律用窗口标题/句柄，不要用进程命令行**；同时注意进程族匹配别误伤用户既有浏览器窗口。

---

## P39 · 第二十七轮一坑：拖拽闭包**缓存 DOM 引用**，被中途重建后写进「游离节点」（2026-09-13）

### 坑：拖拽预览与松手后落位不一致 + 拖动中按钮/页签✕乱闪 —— 同一个根因

- **现象**：① 拖动面板时，跟随指针的「预览矩形」和松手后「实际落位」不一致（有时预览动了、落位没动，或反过来）；② 拖动中面板头部的 `⧉ ▣ ✕` 按钮、页签上的 `✕` 会闪现/乱闪，CSS 里明明写了 `body.mk-dragging ... opacity:0 !important` 却失效。
- **根因**：拖拽处理函数在 `pointerdown` 时把 DOM 引用**缓存进闭包**（`const el = …; const handle = …; const slots = …`），而拖拽过程中会有一个 60ms 的 `afterLayout()` 定时器派发 `window` 的 `resize`，原型监听 resize → `render()/renderFloats()` → **整棵 DOM 被重建**。此时闭包里缓存的是**已被替换掉的游离节点**：
  - 往游离 `el` 上写 `style.transform` / `dataset` → **视觉上什么都不发生**（写进了空气）→ 预览与落位不一致；
  - 往游离 `handle` 上加 `.active`、用 `el.classList` 判断拖动态 → 活节点上类名没变 → 拖动中的按钮显隐 CSS 失效 → 乱闪。
- **实证**：探针日志 `[fdrag.up] elConnected=false sameEl=false sameF=true` —— 位置状态 `f.x/f.y` 确实更新了，但被写在**未连接**（`isConnected===false`）的旧 `el` 上。
- **修法**（原型 `prototype/ui-mockup.js`，三条铁律）：
  1. **稳定 id**：`split` 节点补 `id`（`'s-' + (++seq)`）并落 `el.dataset.splitId`；浮窗本就有 `data-float`。
  2. **每次查活节点**：`move` 里不用缓存引用，一律 `layer.querySelector('[data-float="id"]')` / `[data-split-id="id"]` 现查，`|| el` 兜底；写完在 `pointerup` 统一 `renderFloats()` + `persist()` 收尾。
  3. **监听挂 `window`**：`pointermove/pointerup/pointercancel` 从 `handle` 改挂 `window`（手柄被换掉也不中断），并补 `pointercancel` 取消分支；跨重建的「正在拖动」状态用**模块级变量**（`draggingFloatId`）承载，`renderFloats()` 按它拼 `.dragging` 类。
- **预防**：**任何会跨异步/跨重渲染存活的交互（拖拽、悬停、选中），都禁止把 DOM 节点缓存在闭包里**；要么存「稳定 id / 数据」，要么每次现查活节点。这条已升格为决策 **D27**，并加 5 条回归断言（`tools/mock-probe.mjs` I1~I5：重建后仍在拖动 / 预览==落位 / 清理状态 / 分隔条跟随 / 逐像素相等）长期看守。

---

---

## P40 · `body` 没有 100vh → 工作区被压塌成 19px（整条停靠 UI 看起来"没生效"）

- **症状**：`#workbench` 高度实测 **19px**，四个面板挤成一团/全不可见，用户第一反应是"停靠根本没做出来"。
- **根因**：真机 `body` 是普通块流（高度由内容撑开），`css/wavepaint.e7b903ef.css` 里 `#main-area{height:calc(100vh - 78px)}` 等旧规则按"整页滚动"假设写。改成 `#workbench{height:calc(100vh - 86px)}` 这类定高外壳后，父级没有确定高度 → `height:calc(...)` 退化成内容高度，三个纵向 flex 子项被实测最小高度挤到 19px。
- **修法**：`css/workspace.css` 首条规则写死 `body.wp-dock{display:flex;flex-direction:column;height:100vh;overflow:hidden}`（**勿删**，这是整个停靠布局的地基）。
- **预防**：任何"占满视口 + 内部分区"的外壳，**必须先把 `html/body` 的高度链打通**（`height:100vh` + `overflow:hidden`），否则所有 `flex:1` / `calc(100vh-…)` 都是空中楼阁。探针 §1 固定断言 `#workbench = {x:0,y:86,w:1680,h:868}`（Emulation 1680×980）。

---

## P41 · 核心 `drawWaveform()` 不监听 `resize` → 面板变宽后画布停在旧尺寸（右侧留白/内容被裁）

- **症状**：把波形面板拖宽（908 → 1666）后，波形内容仍按旧宽度绘制 → 右侧大片空白或内容被裁切。
- **根因**：绘图核心 `js/wavepaint.clean.js` 的 `drawWaveform()` **不订阅 `window.resize`**（真机旧版里靠外层 `#main-area` 宽度不变来回避该问题）；面板宽度现在由停靠引擎任意改变 → 无人触发重绘。
- **修法**：`js/sim/dock/workspace.js` 的 `redrawWave()` 调 `window.__wpf.scheduleRedraw()`（核心既有的重绘调度入口），并在 `afterLayout()` 里 **rAF 一次 + 60ms 定时器再一次**（前者跟手，后者兜住 CSS 过渡/字体就绪等迟到的尺寸变化）。
- **预防**：**改容器尺寸 ≠ 内容自动适配**。凡是把绘图/编辑器节点搬进可缩放容器的改造，必须显式接管"尺寸变化 → 重绘/重排"链路（CM6 侧同理，见 `installCodeEditor().remeasure()`）。探针 §5 断言画布随面板宽重算（908→1666）。
- **⚠ 不要**去给 `js/wavepaint.clean.js` 加 resize 监听（C9 冻结该文件；调度入口在 `ui-bridge`/`__wpf` 侧）。

---

## P42 · 指针移出窗口 / 切走窗口 → 拖拽"僵尸态"（落点提示不消失、下次点击行为错乱）

- **症状**：拖面板时鼠标滑出窗口再松开 → 落点预览框一直挂着；或 Alt+Tab 切走 → 回来后面板处于"半拖拽"状态；严重时下一次点击被当成拖拽续接。
- **根因**：旧实现把 `pointermove/pointerup` 挂在**拖拽手柄节点**上，且没有 `pointercancel` 分支 —— 指针离开节点/窗口后事件链断开，`pointerup` 永远收不到 → 收尾逻辑（清预览、提交落位、清外观类）全部没跑。
- **修法（三件套，见 07 D30）**：① 四种拖拽全 `setPointerCapture(ev.pointerId)`；② 监听挂 `window`（含 `pointercancel`）；③ `activeDragCancels:Set` + `cancelAllDrags()`，由 `Esc` / `window blur` / `pointercancel` 三条路径触发 → 一律 `endPanelDrag(false)`（**取消、不提交**）。
- **预防**：**指针交互的收尾必须"无论如何都会执行"**。凡是 `pointerdown` 开了状态，就必须在 `pointerup` + `pointercancel` + `blur` + `Esc` 四条路径上都能关掉它。

---

## P43 · 外缘环带与页签条几何重叠 → 「并入某组」被「新建整行」顶掉

- **症状**：把面板拖到某个组的页签条上，预览框显示的却是"整行新建"，松手后多出一整行而不是并入该组。
- **根因**：`hitTestOp()` 里外缘环带（`DROP.outer=14`）判定写在页签条（`DROP.tabBand=3`）**之前**；而页签条紧贴工作区内缘 → 同一坐标同时命中两者，**先判者胜**（环带抢走）。
- **修法**：**判定顺序改为"页签条优先，外缘环带兜底"**；唯一例外 = **顶边最外 `DROP.outerTop=8`** 窄带仍优先判"新建整行"（否则顶部页签条顶格，永远无法在顶部新建整行）。见 07 D31。
- **预防**：**重叠热区必须显式规定优先级并写进常量表**；"更具体的热区优先于更宽泛的热区"是通用原则。

---

## P44 · 浮窗复用停靠落点判定 → 永远被"组内部追加"吸走，无法自由摆放

- **症状**：浮窗（双击页签浮出的 `.mk-float`）怎么拖都会被某个组吸进去，预览与最终位置不一致；用户报"拖动的预览和最后实际的效果不一致"。
- **根因**：浮窗拖动**调用同一个 `computeDrop()` 且没区分场景**，而停靠场景的判定包含"落在组矩形内部 → 并入该组" → 工作区绝大部分面积都被某个组的矩形覆盖 → 浮窗松手必被吸收。
- **修法**：`computeDrop(x, y, panelId, strict)` 增加 `strict` 形参；**浮窗拖动传 `strict=true`** —— 只认 ① 工作区外缘环带、② 组的页签条；组矩形内部判定在 strict 下全部失效。见 07 D32。
- **预防**：**同一份"落点计算"服务多种拖拽语义时，必须把语义差异参数化**（strict/loose），不要指望调用方自觉。预览与落位共享同一数据源（D28 第 3 条）仍要遵守。

---

## P45 · `✕` 无护栏 → 用户可关光全部面板，得到"空工作区死局"

- **症状**：面板逐个 `✕` 后工作区全空，页面没有任何入口能把面板加回来（状态栏是只读的）。
- **根因**：`✕` 按"关闭"实现且无最小数量约束；恢复功能当时只存在于设想中的状态栏（而状态栏被定为纯只读）。
- **修法**：① `✕` 语义定为**隐藏**（宿主节点摘到 `#mk-park`，不销毁）；② `hidePanel()` 加护栏 —— 只剩 1 个可见面板时**拒绝**并 `flash()` 中文提示；③ 恢复入口 = **页签条上的 `＋` 菜单**（6 面板 + 3 预设 + 恢复默认）；④ `restore()` 读到旧版"零可见面板"数据时兜底回 `presetSim()`。见 07 D33。
- **预防**：**任何"可把 UI 删空"的交互都必须同时给出护栏与恢复入口**，且恢复入口要放在**始终可见**的位置（本例 = 页签条，不是底部只读状态栏）。

---

## P46 · 【重建路径】`render()` 只按 `.mk-split` 清根 → 布局树塌成单 `tabs` 时孤儿 `.mk-group` 累积（四区变六区）

- **症状**：把面板一路隐藏到只剩 1 个，再点"恢复默认布局" → 页面出现 **6 个组**（本应 4 个），多出来的组是空壳/重叠残影。
- **根因**：`render()` 清理语句是 `wb.querySelectorAll(':scope > .mk-split')` —— **按"根一定是 split"的假设写死**。当布局树塌成单个 `tabs` 节点时，`render()` 在顶层插入的是 `.mk-group`（不是 `.mk-split`）→ 旧根节点匹配不到清理选择器 → **永不被删** → 每次恢复布局都叠加一层。
- **实证**：`tools/dock-probe.mjs` §8 末项首跑即 FAIL（`reset()` 后 `.mk-group` 计数 6 ≠ 4），是**探针先于用户发现**的 bug。
- **修法**：`render()` 产出根节点时打标 `built.dataset.mkRoot = '1'`（`insertBefore(built, floatsLayer)`），清理改用 `wb.querySelectorAll(':scope > [data-mk-root]')` —— **与根节点类型无关**。见 07 D34。
- **预防**：**"重建整棵子树"的清理逻辑绝不能依赖子树的形状**（根是 split / group / tabs 都可能）；用**显式标记**（dataset）表达"这是我上次插的根"，而不是用选择器去猜。这条与 D27（禁止缓存 DOM）互为姊妹：D27 管拖拽期间不抓旧节点，本坑管重建时不漏删旧根。

---

## P47 · 作者样式 `.source-actions{display:grid}` 盖掉 UA 的 `[hidden]` → 只加 `hidden` 属性按钮不消失

- **症状**：要「隐掉」源码面板的「导入源码 / 移除文件 / 解析 RTL / 生成 TB」四个按钮，给容器 `.source-actions` 加了 `hidden` 属性，**界面上按钮仍然在**、位置照旧占位。
- **根因**：`hidden` 属性靠 **UA 样式表**的 `[hidden] { display: none }` 生效，特异性 (0,1,0) 极低；而 `index.html` 内联样式里的作者规则 `.source-actions { display: grid; }` 特异性同为 (0,1,0)，但**来源优先级更高**（作者 > UA）→ 直接盖掉 → 仍是 `display:grid`。
- **实证**：第三十六~三十七轮（2026-09-13）改完 `index.html` 后真机 / headless 下四个按钮依旧可见，`tools/source-panel-probe.mjs` §1 首跑即可复现。
- **修法**：补一条作者规则 `.source-actions[hidden] { display: none !important; }`（写在 `index.html` 的 `<style>` 内、紧邻 `.source-actions` 原规则，并加注释说明原因）。
- **预防**：**任何靠 `hidden` 属性隐藏的元素，只要它（或它的祖先容器）身上有作者 `display` 规则，就必须显式补 `[hidden]{display:none!important}`**。这是「用 CSS 隐藏而不删节点」的通用前提 —— 保契约面（id 仍在）与视觉裁剪（看不见）必须同时成立。

---

## P48 · `#toolbar` 窄屏溢出：末端控件被推出视口 → 坐标点击 / `elementFromPoint` 落到空处（「点运行仿真没反应」的真凶）；修法禁用 `overflow-x:auto`

- **症状**：窄窗口（`tools/e2e-ui.mjs` I8 用 750×485）下按坐标点 `#sim-run`，`hitIsRun:false`；用户侧长期表现为「**点运行仿真没有任何反应**」（历史 `P-UI-02` 的相邻现象）。
- **根因（两层）**：① `#toolbar` 是 `flex-wrap: nowrap` + `overflow: visible`，内容总宽 ≈**1470px** → 窄窗口下末端按钮被**推出视口之外**（`getBoundingClientRect()` 计算出的中心点已不在视口内）→ `elementFromPoint` 返回 `null`，任何坐标点击都落空；② 改成 `flex-wrap: wrap` 让按钮回到视口内（y=113）后，**又**被 `#sim-panel`（`position:fixed`，`top:92px` **硬编码**）盖住（`stack[0]` = `#sim-panel-header`）—— 因为换行后工具带实测高变成 **110px**（底 150px）> 92px。
- **实证**：临时探针 `.e2e-tmp/i8dbg.mjs` 逐步打印 `elementFromPoint` 命中栈（首诊 `hitTag:null` → 换行后 `stack[0]=#sim-panel-header`）；`tools/e2e-ui.mjs` I8 首跑即 FAIL。
- **修法**：a) `css/workspace.css` 加 `#toolbar { flex-wrap: wrap; }`；b) `js/sim/ui-bridge.js` 新增 `syncToolbarHeight()` 把实测高写进 `--wp-toolbar-h`（立即 + `resize` + `DOMContentLoaded` + `ResizeObserver` 四时机刷新）；c) `#sim-panel` 的 `top` 改 `calc(40px + var(--wp-toolbar-h, 46px) + 6px)`。验证：`stack[0] = BUTTON#sim-run`、I8 PASS、`ui-audit real` 1280/1440 溢出 **192px / 32px → 0px**。
- **⚠ 禁止用 `overflow-x: auto` 修**：按 CSS 规范，`overflow-x: auto` 会让 `overflow-y` 的 `visible` **计算为 `auto`** → 工具带会**裁掉** `.dropdown-content` / `.submenu-content` 这类绝对定位的弹出菜单（它们必须溢出工具带才能显示）→ 换来「点得动」但「菜单被裁」。**换行是唯一安全解**（08 §7.9 第 3 条的 `⋯` 溢出菜单属 U3 增强，不冲突）。
- **预防**：**任何「常驻工具带 + 一排定宽控件」的布局，都必须显式定义窄屏降级行为（换行 / 溢出菜单），并且顶距一律用 CSS 变量而非硬编码像素**；断言这类「可见却点不到」的 bug 要用**真实坐标点击 + `elementFromPoint` 命中栈**，不能只断言 `getBoundingClientRect()` 存在。

---

## P49 · 【脚本改 C# 源码】`"@@LOG:\n"` 里的 `\n` 被写成**真实换行** → 字符串字面量跨行，`csc` 直接编译失败（CS1010 / CS1646）

- **症状**：用脚本给 `WavePaintLauncher.cs` 注入 `"@@LOG:\n"` 这类转义串之后，`.\build.ps1` 报编译错误（`CS1010: 常量中有换行符` / `CS1646: 关键字、标识符或字符串应有 …`），构建**直接失败**，exe 无法产出。
- **根因**：本项目所有文本改动都走「Node 脚本 + 字符串替换」。在 JS 里写 `'… "@@LOG:\n" …'` 时，`\n` 是 **JS 自己的转义**，会被求值成一个**真实换行符**写进文件 → C# 源码里的字符串字面量**断成两行** → 编译不过。同一脚本重复跑还会**重复插入**（因为匹配串也被改掉了）。
- **实证**：第三十八~三十九轮给 `RunSimulationCore()` 加 `@@LOG:` / `@@VCD:` 协议时命中。**正确落盘形态**必须是（`\n` = 反斜杠 + `n` 两个字符）：
  `?: "@@LOG:\n" + simLog + "\n@@VCD:\n" + vcd`
- **修法**：脚本里一律写 **`\\n`**（JS 层多转义一层）；改完**必须回读文件原文核对** —— `rg -n '@@LOG' WavePaintLauncher.cs` 看到的应是单行内 8 个字符 `"@@LOG:\n"`，而**不是**跨行的两个字面量。排错顺序：`node tools\gen-resources.mjs` → 手跑 `csc` 看**第一手**报错行号。
- **预防**：**凡是用脚本向「自带转义语法的语言」（C#、C、JSON、正则、shell）注入文本，都必须多转义一层，并在写完回读校验**。验收 = `rg` 特征串命中 + 构建 `csc exit: 0` + **C8 特征串计数 ≥1**（见 02 §C8）。

---

## P50 · `#sim-status` 是**单行**元素：多行文本塞进去会挤成一坨；`.mk-cline` 是**计行契约**不可改名

- **症状**：把仿真完成的**多行**摘要（端口表 + 波形统计）整段写进 `#sim-status`，界面上所有行**挤成一坨**（没换行、没滚动），用户看不出内容；日志流的行数统计也会对不上。
- **根因**：`#sim-status` 历史上只承载**一行**状态文本（定高 / 不换行），**不是多行容器**；第 39 轮确立的「唯一文本状态出口」是 `#sim-console-log`，它才是**按行**渲染的容器（一行 = 一个 `div.mk-cline`）。
- **修法**：① **单行口径** —— 任何要写 `#sim-status` 的文本先经 `firstLine()` 截**首行**（`js/sim/ui-bridge.js`），**多行内容只走日志流**；② **日志流契约** —— 一行一条 `div.mk-cline`、首行带 `[HH:MM:SS] ` 时间戳、续行缩进 **11 空格**、环形上限 `CONSOLE_MAX = 300`、追加后自动滚底。
- **预防**：**「单行状态位」与「多行日志流」是两种不同控件，禁止互相代填**（想加提示 = 加一行日志，不是往状态位里塞一段文本）。另：**`.mk-cline` 类名是计行契约** —— `tools/dock-probe.mjs:128` 按它统计日志行数，**改名会静默打断停靠回归**，改名前必须先全局搜索引用点。见 07 D36。

---

## P51 · 状态出口从 `#sim-status` 换成日志流后，探针里 `slice(0,60/90)` 会把最要紧的尾巴切掉

- **症状**：删掉单行状态行后 `tools/e2e-rtl.mjs` **10 条断言集体失败**（D4 / G1 / G5 / G6 / I3 / J1~J5），但页面行为其实是对的（假红）。
- **根因**：探针的读取片段是「自最后一条 `正在为 …` 起的**全量**日志拼接」——开头是 `[HH:MM:SS] 正在为 counter 运行仿真…`，
  而调用点普遍是 `status().slice(0, 60 / 80 / 90)`：**截的是头**，真正要断言的「已在波形中 / 已将 … 个接口加入波形 / 未在 VCD 中找到」全在 90 字符之外。
- **修法**：把 13 处读取统一定义成「**最新一条带时间戳的消息块**」——在 `#sim-console-log` 的子节点里取最后一个
  `textContent.indexOf("[") === 0`（首行带 `[HH:MM:SS]`，续行是 11 空格缩进）作起点，切到末尾；这样 `.slice(0,60)` 拿到的就是最新文案。
- **预防**：**改状态出口必须连带检查探针的切片起点与截断长度**；断言「最新状态」就不要用「自某历史锚点起」的切片。
  另注意**反面断言**（`J5`：`!/个接口/`）依赖「切片里只有最新文案」——所以不能图省事改成全量 `l.textContent`。

---

## P52 · 分隔条「小长条」悬停/拖动时突然变得非常长且跑偏：撑满写法没覆盖基线的 `transform`

- **症状**：拖 `#workbench .mk-handle`（四区分隔条）时，那条 34px 的短横杠**瞬间变成一条贯穿整屏的长条**，
  而且位置跑飞、跟指针不对应（用户报「拖动时小长条会突然变得非常非常长」）。
- **根因**：`css/workspace.css` 的 `.mk-handle::before` **基线**用「定长 + `top:50%` + `transform: translate(-50%,-50%)`」居中；
  而 `:hover` / `.active` 态改成「`top:6px; bottom:6px`（竖向）/ `left:6px; right:6px`（横向）撑满」，
  `transform` 却**没被覆盖**——于是平移量仍按**新高度的一半**算（实测竖向条 `ty = -317.75px`，高度 635.5px），
  长条被整体顶出可视区、看起来又长又偏。
- **修法**：撑满态必须**同时重写 `transform`** —— 竖向条保留 `translateX(-50%)`（只做水平居中）、
  横向条保留 `translateY(-50%)`（只做垂直居中），**长轴平移量归零**。
- **预防**：**任何「定长 + 双轴 translate 居中」的元素改写成「top/bottom 撑满」时，必须连带检查 `transform`**
  （这是 CSS 居中两套写法的经典冲突面）。回归判据：`.e2e-tmp/probe46.mjs` 读
  `getComputedStyle(handle, '::before')` 的 `transform` 矩阵 —— 竖向条 `ty≈0`、横向条 `tx≈0`，
  且长轴长度 ≈ 容器长 - 12px。另注意 `prototype/ui-mockup.css:77-90` 有**同构**样式（原型冻结、本轮未动）。

### P53 嵌套 split 撞号 → 拖横条却高亮竖条（`querySelector` 是**子树**搜索）

- **现象**：拖「上下分界那条横条」调「仿真状态」栏高矮时，变绿高亮的是**竖向**分隔条；拖竖条也亮竖条 ——「无论拖哪条，亮的都是竖条」。
- **根因**：`js/sim/dock/workspace.js` 的 `startSplitDrag()` 用
  `liveSplit().querySelector('.mk-handle[data-split-idx="' + idx + '"]')` 找「拖动态要贴 active 的那条 handle」。
  `querySelector` 是**子树深度优先**搜索，而 `data-split-idx` 只在一个 split 内部唯一：
  **root 的列 split（idx=0）与其首个 slot 里的行 split（也是 idx=0）撞号**，文档序上子 split 的 handle 更靠前，
  于是拖横条时 `.active` 被贴给了竖条（视觉上「横条不亮、竖条亮」）。
- **修法**：给每条 handle 打归属标识 `h.dataset.splitOwner = node.id`（`buildNode()` 内），
  拖动时按 `owner + idx` 双条件取：
  `.mk-handle[data-split-owner="<node.id>"][data-split-idx="<idx>"]`。
  （第 47 轮修；回归判据：`.e2e-tmp/probe47.mjs` 断言「按下横条时 active 恰 1 条且是横条本人、竖条 `::before` 非强调色」。）
- **预防**：**任何用 `querySelector` 在一个可嵌套结构里按「局部序号」定位元素的写法都是坑**——
  嵌套同构 DOM 的序号只在「同一个父容器」内唯一。要先按容器归属过滤，再按序号取；
  或直接用元素引用（`handle` 变量）而非重新查询。读 active 态时注意 `::before` 的 `background` 有 `.12s` 过渡，
  断言前需 `sleep(>=260ms)`，否则读到 `rgb(84,178,88)` 这类过渡中间色。

### P54 时间轴标的是 `timePerStep × timeUnit`，而 TB 恒 `` `timescale 1ns/1ps `` ⇒ **读数放大 10 倍**（第 49 轮实测，正确性级）

- **现象**：画布开启「时间轴」后，同一格的时间读数比仿真真实时间大 10 倍 —— 默认 `timePerStep = 10` + `timeUnit = ns` ⇒
  画布标「10 ns / 格」，而仿真真实是「**1 格 = 1 个 TB 时间单位 = 1 ns**」。
- **根因**：`js/sim/engine.js:770` / `:772` 生成的 TB **恒定** `` `timescale 1ns/1ps ``，且 TB 语义是「1 格子 ≡ 1 时间单位」
  （`engine.js:820`）；画布标注侧却用 `timePerStep`（`js/wavepaint.clean.js:8931`）× `timeUnit`（`:8930`）标注（绘制 `:8767`）。
  回填按 `tmax / timeSteps` **等比映射**（`engine.js:1029`）把偏差掩盖了 —— 所以**只看波形形状看不出来**，必须按读数核对。
  `rg timeUnit` 全仓只命中 TB 那两行 ⇒ **`project.timeUnit` 根本没有前端写入点**（画布设置改了也传不到 TB）。
- **修法方向**：TB 的 `timescale` 由「每格代表的时长」反推（`timePerStep × timeUnit` ⇒ 默认应是 `` `timescale 10ns/1ps ``），
  或在 UI 侧统一口径；登记为 **#104**，与「时间单位设置项」同批做。
- **验收断言（可复算）**：仿真一个已知周期时钟 → 光标量出周期格数 × 每格时长 == 画布读数；且 != 旧值（10 倍差）才说明真的修好。
- **预防**：**任何「画布标注口径」与「后端生成的时间基准」分处两地写死时，必须做一次端到端读数对拍**；
  尤其 `timeUnit` / `timePerStep` 这类「有变量名但无写入点」的参数，读代码时容易误判为已生效。

---
### P55 搬运 DOM 节点会清零滚动位置：拖分隔条后代码框跳回顶部

- **现象**：拖动 dock 的分隔条（改源码面板宽度 / 改仿真状态高度）后，源码 / TB 代码框**滚动位置回到最上面**
  （`scrollTop` 400 → 0）。纯 CSS 或 CodeMirror 复现不出来。
- **根因**：`js/sim/dock/workspace.js` 的 `render()` 为了「整块搬家不克隆节点」，先把真机节点 `parkHost` 到
  `#mk-park` 再重建树搬回 —— **元素一旦脱离文档，浏览器就销毁该滚动容器的布局对象，`scrollTop/scrollLeft` 归零**。
  （`render()` 会被拖拽预览、面板隐藏/显示、布局预设等大量路径调用 ⇒ 症状看起来像「拖动才有」。）
- **修法**：`render()` 里加一对「快照 / 回填」——`snapshotScrollState()` 在 `parkHost` **之前**按
  「面板宿主子节点下标路径」记录所有非 0 的 `scrollTop/scrollLeft`（含宿主自身，递归 `HOST_PANELS`），
  `restoreScrollState(snap)` 在 `renderFloats()` 之后回填（`try/catch` 兜底）。共 +51 行。
- **预防**：**任何「先把节点移出文档、再搬回来」的复用手法都要显式保存/恢复滚动状态**
  （同理还有 input 的 `selectionStart`、`<details>.open`、焦点）。新增「搬运式重排」时默认套这套快照。
- **验收**：`.e2e-tmp/probe50-scroll.mjs` —— 长源码滚到 400 → 拖源码左边界竖条 / 拖仿真状态上方横条 →
  `scrollTop` 必须仍是 400（修复前 `before=400 after=0`）。

---
### P56 拖动一条分隔条，别的分隔条跟着跑（同向嵌套 split + flex Σ<1）

- **现象**：三列布局（左中右）下拖**右边**那条竖条，**左边**那条跟着一起平移。用户口径：这是 bug。
- **根因 1（几何）**：三列往往是**同向嵌套 split**（`row[ row[a,b], c ]`）。拖外层边界 = 改整棵左侧子树的宽度
  ⇒ 它内部那条竖条**必然**平移。这在几何上完全正确（VS Code / Verdi 的停靠引擎同行为），但用户要的语义是
  「**被拖的那条跟随指针，其余分隔条绝对像素位置锁死**」。判据：读持久化布局（Edge leveldb
  `wavepaint.workspace.layout.v1`）确认树上确实是同向嵌套，而不是「联动」这种 bug 级别的东西。
- **根因 2（CSS）**：**Flexbox 在 `Σflex-grow < 1` 时只分配 `freeSpace × Σgrow`，剩余留空**。
  只改份额不归一 ⇒ 收缩时 Σ 掉到 1 以下 ⇒ 整个 split 集体缩水（实测 rtl 份额没变却 312 → 271px）。
- **修法**（`js/sim/dock/workspace.js`）：拖动开始 `snapshotSplitBasis(root)` 抓一次全树基准
  `split → {f: 像素/份额, sizes, px}`；每帧把 **±δ（相对拖动起点的总位移）** 记到「贴被拖边界那一端」的子项头上再递归：
  交叉轴 → 每个孩子都变 δ；同向 → `target = 基准副本; target[k] += d/f`，随后**整组归一到 Σ=1**；
  地板 `min(24px, 基准像素/2)`，返回实际吸收量。最后 `syncSplitFlex(root)` 把份额写回**活 DOM 的 `.mk-slot` inline flex**
  （补偿改的是嵌套层，DOM 还是上次 `render()` 建的）。`cancel()` 必须 `basis.forEach(n => n.sizes = b.sizes.slice())` **整树回滚**。
- **预防**：① 补偿量一律用「**基准 + 总位移**」重算，不要用逐帧增量 —— 浏览器对 flex 的亚像素取整会让误差
  **单向累积**（拖回原点时分界线回不到原位），用基准重算是幂等的。② 任何「改份额」的地方都要保证 Σ=1。
  ③ 拖动期间每帧补一次 `.active`（期间任何 `render()` 都会重建 handle，只在开始时加会丢）。
- **验收**：`tools/split-drag-probe.mjs`（4 种结构含 3 种嵌套 × 每条 handle × 4 方向）须 ALL PASS；
  口径 = 位移跟随指针 ±6，**或**同向且被压侧 ≤124px（顶到地板，物理无解）。

### P57 需要用户手势的 API 在被消耗手势的处理器里必然失败（依赖补齐）

- **现象**：`＋` 导入文件后仍缺依赖时，只写一行「去点菜单/去点＋」的文字提示 —— 用户照做很费解。
- **根因**：`showDirectoryPicker` 需要 **transient activation**，而触发汇报的路径
  （`<input type=file>` 的 `change`、切顶层的 `change`）**已经把手势用掉了** ⇒ 直接调必抛 `SecurityError`。
- **修法**：`workspace.js` 新增 **`window.wpConsoleAction(label, onClick, kind)`** —— 在日志流里追加一行**行内按钮**
  （行类 `mk-cline mk-act`，按钮 `.mk-cline-btn`）。用户点它的那一刻 = **全新手势**，picker 正常弹出。
  `ui-bridge` 的 `reportMissingDependencies()` 用 `clearDepAction()` 先摘旧行、有缺口才挂新按钮。
- **预防**：① 点击处理器里**绝不能把 `depActionBtn` 置空** —— 那一行要留给流程末尾的 `reportMissingDependencies()`
  → `clearDepAction()` 自己摘（否则点击后旧行赖着不走；探针 `btnGone` 会 FAIL）。② 该行被 `CONSOLE_MAX` 裁剪掉时
  `line.parentNode` 为 null，`clearDepAction` 必须有 guard。③ 行内按钮优于模态框：不占固定界面高度、可被忽略。
- **验收**：`tools/dep-probe.mjs` §5 —— 按钮出现（文案含「补齐依赖」）→ 点击 → picker 恰好 1 次 → 缺口清空 → 按钮自动消失。

---
> 以上为截至**第五十三轮（2026-09-14）**的坑位清单，共 **P1~P57**。每条格式：现象 → 根因 → 修法 → 预防；带 `#NN` 的对应 `03-REQUIREMENTS.md` 需求号。
