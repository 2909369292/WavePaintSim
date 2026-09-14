// 分隔条拖拽解耦探针：真实 Edge + dev-server + CDP
// 目的：确认多列（三列）布局下拖**某一条**分隔条时，
//   ① 只有它两侧那一对面板宽度变化；
//   ② 其它分隔条的像素位置纹丝不动（历史现象：用户报「拖右边那条，左边那条跟着一起动」）。
// 顺带验：拖动中 handle 严格跟随指针、拖动中发生 render() 后仍解耦、松手不跳变。
// 用法：node tools/split-drag-probe.mjs [端口]
// 产物：.e2e-tmp/split-*.png 截图 + 控制台 PASS/FAIL 明细
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = Number(process.argv[2]) || 8967;
const CDP = 9551;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn(edge, ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
  '--remote-debugging-port=' + CDP, '--user-data-dir=' + e2eRoot + '/edge-split-' + Date.now(), '--no-first-run',
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
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 200));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || '').slice(0, 200);
  return r.result ? r.result.result.value : undefined;
};
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (r.result && r.result.data) { const f = e2eRoot + '/split-' + name + '.png'; writeFileSync(f, Buffer.from(r.result.data, 'base64')); console.log('  info 截图 ' + f); }
}

await send('Page.enable', {});
await send('Runtime.enable', {});
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 980, deviceScaleFactor: 1, mobile: false });
await send('Page.reload', { ignoreCache: true });
await sleep(5000);

// 页面侧取数：三条竖列槽宽度 + 每条 handle 的 left（以及 flex 值）
const PROBE = `(() => {
  const R = (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left * 100) / 100, w: Math.round(r.width * 100) / 100 }; };
  const splits = Array.from(document.querySelectorAll('#workbench .mk-split'));
  let three = null;
  splits.forEach((s) => {
    const slots = Array.from(s.children).filter((c) => c.classList.contains('mk-slot'));
    if (s.classList.contains('row') && slots.length === 3) three = s;
  });
  if (!three) return JSON.stringify({ ok: false, splits: splits.length });
  const slotEls = Array.from(three.children).filter((c) => c.classList.contains('mk-slot'));
  const slots = slotEls.map(R);
  const hs = Array.from(three.querySelectorAll('.mk-handle')).map((h) => ({
    idx: h.dataset.splitIdx, owner: h.dataset.splitOwner, active: h.classList.contains('active'), ...R(h),
  }));
  return JSON.stringify({ ok: true, splitId: three.dataset.splitId, slots, handles: hs,
    sizes: (window.__wpDock && (function f(n){ if(!n) return null; if(n.kind==='split' && n.id===three.dataset.splitId) return n.sizes; var r=null; if(n.kind==='split') n.children.forEach(function(c){ if(!r) r=f(c); }); return r; })(window.__wpDock.root)),
    flexes: slotEls.map((c) => c.style.flex) });
})()`;

console.log('\n=== 1. 三列布局基线 ===');
const base0 = JSON.parse(await ev(PROBE));
check('存在三列 row split（2 条 handle）', base0.ok === true && base0.handles.length === 2, JSON.stringify(base0.slots));
console.log('  基线 ' + JSON.stringify({ slots: base0.slots, handles: base0.handles.map((h) => h.idx + '@' + h.l), sizes: base0.sizes, flexes: base0.flexes }));

// 合成 PointerEvent 走真实拖拽路径：handle 的 pointerdown → window 的 pointermove/pointerup
const down = async (idx, extra) => await ev(`(() => {
  const three = document.querySelector('.mk-split[data-split-id="${base0.splitId}"]');
  const h = three.querySelector('.mk-handle[data-split-idx="${idx}"]');
  const r = h.getBoundingClientRect();
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  window.__t = { x0: x0, y0: y0 };
  h.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'mouse', bubbles: true, cancelable: true, clientX: x0, clientY: y0, buttons: 1 }));
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'mouse', bubbles: true, clientX: x0 + Math.round(${extra} / 2), clientY: y0, buttons: 1 }));
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'mouse', bubbles: true, clientX: x0 + ${extra}, clientY: y0, buttons: 1 }));
  return 'dragging';
})()`);
const moveTo = async (extra) => await ev(`(() => {
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'mouse', bubbles: true,
    clientX: window.__t.x0 + ${extra}, clientY: window.__t.y0, buttons: 1 }));
  return 'ok';
})()`);
const release = async () => await ev(`(() => {
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'mouse', bubbles: true,
    clientX: window.__t.x0, clientY: window.__t.y0, buttons: 0 }));
  return 'released';
})()`);
const snap = async () => JSON.parse(await ev(PROBE));

