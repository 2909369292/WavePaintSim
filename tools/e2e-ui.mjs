// ============================================================================
// WavePaintClean tools/e2e-ui.mjs —— 浏览器级 UI 端到端（真实 Edge + 本地源码服务）
// ----------------------------------------------------------------------------
// 覆盖：
//   A. 核心 valueToLabel（位串 / 数字 / 三种进制；含 x/z、-1、hex 补零）
//   B. 单信号进制切换（核心 setSignalRadix 与 wpf.refreshBusLabels 两条路径）
//   C. 位值弹窗（__core.prompt → 核心 wpQuickPrompt）：回车写入 / Esc /
//      空值失焦取消 / 有值失焦写入 / 非法输入红框重开 / 点遮罩取消 / 弹窗内不触发全局快捷键
//   D. 步数/子步 spin：input 中间态不提交、change 一次性生效
//   D2. 步数/子步 ▲/▼ 微调按钮（Task3 #90）：pointerdown → ±1 → 派发 change →
//      统一走 resizeSignals；min/max 收敛；点按钮不抢输入框焦点
//   F. 编辑模式点击 Vector 不再自动切框选（Task1 #88）：paint 单击 → 「矢量值」
//      弹窗；输入 A → 主步格 10/标签 A；拖动 → 不弹窗不框选不改值；
//      Ctrl+单击 → 正常框选；Esc 后自动切回 paint
//   E. 框选（editor/selection.js，2026-09-03 重写）：单击粒度 / 反向拖动 /
//      私有子步行与普通行跨行写值不错位 / Vector 输入 'A' → 10 / 工具条带焦点时
//      连续第二次/第三次拖动不再抛 NotFoundError、不再误提交半输入的值
// 用法：node tools/e2e-ui.mjs   （自带 dev-server；需本机 Edge；退出码非 0 表示有失败）
// ⚠ Edge profile / 组件更新 / 系统 TEMP 全部指到 D:/Files/Code/波形/.e2e-tmp（已 git 本地排除）。
//   即使 --user-data-dir 在 D 盘，headless Edge 的组件更新器仍会往 C 盘 %TEMP% 写
//   msedge_url_fetcher_*（单次可 150MB+）→ 必须同时禁组件更新 + 重定向 TEMP，C 盘曾被写满 0GB。
// ============================================================================
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const PORT = 8949;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 所有临时产物集中到 D 盘根临时区（防 C 盘爆盘）。
// ⚠ 不用「固定 profile + 启动即删」：WorkBuddy 的 node 沙箱拦截 >50 文件的递归删除
//   （SAFE_DELETE_BULK_CONFIRM_REQUIRED，profile 有 1000+ 文件 → 直接抛错）。
//   改为每次运行用「唯一新 profile」→ 天然无旧版 JS 缓存，也不需要在 node 里删大目录；
//   历史 profile 由事后 Bash `rm -rf .e2e-tmp` 清理（D 盘余量大，短期堆积无碍）。
const e2eRoot = 'D:/Files/Code/波形/.e2e-tmp';
const edgeProfile = e2eRoot + '/edge-prompt-' + Date.now();
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(e2eRoot, { recursive: true });
mkdirSync(sysTmp, { recursive: true });
const cwd = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd, stdio: 'ignore' });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

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

// 禁组件更新 + 系统 TEMP 重定向：headless Edge 不再往 C 盘 %TEMP% 写垃圾
const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
spawn(edge, ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
  '--remote-debugging-port=9531', '--user-data-dir=' + edgeProfile, '--no-first-run',
  'http://127.0.0.1:' + PORT + '/index.html'], { stdio: 'ignore', env: edgeEnv });

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
let netFails = 0;
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 160));
  }
  if (m.method === 'Network.loadingFailed') netFails += 1;
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

