// 顶层依赖自动补齐探针（第 52 轮 #123 + 第 54 轮 #124）：真实 Edge + dev-server + CDP
// 覆盖用户点名的「打开顶层 → 自动扫描读取依赖与例化模块 → 不需要再手动选文件夹」：
//   ① 依赖缺口检测按**当前顶层的例化可达图**算（无关模块的例化不算依赖）；
//   ② 已授权源码目录后，缺失模块被**自动读入**（用户不再选文件），且递归一层；
//   ③ 文件名与模块名不一致时按**内容**兜底找定义；
//   ④ 自动补齐**不抢占当前活动标签**（activate:false）；
//   ⑤ 目录权限失效 → 不崩、不重复导入，只汇报 needsPermission；
//   ⑥ 第 54 轮：源码**搜索根**（默认 = 顶层所在目录 + 往上 3 层）静默补齐，**零弹框**；
//   ⑦ 第 54 轮：「自动补齐」按钮（标签条「＋」右侧）随缺口显隐、点一次就消失；
//   ⑧ 第 54 轮：`＋` 打开顶层 → 自动派生搜索根 → 依赖自动读入（端到端）。
// ⚠ dev-server 没有 api/fs 路由 ⇒ 本地读盘链路的**真实**实现由 tools/fs-api-probe.mjs
//   （真实 exe）覆盖；本文件在第 4.5 段注入 window.fetch 替身，把前端逻辑跑到端到端。
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

// ─────────────────────────── 4. 打开顶层：**没有**任何来源时才弹文件夹框（第 52 轮契约仍在）
// 第 54 轮口径：默认走「源码搜索根 + 本地服务读盘」，零弹框；只有**确知**本地服务不可用
// （dev-server / 浏览器直开）且既没有搜索根、也没有已授权目录时，才回到「同一次手势里
// 弹系统选择文件夹」。用户取消过一次 → 本会话不再弹，只写日志提示可执行的补齐路径。
const fallback = await ev(`(async () => {
  const sim = window.__wpsim;
  sim.setDepSearchRoots([]);
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
  await new Promise((r) => setTimeout(r, 400));
  sim.autoScanForTop('only_top');            // 第二次：已取消过 → 不该再弹
  await new Promise((r) => setTimeout(r, 400));
  window.showDirectoryPicker = original;
  const logText = document.getElementById('sim-console-log').textContent || '';
  return JSON.stringify({
    calls: calls, fsReady: await sim.fsApiReady(), files: sim.sourceFiles.map((f) => f.name),
    pickerHint: logText.indexOf('已弹出文件夹选择框') >= 0,
    cancelledHint: logText.indexOf('已取消选择源码目录') >= 0,
    gapHint: logText.indexOf('被例化，但当前源码里没有定义') >= 0,
    fillVisible: sim.depFillVisible
  });
})()`);
console.log('\n=== 4. 无任何来源时才弹文件夹框（取消后不再打扰） ===');
console.log(fallback);
let F = {};
try { F = JSON.parse(fallback); } catch (e) { console.log('解析失败', e); }
check('第 4 段的前置假设成立：dev-server 下本地读盘通道不可用', F.fsReady === false, String(F.fsReady));
check('没有搜索根 / 已授权目录时，才弹出「选择文件夹」', F.calls === 1, String(F.calls));
check('取消一次后不再弹框（两次调用只弹 1 次）', F.calls === 1, String(F.calls));
check('取消不导入任何文件', same(F.files, ['only_top.sv']), JSON.stringify(F.files));
check('写出「已弹出文件夹选择框」+「已取消选择源码目录」+ 缺口提示',
  F.pickerHint === true && F.cancelledHint === true && F.gapHint === true,
  JSON.stringify({ p: F.pickerHint, c: F.cancelledHint, g: F.gapHint }));
check('缺口未闭合 → 「自动补齐」按钮留在界面上（用户可重试）', F.fillVisible === true, String(F.fillVisible));

