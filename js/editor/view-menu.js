// ============================================================================
// WavePaintClean js/editor/view-menu.js —— 顶栏「窗口 / 视图」菜单 + 面板与视图设置
// ----------------------------------------------------------------------------
// 第 48 轮用户需求（原文口径）：
//   1. 「在最上面一栏（文件编辑视图这一栏）增加一个栏或者寄生在某一个栏里，
//       可以对波形框、代码框、仿真状态框等进行增添或者编辑 —— 按更加专业的
//       仿真工具标准去增加设置或选项。」
//      → 新增一级菜单「窗口」（面板显隐 / 浮动停靠 / 布局预设 / 恢复默认布局）
//        与集中式「面板与视图设置…」对话框；「视图」菜单末尾追加显示类设置
//        （波形格宽 / 代码字号 / 全屏）。
//   2. 「帮助」里的「教程」删除；「联系」改为极简「关于」页面（先留空，后续放
//      版权提示 / 制作人信息）。
//
// ── 为什么这些动作必须写在本文件里，而不能只写 data-action ──────────────────
//   核心 initMenuHandlers 在脚本执行时对当时 DOM 里的 [data-action] **一次性**
//   绑定，并统一派发到 handleAction(val) 的 switch。那个 switch 位于
//   js/wavepaint.clean.js（C9 红线：一行不能动），不可能为新增菜单加 case。
//   所以本模块用独立属性 data-wpv-* + 自建监听，与核心零耦合：
//     · data-wpv-panel="<id>"     切换面板显隐（✓ / ＋）
//     · data-wpv-float="<id>"     面板在「停靠」与「浮出」之间切换（▣ / ◱）
//     · data-wpv-preset="<name>"  套用布局预设 sim / edit / review
//     · data-wpv-layout-reset     恢复默认布局（= 仿真预设，hard 重置）
//     · data-wpv-cell="<px>"      设置波形每格宽度（核心 setWaveCellWidth）
//     · data-wpv-cell-fit         适应窗口（核心 zoomFit）
//     · data-wpv-codefont="<px>"  代码框字号
//     · data-wpv-fullscreen       全屏显示 / 退出全屏
//     · data-wpv-settings         打开「面板与视图设置…」
//     · data-wpv-about            打开「关于 WavePaint」
//
// ── 依赖与执行时机 ──────────────────────────────────────────────────────────
//   · 面板动作走停靠引擎公开 API window.__wpDock（js/sim/dock/workspace.js）。
//     该文件在 </body> 前、比本文件晚执行，所以这里**延迟取**（每次动作时才读），
//     绝不缓存 null。带 ?dock=off 逃生口时 __wpDock 永不存在 → 面板类菜单项
//     自动退化为一条中文提示，而不是抛错。
//   · 波形格宽走核心全局 setWaveCellWidth / zoomFit；代码框字号与行号显隐走
//     css/view-menu.css 的 CSS 变量与 body.wpv-no-gutter（不动
//     lib/codemirror.bundle.js 一个字节，理由见该 CSS 文件头注释）。
//   · 本文件是普通 script，排在 js/editor/file-menu.js 之后；#menu-bar 此时已解析
//     完毕，故菜单绑定立即执行，不需要 __wpf.ready / __core.ready。
//
// ── 设置持久化 ──────────────────────────────────────────────────────────────
//   localStorage['wavepaint.view.settings.v1'] = { codeFont, consoleFont,
//   showGutter, waveCell }。刻意与工作区布局键（停靠引擎自己管的
//   'wavepaint.workspace.layout.v1'）分开：布局是「拖出来的」，这里是「选出来的」。
//   损坏 / 隐私模式下读失败一律回落默认值，不阻断启动。
// ============================================================================
(function () {
  'use strict';
  if (window.__wpvViewMenu) return;
  window.__wpvViewMenu = true;

  // ─────────────────────────────────────────────────────────── 1. 设置存储
  const LS_KEY = 'wavepaint.view.settings.v1';
  const DEFAULTS = Object.freeze({
    codeFont: 13,      // 代码框（SV 源码 / TB）字号 px
    consoleFont: 12,   // 仿真状态框字号 px
    showGutter: true,  // 代码框行号槽
    waveCell: null     // 波形每格宽度 px；null = 不干预核心默认值（48）
  });
  const settings = Object.assign({}, DEFAULTS);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw) || {});
  } catch (e) { /* 隐私模式 / 脏数据：保留默认值 */ }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) { /* 忽略 */ }
  }
  function num(v, lo, hi, dflt) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
  }

  // 面板标题：与停靠引擎 PANELS 的 title 同源（这里自带一份，避免依赖引擎已就绪）
  const PANEL_TITLES = {
    wave: '波形',
    source: 'Verilog / SV 源码',
    rtl: 'RTL 结构树',
    vcd: 'VCD 信号层次',
    tb: 'Testbench (TB)',
    console: '仿真状态'
  };
  const PANEL_IDS = Object.keys(PANEL_TITLES);

  // ─────────────────────────────────────────────────────── 2. 统一状态出口
  // 「仿真状态」面板的日志流是全应用唯一的状态出口（第 39 轮裁决）。
  // 布局动作由停靠引擎的 flash() 自己写；本模块的动作（字号 / 格宽 / 全屏…）
  // 也一并写进去，保证用户在任何时刻都能回溯「我刚才改了什么」。
  function flash(text, kind) {
    try {
      if (typeof window.wpConsoleAppend === 'function') window.wpConsoleAppend(text, kind || 'info');
    } catch (e) { /* 日志不可用不影响动作本身 */ }
  }

  // ─────────────────────────────────────────────────────────── 3. 停靠引擎
  function dock() { return window.__wpDock || null; }
  function panelVisible(id) {
    const d = dock();
    if (!d) return false;
    try { return d.visiblePanels().indexOf(id) >= 0; } catch (e) { return false; }
  }
  function panelFloating(id) {
    const d = dock();
    if (!d) return false;
    try { return !!d.floats && Object.prototype.hasOwnProperty.call(d.floats, id); } catch (e) { return false; }
  }
  function togglePanel(id) {
    const d = dock();
    if (!d) return flash('当前为旧侧栏模式，面板管理不可用（去掉网址里的 ?dock=off 即可）', 'warn');
    if (panelVisible(id)) d.hidePanel(id);   // hidePanel 自带「至少保留一个面板」的守卫与提示
    else d.showPanel(id);
  }
  function toggleFloat(id) {
    const d = dock();
    if (!d) return flash('当前为旧侧栏模式，面板管理不可用（去掉网址里的 ?dock=off 即可）', 'warn');
    if (!panelVisible(id)) d.showPanel(id);  // 隐藏中的面板先请回来，再谈浮动
    if (panelFloating(id)) d.dockPanel(id, null);
    else d.floatPanel(id);
  }
  function applyPreset(name) {
    const d = dock();
    if (!d) return flash('当前为旧侧栏模式，布局预设不可用', 'warn');
    d.applyPreset(name, true);
  }

  // ───────────────────────────────────────────────────── 4. 观感设置的应用
  function applyCodeFont() {
    document.documentElement.style.setProperty('--wpv-code-font', num(settings.codeFont, 9, 30, 13) + 'px');
  }
  function applyConsoleFont() {
    document.documentElement.style.setProperty('--wpv-console-font', num(settings.consoleFont, 9, 24, 12) + 'px');
  }
  function applyGutter() {
    document.body.classList.toggle('wpv-no-gutter', !settings.showGutter);
  }
  function applyWaveCell() {
    if (settings.waveCell == null) return;
    if (typeof window.setWaveCellWidth !== 'function') return;
    if (!window.document_wave) return;   // 核心文档未就绪：不改，等下一次
    try { window.setWaveCellWidth(num(settings.waveCell, 4, 200, 48)); } catch (e) { /* 忽略 */ }
  }
  function applyVisual() { applyCodeFont(); applyConsoleFont(); applyGutter(); }

  function cellWidthNow() {
    try {
      if (typeof window.getWaveCellWidth === 'function') return window.getWaveCellWidth();
    } catch (e) { /* 忽略 */ }
    return null;
  }
  function setWaveCell(px) {
    settings.waveCell = num(px, 4, 200, 48);
    save();
    applyWaveCell();
    flash('波形每格宽度：' + settings.waveCell + ' px');
  }

  // ─────────────────────────────────────────────────────────── 5. 全屏显示
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (!isFullscreen()) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el);
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
    } catch (e) {
      flash('全屏切换失败：' + (e && e.message ? e.message : e), 'warn');
    }
  }
  function syncFullscreenLabel() {
    const li = document.querySelector('#menu-bar [data-wpv-fullscreen]');
    if (li) li.textContent = isFullscreen() ? '退出全屏' : '全屏显示';
  }
  document.addEventListener('fullscreenchange', syncFullscreenLabel);

  // ─────────────────────────────────────────────── 6. 菜单状态刷新（悬停时）
  // 菜单是纯 CSS 悬停展开的静态 HTML（#menu-bar .menu-item:hover > .submenu），
  // 没有「打开菜单」这个 JS 事件可挂。折中：鼠标一进入任一一级菜单项就把所有
  // 动态标记刷一遍 —— 用户看到的永远是点开前一刻的真实状态。
  function refreshMenuState() {
    document.querySelectorAll('#menu-bar [data-wpv-panel]').forEach(function (li) {
      const id = li.getAttribute('data-wpv-panel');
      const on = panelVisible(id);
      li.textContent = (on ? '✓ ' : '＋ ') + (PANEL_TITLES[id] || id);
      li.classList.toggle('wpv-off', !on);
    });
    document.querySelectorAll('#menu-bar [data-wpv-float]').forEach(function (li) {
      const id = li.getAttribute('data-wpv-float');
      li.textContent = (panelFloating(id) ? '◱ ' : '▣ ') + (PANEL_TITLES[id] || id);
    });
    const d = dock();
    const preset = d ? d.preset : null;
    document.querySelectorAll('#menu-bar [data-wpv-preset]').forEach(function (li) {
      li.classList.toggle('wpv-active', preset === li.getAttribute('data-wpv-preset'));
    });
    const cell = cellWidthNow();
    document.querySelectorAll('#menu-bar [data-wpv-cell]').forEach(function (li) {
      li.classList.toggle('wpv-active', cell != null && Number(li.getAttribute('data-wpv-cell')) === cell);
    });
    document.querySelectorAll('#menu-bar [data-wpv-codefont]').forEach(function (li) {
      li.classList.toggle('wpv-active', Number(li.getAttribute('data-wpv-codefont')) === Number(settings.codeFont));
    });
    syncFullscreenLabel();
  }

  // ────────────────────────────────────────────────────── 7. 菜单项事件绑定
  function bind(selector, handler) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        // 不冒泡：核心没给这些节点绑处理器（它们没有 data-action），
        // 但同一层还有别的委托监听（ctx-guard 等），少走一层少一份耦合。
        ev.stopPropagation();
        try { handler(el, ev); } catch (err) { console.error('[view-menu]', err); }
        refreshMenuState();
      });
    });
  }

  bind('#menu-bar [data-wpv-panel]', function (el) { togglePanel(el.getAttribute('data-wpv-panel')); });
  bind('#menu-bar [data-wpv-float]', function (el) { toggleFloat(el.getAttribute('data-wpv-float')); });
  bind('#menu-bar [data-wpv-preset]', function (el) { applyPreset(el.getAttribute('data-wpv-preset')); });
  bind('#menu-bar [data-wpv-layout-reset]', function () { applyPreset('sim'); });
  bind('#menu-bar [data-wpv-cell]', function (el) { setWaveCell(el.getAttribute('data-wpv-cell')); });
  bind('#menu-bar [data-wpv-cell-fit]', function () {
    try { if (typeof window.zoomFit === 'function') { window.zoomFit(); flash('波形：适应窗口'); } } catch (e) { /* 忽略 */ }
  });
  bind('#menu-bar [data-wpv-codefont]', function (el) {
    settings.codeFont = num(el.getAttribute('data-wpv-codefont'), 9, 30, 13);
    save(); applyCodeFont();
    flash('代码框字号：' + settings.codeFont + ' px');
  });
  bind('#menu-bar [data-wpv-fullscreen]', function () { toggleFullscreen(); });
  bind('#menu-bar [data-wpv-settings]', function () { openSettings(); });
  bind('#menu-bar [data-wpv-about]', function () { openAbout(); });

  document.querySelectorAll('#menu-bar > ul > li.menu-item').forEach(function (li) {
    li.addEventListener('mouseenter', refreshMenuState);
  });

  // ─────────────────────────────────────────────────────── 8. 通用对话框底座
  let maskEl = null;

  function closeDialog() {
    if (!maskEl) return;
    maskEl.remove();
    maskEl = null;
    document.removeEventListener('keydown', onDialogKey, true);
  }
  function onDialogKey(ev) {
    if (ev.key !== 'Escape') return;
    ev.stopPropagation();   // 别让 Esc 顺带触发核心的「取消拖拽」等行为
    closeDialog();
  }

  // build(body, foot) 里自行填充内容；返回 { body, foot }
  function openDialog(title, build) {
    closeDialog();
    const mask = document.createElement('div');
    mask.className = 'wpv-mask';
    mask.addEventListener('pointerdown', function (ev) { if (ev.target === mask) closeDialog(); });

    const card = document.createElement('div');
    card.className = 'wpv-dlg';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', title);

    const head = document.createElement('div');
    head.className = 'wpv-dlg-head';
    const titleEl = document.createElement('div');
    titleEl.className = 'wpv-dlg-title';
    titleEl.textContent = title;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'wpv-dlg-x';
    x.textContent = '✕';
    x.title = '关闭（Esc）';
    x.addEventListener('click', closeDialog);
    head.appendChild(titleEl);
    head.appendChild(x);

    const body = document.createElement('div');
    body.className = 'wpv-dlg-body';
    const foot = document.createElement('div');
    foot.className = 'wpv-dlg-foot';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'wpv-btn primary';
    ok.textContent = '完成';
    ok.addEventListener('click', closeDialog);
    foot.appendChild(ok);

    card.appendChild(head);
    card.appendChild(body);
    card.appendChild(foot);
    mask.appendChild(card);
    document.body.appendChild(mask);
    maskEl = mask;
    document.addEventListener('keydown', onDialogKey, true);
    if (typeof build === 'function') build(body, foot);
    return { body: body, foot: foot, close: closeDialog };
  }

  // 小控件工厂（统一样式，避免每个对话框各写一套 DOM）
  function section(parent, text) {
    const el = document.createElement('div');
    el.className = 'wpv-sec';
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }
  function row(parent, label) {
    const el = document.createElement('div');
    el.className = 'wpv-row';
    if (label) {
      const l = document.createElement('span');
      l.className = 'wpv-label';
      l.textContent = label;
      el.appendChild(l);
    }
    parent.appendChild(el);
    return el;
  }
  function button(parent, text, primary, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wpv-btn' + (primary ? ' primary' : '');
    b.textContent = text;
    b.addEventListener('click', fn);
    parent.appendChild(b);
    return b;
  }
  function checkbox(parent, label, checked, onChange) {
    const wrap = document.createElement('label');
    wrap.className = 'wpv-chk';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    input.addEventListener('change', function () { onChange(input.checked); });
    const span = document.createElement('span');
    span.textContent = label;
    wrap.appendChild(input);
    wrap.appendChild(span);
    parent.appendChild(wrap);
    return { wrap: wrap, input: input };
  }
  function hint(parent, text) {
    const el = document.createElement('div');
    el.className = 'wpv-hint';
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  // ───────────────────────────────────────────── 9. 「面板与视图设置…」对话框
  // 四组：面板（显隐 + 布局预设）/ 波形框 / 代码框 / 仿真状态框。
  // 关闭按钮一律「立即生效」——所有控件都是即时应用，没有「确定 / 取消」二段式，
  // 免得用户以为要点确定才生效（与专业仿真工具的 Preferences 面板语义一致：
  // 改完即所见）。
  function openSettings() {
    openDialog('面板与视图设置', function (body) {
      // ── 9.1 面板 ──────────────────────────────────────────────────────
      section(body, '面板（增添 / 显隐）');
      const grid = document.createElement('div');
      grid.className = 'wpv-grid2';
      body.appendChild(grid);
      const boxes = {};
      PANEL_IDS.forEach(function (id) {
        const cb = checkbox(grid, PANEL_TITLES[id], panelVisible(id), function (on) {
          if (on) { const d = dock(); if (d) d.showPanel(id); }
          else { const d = dock(); if (d) d.hidePanel(id); }
          // 引擎有「至少保留一个可见面板」的守卫：勾选态一律回读真实状态，
          // 不让复选框骗人。
          boxes[id].input.checked = panelVisible(id);
        });
        boxes[id] = cb;
      });
      const presetRow = document.createElement('div');
      presetRow.className = 'wpv-row';
      presetRow.style.marginTop = '6px';
      presetRow.appendChild(document.createTextNode('布局预设：'));
      button(presetRow, '仿真', false, function () { applyPreset('sim'); syncBoxes(); });
      button(presetRow, '编辑', false, function () { applyPreset('edit'); syncBoxes(); });
      button(presetRow, '审阅', false, function () { applyPreset('review'); syncBoxes(); });
      button(presetRow, '恢复默认布局', false, function () { applyPreset('sim'); syncBoxes(); });
      body.appendChild(presetRow);
      function syncBoxes() {
        PANEL_IDS.forEach(function (id) { boxes[id].input.checked = panelVisible(id); });
      }

      // ── 9.2 波形框 ────────────────────────────────────────────────────
      section(body, '波形框');
      const cellRow = row(body, '每格宽度');
      const cellInput = document.createElement('input');
      cellInput.type = 'number';
      cellInput.className = 'wpv-num';
      cellInput.min = '4';
      cellInput.max = '200';
      cellInput.step = '1';
      const cur = cellWidthNow();
      cellInput.value = String(cur == null ? 48 : Math.round(cur));
      cellInput.addEventListener('change', function () { setWaveCell(cellInput.value); });
      cellRow.appendChild(cellInput);
      cellRow.appendChild(document.createTextNode('px（4 – 200）'));
      button(cellRow, '适应窗口', false, function () {
        try { if (typeof window.zoomFit === 'function') { window.zoomFit(); flash('波形：适应窗口'); } } catch (e) {}
        const now = cellWidthNow();
        if (now != null) cellInput.value = String(Math.round(now));
      });
      hint(body, '时间轴模式（步号 / 时间轴）与轴数字显隐在顶栏「视图」菜单里切换。');

      // ── 9.3 代码框 ────────────────────────────────────────────────────
      section(body, '代码框（SV 源码 / TB）');
      const fontRow = row(body, '字号');
      const fontInput = document.createElement('input');
      fontInput.type = 'number';
      fontInput.className = 'wpv-num';
      fontInput.min = '9';
      fontInput.max = '30';
      fontInput.step = '1';
      fontInput.value = String(settings.codeFont);
      fontInput.addEventListener('change', function () {
        settings.codeFont = num(fontInput.value, 9, 30, 13);
        fontInput.value = String(settings.codeFont);
        save(); applyCodeFont();
        flash('代码框字号：' + settings.codeFont + ' px');
      });
      fontRow.appendChild(fontInput);
      fontRow.appendChild(document.createTextNode('px（9 – 30）'));
      const gutterRow = row(body, '显示');
      const gutterCb = checkbox(gutterRow, '行号槽', settings.showGutter, function (on) {
        settings.showGutter = !!on;
        save(); applyGutter();
        flash(on ? '代码框行号槽：显示' : '代码框行号槽：隐藏');
      });

      // ── 9.4 仿真状态框 ────────────────────────────────────────────────
      section(body, '仿真状态框（全应用统一状态输出）');
      const cFontRow = row(body, '字号');
      const cFontInput = document.createElement('input');
      cFontInput.type = 'number';
      cFontInput.className = 'wpv-num';
      cFontInput.min = '9';
      cFontInput.max = '24';
      cFontInput.step = '1';
      cFontInput.value = String(settings.consoleFont);
      cFontInput.addEventListener('change', function () {
        settings.consoleFont = num(cFontInput.value, 9, 24, 12);
        cFontInput.value = String(settings.consoleFont);
        save(); applyConsoleFont();
        flash('仿真状态字号：' + settings.consoleFont + ' px');
      });
      cFontRow.appendChild(cFontInput);
      cFontRow.appendChild(document.createTextNode('px（9 – 24）'));
      const clrRow = row(body, '日志');
      button(clrRow, '清空日志', false, function () {
        const log = document.getElementById('sim-console-log');
        if (log) log.innerHTML = '';
        flash('仿真状态：日志已清空');
      });
      hint(body, '仿真完成摘要 / 编译报错 / $display 输出 / 布局动作都追加在这里，只保留最近 300 行。');

      // ── 9.5 源码搜索目录（依赖自动补齐 · 第 54 轮）─────────────────────
      // 用户口径：「自动加信号的逻辑不需要再手动去选文件夹 …… 文件夹的配置需要改为
      // 可更改的：一般情况下与 top 同文件夹；另一种情况下 std 可能会在其他单独的文件夹。」
      //   默认根由「打开 / 导入源码时拿到的绝对路径」自动派生（文件所在目录 + 往上 3 层，
      //   见 ui-bridge 的 notePickedSourcePaths）；这里给出**可改**的入口 ——
      //   标准单元库 / 公共 IP 常常在另一棵目录树里，必须允许手工加一个根。
      // ⚠ view-menu.js 是独立 IIFE，看不到 ui-bridge 的内部状态：一律经 window.__wpsim
      //   **延迟取**（不缓存引用 —— 脚本加载顺序可能让 __wpsim 晚于本文件出现）。
      function simApi() { return window.__wpsim || null; }
      section(body, '源码搜索目录（依赖自动补齐）');
      const rootsBox = document.createElement('div');
      rootsBox.className = 'wpv-roots';
      body.appendChild(rootsBox);
      function renderRoots() {
        rootsBox.replaceChildren();
        const api = simApi();
        const roots = (api && api.depSearchRoots) || [];
        if (!roots.length) {
          const empty = document.createElement('div');
          empty.className = 'wpv-hint';
          empty.textContent = '（还没有搜索目录）用源码标签条的「＋」导入源码后，会自动登记'
            + '「文件所在目录 + 往上 3 层」。';
          rootsBox.appendChild(empty);
          return;
        }
        roots.forEach(function (root, index) {
          const line = document.createElement('div');
          line.className = 'wpv-root';
          const path = document.createElement('span');
          path.className = 'wpv-root-path';
          path.textContent = root.path + '（深度 ' + root.depth + (root.auto ? ' · 自动' : ' · 手动') + '）';
          path.title = root.path;
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'wpv-btn';
          del.textContent = '移除';
          del.addEventListener('click', function () {
            if (api) api.removeDepSearchRootAt(index);
            renderRoots();
          });
          line.appendChild(path);
          line.appendChild(del);
          rootsBox.appendChild(line);
        });
      }
      renderRoots();
      const rootRow = row(body, '');
      button(rootRow, '＋ 添加目录', false, function () {
        const api = simApi();
        if (!api) return;
        // 添加目录会弹系统选择框（原生对话框，不占浏览器手势）—— 选完回来再刷列表
        Promise.resolve(api.pickAndAddDepSearchRoot()).then(renderRoots, renderRoots);
      });
      button(rootRow, '恢复默认', false, function () {
        const api = simApi();
        if (api) api.resetDepSearchRoots();
        renderRoots();
        flash('已恢复默认搜索目录：下次打开顶层时按「顶层目录 + 往上 3 层」重新派生');
      });
      hint(body, '依赖自动补齐只在这些目录里按 <模块名>.v/.sv/.vh/.svh 惰性查找'
        + '（对齐 Verdi 的 -y +libext）。标准单元库放在别处时，在这里加一条即可。');

      // ── 9.6 恢复默认设置 ──────────────────────────────────────────────
      section(body, '恢复');
      const resetRow = row(body, '');
      button(resetRow, '恢复默认设置', false, function () {
        settings.codeFont = DEFAULTS.codeFont;
        settings.consoleFont = DEFAULTS.consoleFont;
        settings.showGutter = DEFAULTS.showGutter;
        settings.waveCell = DEFAULTS.waveCell;
        save();
        applyVisual();
        // 波形格宽回到核心默认（48 px）—— 直接指示核心设置，不经持久化值
        try { if (typeof window.setWaveCellWidth === 'function' && window.document_wave) window.setWaveCellWidth(48); } catch (e) {}
        flash('已恢复默认的面板与视图设置（布局不在此处重置，请用「恢复默认布局」）');
        cellInput.value = String(Math.round(cellWidthNow() == null ? 48 : cellWidthNow()));
        fontInput.value = String(settings.codeFont);
        cFontInput.value = String(settings.consoleFont);
        gutterCb.input.checked = settings.showGutter;
        syncBoxes();
      });
    });
  }

  // ─────────────────────────────────────────────────────── 10. 「关于」页面
  // 用户口径：极简的一页，暂时留空，后续放版权提示 / 制作人信息。
  // 版本号读 version.txt（与 #app-version / 启动日志同源），读不到就写「开发版」。
  function openAbout() {
    openDialog('关于 WavePaint', function (body) {
      const name = document.createElement('div');
      name.className = 'wpv-about-name';
      name.textContent = 'WavePaint · 波形绘制与本地仿真';
      const sub = document.createElement('div');
      sub.className = 'wpv-about-sub';
      sub.id = 'wpv-about-version';
      sub.textContent = '版本：读取中…';
      body.appendChild(name);
      body.appendChild(sub);

      const line = document.createElement('div');
      line.className = 'wpv-about-line';
      line.textContent = '版权声明、制作人信息与致谢名单将在此处展示。';
      body.appendChild(line);

      try {
        fetch('version.txt', { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.text() : ''; })
          .then(function (t) {
            const text = String(t || '').replace(/^\uFEFF/, '').trim();
            sub.textContent = '版本：' + (text || '开发版');
          })
          .catch(function () { sub.textContent = '版本：开发版'; });
      } catch (e) {
        sub.textContent = '版本：开发版';
      }
    });
  }

  // ─────────────────────────────────────────────────────────── 11. 启动应用
  // 观感设置（CSS 变量 / body 类）当下就能生效；波形格宽要等核心把画布与文档
  // 建好（核心在它自己的 DOMContentLoaded 里做），所以延到 load 之后再套一次。
  applyVisual();
  function bootWaveCell() {
    applyWaveCell();
    // 分享链接 / 示例载入是异步的，可能把核心的重绘挤到更后面；再补一次即可。
    setTimeout(applyWaveCell, 400);
  }
  if (document.readyState === 'complete') bootWaveCell();
  else window.addEventListener('load', bootWaveCell, { once: true });

  // 供自动化探针核验（tools/*.mjs）：只读快照 + 设置入口，不参与产品逻辑。
  window.__wpvView = {
    get settings() { return Object.assign({}, settings); },
    setCodeFont: function (px) { settings.codeFont = num(px, 9, 30, 13); save(); applyCodeFont(); },
    setConsoleFont: function (px) { settings.consoleFont = num(px, 9, 24, 12); save(); applyConsoleFont(); },
    setGutter: function (on) { settings.showGutter = !!on; save(); applyGutter(); },
    setWaveCell: setWaveCell,
    cellWidthNow: cellWidthNow,
    refreshMenuState: refreshMenuState,
    openSettings: openSettings,
    openAbout: openAbout,
    closeDialog: closeDialog,
    get dialogOpen() { return !!maskEl; },
    dockAvailable: function () { return !!dock(); }
  };
})();
