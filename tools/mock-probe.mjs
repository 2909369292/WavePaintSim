// WavePaint UI 原型（prototype/ui-mockup.html）渲染 + 交互冒烟探针
// 用法：node tools/mock-probe.mjs
// 产物：.e2e-tmp/mock-*.png 截图 + 控制台 PASS/FAIL 明细
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

// MOCK_BASE：直接打「已在运行的原型服务」（例如打包产物 WavePaintMockup.exe），
// 此时不自己起 dev-server（= 用同一套 34 项断言验证 exe 内嵌快照）。
//   node tools/mock-probe.mjs                          → 源码 + dev-server 8951
//   起 WavePaintMockup.exe /nolaunch /port=17899 后：
//   $env:MOCK_BASE='http://127.0.0.1:17899'; node tools/mock-probe.mjs
const MOCK_BASE = (process.env.MOCK_BASE || process.argv[2] || '').replace(/\/+$/, '');
const PORT = MOCK_BASE ? Number(new URL(MOCK_BASE).port) : 8951;
const BASE = MOCK_BASE || ('http://127.0.0.1:' + PORT);
const CDP = 9532;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = 'D:/Files/Code/波形';
const e2eRoot = root + '/.e2e-tmp';
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(sysTmp, { recursive: true });
const profile = e2eRoot + '/edge-mock-' + Date.now();

const server = MOCK_BASE ? { kill() { /* 外部服务，不关 */ } }
  : spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(BASE + '/prototype/ui-mockup.html'); if (r.ok) break; } catch (e) { /* retry */ }
  await sleep(300);
}

const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
    '--remote-debugging-port=' + CDP, '--user-data-dir=' + profile, '--no-first-run',
    '--window-size=1680,1000', BASE + '/prototype/ui-mockup.html'],
  { stdio: 'ignore', env: edgeEnv });

let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const list = await (await fetch('http://127.0.0.1:' + CDP + '/json')).json();
    target = list.find((x) => x.type === 'page' && x.url.includes('ui-mockup.html'));
    if (target) break;
  } catch (e) { /* retry */ }
}
if (!target) { console.log('页面未找到'); server.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener('open', r));
const errors = [], netFail = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 200));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + JSON.stringify(m.params.args.map((a) => a.value || a.description)).slice(0, 160));
  // ERR_ABORTED = 请求被「主动取消」（导航/被替换），不是加载失败；只记真失败
  if (m.method === 'Network.loadingFailed' && m.params.errorText !== 'net::ERR_ABORTED') {
    netFail.push(m.params.errorText + ' ' + (m.params.requestId || ''));
  }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || '').slice(0, 300);
  return r.result ? r.result.result.value : undefined;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(e2eRoot + '/' + name + '.png', Buffer.from(r.result.data, 'base64'));
  console.log('  SHOT ' + name + '.png');
};
const mouse = (type, x, y, button = 'left', clickCount = 1) => send('Input.dispatchMouseEvent',
  { type, x: Math.round(x), y: Math.round(y), button, buttons: type === 'mouseReleased' ? 0 : 1, clickCount });

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail !== undefined ? '  → ' + detail : '')); };

await send('Network.enable', {});
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.enable', {});
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/prototype/ui-mockup.html' });
await sleep(3500);