// ─────────────────────────── 4.5 注入「本地读盘通道」替身（api/fs + api/pick）
// dev-server 没有 api/fs 路由，真实那条链只能跑 exe（见 tools/fs-api-probe.mjs）。
// 但**前端逻辑**（搜索根派生 / 跨目录查找 / 内容兜底 / 按钮显隐）可以在这里用一份
// 内存虚拟文件系统跑到端到端：替换 window.fetch 的 api/fs|api/pick 响应即可。
// ⚠ 页面代码里一律不写反斜杠正则（模板字符串会把 \\ 吃掉），路径统一用 '/'，
//   需要反斜杠时用 String.fromCharCode(92) 现拼。
const stamped = await ev(`(() => {
  const BS = String.fromCharCode(92);
  const HDL = ['.v', '.sv', '.vh', '.svh'];
  const isHdl = (name) => {
    const lower = String(name).toLowerCase();
    for (const ext of HDL) { if (lower.length > ext.length && lower.slice(-ext.length) === ext) return true; }
    return false;
  };
  const norm = (p) => {
    let out = String(p).split(BS).join('/');
    while (out.length > 1 && out.charAt(out.length - 1) === '/') out = out.slice(0, -1);
    return out.toLowerCase();
  };
  // 虚拟工程：D:/vp/proj/rtl/core 是顶层所在目录（本级 depth 6）；
  //   · top_mod.sv  顶层本体（「＋」导入的就是它）
  //   · sub.sv      同目录 → 文件名约定命中
  //   · odd_name.sv 同目录，但文件名与模块名不符 → **内容兜底**命中（定义 module weird）
  //   · ../lib/leaf.sv        父目录 rtl 的兄弟子目录 → 递归索引命中（depth 2）
  //   · ../../lib/std_cell.sv 祖父目录 vp 下的另一棵子树 → 递归索引命中（depth 2）
  //   · ../../vendor/unrelated.v 与顶层无关 → **不该**被读入
  const spec = {
    'D:/vp/proj/rtl/core/top_mod.sv': 'module top_mod;\\n  sub u_sub();\\n  weird u_w();\\nendmodule\\n',
    'D:/vp/proj/rtl/core/sub.sv': 'module sub;\\n  leaf u_leaf();\\nendmodule\\n',
    'D:/vp/proj/rtl/core/odd_name.sv': 'module weird;\\nendmodule\\n',
    'D:/vp/proj/rtl/lib/leaf.sv': 'module leaf;\\n  std_cell u_s();\\nendmodule\\n',
    'D:/vp/proj/vendor/unrelated.v': 'module unrelated;\\nendmodule\\n',
    'D:/vp/lib/std_cell.sv': 'module std_cell;\\nendmodule\\n',
    'D:/vp2/std/nope.v': 'module nope;\\nendmodule\\n'
  };
  const files = {};
  const dirs = {};
  const ensure = (key) => { if (!dirs[key]) dirs[key] = []; return dirs[key]; };
  for (const full of Object.keys(spec)) {
    const key = norm(full);
    files[key] = spec[full];
    const parts = key.split('/');
    for (let i = 1; i <= parts.length; i += 1) {
      const name = parts[i - 1];
      // ⚠ 条目（目录或文件）都挂在**父目录**的列表里：i < 长度时 parts[i-1] 是目录名，
      //   但它自己的列表在 parts[0..i-2] 这个父目录下 —— 写成 ensure(cur) 会把每个目录
      //   变成只有自己的「自环」，递归索引就永远走不进子目录（第 54 轮踩过）。
      const parent = parts.slice(0, i - 1).join('/');
      const list = ensure(parent);
      if (!list.some((entry) => entry.name.toLowerCase() === name)) {
        list.push({ name: name, dir: i < parts.length });
      }
    }
  }
  const walk = (key, depth, out) => {
    for (const entry of (dirs[key] || [])) {
      const child = key + '/' + entry.name.toLowerCase();
      if (entry.dir) { if (depth > 0) walk(child, depth - 1, out); continue; }
      if (isHdl(entry.name)) out.push({ name: entry.name, path: child, rel: child.slice(key.length + 1) });
    }
  };
  const params = (url) => {
    const at = String(url).indexOf('?');
    const out = {};
    if (at < 0) return out;
    for (const kv of String(url).slice(at + 1).split('&')) {
      if (!kv) continue;
      const eq = kv.indexOf('=');
      const key = decodeURIComponent(eq < 0 ? kv : kv.slice(0, eq));
      out[key] = eq < 0 ? '' : decodeURIComponent(kv.slice(eq + 1).split('+').join(' '));
    }
    return out;
  };
  const json = (obj, status) => new Response(JSON.stringify(obj),
    { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  const state = { pickPaths: [] };
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('api/fs') < 0 && url.indexOf('api/pick') < 0) return originalFetch(input, init);
    const q = params(url);
    const op = q.op || (url.indexOf('api/pick') >= 0 ? 'pick' : '');
    if (op === 'probe') return new Response('WAVEPAINT-FS\\n1\\nstub\\n', { status: 200 });
    if (op === 'pick') return json({ ok: true, canceled: state.pickPaths.length === 0, paths: state.pickPaths.slice() });
    const key = norm(q.path || '');
    if (op === 'read') {
      const text = files[key];
      return text == null ? json({ ok: false, error: 'no such file' }, 404) : new Response(text, { status: 200 });
    }
    if (op === 'list') {
      const list = dirs[key];
      return list ? json({ ok: true, path: q.path, entries: list }) : json({ ok: false, error: 'no such dir' }, 404);
    }
    if (op === 'index') {
      if (!dirs[key]) return json({ ok: false, error: 'no such dir' }, 404);
      const out = [];
      walk(key, Number(q.depth || 6), out);
      return json({ ok: true, path: q.path, truncated: false, files: out });
    }
    return json({ ok: false, error: 'unknown op ' + op }, 400);
  };
  window.__fsStub = {
    files: files, dirs: dirs, topPath: 'D:/vp/proj/rtl/core/top_mod.sv', stdDir: 'D:/vp2/std',
    set pickPaths(value) { state.pickPaths = value; }, get pickPaths() { return state.pickPaths; }
  };
  return JSON.stringify({ ok: true, files: Object.keys(files).length, dirs: Object.keys(dirs).length });
})()`);
console.log('\n=== 4.5 注入本地读盘通道替身（api/fs + api/pick） ===');
console.log(stamped);
let ST = {};
try { ST = JSON.parse(stamped); } catch (e) { console.log('解析失败', e); }
check('替身已装好（虚拟文件系统 7 个文件）', ST.ok === true && ST.files === 7, JSON.stringify(ST));
check('替身装好后本地读盘通道探活转为可用',
  (await ev(`window.__wpsim.resetFsApiProbe() && window.__wpsim.fsApiReady()`)) === true);

