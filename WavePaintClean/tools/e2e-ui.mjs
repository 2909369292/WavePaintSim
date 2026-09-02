// ============================================================================
// WavePaintClean tools/e2e-ui.mjs —— 浏览器级 UI 端到端（真实 Edge + 本地源码服务）
// ----------------------------------------------------------------------------
// 覆盖：
//   A. 核心 valueToLabel（位串 / 数字 / 三种进制；含 x/z、-1、hex 补零）
//   B. 单信号进制切换（核心 setSignalRadix 与 wpf.refreshBusLabels 两条路径）
//   C. 位值弹窗（__core.prompt → 核心 wpQuickPrompt）：回车写入 / Esc /
//      空值失焦取消 / 有值失焦写入 / 非法输入红框重开 / 点遮罩取消 / 弹窗内不触发全局快捷键
// 用法：node tools/e2e-ui.mjs   （自带 dev-server；需本机 Edge；退出码非 0 表示有失败）
// ⚠ Edge profile 与临时产物放 D:/Files/Code/波形/.e2e-tmp（已 git 本地排除），
//   不要把 user-data-dir 指回 C 盘系统 Temp —— C 盘空间紧张，曾因此把盘写满。
// ============================================================================
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = 8949;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cwd = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd, stdio: 'ignore' });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
// Edge profile 放 D 盘（C 盘曾因此被写满）；启动前清掉旧缓存，避免命中旧版 JS
const edgeProfile = 'D:/Files/Code/波形/.e2e-tmp/edge-prompt';
import('node:fs').then((fs) => { try { fs.rmSync(edgeProfile, { recursive: true, force: true }); } catch (e) { /* 忽略 */ } });

let results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail ? '  → ' + detail : ''));
}

// 等服务起来
for (let i = 0; i < 30; i++) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/index.html'); if (r.ok) break; } catch (e) { /* retry */ }
  await sleep(300);
}

spawn(edge, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9531',
  '--user-data-dir=' + edgeProfile, '--no-first-run',
  'http://127.0.0.1:' + PORT + '/index.html'], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const list = await (await fetch('http://127.0.0.1:9531/json')).json();
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
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 160));
  }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || '').slice(0, 200);
  return r.result ? r.result.result.value : undefined;
};
const key = async (k, code, vk) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};

// 关掉缓存（headless 复用同一 user-data-dir，否则会拿到上一轮的旧 JS）
await send('Network.enable', {});
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.enable', {});
await send('Page.reload', { ignoreCache: true });
await sleep(4000);

// ---------------------------------------------------------------- 环境
const env = await ev(`JSON.stringify({ core: typeof __core, prompt: typeof (__core && __core.prompt), doc: !!document_wave, sigs: document_wave ? document_wave.signalList().length : -1 })`);
check('环境就绪（__core.prompt / document_wave）', env && JSON.parse(env).prompt === 'function' && JSON.parse(env).sigs >= 0, env);

// ---------------------------------------------------------------- A. valueToLabel
const a = await ev(`(() => {
  const dw = document_wave, R = window.Radix, f = (v, r) => dw.valueToLabel(v, r);
  return JSON.stringify({
    hex: f('1010', R.Hexadecimal), dec: f('1010', R.Decimal), bin: f('1010', R.Binary),
    x: f('10x1', R.Hexadecimal), z: f('10z1', R.Hexadecimal),
    numHex: f(255, R.Hexadecimal), numDec: f(255, R.Decimal), numBin: f(255, R.Binary),
    neg: f(-1, R.Decimal), pad: f('00001010', R.Hexadecimal)
  });
})()`);
console.log('  valueToLabel:', a);
const A = JSON.parse(a);
check('位串 1010：hex=A / dec=10 / bin=1010', A.hex === 'A' && A.dec === '10' && A.bin === '1010', a);
check('x/z 位串 → X / Z；-1 → X', A.x === 'X' && A.z === 'Z' && A.neg === 'X', a);
check('数字 255：hex=FF / dec=255 / bin=11111111', A.numHex === 'FF' && A.numDec === '255' && A.numBin === '11111111', a);
check('8 位位串 hex 补零 = 0A', A.pad === '0A', A.pad);