/* ── A. 页面级结构断言 ─────────────────────────────────────────────── */
const pageTests = `
(() => {
  const M = window.__mock, out = [];
  const t = (name, fn) => { try { const v = fn(); out.push({ name, ok: !!v, detail: '' }); } catch (e) { out.push({ name, ok: false, detail: 'EXC ' + e.message }); } };
  const q = (s) => document.querySelector(s);
  const wb = document.getElementById('workbench');
  const wbR = wb.getBoundingClientRect();
  const gOf = (pid) => { const e = q('.mk-tab[data-panel="' + pid + '"]'); return e ? e.closest('.mk-group') : null; };
  t('M0 探针存在 / 仿真预设挂载 6 个面板', () => !!M && M.visiblePanels().length === 6 && document.querySelectorAll('.mk-tab').length === 6);
  t('M1 仿真预设 = 4 组停靠区', () => document.querySelectorAll('.mk-group').length === 4 && !!gOf('wave') && !!gOf('rtl') && !!gOf('console') && !!gOf('source'));
  t('M2 波形与源码不同组（默认）', () => gOf('wave').dataset.tabsId !== gOf('source').dataset.tabsId);
  // hitTest 现在返回 computeDrop 的完整结果 { op, tree, rect }（旧版直接返回 op 本身）
  t('M3 hitTest 工作区左外环 → edge/left', () => { const h = M.hitTest(wbR.left + 5, wbR.top + wbR.height / 2, 'wave'); return !!h && h.op.type === 'edge' && h.op.side === 'left'; });
  t('M4 hitTest 波形组左侧带 → split/left', () => { const r = gOf('wave').getBoundingClientRect(); const h = M.hitTest(r.left + 40, r.top + r.height / 2, 'source'); return !!h && h.op.type === 'split' && h.op.side === 'left'; });
  t('M5 hitTest 组中心 → 合并为 tab', () => { const r = gOf('wave').getBoundingClientRect(); const h = M.hitTest(r.left + r.width / 2, r.top + r.height / 2, 'source'); return !!h && h.op.type === 'tab' && h.op.tabsId === gOf('wave').dataset.tabsId; });
  t('M6 hitTest 标签栏 → tab + 插入序', () => { const g = gOf('rtl'); const r = g.querySelector('.mk-tabbar').getBoundingClientRect(); const h = M.hitTest(r.left + 30, r.top + r.height / 2, 'source'); return !!h && h.op.type === 'tab' && h.op.tabsId === g.dataset.tabsId && typeof h.op.index === 'number'; });
  t('M7 布局菜单含 3 个预设项', () => document.querySelectorAll('.mk-mi[data-preset]').length === 3);
  // 波形不再是原型自绘的假 SVG 行，而是真机 js/wavepaint.clean.js 往 #wave-canvas 上真画
  t('M8 波形 = 真机 #wave-canvas（有真实像素内容）', () => {
    const c = document.getElementById('wave-canvas');
    if (!c || !c.width || !c.height) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let nonWhite = 0, dark = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) nonWhite++;
      if (d[i] < 130 && d[i + 1] < 130 && d[i + 2] < 130) dark++;
    }
    return nonWhite > d.length / 4 * 0.005 && dark > 20;
  });
  t('M9 源码面板 = 真机 CodeMirror 宿主（非原型自绘文本）', () => {
    const host = document.getElementById('verilog-cm-host');
    const ta = document.getElementById('verilog-source');
    const cm = document.querySelector('.cm-editor');
    if (cm) { const r = cm.getBoundingClientRect(); return r.width > 100 && r.height > 60 && document.querySelectorAll('.cm-line').length > 0; }
    return !!host && !!ta && ta.value.length > 0;
  });
  t('M11 真机骨架几何 1:1（#menu-bar h=40@0 / #toolbar h=46@40）', () => {
    const mb = q('#menu-bar').getBoundingClientRect(), tb = q('#toolbar').getBoundingClientRect();
    return Math.round(mb.height) === 40 && Math.round(mb.top) === 0 && Math.round(tb.height) === 46 && Math.round(tb.top) === 40;
  });
  t('M12 波形面板宿主 = 真机 #main-area / #wave-view（非仿制）', () => {
    const ma = document.getElementById('main-area'), wv = document.getElementById('wave-view');
    if (!ma || !wv) return false;
    const r = wv.getBoundingClientRect();
    return ma.contains(wv) && ma.closest('.mk-panel') && r.width > 100 && r.height > 100;
  });
  t('M10 状态栏显示面板统计（停靠/区/浮动/未显示）', () => /停靠/.test((q('#st-panels') || {}).textContent || '') && /未显示/.test(q('#st-panels').textContent));
  return JSON.stringify(out);
})()`;
console.log('--- A. 结构断言 ---');
for (const r of JSON.parse(await ev(pageTests))) check(r.name, r.ok, r.detail || undefined);
await shot('mock-1-sim');