// ─────────────────────────── 5. 搜索根静默补齐：跨目录 + 内容兜底 + 零弹框
// 用户本轮口径：「自动加信号的逻辑不需要再手动去选文件夹」。默认搜索根 = 打开的顶层
// 所在目录（本级递归到底）+ 其上 3 层（各下探 2 层，覆盖兄弟目录）。
const silent = await ev(`(async () => {
  const sim = window.__wpsim;
  const stub = window.__fsStub;
  sim.setSourceDirHandle(null);
  sim.resetAutoScanDecline();
  sim.resetDepSearchRoots();
  sim.setSourceFiles([{ name: 'top_mod.sv', content: 'module top_mod;\\n  sub u_sub();\\n  weird u_w();\\nendmodule\\n' }]);
  await new Promise((r) => setTimeout(r, 300));
  const derived = sim.notePickedSourcePaths([stub.topPath]);
  const roots = derived.map((root) => ({ path: root.path, depth: root.depth, auto: root.auto }));
  let pickerCalls = 0;
  const original = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => { pickerCalls += 1; throw new Error('不该被调用'); };
  const activeBefore = document.querySelector('#source-files .source-chip.active').textContent;
  const result = await sim.resolveMissingDependencies();
  const activeAfter = document.querySelector('#source-files .source-chip.active').textContent;
  window.showDirectoryPicker = original;
  const logText = document.getElementById('sim-console-log').textContent || '';
  return JSON.stringify({
    roots: roots, loaded: result.loaded, via: result.via, pickerCalls: pickerCalls,
    names: sim.sourceFiles.map((f) => f.name), missing: sim.missingDependencyModules('top_mod'),
    activeSame: activeBefore === activeAfter, fillVisible: sim.depFillVisible,
    logAuto: logText.indexOf('依赖自动补齐') >= 0, logRoots: logText.indexOf('源码搜索根') >= 0
  });
})()`);
console.log('\n=== 5. 搜索根静默补齐（跨目录 + 内容兜底 + 零弹框） ===');
console.log(silent);
let SI = {};
try { SI = JSON.parse(silent); } catch (e) { console.log('解析失败', e); }
check('默认派生 4 个搜索根（本级 + 往上 3 层）', (SI.roots || []).length === 4, JSON.stringify(SI.roots));
check('本级目录递归到底（depth 6）',
  (SI.roots || [])[0] && SI.roots[0].depth === 6, JSON.stringify((SI.roots || [])[0]));