// ---------------------------------------------------------------- F. 编辑模式点击 Vector（Task1 #88）
// 历史 bug：value-input 的 onMouseDown 把 `ctrlKey||metaKey||isVector` 一并切到
// select 工具且不拦截 → paint（或无激活工具）下**单击** bus 信号也会进框选模式。
// 修复后：仅 Ctrl/⌘ 切 select；非 Ctrl 的 Vector 单击 → 阻断核心 vectorSelecting，
// mouseup 未拖动时弹「矢量值」弹窗（与 Bit 对齐）；拖动期间不弹不框选。
{
  // 扩视口，保证 fvec 行与所有格都可点（E 段同样做法；D/D2 不依赖视口）。
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  await ev(`(() => { if (typeof drawWaveform === 'function') drawWaveform(); return 1; })()`);

  const f0 = await ev(`(() => {
    const dw = document_wave;
    if (!dw || typeof dw.addVectorSignal !== 'function') return null;
    const beforeTool = window.__wpf.currentTool();       // 进入 F 前的真实工具状态（通常 null）
    dw.addBitSignal('fbit'); const fbit = dw.signalList().length - 1;
    dw.addVectorSignal('fvec'); const fvec = dw.signalList().length - 1;
    const sig = dw.signalList()[fvec];
    if (sig) sig.radix = window.Radix ? window.Radix.Hexadecimal : 0;   // F2 走 hex 'A' → 10
    if (typeof window.__wpf.setEditGranularity === 'function') window.__wpf.setEditGranularity('step');
    if (typeof drawWaveform === 'function') drawWaveform();
    // 激活画笔，使「编辑模式点击 Vector」处于用户真实可见的状态（paint 激活 → 旧代码必切 select）。
    let tool = window.__wpf.currentTool();
    if (tool !== 'paint') {
      const b = document.querySelector('.tool-btn[data-tool="paint"]');
      if (b) { b.click(); tool = window.__wpf.currentTool(); }
    }
    const S = window.__wpf.stride();

    // 状态读取：弹窗 / 工具 / 框选 / 批量工具条
    window.__Fstate = function () {
      const ov = document.getElementById('wp-modal-overlay');
      const bar = document.getElementById('wpf-batch-bar');
      const t = document.getElementById('wp-modal-title');
      return JSON.stringify({
        hidden: ov ? ov.classList.contains('hidden') : true,
        title: t ? t.textContent : '',
        active: typeof __core.promptActive === 'function' ? __core.promptActive() : false,
        tool: window.__wpf.currentTool(),
        sel: window.__wpf.selection || null,
        bar: !!bar
      });
    };
    window.__Fvals = function (row) {
      const s = document_wave.signalList()[row];
      return JSON.stringify({ values: s.values.slice(), labels: s.labels ? s.labels.slice() : null });
    };
    // 坐标定位：row 行的 target 格中心（canvas 相对 → client 坐标）
    window.__Fcell = function (row, target) {
      const cv = document.getElementById('wave-canvas');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      function at(x, y) { try { return mapCanvasPosition(x, y); } catch (e) { return null; } }
      let yTop = -1, yBot = -1;
      const mx = Math.max(60, Math.floor(r.width / 2));
      for (let y = 2; y < r.height; y += 1) {
        const m = at(mx, y);
        if (m && m.signalIndex === row) { if (yTop < 0) yTop = y; yBot = y; }
      }
      if (yTop < 0 || yBot < 0) return null;
      const yr = Math.floor((yTop + yBot) / 2);
      let xL = -1, xR = -1;
      for (let x = 2; x < r.width; x += 1) {
        const m = at(x, yr);
        if (!m || m.clickedOnName) continue;
        if (m.signalIndex !== row) { if (xL >= 0) break; continue; }
        if (xL < 0 && m.signalSampleIndex === target) xL = x;
        else if (xL >= 0 && m.signalSampleIndex !== target) { xR = x; break; }
      }
      if (xL < 0) return null;
      if (xR < 0) xR = Math.min(r.width, xL + 24);
      return { x: Math.round(r.left + Math.floor((xL + xR - 1) / 2)), y: Math.round(r.top + yr), xL: xL, xR: xR, yr: yr };
    };
    return JSON.stringify({ fbit: fbit, fvec: fvec, S: S, len: sig ? sig.values.length : -1,
      tool: tool, beforeTool: beforeTool });
  })()`);
  if (!f0) { check('F: 建立 fbit/fvec 信号', false, '页面能力缺失'); }
  else {
    const F = JSON.parse(f0);
    const st = async () => JSON.parse(await ev(`window.__Fstate()`));
    const vals = async (row) => JSON.parse(await ev(`window.__Fvals(${row})`));
    const p0r = await ev(`window.__Fcell(${F.fvec}, 0)`);
    const p0 = p0r && typeof p0r === 'string' ? JSON.parse(p0r) : p0r; // __Fcell 直接返回对象
    const pSr = await ev(`window.__Fcell(${F.fvec}, ${F.S})`);
    const pS = pSr && typeof pSr === 'string' ? JSON.parse(pSr) : pSr;
    const fClick = async (p) => {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(50);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 });
    };
    const fDrag = async (from, to) => {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(40);
      for (let i = 1; i <= 6; i += 1) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved',
          x: Math.round(from.x + (to.x - from.x) * i / 6),
          y: Math.round(from.y + (to.y - from.y) * i / 6), button: 'left', buttons: 1 });
        await sleep(14);
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
    };
    const sameArr = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);

    check('F: 建立 fbit/fvec（paint 激活、步粒度、stride 已知）',
      F.fbit >= 0 && F.fvec >= 0 && F.fbit !== F.fvec && F.tool === 'paint' && F.S >= 1 && F.len > 0, f0);

    // ---- F1. paint 单击 Vector → 「矢量值」弹窗，不切 select、无框选工具条 ----
    if (!p0) check('F1: 定位 fvec 格', false, '无法定位');
    else {
      await fClick(p0);
      await sleep(450);
      const s1 = await st();
      check('F1: 单击 Vector 弹「矢量值」（核心弹窗 + promptActive）',
        s1.hidden === false && s1.title === '矢量值' && s1.active === true, JSON.stringify(s1));
      check('F1: 不切 select、无框选工具条、无选区',
        s1.tool === 'paint' && s1.bar === false && s1.sel === null, JSON.stringify(s1));

      // ---- F2. 继续在弹窗输入 A → 主步格 = 10、标签 = A（与 E5 同解析口径） ----
      const V0 = await vals(F.fvec);
      await send('Input.insertText', { text: 'A' });
      await key('Enter', 'Enter', 13);
      await sleep(450);
      const s2 = await st();
      const V2 = await vals(F.fvec);
      let okGroup = true;
      for (let i = 0; i < F.S; i += 1) {
        if (V2.values[i] !== 10 || !V2.labels || V2.labels[i] !== 'A') okGroup = false;
      }
      let okOut = true;
      for (let i = F.S; i < V2.values.length; i += 1) {
        if (V2.values[i] !== V0.values[i]) okOut = false;
      }
      check('F2: Vector 输入 A 回车 → 主步格=10、标签=A、弹窗关闭',
        okGroup === true && okOut === true && s2.hidden === true && s2.active === false,
        JSON.stringify({ g: V2.values.slice(0, F.S), l: V2.labels ? V2.labels.slice(0, F.S) : null, s: s2 }));

      // ---- F3. 拖动（>4px）→ 不弹窗、不框选、值不变（阻断核心 vectorSelecting） ----
      const V3 = await vals(F.fvec);
      if (!pS) check('F3: 定位 fvec 第2主步格', false, '无法定位');
      else {
        await fDrag(p0, pS);
        await sleep(400);
        const s3 = await st();
        const V4 = await vals(F.fvec);
        const unchanged = sameArr(V4.values, V3.values) && sameArr(V4.labels, V3.labels);
        check('F3: Vector 拖动不弹窗、不框选、值不变',
          unchanged === true && s3.hidden === true && s3.active === false && s3.bar === false && s3.sel === null,
          JSON.stringify({ s: s3, changed: !unchanged }));
      }

      // ---- F4. Ctrl+单击仍可框选（复用 select 会话）----
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p0.x, y: p0.y, button: 'left', buttons: 1, clickCount: 1, modifiers: 2 });
      await sleep(60);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p0.x, y: p0.y, button: 'left', buttons: 0, clickCount: 1, modifiers: 2 });
      await sleep(450);
      const s4 = await st();
      check('F4: Ctrl+单击 Vector 正常框选 1 主步 + 工具条 + 已切 select',
        s4.sel !== null && s4.sel.signalStart === s4.sel.signalEnd && s4.sel.signalStart === F.fvec
          && s4.sel.sampleStart === 0 && s4.sel.sampleEnd === F.S - 1
          && s4.bar === true && s4.tool === 'select', JSON.stringify(s4));
      await key('Escape', 'Escape', 27);
      await sleep(400);
      const s5 = await st();
      check('F4: Esc 清选框/工具条并自动切回 paint',
        s5.sel === null && s5.bar === false && s5.tool === 'paint', JSON.stringify(s5));

      // ---- F4.5. 会话结束后再单击 Vector 仍弹「矢量值」（不滞留 select 工具）----
      await fClick(p0);
      await sleep(450);
      const s6 = await st();
      check('F4.5: 会话结束后再单击 Vector 仍弹「矢量值」',
        s6.hidden === false && s6.title === '矢量值' && s6.tool === 'paint', JSON.stringify(s6));
      await key('Escape', 'Escape', 27);
      await sleep(300);

      // 收尾：弹窗全关后，把工具恢复到进入 F 前的状态（原本无激活工具 → paint 再点一次取消）
      const sEnd = await st();
      if (F.beforeTool !== 'paint' && sEnd.tool === 'paint') {
        await ev(`(() => { const b = document.querySelector('.tool-btn[data-tool="paint"]'); if (b) b.click(); return 1; })()`);
        await sleep(200);
      }
    }
  }
}