/* ── B. 真实鼠标拖拽：Testbench 标签 → 波形区中心（合并 Tab）───────── */
console.log('--- B. 真实拖拽（TB → 波形中心，合并成 Tab）---');
const box = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2, right: r.right, bottom: r.bottom }; })()`);
const tbTab = await box('.mk-tab[data-panel="tb"]');
const waveTab = await box('.mk-tab[data-panel="wave"]');
check('B0 可定位 TB 标签与波形面板', !!(tbTab && waveTab));
await mouse('mouseMoved', tbTab.cx, tbTab.cy, 'none', 0);
await mouse('mousePressed', tbTab.cx, tbTab.cy);
for (let i = 1; i <= 6; i++) {
  await mouse('mouseMoved', tbTab.cx + (waveTab.cx - tbTab.cx) * i / 6, tbTab.cy + (waveTab.cy - tbTab.cy) * i / 6);
  await sleep(60);
}
const ind = await ev(`(() => { const d = document.getElementById('mk-drop'), c = document.getElementById('mk-caret'); return JSON.stringify({ ghost: !!document.querySelector('.mk-drag-ghost'), caret: c.style.display, drop: d.style.display }); })()`);
console.log('  拖拽指示:', ind);
check('B1 拖拽中显示 ghost + 落点指示', /"ghost":true/.test(ind) && (/"caret":"block"/.test(ind) || /"drop":"block"/.test(ind)), ind);
await shot('mock-2-drag');
await mouse('mouseReleased', waveTab.cx, waveTab.cy);
await sleep(400);
const merged = await ev(`(() => { const q=(s)=>document.querySelector(s); const g=(p)=>q('.mk-tab[data-panel="'+p+'"]').closest('.mk-group').dataset.tabsId; return JSON.stringify({ wave: g('wave'), tb: g('tb'), groups: document.querySelectorAll('.mk-group').length, tabs: document.querySelectorAll('.mk-tab').length, ghost: !!document.querySelector('.mk-drag-ghost'), drop: document.getElementById('mk-drop').style.display }); })()`);
console.log('  合并结果:', merged);
const MJ = JSON.parse(merged);
check('B2 拖拽后 TB 与波形同组（合并 Tab，总数守恒）', MJ.wave === MJ.tb && MJ.tabs === 6, merged);
check('B3 拖拽结束清理 ghost / 落点框', MJ.ghost === false && MJ.drop === 'none');
await shot('mock-3-merged');

/* ── C. 浮出 + 拖动 + 收回 ─────────────────────────────────────────── */
console.log('--- C. 浮出面板（假独立窗）---');
await ev(`window.__mock.reset()`);
await sleep(300);
const fl = await ev(`(() => { const M = window.__mock; M.floatPanel('rtl'); M.floatPanel('files', { x: 620, y: 300 }); M.render(); return JSON.stringify({ floats: Object.keys(M.floats), dom: document.querySelectorAll('.mk-float').length, docked: document.querySelectorAll('.mk-tab[data-panel="rtl"]').length }); })()`);
console.log('  浮出结果:', fl);
const FJ = JSON.parse(fl);
check('C1 面板可浮出（DOM 出现浮动窗、从停靠区移除）', FJ.dom === 2 && FJ.docked === 0 && FJ.floats.length === 2, fl);
const floatsDbg = await ev(`(() => { const L = document.getElementById('mk-floats'); return JSON.stringify([...L.children].map((c) => ({ cls: c.className, attrs: [...c.attributes].map((a) => a.name + '=' + a.value).join(' ') }))); })()`);
console.log('  浮动层 DOM:', floatsDbg);
const floatHdr = await box('#mk-floats .mk-float[data-float="rtl"] .mk-float-head');
const wbBox = await box('#workbench');
if (floatHdr) {
  await mouse('mouseMoved', floatHdr.cx, floatHdr.cy, 'none', 0);
  await mouse('mousePressed', floatHdr.cx, floatHdr.cy);
  await mouse('mouseMoved', floatHdr.cx + 260, floatHdr.cy + 60);
  await sleep(120);
  const dragState = await ev(`(() => { const f = document.querySelector('#mk-floats .mk-float[data-float="rtl"]'); const M = window.__mock; const r = f.getBoundingClientRect(); const h = M.hitTest(r.left + 260, r.top + 13); return JSON.stringify({ left: f.style.left, top: f.style.top, drop: document.getElementById('mk-drop').style.display, caret: document.getElementById('mk-caret').style.display, hit: h && h.op ? h.op.type : null }); })()`);
  console.log('  拖动中（跟随指针 + 落点提示）:', dragState);
  check('C2a 拖动中浮动窗跟随指针并显示落点提示', /"left":"350px"/.test(dragState) && /"top":"120px"/.test(dragState) && (/"caret":"block"/.test(dragState) || /"drop":"block"/.test(dragState)), dragState);
  await shot('mock-4-floats');
  // 释放到工作区之外（状态栏上方）→ 不命中停靠区，保持浮动
  await mouse('mouseReleased', floatHdr.cx + 260, wbBox.t + wbBox.h + 30);
  await sleep(200);
}
const moved = floatHdr ? await ev(`(() => { const f = document.querySelector('#mk-floats .mk-float[data-float="rtl"]'); const r = f.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }); })()`) : '无浮动窗头';
check('C2b 释放到工作区外 → 保持浮动并落在释放点（贴底 clamp）',
  !!(floatHdr && !/^THROW|^无/.test(moved) && JSON.parse(moved).x > floatHdr.l + 100 && JSON.parse(moved).y > wbBox.t + wbBox.h - 60), moved + ' / workbench.bottom=' + Math.round(wbBox.t + wbBox.h));
await shot('mock-5-floats-dragged');
const dockedBack = await ev(`(() => { const M = window.__mock; M.dockPanel('rtl'); M.dockPanel('files'); return JSON.stringify({ floats: Object.keys(M.floats).length, rtl: !!document.querySelector('.mk-tab[data-panel="rtl"]'), files: !!document.querySelector('.mk-tab[data-panel="files"]') }); })()`);
check('C3 浮窗可收回停靠区', /"floats":0/.test(dockedBack) && /"rtl":true/.test(dockedBack) && /"files":true/.test(dockedBack), dockedBack);

/* ── D. 预设切换 + 隐藏/恢复 + 持久化 ─────────────────────────────── */
console.log('--- D. 预设 / 隐藏 / 持久化 ---');
const pre = await ev(`(() => { const M = window.__mock; M.applyPreset('edit'); const hasProps = !!document.querySelector('.mk-tab[data-panel="props"]'); const hasFiles = !!document.querySelector('.mk-tab[data-panel="files"]'); M.applyPreset('review'); const hasTb = !!document.querySelector('.mk-tab[data-panel="tb"]'); const floatN = document.querySelectorAll('.mk-float').length; M.reset(); const simN = document.querySelectorAll('.mk-tab').length; return JSON.stringify({ hasProps, hasFiles, hasTb, floatN, simN }); })()`);
check('D1 三套预设可切换（编辑含端口/文件面板，审阅含 TB + 2 个预设浮窗，重置回 6 停靠）',
  /"hasProps":true/.test(pre) && /"hasFiles":true/.test(pre) && /"hasTb":true/.test(pre) && /"floatN":2/.test(pre) && /"simN":6/.test(pre), pre);
const hid = await ev(`(() => { const M = window.__mock; const before = M.visiblePanels().length; M.hidePanel('vcd'); const gone = !document.querySelector('.mk-tab[data-panel="vcd"]'); const n = M.visiblePanels().length; M.showPanel('vcd'); const back = !!document.querySelector('.mk-tab[data-panel="vcd"]'); return JSON.stringify({ before, gone, n, back }); })()`);
check('D2 关闭面板 → 隐藏；面板菜单可恢复', /"gone":true/.test(hid) && /"n":5/.test(hid) && /"back":true/.test(hid), hid);
const pers = await ev(`(() => { window.__mock.persistState(); const raw = localStorage.getItem('wavepaint.mock.layout.v1'); if (!raw) return 'null'; const o = JSON.parse(raw); return JSON.stringify({ ok: !!o.root, preset: o.preset }); })()`);
check('D3 布局写入 localStorage（v1，不写 .wp）', /"ok":true/.test(pers), pers);
const rel = await ev(`(() => JSON.stringify({ tabs: document.querySelectorAll('.mk-tab').length, floats: document.querySelectorAll('.mk-float').length, groups: document.querySelectorAll('.mk-group').length }))()`);
console.log('  重置后:', rel);

/* ── E. 运行期错误 ─────────────────────────────────────────────────── */
console.log('--- E. 运行期错误 ---');
check('E1 无 JS 异常', errors.length === 0, errors.slice(0, 3).join(' | '));
check('E2 无资源加载失败', netFail.length === 0, netFail.slice(0, 3).join(' | '));

/* ── F. 布局体检（替代人眼看图：尺寸 / 溢出 / 重叠 / 内容非空）───────── */
console.log('--- F. 布局体检 ---');
await ev(`window.__mock.reset()`);
await sleep(250);
const audit = JSON.parse(await ev(`(() => {
  const q = (s) => document.querySelector(s);
  const R = (s) => { const e = q(s); return e ? e.getBoundingClientRect() : null; };
  const de = document.documentElement;
  // 新壳没有原型自绘的 #chrome（菜单栏/工具条现在就是真机原生节点）
  const mb = R('#menu-bar'), tb = R('#toolbar'), wb = R('#workbench'), sb = R('#status-bar');
  const groups = [...document.querySelectorAll('.mk-group')].map((g) => { const r = g.getBoundingClientRect(); return { p: [...g.querySelectorAll('.mk-tab')].map((t) => t.dataset.panel).join('+'), w: Math.round(r.width), h: Math.round(r.height) }; });
  const bodies = [...document.querySelectorAll('.mk-group .mk-panel')].map((p) => ({ id: p.parentElement.dataset.tabsId, w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height), sw: p.scrollWidth, cw: p.clientWidth, sh: p.scrollHeight, ch: p.clientHeight }));
  const cv = document.getElementById('wave-canvas');
  let cvStat = null;
  if (cv && cv.width && cv.height) {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let nonWhite = 0, dark = 0, axis = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) nonWhite++;
      if (d[i] < 130 && d[i + 1] < 130 && d[i + 2] < 130) dark++;
      if (d[i] >= 238 && d[i] <= 242 && d[i + 1] >= 238 && d[i + 1] <= 242) axis++;
    }
    cvStat = { w: cv.width, h: cv.height, nonWhite, dark, axis };
  }
  const clipped = [...document.querySelectorAll('#toolbar *, .mk-tabbar *, #status-bar *')]
    .filter((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'visible')
    .slice(0, 6).map((e) => e.className + ':' + e.scrollWidth + '>' + e.clientWidth);
  return JSON.stringify({
    overflowX: de.scrollWidth - de.clientWidth, winW: innerWidth, winH: innerHeight,
    menu: { y: Math.round(mb.top), h: Math.round(mb.height) },
    toolbarTop: Math.round(tb.top),
    toolbarBottom: Math.round(tb.bottom), wbTop: Math.round(wb.top), wbH: Math.round(wb.height), wbBottom: Math.round(wb.bottom),
    statusTop: Math.round(sb.top), statusBottom: Math.round(sb.bottom),
    groups, bodies: bodies.slice(0, 4), cvStat,
    brokenImgs: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    clipped, bodyBg: getComputedStyle(document.body).backgroundColor, font: getComputedStyle(document.body).fontFamily.slice(0, 40)
  });
})()`));
console.log('  ' + JSON.stringify(audit, null, 1).replace(/\n/g, '\n  '));
check('F1 无横向溢出（1680 宽下不出现滚动条）', audit.overflowX <= 0, 'overflowX=' + audit.overflowX);
check('F11 真机骨架几何（菜单栏 40@0 / 工具条 @40）', audit.menu.h === 40 && audit.menu.y === 0 && audit.toolbarTop === 40,
  JSON.stringify({ menu: audit.menu, toolbarTop: audit.toolbarTop }));
check('F2 工具栏 / 工作区 / 状态栏三段不重叠', audit.toolbarBottom <= audit.wbTop && audit.wbBottom <= audit.statusTop + 1,
  JSON.stringify({ tbBottom: audit.toolbarBottom, wbTop: audit.wbTop, wbBottom: audit.wbBottom, stTop: audit.statusTop }));
check('F3 工作区占据主要高度（>70% 视口）', audit.wbH > audit.winH * 0.7, audit.wbH + ' / ' + audit.winH);
check('F4 四个窗格尺寸合理（宽高 > 200）', audit.groups.length === 4 && audit.groups.every((g) => g.w > 200 && g.h > 200), JSON.stringify(audit.groups));
check('F5 波形为真机 canvas 真实绘制（非纯白 + 有深色网格/文字 + 有时间轴底纹）',
  !!audit.cvStat && audit.cvStat.nonWhite > 0 && audit.cvStat.dark > 20 && audit.cvStat.axis > 0,
  JSON.stringify(audit.cvStat));
check('F6 无被裁切的文本元素', audit.clipped.length === 0, audit.clipped.join(' | '));
check('F7 图标 / logo 图片全部加载成功', audit.brokenImgs.length === 0, audit.brokenImgs.join(' | '));
check('F8 浅色主题生效（非白底 + 无衬线字体）', audit.bodyBg !== 'rgb(255, 255, 255)' && audit.bodyBg !== 'rgba(0, 0, 0, 0)', audit.bodyBg + ' / ' + audit.font);
await shot('mock-6-sim-clean');
await ev(`window.__mock.applyPreset('edit')`); await sleep(250); await shot('mock-7-edit-preset');
const rv = await ev(`(() => { window.__mock.applyPreset('review'); return JSON.stringify({ d: document.querySelectorAll('.mk-float').length }); })()`);
await sleep(250); await shot('mock-8-review-preset');
check('F9 审阅预设自带 2 个浮动窗', /"d":2/.test(rv), rv);
await ev(`document.getElementById('mock-help-btn').click()`);
await sleep(250); await shot('mock-9-help');
const helpVisible = await ev(`(() => !document.getElementById('help-overlay').classList.contains('hidden'))()`);
check('F10 交互说明浮层可打开', helpVisible === true, String(helpVisible));
await ev(`document.getElementById('help-close').click()`);

/* ── G. 回归：拖动预览 == 落位（旧 bug：预览矩形与实际落位对不上）──────── */
console.log('--- G. 拖拽预览 / 落位一致性 ---');
await ev(`window.__mock.reset()`);
await sleep(300);
const dropCases = [
  ['波形组左侧带', '.mk-tab[data-panel="wave"]', 0.06, 0.60],
  ['波形组右侧带', '.mk-tab[data-panel="wave"]', 0.94, 0.60],
  ['波形组上侧带', '.mk-tab[data-panel="wave"]', 0.50, 0.06],
  ['波形组下侧带', '.mk-tab[data-panel="wave"]', 0.50, 0.94],
  ['波形组中心(合并 Tab)', '.mk-tab[data-panel="wave"]', 0.50, 0.50],
  ['工作区左外环(整列)', '#workbench', 0.004, 0.50],
  ['工作区底外环(整行)', '#workbench', 0.50, 0.996],
];
let gPass = 0;
for (const [name, sel, fx, fy] of dropCases) {
  await ev(`window.__mock.reset()`); await sleep(260);
  const tab = await box('.mk-tab[data-panel="tb"]');
  const tgt = await box(sel);
  if (!tab || !tgt) { check('G ' + name, false, '定位失败'); continue; }
  const px = tgt.l + tgt.w * fx, py = tgt.t + tgt.h * fy;
  await mouse('mouseMoved', tab.cx, tab.cy, 'none', 0);
  await mouse('mousePressed', tab.cx, tab.cy);
  for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', tab.cx + (px - tab.cx) * i / 6, tab.cy + (py - tab.cy) * i / 6); await sleep(45); }
  await sleep(120);
  const prev = await ev(`(() => { const d = document.getElementById('mk-drop'); if (!d || d.style.display === 'none') return null; const r = d.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
  await mouse('mouseReleased', px, py);
  await sleep(420);
  const act = await ev(`(() => { const t = document.querySelector('.mk-tab[data-panel="tb"]'); if (!t) return null; const r = t.closest('.mk-group').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })()`);
  const ok = !!prev && !!act && Math.abs(prev.x - act.x) <= 2 && Math.abs(prev.y - act.y) <= 2 && Math.abs(prev.w - act.w) <= 2 && Math.abs(prev.h - act.h) <= 2;
  if (ok) gPass++;
  check('G 预览==落位 ' + name, ok, '预览=' + JSON.stringify(prev) + ' 实际=' + JSON.stringify(act));
}

/* ── H. 回归：拖拽中 ⧉▣✕ / 页签✕ 不得闪（旧 bug） + 分隔条拖动不跳变 ─── */
console.log('--- H. 拖拽期间按钮显隐 / 分隔条一致性 ---');
await ev(`window.__mock.reset()`); await sleep(300);
const beforeSlots = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
const hd = await box('.mk-handle.v');
await mouse('mouseMoved', hd.cx, hd.cy, 'none', 0);
await mouse('mousePressed', hd.cx, hd.cy);
for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', hd.cx + 90 * i / 6, hd.cy); await sleep(45); }
await sleep(120);
const midSlots = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
await mouse('mouseReleased', hd.cx + 90, hd.cy); await sleep(420);
const endSlots = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
const MS = JSON.parse(midSlots), ES = JSON.parse(endSlots), BS = JSON.parse(beforeSlots);
check('H1 分隔条拖动中 == 松手后（逐像素）', MS.every((v, i) => Math.abs(v - ES[i]) <= 1), '拖动中=' + midSlots + ' 松手后=' + endSlots);
check('H2 分隔条只改相邻两格（第三格不变）', BS.length === ES.length && BS[BS.length - 1] === ES[ES.length - 1], '前=' + beforeSlots + ' 后=' + endSlots);
check('H3 分隔条分界线跟随指针（+90px）', Math.abs((ES[0] - BS[0]) - 90) <= 2, BS[0] + ' → ' + ES[0]);

const tbTab2 = await box('.mk-tab[data-panel="tb"]');
const rtlTab2 = await box('.mk-tab[data-panel="rtl"]');
await mouse('mouseMoved', tbTab2.cx, tbTab2.cy, 'none', 0);
await mouse('mousePressed', tbTab2.cx, tbTab2.cy);
for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', tbTab2.cx + (rtlTab2.cx - tbTab2.cx) * i / 6, tbTab2.cy + (rtlTab2.cy - tbTab2.cy) * i / 6); await sleep(45); }
await sleep(180);
const hState = await ev(`JSON.stringify({ dragging: document.body.classList.contains('mk-dragging'), btns: getComputedStyle(document.querySelector('.mk-grp-btns')).opacity, tabx: getComputedStyle(document.querySelector('.mk-tab-x')).opacity })`);
const HJ = JSON.parse(hState);
check('H4 拖拽中划过别组：⧉▣✕ 不点亮（opacity=0）', HJ.dragging === true && HJ.btns === '0', hState);
check('H5 拖拽中页签 ✕ 不点亮（opacity=0）', HJ.tabx === '0', hState);
await mouse('mouseReleased', rtlTab2.cx, rtlTab2.cy); await sleep(420);
const hAfter = await ev(`JSON.stringify({ dragging: document.body.classList.contains('mk-dragging'), ghost: !!document.querySelector('.mk-drag-ghost') })`);
check('H6 拖拽结束清理 mk-dragging / ghost', /"dragging":false/.test(hAfter) && /"ghost":false/.test(hAfter), hAfter);

/* ── I. 回归：拖动「中途被 render 换掉 DOM」不得丢位置（旧 bug 的根因）─────
   真机 afterLayout() 会在每次重排后 60ms 补派发一次 window resize，
   而原型监听 resize → renderFloats()。若拖拽闭包缓存了 DOM 引用，重建后
   样式写进游离节点 → 观感是「拖动预览」和「松手后落位」不一致。 */
console.log('--- I. 拖动中途强制重排（render / renderFloats）---');
await ev(`window.__mock.reset()`); await sleep(320);
await ev(`window.__mock.floatPanel('rtl')`); await sleep(120);
const fh2 = await box('#mk-floats .mk-float[data-float="rtl"] .mk-float-head');
const wb2 = await box('#workbench');
await mouse('mouseMoved', fh2.cx, fh2.cy, 'none', 0);
await mouse('mousePressed', fh2.cx, fh2.cy);
await mouse('mouseMoved', fh2.cx + 40, fh2.cy + 30);
await sleep(60);
// 拖动中强制重建浮窗层（模拟 afterLayout 的 resize 补发）
await ev(`(() => { const f = document.querySelector('#mk-floats .mk-float[data-float="rtl"]'); window.__mkOldEl = f; window.__mock.render(); return 'ok'; })()`);
const swapState = await ev(`(() => { const f = document.querySelector('#mk-floats .mk-float[data-float="rtl"]'); return JSON.stringify({ swapped: f !== window.__mkOldEl, oldConnected: window.__mkOldEl.isConnected, dragging: f.classList.contains('dragging'), bodyDrag: document.body.classList.contains('mk-dragging') }); })()`);
const SJ = JSON.parse(swapState);
check('I1 拖动中被 renderFloats 重建后，仍在拖动状态（body.mk-dragging + .mk-float.dragging）', SJ.swapped === true && SJ.dragging === true && SJ.bodyDrag === true, swapState);
// 释放点必须在停靠区之外（状态栏一带），否则浮窗会被停靠、无从比较位置
await mouse('mouseMoved', fh2.cx + 300, wb2.t + wb2.h + 16);
await sleep(80);
const midLive = await ev(`(() => { const f = document.querySelector('#mk-floats .mk-float[data-float="rtl"]'); const r = f.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }); })()`);
await shot('mock-10-float-midrender');
await mouse('mouseReleased', fh2.cx + 300, wb2.t + wb2.h + 16);
await sleep(240);
const endLive = await ev(`(() => { const f = document.querySelector('#mk-floats .mk-float[data-float="rtl"]'); if (!f) return 'GONE'; const r = f.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top), dragging: f.classList.contains('dragging'), bodyDrag: document.body.classList.contains('mk-dragging') }); })()`);
const MJ2 = JSON.parse(endLive);
check('I2 重建后松手：浮窗落在拖动中的最后位置（预览==落位）', MJ2.x === JSON.parse(midLive).x && MJ2.y === JSON.parse(midLive).y, '拖动中=' + midLive + ' 松手后=' + endLive);
check('I3 松手清理拖动状态', MJ2.dragging === false && MJ2.bodyDrag === false, endLive);

// 分隔条：拖动中途整树 render()，松手后宽度仍与拖动中一致
await ev(`window.__mock.reset()`); await sleep(320);
const bs2 = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
const hd2 = await box('.mk-handle.v');
await mouse('mouseMoved', hd2.cx, hd2.cy, 'none', 0);
await mouse('mousePressed', hd2.cx, hd2.cy);
for (let i = 1; i <= 4; i++) { await mouse('mouseMoved', hd2.cx + 90 * i / 4, hd2.cy); await sleep(40); }
await ev(`window.__mock.render()`);
await sleep(60);
const mid2 = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
for (let i = 5; i <= 8; i++) { await mouse('mouseMoved', hd2.cx + 90 * i / 4, hd2.cy); await sleep(40); }
await sleep(80);
const mid3 = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
await mouse('mouseReleased', hd2.cx + 180, hd2.cy); await sleep(400);
const end2 = await ev(`JSON.stringify([...document.querySelectorAll('.mk-handle.v')[0].parentElement.children].filter((e) => e.classList.contains('mk-slot')).map((e) => Math.round(e.getBoundingClientRect().width)))`);
const M2 = JSON.parse(mid3), E2 = JSON.parse(end2), B2 = JSON.parse(bs2);
check('I4 分隔条拖动中 render() 重建后仍跟随指针', Math.abs(M2[0] - B2[0] - 180) <= 2, B2[0] + ' → ' + M2[0] + '（期望 +180）');
check('I5 分隔条重建后「拖动中 == 松手后」（逐像素）', M2.every((v, i) => Math.abs(v - E2[i]) <= 1), '拖动中=' + mid3 + ' 松手后=' + end2);
await shot('mock-11-split-midrender');

const fail = results.filter((r) => !r.ok);
console.log('\n总计 ' + results.length + ' 项，失败 ' + fail.length + ' 项');
ws.close(); server.kill();
process.exit(fail.length ? 1 : 0);