// ── 2. 拖右边那条（idx=1）+120px：只该动第 2/3 列
console.log('\n=== 2. 拖右边那条（idx=1）向右 +120px ===');
await down(1, 120);
await sleep(150);
const s2 = await snap();
await shot('drag-right');
const d2 = {
  leftHandle: +(s2.handles[0].l - base0.handles[0].l).toFixed(2),
  rightHandle: +(s2.handles[1].l - base0.handles[1].l).toFixed(2),
  slot0: +(s2.slots[0].w - base0.slots[0].w).toFixed(2),
  slot1: +(s2.slots[1].w - base0.slots[1].w).toFixed(2),
  slot2: +(s2.slots[2].w - base0.slots[2].w).toFixed(2),
};
console.log('  增量 ' + JSON.stringify(d2));
check('被拖的右边条跟随指针（+120±3）', Math.abs(d2.rightHandle - 120) <= 3, d2.rightHandle);
check('★ 左边条不动（|Δ|<=1px）', Math.abs(d2.leftHandle) <= 1, d2.leftHandle);
check('★ 第 1 列宽度不变（|Δ|<=1px）', Math.abs(d2.slot0) <= 1, d2.slot0);
check('第 2 列变宽 ~+120（±4）', Math.abs(d2.slot1 - 120) <= 4, d2.slot1);
check('第 3 列变窄 ~-120（±4）', Math.abs(d2.slot2 + 120) <= 4, d2.slot2);
check('拖动中只有这一条 active', s2.handles[0].active === false && s2.handles[1].active === true,
  JSON.stringify(s2.handles.map((h) => h.idx + ':' + h.active)));
await release();
await sleep(250);
const base1 = await snap();
check('松手后尺寸无跳变', Math.abs(base1.handles[1].l - s2.handles[1].l) <= 1.5 && Math.abs(base1.slots[0].w - s2.slots[0].w) <= 1.5,
  JSON.stringify({ before: s2.slots, after: base1.slots }));

// ── 3. 拖左边那条（idx=0）-80px：只该动第 1/2 列
console.log('\n=== 3. 拖左边那条（idx=0）向左 -80px ===');
await down(0, -80);
await sleep(150);
const s3 = await snap();
await shot('drag-left');
const d3 = {
  leftHandle: +(s3.handles[0].l - base1.handles[0].l).toFixed(2),
  rightHandle: +(s3.handles[1].l - base1.handles[1].l).toFixed(2),
  slot0: +(s3.slots[0].w - base1.slots[0].w).toFixed(2),
  slot1: +(s3.slots[1].w - base1.slots[1].w).toFixed(2),
  slot2: +(s3.slots[2].w - base1.slots[2].w).toFixed(2),
};
console.log('  增量 ' + JSON.stringify(d3));
check('被拖的左边条跟随指针（-80±3）', Math.abs(d3.leftHandle + 80) <= 3, d3.leftHandle);
check('★ 右边条不动（|Δ|<=1px）', Math.abs(d3.rightHandle) <= 1, d3.rightHandle);
check('★ 第 3 列宽度不变（|Δ|<=1px）', Math.abs(d3.slot2) <= 1, d3.slot2);
check('只有这一条 active', s3.handles[0].active === true && s3.handles[1].active === false,
  JSON.stringify(s3.handles.map((h) => h.idx + ':' + h.active)));
await release();
await sleep(250);
const base2 = await snap();
check('松手后尺寸无跳变（第二次）', Math.abs(base2.handles[0].l - s3.handles[0].l) <= 1.5,
  JSON.stringify({ before: s3.slots, after: base2.slots }));

