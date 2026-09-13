// 源码面板 / 文件标签条 探针（第 37 轮）：真实 Edge + dev-server + CDP
// 覆盖用户本轮点名的四件事：
//   ① 右侧源码面板不再有「第二层标题栏」（停靠模式下 .sim-card-head 必须隐藏）；
//   ② 该面板只剩「文件标签条 + 代码框」两件东西（其余控件移出 / 隐去 / 不可见）；
//   ③ 仿真提示框（#module-preview / #port-preview）落在「仿真状态」面板里，
//      位置在日志区之下、状态行之上；
//   ④ 文件的新增 / 移除 = 标签条末尾的「＋」+ 每个标签右侧的「−」。
// 用法：node tools/source-panel-probe.mjs [端口]
// 产物：.e2e-tmp/src-*.png 截图 + 控制台 PASS/FAIL 明细
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = Number(process.argv[2]) || 8971;
const CDP = Number(process.argv[3]) || 9541;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const e2eRoot = root + '/.e2e-tmp';
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(e2eRoot, { recursive: true });
mkdirSync(sysTmp, { recursive: true });
const server = spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd: root, stdio: 'ignore' });
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
  '--remote-debugging-port=' + CDP, '--user-data-dir=' + e2eRoot + '/edge-src-' + Date.now(), '--no-first-run',
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
async function shot(file) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (r.result && r.result.data) { writeFileSync(file, Buffer.from(r.result.data, 'base64')); console.log('  info 截图 ' + file); }
}
const shotPath = (name) => e2eRoot + '/src-' + name + '.png';

await send('Page.enable', {});
await send('Runtime.enable', {});
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 980, deviceScaleFactor: 1, mobile: false });
await send('Page.reload', { ignoreCache: true });
await sleep(5000);

// ─────────────────────────────────────────── 1. 结构：双层标题栏 / 面板内容
const snap = await ev(`(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 0; };
  const cards = Array.from(document.querySelectorAll('#workbench .mk-host > .sim-card'));
  const heads = cards.map((c) => ({ id: c.id, headDisplay: c.querySelector('.sim-card-head') ? getComputedStyle(c.querySelector('.sim-card-head')).display : null }));
  const src = document.getElementById('sim-card-source');
  const bodyKids = src ? Array.from(src.querySelector('.sim-card-body').children).map((k) => k.id || k.className) : [];
  const srcBtns = src ? Array.from(src.querySelectorAll('button')).filter(vis).map((b) => b.id || b.className) : [];
  const srcBtnsOutTabs = src ? Array.from(src.querySelectorAll('button')).filter((b) => vis(b) && !b.closest('#source-tabs')).map((b) => b.id || b.className) : [];
  const con = document.getElementById('sim-console');
  const conKids = con ? Array.from(con.children).map((k) => k.id || k.className) : [];
  const notes = document.getElementById('sim-console-notes');
  const tb = document.getElementById('sim-card-tb');
  return JSON.stringify({
    dock: !!window.__wpDock, bodyClass: document.body.className,
    cards: heads,
    srcBodyKids: bodyKids,
    srcVisibleButtonsOutsideTabs: srcBtnsOutTabs, srcVisibleButtons: srcBtns,
    consoleKids: conKids,
    notesInConsole: !!(notes && notes.parentNode === con),
    notesRect: R(notes), statusRect: R(document.getElementById('sim-status')), logRect: R(document.getElementById('sim-console-log')),
    importHidden: !vis(document.getElementById('sim-import')),
    removeFileHidden: !vis(document.getElementById('sim-removefile')),
    parseHidden: !vis(document.getElementById('sim-parse')),
    tbGenHidden: !vis(document.getElementById('sim-tb')),
    runInToolbar: !!(document.getElementById('sim-run') && document.getElementById('sim-run').closest('#toolbar')),
    addSigInToolbar: !!(document.getElementById('sim-addsignals') && document.getElementById('sim-addsignals').closest('#toolbar')),
    runRect: R(document.getElementById('sim-run')), addSigRect: R(document.getElementById('sim-addsignals')),
    toolbarRect: R(document.getElementById('toolbar')),
    helperBoxInSource: !!(src && src.querySelector('.helper-box')),
  });
})()`);
console.log('\n=== 1. 结构：双层标题栏 / 面板内容 ===');
console.log(snap);
let S = {};
try { S = JSON.parse(snap); } catch (e) { console.log('快照解析失败', e); }
check('dock 引擎接管', S.dock === true && /wp-dock/.test(S.bodyClass || ''), S.bodyClass);
check('已挂载卡片的第二层标题栏（.sim-card-head）全部隐藏（未挂载的卡片停在 #mk-park，整体 display:none）',
  (S.cards || []).length >= 2 && (S.cards || []).every((c) => c.headDisplay === 'none'),
  JSON.stringify(S.cards));
