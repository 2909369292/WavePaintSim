// ============================================================================
// WavePaintClean tools/fs-api-probe.mjs —— 本地读盘通道（api/fs + api/pick）真机覆盖
// ----------------------------------------------------------------------------
// 第 54 轮 #124 的用户口径是「自动加信号的逻辑不需要再手动去选文件夹」，实现靠本地
// 服务直接读盘（绝对路径）。dev-server 没有这条路由 ⇒ dep-probe.mjs 只能用 fetch 替身
// 覆盖前端逻辑；**C# 那一侧（路由 / 安全闸门 / 白名单 / 递归索引 / 8MB 上限）必须跑真
// exe**，就是本文件。
//
// 前提：先启动 WavePaintClean.exe（会向 %TEMP% 写 WavePaintClean_port_*.txt）。
// 用法：node tools/fs-api-probe.mjs
// 产物：控制台 PASS/FAIL 明细 + 磁盘夹具 .e2e-tmp/fs-fixture/（真实 HDL 目录树）
//
// ⚠ 不调用 op=pick 的**成功**分支：那会在用户桌面上弹出真实的 WinForms 模态框并挂住
//   自动化。对话框是否被接线由「缺 X-WavePaint-Fs 头 → 403」间接证明（闸门在弹框之前）。
// ⚠ Edge profile / 系统 TEMP 一律重定向到 D 盘 .e2e-tmp（headless 组件更新器会往 C 盘
//   写 150MB+，C 盘曾被写满）。
// ============================================================================
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync, readFileSync, rmSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const e2eRoot = 'D:/Files/Code/波形/.e2e-tmp';
const sysTmp = e2eRoot + '/system-tmp';
const FIX = e2eRoot + '/fs-fixture';
mkdirSync(sysTmp, { recursive: true });

let fails = 0;
function check(name, ok, detail) {
  if (!ok) fails++;
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail !== undefined ? '  → ' + detail : ''));
}

// ─────────────────────────── 0. 磁盘夹具：一棵真实的 HDL 目录树
// proj/rtl/core 是顶层所在目录（本级 depth 6）；上溯 3 层 = rtl / proj / fs-fixture。
//   · sub.sv      同目录 → 文件名约定命中
//   · odd_name.sv 同目录，文件名与模块名不符 → 内容兜底命中（定义 module weird）
//   · lib/leaf.sv（proj/rtl/lib）     父目录的兄弟子目录 → 递归索引（depth 2）
//   · lib/std_cell.sv（fs-fixture/lib）曾祖父目录下的子树 → 递归索引（depth 2）
//   · proj/vendor/unrelated.v         与顶层无关 → 不该被读入
const spec = {
  'proj/rtl/core/top_mod.sv': 'module top_mod;\n  sub u_sub();\n  weird u_w();\nendmodule\n',
  'proj/rtl/core/sub.sv': 'module sub;\n  leaf u_leaf();\nendmodule\n',
  'proj/rtl/core/odd_name.sv': 'module weird;\nendmodule\n',
  'proj/rtl/lib/leaf.sv': 'module leaf;\n  std_cell u_s();\nendmodule\n',
  'proj/vendor/unrelated.v': 'module unrelated;\nendmodule\n',
  'lib/std_cell.sv': 'module std_cell;\nendmodule\n'
};
rmSync(FIX, { recursive: true, force: true });
for (const rel of Object.keys(spec)) {
  const parts = rel.split('/');
  const dir = [FIX, ...parts.slice(0, -1)].join('/');
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + '/' + parts[parts.length - 1], spec[rel], 'utf8');
}
// 8MB 上限用例：9MB 的 .txt（在白名单里，所以被拒的理由只会是「超上限」）
writeFileSync(FIX + '/huge.txt', 'x'.repeat(9 * 1024 * 1024), 'utf8');
const TOP = FIX + '/proj/rtl/core/top_mod.sv';
console.log('夹具:', FIX);

// ─────────────────────────── 1. 连上真实 exe 的页面
const TMP_DIR = 'C:/Users/Admin/AppData/Local/Temp';
const portFile = readdirSync(TMP_DIR).filter((f) => f.startsWith('WavePaintClean_port_'))
  .sort((a, b) => statSync(TMP_DIR + '/' + b).mtimeMs - statSync(TMP_DIR + '/' + a).mtimeMs)[0];
if (!portFile) { console.log('未找到端口文件 —— 请先启动 WavePaintClean.exe'); process.exit(1); }
const port = readFileSync(TMP_DIR + '/' + portFile, 'utf8').trim();
console.log('端口:', port);

const edgeProfile = e2eRoot + '/edge-fs-' + Date.now();
const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
  '--remote-debugging-port=9506', '--user-data-dir=' + edgeProfile, '--no-first-run',
  '--window-size=1680,1000', 'http://127.0.0.1:' + port + '/index.html'
], { stdio: 'ignore', env: edgeEnv });