// ── 4. 拖动中发生 render()（模拟其它路径触发的重绘）后仍解耦
console.log('\n=== 4. 拖动中强制 render() 后仍解耦 ===');
await down(1, 40);
await sleep(120);
const didRender = await ev('(window.__wpDock.render(), "ok")');
await sleep(120);
await moveTo(120);
await sleep(150);
const s4 = await snap();
await shot('drag-after-render');
console.log('  render=' + didRender + '  ' + JSON.stringify({ handles: s4.handles.map((h) => h.idx + '@' + h.l + (h.active ? '*' : '')), slots: s4.slots }));
check('render 之后：左边条仍不动', Math.abs(s4.handles[0].l - base2.handles[0].l) <= 1, +(s4.handles[0].l - base2.handles[0].l).toFixed(2));
check('render 之后：被拖条到 +120±6', Math.abs((s4.handles[1].l - base2.handles[1].l) - 120) <= 6, +(s4.handles[1].l - base2.handles[1].l).toFixed(2));
check('render 之后：第 1 列宽度不变', Math.abs(s4.slots[0].w - base2.slots[0].w) <= 1.5, +(s4.slots[0].w - base2.slots[0].w).toFixed(2));
check('render 之后：active 仍贴在被拖那条', s4.handles[1].active === true && s4.handles[0].active === false,
  JSON.stringify(s4.handles.map((h) => h.idx + ':' + h.active)));
await release();
await sleep(250);

console.log('\n=== JS 异常 ===');
// ── 5. 嵌套 split（同向嵌套 = 用户在 UI 上看到的「三列」）必须只动被拖那条 ──────
// 第 53 轮修 Bug：row[ col[row[wave,tb],console], source ] 这类树里拖外层那条，内层那条
// 会跟着平移（几何上「正确」但用户读起来就是 bug）。修复口径 = **被拖的分界线跟随
// 指针，其余分隔条的绝对像素位置锁死**。这里把四种结构固化成回归基线。
const T = (tid, panels) => ({ kind: 'tabs', id: tid, panels, active: panels[0], zone: null });
const SP = (sid, dir, sizes, kids) => ({ kind: 'split', id: sid, dir, sizes, children: kids });
const NESTED = {
  '垂直嵌套 row[ col[row[wave,tb],console], source ]': SP('n-1', 'row', [0.7, 0.3], [
    SP('n-2', 'col', [0.75, 0.25], [
      SP('n-3', 'row', [0.7, 0.3], [T('nz-1', ['wave']), T('nz-2', ['tb'])]),
      T('nz-3', ['console'])]),
    T('nz-4', ['source'])]),
  '水平嵌套 row[ row[rtl,wave], source ]': SP('m-1', 'row', [0.7, 0.3], [
    SP('m-2', 'row', [0.27, 0.73], [T('mz-1', ['rtl']), T('mz-2', ['wave'])]),
    T('mz-3', ['source'])]),
  '竖横混排 col[ row[wave,tb], row[rtl,console] ]': SP('q-1', 'col', [0.6, 0.4], [
    SP('q-2', 'row', [0.55, 0.45], [T('qz-1', ['wave']), T('qz-2', ['tb'])]),
    SP('q-3', 'row', [0.5, 0.5], [T('qz-3', ['rtl']), T('qz-4', ['console'])])]),
};
// 判据只看**手柄沿自身轴的绝对坐标**（竖条看 left、横条看 top）：
// 嵌套容器的盒子整体变大变小（内部面板跟着移）是几何必然，不算「别的那条跟着跑」。
const GEO = `JSON.stringify(Array.from(document.querySelectorAll('#workbench .mk-handle')).map((h) => ({
  k: h.dataset.splitOwner + '/' + h.dataset.splitIdx, v: h.classList.contains('v'),
  l: +h.getBoundingClientRect().left.toFixed(1), t: +h.getBoundingClientRect().top.toFixed(1),
  // 手柄两侧面板沿轴的像素（收缩到引擎地板时会顶住，此时手柄必然跟不上指针）
  pa: +((h.v ? h.previousElementSibling?.getBoundingClientRect().width : h.previousElementSibling?.getBoundingClientRect().height) ?? -1).toFixed(1),
  pb: +((h.v ? h.nextElementSibling?.getBoundingClientRect().width : h.nextElementSibling?.getBoundingClientRect().height) ?? -1).toFixed(1),
  active: h.classList.contains('active') })))`;
