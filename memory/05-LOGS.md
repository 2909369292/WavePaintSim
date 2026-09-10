# 05 · 操作日志索引

> 本文件是每日日志的导航页。详细流水账在 `memory/logs/`。
> 每次工作结束后，必须在当日日志追加记录，并在本文件更新索引。

---

## 1. 阅读顺序

1. 先看本文件，找到相关日期。
2. 再打开 `memory/logs/YYYY-MM-DD.md` 看细节。
3. 若要了解当前状态，回到 `04-PROGRESS.md`。

---

## 2. 日志索引

| 日期 | 主题 | 关键结论 |
|---|---|---|
| 2026-08-30 | 接手 + 实证定位“仿真恒为 0” | 真根因是 `rst_n` 低有效复位被默认激励恒置 0；stride 问题真实存在但不是恒 0 根因 |
| 2026-08-31 | 仿真修复 + 常见信号预填 | `e2e-sim` 固化，时钟/复位预填，主题改浅色 |
| 2026-09-01 | 解混淆核心完成 | 33K 行 `wavepaint.clean.js`，1:1 复刻验证 |
| 2026-09-02 | 分层重构完成 | `__core`/`wpf`/`editor`/`sim` 体系建立，历史 hack 清零 |
| 2026-09-03 | 私有 divisor 与交互收口 | stride 全链路统一，`parseValue` 唯一入口 |
| 2026-09-04 | 批次1~10 + 大轮收尾 | 文件菜单、实时预览、DUT 回显、顶层选择、版本显示、launcher 自愈 |
| 2026-09-08 | 参数化位宽 + 总纲 | 位宽算术交给 iverilog；regression 49/49 |
| 2026-09-09 | 记忆体系重构 + #75 Verdi P0 + #81 Bug 自研修复 + #82 遗留窗口收拢 + #93 插队混淆清理（第七轮死代码清理 + 第八轮标识符重命名）+ 第六轮收官 #89 信号名位宽显示（第九轮）+ Verdi 先行批 #85 VCD 点信号→观察行（第十轮） | 上午收敛记忆；下午完成 CM6 代码视图 / RTL Tree / VCD 全路径索引（58/58）；晚间完成 sim 瞬时离线自愈重试 / 添加信号按钮消失根治 / 教程隐形重启拦截，探针全过 + exe 重建；深夜完成「旧 Edge 窗口停死端口 → 直接无法仿真」根治（launcher 收窗 5→1，全链路验证 + exe 重建）；随后（第七轮插队）clean.js 死代码清理 33,110→17,164 行 + 删混淆源 / index.obf.html / deobfuscate.mjs / probe-core.mjs，regression 58/58、exe 重建；（第八轮·第 7 pass）把残留 `_0x…` 标识符按 ESLint-scope 绑定图重命名可读名（19,132 处 / 4,291 变量，BINDINGS OK），17,164→13,115 行、正文 `_0x` 清零，regression 58/58 + e2e-ui 73/73 + exe 重建；然后（第九轮）完成第六轮收官 #89 信号名位宽显示：clean.js 新增 `[PATCH-A6]` `displaySignalName` 仅显示层拼 `name[msb:lsb]`（不改 sig.name），测宽/宽度缓存键/`drawSignalName` fillText 两处消费，regression 62/62 + e2e-ui 73/73 + exe 重建（17:35:49）；最后（第十轮）完成 Verdi 先行批 #85：VCD 树点信号 → 画布「观察行」（ui-bridge.js `state.simWatches` + `pickVcdSignalIntoWave`，观察行 `__simInjected:true` 不进激励、重仿真按 VCD 路径自动刷新去重、删行不复活可重加；e2e-rtl 新增 D1~D6），e2e-rtl 15/15 + regression 62/62 + e2e-ui 73/73 + exe 重建（19:31:28） |
| 2026-09-09 | 第十一轮：优先级重排（纯规划文档） | 用户拍板：推迟 #84 波形查看增强与 #77 Active Annotation 打入远期；近期主线改 #86 → #76（重点：底层支持更多 Verilog 代码互动 + 代码解析能力；交互层仿 Verdi），其后 #87①/②；#87 优先级提高；侧栏/整体 UI 重构设计优先级提高（并行方案线）。更新 03/04/05/08/09 + 当日日志第十一轮；未动代码无需重建 exe | 
| 2026-09-09 | 第十二轮：加信号路径澄清 + RTL 树瘦身（纯文档 + 首批实施） | 用户拍板：**通过代码直接下信号**（代码内点/选中变量 → 画布，“中追”式 = #87①/#76 B4 唯一主路径），RTL tree 仅用于看代码层级、不需要看到接口信号 → 纯文档 commit 修订记忆口径（03/04/05/08/09 + 当日日志第十二轮）；随后**首批实施 RTL 树瘦身**：`renderRtlTree` 删「端口 Ports / 参数 Parameters」分组与模块行端口计数（meta 只显示实例数+行号），只留 文件→模块→实例 跳转；`index.html` 注释同步；e2e-rtl 新增 B3 断言；数据层 `buildRtlNav` 不动（ports/params 供解析与 B1 scope 映射复用）；e2e-rtl 16/16、regression 62/62、e2e-ui 73/73、真 exe 冒烟通过、exe 已重建（22:19:04） | 
| 2026-09-10 | 第十三轮：本地仿真服务自愈根治（#86 服务在线性专项） | 用户报「本地仿真失败/请求无响应」并要求「每次点仿真必须调用服务、必须成功」→ 查清**四类并存死因**：① exe 进程死（端口无监听、`ERR_CONNECTION_REFUSED`，旧实现只会提示重启）② 旧版每次随机端口（已开页面 origin 钉死旧端口，刷新无效）③ 端口被第三方占用（请求发给别人）④ **换版本后首次启动必崩**（`ivlRoot` 只在 cache 分支赋值 → extract 分支 `Path.Combine(null,…)`，日志 `IVL repair failed: ArgumentNullException path1`）——④ 解释了「每次重建 exe 后重启就仿真不了」的反复。根治：launcher 固定首选端口 **17817** + `/api/ping` 带 `PING_TAG` 身份标识 + extract 分支统一 `ivlRoot` 赋值 + `EnsureIvlReady` 每轮仿真前兜底 + `wavepaint://start?port=` 协议**同端口**重拉；新增 `js/core/service-guard.js`（192 行：`pingOrigin` 身份校验判活 / `discover` 同源+17817 / `relaunch` 隐藏 iframe / `recover → alive\|restarted\|elsewhere\|dead`，**绝不自动跳转**因为本应用无自动保存）；`index.html` 引入守卫 + 新增 `#sim-recover` 手动自愈按钮；`ui-bridge.js` 失败路径重写为三段自愈（在线→只给准确文案 / 不在线→快速发现并自动重试一次 / 进程真死→亮按钮+重拉+自动重试，失败才给手动指引）+ `probePlainPing`/`showRecoverPending`；`dev-server.mjs` `/api/ping` 对齐身份格式。验证：regression 62/62、e2e-sim 0 失败、e2e-rtl 16/16、e2e-ui 73/73（复跑确认）、真 exe 冒烟无异常、自建 `verify-recovery2.mjs` **17/17**（含「点运行仿真+服务已死→自愈→仿真完成」「重拉回同一端口 17817」「页面全程未跳转」）、真实 Edge 协议探针证明**隐藏 iframe 可拉起 exe**而顶层跳转/`window.open`/`<a target=_blank>` 均被 `user gesture is required` 拦下；exe 重建（20:05:06、21,881,344 B、`v0.4.0 build 2026-09-10 20:05:06 72116e0`） |

---

## 3. 日志模板

```markdown
# YYYY-MM-DD WavePaint 工作日志

## 本轮目标
1. ...

## 做了什么
- ...

## 关键结论
- ...

## 验证结果
- `node tools/regression.mjs`：...
- `node tools/e2e-sim.mjs`：...
- `node tools/probe-param.mjs`：...

## 遗留问题
- ...

## 交付提醒
- 重启应用
- 从唯一路径启动
- 面板版本号自查
```

---

## 4. 日志维护规则

- 每次工作新建或追加当日日志。
- 日志只记“做了什么、为什么、验证结果、遗留问题”，不重复需求台账。
- 涉及新坑，同步写入 `06-PITFALLS.md`。
- 涉及新决策，同步写入 `07-DECISIONS.md`。
- 涉及路线图变化，同步写入 `08-ROADMAP.md`。
