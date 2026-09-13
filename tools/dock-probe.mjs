// 真机四区停靠 UI 探针：真实 Edge + dev-server + CDP
// 目的：确认 index.html 的 dock 外壳（body.wp-dock）真的渲染出「左中右下」四区、
// 波形区（#main-area）尺寸正常、拖拽预览矩形 == 落位后矩形、分隔条严格跟随指针、
// 拖拽阈值 / Esc / 失焦兜底有效、画布随面板宽度重算、无 JS 异常。
// 用法：node tools/dock-probe.mjs [端口]
// 产物：.e2e-tmp/dock-*.png 截图 + 控制台 PASS/FAIL 明细
//   ⚠ 这是一台「真机页面」的探针（tools/e2e-ui.mjs 用 ?dock=off 保住侧栏口径，
//     两者互补：e2e-ui 管旧侧栏，本探针管新停靠 UI）。
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = Number(process.argv[2]) || 8961;
const CDP = 9533;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 与其它探针一致：Edge profile / 系统 TEMP 全部落在 .e2e-tmp（已 git 本地排除），
// 免得 msedge 组件更新往 C 盘猛写（历史事故：C 盘被写满 0GB）。
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const e2eRoot = root + '/.e2e-tmp';
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(e2eRoot, { recursive: true });
mkdirSync(sysTmp, { recursive: true });
const cwd = root;
const server = spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd, stdio: 'ignore' });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

let fails = 0;
function check(name, ok, detail) {
  if (!ok) fails++;
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail !== undefined ? '  → ' + detail : ''));
}

for (let i = 0; i < 40; i++) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/index.html'); if (r.ok) break; } catch (e) {}
  await sleep(300);
}
for (let i = 0; i < 40; i++) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/css/workspace.css'); if (r.ok) { console.log('  info css/workspace.css HTTP ' + r.status); break; } } catch (e) {}
  await sleep(300);
}

const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn(edge, ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
  '--remote-debugging-port=' + CDP, '--user-data-dir=' + e2eRoot + '/edge-dock-' + Date.now(), '--no-first-run',
  '--window-size=1680,1000', 'http://127.0.0.1:' + PORT + '/index.html'], { stdio: 'ignore', env: edgeEnv });

let target = null;
for (let i = 0; i < 50; i++) {
  await sleep(400);
  try {
    const list = await (await fetch('http://127.0.0.1:' + CDP + '/json')).json();
    target = list.find((x) => x.type === 'page' && x.url.includes('index.html'));
    if (target) break;
  } catch (e) {}
}
if (!target) { console.log('页面未找到'); server.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener('open', r));
const errors = [];
const netFails = [];
const reqUrl = new Map();   // requestId → url（loadingFailed 只给 requestId，必须自己配对）
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 200));
  if (m.method === 'Network.requestWillBeSent') reqUrl.set(m.params.requestId, m.params.request.url);
  if (m.method === 'Network.loadingFailed') {
    // 浏览器自己取消的请求（页面加载期抢占 / 元素被移除）不算「资源加载失败」——
    // 真正的资源缺失在 CDP 里是 responseReceived 带 4xx，不会走 loadingFailed。
    // 这里只滤掉 canceled，其余（DNS/连接/协议层失败）一律计入，并把 URL 带上便于定位。
    if (m.params.canceled) { reqUrl.delete(m.params.requestId); return; }
    netFails.push((m.params.errorText || '') + ' ' + (m.params.blockedReason || '') +
      ' ' + (reqUrl.get(m.params.requestId) || '?'));
  }
  if (m.method === 'Network.loadingFinished') reqUrl.delete(m.params.requestId);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || '').slice(0, 200);
  return r.result ? r.result.result.value : undefined;
};
async function shot(file) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (r.result && r.result.data) { writeFileSync(file, Buffer.from(r.result.data, 'base64')); console.log('  info 截图 ' + file); }
}
function shotPath(name) { return e2eRoot + '/dock-' + name + '.png'; }

await send('Network.enable', {});
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.enable', {});
await send('Runtime.enable', {});
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 980, deviceScaleFactor: 1, mobile: false });
await send('Page.reload', { ignoreCache: true });
await sleep(5000);

