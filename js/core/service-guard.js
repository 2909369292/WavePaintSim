// ============================================================================
// WavePaintClean js/core/service-guard.js —— 本地仿真服务守卫（2026-09-10）
// ----------------------------------------------------------------------------
// 背景（用户报「点运行仿真 → 请求无响应」）：
//   页面与本地仿真服务（WavePaintLauncher.exe 内置 HttpListener）是「同一台机器
//   上的两个进程」，页面所有的 /api/sim 都打在 exe 的端口上。历史上有三类失败：
//     ① exe 进程退出/被杀 → 端口上没有任何东西在监听 → fetch 立刻
//        ERR_CONNECTION_REFUSED，页面提示「本地仿真服务无响应」；
//     ② exe 重启后换到了别的端口（旧版每次随机端口）→ 已经打开的页面仍指向旧
//        端口，刷新也没用；
//     ③ 端口被别的程序占用 → 页面把请求发给了「别人的」本地服务，拿到 404/乱码。
//   本模块负责把这三类都变成「可自动恢复」：
//     · ping()       —— 用带身份标识（PING_TAG）的 api/ping 判活，区分「我们的
//                       服务」与「别的程序占了同一端口」，绝不误认；
//     · discover()   —— 同源 + 首选固定端口（17817）两处探测，找到真正在服务的
//                       origin（跨端口探测允许，因为服务端对回环 origin 放行 CORS）；
//     · recover()    —— 服务完全没了 → 用 wavepaint: 协议把 exe 拉起来（首次浏览器
//                       会问一次「是否允许打开」，勾选始终允许后无感），再轮询服务上线。
//                       协议 URL 会带上「页面当前端口」，让重拉的服务回到同一端口
//                       （同源、无需跳转）。若发现服务在别的 origin，只上报
//                       'elsewhere' —— 本模块**绝不自动跳转**：本应用没有自动保存，
//                       整页跳转会把用户未保存的画布内容全部丢掉。
//   ⚠ relaunch 必须由用户手势（点击）触发，浏览器才允许启动外部协议；自动恢复
//     路径里只把它当尽力而为，失败时由调用方给出「手动双击 exe」的兜底指引。
// 依赖：无（原生 fetch / Promise）。加载顺序：普通 script，放在 ui-bridge 之前。
// ============================================================================
(function () {
  'use strict';

  var PING_TAG = 'WAVEPAINT-SERVICE';
  var PREFERRED_PORT = 17817;
  var PROTOCOL_URL = 'wavepaint://start';
  var RELAUNCH_WAIT_MS = 12000;
  var RELAUNCH_POLL_MS = 700;

  function stripSlash(origin) {
    return String(origin || '').replace(/\/+$/, '');
  }

  function currentOrigin() {
    try { return stripSlash(window.location.origin); } catch (e) { return ''; }
  }

  function currentPort() {
    try { return Number(window.location.port) || 0; } catch (e) { return 0; }
  }

  // GET <origin>/api/ping → 校验身份标识 → 返回 {origin, port, version}；失败 null。
  function pingOrigin(origin, timeoutMs) {
    var base = stripSlash(origin);
    if (!base) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var settled = false;
      var done = function (value) {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      var timer = setTimeout(function () {
        if (controller) { try { controller.abort(); } catch (e) { /* ignore */ } }
        done(null);
      }, timeoutMs || 1200);
      try {
        fetch(base + '/api/ping', {
          cache: 'no-store',
          signal: controller ? controller.signal : undefined
        }).then(function (response) {
          if (!response || !response.ok) { clearTimeout(timer); done(null); return null; }
          return response.text();
        }).then(function (text) {
          clearTimeout(timer);
          if (typeof text !== 'string') { done(null); return; }
          var trimmed = text.trim();
          // 身份标识必须匹配：否则说明这个端口上是别人的服务（旧端口文件指向了
          // 其它程序时会出现），绝不能把 /api/sim 发给它。
          if (trimmed.indexOf(PING_TAG) !== 0) { done(null); return; }
          var lines = trimmed.split(/\r?\n/);
          done({
            origin: base,
            port: Number(String(lines[1] || '').trim()) || 0,
            version: String(lines[2] || '').trim()
          });
        }).catch(function () {
          clearTimeout(timer);
          done(null);
        });
      } catch (e) {
        clearTimeout(timer);
        done(null);
      }
    });
  }

  // 同源探活（页面自己就是服务端提供的，同源命中率最高）
  function ping(timeoutMs) {
    return pingOrigin(currentOrigin(), timeoutMs);
  }

  function candidateOrigins() {
    var list = [];
    var here = currentOrigin();
    if (here) list.push(here);
    var preferred = 'http://127.0.0.1:' + PREFERRED_PORT;
    if (list.indexOf(preferred) < 0) list.push(preferred);
    return list;
  }

  // 依候选顺序探测，返回第一个真正在服务的 {origin, port, version}；都没有 → null
  function discover(timeoutMs) {
    var candidates = candidateOrigins();
    var index = 0;
    var step = function () {
      if (index >= candidates.length) return Promise.resolve(null);
      var origin = candidates[index++];
      return pingOrigin(origin, timeoutMs).then(function (found) {
        if (found) return found;
        return step();
      });
    };
    return step();
  }

  function waitForService(timeoutMs, intervalMs) {
    var deadline = Date.now() + (timeoutMs || RELAUNCH_WAIT_MS);
    var step = function () {
      return discover(1000).then(function (found) {
        if (found) return found;
        if (Date.now() >= deadline) return null;
        return new Promise(function (resolve) { setTimeout(resolve, intervalMs || RELAUNCH_POLL_MS); }).then(step);
      });
    };
    return step();
  }

  // 请求操作系统拉起本应用（wavepaint: 协议 → exe 启动后只起服务、不抢焦点新开窗口）。
  // 带上本页端口：exe 会优先在同一端口重启 ⇒ 重连后仍是同源，页面无需跳转。
  // 用隐藏 iframe 而不是顶层跳转：万一协议未注册，顶层跳转会顶掉当前页面（用户
  // 画布上的未保存内容就没了），iframe 失败最多是静默。
  function relaunch() {
    try {
      var port = currentPort();
      var url = PROTOCOL_URL + (port ? ('?port=' + port) : '');
      var frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      frame.src = url;
      (document.body || document.documentElement).appendChild(frame);
      setTimeout(function () {
        try { if (frame.parentNode) frame.parentNode.removeChild(frame); } catch (e) { /* ignore */ }
      }, 8000);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 恢复流程：返回 { state: 'alive' | 'restarted' | 'elsewhere' | 'dead', origin, port }
  //   alive     —— 服务就在本页 origin 上（可能只是刚才一次请求抖动）
  //   restarted —— 刚把 exe 拉起来，服务已在线且与本页同源，可直接重试
  //   elsewhere —— 服务在「另一个」回环 origin 上。本模块不做跳转（见文件头注释，
  //                跳转会丢未保存内容）；调用方可选择把 API 指到该 origin，或提示用户。
  //   dead      —— 确实起不来（调用方给出手动指引）
  function recover(options) {
    var opts = options || {};
    return discover(1200).then(function (found) {
      if (found) {
        if (found.origin === currentOrigin()) return { state: 'alive', origin: found.origin, port: found.port };
        return { state: 'elsewhere', origin: found.origin, port: found.port };
      }
      if (!opts.allowRelaunch) return { state: 'dead' };
      relaunch();
      return waitForService(opts.waitMs || RELAUNCH_WAIT_MS, RELAUNCH_POLL_MS).then(function (again) {
        if (!again) return { state: 'dead' };
        if (again.origin === currentOrigin()) return { state: 'restarted', origin: again.origin, port: again.port };
        return { state: 'elsewhere', origin: again.origin, port: again.port };
      });
    });
  }

  window.WPServiceGuard = {
    PING_TAG: PING_TAG,
    PREFERRED_PORT: PREFERRED_PORT,
    currentOrigin: currentOrigin,
    ping: ping,
    pingOrigin: pingOrigin,
    discover: discover,
    waitForService: waitForService,
    relaunch: relaunch,
    recover: recover
  };
})();