check('上溯 3 层各下探 2 层（覆盖兄弟目录）',
  (SI.roots || []).slice(1).every((root) => root.depth === 2), JSON.stringify((SI.roots || []).slice(1)));
check('全部根都是自动派生（auto=true）',
  (SI.roots || []).every((root) => root.auto === true), JSON.stringify(SI.roots));
check('一次补齐就把 4 个依赖跨目录读进来（同目录/父目录兄弟/祖父目录子树/内容兜底）',
  same(SI.loaded, ['sub.sv', 'odd_name.sv', 'leaf.sv', 'std_cell.sv']), JSON.stringify(SI.loaded));
check('补齐走的是「源码搜索根」通道', SI.via === 'roots', String(SI.via));
check('补齐后缺口清空', same(SI.missing, []), JSON.stringify(SI.missing));
check('无关模块 unrelated 没有被读入',
  !(SI.names || []).some((name) => /unrelated/i.test(name)), JSON.stringify(SI.names));
check('全程没有弹出任何文件夹选择框（用户口径：不需要再手动选文件夹）', SI.pickerCalls === 0, String(SI.pickerCalls));
check('自动补齐不抢占当前活动标签', SI.activeSame === true, String(SI.activeSame));
check('缺口闭合 → 「自动补齐」按钮自动消失', SI.fillVisible === false, String(SI.fillVisible));
check('日志流给出「源码搜索根」+「依赖自动补齐」', SI.logAuto === true && SI.logRoots === true,
  JSON.stringify({ auto: SI.logAuto, roots: SI.logRoots }));

// ─────────────────────────── 6. 「自动补齐」按钮生命周期（＋ 右侧 · 缺口出现 · 点一次就消失）
// 用户本轮口径：按钮放在标签条「＋」右边、文案缩短成「自动补齐」、点一次就消失；
// 补齐来源优先「搜索根」（服务在线时零手势、零弹框），没有根时才用 api/pick 弹一次
// **原生**文件夹对话框（不受瞬时手势限制）—— 这就是「std 可能在别的文件夹」的入口。
const buttonLife = await ev(`(async () => {
  const sim = window.__wpsim;
  const stub = window.__fsStub;
  sim.setSourceDirHandle(null);
  sim.resetAutoScanDecline();
  sim.resetDepSearchRoots();
  sim.setSourceFiles([{ name: 'only_top2.sv', content: 'module only_top2;\\n  nope u_n();\\nendmodule\\n' }]);
  await new Promise((r) => setTimeout(r, 300));
  sim.syncDepFillButton([]);
  const hiddenWithoutGap = !sim.depFillVisible;
  sim.syncDepFillButton();                    // 不传参 = 按当前缺口现算
  const el = document.getElementById('sim-depfill');
  const afterAdd = el && el.previousElementSibling ? el.previousElementSibling.id : null;
  const label = el ? el.textContent.trim() : null;
  const visibleWithGap = sim.depFillVisible;
  let pickerCalls = 0;
  const original = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => { pickerCalls += 1; throw new Error('不该被调用'); };
  stub.pickPaths = [stub.stdDir];
  el.click();                                 // 真实点击
  const hiddenOnClick = !sim.depFillVisible;  // 「点一次就消失」
  await new Promise((r) => setTimeout(r, 1500));
  window.showDirectoryPicker = original;
  const logText = document.getElementById('sim-console-log').textContent || '';
  return JSON.stringify({
    hiddenWithoutGap: hiddenWithoutGap, visibleWithGap: visibleWithGap, label: label, afterAdd: afterAdd,
    hiddenOnClick: hiddenOnClick, pickerCalls: pickerCalls, roots: sim.depSearchRoots.map((r) => r.path),
    names: sim.sourceFiles.map((f) => f.name), unresolved: sim.missingDependencyModules('only_top2'),
    fillVisible: sim.depFillVisible, logAdded: logText.indexOf('加入源码搜索根') >= 0,
    logAuto: logText.indexOf('依赖自动补齐') >= 0
  });
})()`);
console.log('\n=== 6. 「自动补齐」按钮生命周期 ===');
console.log(buttonLife);
let B = {};
try { B = JSON.parse(buttonLife); } catch (e) { console.log('解析失败', e); }
check('无缺口时按钮隐藏', B.hiddenWithoutGap === true, String(B.hiddenWithoutGap));
check('出现缺口时按钮显示', B.visibleWithGap === true, String(B.visibleWithGap));
check('按钮文案缩短为「自动补齐」', B.label === '自动补齐', JSON.stringify(B.label));
check('按钮位置紧跟「＋」之后（nextElementSibling）', B.afterAdd === 'sim-addfile', String(B.afterAdd));
check('点一次按钮立刻消失（不等补齐结束）', B.hiddenOnClick === true, String(B.hiddenOnClick));
check('补全过程不依赖 FSA showDirectoryPicker（零手势弹框）', B.pickerCalls === 0, String(B.pickerCalls));
check('用户选中的「std 独立目录」被登记为手工搜索根', (B.roots || []).indexOf('D:/vp2/std') >= 0, JSON.stringify(B.roots));
check('补齐后 nope.v 已读入且缺口清空',
  (B.names || []).indexOf('nope.v') >= 0 && same(B.unresolved, []),
  JSON.stringify({ names: B.names, unresolved: B.unresolved }));