check('源码卡内容区只剩 文件标签条 + 代码框（无 .helper-box）',
  (S.srcBodyKids || []).some((k) => /source-toolbar/.test(k)) && !S.helperBoxInSource, JSON.stringify(S.srcBodyKids));
check('源码卡内「标签条以外」没有任何可见按钮', (S.srcVisibleButtonsOutsideTabs || []).length === 0,
  JSON.stringify(S.srcVisibleButtonsOutsideTabs));
check('源码卡可见按钮 == 文件标签 + 关闭键 + 加号（见 §2 明细）', (S.srcVisibleButtons || []).length >= 3, JSON.stringify(S.srcVisibleButtons));
check('导入源码 / 移除文件 / 解析 RTL / 生成 TB 四个按钮已不可见',
  S.importHidden === true && S.removeFileHidden === true && S.parseHidden === true && S.tbGenHidden === true,
  JSON.stringify({ imp: S.importHidden, rem: S.removeFileHidden, par: S.parseHidden, tb: S.tbGenHidden }));
check('「自动加信号」+「运行仿真」都在顶部编辑栏 #toolbar 内',
  S.runInToolbar === true && S.addSigInToolbar === true);
check('两个按钮在编辑栏下沿之内（未被裁出工具带）',
  !!S.runRect && !!S.addSigRect && !!S.toolbarRect
    && S.runRect.y >= S.toolbarRect.y - 1 && S.runRect.y + S.runRect.h <= S.toolbarRect.y + S.toolbarRect.h + 1,
  JSON.stringify({ run: S.runRect, addSig: S.addSigRect, tb: S.toolbarRect }));
check('仿真提示框（#sim-console-notes）在 #sim-console 内，且排在日志区之后、状态行之前',
  S.notesInConsole === true
    && (S.consoleKids || []).indexOf('sim-console-log') < (S.consoleKids || []).indexOf('sim-console-notes')
    && (S.consoleKids || []).indexOf('sim-console-notes') < (S.consoleKids || []).indexOf('sim-status'),
  JSON.stringify(S.consoleKids));
check('提示框无内容时自动收起（不占高度）', !S.notesRect || S.notesRect.h === 0, JSON.stringify(S.notesRect));
await shot(shotPath('1-structure'));