let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const list = await (await fetch('http://127.0.0.1:9506/json')).json();
    target = list.find((x) => x.type === 'page' && x.url.includes('index.html'));
    if (target) break;
  } catch (e) { /* retry */ }
}
if (!target) { console.log('页面未找到'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener('open', r));
ws.addEventListener('message', (msg) => {
  const m = JSON.parse(msg.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => {
  const i = ++id;
  pending.set(i, r);
  ws.send(JSON.stringify({ id: i, method, params }));
});
const errors = [];
ws.addEventListener('message', (msg) => {
  try {
    const m = JSON.parse(msg.data);
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 140));
    }
  } catch (e) { /* ignore */ }
});
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) {
    return 'THROW:' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || '').slice(0, 200);
  }
  return r.result ? r.result.result.value : undefined;
};
await sleep(3500);

// 页面里用同一套相对 URL + 闸门头（与 js/sim/ui-bridge.js 的 fsApiUrl 对齐）
const fsCall = (query, withTag) => ev(`(async () => {
  const headers = ${withTag ? `{ 'X-WavePaint-Fs': '1' }` : '{}'};
  const res = await fetch('api/fs?${query}', { headers: headers, cache: 'no-store' });
  const text = await res.text();
  return JSON.stringify({ status: res.status, head: text.slice(0, 160), len: text.length });
})()`);
// ─────────────────────────── 2. 探活 + 安全闸门
console.log('\n=== 2. 探活 / 安全闸门 ===');
check('页面就是本应用提供的（window.__wpsim 存在）', (await ev('typeof window.__wpsim')) === 'object');
check('本地读盘通道探活成功（fsApiReady）', (await ev('window.__wpsim.fsApiReady()')) === true);
const probe = JSON.parse(await fsCall('op=probe', true));
check('op=probe 回 WAVEPAINT-FS 标识', probe.status === 200 && probe.head.indexOf('WAVEPAINT-FS') === 0, probe.head.split('\n')[0]);
const noTag = JSON.parse(await fsCall('op=probe', false));
check('缺 X-WavePaint-Fs 头 → 403（别的网页 / 别的程序读不了盘）', noTag.status === 403, String(noTag.status));
const noTagPick = JSON.parse(await fsCall('op=pick&mode=file', false));
check('api/pick 同样受闸门保护（缺头 → 403，闸门在弹框之前）', noTagPick.status === 403, String(noTagPick.status));

// ─────────────────────────── 3. op=list / op=index（目录枚举 + 递归索引）
console.log('\n=== 3. op=list / op=index ===');
const listRoot = JSON.parse((await ev(`(async () => {
  const res = await fetch('api/fs?op=list&path=' + encodeURIComponent(${JSON.stringify('D:/Files/Code/波形')}),
    { headers: { 'X-WavePaint-Fs': '1' }, cache: 'no-store' });
  return await res.text();
})()`)));
check('op=list 枚举真实工程目录', listRoot.ok === true && Array.isArray(listRoot.entries), listRoot.error || '');
check('op=list 结果含 index.html（dir=false）',
  (listRoot.entries || []).some((e) => e.name === 'index.html' && e.dir === false),
  JSON.stringify((listRoot.entries || []).slice(0, 4)));
check('op=list 结果含 tools（dir=true）',
  (listRoot.entries || []).some((e) => e.name === 'tools' && e.dir === true));

const idx = async (dir, depth, max) => JSON.parse(await ev(`(async () => {
  const res = await fetch('api/fs?op=index&depth=${depth}&max=${max}&path=' + encodeURIComponent(${JSON.stringify(dir)}),
    { headers: { 'X-WavePaint-Fs': '1' }, cache: 'no-store' });
  return await res.text();
})()`));
const d1 = await idx(FIX, 1, 400);
const d1names = (d1.files || []).map((f) => String(f.rel).replace(/\\/g, '/'));
check('op=index depth=1 → 只到一层子目录（含 lib/std_cell.sv）',
  d1.ok === true && d1names.join('|').indexOf('lib/std_cell.sv') >= 0, JSON.stringify(d1names));
check('op=index depth=1 → 深层文件未被收（不含 proj/rtl/core/sub.sv）',
  !d1names.some((rel) => rel.indexOf('core') >= 0), JSON.stringify(d1names));
const d4 = await idx(FIX, 4, 400);
const d4names = (d4.files || []).map((f) => String(f.rel).replace(/\\/g, '/'));
check('op=index depth=4 → 收齐 HDL 文件（含 proj/rtl/core/sub.sv）',
  d4names.some((rel) => rel.indexOf('core') >= 0 && rel.slice(-6) === 'sub.sv'), JSON.stringify(d4names));
check('op=index 只收 HDL 扩展名（huge.txt 不在索引里）',
  !d4names.some((rel) => /\.txt$/i.test(rel)), JSON.stringify(d4names));
check('op=index 每条带 name/path/rel，path 是绝对路径',
  (d4.files || []).every((f) => f.name && f.path && typeof f.rel === 'string' && /^[a-zA-Z]:[\\/]/.test(f.path)));
