// 顶层依赖自动补齐探针（第 52 轮，#123）：真实 Edge + dev-server + CDP
// 覆盖用户本轮点名的「打开顶层 → 自动扫描读取依赖与例化模块」：
//   ① 依赖缺口检测按**当前顶层的例化可达图**算（无关模块的例化不算依赖）；
//   ② 已授权源码目录后，缺失模块被**自动读入**（用户不再选文件），且递归一层；
//   ③ 文件名与模块名不一致时按**内容**兜底找定义；
//   ④ 自动补齐**不抢占当前活动标签**（activate:false）；
//   ⑤ 目录权限失效 → 不崩、不重复导入，只汇报 needsPermission。
// 用法：node tools/dep-probe.mjs [端口] [CDP端口]
// 产物：控制台 PASS/FAIL 明细（无截图）
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const PORT = Number(process.argv[2]) || 8977;
const CDP = Number(process.argv[3]) || 9547;
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
// 集合语义比较：实现返回顺序由例化遍历顺序决定，断言只关心「集合相等」。
const same = (a, b) => JSON.stringify([...(a || [])].map(String).sort()) === JSON.stringify([...(b || [])].map(String).sort());

for (let i = 0; i < 40; i++) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/index.html'); if (r.ok) break; } catch (e) {}
  await sleep(300);
}

const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn(edge, ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
  '--remote-debugging-port=' + CDP, '--user-data-dir=' + e2eRoot + '/edge-dep-' + Date.now(), '--no-first-run',
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
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || '').slice(0, 300);
  return r.result ? r.result.result.value : undefined;
};

await send('Page.enable', {});
await send('Runtime.enable', {});
await send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 980, deviceScaleFactor: 1, mobile: false });
await send('Page.reload', { ignoreCache: true });
await sleep(5000);

// ─────────────────────────── 1. 顶层例化可达图上的缺口检测
const gaps = await ev(`(async () => {
  const sim = window.__wpsim;
  if (!sim || typeof sim.missingDependencyModules !== 'function') return JSON.stringify({ api: false });
  const top = 'module top_mod;\\n  sub u_sub(.a(1));\\nendmodule\\n';
  const other = 'module other;\\n  unrelated u_x();\\nendmodule\\n';
  const sub = 'module sub;\\n  leaf u_leaf();\\nendmodule\\n';
  sim.setSourceFiles([{ name: 'top_mod.sv', content: top }, { name: 'other.sv', content: other }]);
  sim.parseDesign();
  const fromTop = sim.missingDependencyModules('top_mod');
  const fromOther = sim.missingDependencyModules('other');
  const loose = sim.missingDependencyModules();          // 默认口径 = 当前生效顶层
  sim.addSourceFiles([{ name: 'sub.sv', content: sub }], { activate: false });
  sim.parseDesign();
  const afterSub = sim.missingDependencyModules('top_mod');   // sub 有了，leaf 还缺 → 递归一层
  return JSON.stringify({ api: true, fromTop: fromTop, fromOther: fromOther, loose: loose, afterSub: afterSub });
})()`);
console.log('\n=== 1. 依赖缺口 = 顶层例化可达图 ===');
console.log(gaps);
let G = {};
try { G = JSON.parse(gaps); } catch (e) { console.log('解析失败', e); }
check('#123 探针入口存在（__wpsim.missingDependencyModules）', G.api === true, String(G.api));
check('top_mod 的依赖缺口 = [sub]（不带无关模块 other 的例化）',
  same(G.fromTop, ['sub']), JSON.stringify(G.fromTop));
check('other 的依赖缺口 = [unrelated]（每个顶层各算各的子图）',
  same(G.fromOther, ['unrelated']), JSON.stringify(G.fromOther));
check('补上 sub.sv 后缺口下钻一层 = [leaf]',
  same(G.afterSub, ['leaf']), JSON.stringify(G.afterSub));