// ─────────────────────────────────────── 1.5 切到 TB 页签：同样只有一层标题栏
const tbTab = await ev(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tab = document.querySelector('.mk-tab[data-panel="tb"]');
  if (!tab) return JSON.stringify({ err: 'no-tb-tab' });
  tab.click();
  await sleep(600);
  const card = document.getElementById('sim-card-tb');
  const vis = (el) => { if (!el) return false; const cs = getComputedStyle(el);
    return cs.display !== 'none' && el.getBoundingClientRect().height > 0; };
  return JSON.stringify({
    mounted: !!(card && card.closest('.mk-host')),
    headDisplay: card && card.querySelector('.sim-card-head') ? getComputedStyle(card.querySelector('.sim-card-head')).display : 'missing',
    visibleTitlesInPanel: Array.from(document.querySelectorAll('.mk-tab.active')).map((t) => t.textContent),
    copyVisible: vis(document.getElementById('sim-tb-copy')),
    editorVisible: vis(document.getElementById('tb-source')) || vis(document.querySelector('.cm-editor')),
    cardButtons: card ? Array.from(card.querySelectorAll('button')).filter(vis).length : -1,
  });
})()`);
console.log('\n=== 1.5 TB 页签（同样只能有一层标题栏） ===');
console.log(tbTab);
let B = {};
try { B = JSON.parse(tbTab); } catch (e) { console.log('解析失败', e); }
check('TB 卡片挂进面板后，其自带标题行也隐藏（页签栏是唯一标题）', B.headDisplay === 'none' && B.mounted === true, JSON.stringify(B));
check('TB 面板的「复制」按钮仍可用（从标题行搬到内容区）', B.copyVisible === true, JSON.stringify({ c: B.copyVisible }));
check('TB 面板代码框可见', B.editorVisible === true);
await shot(shotPath('1b-tb-tab'));
await ev(`(async () => { const t = document.querySelector('.mk-tab[data-panel="source"]'); if (t) t.click();
  await new Promise((r) => setTimeout(r, 400)); return 1; })()`);

// ─────────────────────────────────────────── 2. 文件标签条：＋ / −
const tabs = await ev(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__wpsim.setSourceFiles([
    { name: 'counter.sv', content: 'module counter; endmodule\\n' },
    { name: 'top.sv', content: 'module top; counter u (.c(1)); endmodule\\n' },
    { name: 'sub.v', content: 'module sub; endmodule\\n' },
  ]);
  await sleep(400);
  const strip = document.getElementById('source-files');
  const chips = Array.from(strip.querySelectorAll('.source-chip'));
  const closes = Array.from(strip.querySelectorAll('.source-chip-close'));
  const add = document.getElementById('sim-addfile');
  const out = {
    tabs: strip.querySelectorAll('.source-tab').length,
    names: chips.map((c) => c.textContent),
    activeName: (strip.querySelector('.source-chip.active') || {}).textContent,
    closes: closes.length,
    closeGlyph: closes.length ? closes[0].textContent : '',
    closeNotInsideChip: closes.every((c) => !c.closest('.source-chip')),
    addLabel: add ? add.textContent : '',
    addVisible: !!(add && add.getBoundingClientRect().height > 0),
    addAfterList: !!(add && strip.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING) !== false,
  };
  // 移除"第二个"文件（top.sv）：点它自己的「−」
  closes[1].click();
  await sleep(400);
  const chips2 = Array.from(strip.querySelectorAll('.source-chip'));
  out.afterRemoveNames = chips2.map((c) => c.textContent);
  out.afterRemoveActive = (strip.querySelector('.source-chip.active') || {}).textContent;
  out.status = (document.getElementById('sim-status').textContent || '').slice(0, 60);
  // 用「＋」新增一个文件（stub prompt，避免弹系统框）
  window.prompt = () => 'extra.sv';
  document.getElementById('sim-addfile').click();
  await sleep(400);
  const chips3 = Array.from(strip.querySelectorAll('.source-chip'));
  out.afterAddNames = chips3.map((c) => c.textContent);
  out.afterAddActive = (strip.querySelector('.source-chip.active') || {}).textContent;
  // 只剩一个文件时「−」必须禁用（护栏）
  window.__wpsim.setSourceFiles([{ name: 'only.sv', content: '' }]);
  await sleep(300);
  const one = strip.querySelector('.source-chip-close');
  out.singleDisabled = !!(one && one.disabled);
  out.singleClickKeeps = (() => { if (one) one.click(); return strip.querySelectorAll('.source-chip').length; })();
  return JSON.stringify(out);
})()`);
console.log('\n=== 2. 文件标签条（＋ 新增 / − 移除） ===');
console.log(tabs);
let T = {};
try { T = JSON.parse(tabs); } catch (e) { console.log('解析失败', e); }
check('三个文件 = 三个标签，且 .source-chip 文本严格等于文件名',
  T.tabs === 3 && JSON.stringify(T.names) === JSON.stringify(['counter.sv', 'top.sv', 'sub.v']), JSON.stringify(T.names));
