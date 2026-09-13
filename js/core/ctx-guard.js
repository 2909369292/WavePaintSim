// ============================================================================
// WavePaintClean js/core/ctx-guard.js —— 全局右键菜单守卫（第 47 轮）
// ----------------------------------------------------------------------------
// 背景（用户报）：本应用跑在 Edge 的 --app 窗口里（见 WavePaintLauncher.cs 的
//   `msedge --app=http://127.0.0.1:<port>/index.html`），所以**页面里任何一个没有
//   自己接管右键的位置**，右键都会弹出 Edge 的原生菜单（«返回 / 刷新 / 复制 /
//   粘贴 / 全选 / 检查» 那一套）；选中文本后再右键，弹出的还是这套（含复制/粘贴），
//   看起来就像「选中文本会弹出复制、粘贴弹窗」。
// 目标（用户裁决）：
//   ① 整个软件里**一律不弹浏览器默认右键菜单**；
//   ② 有自定义右键功能的位置**照旧生效**（本模块绝不吞事件、不做 stopPropagation，
//      只 preventDefault —— 应用自己的菜单都是 DOM 浮层，不依赖原生菜单）；
//   ③ 没有自定义功能的位置 → 右键**什么都不弹**（静默，不做任何视觉反馈）。
// 实现：捕获阶段挂一条 document 级 contextmenu 监听。
//   · 捕获阶段 = 在**任何**应用内 handler（画布 / 源码行 / CM6 …）之前跑，无论
//     那些位置有没有 stopPropagation，浏览器菜单都不会漏出来；
//   · 只调 preventDefault()，事件继续照常传播 → js/wavepaint.clean.js 的
//     handleCanvasContextMenu、js/sim/rtl-panel.js 的跳转菜单等**全部不受影响**
//     （它们本来也自己 preventDefault，本模块只是兜住「没人接管」的空白区）。
// 放行开关：给元素（或其任意祖先）加 `data-native-menu` 属性即可恢复原生菜单，
//   供调试期临时使用，例如：<div data-native-menu>…</div>。
// 依赖：无。加载顺序：普通 script，早于 ui-bridge.js（越早挂越不会漏）。
// ============================================================================
(function () {
  'use strict';

  var NATIVE_OPT_IN = '[data-native-menu]';

  function guard(ev) {
    var target = ev.target;
    // 显式放行（调试用）：目标是元素或文本节点都要能往上找到这个属性
    if (target && target.closest && target.closest(NATIVE_OPT_IN)) return;
    ev.preventDefault();
  }

  document.addEventListener('contextmenu', guard, true);
})();