// ─────────────────────────── 2. 已授权目录 → 自动补齐（含内容兜底 / 不抢标签）
const auto = await ev(`(async () => {
  const sim = window.__wpsim;
  const mkFile = (name, text) => ({
    kind: 'file', name,
    async getFile() { return { name: name, async text() { return text; } }; }
  });
  const mkDir = (name, entries) => ({
    kind: 'directory', name,
    async *values() { for (const e of entries) yield e; },
    async queryPermission() { return 'granted'; },
    async requestPermission() { return 'granted'; }
  });
  // 目录结构：src/leaf.sv, src/odd_name.sv(定义 weird), src/skip/node_modules/x.v, README.md
  const src = mkDir('src', [
    mkFile('leaf.sv', 'module leaf;\\nendmodule\\n'),
    mkFile('odd_name.sv', 'module weird;\\nendmodule\\n'),
    mkFile('README.md', 'not hdl'),
    mkDir('node_modules', [mkFile('x.v', 'module should_not_load; endmodule')])
  ]);
  const rootDir = mkDir('fixture-src', [src]);
  sim.setSourceFiles([
    { name: 'top_mod.sv', content: 'module top_mod;\\n  sub u_sub();\\n  weird u_w();\\nendmodule\\n' },
    { name: 'sub.sv', content: 'module sub;\\n  leaf u_leaf();\\nendmodule\\n' }
  ]);
  sim.parseDesign();
  const activeBefore = document.querySelector('#source-files .source-chip.active').textContent;
  const missingBefore = sim.missingDependencyModules('top_mod');
  sim.setSourceDirHandle(rootDir);
  const result = await sim.resolveMissingDependencies();
  const names = sim.sourceFiles.map((f) => f.name);
  const activeAfter = document.querySelector('#source-files .source-chip.active').textContent;
  const missingAfter = sim.missingDependencyModules('top_mod');
  const logText = (document.getElementById('sim-console-log').textContent || '');
  // 再跑一次：不应重复导入
  const again = await sim.resolveMissingDependencies();
  const names2 = sim.sourceFiles.map((f) => f.name);
  return JSON.stringify({
    missingBefore: missingBefore, loaded: result.loaded, missingAfter: missingAfter,
    names: names, names2: names2, activeBefore: activeBefore, activeAfter: activeAfter,
    againLoaded: again.loaded, logHasAuto: logText.indexOf('依赖自动补齐') >= 0,
    logTail: logText.slice(-160)
  });
})()`);
console.log('\n=== 2. 已授权目录 → 自动补齐 ===');
console.log(auto);
let A = {};
try { A = JSON.parse(auto); } catch (e) { console.log('解析失败', e); }
check('补齐前缺口 = [leaf, weird]', same(A.missingBefore, ['leaf', 'weird']), JSON.stringify(A.missingBefore));
check('自动读入 leaf.sv（文件名约定）+ odd_name.sv（内容兜底）',
  same(A.loaded, ['leaf.sv', 'odd_name.sv']), JSON.stringify(A.loaded));
check('补齐后缺口清空（递归一层也补齐）', same(A.missingAfter, []), JSON.stringify(A.missingAfter));
check('重入的 node_modules / 非 HDL 文件没有被导入',
  !(A.names || []).some((n) => /should_not_load|x\.v|README/i.test(n)), JSON.stringify(A.names));
check('自动补齐不抢占当前活动标签', A.activeBefore === 'top_mod.sv' && A.activeAfter === 'top_mod.sv',
  JSON.stringify({ before: A.activeBefore, after: A.activeAfter }));
check('重复调用不重复导入（幂等）', same(A.names2, A.names), JSON.stringify(A.names2));
check('日志流给出「依赖自动补齐」一行', A.logHasAuto === true, A.logTail);

// ─────────────────────────── 3. 目录权限失效 → 降级为汇报，不崩
const denied = await ev(`(async () => {
  const sim = window.__wpsim;
  sim.setSourceFiles([{ name: 'top_mod.sv', content: 'module top_mod;\\n  gone u_g();\\nendmodule\\n' }]);
  sim.parseDesign();
  // setSourceFiles 内部会触发一次「有已授权目录」的自动补齐（fire-and-forget）；
  // 等它跑完再换句柄，否则本段的 resolveMissingDependencies() 会撞上重入保护直接返回。
  await new Promise((r) => setTimeout(r, 400));
  const deniedDir = { kind: 'directory', name: 'revoked', async queryPermission() { return 'denied'; },
    async requestPermission() { return 'denied'; }, async *values() {} };
  sim.setSourceDirHandle(deniedDir);
  const r = await sim.resolveMissingDependencies();
  const logText = (document.getElementById('sim-console-log').textContent || '');
  return JSON.stringify({ needsPermission: r.needsPermission, loaded: r.loaded,
    unresolved: r.unresolved, files: sim.sourceFiles.map((f) => f.name),
    warned: logText.indexOf('依赖扫描') >= 0 });
})()`);
console.log('\n=== 3. 目录权限失效 → 降级汇报 ===');
console.log(denied);
let D = {};
try { D = JSON.parse(denied); } catch (e) { console.log('解析失败', e); }
check('权限失效时 needsPermission=true 且不导入任何文件',
  D.needsPermission === true && same(D.loaded, []), JSON.stringify(D));
check('权限失效时仍把缺口汇报到日志流', D.warned === true && same(D.unresolved, ['gone']), JSON.stringify(D.unresolved));