// ─────────────────────────────────────────── 1. 外壳 / 四区几何
const snap = await ev(`(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const groups = Array.from(document.querySelectorAll('#workbench .mk-group')).map((g) => ({
    tabsId: g.dataset.tabsId, rect: R(g),
    tabs: Array.from(g.querySelectorAll('.mk-tab')).map((t) => t.dataset.panel + (t.classList.contains('active') ? '*' : '')),
    host: (g.querySelector('.mk-panel') || {}).firstElementChild ? g.querySelector('.mk-panel').firstElementChild.id : null,
  }));
  const ma = document.getElementById('main-area');
  const wv = document.getElementById('wave-view');
  const wc = document.getElementById('wave-canvas');
  const cs = ma ? getComputedStyle(ma) : null;
  const sc = document.getElementById('sim-console');
  return JSON.stringify({
    dockReady: document.documentElement.dataset.dockReady || '',
    hasDock: !!window.__wpDock, dockOff: !!window.__wpDockOff,
    bodyClass: document.body.className,
    wbDisplay: getComputedStyle(document.getElementById('workbench')).display,
    wb: R(document.getElementById('workbench')),
    statusBar: R(document.getElementById('wp-status-bar')),
    toolbar: R(document.getElementById('toolbar')),
    menu: R(document.getElementById('menu-bar')),
    groups,
    mainArea: R(ma), mainAreaPadRight: cs ? cs.paddingRight : null, mainAreaHeightCss: cs ? cs.height : null,
    waveView: R(wv),
    canvas: wc ? { cssW: Math.round(wc.getBoundingClientRect().width), cssH: Math.round(wc.getBoundingClientRect().height), attrW: wc.width, attrH: wc.height } : null,
    consoleHasStatus: !!(sc && sc.querySelector('#sim-status')),
    consoleLogLines: document.querySelectorAll('#sim-console-log .mk-cline').length,
    simPanelVisible: getComputedStyle(document.getElementById('sim-panel')).display,
    handles: document.querySelectorAll('.mk-handle').length,
    layoutText: (document.getElementById('wp-layout') || {}).textContent,
    panelsText: (document.getElementById('wp-panels') || {}).textContent,
  });
})()`);
console.log('\n=== 1. 外壳 / 四区几何 ===');
console.log(snap);
let S = {};
try { S = JSON.parse(snap); } catch (e) { console.log('快照解析失败', e); }
check('dock 引擎接管（__wpDock + dockReady）', S.hasDock === true && S.dockReady === '1', 'dockOff=' + S.dockOff);
check('body.wp-dock + #workbench display:flex', /wp-dock/.test(S.bodyClass || '') && S.wbDisplay === 'flex', S.wbDisplay);
check('#workbench 有高度', S.wb && S.wb.h > 300, JSON.stringify(S.wb));
check('四区（4 个 .mk-group）', (S.groups || []).length === 4, (S.groups || []).map((g) => g.tabs.join('|')).join('  /  '));
const gs = S.groups || [];
const gOf = (p) => gs.find((g) => (g.tabs || []).some((t) => t.replace('*', '') === p));
const gWave = gOf('wave'), gRtl = gOf('rtl'), gSrc = gOf('source'), gCon = gOf('console');
check('中间 = 波形区（#main-area）', !!gWave && gWave.host === 'main-area' && gWave.rect.w > 500, JSON.stringify(gWave && gWave.rect));
check('左侧 = RTL/VCD 区', !!gRtl && gRtl.host === 'sim-card-rtl' && gRtl.rect.x < (gWave ? gWave.rect.x : 0), JSON.stringify(gRtl && gRtl.rect));
check('右侧 = 源码/TB 区', !!gSrc && gSrc.rect.x > (gWave ? gWave.rect.x : 0), JSON.stringify(gSrc && gSrc.rect));
check('底部 = 仿真状态区（整行）', !!gCon && gCon.rect.y > (gWave ? gWave.rect.y + gWave.rect.h - 5 : 0), JSON.stringify(gCon && gCon.rect));
check('#main-area 尺寸 > 0 且 padding-right 已归零', S.mainArea && S.mainArea.w > 300 && S.mainArea.h > 100 && (S.mainAreaPadRight === '0px' || S.mainAreaPadRight === '0'), 'padRight=' + S.mainAreaPadRight + ' h=' + S.mainAreaHeightCss);
  // 画布至少要盖满视图（真实判据在 §5：面板比内容宽时画布必须跟着长）。
  check('波形画布不窄于视图', !!S.canvas && !!S.waveView && S.canvas.attrW >= S.waveView.w - 2 && S.canvas.attrH >= S.waveView.h - 2,
    JSON.stringify(S.canvas) + ' vs view ' + JSON.stringify(S.waveView));
check('#sim-console 内含 #sim-status', S.consoleHasStatus === true);
check('旧侧栏已隐藏', S.simPanelVisible === 'none', S.simPanelVisible);
check('存在可拖分隔条', S.handles >= 3, S.handles + ' 条');
  check('底部状态栏存在', S.statusBar && S.statusBar.h > 10, JSON.stringify(S.statusBar) + ' ' + S.layoutText + ' | ' + S.panelsText);
  // 「所有分栏都在编辑栏（工具带）之下」——用户点名的硬约束，直接按矩形验。
  check('所有分栏都在工具带之下、状态栏之上', (() => {
    const t = S.toolbar, sb = S.statusBar;
    if (!t || !sb) return false;
    return gs.every((g) => g.rect.y >= t.y + t.h - 1 && g.rect.y + g.rect.h <= sb.y + 1);
  })(), 'toolbar ' + JSON.stringify(S.toolbar) + ' statusbar ' + JSON.stringify(S.statusBar));
check('所有面板节点未被克隆（各 id 唯一）', await ev(`(() => {
  const ids = ['main-area','wave-view','wave-canvas','sim-card-source','sim-card-rtl','sim-card-vcd','sim-card-tb','sim-console','sim-status','sim-recover'];
  return ids.every((i) => document.querySelectorAll('#' + i).length === 1);
})()`) === true);
await shot(shotPath('1-default'));

// ─────────────────────────────────────────── 2. 拖拽：预览矩形 == 落位矩形
async function tabRect(panel) {
  const j = await ev(`(() => { const t = document.querySelector('.mk-tab[data-panel="${panel}"]');
    if (!t) return null; const r = t.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`);
  return j ? JSON.parse(j) : null;
}
async function groupRect(panel) {
  const j = await ev(`(() => { const t = document.querySelector('.mk-tab[data-panel="${panel}"]');
    if (!t) return null; const g = t.closest('.mk-group'); const r = g.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }); })()`);
  return j ? JSON.parse(j) : null;
}
async function drag(from, to, steps = 12) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(from.x + (to.x - from.x) * i / steps);
    const y = Math.round(from.y + (to.y - from.y) * i / steps);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    await sleep(20);
  }
  await sleep(120);
}