// ---------------------------------------------------------------- D. 步数/子步输入提交时机（PATCH-A6 沉入核心）
// 补丁 era：每键 input 被拦截，change(blur/Enter) 才提交。核心改绑 change 后行为应一致：
// 输入中间态（input 事件）不触发全量重绘；change 一次性提交新步数。
{
  const d0 = await ev(`(() => {
    const s = document.getElementById('sample-spin');
    if (!s) return null;
    s.focus();
    s.select();
    const before = document_wave.m_sampleCount;
    s.value = '8';
    s.dispatchEvent(new Event('input', { bubbles: true }));   // 模拟每键输入
    const mid = document_wave.m_sampleCount;
    s.dispatchEvent(new Event('change', { bubbles: true }));  // 模拟 blur/Enter 提交
    const after = document_wave.m_sampleCount;
    return JSON.stringify({ before, mid, after });
  })()`);
  console.log('  spin 提交时机:', d0);
  if (d0 === null) { check('D: 找到 #sample-spin', false, '元素缺失'); }
  else {
    const D = JSON.parse(d0);
    check('输入中间态不生效（input 不触发 resize）', D.before === D.mid && D.before !== D.after, d0);
    check('change 提交新步数', D.after === 8, d0);
  }
  const d1 = await ev(`(() => {
    const b = document.getElementById('substep-spin');
    if (!b) return null;
    b.focus(); b.select();
    const before = document_wave.m_subStepCount;
    b.value = '2';
    b.dispatchEvent(new Event('input', { bubbles: true }));
    const mid = document_wave.m_subStepCount;
    b.dispatchEvent(new Event('change', { bubbles: true }));
    const after = document_wave.m_subStepCount;
    return JSON.stringify({ before, mid, after });
  })()`);
  console.log('  substep 提交时机:', d1);
  if (d1 === null) { check('D: 找到 #substep-spin', false, '元素缺失'); }
  else {
    const D = JSON.parse(d1);
    check('子步同样 input 不生效 / change 提交', D.before === D.mid && D.after === 2, d1);
  }
}

