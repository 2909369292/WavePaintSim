// ============================================================================
// WavePaintClean tools/exe-smoke.mjs —— 构建产物冒烟（真实 exe + 真实 Edge）
// ----------------------------------------------------------------------------
// 前提：先启动 WavePaintClean.exe（会向 %TEMP% 写 WavePaintClean_port_*.txt），
// 本脚本读取最新端口文件并连上页面，验证核心弹窗汉化（wpText）与控制台无异常。
// 用法：
//   1. 删除旧端口文件 → 启动 WavePaintClean.exe → 等 ~10s
//   2. node tools/exe-smoke.mjs
// ⚠ 判断「exe 是否真包含新代码」还得配合 grep 内嵌标记（见 memory/02-WORKFLOW.md 验证门槛）。
// ⚠ Edge profile / 系统 TEMP 走 D 盘 .e2e-tmp：headless Edge 组件更新器会往 C 盘写
//   msedge_url_fetcher_*（150MB+），C 盘曾被写满 0GB。禁组件更新 + TEMP 重定向。
// ⚠ 每次运行用「唯一新 profile」（沙箱拦截 node 里递归删大目录；新 profile 天然无旧缓存）。
// ============================================================================
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const e2eRoot = 'D:/Files/Code/波形/.e2e-tmp';
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(sysTmp, { recursive: true });
await sleep(5000);
const port = await (async () => {
  // 读取最新端口文件
  const { execSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const dir = 'C:/Users/Admin/AppData/Local/Temp';
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('WavePaintClean_port_'));
  files.sort();
  const latest = files[files.length - 1];
  return fs.readFileSync(dir + '/' + latest, 'utf8').trim();
})();
console.log('端口:', port);
const edgeProfile = e2eRoot + '/edge-exe-zh-' + Date.now();
const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate', '--remote-debugging-port=9505', '--user-data-dir=' + edgeProfile, '--no-first-run', 'http://127.0.0.1:' + port + '/index.html'], { stdio: 'ignore', env: edgeEnv });
let t = null;
for (let i = 0; i < 24; i++) {
  await sleep(500);
  try {
    const t0 = await (await fetch('http://127.0.0.1:9505/json')).json();
    t = t0.find((x) => x.type === 'page' && x.url.includes('index.html'));
    if (t) break;
  } catch (e) { /* retry */ }
}
if (!t) { console.log('页面未找到'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const p = new Map();
await new Promise((r) => ws.addEventListener('open', r));
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || '').slice(0, 150);
  return r.result ? r.result.result.value : undefined;
};
const errors = [];
ws.addEventListener('message', (ev2) => { try { const m = JSON.parse(ev2.data); if (m.method === 'Runtime.exceptionThrown') errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 120)); } catch (e) { /* ignore */ } });
await sleep(3500);
console.log('全局:', await ev(`JSON.stringify({ core: typeof __core, wpf: typeof __wpf, doc: typeof document_wave, canvas: !!document.getElementById('wave-canvas'), zh: !!document.getElementById('wp-modal-overlay') })`));
// wpText 弹窗翻译
await ev(`(() => { wpPrompt('Clock name:', 'clk', 'Add Clock Signal'); return 1; })()`);
await sleep(300);
console.log('弹窗标题:', await ev(`document.getElementById('wp-modal-title').textContent`));
console.log('弹窗消息:', await ev(`document.getElementById('wp-modal-message').textContent`));
console.log('OK:', await ev(`document.getElementById('wp-modal-ok').textContent`));
await ev(`document.getElementById('wp-modal-ok').click()`);
await sleep(150);
console.log('异常:', errors.length === 0 ? '无' : errors.join('|'));
process.exit(errors.length ? 1 : 0);
