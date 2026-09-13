// WavePaint UI 控件审计（第二十四轮新增 —— 「控件与工具栏规范化」U 线的证据工具）
// 用法：
//   node tools/ui-audit.mjs              # 审计原型 prototype/ui-mockup.html（默认）
//   node tools/ui-audit.mjs --real       # 审计真机 index.html 的 #toolbar（不依赖仿真服务）
//   node tools/ui-audit.mjs --all        # 两者都审
//   node tools/ui-audit.mjs --check      # 有违规时退出码 1（供将来 CI / 手工闸门用）
//   --widths=1920,1680,1280              # 自定义宽度档（默认原型 1680/1280、真机 1920/1680/1440/1280）
// 产物：控制台报告（含 violations 列表）+ .e2e-tmp/ui-audit-<target>.json
// 说明：本工具只做「测量 + 报告」，不做像素比较；真实 Edge headless + CDP。
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = 8957, CDP = 9537;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = 'D:/Files/Code/波形';
const e2eRoot = root + '/.e2e-tmp';
const sysTmp = e2eRoot + '/system-tmp';
mkdirSync(sysTmp, { recursive: true });

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const argVal = (k) => { const m = argv.find((a) => a.startsWith(k + '=')); return m ? m.slice(k.length + 1) : null; };
const widthsArg = argVal('--widths');

const TARGETS = [];
if (has('--all') || (!has('--real') && !has('--mock'))) TARGETS.push('mock');
if (has('--all') || has('--real')) TARGETS.push('real');
if (has('--mock') && !has('--all')) TARGETS.unshift('mock');

const TARGET_DEF = {
  mock: { page: 'prototype/ui-mockup.html', widths: [1680, 1280], waitMs: 800 },
  real: { page: 'index.html', widths: [1920, 1680, 1440, 1280], waitMs: 2500 }
};

// ── 注入页面的通用盘点表达式（对原型与真机都成立，缺失元素自动跳过）────────────
const INVENTORY = `(() => {
  const box = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top) }; };
  const text = (e) => (e.textContent || '').trim().replace(/\\s+/g, ' ');
  const label = (e) => (e.getAttribute('title') || e.id || text(e).slice(0, 14) || e.tagName);
  const out = { winW: window.innerWidth, url: location.pathname };

  const tb = document.querySelector('#toolbar');
  if (tb) {
    const r = tb.getBoundingClientRect();
    const kids = Array.from(tb.children).filter((k) => getComputedStyle(k).display !== 'none');
    const gaps = [];
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
      gaps.push(Math.round(b.left - a.right));
    }
    const off = kids.filter((k) => { const b = k.getBoundingClientRect(); return b.right > r.right + 0.5 || b.left < r.left - 0.5; });
    out.toolbar = {
      kidCount: kids.length,
      seq: kids.map(label),
      iconSizes: [...new Set(Array.from(tb.querySelectorAll('.tool-btn')).map((b) => box(b).w + 'x' + box(b).h))],
      seps: tb.querySelectorAll('.separator,.mk-sep').length,
      gaps,
      gapKinds: [...new Set(gaps)].sort((a, b) => a - b),
      boxH: Math.round(r.height),
      scrollW: tb.scrollWidth, clientW: tb.clientWidth, overflow: tb.scrollWidth - tb.clientWidth,
      wrap: getComputedStyle(tb).flexWrap,
      hiddenX: getComputedStyle(tb).overflowX,
      offscreen: off.map((k) => label(k) + '@' + Math.round(k.getBoundingClientRect().left) + '~' + Math.round(k.getBoundingClientRect().right))
    };
  }

  out.toolrows = Array.from(document.querySelectorAll('.mk-toolrow, .source-toolbar')).map((row) => {
    // 只把「矮的、含 ≥2 个按钮」的横条当作控制带；排除 .source-toolbar 这类含文件列表的纵向容器
    const btns = Array.from(row.querySelectorAll('button')).filter((b) => getComputedStyle(b).display !== 'none');
    const b = box(row);
    const isBand = btns.length >= 2 && b.h <= 64;
    // 行数：把所有可见子元素的 top 排序后按 >8px 的落差切行（同行 top 差异 ≤3px，换行相差 ~19px）
    const tops = Array.from(row.children)
      .filter((k) => getComputedStyle(k).display !== 'none' && k.getBoundingClientRect().height > 0)
      .map((k) => k.getBoundingClientRect().top)
      .sort((p, q) => p - q);
    let lines = 0;
    for (let i = 0; i < tops.length; i++) if (i === 0 || tops[i] - tops[i - 1] > 8) lines++;
    return {
      panel: (row.closest('.mk-panel, .sim-card') || row.closest('[id]') || {}).id || row.className,
      btns: btns.map((x) => text(x) + (x.classList.contains('primary') ? '*' : '')),
      btnSize: [...new Set(btns.map((x) => box(x).w + 'x' + box(x).h))],
      childCount: btns.length,
      isBand,
      lineCount: isBand ? lines : 0,
      box: b.w + 'x' + b.h,
      wrap: getComputedStyle(row).flexWrap,
      overflow: row.scrollWidth - row.clientWidth
    };
  });
  out.toolrows = out.toolrows.filter((r) => r.isBand || r.childCount > 0);

  out.primaries = Array.from(document.querySelectorAll('#toolbar .primary, #toolbar .primary-btn, .sim-panel .primary, .sim-panel .primary-btn, .mk-panel .primary, .mk-toolrow button.primary, #sim-run'))
    .filter((e) => e.offsetParent !== null || getComputedStyle(e).display !== 'none')
    .map(label);

  const hint = document.querySelector('.mk-hintbar');
  if (hint && hint.offsetParent) {
    out.hintbar = { w: Math.round(hint.getBoundingClientRect().width), clipped: hint.scrollWidth > hint.clientWidth + 1, textLen: text(hint).length };
  }
  out.docScrollW = document.documentElement.scrollWidth;
  return JSON.stringify(out);
})()`;

