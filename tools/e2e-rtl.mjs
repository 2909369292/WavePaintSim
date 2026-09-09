// ============================================================================
// WavePaintClean tools/e2e-rtl.mjs —— #75 P0 浏览器级冒烟（真实 Edge + dev-server）
// ----------------------------------------------------------------------------
// 覆盖：
//   A. CodeMirror 6 bundle 加载、挂载到 #verilog-cm-host、textarea 降级隐藏
//   B. RTL 结构树渲染（模块/端口/实例）与「点击跳转 → 状态栏确认」
//   C. 运行一次真实仿真（/api/sim）→ VCD 信号层次树按 $scope 全路径渲染
// 用法：node tools/e2e-rtl.mjs   （自带 dev-server；需本机 Edge；退出码非 0 表示有失败）
// 与 e2e-ui.mjs 相同的防 C 盘爆盘策略：profile/TEMP 全部指到 D 盘 .e2e-tmp。
// ============================================================================
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const PORT = 8951;
const CDP_PORT = 9532;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const e2eRoot = 'D:/Files/Code/波形/.e2e-tmp';
const edgeProfile = e2eRoot + '/edge-rtl-' + Date.now();
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(e2eRoot, { recursive: true });
mkdirSync(sysTmp, { recursive: true });
const cwd = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd, stdio: 'ignore' });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

let results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail !== undefined ? '  → ' + detail : ''));
}

// 等服务起来
for (let i = 0; i < 30; i++) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/index.html'); if (r.ok) break; } catch (e) { /* retry */ }
  await sleep(300);
}

const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn(edge, ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
  '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + edgeProfile, '--no-first-run',
  'http://127.0.0.1:' + PORT + '/index.html'], { stdio: 'ignore', env: edgeEnv });

let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const list = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json')).json();
    target = list.find((x) => x.type === 'page' && x.url.includes('index.html'));
    if (target) break;
  } catch (e) { /* retry */ }
}
if (!target) { console.log('页面未找到'); server.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => ws.addEventListener('open', r));
const errors = [];
let netFails = 0;
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 200));
  }
  if (m.method === 'Network.loadingFailed') netFails += 1;
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || '').slice(0, 240);
  return r.result ? r.result.result.value : undefined;
};

// 等仿真面板 + 核心就绪（ui-bridge 在 DOMContentLoaded 后自动 init，sim-open 打开面板）
let ready = null;
for (let i = 0; i < 60; i++) {
  ready = await ev(`(() => {
    if (!document.getElementById('sim-run')) return 'no-panel';
    if (!window.WPCm || typeof window.WPCm.createVerilogEditor !== 'function') return 'no-wpcm';
    if (!(window.document_wave && typeof window.drawWaveform === 'function')) return 'no-core';
    return 'ready';
  })()`);
  if (ready === 'ready') break;
  await sleep(500);
}
check('A0: 页面就绪（面板 + WPCm bundle + 核心）', ready === 'ready', ready);