check('缺口闭合后按钮保持隐藏', B.fillVisible === false, String(B.fillVisible));
check('日志流写「加入源码搜索根」+「依赖自动补齐」', B.logAdded === true && B.logAuto === true,
  JSON.stringify({ added: B.logAdded, auto: B.logAuto }));

// ─────────────────────────── 7. 搜索根派生的默认值（本级 depth 6 + 往上 3 层 depth 2）
// 用户点名：「默认情况下，打开的 top 文件夹及其同文件夹，并往上遍历 3 层」。
const derive = await ev(`(async () => {
  const sim = window.__wpsim;
  const BS = String.fromCharCode(92);
  const base = 'D:' + BS + 'vp' + BS + 'proj' + BS + 'rtl' + BS + 'core';
  sim.resetDepSearchRoots();
  const roots = sim.notePickedSourcePaths([base + BS + 'top_mod.sv'])
    .map((root) => ({ path: root.path, depth: root.depth, auto: root.auto }));
  sim.resetDepSearchRoots();
  const drive = sim.notePickedSourcePaths(['D:' + BS + 'Top.sv'])
    .map((root) => ({ path: root.path, depth: root.depth }));
  sim.resetDepSearchRoots();
  sim.addDepSearchRoot('D:' + BS + 'std' + BS + 'cells');
  const added = sim.depSearchRoots.map((root) => ({ path: root.path, depth: root.depth, auto: root.auto }));
  sim.removeDepSearchRootAt(0);
  const afterRemove = sim.depSearchRoots.length;
  sim.resetDepSearchRoots();
  const afterReset = sim.depSearchRoots.length;
  sim.setDepSearchRoots([]);
  return JSON.stringify({ roots: roots, drive: drive, added: added, afterRemove: afterRemove, afterReset: afterReset });
})()`);
console.log('\n=== 7. 搜索根派生默认值 ===');
console.log(derive);
let DR = {};
try { DR = JSON.parse(derive); } catch (e) { console.log('解析失败', e); }
const BS = String.fromCharCode(92);
check('默认根顺序 = 本级 → 父 → 祖父 → 曾祖父（含同文件夹的兄弟目录）',
  JSON.stringify((DR.roots || []).map((root) => root.path)) === JSON.stringify([
    'D:' + BS + 'vp' + BS + 'proj' + BS + 'rtl' + BS + 'core',
    'D:' + BS + 'vp' + BS + 'proj' + BS + 'rtl',
    'D:' + BS + 'vp' + BS + 'proj',
    'D:' + BS + 'vp'
  ]), JSON.stringify((DR.roots || []).map((root) => root.path)));