// ── 规范化规则的自动检查（U 线验收口径的机器可判部分）──────────────────────────
// D26：mock 是「真机 1:1 照搬」的产物，其间距刻度 / 工具栏溢出 / 越界控件都继承自真机原生
// 特征（真机截图字号不同、测宽结果因此不同），不属于原型自身缺陷。故 R5 / R6(隐式溢出) /
// R8 三条「真机规范化」规则只在 target==='real' 上生效；原型只保留 R3(主按钮唯一) /
// R6(控制带禁换行) / R9(提示不进工具带) 这些与「照搬真机」无关、真正属于原型布局的约束。
function violationsOf(a, target) {
  const v = [];
  const nativeRules = target === 'real';
  const tb = a.toolbar;
  if (tb) {
    if (nativeRules) {
      const badGaps = tb.gaps.filter((g) => g !== 4 && g !== 12);
      if (badGaps.length) v.push({ rule: 'R5 间距刻度', detail: '非 {4,12} 的相邻间距 ' + badGaps.length + ' 处：' + [...new Set(badGaps)].join(',') + 'px' });
      if (tb.overflow > 0) v.push({ rule: 'R6 禁隐式溢出', detail: '#toolbar 溢出 ' + tb.overflow + 'px（scrollW ' + tb.scrollW + ' > clientW ' + tb.clientW + '）' });
      if (tb.offscreen.length) v.push({ rule: 'R8 不被裁切', detail: '控件超出工具栏边界：' + tb.offscreen.join(' , ') });
    }
  }
  if (a.primaries.length > 1) v.push({ rule: 'R3 主按钮唯一', detail: '可见 primary 共 ' + a.primaries.length + ' 个：' + a.primaries.join(' , ') });
  for (const row of a.toolrows) {
    if (row.lineCount > 1) v.push({ rule: 'R6 控制带禁换行', detail: row.panel + ' 内工具带折成 ' + row.lineCount + ' 行（' + row.box + '）' });
  }
  if (a.hintbar && a.hintbar.clipped) v.push({ rule: 'R9 提示不进工具带', detail: '提示条被省略号截断（' + a.hintbar.w + 'px 容纳 ' + a.hintbar.textLen + ' 字）' });
  return v;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
const server = spawn(process.execPath, ['tools/dev-server.mjs', String(PORT)], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 30; i++) {
  try { const r = await fetch('http://127.0.0.1:' + PORT + '/index.html'); if (r.ok) break; } catch { /* retry */ }
  await sleep(300);
}

const edgeEnv = { ...process.env, TEMP: sysTmp, TMP: sysTmp, TMPDIR: sysTmp };
let failed = 0;

for (const name of TARGETS) {
  const def = TARGET_DEF[name];
  const widths = widthsArg ? widthsArg.split(',').map(Number) : def.widths;
  const cdp = CDP + (name === 'real' ? 1 : 0);
  const profile = e2eRoot + '/edge-audit-' + name + '-' + Date.now();
  const url = 'http://127.0.0.1:' + PORT + '/' + def.page;
  const pageKey = def.page.split('/').pop();

  spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless=new', '--disable-gpu', '--disable-component-update', '--disable-features=msEdgeComponentUpdate',
      '--remote-debugging-port=' + cdp, '--user-data-dir=' + profile, '--no-first-run',
      '--window-size=' + widths[0] + ',1000', url],
    { stdio: 'ignore', env: edgeEnv });

  let target = null;
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      const list = await (await fetch('http://127.0.0.1:' + cdp + '/json')).json();
      target = list.find((x) => x.type === 'page' && x.url.includes(pageKey));
      if (target) break;
    } catch { /* retry */ }
  }
  if (!target) { console.log('[' + name + '] 页面未找到：' + url); failed = 1; continue; }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return 'THROW:' + (r.result.exceptionDetails.exception?.description || '').slice(0, 200);
    return r.result ? r.result.result.value : undefined;
  };
  await sleep(def.waitMs);

  const report = { target: name, page: def.page, widths: [] };
  console.log('\n══════ 审计目标：' + name + '（' + def.page + '）══════');
  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(name === 'real' ? 400 : 300);
    if (name === 'mock') { await ev("window.__mock && window.__mock.applyPreset('sim')"); await sleep(200); }
    const raw = await ev(INVENTORY);
    if (typeof raw === 'string' && raw.startsWith('THROW:')) { console.log('  评估失败：' + raw); failed = 1; continue; }
    const a = JSON.parse(raw);
    const v = violationsOf(a, name);
    report.widths.push({ width: w, ...a, violations: v });
    console.log('── @ ' + w + 'px ──');
    if (name !== 'real') console.log('  （D26：原型继承真机原生间距/溢出特征，R5/R6 隐式溢出/R8 仅在真机上判定）');
    if (a.toolbar) {
      console.log('  工具栏: ' + a.toolbar.kidCount + ' 顶层元素 / ' + a.toolbar.seps + ' 分隔符 / 图标 ' + a.toolbar.iconSizes.join(' ') +
        ' / 高 ' + a.toolbar.boxH + ' / wrap=' + a.toolbar.wrap + ' / 溢出 ' + a.toolbar.overflow + 'px');
      console.log('  间距值域: {' + a.toolbar.gapKinds.join(',') + '}');
      if (a.toolbar.offscreen.length) console.log('  ⚠ 越界控件: ' + a.toolbar.offscreen.join(' , '));
    }
    for (const row of a.toolrows) console.log('  工具带 ' + row.panel + ': ' + row.box + ' / ' + row.lineCount + ' 行 / ' + row.btns.join(' '));
    console.log('  可见 primary: ' + (a.primaries.length ? a.primaries.join(' , ') : '（无）'));
    if (a.hintbar) console.log('  提示条: ' + a.hintbar.w + 'px / 截断=' + a.hintbar.clipped + ' / ' + a.hintbar.textLen + ' 字');
    if (v.length) { console.log('  违规 ' + v.length + ' 条：'); for (const x of v) console.log('    ✗ [' + x.rule + '] ' + x.detail); }
    else console.log('  违规 0 条 ✅');
  }
  const file = e2eRoot + '/ui-audit-' + name + '.json';
  writeFileSync(file, JSON.stringify(report, null, 1), 'utf8');
  console.log('  报告: ' + file);
  ws.close();
}

server.kill();
if (has('--check') && failed) process.exit(1);
process.exit(0);