const dTrunc = await idx(FIX, 6, 2);
check('op=index 受 max 限制并回报 truncated（护栏：误选巨目录不会拖死）',
  dTrunc.truncated === true && (dTrunc.files || []).length <= 2, JSON.stringify({ n: (dTrunc.files || []).length, t: dTrunc.truncated }));

// ─────────────────────────── 4. op=read（白名单 / 上限 / 缺文件）
console.log('\n=== 4. op=read ===');
const readOk = JSON.parse(await fsCall('op=read&path=' + encodeURIComponent(TOP), true));
check('op=read 读 HDL 源码成功', readOk.status === 200 && readOk.head.indexOf('module top_mod') >= 0, String(readOk.status));
const readExe = JSON.parse(await fsCall('op=read&path=' + encodeURIComponent('D:/Files/Code/波形/WavePaintClean.exe'), true));
check('op=read 拒绝二进制 / 可执行文件（400）', readExe.status === 400, String(readExe.status));
const readHuge = JSON.parse(await fsCall('op=read&path=' + encodeURIComponent(FIX + '/huge.txt'), true));
check('op=read 拒绝 > 8MB 的文件（400）', readHuge.status === 400, readHuge.head.slice(0, 80));
const readMiss = JSON.parse(await fsCall('op=read&path=' + encodeURIComponent(FIX + '/proj/rtl/core/nope.sv'), true));
check('op=read 文件不存在 → 404（前端按「未命中」继续试下一个根）', readMiss.status === 404, String(readMiss.status));
const readRel = JSON.parse(await fsCall('op=read&path=' + encodeURIComponent('proj/rtl/core/sub.sv'), true));
check('op=read 拒绝相对路径（400，必须绝对路径）', readRel.status === 400, String(readRel.status));

// ─────────────────────────── 5. 端到端：真盘读取补齐依赖（零弹框）
console.log('\n=== 5. 端到端：真盘读取补齐依赖 ===');
const e2e = JSON.parse(await ev(`(async () => {
  const sim = window.__wpsim;
  sim.resetDepSearchRoots();
  sim.resetAutoScanDecline();
  sim.setSourceDirHandle(null);
  sim.setSourceFiles([{ name: 'top_mod.sv', content: ${JSON.stringify(spec['proj/rtl/core/top_mod.sv'])} }]);
  await new Promise((r) => setTimeout(r, 200));
  let pickerCalls = 0;
  const original = window.showDirectoryPicker;
  window.showDirectoryPicker = async () => { pickerCalls += 1; throw new Error('不该被调用'); };
  const derived = sim.notePickedSourcePaths([${JSON.stringify(TOP)}]);
  const result = await sim.resolveMissingDependencies();
  window.showDirectoryPicker = original;
  const names = sim.sourceFiles.map((f) => f.name);
  return JSON.stringify({
    roots: derived.map((r) => r.path), depths: derived.map((r) => r.depth),
    loaded: result.loaded, via: result.via, pickerCalls: pickerCalls, names: names,
    missing: sim.missingDependencyModules('top_mod'), fillVisible: sim.depFillVisible
  });
})()`));
console.log(JSON.stringify(e2e));
check('真盘路径派生 4 个搜索根（本级 + 往上 3 层）', (e2e.roots || []).length === 4, JSON.stringify(e2e.roots));
check('深度 = [6,2,2,2]', JSON.stringify(e2e.depths) === JSON.stringify([6, 2, 2, 2]), JSON.stringify(e2e.depths));
check('跨目录读入 4 个依赖（同目录 / 兄弟子树 / 曾祖父子树 / 内容兜底）',
  JSON.stringify([...(e2e.loaded || [])].sort()) === JSON.stringify(['leaf.sv', 'odd_name.sv', 'std_cell.sv', 'sub.sv']),
  JSON.stringify(e2e.loaded));
check('走的是源码搜索根通道', e2e.via === 'roots', String(e2e.via));
check('补齐后缺口清空', JSON.stringify(e2e.missing) === '[]', JSON.stringify(e2e.missing));
check('无关模块 unrelated 没有被读入', !(e2e.names || []).some((n) => /unrelated/i.test(n)), JSON.stringify(e2e.names));
check('全程零弹框（用户口径：不需要再手动选文件夹）', e2e.pickerCalls === 0, String(e2e.pickerCalls));
check('缺口闭合 → 「自动补齐」按钮隐藏', e2e.fillVisible === false, String(e2e.fillVisible));

// ─────────────────────────── 6. 运行期异常
console.log('\n=== 6. 运行期异常 ===');
console.log(errors.length ? errors.join('\n') : '（无）');
check('运行期无未捕获异常', errors.length === 0, String(errors.length));

console.log('\n结果：' + (fails ? fails + ' 项 FAIL' : '全部 PASS'));
try { ws.close(); } catch (e) { /* ignore */ }
process.exit(fails ? 1 : 0);