check('深度 = [6, 2, 2, 2]（本级递归到底，上溯层覆盖兄弟目录）',
  JSON.stringify((DR.roots || []).map((root) => root.depth)) === JSON.stringify([6, 2, 2, 2]),
  JSON.stringify((DR.roots || []).map((root) => root.depth)));
check('顶层直接躺在盘符根时：只下探 1 层（避免整盘扫描 / 命中别的工程）',
  (DR.drive || []).length === 1 && DR.drive[0].depth === 1, JSON.stringify(DR.drive));
check('手工添加的搜索根标记为 auto=false（设置面板里可单独移除）',
  DR.added && DR.added.length === 1 && DR.added[0].auto === false
    && DR.added[0].path === 'D:' + BS + 'std' + BS + 'cells', JSON.stringify(DR.added));
check('removeDepSearchRootAt / resetDepSearchRoots 都能把根清空',
  DR.afterRemove === 0 && DR.afterReset === 0, JSON.stringify({ remove: DR.afterRemove, reset: DR.afterReset }));

// ─────────────────────────── 8. 端到端：标签条「＋」打开顶层 → 自动派生搜索根 → 静默补齐
// 这正是用户本轮要的那一步：「自动加信号的逻辑不需要再手动去选文件夹」——
// 打开一个顶层文件就够了，依赖在同目录 / 兄弟目录 / 上层目录里都能自己找出来。
const importFlow = await ev(`(async () => {
  const sim = window.__wpsim;
  const stub = window.__fsStub;
  sim.setSourceDirHandle(null);
  sim.resetAutoScanDecline();
  sim.resetDepSearchRoots();
  sim.setSourceFiles([{ name: 'placeholder.sv', content: 'module placeholder;\\nendmodule\\n' }]);
  await new Promise((r) => setTimeout(r, 300));
  stub.pickPaths = [stub.topPath];
  let pickerCalls = 0;
  const original = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => { pickerCalls += 1; throw new Error('不该被调用'); };
  await sim.importSourceFiles();
  const rootsRightAfter = sim.depSearchRoots.length;
  await new Promise((r) => setTimeout(r, 2000));
  window.showDirectoryPicker = original;
  const logText = document.getElementById('sim-console-log').textContent || '';
  return JSON.stringify({
    pickerCalls: pickerCalls, rootsRightAfter: rootsRightAfter,
    names: sim.sourceFiles.map((f) => f.name), missing: sim.missingDependencyModules('top_mod'),
    fillVisible: sim.depFillVisible, logAuto: logText.indexOf('依赖自动补齐') >= 0
  });
})()`);
console.log('\n=== 8. 端到端：＋ 打开顶层 → 自动补齐依赖 ===');
console.log(importFlow);
let IF = {};
try { IF = JSON.parse(importFlow); } catch (e) { console.log('解析失败', e); }
check('导入顶层文件后立即派生出 4 个搜索根', IF.rootsRightAfter === 4, String(IF.rootsRightAfter));
check('导入走的是原生「打开文件」对话框，没有弹文件夹选择框', IF.pickerCalls === 0, String(IF.pickerCalls));
check('顶层 + 4 个依赖文件全部就位（跨目录自动读入）',
  ['top_mod.sv', 'sub.sv', 'odd_name.sv', 'leaf.sv', 'std_cell.sv']
    .every((name) => (IF.names || []).indexOf(name) >= 0), JSON.stringify(IF.names));
check('导入后缺口自动闭合', same(IF.missing, []), JSON.stringify(IF.missing));
check('缺口闭合 → 按钮保持隐藏', IF.fillVisible === false, String(IF.fillVisible));
check('日志流给出「依赖自动补齐」', IF.logAuto === true, String(IF.logAuto));
console.log('\n=== 运行期异常 ===');
console.log(errors.length ? errors.join('\n') : '（无）');
check('运行期无未捕获异常', errors.length === 0, String(errors.length));

console.log('\n结果：' + (fails ? fails + ' 项 FAIL' : '全部 PASS'));
try { ws.close(); } catch (e) {}
server.kill();
process.exit(fails ? 1 : 0);