const geo = async () => JSON.parse(await ev(GEO));
const off = (h, b) => (h.v ? h.l - b.l : h.t - b.t);
const install = async (tree) => {
  const r = await ev('(() => { window.__wpDock.setRoot(' + JSON.stringify(tree) + '); window.__wpDock.render(); return "ok"; })()');
  await sleep(320);
  return r;
};
// key = "owner/idx"：嵌套时同一 split 内会撞号，必须用 data-split-owner + data-split-idx 双定位
const dragHandle = async (key, dx, dy) => {
  const [owner, idx] = key.split('/');
  return await ev(`(() => {
    const h = document.querySelector('.mk-handle[data-split-owner="${owner}"][data-split-idx="${idx}"]');
    if (!h) return 'no-handle';
    const b = h.getBoundingClientRect();
    const x0 = b.left + b.width / 2, y0 = b.top + b.height / 2;
    const mk = (t, x, y, btns) => new PointerEvent(t, { pointerId: 9, pointerType: 'mouse', bubbles: true,
      cancelable: true, clientX: x, clientY: y, buttons: btns });
    h.dispatchEvent(mk('pointerdown', x0, y0, 1));
    for (let i = 1; i <= 8; i++) window.dispatchEvent(mk('pointermove', x0 + ${dx} * i / 8, y0 + ${dy} * i / 8, 1));
    window.__t = { x0: x0, y0: y0 };
    return h.classList.contains('v') ? 'drag-h' : 'drag-v';
  })()`);
};
const releaseHandle = async (dx, dy) => await ev(`(() => {
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'mouse', bubbles: true,
    clientX: window.__t.x0 + ${dx}, clientY: window.__t.y0 + ${dy}, buttons: 0 }));
  return 'released';
})()`);

for (const [name, tree] of Object.entries(NESTED)) {
  console.log('\n=== 5. ' + name + ' ===');
  for (const [dx, dy] of [[150, 0], [-150, 0], [0, 130], [0, -130]]) {
    await install(tree);
    const keys = (await geo()).map((h) => h.k);
    for (const k of keys) {
      await install(tree);
      const before = await geo();
      const r = await dragHandle(k, dx, dy);
      if (r !== 'drag-h' && r !== 'drag-v') { check('手柄存在 ' + k, false, r); continue; }
      const during = await geo();
      await releaseHandle(dx, dy);
      await sleep(200);
      const after = await geo();
      const moved = during.filter((d) => Math.abs(off(d, before.find((x) => x.k === d.k))) > 2).map((d) => d.k);
      const self = before.find((x) => x.k === k);
      const selfNow = during.find((x) => x.k === k);
      const delta = off(selfNow, self);
      const along = r === 'drag-h' ? dx : dy;          // 沿手柄自身轴的位移
      const tag = 'd=(' + dx + ',' + dy + ') 拖 ' + k;
      if (Math.abs(along) > 2) {
        check(tag + ' 只有这一条分界线移动', moved.length === 1 && moved[0] === k, '动了 [' + moved.join(', ') + ']');
        // 跟随指针；但若拖动把「被压缩那一侧」顶到引擎地板上，手柄只能停在地板处 ——
        // 这是物理必然（面板不能被压成负宽度），判据放宽为「同向且确实顶到地板」。
        const shrunkPx = along > 0 ? selfNow.pb : selfNow.pa;
        const floorHit = delta * along > 0 && Math.abs(delta) < Math.abs(along) && shrunkPx <= 124;
        check(tag + ' 位移跟随指针（±6）', Math.abs(delta - along) <= 6 || floorHit,
          +delta.toFixed(1) + (floorHit ? '（对面面板顶到地板 ' + shrunkPx.toFixed(1) + 'px，夹住）' : ''));
      } else {
        check(tag + ' 垂直方向拖动：任何分界线都不动', moved.length === 0, '动了 [' + moved.join(', ') + ']');
      }
      check(tag + ' 只有这一条 active', during.filter((h) => h.active).length === 1 && during.find((h) => h.active).k === k,
        during.filter((h) => h.active).map((h) => h.k).join(','));
      check(tag + ' 松手后无跳变', Math.abs(off(after.find((x) => x.k === k), selfNow)) <= 1.5,
        +(off(after.find((x) => x.k === k), selfNow)).toFixed(2));
    }
  }
}

console.log('\n=== JS 异常 ===');
check('无未捕获异常', errors.length === 0, errors.join(' | '));

console.log(fails === 0 ? '\nALL PASS' : '\nFAILED: ' + fails);
ws.close();
server.kill();
process.exit(fails === 0 ? 0 : 1);