// ─────────────────────────── 4. 「打开顶层」自动扫描依赖（#123 入口形态）
// 语义：选定顶层后工具自己去补 —— 没有授权目录时**在同一次手势里**弹系统「选择文件夹」，
// 一次授权之后自动递归补齐；用户取消过就不再打扰（只写日志提示）。
const autoTop = await ev(`(async () => {
  const sim = window.__wpsim;
  const mkFile = (name, text) => ({ kind: 'file', name,
    async getFile() { return { name: name, async text() { return text; } }; } });
  const mkDir = (name, entries) => ({ kind: 'directory', name,
    async *values() { for (const e of entries) yield e; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; } });
  const dir = mkDir('proj', [
    mkFile('child.sv', 'module child;\\n  grand u_g();\\nendmodule\\n'),
    mkFile('grand.v', 'module grand;\\nendmodule\\n')
  ]);
  sim.setSourceDirHandle(null);        // 清掉上一段留下的句柄 / 标志
  sim.resetAutoScanDecline();
  sim.setSourceFiles([{ name: 'top_mod.sv', content: 'module top_mod;\\n  child u_c();\\nendmodule\\n' }]);
  await new Promise((r) => setTimeout(r, 400));       // 等 setSourceFiles 触发的解析落定
  let pickerCalls = 0;
  const original = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => { pickerCalls += 1; return dir; };
  const activeBefore = document.querySelector('#source-files .source-chip.active').textContent;
  sim.autoScanForTop('top_mod');
  await new Promise((r) => setTimeout(r, 900));
  const names = sim.sourceFiles.map((f) => f.name);
  const missingAfter = sim.missingDependencyModules('top_mod');
  const activeAfter = document.querySelector('#source-files .source-chip.active').textContent;
  // 依赖已闭合后再调一次：不该再弹框
  sim.autoScanForTop('top_mod');
  await new Promise((r) => setTimeout(r, 200));
  const pickerCallsClosed = pickerCalls;
  const logText = document.getElementById('sim-console-log').textContent || '';
  window.showDirectoryPicker = original;
  return JSON.stringify({ pickerCalls: pickerCallsClosed, names: names, missingAfter: missingAfter,
    activeBefore: activeBefore, activeAfter: activeAfter,
    logHasPicker: logText.indexOf('文件夹选择框') >= 0, logHasAuto: logText.indexOf('依赖自动补齐') >= 0 });
})()`);
console.log('\n=== 4. 打开顶层 → 自动扫描依赖（#123 入口） ===');
console.log(autoTop);
let S = {};
try { S = JSON.parse(autoTop); } catch (e) { console.log('解析失败', e); }
check('没有授权目录时自动弹出「选择文件夹」一次', S.pickerCalls === 1, String(S.pickerCalls));
check('选完目录后 child.sv / grand.v 一起读入（递归一层），缺口闭合',
  same(S.names, ['top_mod.sv', 'child.sv', 'grand.v']) && same(S.missingAfter, []),
  JSON.stringify({ names: S.names, missing: S.missingAfter }));
check('自动扫描不抢占当前活动标签', S.activeBefore === 'top_mod.sv' && S.activeAfter === 'top_mod.sv',
  JSON.stringify({ before: S.activeBefore, after: S.activeAfter }));
check('依赖已闭合时不再弹框打扰', S.pickerCalls === 1, String(S.pickerCalls));
check('日志流给出「弹出文件夹选择框」+「依赖自动补齐」两行', S.logHasPicker === true && S.logHasAuto === true,
  JSON.stringify({ picker: S.logHasPicker, auto: S.logHasAuto }));

// 4b. 用户取消 → 本会话不再弹框，只提示可执行的补齐路径
const declines = await ev(`(async () => {
  const sim = window.__wpsim;
  sim.setSourceDirHandle(null);
  sim.resetAutoScanDecline();
  sim.setSourceFiles([{ name: 'only_top.sv', content: 'module only_top;\\n  nope u_n();\\nendmodule\\n' }]);
  await new Promise((r) => setTimeout(r, 400));
  let calls = 0;
  const original = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => {
    calls += 1;
    const err = new Error('user cancelled'); err.name = 'AbortError'; throw err;
  };
  sim.autoScanForTop('only_top');
  await new Promise((r) => setTimeout(r, 300));
  sim.autoScanForTop('only_top');       // 第二次：不该再弹
  await new Promise((r) => setTimeout(r, 300));
  window.showDirectoryPicker = original;
  const logText = document.getElementById('sim-console-log').textContent || '';
  return JSON.stringify({ calls: calls, files: sim.sourceFiles.map((f) => f.name),
    cancelledHint: logText.indexOf('已取消选择源码目录') >= 0,
    gapHint: logText.indexOf('被例化，但当前源码里没有定义') >= 0 });
})()`);
console.log('\n=== 4b. 取消后不再打扰（降级为日志提示） ===');
console.log(declines);
let N = {};
try { N = JSON.parse(declines); } catch (e) { console.log('解析失败', e); }
check('取消一次后不再弹框（两次调用只弹 1 次）', N.calls === 1, String(N.calls));
check('取消不导入任何文件', same(N.files, ['only_top.sv']), JSON.stringify(N.files));
check('取消写出「已取消选择源码目录」+ 缺口提示（给出后续补齐路径）',
  N.cancelledHint === true && N.gapHint === true, JSON.stringify({ c: N.cancelledHint, g: N.gapHint }));

