// ============================================================================
// WavePaintClean js/core/heartbeat.js —— launcher 存活心跳
// ----------------------------------------------------------------------------
// 背景（2026-09-03 修「运行一段时间后仿真服务不在线」）：
//   桌面壳 WavePaintLauncher.exe 内置一段「空闲退出」逻辑：一段时间收不到
//   lastActivity 刷新、且检测不到 Edge 应用窗口时，会停掉本地 HTTP 服务并退出。
//   但 lastActivity 只在 HTTP 请求时刷新 —— 用户在画布上纯编辑波形（画线/框选/
//   改标签）不产生任何请求；一旦窗口标题检测偶发失败（Edge 窗口标题短暂拿不到、
//   系统繁忙、窗口切换等）超过阈值，服务就被误杀，前端再点「运行仿真」就
//   Failed to fetch（表现为「仿真服务不在线」）。
//
// 本模块是根治手段：页面加载后每 2s 向同源 api/ping 报活一次（不关心返回内容，
//   失败静默），使 launcher 的 lastActivity 在页面打开期间持续刷新。关闭窗口 /
//   页面卸载后 ping 自然停止，launcher 仍能按原策略退出 —— 心跳只保活、不改变
//   「用户关窗即退出」的语义。
//
// ⚠ 后台节流防御（2026-09-04）：Edge 应用窗口被最小化/完全遮挡时，Chromium 的
//   intensive throttling 会把普通定时器降到约 1 次/分钟 —— 2s 心跳被拉长到突破
//   launcher 的空闲阈值，服务又被误杀（复现本模块要根治的问题）。对策：
//   1) visibilitychange/focus 时立即补发一次心跳；
//   2) 用 Web Worker 计时驱动心跳 —— Worker 内的定时器不受页面节流影响，
//      页面在后台也能按 2s 节奏触发（Worker 只负责计时，fetch 仍在页面发出；
//      Worker 环境里也可直接 fetch，二选一都可达服务端）。
//
// 依赖：无（独立于 __core/wpf/仿真链路，fetch 同源即可）。
// 加载顺序：任何普通 script 位置均可；建议紧跟 core/wpf.js 之后。
// ============================================================================
(function () {
  'use strict';
  var BEAT_MS = 2000;

  function beat() {
    try {
      // cache:no-store 避免命中浏览器缓存造成「假心跳」（请求根本没到服务端）
      fetch('api/ping', { cache: 'no-store' }).catch(function () { /* 服务暂不可达：静默，下轮重试 */ });
    } catch (e) { /* 同上 */ }
  }

  // 首选：Web Worker 计时（不受页面前后台节流影响）。Worker 代码走 Blob 内联，
  // 无需额外文件；Worker 里直接 fetch（Blob Worker 内相对 URL 不可靠，
  // 先在页面侧用 location.href 绝对化），失败静默。
  var workerBeat = false;
  try {
    var pingUrl = new URL('api/ping', window.location.href).href;
    var src = 'setInterval(function(){fetch(' + JSON.stringify(pingUrl)
      + ',{cache:"no-store"}).catch(function(){});},' + BEAT_MS + ');';
    var url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
    var w = new Worker(url);
    w.onerror = function () {
      // Worker 运行期失败（如 CSP 拦截）：启动页面定时器兜底（防双跑，只启一次）
      if (!fallbackStarted) { fallbackStarted = true; setInterval(beat, BEAT_MS); }
    };
    workerBeat = true;
  } catch (e) { /* 无 Worker：退回页面定时器 */ }

  var fallbackStarted = false;
  if (!workerBeat) setInterval(beat, BEAT_MS);

  // 兜底：页面回到前台/获得焦点时立即补发一次（双保险，代价可忽略）
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) beat();
    });
    window.addEventListener('focus', beat);
  }
})();