// ---------------------------------------------------------------- D2. 步数/子步 ▲/▼ 微调按钮（Task3 #90）
// resize.js wireStepSteppers：capture pointerdown 命中 .step-arrow → min/max 内 ±1 →
// 写 spin 值 → 派发 change(bubbles) → 复用下方统一 capture change（resizeSignals，含撤销快照）。
// 与手输/回车完全同通道，不另起第二套 resize。结束时把 spin 复位为模型值，避免残留脏 UI。
{
  const d2 = await ev(`(() => {
    const s = document.getElementById('sample-spin');
    const b = document.getElementById('substep-spin');
    const q = (t, st) => document.querySelector('.step-arrow[data-target="' + t + '"][data-step="' + st + '"]');
    const upS = q('sample-spin', 1), dnS = q('sample-spin', -1);
    const upB = q('substep-spin', 1), dnB = q('substep-spin', -1);
    if (!s || !b || !upS || !dnS || !upB || !dnB) return JSON.stringify({ missing: true });
    const fire = (btn) => btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    const res = { before: [document_wave.m_sampleCount, document_wave.m_subStepCount] };
    const orig = [document_wave.m_sampleCount, document_wave.m_subStepCount];
    // 步数 ▲ → ▼×2：值 ±1/±2 且模型同步提交
    s.value = String(document_wave.m_sampleCount);
    fire(upS); res.sUp = [Number(s.value), document_wave.m_sampleCount];
    fire(dnS); fire(dnS);
    res.sDn = [Number(s.value), document_wave.m_sampleCount];
    // 子步 ▲ → ▼×2
    b.value = String(document_wave.m_subStepCount);
    fire(upB); res.bUp = [Number(b.value), document_wave.m_subStepCount];
    fire(dnB); fire(dnB);
    res.bDn = [Number(b.value), document_wave.m_subStepCount];
    // 下限/上限收敛：4 时 ▼ 不再降、16 时 ▲ 不再升
    s.value = '4'; fire(dnS); res.sMin = [Number(s.value), document_wave.m_sampleCount];
    b.value = '16'; fire(upB); res.bMax = [Number(b.value), document_wave.m_subStepCount];
    // 复位：恢复进入 D2 前的状态（D 段遗留 steps=8/subs=2，E 段依赖 stride=3/steps=8），
    // 用真实 change 走一次 resizeSignals，spin 与模型一起还原，避免污染后续用例。
    s.value = String(orig[0]);
    b.value = String(orig[1]);
    s.dispatchEvent(new Event('change', { bubbles: true }));
    b.dispatchEvent(new Event('change', { bubbles: true }));
    return JSON.stringify(res);
  })()`);
  console.log('  ▲/▼ 微调:', d2);
  if (d2 === null) { check('D2: 找到 ▲/▼ 按钮组', false, '元素缺失'); }
  else {
    const D2 = JSON.parse(d2);
    check('D2: 找到 ▲/▼ 按钮组', !D2.missing, d2);
    if (!D2.missing) {
      check('D2: 步数 ▲ 值+1 且模型提交', D2.sUp[0] === D2.before[0] + 1 && D2.sUp[1] === D2.sUp[0], d2);
      check('D2: 步数 ▼×2 值-2 且模型提交', D2.sDn[0] === D2.before[0] - 1 && D2.sDn[1] === D2.sDn[0], d2);
      check('D2: 子步 ▲ 值+1 且模型提交', D2.bUp[0] === D2.before[1] + 1 && D2.bUp[1] === D2.bUp[0], d2);
      check('D2: 子步 ▼×2 值-2 且模型提交', D2.bDn[0] === D2.before[1] - 1 && D2.bDn[1] === D2.bDn[0], d2);
      check('D2: 步数下限收敛到 4', D2.sMin[0] === 4, d2);
      check('D2: 子步上限收敛到 16', D2.bMax[0] === 16, d2);
    }
  }
}

