// ============================================================================
// WavePaintClean tools/e2e-rtl.mjs —— #75 P0 浏览器级冒烟（真实 Edge + dev-server）
// ----------------------------------------------------------------------------
// 覆盖：
//   A. CodeMirror 6 bundle 加载、挂载到 #verilog-cm-host、textarea 降级隐藏
//   B. RTL 结构树渲染（模块/端口/实例）与「点击跳转 → 状态栏确认」
//   C. 运行一次真实仿真（/api/sim）→ VCD 信号层次树按 $scope 全路径渲染
//   D. VCD 点信号 → 加画布观察行（#85）
//   E. #86 A2/A3/A4：实例行 → 模块定义跳转（右键/Alt=例化点）、磁盘导入入口、
//      源码集合随工程存档/恢复（.wp 往返）
//   F. #76 B1：模块体内符号索引 → 真实 VCD 全路径映射（点代码变量 → 波形路径的底座）
//   G. #76 B4：代码内点/选中变量 → 加波形（唯一加信号主路径；且仿真后不再全量灌信号）
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

// F 段 fixture：两文件工程（counter 例化 sub，两个模块里都有 q → 跨模块同名）。
// 行号是断言的一部分：counter.sv L5 = output 端口 q，L7 = 体内 reg q；sub.v L2 = 体内 reg q。
const F_FILES = [
  { name: 'counter.sv', content: [
    'module counter (',
    '  input clk,',
    '  input rst_n,',
    '  input en,',
    '  output [3:0] q',
    ');',
    '  reg [3:0] q;',
    '  wire [7:0] acc;',
    '  parameter WIDTH = 4;',
    '  assign acc = {4\'b0, q};',
    '  sub u_sub (.clk(clk));',
    '  always @(posedge clk or negedge rst_n) begin',
    '    if (!rst_n) q <= 4\'d0;',
    '    else if (en) q <= q + 4\'d1;',
    '  end',
    'endmodule',
    ''
  ].join('\n') },
  { name: 'sub.v', content: [
    'module sub (input clk);',
    '  reg [3:0] q;',
    '  always @(posedge clk) q <= q + 4\'d1;',
    'endmodule',
    ''
  ].join('\n') }
];
const F_FILES_JSON = JSON.stringify(F_FILES);