console.log('\n=== 2. 拖拽预览 == 落位 ===');
// 目标：把「VCD 信号层次」页签（左区）拖到波形组中部的左侧边缘 → 波形组左侧切分
const srcTab = await tabRect('vcd');
const waveG = await groupRect('wave');
check('取到 vcd 页签与波形组矩形', !!srcTab && !!waveG, JSON.stringify(srcTab) + ' ' + JSON.stringify(waveG));
if (srcTab && waveG) {
  const target = { x: waveG.x + 30, y: waveG.y + Math.round(waveG.h / 2) };
  await drag(srcTab, target);
  const during = await ev(`(() => {
    const d = document.getElementById('mk-drop');
    const r = d.getBoundingClientRect();
    return JSON.stringify({ display: getComputedStyle(d).display, cls: d.className,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      ghost: !!document.querySelector('.mk-drag-ghost'), dragging: document.body.classList.contains('mk-dragging') });
  })()`);
  console.log('  拖动中预览: ' + during);
  await shot(shotPath('2-drag-preview'));
  const P = JSON.parse(during);
  check('拖动中：有 ghost + mk-dragging + 落点框可见', P.ghost && P.dragging && P.display === 'block', P.cls);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(500);
  const after = await groupRect('vcd');
  console.log('  落位后 vcd 组: ' + JSON.stringify(after) + '  预览: ' + JSON.stringify(P.rect));
  const d = (a, b) => Math.abs(a - b);
  const ok = after && P.rect.w > 0 && d(after.x, P.rect.x) <= 3 && d(after.y, P.rect.y) <= 3 && d(after.w, P.rect.w) <= 3 && d(after.h, P.rect.h) <= 3;
  check('落位矩形 == 预览矩形（±3px）', ok, JSON.stringify(after) + ' vs ' + JSON.stringify(P.rect));
  check('vcd 已独立成区（不是原先的 rtl 组）', await ev(`(() => {
    const t = document.querySelector('.mk-tab[data-panel="vcd"]');
    const g = t && t.closest('.mk-group');
    return !!(g && g.querySelectorAll('.mk-tab').length === 1);
  })()`) === true);
  await shot(shotPath('3-after-drop'));
}

// ─────────────────────────────────────────── 2.5 拖拽健壮性（阈值 / Esc / 失焦）
// 这三条是「窗口拖动等问题」的直接回归：① 手抖不该把点击变成拖拽；
// ② Esc 必须把进行中的拖拽完全收尾；③ 窗口失焦（Alt+Tab）同理。
console.log('\n=== 2.5 拖拽健壮性 ===');
const rtlTab = await tabRect('rtl');
if (rtlTab) {
  const dragState = () => ev(`JSON.stringify({ ghost: !!document.querySelector('.mk-drag-ghost'),
    dragging: document.body.classList.contains('mk-dragging'), drop: getComputedStyle(document.getElementById('mk-drop')).display })`);
  // ① 阈值：按下后只抖 2px —— 不应进入拖拽态
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rtlTab.x, y: rtlTab.y, buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rtlTab.x, y: rtlTab.y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rtlTab.x + 2, y: rtlTab.y, button: 'left', buttons: 1 });
  await sleep(80);
  const jitter = JSON.parse(await dragState());
  check('抖动 2px 不进拖拽态（点击仍是点击）', !jitter.ghost && !jitter.dragging && jitter.drop === 'none', JSON.stringify(jitter));
  // ② 超过阈值 → 进入拖拽态；再按 Esc → 完全收尾且布局不变
  const beforeEsc = await ev(`JSON.stringify(window.__wpDock.root.children.map((c) => c.sizes ? c.sizes.slice() : null))`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rtlTab.x + 120, y: rtlTab.y + 60, button: 'left', buttons: 1 });
  await sleep(80);
  const dragging = JSON.parse(await dragState());
  check('超过阈值进入拖拽态（ghost + mk-dragging）', dragging.ghost && dragging.dragging, JSON.stringify(dragging));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rtlTab.x + 120, y: rtlTab.y + 60, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(200);
  const afterEsc = JSON.parse(await dragState());
  const sizesAfterEsc = await ev(`JSON.stringify(window.__wpDock.root.children.map((c) => c.sizes ? c.sizes.slice() : null))`);
  check('Esc 收尾：无 ghost / 无 mk-dragging / 落点框隐藏', !afterEsc.ghost && !afterEsc.dragging && afterEsc.drop === 'none', JSON.stringify(afterEsc));
  check('Esc 取消不改布局', beforeEsc === sizesAfterEsc, beforeEsc + ' vs ' + sizesAfterEsc);
  // ③ 失焦兜底：开始拖拽后触发 window blur → 同样收尾
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rtlTab.x, y: rtlTab.y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rtlTab.x + 130, y: rtlTab.y + 70, button: 'left', buttons: 1 });
  await sleep(80);
  await ev(`window.dispatchEvent(new Event('blur'))`);
  await sleep(150);
  const afterBlur = JSON.parse(await dragState());
  check('失焦兜底：无 ghost / 无 mk-dragging', !afterBlur.ghost && !afterBlur.dragging, JSON.stringify(afterBlur));
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rtlTab.x + 130, y: rtlTab.y + 70, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(150);
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(300);
} else check('取到 rtl 页签', false);

// ─────────────────────────────────────────── 3. 分隔条拖拽
console.log('\n=== 3. 分隔条拖拽 ===');
const h0 = await ev(`(() => { const h = document.querySelector('.mk-handle'); const r = h.getBoundingClientRect();
  const g = h.parentElement.children;
  const slot = Array.from(g).filter((c) => c.classList.contains('mk-slot'))[0];
  const sr = slot.getBoundingClientRect();
  return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
    dir: h.className, boundary: Math.round(sr.right), slotW: Math.round(sr.width) }); })()`);