// ---------------------------------------------------------------- E. 框选（editor/selection.js 重写回归）
// 覆盖 2026-09-03 修复的 5 类 bug 中的 UI 侧 4 类：
//   ① 单击粒度（整步=1 主步 / 子步=1 格）② 反向拖动归一化
//   ③ 私有子步行跨行写值不错位（divisor 口径）④ 多 bit 输入 'A' → 10 而非 0
//   ⑤ 工具条带焦点时连续 2/3 次拖动不再 removeChild/blur 重入（稳定性）
{
  // 扩视口，保证所有行/列都可点
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await ev(`(() => { if (typeof drawWaveform === 'function') drawWaveform(); return 1; })()`);

  // 页面侧：错误收集 + 坐标定位（某行某全局子步格的中心 client 坐标）
  const setupE = await ev(`(() => {
    if (!window.__E) { window.__E = []; window.addEventListener('error', function (e) { window.__E.push(String(e.message || e.type)); }); }
    const dw = document_wave;
    dw.addBitSignal('ebit');
    const ebit = dw.signalList().length - 1;
    dw.addVectorSignal('evec');
    const evec = dw.signalList().length - 1;
    // 私有子步：ebit 行按自己的 divisor(3+1=4) 铺开，其余行跟随全局 stride
    if (typeof dw.setSignalSubSteps === 'function') dw.setSignalSubSteps(ebit, 3);
    if (typeof drawWaveform === 'function') drawWaveform();
    window.__pt = function (row, g) {
      const cv = document.getElementById('wave-canvas');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      function at(x, y) { try { return mapCanvasPosition(x, y); } catch (e) { return null; } }
      // 先找一个「波形行内」的 y（信号行从 ~y=40 才开始，y=10 在表头区）
      let y0 = -1;
      for (let y = 2; y < r.height && y0 < 0; y += 1) { const m = at(Math.max(60, Math.floor(r.width / 2)), y); if (m && m.signalIndex >= 0) y0 = y; }
      if (y0 < 0) return null;
      let xs = -1;
      for (let x = 2; x < r.width && xs < 0; x += 1) { const m = at(x, y0); if (m && !m.clickedOnName && m.signalIndex >= 0) xs = x; }
      if (xs < 0) return null;
      let yr = -1;
      for (let y = 2; y < r.height && yr < 0; y += 1) { const m = at(xs, y); if (m && m.signalIndex === row) { yr = y; break; } }
      if (yr < 0) return null;
      let xL = -1, xR = -1;
      for (let x = xs; x < r.width; x += 1) {
        const m = at(x, yr);
        if (!m) continue;
        if (m.globalSampleIndex === g && xL < 0) xL = x;
        if (xL >= 0 && (m.globalSampleIndex === g + 1 || m.globalSampleIndex > g + 1)) { xR = x; break; }
      }
      if (xL < 0) return null;
      if (xR < 0) xR = Math.min(r.width, xL + 20);
      const xc = Math.floor((xL + xR - 1) / 2);
      return { cx: Math.round(r.left + xc), cy: Math.round(r.top + yr) };
    };
    window.__reg = function () {
      const r = window.__wpf.selection;
      const st = window.__core.state().range;
      return JSON.stringify(r ? { ss: r.signalStart, se: r.signalEnd, ps: r.sampleStart, pe: r.sampleEnd,
        st: { a: st.active, s0: st.startSample, s1: st.endSample } } : null);
    };
    window.__errCount = function () { return window.__E.length; };
    window.__geo = function () {
      const cv = document.getElementById('wave-canvas');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      const rows = [];
      const total = document_wave.signalList().length;
      for (let row = 0; row < total; row += 1) {
        let top = -1, bot = -1;
        for (let y = 2; y < r.height; y += 1) {
          try { const m = mapCanvasPosition(Math.max(60, r.width / 2), y); if (m && m.signalIndex === row) { if (top < 0) top = y; bot = y; } } catch (e) {}
        }
        rows.push(top >= 0 ? top + '..' + bot : 'none');
      }
      return JSON.stringify({ w: r.width, h: r.height, rows: rows });
    };
    return JSON.stringify({ ebit: ebit, evec: evec, stride: window.__wpf.stride(), count: dw.m_sampleCount });
  })()`);
  const E0 = setupE && JSON.parse(setupE);
  check('E: 建立 ebit/evec 信号（私有子步 + 普通）', !!E0 && E0.ebit >= 0 && E0.evec >= 0 && E0.ebit !== E0.evec, setupE);
  const geoDump = await ev(`window.__geo()`);
  console.log('  E 几何: ' + geoDump);
  if (!E0 || E0.ebit < 0 || E0.evec < 0) {
    console.log('  ⚠ E 组前置失败，跳过框选断言');
  } else {
    const S = E0.stride;            // 全局 stride（本用例 3）
    const R = { ebit: E0.ebit, evec: E0.evec };
    check('E: 全局 stride 已知', S >= 2 && S <= 4, setupE);

    // 切到 select 工具 + 整步粒度 + 清残留
    await ev(`(() => { const t = window.__wpf.currentTool(); if (t !== 'select') { const b = document.querySelector('.tool-btn[data-tool="select"]'); if (b) b.click(); } return 1; })()`);
    await sleep(200);
    const toolNow = await ev(`window.__wpf.currentTool()`);
    check('E: 已切到 select 工具', toolNow === 'select', toolNow);
    await ev(`window.__wpf.setEditGranularity('step'); 1`);
    await ev(`(() => { try { window.__core.selection.clear(); } catch (e) {} window.__wpf.selection = null; if (window.__wpf._selAnchor) window.__wpf._selAnchor = null; return 1; })()`);
    await sleep(150);

    const pt = async (row, g) => {
      const r = await ev(`window.__pt(${row}, ${g})`);
      if (!r) return null;
      return typeof r === 'string' ? JSON.parse(r) : r; // __pt 返回对象，ev 已按值返回
    };
    const reg = async () => { const r = await ev(`window.__reg()`); return r ? JSON.parse(r) : null; };
    const clickAt = async (p) => {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.cx, y: p.cy, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(40);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.cx, y: p.cy, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(250);
    };
    const drag = async (from, to) => {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.cx, y: from.cy, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(30);
      for (let i = 1; i <= 5; i += 1) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved',
          x: Math.round(from.cx + (to.cx - from.cx) * i / 5),
          y: Math.round(from.cy + (to.cy - from.cy) * i / 5), button: 'left', buttons: 1 });
        await sleep(12);
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.cx, y: to.cy, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(280);
    };
    const parkBar = async () => { // 把工具条挪到左下角（保持打开+聚焦，避免挡住后续画布点）
      await ev(`(() => { const bar = document.getElementById('wpf-batch-bar'); if (bar) { bar.style.left = '8px'; bar.style.top = Math.max(8, window.innerHeight - 96) + 'px'; } return 1; })()`);
      await sleep(40);
    };
    const barState = async () => ev(`(() => { const bar = document.getElementById('wpf-batch-bar'); return JSON.stringify(bar ? { input: !!bar.querySelector('input'), focus: document.activeElement === bar.querySelector('input') } : null); })()`);

    // ---- E1. 单击（整步粒度）= 框住 1 个主步；核心原生选框状态同步 ----
    const pE1 = await pt(R.evec, S);
    if (!pE1) check('E1: 定位 evec 主步1首格', false, '无法定位');
    else {
      await clickAt(pE1);
      const g1 = await reg();
      const ok1 = g1 && g1.ps === S && g1.pe === 2 * S - 1 && g1.ss === g1.se && g1.ss === R.evec
        && g1.st.a === true && g1.st.s0 === S && g1.st.s1 === 2 * S - 1;
      check('E1: 单击=1 个主步（整步粒度）+ 核心选框同步', ok1 === true, JSON.stringify(g1));
      await key('Escape', 'Escape', 27); await sleep(200);
    }

    // ---- E2. 单击（子步粒度）= 只框 1 格 ----
    await ev(`window.__wpf.setEditGranularity('substep'); 1`);
    await sleep(120);
    const pE2 = await pt(R.evec, S + 1);
    if (!pE2) check('E2: 定位 evec 子步格', false, '无法定位');
    else {
      await clickAt(pE2);
      const g2 = await reg();
      const ok2 = g2 && g2.ps === S + 1 && g2.pe === S + 1 && g2.ss === g2.se && g2.ss === R.evec;
      check('E2: 单击=1 格（子步粒度）', ok2 === true, JSON.stringify(g2));
      await key('Escape', 'Escape', 27); await sleep(200);
    }
    await ev(`window.__wpf.setEditGranularity('step'); 1`); await sleep(120);

    // ---- E3. 反向拖动（右→左）归一化 + 整步对齐 ----
    const pR1 = await pt(R.ebit, 2 * S);     // 主步2 首格
    const pR2 = await pt(R.ebit, S);         // 主步1 首格
    if (!pR1 || !pR2) check('E3: 定位 ebit 拖动点', false, '无法定位');
    else {
      await drag(pR1, pR2); // 反向：起于右、止于左
      const g3 = await reg();
      const ok3 = g3 && g3.ps === S && g3.pe === 3 * S - 1 && g3.ss === g3.se && g3.ss === R.ebit;
      check('E3: 反向拖动归一化且整步对齐到主步边界', ok3 === true, JSON.stringify(g3));
      await key('Escape', 'Escape', 27); await sleep(200);
    }

    // ---- E4. 跨行写值：私有子步行(ebit,div=4) + 普通行(evec,div=3)，'1' 精确落在各行自己的格子上 ----
    const p4a = await pt(R.ebit, S);
    const p4b = await pt(R.evec, 3 * S - 1); // 覆盖主步1..2
    if (!p4a || !p4b) check('E4: 定位跨行拖动点', false, '无法定位');
    else {
      await drag(p4a, p4b);
      const g4 = await reg();
      const ps4 = g4 ? g4.ps : -1, pe4 = g4 ? g4.pe : -1;
      // 记录两行写前值
      const before4 = await ev(`(() => { const dw = document_wave; return JSON.stringify({
        a: dw.signalList()[${R.ebit}].values.slice(), b: dw.signalList()[${R.evec}].values.slice() }); })()`);
      const B4 = JSON.parse(before4);
      await parkBar();
      await ev(`(() => { const bar = document.getElementById('wpf-batch-bar'); if (!bar) return 'NOBAR'; const i = bar.querySelector('input'); if (!i) return 'NOINPUT';
        i.value = '1'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })); return 'ok'; })()`);
      await sleep(300);
      const d4 = await ev(`(() => {
        const dw = document_wave; const s0 = dw.signalList()[${R.ebit}]; const s1 = dw.signalList()[${R.evec}];
        const B0 = ${JSON.stringify(B4.a)}, B1 = ${JSON.stringify(B4.b)};
        const c0 = window.__wpf.cellsInRange(s0, ${ps4}, ${pe4});
        const c1 = window.__wpf.cellsInRange(s1, ${ps4}, ${pe4});
        const ch0 = c0.filter(function (i) { return s0.values[i] !== B0[i]; });
        const ch1 = c1.filter(function (i) { return s1.values[i] !== B1[i]; });
        const extra0 = []; for (let i = 0; i < s0.values.length; i += 1) { if (c0.indexOf(i) < 0 && s0.values[i] !== B0[i]) extra0.push(i); }
        const extra1 = []; for (let i = 0; i < s1.values.length; i += 1) { if (c1.indexOf(i) < 0 && s1.values[i] !== B1[i]) extra1.push(i); }
        return JSON.stringify({ c0: c0.join(','), h0: ch0.join(','), c1: c1.join(','), h1: ch1.join(','),
          e0: extra0.join(','), e1: extra1.join(','), len0: s0.values.length, len1: s1.values.length });
      })()`);
      const D4 = JSON.parse(d4);
      // 私有行 divisor=4 → 主步1..2 恰好 8 格；普通行 divisor=3 → 6 格（硬断言，能抓 divisor 错乱）
      const ok4 = g4 && ps4 === S && pe4 === 3 * S - 1
        && D4.c0 === D4.h0 && D4.c1 === D4.h1
        && D4.e0 === '' && D4.e1 === ''
        && D4.c0.split(',').length === 2 * 4 && D4.c1.split(',').length === 2 * S
        && D4.len0 === 8 * 4 && D4.len1 === 8 * S;
      check('E4: 跨行写 1 —— 私有行 8 格/普通行 6 格、不多不少、无越界', ok4 === true, JSON.stringify(D4));
    }

    // ---- E5. Vector 输入 'A' → 10（而非 0）；标签按 radix 刷新 ----
    await ev(`(() => { const dw = document_wave; const s = dw.signalList()[${R.evec}]; s.radix = window.Radix.Hexadecimal; return 1; })()`);
    await sleep(80);
    const p5a = await pt(R.evec, S);
    const p5b = await pt(R.evec, 3 * S - 1);
    if (!p5a || !p5b) check('E5: 定位 evec 拖动点', false, '无法定位');
    else {
      await drag(p5a, p5b);
      const g5 = await reg();
      await parkBar();
      await ev(`(() => { const bar = document.getElementById('wpf-batch-bar'); if (!bar) return 'NOBAR'; const i = bar.querySelector('input'); if (!i) return 'NOINPUT';
        i.value = 'A'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })); return 'ok'; })()`);
      await sleep(300);
      const d5 = await ev(`(() => {
        const s = document_wave.signalList()[${R.evec}];
        const c = window.__wpf.cellsInRange(s, ${S}, ${3 * S - 1});
        const vals = c.map(function (i) { return s.values[i]; });
        const labs = c.map(function (i) { return s.labels[i]; });
        return JSON.stringify({ vals: vals.join(','), labs: labs.join(','), count: c.length });
      })()`);
      const D5 = JSON.parse(d5);
      const ok5 = D5.count === 2 * S && D5.vals.split(',').every((v) => v === '10') && D5.labs.split(',').every((v) => v === 'A');
      check('E5: Vector 输入 A → 全部格=10（非 0）、标签=A', ok5 === true, d5);
    }

    // ---- E6. 稳定性：工具条带焦点输入时连续第 2、3 次画布拖动 ----
    // 历史 bug：第 2 次拖动 → hideBar removeChild 触发 blur → blur 重入 hideBar
    // → 二次 removeChild 抛 NotFoundError → 拖动中断；且半输入内容被意外提交。
    {
      // 第 1 次拖动 → 工具条出现且输入框聚焦
      const q1a = await pt(R.ebit, S);
      const q1b = await pt(R.ebit, 2 * S - 1);
      if (!q1a || !q1b) check('E6: 定位第1次拖动', false, '无法定位');
      else {
        await drag(q1a, q1b);
        const bs1 = await barState();
        const BS1 = JSON.parse(bs1 || 'null');
        check('E6: 第1次拖动后工具条可见且输入框聚焦', !!BS1 && BS1.input === true && BS1.focus === true, bs1);
        const L0 = Number(await ev('window.__errCount()'));
        // 输入框里留有半输入 '0'（若 blur 被误触提交，第 1 次选区会被写 0）
        await ev(`(() => { const i = document.getElementById('wpf-batch-bar').querySelector('input'); i.value = '0'; return 1; })()`);
        // 第 2 次拖动（画布按下 → detachBar → blur 必须静默返回）
        const q2a = await pt(R.evec, 3 * S);
        const q2b = await pt(R.evec, 4 * S - 1);
        await drag(q2a, q2b);
        const g6b = await reg();
        // ebit 私有 divisor=4：下标 3=主步0末格（E4 未写、恒 0），4..7=主步1（E4 写 1）。
        // slice(3,6) = "0,1,1"；若 blur 误把输入框里的 '0' 提交给第 1 次选区（主步1）
        // 则 4..7 变 0 → "0,0,0"。所以 "0,1,1" 精确证明既无 NotFoundError 也无误提交。
        const d6b = await ev(`(() => { const s = document_wave.signalList()[${R.ebit}];
          return JSON.stringify(s.values.slice(${S}, ${2 * S}).join(',')); })()`);
        const L2 = Number(await ev('window.__errCount()'));
        const bs2 = await barState();
        const BS2 = JSON.parse(bs2 || 'null');
        const expected6b = JSON.stringify([0, 1, 1].join(',')); // ev 里又包了一层 JSON.stringify → 期望含引号
        const ok6b = g6b && g6b.ps === 3 * S && g6b.pe === 4 * S - 1 && g6b.ss === g6b.se && g6b.ss === R.evec
          && d6b === expected6b
          && L2 === L0;
        check('E6: 第2次拖动 —— 无 NotFoundError、无异常、选框正常、未误提交', ok6b === true, JSON.stringify({ g: g6b, d: d6b, L: L2 - L0 }));
        // 第 3 次拖动
        const q3a = await pt(R.evec, 4 * S);
        const q3b = await pt(R.evec, 5 * S - 1);
        await drag(q3a, q3b);
        const g6c = await reg();
        const L3 = Number(await ev('window.__errCount()'));
        const ok6c = g6c && g6c.ps === 4 * S && g6c.pe === 5 * S - 1 && L3 === L0;
        check('E6: 第3次拖动同样稳定', ok6c === true, JSON.stringify({ g: g6c, L: L3 - L0 }));
        // 收尾：Esc 关菜单并清选框
        await key('Escape', 'Escape', 27); await sleep(200);
        const afterEsc = await ev(`JSON.stringify({ sel: window.__wpf.selection, bar: !!document.getElementById('wpf-batch-bar') })`);
        const AE = JSON.parse(afterEsc);
        check('E6: Esc 关菜单并清选框', AE.sel === null && AE.bar === false, afterEsc);
      }
    }
    // E 期间页面错误汇总
    const errs = await ev(`JSON.stringify(window.__E.slice())`);
    console.log('  E 期间页面错误: ' + errs);
    check('E: 页面无运行时错误', JSON.parse(errs).length === 0, errs);
  }
}

// ---------------------------------------------------------------- 收尾
console.log('\n资源加载失败(404等)：' + netFails);
console.log('\n控制台异常：' + (errors.length ? errors.join(' | ') : '无'));
const failed = results.filter((r) => !r.ok);
console.log('结果：' + (results.length - failed.length) + '/' + results.length + ' 通过');
ws.close();
server.kill();
process.exit(failed.length || errors.length || netFails ? 1 : 0);