// G 段 fixture：counter 里把 sub **例化两次**（u_a / u_b）——
// 这样 sub.v 里的 q 恰好映射出两条全路径（tb.dut.u_a.q / tb.dut.u_b.q），
// 是「同名多次例化 → 多候选 → 轻量选择器」的真实场景（B4 唯一需要选择器的情况）。
// 行号同样是断言的一部分：counter.sv L7 = 体内 reg q；sub.v L2 = 体内 reg q。
const G_FILES = [
  { name: 'counter.sv', content: [
    'module counter (',
    '  input clk,',
    '  input rst_n,',
    '  input en,',
    '  output [3:0] q',
    ');',
    '  reg [3:0] q;',
    '  always @(posedge clk or negedge rst_n) begin',
    '    if (!rst_n) q <= 4\'d0;',
    '    else if (en) q <= q + 4\'d1;',
    '  end',
    '  sub u_a (.clk(clk));',
    '  sub u_b (.clk(clk));',
    'endmodule',
    ''
  ].join('\n') },
  { name: 'sub.v', content: [
    'module sub (input clk);',
    '  reg [3:0] q;',
    '  always @(posedge clk) q <= q + 4\'d1;',
    'endmodule',
    ''
  ].join('\n') }
];
const G_FILES_JSON = JSON.stringify(G_FILES);

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
    // #76 B4 收敛：仿真后画布不再自动灌 VCD 输出行，同源比对改用桥的
    // nativeValuesOfOutput('q')（state.outputs 经同一画布口径展开），不再依赖画布上的原生 q 行。
    const qValues = (window.__wpsim && window.__wpsim.nativeValuesOfOutput('q')) || null;
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
  check('D3: 观察行 values 长度=主步×(子步+1) 且与同源 VCD 输出 q 数据一致',
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
    const nativeQ = (window.__wpsim && window.__wpsim.nativeValuesOfOutput('q')) || null;
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
    return JSON.stringify({
      done: /仿真完成/.test(statusText),
      before,
      after: afterRows.length,
      stillInjected: !!(watch && watch.__simInjected),
      stillWatch: !!(watch && watch.__simWatchPath === 'tb.dut.q'),
      sameAsQ: !!(watch && nativeQ && JSON.stringify(watch.values) === JSON.stringify(nativeQ)),
      vlen: watch && Array.isArray(watch.values) ? watch.values.length : -1,
      status: statusText.slice(0, 80)
    });
  })()`);
  const D6 = JSON.parse(rerunState || '{}');
  check('D6: 重新仿真后观察行保留、不重复且数据随新结果刷新',
    D6.done === true && D6.before === 1 && D6.after === 1
    && D6.stillInjected === true && D6.stillWatch === true && D6.sameAsQ === true && D6.vlen > 0,
    rerunState);

  // ---- E. #86 A2/A3/A4：实例→定义跳转 / 磁盘导入入口 / 源码集合存档 ----
  // E1: 存档桥已安装，__wpsim 自动化入口可用（setSourceFiles 供探针造工程）
  const bridgeState = await ev(`(() => {
    const w = window.__wpsim;
    if (!w) return JSON.stringify({ has: false });
    return JSON.stringify({
      has: true,
      installed: w.archiveInstalled,
      files: (w.sourceFiles || []).length,
      hasSetter: typeof w.setSourceFiles === 'function'
    });
  })()`);
  const E1 = JSON.parse(bridgeState || '{}');
  check('E1: 源码存档桥已安装且 __wpsim 自动化入口可用',
    E1.has === true && E1.installed === true && E1.files >= 1 && E1.hasSetter === true, bridgeState);

  // E2: 两文件工程（top 例化 sub）→ 点实例行 → 跳到 sub 的「源码定义」并切到 sub.v 标签
  const defJump = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__wpsim.setSourceFiles([
      { name: 'top.sv', content: 'module top;\\n  wire clk;\\n  sub u_sub (.clk(clk));\\nendmodule\\n' },
      { name: 'sub.v', content: 'module sub (input clk);\\nendmodule\\n' }
    ]);
    await sleep(500);
    const tree = document.getElementById('rtl-tree');
    const inst = tree && tree.querySelector('.rtl-inst');
    if (!inst) return JSON.stringify({ err: 'no-inst', tree: tree ? tree.textContent.slice(0, 200) : 'no-tree' });
    inst.click();
    await sleep(300);
    const chip = document.querySelector('#source-files .source-chip.active');
    return JSON.stringify({
      label: inst.textContent,
      status: (document.getElementById('sim-status').textContent || ''),
      active: window.__wpsim.active,
      chip: chip ? chip.textContent : ''
    });
  })()`);
  const E2 = JSON.parse(defJump || '{}');
  check('E2: 点实例行 → 跳到 module sub 源码定义并切到 sub 文件标签',
    /已定位到 module sub 的定义/.test(E2.status || '') && E2.active === 1 && E2.chip === 'sub.v', defJump);

  // E3: 例化一个没有源码定义的模块（黑盒 / 外部 IP）→ 中文提示 + 退回例化点
  const blackbox = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__wpsim.setSourceFiles([
      { name: 'top.sv', content: 'module top;\\n  wire a;\\n  ext_ip u_bb (.a(a));\\nendmodule\\n' }
    ]);
    await sleep(500);
    const inst = document.querySelector('#rtl-tree .rtl-inst');
    if (!inst) return JSON.stringify({ err: 'no-inst' });
    inst.click();
    await sleep(250);
    return JSON.stringify({ status: (document.getElementById('sim-status').textContent || '') });
  })()`);
  const E3 = JSON.parse(blackbox || '{}');
  check('E3: 黑盒例化 → 提示未找到模块源码定义并退回例化点',
    /未找到模块 ext_ip 的源码定义/.test(E3.status || ''), blackbox);

  // E4: 实例行右键 → 跳到「例化点行」（次入口语义，Alt+左键等价）
  const siteJump = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__wpsim.setSourceFiles([
      { name: 'top.sv', content: 'module top;\\n  wire clk;\\n  sub u_sub (.clk(clk));\\nendmodule\\n' },
      { name: 'sub.v', content: 'module sub (input clk);\\nendmodule\\n' }
    ]);
    await sleep(500);
    const inst = document.querySelector('#rtl-tree .rtl-inst');
    if (!inst) return JSON.stringify({ err: 'no-inst' });
    inst.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(250);
    return JSON.stringify({
      status: (document.getElementById('sim-status').textContent || ''),
      active: window.__wpsim.active
    });
  })()`);
  const E4 = JSON.parse(siteJump || '{}');
  check('E4: 实例行右键 → 跳到例化点（次入口，仍停在例化文件 top.sv）',
    /已定位到 sub 的例化点/.test(E4.status || '') && E4.active === 0, siteJump);

  // E5: 源码集合随工程 JSON 往返 —— 存档含 sourceFiles/activeSourceIndex；载入时被整体替换
  const archiveRoundTrip = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const parsed = JSON.parse(window.buildDocumentJson(window.document_wave));
    const out = {
      savedHas: Array.isArray(parsed.sourceFiles),
      savedCount: Array.isArray(parsed.sourceFiles) ? parsed.sourceFiles.length : -1,
      savedActive: parsed.activeSourceIndex,
      savedFirstHasText: !!(parsed.sourceFiles && parsed.sourceFiles[0] && /module top/.test(parsed.sourceFiles[0].content || ''))
    };
    const minimal = JSON.stringify({
      sampleCount: 4,
      subStepCount: 0,
      signals: [{ name: 'a', type: 'bit', values: [0, 1, 0, 1], labels: ['', '', '', ''] }],
      sourceFiles: [
        { name: 'loaded_a.sv', content: 'module loaded_a;\\nendmodule\\n' },
        { name: 'loaded_b.v', content: 'module loaded_b;\\nendmodule\\n' }
      ],
      activeSourceIndex: 1
    });
    const ok = window.loadFromFileContent(window.document_wave, minimal);
    await sleep(300);
    const files = window.__wpsim.sourceFiles;
    out.loadOk = ok;
    out.loadedCount = files.length;
    out.loadedNames = files.map((f) => f.name).join(',');
    out.loadedActive = window.__wpsim.active;
    return JSON.stringify(out);
  })()`);
  const E5 = JSON.parse(archiveRoundTrip || '{}');
  check('E5a: 工程存档内含 sourceFiles 数组 + activeSourceIndex（内容取自当前编辑）',
    E5.savedHas === true && E5.savedCount === 2 && E5.savedActive === 0 && E5.savedFirstHasText === true,
    archiveRoundTrip);
  check('E5b: 载入带 sourceFiles 的工程 → 源码集合被整体替换（含 activeSourceIndex）',
    E5.loadOk === true && E5.loadedCount === 2 && E5.loadedNames === 'loaded_a.sv,loaded_b.v' && E5.loadedActive === 1,
    archiveRoundTrip);

  // E6: A3 磁盘导入入口按钮存在（真点会弹系统文件框，故只断言存在与可点）
  const importBtn = await ev(`(() => {
    const b = document.getElementById('sim-import');
    return JSON.stringify({
      exists: !!b,
      label: b ? (b.textContent || '').trim() : '',
      hasClick: b ? typeof b.click === 'function' : false
    });
  })()`);
  const E6 = JSON.parse(importBtn || '{}');
  check('E6: 侧栏存在「导入源码」磁盘入口按钮（A3）',
    E6.exists === true && E6.label === '导入源码' && E6.hasClick === true, importBtn);

  // ---- F. #76 B1：代码符号（名 / 文件 / 行）→ 真实 VCD 全路径 ----
  // 自带两文件工程（counter 例化 sub，两模块都有 q）跑一次真实仿真后核验这条数据链：
  // 它是 B4「代码内点变量 → 加波形（仿 Ctrl+W 中追）」的唯一底座，因此用真 VCD 做端到端核对。
  const fState = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__wpsim.setSourceFiles(${F_FILES_JSON});
    await sleep(500);
    const runBtn = document.getElementById('sim-run');
    if (runBtn) runBtn.click();
    let status = '';
    for (let i = 0; i < 80; i++) {
      await sleep(400);
      status = String(document.getElementById('sim-status').textContent || '');
      if (/仿真完成/.test(status) || /ERROR|失败/.test(status)) break;
    }
    const idx = window.__wpsim.symbolIndex;
    const sym = (name, opts) => window.__wpsim.symbolVcdPaths(name, opts || {});
    const sort = (arr) => arr.slice().sort();
    const qReg = sym('q', { fileIndex: 0, line: 7 });
    const qPort = sym('q', { fileIndex: 0, line: 5 });
    const qSub = sym('q', { fileIndex: 1, line: 2 });
    const qAll = sym('q');
    const qByName = window.__wpsim.vcdPathsByName('q');
    const covered = qAll.paths.every((p) => qByName.indexOf(p) >= 0);
    const symWidths = window.__wpsim.symbolsOf(0).filter((s) => s.name === 'q').map((s) => s.width + '@' + s.line);
    return JSON.stringify({
      status: status.slice(0, 90),
      done: /仿真完成/.test(status),
      topName: idx.topName,
      moduleCount: idx.moduleCount,
      symbolCount: idx.symbolCount,
      paths: idx.instancePaths.map((p) => p.path),
      qReg: sort(qReg.paths),
      qRegModule: (qReg.hits[0] || {}).moduleName,
      qPort: sort(qPort.paths),
      qSub: sort(qSub.paths),
      qSubModule: (qSub.hits[0] || {}).moduleName,
      qAll: sort(qAll.paths),
      qByName: qByName,
      covered: covered,
      accTop: sort(sym('acc', { fileIndex: 0, line: 8 }).paths),
      missing: sym('no_such_signal_xyz').paths,
      oob: sort(sym('q', { fileIndex: 99, line: 999 }).paths),
      symWidths: symWidths
    });
  })()`);
  const F = JSON.parse(fState || '{}');
  check('F1: 仿真完成且符号索引建出例化路径（topName=counter，含 tb.dut / tb.dut.u_sub）',
    F.done === true && F.topName === 'counter' && F.moduleCount === 2 && F.symbolCount > 0
    && F.paths.indexOf('tb.dut') >= 0 && F.paths.indexOf('tb.dut.u_sub') >= 0, fState);
  check('F2: 点 counter.sv 体内 reg q（L7）→ 映射出 tb.dut.q（模块体符号 → VCD 全路径）',
    Array.isArray(F.qReg) && F.qReg.length === 1 && F.qReg[0] === 'tb.dut.q' && F.qRegModule === 'counter', fState);
  check('F3: 点端口行 q（L5）同样落到 tb.dut.q（端口与体内声明同名不歧义）',
    Array.isArray(F.qPort) && F.qPort.length === 1 && F.qPort[0] === 'tb.dut.q', fState);
  check('F4: 点 sub.v 体内 reg q（L2）→ tb.dut.u_sub.q（跨模块同名不串味）',
    Array.isArray(F.qSub) && F.qSub.length === 1 && F.qSub[0] === 'tb.dut.u_sub.q' && F.qSubModule === 'sub', fState);
  check('F5: 只给名字 q → 两个模块的候选都给出（跨模块同名 → 多候选，交给交互层选择）',
    Array.isArray(F.qAll) && F.qAll.length === 2
    && F.qAll[0] === 'tb.dut.q' && F.qAll[1] === 'tb.dut.u_sub.q', fState);
  check('F6: 名字兜底 findVcdPathsByName 覆盖符号侧全部候选（隐式 net / TB 本地信号兜底可用）',
    F.covered === true && Array.isArray(F.qByName) && F.qByName.indexOf('tb.dut.q') >= 0
    && F.qByName.indexOf('tb.dut.u_sub.q') >= 0, fState);
  check('F7: 位宽来自 RTL 声明（q 的端口/reg 两条各 4 位，行号 5/7）',
    JSON.stringify(F.symWidths) === JSON.stringify(['4@5', '4@7']), fState);
  check('F8: wire acc（L8）→ tb.dut.acc；不存在符号 → 空候选；越界 文件/行 → 因「收窄为空则忽略」回退到全部同名候选',
    Array.isArray(F.accTop) && F.accTop.length === 1 && F.accTop[0] === 'tb.dut.acc'
    && Array.isArray(F.missing) && F.missing.length === 0
    && Array.isArray(F.oob) && F.oob.length === 2, fState);

  // F9: 符号位宽 ↔ VCD 位宽交叉核验：用 VCD 树点行加波形，读回观察行的位宽/类型
  const fWidth = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const row = [...document.querySelectorAll('#vcd-tree .vcd-signal-row')].find((r) => r.title.includes('tb.dut.q'));
    if (!row) return JSON.stringify({ err: 'row-missing', titles: [...document.querySelectorAll('#vcd-tree .vcd-signal-row')].slice(0, 8).map((r) => r.title) });
    row.click();
    await sleep(400);
    const dw = window.document_wave;
    const added = dw.m_signals.find((s) => s && s.__simWatchPath === 'tb.dut.q');
    const symWidth = (window.__wpsim.symbolsOf(0).find((s) => s.name === 'q' && s.line === 7) || {}).width;
    const out = {
      symWidth: symWidth,
      vcdWidth: added ? added.width : -1,
      kind: added ? added.kind : '',
      vlen: added && Array.isArray(added.values) ? added.values.length : -1
    };
    const i = dw.m_signals.findIndex((s) => s && s.__simWatchPath === 'tb.dut.q');
    if (i >= 0) { dw.removeSignal(i); window.drawWaveform && window.drawWaveform(); window.updateSidePanels && window.updateSidePanels(); }
    return JSON.stringify(out);
  })()`);
  const F9 = JSON.parse(fWidth || '{}');
  check('F9: 符号声明位宽与 VCD 实际位宽一致（q：RTL 4 位 = VCD vector 4 位）',
    F9.symWidth === 4 && F9.vcdWidth === 4 && F9.kind === 'vector' && F9.vlen > 0, fWidth);

  // ---- G. #76 B4：代码内「点/选中变量 → 加波形」（仿 Verdi Ctrl+W「中追」，唯一加信号主路径）----
  // 用户口径：① 加信号只从代码操作；② 仿真后**不得**把所有可看变量全灌进画布；
  //          ③ 候选 >1 只弹代码区旁的轻量选择器（严禁做成侧栏面板 / 信号层次框）。
  const gState = await ev(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dw = () => window.document_wave;
    const wpsim = window.__wpsim;
    const watchPaths = () => dw().m_signals.filter((s) => s && s.__simWatchPath).map((s) => s.__simWatchPath);
    const status = () => String(document.getElementById('sim-status').textContent || '');
    // 1) 造两文件工程（counter 里 sub 例化两次 u_a/u_b）跑一次真实仿真
    wpsim.setSourceFiles(${G_FILES_JSON});
    await sleep(500);
    const runBtn = document.getElementById('sim-run');
    if (runBtn) runBtn.click();
    let runStatus = '';
    for (let i = 0; i < 80; i++) {
      await sleep(400);
      runStatus = status();
      if (/仿真完成/.test(runStatus) || /ERROR|失败/.test(runStatus)) break;
    }
    // 2) 收敛断言：仿真完成后画布不得自动出现任何注入行/观察行（旧行为 = 全量灌信号）
    const autoInjected = dw().m_signals.filter((s) => s && s.__simInjected).length;
    const autoWatch = watchPaths().length;
    const waitHint = status();
    // 3) 带 file/line 的点变量（= 在代码里双击该变量名）→ 唯一候选直接加入，不弹选择器
    wpsim.addSymbolFromCode({ name: 'q', fileIndex: 0, line: 7, selection: 'q', exact: true, via: 'probe' });
    await sleep(250);
    const afterUnique = watchPaths();
    const added = dw().m_signals.find((s) => s && s.__simWatchPath === 'tb.dut.q') || null;
    const uniqueStatus = status();
    const uniquePicker = wpsim.symbolPickerOptions;
    // 4) 点 sub.v 里的 q（同一模块被例化两次）→ 弹轻量选择器，且不得先斩后奏地加入
    wpsim.addSymbolFromCode({ name: 'q', fileIndex: 1, line: 2, selection: 'q', exact: true, via: 'probe' });
    await sleep(250);
    const options = wpsim.symbolPickerOptions;
    const afterMulti = watchPaths();
    const multiStatus = status();
    // 5) 点候选 → 加入波形并收起选择器
    const clicked = wpsim.clickSymbolPickerOption('tb.dut.u_b.q');
    await sleep(300);
    const afterPick = watchPaths();
    const pickerClosed = wpsim.symbolPickerOptions === null;
    // 6) 未知符号 → 只给中文提示，绝不误加
    const beforeUnknown = watchPaths().length;
    wpsim.addSymbolFromCode({ name: 'no_such_signal_xyz', selection: 'no_such_signal_xyz', exact: true, via: 'probe' });
    await sleep(200);
    const unknownDelta = watchPaths().length - beforeUnknown;
    const unknownStatus = status();
    // 7) UI 触发面接线：右键菜单 / Ctrl+Alt+W（挂在代码区宿主上的监听）→ 必须走同一条 addSymbolFromCode
    const host = document.getElementById('verilog-cm-host');
    const ctx = wpsim.codeContext || {};
    host.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 200 }));
    await sleep(250);
    const afterMenu = status();
    wpsim.closeSymbolPicker();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', ctrlKey: true, altKey: true, bubbles: true, cancelable: true }));
    await sleep(250);
    const afterHotkey = status();
    wpsim.closeSymbolPicker();
    // 收尾：清空观察行，避免影响后续（本文件末尾无其它断言，但保持幂等）
    for (const s of dw().m_signals.filter((x) => x && x.__simWatchPath)) {
      const i = dw().m_signals.indexOf(s);
      if (i >= 0) dw().removeSignal(i);
    }
    window.drawWaveform && window.drawWaveform();
    window.updateSidePanels && window.updateSidePanels();
    return JSON.stringify({
      runDone: /仿真完成/.test(runStatus), runStatus: runStatus.slice(0, 90),
      autoInjected, autoWatch, waitHint: waitHint.slice(0, 70),
      afterUnique, addedName: added && added.name, addedWidth: added && added.width,
      addedInjected: !!(added && added.__simInjected), uniqueStatus: uniqueStatus.slice(0, 60),
      uniquePicker,
      options, afterMulti, multiStatus: multiStatus.slice(0, 60),
      clicked, afterPick, pickerClosed,
      unknownDelta, unknownStatus: unknownStatus.slice(0, 60),
      ctxSource: ctx.source, ctxKeys: Object.keys(ctx).sort().join(','),
      afterMenu: afterMenu.slice(0, 60), afterHotkey: afterHotkey.slice(0, 60)
    });
  })()`);
  const G = JSON.parse(gState || '{}');
  check('G1: 仿真完成后画布不自动灌信号（无注入行/观察行，只提示「在代码里双击变量名」）',
    G.runDone === true && G.autoInjected === 0 && G.autoWatch === 0
    && /双击变量名/.test(G.waitHint || ''), gState);
  check('G2: 代码内点变量（带文件/行 → 唯一候选）→ 直接加入观察行 tb.dut.q，不弹选择器',
    JSON.stringify(G.afterUnique) === JSON.stringify(['tb.dut.q'])
    && G.addedName === 'tb.dut.q' && G.addedWidth === 4 && G.addedInjected === true
    && G.uniquePicker === null, gState);
  check('G3: 同一模块例化两次（sub.v 的 q → u_a/u_b）→ 弹轻量选择器且未先斩后奏地加入',
    Array.isArray(G.options) && JSON.stringify(G.options.slice().sort())
    === JSON.stringify(['tb.dut.u_a.q', 'tb.dut.u_b.q'])
    && JSON.stringify(G.afterMulti) === JSON.stringify(['tb.dut.q']), gState);
  check('G4: 点选择器候选 → 加入对应全路径观察行并收起选择器',
    G.clicked === true && G.pickerClosed === true
    && G.afterPick.indexOf('tb.dut.u_b.q') >= 0 && G.afterPick.length === 2, gState);
  check('G5: 未知符号 → 不加入任何行且给出中文提示',
    G.unknownDelta === 0 && /未在 VCD 中找到|暂无 VCD 数据/.test(G.unknownStatus || ''), gState);
  check('G6: 代码区触发面接线（右键 / Ctrl+Alt+W）→ 走同一条加信号链路（状态栏出现 B4 口径文案）',
    G.ctxKeys === 'exact,line,name,selection,source'
    && /未选中变量名|已将|未在 VCD 中找到|暂无 VCD 数据/.test(G.afterMenu || '')
    && /未选中变量名|已将|未在 VCD 中找到|暂无 VCD 数据/.test(G.afterHotkey || ''), gState);
  check('G7: 代码区取词上下文来自真实编辑器（codeContext.source=cm）',
    G.ctxSource === 'cm', gState);
}

console.log('\n资源加载失败(404等)：' + netFails);
console.log('控制台异常：' + (errors.length ? errors.join(' | ') : '无'));
const failed = results.filter((r) => !r.ok);
console.log('结果：' + (results.length - failed.length) + '/' + results.length + ' 通过');
ws.close();
server.kill();
process.exit(failed.length || errors.length || netFails ? 1 : 0);