check('每个标签右侧都有「−」关闭键，且不在 .source-chip 内部（不污染 chip 文本）',
  T.closes === 3 && T.closeGlyph === '−' && T.closeNotInsideChip === true, JSON.stringify({ n: T.closes, g: T.closeGlyph }));
check('标签条末尾是「＋」（#sim-addfile 可见）', T.addVisible === true && T.addLabel === '＋', JSON.stringify({ l: T.addLabel, v: T.addVisible }));
check('点「−」移除的是「那一个」文件（top.sv 消失，其余保留）',
  JSON.stringify(T.afterRemoveNames) === JSON.stringify(['counter.sv', 'sub.v']), JSON.stringify(T.afterRemoveNames));
check('移除后活动标签收敛正常（counter.sv 仍活动）', T.afterRemoveActive === 'counter.sv', T.afterRemoveActive);
check('点「＋」新增文件（extra.sv 出现在列表末尾并成为活动标签）',
  (T.afterAddNames || []).indexOf('extra.sv') === (T.afterAddNames || []).length - 1 && T.afterAddActive === 'extra.sv',
  JSON.stringify({ names: T.afterAddNames, active: T.afterAddActive }));
check('只剩一个文件时「−」被禁用（护栏：至少保留一个源文件）',
  T.singleDisabled === true && T.singleClickKeeps === 1, JSON.stringify({ d: T.singleDisabled, n: T.singleClickKeeps }));
await shot(shotPath('2-tabs'));

// ─────────────────────────────────────────── 3. 仿真提示框落位（console 面板内）
const notes = await ev(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const R = (el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.top), h: Math.round(r.height) }; };
  const notes = document.getElementById('sim-console-notes');
  const mp = document.getElementById('module-preview');
  const pp = document.getElementById('port-preview');
  mp.textContent = '仿真完成：3 个输出信号，时长 tmax 120\\n末值：q=3';
  pp.textContent = 'counter: input clk[1], output q[4]';
  await sleep(300);
  const out = {
    notesDisplay: getComputedStyle(notes).display,
    notesRect: R(notes), logRect: R(document.getElementById('sim-console-log')),
    statusRect: R(document.getElementById('sim-status')),
    text: mp.textContent.slice(0, 20),
    insideConsole: notes.closest('#sim-console') === document.getElementById('sim-console'),
  };
  mp.textContent = ''; pp.textContent = '';
  await sleep(300);
  out.collapsedAgain = getComputedStyle(notes).display === 'none';
  return JSON.stringify(out);
})()`);
console.log('\n=== 3. 仿真提示框落位 ===');
console.log(notes);
let N = {};
try { N = JSON.parse(notes); } catch (e) { console.log('解析失败', e); }
check('提示框有内容时在「仿真状态」面板内可见', N.notesDisplay !== 'none' && N.insideConsole === true, N.notesDisplay);
check('提示框排在日志区之下、状态行之上',
  !!N.notesRect && !!N.logRect && !!N.statusRect && N.notesRect.y >= N.logRect.y + N.logRect.h - 1 && N.notesRect.y + N.notesRect.h <= N.statusRect.y + 2,
  JSON.stringify({ notes: N.notesRect, log: N.logRect, status: N.statusRect }));
check('提示框清空后自动收起', N.collapsedAgain === true);

console.log('\n=== 4. JS 异常 ===');
check('页面无未捕获异常', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log('\n' + (fails ? '✘ FAIL = ' + fails : '✔ 全部通过'));
try { ws.close(); } catch (e) {}
server.kill();
process.exit(fails ? 1 : 0);