// ---------------------------------------------------------------- B. 矢量信号进制切换
const b = await ev(`(() => {
  const dw = document_wave, R = window.Radix;
  dw.addVectorSignal('tbus');
  const idx = dw.signalList().length - 1;
  const sig = dw.signalList()[idx];
  sig.width = 4;
  sig.values.fill('1010');
  dw.setSignalRadix(idx, R.Hexadecimal);
  const hex = sig.labels.slice(0, 2).join(',');
  dw.setSignalRadix(idx, R.Decimal);
  const dec = sig.labels.slice(0, 2).join(',');
  dw.setSignalRadix(idx, R.Binary);
  const bin = sig.labels.slice(0, 2).join(',');
  // wpf 自己的重算路径（按信号自身 radix）
  sig.radix = R.Hexadecimal;
  window.__wpf.refreshBusLabels(sig);
  const viaWpf = sig.labels.slice(0, 2).join(',');
  return JSON.stringify({ hex, dec, bin, viaWpf });
})()`);
console.log('  矢量标签:', b);
const B = JSON.parse(b);
check('核心 setSignalRadix：A / 10 / 1010', B.hex === 'A,A' && B.dec === '10,10' && B.bin === '1010,1010', b);
check('wpf.refreshBusLabels 按信号自身 radix 重算（A）', B.viaWpf === 'A,A', b);

// 生成器写入的数字值（ramp）切 hex 也正确
const b2 = await ev(`(() => {
  const dw = document_wave, R = window.Radix;
  dw.addRampSignal('tramp', 0, 15, 1);
  const idx = dw.signalList().length - 1;
  const sig = dw.signalList()[idx];
  const types = sig.values.slice(0, 17).map((v) => typeof v).join(',');
  dw.setSignalRadix(idx, R.Hexadecimal);
  return JSON.stringify({ labels: sig.labels.slice(0, 17).join(','), types, ten: typeof sig.values[10] });
})()`);
console.log('  ramp:', JSON.stringify(b2));
const B2 = JSON.parse(b2);
check('ramp（数字值）切 hex：0..9,A..F', B2.labels === '0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,0', B2.labels);
check('ramp 值为数字形态（非位串字符串）', B2.ten === 'number', B2.ten);