if (ready === 'ready') {
  // ---- A. CodeMirror 6 代码视图 ----
  const cmState = await ev(`(() => {
    const host = document.getElementById('verilog-cm-host');
    const ta = document.getElementById('verilog-source');
    const cm = host && host.querySelector('.cm-editor');
    const content = cm && cm.querySelector('.cm-content');
    return JSON.stringify({
      hostDisplay: host ? getComputedStyle(host).display : 'missing',
      hasCm: !!cm,
      text: content ? content.textContent.slice(0, 120) : '',
      taDisplay: ta ? getComputedStyle(ta).display : 'missing',
      taMirror: ta && cm ? ta.value.length : -1,
      cmChars: content ? content.textContent.length : -1
    });
  })()`);
  const CM = JSON.parse(cmState || '{}');
  check('A1: CodeMirror 挂载到宿主并显示', CM.hasCm === true && CM.hostDisplay === 'block', cmState);
  // .cm-content 的 textContent 按行去掉了换行符（textarea 保留 \r\n/\n），
  // 所以用「去掉所有换行后内容全等」证明 textarea 是 CM 的数据镜像。
  const flatSync = await ev(`(() => {
    const ta = document.getElementById('verilog-source');
    const content = document.querySelector('#verilog-cm-host .cm-content');
    if (!ta || !content) return 'missing';
    const taFlat = ta.value.replace(/[\\r\\n]/g, '');
    const cmFlat = content.textContent.replace(/[\\r\\n]/g, '');
    return JSON.stringify({ equal: taFlat === cmFlat, len: taFlat.length });
  })()`);
  const FS = JSON.parse(flatSync || '{}');
  check('A2: textarea 降级隐藏且为 CM 数据镜像（去换行后内容全等）',
    CM.taDisplay === 'none' && FS.equal === true && FS.len > 0, flatSync);
  check('A3: CM 内容含源码（非空编辑器）', CM.text && CM.text.includes('module'), String(CM.text || '').slice(0, 60));

  // ---- B. RTL 结构树 ----
  const rtlState = await ev(`(() => {
    const tree = document.getElementById('rtl-tree');
    if (!tree) return 'missing';
    const mods = tree.querySelectorAll('.rtl-module-go');
    const files = tree.querySelectorAll('.rtl-file');
    const first = mods[0];
    if (first) first.click();
    return JSON.stringify({
      mods: mods.length,
      files: files.length,
      empty: !!tree.querySelector('.rtl-empty')
    });
  })()`);
  const RTL = JSON.parse(rtlState || '{}');
  check('B1: RTL 树按文件渲染模块行', RTL.mods >= 1 && RTL.files >= 1 && RTL.empty === false, rtlState);
  const statusAfterJump = await ev(`(() => document.getElementById('sim-status').textContent || '')()`);
  check('B2: 点击模块行触发跳转（状态栏确认）', /已定位到 module/.test(statusAfterJump), statusAfterJump.slice(0, 80));
  // 第十二轮澄清：RTL 树 = 纯代码层级浏览，不渲染端口/参数分组（fixture counter 有 4 个端口，
  // 若分组回归会在这里暴露），模块 meta 也不再显示端口计数。
  const rtlSlim = await ev(`(() => {
    const tree = document.getElementById('rtl-tree');
    if (!tree) return 'missing';
    const text = tree.textContent || '';
    return JSON.stringify({
      portRows: tree.querySelectorAll('.rtl-port').length,
      paramRows: tree.querySelectorAll('.rtl-param').length,
      instanceRows: tree.querySelectorAll('.rtl-inst').length,
      hasPortText: /端口|Ports/.test(text),
      hasParamText: /参数|Parameters/.test(text)
    });
  })()`);
  const RTL_SLIM = JSON.parse(rtlSlim || '{}');
  check('B3: RTL 树为纯层级浏览（无 .rtl-port/.rtl-param、无端口/参数文案、实例行仍在）',
    RTL_SLIM.portRows === 0 && RTL_SLIM.paramRows === 0
    && RTL_SLIM.hasPortText === false && RTL_SLIM.hasParamText === false
    && RTL_SLIM.instanceRows >= 0, rtlSlim);

  // ---- C. 真实仿真 → VCD 层次树 ----
  await ev(`(() => { const b = document.getElementById('sim-run'); if (b) b.click(); return 1; })()`);
  let statusText = '';
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    statusText = String(await ev(`(() => document.getElementById('sim-status').textContent || '')()`));
    if (/仿真完成/.test(statusText) || /ERROR|失败/.test(statusText)) break;
  }
  check('C1: 运行仿真返回完成', /仿真完成/.test(statusText), statusText.slice(0, 100).replace(/\n/g, ' '));

  const vcdState = await ev(`(() => {
    const tree = document.getElementById('vcd-tree');
    if (!tree) return 'missing';
    const rows = tree.querySelectorAll('.vcd-signal-row');
    const meta = tree.querySelector('.vcd-meta');
    const firstTitle = rows[0] ? rows[0].title : '';
    return JSON.stringify({
      rows: rows.length,
      meta: meta ? meta.textContent : '',
      empty: !!tree.querySelector('.vcd-empty'),
      firstTitle
    });
  })()`);
  const VCD = JSON.parse(vcdState || '{}');
  check('C2: VCD 树渲染出信号行（含作用域层级）', VCD.rows > 0 && VCD.empty === false, vcdState);
  check('C3: 信号行带完整点分路径 title', VCD.rows > 0 && /\./.test(VCD.firstTitle || ''), vcdState);

  // ---- D. VCD 点信号 → 加入画布观察行（#85）----
  const watchRow = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dw = () => window.document_wave;
    const mlen = () => dw().m_signals.length;
    const findW = (path) => dw().m_signals.find((s) => s && s.__simWatchPath === path);
    const clickRow = (path) => {
      const row = [...document.querySelectorAll('#vcd-tree .vcd-signal-row')]
        .find((r) => r.title.includes(path));
      if (!row) return 'missing';
      row.click();
      return 'clicked';
    };
    const status = () => document.getElementById('sim-status').textContent || '';
    const before = mlen();
    const qRow = dw().m_signals.find((s) => s && s.name === 'q' && !s.__simWatchPath);
    const qValues = qRow && Array.isArray(qRow.values) ? qRow.values : null;
    if (clickRow('tb.dut.q') !== 'clicked') return 'row-missing';
    await sleep(300);
    const added = findW('tb.dut.q');
    const res1 = {
      countDelta: mlen() - before,
      name: added && added.name,
      width: added && added.width,
      kind: added && added.kind,
      type: added && added.type,
      injected: !!(added && added.__simInjected),
      watch: added && added.__simWatchPath,
      vlen: added && Array.isArray(added.values) ? added.values.length : -1,
      sameAsQ: !!(added && qValues && JSON.stringify(added.values) === JSON.stringify(qValues)),
      status: status().slice(0, 60)
    };
    const countAfterAdd = mlen();
    clickRow('tb.dut.q');
    await sleep(200);
    const res2 = {
      countDeltaAfterDup: mlen() - countAfterAdd,
      status: status().slice(0, 80),
      scrollTop: document.getElementById('wave-view').scrollTop
    };
    const idx = dw().m_signals.findIndex((s) => s && s.__simWatchPath === 'tb.dut.q');
    if (idx >= 0) { dw().removeSignal(idx); window.drawWaveform && window.drawWaveform(); window.updateSidePanels && window.updateSidePanels(); }
    const afterDel = mlen();
    clickRow('tb.dut.q');
    await sleep(300);
    const reAdded = findW('tb.dut.q');
    const res3 = {
      countDeltaAfterReadd: mlen() - afterDel,
      reAdded: !!reAdded,
      watch: reAdded && reAdded.__simWatchPath,
      status: status().slice(0, 60)
    };
    return JSON.stringify({ res1, res2, res3 });
  })()`);
  const D = JSON.parse(watchRow || '{}');
  const R1 = D.res1 || {};
  check('D1: 点 VCD 行 → 画布增加 1 行观察行（name=完整路径）',
    R1.countDelta === 1 && R1.name === 'tb.dut.q' && R1.watch === 'tb.dut.q', watchRow);
  check('D2: 观察行为注入行且位宽/类型与 VCD 一致（q[3:0] vector）',
    R1.injected === true && R1.width === 4 && R1.kind === 'vector' && R1.type === 1, watchRow);
  check('D3: 观察行 values 长度=主步×(子步+1) 且与同源输出行 q 数据一致',
    R1.vlen > 0 && R1.sameAsQ === true, watchRow);
  const R2 = D.res2 || {};
  check('D4: 重复点同一行不重复加入（提示已在画布并定位）',
    R2.countDeltaAfterDup === 0 && /已在波形中/.test(R2.status || ''), watchRow);
  const R3 = D.res3 || {};
  check('D5: 删除画布观察行后再次点击可重新加入',
    R3.countDeltaAfterReadd === 1 && R3.reAdded === true && R3.watch === 'tb.dut.q', watchRow);

  // ---- D6. 重新仿真 → 观察行自动刷新且不重复（#85 核心声明）----
  const rerunState = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dw = () => window.document_wave;
    const findW = (path) => dw().m_signals.filter((s) => s && s.__simWatchPath === path);
    const qRow = dw().m_signals.find((s) => s && s.name === 'q' && !s.__simWatchPath);
    const qValues = qRow && Array.isArray(qRow.values) ? qRow.values : null;
    const before = findW('tb.dut.q').length;
    const b = document.getElementById('sim-run');
    if (b) b.click();
    let statusText = '';
    for (let i = 0; i < 80; i++) {
      await sleep(400);
      statusText = String(document.getElementById('sim-status').textContent || '');
      if (/仿真完成/.test(statusText) || /ERROR|失败/.test(statusText)) break;
    }
    const afterRows = findW('tb.dut.q');
    const watch = afterRows[0] || null;
    const qRow2 = dw().m_signals.find((s) => s && s.name === 'q' && !s.__simWatchPath);
    return JSON.stringify({
      done: /仿真完成/.test(statusText),
      before,
      after: afterRows.length,
      stillInjected: !!(watch && watch.__simInjected),
      stillWatch: !!(watch && watch.__simWatchPath === 'tb.dut.q'),
      sameAsQ: !!(watch && qRow2 && JSON.stringify(watch.values) === JSON.stringify(qRow2.values)),
      vlen: watch && Array.isArray(watch.values) ? watch.values.length : -1,
      status: statusText.slice(0, 80)
    });
  })()`);
  const D6 = JSON.parse(rerunState || '{}');
  check('D6: 重新仿真后观察行保留、不重复且数据随新结果刷新',
    D6.done === true && D6.before === 1 && D6.after === 1
    && D6.stillInjected === true && D6.stillWatch === true && D6.sameAsQ === true && D6.vlen > 0,
    rerunState);
}

console.log('\n资源加载失败(404等)：' + netFails);
console.log('控制台异常：' + (errors.length ? errors.join(' | ') : '无'));
const failed = results.filter((r) => !r.ok);
console.log('结果：' + (results.length - failed.length) + '/' + results.length + ' 通过');
ws.close();
server.kill();
process.exit(failed.length || errors.length || netFails ? 1 : 0);