const H = h0 ? JSON.parse(h0) : null;
if (H) {
  const before = await ev(`JSON.stringify(window.__wpDock.root.children.map((c) => c.sizes ? c.sizes.slice() : null))`);
  const DX = 60;
  // 拖动中（还没松手）分界线就该已经跟着指针走 —— 这条抓的是「鼠标坐标对不上」
  await drag(H, { x: H.x + DX, y: H.y });
  const midBoundary = await ev(`(() => { const h = document.querySelector('.mk-handle');
    const slot = Array.from(h.parentElement.children).filter((c) => c.classList.contains('mk-slot'))[0];
    return Math.round(slot.getBoundingClientRect().right); })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: H.x + DX, y: H.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(400);
  const after2 = await ev(`JSON.stringify(window.__wpDock.root.children.map((c) => c.sizes ? c.sizes.slice() : null))`);
  check('拖分隔条后比例变化', before !== after2, before + ' → ' + after2);
  const postBoundary = await ev(`(() => { const h = document.querySelector('.mk-handle');
    const slot = Array.from(h.parentElement.children).filter((c) => c.classList.contains('mk-slot'))[0];
    return Math.round(slot.getBoundingClientRect().right); })()`);
  check('拖动中分界线严格跟随指针（+60px ±3px）', Math.abs(midBoundary - (H.boundary + DX)) <= 3,
    '起 ' + H.boundary + ' → 拖中 ' + midBoundary + '（期望 ' + (H.boundary + DX) + '）');
  check('松手前后分界线不跳变（±2px）', Math.abs(postBoundary - midBoundary) <= 2,
    '拖中 ' + midBoundary + ' → 松手 ' + postBoundary);
  check('拖完没有残留拖动状态', await ev(`document.body.classList.contains('mk-dragging') || !!window.__wpDock.__drag || !!document.querySelector('.mk-drag-ghost')`) === false);
} else check('找到分隔条', false);

// ─────────────────────────────────────────── 4. 浮出 / 收回 / 预设 / 持久化
console.log('\n=== 4. 浮出 / 预设 / 持久化 ===');
await ev(`window.__wpDock.applyPreset('review', true)`);
await sleep(400);
const rv = await ev(`JSON.stringify({ floats: Object.keys(window.__wpDock.floats), groups: document.querySelectorAll('.mk-group').length, fdom: document.querySelectorAll('.mk-float').length })`);
check('审阅预设：浮窗 DOM 与状态一致', (() => { const o = JSON.parse(rv); return o.floats.length === o.fdom; })(), rv);
await shot(shotPath('4-review'));
await ev(`window.__wpDock.applyPreset('sim', true)`);
await sleep(400);
check('恢复仿真预设后回到四区', await ev(`document.querySelectorAll('.mk-group').length`) === 4);
// 浮出 → 收回到工作区
await ev(`window.__wpDock.floatPanel('rtl')`);
await sleep(300);
check('浮出 rtl 后 #sim-card-rtl 仍在文档中且可见', await ev(`(() => { const e = document.getElementById('sim-card-rtl'); return !!e && e.getBoundingClientRect().width > 50; })()`) === true);
await ev(`(() => { const f = document.querySelector('.mk-float[data-float="rtl"]'); const b = f.querySelector('.mk-float-head button'); b.click(); })()`);
await sleep(300);
check('收回后 .mk-float 消失、面板回到停靠树', await ev(`document.querySelectorAll('.mk-float').length`) === 0);
// 隐藏 / 显示
await ev(`window.__wpDock.hidePanel('vcd')`);
await sleep(200);
check('隐藏面板后节点进 #mk-park 且仍可 getElementById', await ev(`(() => { const e = document.getElementById('sim-card-vcd'); return !!e && e.closest('#mk-park') !== null; })()`) === true);
await ev(`window.__wpDock.showPanel('vcd')`);
await sleep(200);
// 持久化
await ev(`window.__wpDock.persistState()`);
const ls = await ev(`localStorage.getItem('wavepaint.workspace.layout.v1')`);
check('布局已写入 localStorage[wavepaint.workspace.layout.v1]', !!ls && ls.length > 50, ls ? ls.slice(0, 80) + '...' : 'null');
check('无 JS 异常', errors.length === 0, errors.slice(0, 3).join(' || '));
check('无资源加载失败', netFails.length === 0, netFails.slice(0, 3).join(' || '));
await shot(shotPath('5-final'));

// ─────────────────────────────────────────── 5. 画布随面板宽度重算（核心不支持 resize 的坑）
// 真机核心 drawWaveform() 里画布宽 = max(内容宽, #wave-view.clientWidth)，而且
// 核心**不监听 window resize** —— 全靠停靠引擎每次重排后显式 scheduleRedraw()。
// 判据：把其余面板全部隐藏，波形区宽度（≈1666）超过内容固有宽（默认 30 步 = 1540）时，
// 画布必须跟着长到视图宽度；若不重绘就会停在 1540（右边一条空白）。
console.log('\n=== 5. 画布随面板宽度重算 ===');
const narrow = await ev(`JSON.stringify({ view: document.getElementById('wave-view').clientWidth,
  attrW: document.getElementById('wave-canvas').width })`);
await ev(`['rtl','vcd','source','tb'].forEach((p) => window.__wpDock.hidePanel(p))`);
await sleep(600);
const wide = await ev(`JSON.stringify({ view: document.getElementById('wave-view').clientWidth,
  attrW: document.getElementById('wave-canvas').width })`);
console.log('  四区时 ' + narrow + ' → 独占时 ' + wide);
const NW = JSON.parse(narrow), WD = JSON.parse(wide);
check('波形区确实变宽了（否则本条无意义）', WD.view > NW.view + 200, NW.view + ' → ' + WD.view);
check('画布跟随面板宽度重算（attrW == 视图宽 ±2px）', Math.abs(WD.attrW - WD.view) <= 2, 'canvas ' + WD.attrW + ' vs view ' + WD.view);
await ev(`window.__wpDock.applyPreset('sim', true)`);
await sleep(400);
check('恢复四区', await ev(`document.querySelectorAll('.mk-group').length`) === 4);

// ─────────────────────────────────────────── 6. 更多拖动路径（并入标签页 / 整行落点 / 组内重排 / 拖出区外）
// 「不同块的界面可以相互拖拽」的完整闭环：§2 验了「切分出新组」，这里补齐另外四条主路径。
console.log('\n=== 6. 更多拖动路径 ===');
async function release(to) {
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(450);
}
async function groupCount() { return await ev(`document.querySelectorAll('.mk-group').length`); }
async function tabBarRect(panel) {
  const j = await ev(`(() => { const t = document.querySelector('.mk-tab[data-panel="${panel}"]');
    if (!t) return null; const bar = t.closest('.mk-group').querySelector('.mk-tabbar');
    const r = bar.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      cy: Math.round(r.top + r.height / 2) }); })()`);
  return j ? JSON.parse(j) : null;
}

// 6a) 页签条落点 → 并入已有组成标签页（组数 4 → 3）
{
  const src = await tabRect('rtl');
  const g = await groupRect('wave');
  const bar = await tabBarRect('wave');
  // ⚠ 必须瞄准页签条的**垂直中心**：顶边最外 8px 是「新建整行」的窄环带（DROP.outerTop），
  //   页签条只有中下部是「并入」语义。这条断言同时也是那个环带优先级的回归护栏。
  const target = { x: bar.x + 140, y: bar.cy };
  await drag(src, target);
  const P = JSON.parse(await ev(`(() => {
    const d = document.getElementById('mk-drop');
    const r = d.getBoundingClientRect();
    return JSON.stringify({ display: getComputedStyle(d).display,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      marked: document.querySelectorAll('.mk-group.drop-tab').length });
  })()`));
  check('并入落点：预览框 == 波形组矩形（±3px）',
    P.display === 'block' && Math.abs(P.rect.x - g.x) <= 3 && Math.abs(P.rect.y - g.y) <= 3 &&
    Math.abs(P.rect.w - g.w) <= 3 && Math.abs(P.rect.h - g.h) <= 3,
    JSON.stringify(P.rect) + ' vs ' + JSON.stringify(g));
  check('并入落点：目标组被标记 drop-tab（且只标 1 个）', P.marked === 1, P.marked + ' 个');
  await release(target);
  const st = JSON.parse(await ev(`(() => {
    const t = document.querySelector('.mk-tab[data-panel="rtl"]');
    const grp = t && t.closest('.mk-group');
    return JSON.stringify({ groups: document.querySelectorAll('.mk-group').length,
      inWave: !!(grp && grp.querySelector('.mk-tab[data-panel="wave"]')),
      tabs: grp ? grp.querySelectorAll('.mk-tab').length : 0 });
  })()`));
  // 注意：rtl 离开原组后原组还剩 vcd，所以组数仍是 4（变的是「波形组里有 2 个页签」）。
  check('并入落位：rtl 与 wave 同组（波形组 2 个页签 / 组数不变）',
    st.groups === 4 && st.inWave === true && st.tabs === 2, JSON.stringify(st));
  // 并入 rtl 会把它置为 active（点击页签即激活），波形面板随之进暂存区 —— 这正常；
  // 这里要验的是「波形节点没被克隆、没丢、切回去还能正常显示」。
  await ev(`document.querySelector('.mk-tab[data-panel="wave"]').click()`);
  await sleep(300);
  check('并入后波形节点未被克隆也未丢失（切回 wave 页签可正常显示）', await ev(`(() => {
    const e = document.getElementById('main-area');
    return !!e && e.getBoundingClientRect().width > 200 &&
      e.querySelectorAll('#wave-canvas').length === 1 &&
      document.querySelectorAll('#main-area').length === 1; })()`) === true);
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  check('并入测试后恢复四区', await groupCount() === 4);
}

// 6b) 工作区最外缘（下边）→ 生成整行底部区
{
  const c = JSON.parse(await ev(`(() => { const r = window.__wpDock.workbenchContentRect();
    return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }); })()`));
  const src = await tabRect('tb');
  const target = { x: c.x + Math.round(c.w / 2), y: c.y + c.h - 4 };
  await drag(src, target);
  const P = JSON.parse(await ev(`(() => {
    const d = document.getElementById('mk-drop');
    const r = d.getBoundingClientRect();
    return JSON.stringify({ display: getComputedStyle(d).display,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } });
  })()`));
  check('整行落点：预览框几乎占满工作区宽', P.display === 'block' && P.rect.w >= c.w - 20,
    JSON.stringify(P.rect) + ' vs 工作区 ' + JSON.stringify(c));
  await release(target);
  const after = await groupRect('tb');
  check('整行落位：tb 组矩形 == 预览矩形（±3px）',
    !!after && Math.abs(after.x - P.rect.x) <= 3 && Math.abs(after.y - P.rect.y) <= 3 &&
    Math.abs(after.w - P.rect.w) <= 3 && Math.abs(after.h - P.rect.h) <= 3,
    JSON.stringify(after) + ' vs ' + JSON.stringify(P.rect));
  check('整行落位：tb 组位于工作区下半（整行压底）', !!after && after.y > c.y + c.h / 2, JSON.stringify(after));
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  check('整行落点测试后恢复四区', await groupCount() === 4);
}

// 6c) 同组内页签重排（右区 [source,tb] → 把 source 拖到 tb 右侧）
{
  const g = await groupRect('source');
  const bar = await tabBarRect('source');
  const orderOf = async () => await ev(`JSON.stringify(Array.from(
    document.querySelector('.mk-tab[data-panel="source"]').closest('.mk-group').querySelectorAll('.mk-tab')
  ).map((t) => t.dataset.panel))`);
  const before = await orderOf();
  const src = await tabRect('source');
  const target = { x: bar.x + bar.w - 8, y: bar.cy };   // 页签条最右（y 在页签条内 → 走并入/重排分支）
  await drag(src, target);
  await release(target);
  const after = await orderOf();
  check('组内重排：source 移到 tb 之后（组数不变）',
    before !== after && JSON.parse(after)[0] === 'tb' && await groupCount() === 4,
    before + ' → ' + after);
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
}

// 6d) 拖到工作区之外（无有效落点）→ 松手必须无操作、面板不能消失
{
  const src = await tabRect('rtl');
  const outside = { x: 4, y: 4 };
  await drag(src, outside);
  const noDrop = await ev(`getComputedStyle(document.getElementById('mk-drop')).display`);
  check('拖到工作区之外：不显示落点提示（不会误落位）', noDrop === 'none', noDrop);
  await release(outside);
  const st = JSON.parse(await ev(`(() => {
    const t = document.querySelector('.mk-tab[data-panel="rtl"]');
    return JSON.stringify({ groups: document.querySelectorAll('.mk-group').length,
      docked: !!(t && t.closest('.mk-group')),
      floats: document.querySelectorAll('.mk-float').length,
      parked: (() => { const e = document.getElementById('sim-card-rtl');
        return !!(e && e.closest('#mk-park')); })() });
  })()`));
  check('拖到工作区之外：松手后 rtl 仍停靠在四区里（未丢 / 未变浮窗 / 未进暂存区）',
    st.groups === 4 && st.docked === true && st.floats === 0 && st.parked === false, JSON.stringify(st));
  check('拖出区外收尾后无残留拖拽状态', await ev(`document.body.classList.contains('mk-dragging') ||
    !!document.querySelector('.mk-drag-ghost') || !!document.querySelector('.mk-group.drop-tab')`) === false);
}

// 6e) 顶边窄环带（DROP.outerTop = 8px）仍能新建整行 —— 上面为「并入」收窄环带后，
//     这条能力必须还在（回归护栏：不能为了页签条把顶边整行能力弄丢）。
{
  const c = JSON.parse(await ev(`(() => { const r = window.__wpDock.workbenchContentRect();
    return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }); })()`));
  const src = await tabRect('tb');
  const target = { x: c.x + Math.round(c.w / 2), y: c.y + 3 };
  await drag(src, target);
  const P = JSON.parse(await ev(`(() => {
    const d = document.getElementById('mk-drop');
    const r = d.getBoundingClientRect();
    return JSON.stringify({ display: getComputedStyle(d).display,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } });
  })()`));
  check('顶边窄环带：预览框仍是整行宽（新建整行能力未丢）', P.display === 'block' && P.rect.w >= c.w - 20,
    JSON.stringify(P.rect) + ' vs 工作区 ' + JSON.stringify(c));
  await release(target);
  const after = await groupRect('tb');
  check('顶边窄环带：落位矩形 == 预览矩形（±3px）',
    !!after && Math.abs(after.x - P.rect.x) <= 3 && Math.abs(after.y - P.rect.y) <= 3 &&
    Math.abs(after.w - P.rect.w) <= 3 && Math.abs(after.h - P.rect.h) <= 3,
    JSON.stringify(after) + ' vs ' + JSON.stringify(P.rect));
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  check('顶边落点测试后恢复四区', await groupCount() === 4);
}

// ─────────────────────────────────────────── 7. 浮窗拖动 / 缩放（Word 式自由排布）
// 用户历史抱怨集中在两点：① 拖浮窗时「拖动预览与松手后位置对不上」；② 右下角缩放
// 「和鼠标坐标对不上」。这两条都在这里用真实指针序列锁死：拖动中的实时矩形必须等于
// 「起点 + 指针位移」，松手后必须与拖动中一致（不跳变），且缩放要有下限、不塌陷。
console.log('\n=== 7. 浮窗拖动 / 缩放 ===');
async function floatRect(panel) {
  const j = await ev(`(() => { const f = document.querySelector('.mk-float[data-float="${panel}"]');
    if (!f) return null; const r = f.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }); })()`);
  return j ? JSON.parse(j) : null;
}
async function floatHeadPoint(panel) {
  const j = await ev(`(() => { const f = document.querySelector('.mk-float[data-float="${panel}"]');
    if (!f) return null; const h = f.querySelector('.mk-float-head'); const r = h.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left + 60), y: Math.round(r.top + r.height / 2) }); })()`);
  return j ? JSON.parse(j) : null;
}
async function floatGripPoint(panel) {
  const j = await ev(`(() => { const f = document.querySelector('.mk-float[data-float="${panel}"]');
    if (!f) return null; const g = f.querySelector('.mk-float-resize'); const r = g.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`);
  return j ? JSON.parse(j) : null;
}

// 7a) 双击页签浮出（真实手势路径，不调 API）→ 拖标题栏：拖动中 == 起点 + 位移
{
  await ev(`(() => { const t = document.querySelector('.mk-tab[data-panel="source"]');
    t.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); })()`);
  await sleep(400);
  const f0 = await floatRect('source');
  check('双击页签浮出：出现 .mk-float，宿主节点仍唯一且在文档中',
    !!f0 && await ev(`document.querySelectorAll('#sim-card-source').length === 1 && !!document.getElementById('sim-card-source')`) === true,
    JSON.stringify(f0));
  const head = await floatHeadPoint('source');
  const target = { x: head.x + 140, y: head.y + 110 };
  await drag(head, target);
  const mid = await floatRect('source');
  check('拖动浮窗：拖动中位置 == 起点 + 指针位移（±3px）',
    !!mid && Math.abs(mid.x - (f0.x + 140)) <= 3 && Math.abs(mid.y - (f0.y + 110)) <= 3,
    JSON.stringify(mid) + ' 期望 ' + JSON.stringify({ x: f0.x + 140, y: f0.y + 110 }));
  check('拖动浮窗：拖动中有 .dragging 外观（抬升 + 标题栏高亮）',
    await ev(`!!document.querySelector('.mk-float[data-float="source"].dragging')`) === true);
  check('拖拽期间组右上角 ⧉▣✕ 被强制隐藏（历史 bug：拖拽时按钮乱闪）',
    await ev(`(() => { const b = document.querySelector('.mk-tabbar .mk-grp-btns'); return !b || getComputedStyle(b).opacity === '0'; })()`) === true);
  await release(target);
  const after = await floatRect('source');
  check('拖动浮窗：松手后位置 == 拖动中（不跳变，±2px）',
    !!after && !!mid && Math.abs(after.x - mid.x) <= 2 && Math.abs(after.y - mid.y) <= 2,
    JSON.stringify(after) + ' vs ' + JSON.stringify(mid));
  check('拖动浮窗：松手后无残留 dragging / mk-dragging',
    await ev(`!document.querySelector('.mk-float.dragging') && !document.body.classList.contains('mk-dragging')`) === true);
}

// 7b) 右下角缩放：拖动中尺寸 == 起点 + 位移；松手后不跳变
{
  const f0 = await floatRect('source');
  const grip = await floatGripPoint('source');
  const target = { x: grip.x + 100, y: grip.y + 70 };
  await drag(grip, target);
  const mid = await floatRect('source');
  check('缩放浮窗：拖动中尺寸 == 起点 + 指针位移（±3px）',
    !!mid && !!f0 && Math.abs(mid.w - (f0.w + 100)) <= 3 && Math.abs(mid.h - (f0.h + 70)) <= 3,
    JSON.stringify(mid) + ' 期望 ' + JSON.stringify({ w: f0.w + 100, h: f0.h + 70 }));
  await release(target);
  const after = await floatRect('source');
  check('缩放浮窗：松手后尺寸 == 拖动中（不跳变，±2px）',
    !!after && !!mid && Math.abs(after.w - mid.w) <= 2 && Math.abs(after.h - mid.h) <= 2,
    JSON.stringify(after) + ' vs ' + JSON.stringify(mid));
}

// 7c) 缩放下限：往左上狠拖 → 停在 260×150，不塌陷成负尺寸 / 0 尺寸
{
  const grip = await floatGripPoint('source');
  const target = { x: Math.max(2, grip.x - 780), y: Math.max(2, grip.y - 540) };
  await drag(grip, target);
  const mid = await floatRect('source');
  check('缩放钳制：拖到极小时停在 260×150（不塌陷）',
    !!mid && mid.w === 260 && mid.h === 150, JSON.stringify(mid));
  await release(target);
  check('缩放钳制：松手后仍是 260×150',
    JSON.stringify(await floatRect('source')) === JSON.stringify({ x: mid.x, y: mid.y, w: 260, h: 150 }),
    JSON.stringify(await floatRect('source')));
}

// 7d) 浮窗拖到波形组页签条 → 落点是「并入」，松手后收回停靠树
{
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  await ev(`(() => { const t = document.querySelector('.mk-tab[data-panel="tb"]');
    t.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); })()`);
  await sleep(400);
  check('浮出 tb：出现浮窗', !!(await floatRect('tb')));
  const g = await groupRect('wave');
  const bar = await tabBarRect('wave');
  const head = await floatHeadPoint('tb');
  const target = { x: bar.x + 140, y: bar.cy };
  await drag(head, target);
  const P = JSON.parse(await ev(`(() => { const d = document.getElementById('mk-drop');
    const r = d.getBoundingClientRect();
    return JSON.stringify({ display: getComputedStyle(d).display, cls: d.className,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } }); })()`));
  check('浮窗拖到波形组页签条：落点提示是「并入」且预览 == 波形组矩形（±3px）',
    P.display === 'block' && /(^|\s)tab(\s|$)/.test(P.cls) &&
    Math.abs(P.rect.x - g.x) <= 3 && Math.abs(P.rect.y - g.y) <= 3 &&
    Math.abs(P.rect.w - g.w) <= 3 && Math.abs(P.rect.h - g.h) <= 3,
    P.cls + ' ' + JSON.stringify(P.rect) + ' vs ' + JSON.stringify(g));
  await release(target);
  const st = JSON.parse(await ev(`JSON.stringify({ floats: document.querySelectorAll('.mk-float').length,
    groups: document.querySelectorAll('.mk-group').length,
    inWave: !!document.querySelector('.mk-group .mk-tab[data-panel="tb"]'),
    host: document.querySelectorAll('#sim-card-tb').length,
    parked: !!document.querySelector('#mk-park #sim-card-tb') })`));
  check('浮窗拖回停靠：浮窗消失 / tb 进入停靠树 / 组数不变 / 宿主唯一未暂存',
    st.floats === 0 && st.inWave === true && st.groups === 4 && st.host === 1 && st.parked === false,
    JSON.stringify(st));
}

// 7e) 浮窗拖到工作区外：不显示落点、松手后仍是浮窗（不会被误收）
{
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  await ev(`window.__wpDock.floatPanel('rtl')`);
  await sleep(300);
  const head = await floatHeadPoint('rtl');
  await drag(head, { x: 4, y: 4 });
  check('浮窗拖到工作区外：不显示落点提示',
    await ev(`getComputedStyle(document.getElementById('mk-drop')).display`) === 'none');
  await release({ x: 4, y: 4 });
  check('浮窗拖到工作区外：松手后仍是浮窗（未被误停靠）',
    await ev(`document.querySelectorAll('.mk-float').length === 1`) === true);
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  check('浮窗测试后恢复四区', await groupCount() === 4 && await ev(`document.querySelectorAll('.mk-float').length`) === 0);
}

// ─────────────────────────────────────────── 8. 面板菜单 / 关闭护栏（无死局）
// ✕ 的语义是「隐藏」：必须有护栏（不能把最后一个面板也藏掉）＋ 恢复入口（页签条 ＋），
// 否则用户关掉几个面板就再也回不来（状态栏按用户口径是纯只读、不放菜单）。
console.log('\n=== 8. 面板菜单 / 隐藏护栏 ===');
{
  await ev(`window.__wpDock.applyPreset('sim', true)`);
  await sleep(400);
  check('页签条上有 ＋ 入口（显示面板 / 布局预设）',
    await ev(`!!document.querySelector('.mk-tabbar .mk-grp-btns button[data-menu="panels"]')`) === true);
  // 8a) 依次隐藏到只剩最后一个面板
  await ev(`['source','rtl','vcd','tb','console'].forEach((p) => window.__wpDock.hidePanel(p))`);
  await sleep(350);
  const left = JSON.parse(await ev(`JSON.stringify({ vis: window.__wpDock.visiblePanels(),
    groups: document.querySelectorAll('.mk-group').length, hidden: window.__wpDock.hidden })`));
  check('隐藏到只剩一个面板：可见 1 个 / 1 个组 / 5 个已隐藏',
    left.vis.length === 1 && left.groups === 1 && left.hidden.length === 5, JSON.stringify(left));
  // 8b) 再隐藏最后一个 → 必须被拒（否则工作区空掉，连 ＋ 入口都没了）
  await ev(`window.__wpDock.hidePanel('${left.vis[0]}')`);
  await sleep(250);
  const still = JSON.parse(await ev(`JSON.stringify({ vis: window.__wpDock.visiblePanels(),
    groups: document.querySelectorAll('.mk-group').length })`));
  check('再隐藏最后一个面板被拒绝（避免空工作区死局）',
    still.vis.length === 1 && still.groups === 1, JSON.stringify(still));
  const logTxt = await ev(`(document.getElementById('sim-console-log') || {}).textContent || ''`);
  check('拒绝时给出中文提示（可在仿真状态日志里回溯）', /至少保留一个面板/.test(logTxt), String(logTxt).slice(-90));
  // 8c) ＋ 菜单：展开 → 点空白收起 → 再展开 → 点隐藏项加回来
  await ev(`document.querySelector('.mk-tabbar .mk-grp-btns button[data-menu="panels"]').click()`);
  await sleep(250);
  const menu = JSON.parse(await ev(`(() => { const m = document.querySelector('.mk-menu');
    if (!m) return JSON.stringify({ open: false });
    return JSON.stringify({ open: true, items: Array.from(m.querySelectorAll('.mk-menu-item')).map((b) => b.textContent) }); })()`));
  check('＋ 菜单展开：6 个面板 + 3 个预设 + 恢复默认 = 10 项',
    menu.open === true && menu.items.length === 10, JSON.stringify(menu.items));
  check('菜单里可见面板标记 ✓ 且不可点（不会重复添加）',
    menu.items.filter((t) => /^✓ /.test(t)).length === 1, JSON.stringify(menu.items));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 840, y: 970, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 840, y: 970, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(250);
  check('点空白处收起菜单', await ev(`!document.querySelector('.mk-menu')`) === true);
  await ev(`document.querySelector('.mk-tabbar .mk-grp-btns button[data-menu="panels"]').click()`);
  await sleep(250);
  const added = await ev(`(() => { const m = document.querySelector('.mk-menu');
    const t = m.querySelectorAll('.mk-menu-item')[2]; const label = t.textContent; t.click(); return label; })()`);
  await sleep(400);
  const after = JSON.parse(await ev(`JSON.stringify({ vis: window.__wpDock.visiblePanels().length,
    menu: !!document.querySelector('.mk-menu'), groups: document.querySelectorAll('.mk-group').length })`));
  check('点菜单里的隐藏面板：加回停靠树 + 菜单自动收起',
    after.vis === 2 && after.menu === false, added + ' → ' + JSON.stringify(after));
  // 8d) 恢复默认布局
  await ev(`window.__wpDock.reset()`);
  await sleep(400);
  const fin = JSON.parse(await ev(`JSON.stringify({ groups: document.querySelectorAll('.mk-group').length,
    vis: window.__wpDock.visiblePanels().length, hidden: window.__wpDock.hidden.length })`));
  check('恢复默认布局：回到四区 / 6 个面板全在 / 无隐藏',
    fin.groups === 4 && fin.vis === 6 && fin.hidden === 0, JSON.stringify(fin));
}

console.log('\n' + (fails ? '✖ 失败 ' + fails + ' 项' : '✔ 全部通过'));
server.kill();
process.exit(fails ? 1 : 0);