// ─────────────────────────── 5. ＋ 导入后仍缺依赖 → 日志流里的「补齐」按钮（第 53 轮）
// 语义：`＋` 的瞬时手势被文件对话框吃掉，同一次调用里**没法**再弹 showDirectoryPicker
// （必然 SecurityError）。于是 reportMissingDependencies 在日志流里挂一个行内按钮；
// 用户点它的那一刻 = 一次**全新手势** ⇒ 一键补齐，且缺口消失后按钮自动清理。
const action = await ev(`(async () => {
  const sim = window.__wpsim;
  const mkFile = (name, text) => ({ kind: 'file', name,
    async getFile() { return { name: name, async text() { return text; } }; } });
  const mkDir = (name, entries) => ({ kind: 'directory', name,
    async *values() { for (const e of entries) yield e; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; } });
  const dir = mkDir('proj2', [mkFile('nope.v', 'module nope;\\nendmodule\\n')]);
  const btnSel = '#sim-console-log .mk-cline.mk-act .mk-cline-btn';
  sim.setSourceDirHandle(null);
  sim.resetAutoScanDecline();
  sim.setSourceFiles([{ name: 'only_top.sv', content: 'module only_top;\\n  nope u_n();\\nendmodule\\n' }]);
  await new Promise((r) => setTimeout(r, 400));
  document.getElementById('sim-console-log').replaceChildren();   // 清空日志，便于定位本次按钮
  // ＋ 导入路径（stub 系统文件选择框）：新文件同样缺依赖 → 应挂出补齐按钮
  const originalOpen = window.showOpenFilePicker;
  window.showOpenFilePicker = async () => [mkFile('only_top2.sv', 'module only_top2;\\n  nope u_n();\\nendmodule\\n')];
  await sim.importSourceFiles();
  window.showOpenFilePicker = originalOpen;
  await new Promise((r) => setTimeout(r, 500));
  const btn = document.querySelector(btnSel);
  const label = btn ? btn.textContent : null;
  const clicked = !!btn;
  let pickerCalls = 0;
  const originalPick = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => { pickerCalls += 1; return dir; };
  if (btn) btn.click();                      // 用户点按钮 = 新手势（stub 不校验，但走的是同一条链）
  await new Promise((r) => setTimeout(r, 1200));
  window.showDirectoryPicker = originalPick;
  const names = sim.sourceFiles.map((f) => f.name);
  const missingAfter = sim.missingDependencyModules('only_top2');
  const btnGone = !document.querySelector(btnSel);
  const logText = document.getElementById('sim-console-log').textContent || '';
  return JSON.stringify({ label: label, clicked: clicked, pickerCalls: pickerCalls, names: names,
    missingAfter: missingAfter, btnGone: btnGone,
    logHasLoaded: logText.indexOf('读入') >= 0 || logText.indexOf('依赖自动补齐') >= 0 });
})()`);
console.log('\n=== 5. ＋ 导入后仍缺依赖 → 日志流「补齐」按钮 ===');
console.log(action);
let A5 = {};
try { A5 = JSON.parse(action); } catch (e) { console.log('解析失败', e); }
check('＋ 导入后日志流里出现补齐按钮（文案含「补齐依赖」）',
  A5.clicked === true && typeof A5.label === 'string' && A5.label.indexOf('补齐依赖') >= 0, JSON.stringify(A5.label));
check('点按钮恰好弹出一次文件夹选择框', A5.pickerCalls === 1, String(A5.pickerCalls));
check('补齐后缺口清空且依赖文件已读入',
  same(A5.missingAfter, []) && (A5.names || []).indexOf('nope.v') >= 0, JSON.stringify({ missing: A5.missingAfter, names: A5.names }));
check('缺口闭合后按钮自动清理（不长期占界面）', A5.btnGone === true, String(A5.btnGone));
check('点按钮补齐写进日志流（读入 / 自动补齐）', A5.logHasLoaded === true, String(A5.logHasLoaded));

console.log('\n=== 运行期异常 ===');
console.log(errors.length ? errors.join('\n') : '（无）');
check('运行期无未捕获异常', errors.length === 0, String(errors.length));

console.log('\n结果：' + (fails ? fails + ' 项 FAIL' : '全部 PASS'));
try { ws.close(); } catch (e) {}
server.kill();
process.exit(fails ? 1 : 0);