// ---------------------------------------------------------------- C. 位值弹窗
// 找一个 Bit 信号格子
const cell = await ev(`(() => {
  const canvas = document.getElementById('wave-canvas');
  const rect = canvas.getBoundingClientRect();
  if (document_wave.signalList().length === 0 || !document_wave.signalList().some((s) => s.type === window.SignalType.Bit))
    document_wave.addBitSignal('tclk');
  drawWaveform();
  for (let y = 4; y < rect.height; y += 4) {
    for (let x = 4; x < rect.width; x += 2) {
      const m = mapCanvasPosition(x, y);
      if (m && m.signalIndex >= 0 && m.signalSampleIndex === 6 && !m.clickedOnName) {
        const s = document_wave.signalList()[m.signalIndex];
        if (s && s.type === window.SignalType.Bit) {
          return JSON.stringify({ x: rect.left + x, y: rect.top + y, sig: m.signalIndex, idx: m.signalSampleIndex });
        }
      }
    }
  }
  return null;
})()`);
if (!cell) { check('定位 Bit 格子', false, '未找到'); }
else {
  const C = JSON.parse(cell);
  const clickAt = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
    await sleep(40);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, buttons: 0 });
  };

  // 弹窗打开 + 汉化
  await clickAt(C.x, C.y);
  await sleep(400);
  const open = await ev(`JSON.stringify({
    hidden: document.getElementById('wp-modal-overlay').classList.contains('hidden'),
    title: document.getElementById('wp-modal-title').textContent,
    okHidden: document.getElementById('wp-modal-ok').style.display,
    cancelHidden: document.getElementById('wp-modal-cancel').style.display,
    closeShown: document.getElementById('wp-modal-close').style.display,
    focused: document.activeElement && document.activeElement.id,
    active: __core.promptActive()
  })`);
  console.log('  弹窗状态:', open);
  const O = JSON.parse(open);
  check('单击 Bit 弹出位值弹窗（核心弹窗 + 汉化标题）', O.hidden === false && O.title === '位值', open);
  check('快速录入模式：隐藏确定/取消、保留 X', O.okHidden === 'none' && O.cancelHidden === 'none' && O.closeShown === 'inline-block', open);
  check('输入框自动聚焦 + __core.promptActive() 为真', O.focused === 'wp-modal-input' && O.active === true, open);

  // 回车写入 1
  await send('Input.insertText', { text: '1' });
  await key('Enter', 'Enter', 13);
  await sleep(350);
  const wrote = await ev(`(() => {
    const s = document_wave.signalList()[${C.sig}];
    return JSON.stringify({ v: s.values.slice(4, 9).join(','), closed: document.getElementById('wp-modal-overlay').classList.contains('hidden'), stride: window.__wpf.stride() });
  })()`);
  console.log('  写入结果:', wrote);
  const W = JSON.parse(wrote);
  // 整步粒度：命中主步的 stride 个下标都写入（stride 由子步数决定）
  const wArr = W.v.split(',');
  const hit = W.stride === 1 ? 2 : 2; // 命中下标 6，整步再写满本主步
  check('回车写入（整步铺满 ' + W.stride + ' 格）且弹窗关闭',
    W.closed === true && wArr[hit] === '1' && (W.stride === 1 || wArr[hit + 1] === '1'), wrote);

  // Esc 取消（写入 x，Esc 后不应改变）
  const before = await ev(`document_wave.signalList()[${C.sig}].values.slice(4,9).join(',')`);
  await clickAt(C.x, C.y);
  await sleep(300);
  await send('Input.insertText', { text: '0' });
  await key('Escape', 'Escape', 27);
  await sleep(300);
  const afterEsc = await ev(`document_wave.signalList()[${C.sig}].values.slice(4,9).join(',')`);
  check('Esc 取消：值不变、弹窗关闭', afterEsc === before, before + ' → ' + afterEsc);

  // 空值失焦 = 取消
  await clickAt(C.x, C.y);
  await sleep(300);
  await ev(`(() => { const i = document.getElementById('wp-modal-input'); i.value = ''; i.blur(); return 1; })()`);
  await sleep(300);
  const afterBlur = await ev(`document_wave.signalList()[${C.sig}].values.slice(4,9).join(',')`);
  check('清空后失焦 = 取消', afterBlur === before, before + ' → ' + afterBlur);

  // 有值失焦 = 写入
  await clickAt(C.x, C.y);
  await sleep(300);
  await ev(`(() => { const i = document.getElementById('wp-modal-input'); i.value = '0'; i.blur(); return 1; })()`);
  await sleep(300);
  const afterBlur2 = await ev(`document_wave.signalList()[${C.sig}].values.slice(4,9).join(',')`);
  check('有值失焦 = 写入（0）', afterBlur2.split(',').every((x) => x === '0'), afterBlur2);

  // 非法输入：红框重开
  await clickAt(C.x, C.y);
  await sleep(300);
  await send('Input.insertText', { text: 'qqq' });
  await key('Enter', 'Enter', 13);
  await sleep(400);
  const invalid = await ev(`JSON.stringify({
    err: document.getElementById('wp-modal-input').classList.contains('wp-modal-error'),
    hidden: document.getElementById('wp-modal-overlay').classList.contains('hidden')
  })`);
  const IV = JSON.parse(invalid);
  check('非法输入：红框 + 自动重开', IV.err === true && IV.hidden === false, invalid);

  // 点遮罩取消（注意：画笔工具下按下画布本身会先画一笔，故以「弹窗打开后」的值为基准）
  const beforeMask = await ev(`document_wave.signalList()[${C.sig}].values.slice(4,9).join(',')`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', clickCount: 1, buttons: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', clickCount: 1, buttons: 0 });
  await sleep(300);
  const afterMask = await ev(`JSON.stringify({
    hidden: document.getElementById('wp-modal-overlay').classList.contains('hidden'),
    v: document_wave.signalList()[${C.sig}].values.slice(4,9).join(',')
  })`);
  const AM = JSON.parse(afterMask);
  check('点遮罩 = 取消（不误提交）', AM.hidden === true && AM.v === beforeMask, beforeMask + ' → ' + AM.v);

  // 弹窗打开时全局快捷键不生效（输入 1 不应切换位状态工具）
  await clickAt(C.x, C.y);
  await sleep(300);
  const stateBefore = await ev(`(() => { const el = document.querySelector('.bit-state-option.selected'); return el ? el.getAttribute('data-state') : ''; })()`);
  await send('Input.insertText', { text: 'x' });
  await sleep(120);
  const stateAfter = await ev(`(() => { const el = document.querySelector('.bit-state-option.selected'); return el ? el.getAttribute('data-state') : ''; })()`);
  await key('Escape', 'Escape', 27);
  await sleep(200);
  check('弹窗内键入不触发全局位状态快捷键', stateBefore === stateAfter, stateBefore + ' → ' + stateAfter);
}

// ---------------------------------------------------------------- 收尾
console.log('\n控制台异常：' + (errors.length ? errors.join(' | ') : '无'));
const failed = results.filter((r) => !r.ok);
console.log('结果：' + (results.length - failed.length) + '/' + results.length + ' 通过');
ws.close();
server.kill();
process.exit(failed.length || errors.length ? 1 : 0);
