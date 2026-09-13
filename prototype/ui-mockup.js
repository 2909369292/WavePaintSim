/* ============================================================================
 * WavePaint UI 原型逻辑（mock）—— 停靠布局引擎 + 浮出 + 预设 + 持久化
 * ----------------------------------------------------------------------------
 * 目的：给用户 review「Verdi 式多窗格 + Word 式自由拖拽」的**形态**。
 * 说明：本文件只服务于 prototype/ 原型页，内容全是假数据；不连接仿真服务，
 *       不改动 index.html / js/**，不进入 exe 内嵌资源清单（见 tools/gen-resources.mjs）。
 * 布局模型：
 *   split 节点 {kind:'split', dir:'row'|'col', sizes:[..], children:[..]}
 *   tabs  节点 {kind:'tabs',  id:'z-xxx', panels:['wave',...], active:'wave'}
 *   sizes 为归一化比例（和为 1）；拖分隔条时按像素换算，最小尺寸保护。
 * ========================================================================== */
'use strict';

/* ── 1. 面板登记表 ──────────────────────────────────────────────────── */
const PANELS = {
  wave:    { title: '波形' },
  source:  { title: 'Verilog / SV 源码' },
  rtl:     { title: 'RTL 结构树' },
  vcd:     { title: 'VCD 信号层次' },
  tb:      { title: 'Testbench' },
  console: { title: '控制台' },
  files:   { title: '源文件' },
  props:   { title: '端口 / 模块' },
};
const PANEL_ORDER = ['wave', 'source', 'rtl', 'vcd', 'tb', 'console', 'files', 'props'];
const HOME_ZONE = { wave: 'z-center', source: 'z-right', rtl: 'z-left', vcd: 'z-left',
  tb: 'z-right', console: 'z-bottom', files: 'z-left', props: 'z-right' };

/* ── 2. 布局树 / 预设 ───────────────────────────────────────────────── */
let seq = 0;
const tabs = (panels, active) => ({ kind: 'tabs', id: 'z-' + (++seq), panels: panels.slice(), active: active || panels[0] });
const split = (dir, sizes, children) => ({ kind: 'split', dir, sizes: sizes.slice(), children });

function presetSim() {
  return split('col', [0.74, 0.26], [
    split('row', [0.19, 0.55, 0.26], [
      tabs(['rtl', 'vcd'], 'rtl'),
      tabs(['wave'], 'wave'),
      tabs(['source', 'tb'], 'source'),
    ]),
    tabs(['console'], 'console'),
  ]);
}
function presetEdit() {
  return split('col', [0.76, 0.24], [
    split('row', [0.18, 0.56, 0.26], [
      tabs(['rtl', 'files'], 'rtl'),
      tabs(['source', 'wave'], 'source'),
      tabs(['props'], 'props'),
    ]),
    tabs(['console'], 'console'),
  ]);
}
function presetReview() {
  const t = split('col', [0.72, 0.28], [
    split('row', [0.16, 0.58, 0.26], [
      tabs(['rtl', 'vcd'], 'vcd'),
      tabs(['wave', 'source'], 'wave'),
      tabs(['source', 'tb'], 'source'),
    ]),
    tabs(['console'], 'console'),
  ]);
  return t;
}
const PRESETS = { sim: presetSim, edit: presetEdit, review: presetReview };
const PRESET_NAME = { sim: '仿真', edit: '编辑', review: '审阅' };

let root = presetSim();
let floats = {};                  // id -> {x,y,w,h,max}
let hidden = [];                  // 未显示的面板 id
let preset = 'sim';
let lastDock = {};                // id -> {tabsId, index}

/* ── 3. 布局树工具 ──────────────────────────────────────────────────── */
function eachTabs(node, fn) {
  if (!node) return;
  if (node.kind === 'tabs') { fn(node); return; }
  node.children.forEach((c) => eachTabs(c, fn));
}
function allTabsIds() { const out = []; eachTabs(root, (n) => out.push(n.id)); return out; }
function findTabs(node, id) {
  if (!node) return null;
  if (node.kind === 'tabs') return node.id === id ? node : null;
  for (const c of node.children) { const r = findTabs(c, id); if (r) return r; }
  return null;
}
function findTabsOfPanel(node, panelId) {
  let hit = null;
  eachTabs(node, (n) => { if (!hit && n.panels.includes(panelId)) hit = n; });
  return hit;
}
function prune(node) {
  if (!node) return null;
  if (node.kind === 'tabs') return node.panels.length ? node : null;
  const kids = [], sizes = [];
  node.children.forEach((c, i) => {
    const k = prune(c);
    if (k) { kids.push(k); sizes.push(node.sizes[i]); }
  });
  if (!kids.length) return null;
  if (kids.length === 1) return kids[0];
  node.children = kids;
  const sum = sizes.reduce((a, b) => a + b, 0) || 1;
  node.sizes = sizes.map((s) => s / sum);
  return node;
}
function removePanel(panelId) {
  const owner = findTabsOfPanel(root, panelId);
  if (!owner) return;
  const idx = owner.panels.indexOf(panelId);
  lastDock[panelId] = { tabsId: owner.id, index: idx };
  owner.panels.splice(idx, 1);
  if (owner.active === panelId) owner.active = owner.panels[Math.min(idx, owner.panels.length - 1)] || null;
  root = prune(root) || presetSim();
}
function insertTab(tabsId, panelId, index) {
  const target = findTabs(root, tabsId);
  if (!target) return false;
  const i = Math.max(0, Math.min(index == null ? target.panels.length : index, target.panels.length));
  target.panels.splice(i, 0, panelId);
  target.active = panelId;
  return true;
}
function replaceNode(target, replacement) {
  if (root === target) { root = replacement; return true; }
  let done = false;
  (function walk(n) {
    if (done || n.kind === 'tabs') return;
    n.children.forEach((c, i) => {
      if (done) return;
      if (c === target) { n.children[i] = replacement; done = true; return; }
      walk(c);
    });
  })(root);
  return done;
}
function splitAt(tabsId, side, panelId) {
  const target = findTabs(root, tabsId);
  if (!target) return false;
  const horiz = side === 'left' || side === 'right';
  const dir = horiz ? 'row' : 'col';
  const before = (side === 'left' || side === 'top');
  // 找 target 的父 split（若能直接容纳该方向，就插成兄弟）
  let parent = null, pidx = -1;
  (function walk(n) {
    if (parent || n.kind === 'tabs') return;
    n.children.forEach((c, i) => { if (parent) return; if (c === target) { parent = n; pidx = i; return; } walk(c); });
  })(root);
  if (parent && parent.dir === dir) {
    const share = Math.max(0.12, parent.sizes[pidx] * 0.34);
    parent.sizes[pidx] -= share;
    parent.children.splice(before ? pidx : pidx + 1, 0, tabs([panelId], panelId));
    parent.sizes.splice(before ? pidx : pidx + 1, 0, share);
    return true;
  }
  const fresh = tabs([panelId], panelId);
  const node = before ? split(dir, [0.32, 0.68], [fresh, target]) : split(dir, [0.68, 0.32], [target, fresh]);
  return replaceNode(target, node);
}
function topHost(dir) {
  if (root.kind === 'split' && root.dir === dir) return root;
  if (root.kind === 'split') { for (const c of root.children) if (c.kind === 'split' && c.dir === dir) return c; }
  return null;
}
function addRootEdge(side, panelId) {
  const fresh = tabs([panelId], panelId);
  if (side === 'bottom' || side === 'top') {
    let host = topHost('col');
    if (!host) { root = split('col', [0.76, 0.24], [root, fresh]); return true; }
    if (host === root) {
      root.sizes = root.sizes.map((s) => s * 0.78);
      if (side === 'top') { root.children.unshift(fresh); root.sizes.unshift(0.22); }
      else { root.children.push(fresh); root.sizes.push(0.22); }
      return true;
    }
    const share = 0.78 / Math.max(1, host.children.length);
    host.sizes = host.sizes.map((s) => s * 0.78);
    if (side === 'top') { host.children.unshift(fresh); host.sizes.unshift(0.22); }
    else { host.children.push(fresh); host.sizes.push(0.22); }
    return true;
  }
  let host = topHost('row');
  if (!host) { root = split('row', side === 'left' ? [0.22, 0.78] : [0.78, 0.22], side === 'left' ? [fresh, root] : [root, fresh]); return true; }
  if (host === root) {
    root.sizes = root.sizes.map((s) => s * 0.8);
    if (side === 'left') { root.children.unshift(fresh); root.sizes.unshift(0.2); }
    else { root.children.push(fresh); root.sizes.push(0.2); }
    return true;
  }
  host.sizes = host.sizes.map((s) => s * 0.8);
  if (side === 'left') { host.children.unshift(fresh); host.sizes.unshift(0.2); }
  else { host.children.push(fresh); host.sizes.push(0.2); }
  return true;
}
function placePanel(panelId, target) {
  removePanel(panelId);
  if (!target) return false;
  if (target.type === 'tab') return insertTab(target.tabsId, panelId, target.index);
  if (target.type === 'split') return splitAt(target.tabsId, target.side, panelId);
  if (target.type === 'edge') return addRootEdge(target.side, panelId);
  return false;
}
function visiblePanels() {
  const out = [];
  eachTabs(root, (n) => n.panels.forEach((p) => out.push(p)));
  Object.keys(floats).forEach((p) => out.push(p));
  return out;
}

/* ── 4. 面板内容（全部假数据）───────────────────────────────────────── */
const WAVE_W = 1000, ROW_H = 34, PAD = 8;
function clockSegs(period) {
  const out = []; let v = 0;
  for (let t = 0; t < WAVE_W; t += period) { out.push([t, Math.min(t + period, WAVE_W), v]); v = v ? 0 : 1; }
  return out;
}
function gridSvg() {
  let s = '';
  for (let i = 1; i <= 10; i++) s += `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${ROW_H}" stroke="#e6efe6" stroke-width="1"/>`;
  return s;
}
function bitsSvg(segs, color) {
  const yHi = PAD, yLo = ROW_H - PAD;
  let d = '';
  segs.forEach(([a, b, v], i) => {
    const y = v ? yHi : yLo;
    d += (i === 0 ? `M${a} ${y}` : `L${a} ${y}`) + `L${b} ${y}`;
  });
  return `<svg viewBox="0 0 ${WAVE_W} ${ROW_H}">${gridSvg()}` +
    `<path d="${d}" fill="none" stroke="${color || '#2e7d32'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}
function busSvg(vals) {
  const yHi = PAD + 1, yLo = ROW_H - PAD - 1, sl = 6;
  let s = gridSvg();
  vals.forEach(([a, b, v]) => {
    s += `<path d="M${a + sl} ${yHi} L${b - sl} ${yHi} L${b} ${yLo} L${a} ${yLo} Z" ` +
      `fill="rgba(46,125,50,.10)" stroke="#2e7d32" stroke-width="1.1"/>` +
      `<text x="${(a + b) / 2}" y="${ROW_H / 2 + 4}" text-anchor="middle" ` +
      `font-family="Consolas,monospace" font-size="11" fill="#1f4d22">${v}</text>`;
  });
  return `<svg viewBox="0 0 ${WAVE_W} ${ROW_H}">${s}</svg>`;
}
const SIGS = [
  { name: 'clk', w: 1, kind: 'bits', segs: clockSegs(50), bad: '' },
  { name: 'rst_n', w: 1, kind: 'bits', segs: [[0, 180, 0], [180, WAVE_W, 1]] },
  { name: 'state', w: 3, kind: 'bus', vals: [[0, 140, 'IDLE'], [140, 380, 'FETCH'], [380, 700, 'EXEC'], [700, WAVE_W, 'DONE']] },
  { name: 'valid', w: 1, kind: 'bits', segs: [[0, 120, 0], [120, 700, 1], [700, 820, 1], [820, 860, 0], [860, WAVE_W, 0]] },
  { name: 'data', w: 8, kind: 'bus', vals: [[0, 150, '00'], [150, 330, 'A5'], [330, 560, '3F'], [560, 820, '7E'], [820, WAVE_W, '00']] },
  { name: 'addr', w: 16, kind: 'bus', vals: [[0, 200, '0000'], [200, 520, '0010'], [520, 820, '0014'], [820, WAVE_W, '0000']] },
  { name: 'cnt', w: 12, kind: 'bus', vals: [[0, 60, '000'], [60, 220, '001'], [220, 380, '002'], [380, 540, '003'], [540, 700, '004'], [700, 860, '005'], [860, WAVE_W, '006']] },
];
function panelWave() {
  const names = SIGS.map((s, i) =>
    `<div class="mk-name-row${i % 2 ? ' alt' : ''}${i === 4 ? ' sel' : ''}">` +
    `<span class="mk-color-chip"></span><span class="mk-sig">${s.name}</span>` +
    (s.w > 1 ? `<span class="mk-width-badge">[${s.w - 1}:0]</span>` : `<span class="mk-width-badge">bit</span>`) +
    `</div>`).join('');
  const rows = SIGS.map((s, i) =>
    `<div class="mk-track-row${i % 2 ? ' alt' : ''}${i === 4 ? ' sel' : ''}" data-row="${i}">` +
    (s.kind === 'bits' ? bitsSvg(s.segs) : busSvg(s.vals)) + `</div>`).join('');
  let ticks = '';
  for (let i = 0; i <= 10; i++) ticks += `<div class="mk-wave-tick" style="left:${i * 100}px"><span>${i * 100}ns</span></div>`;
  // U0-R：波形面板不再有子工具带，全部绘图/编辑控件回到 L1 统一工具带
  return `<div class="mk-wave">
      <div class="mk-wave-scroll">
        <div class="mk-wave-names" id="mk-name-col">
          <div class="mk-wave-names-head">信号名 / 位宽</div>${names}
        </div>
        <div class="mk-wave-name-split" id="mk-name-split"></div>
        <div class="mk-wave-tracks" id="mk-tracks">
          <div class="mk-wave-tracks-inner">
            <div class="mk-track-row" style="height:24px;background:var(--header-bg)"></div>
            ${rows}
            <div class="mk-cursor" id="mk-cursor" data-t="420ns" style="left:420px"></div>
          </div>
        </div>
      </div>
      <div class="mk-taxis">
        <div class="mk-taxis-pad">时间轴</div>
        <div class="mk-taxis-scroll"><div class="mk-taxis-inner">${ticks}</div></div>
      </div>
    </div>`;
}
const CODE_LINES = [
  '<span class="mk-kw">module</span> <span class="mk-id">fifo_ctrl</span> <span class="mk-anno" style="left:210px;top:2px">双击变量名 → 直接加入波形（仿 nWave 中追）</span>',
  '  <span class="mk-kw">input</span>  <span class="mk-kw">wire</span> <span class="mk-id">clk</span>,',
  '  <span class="mk-kw">input</span>  <span class="mk-kw">wire</span> <span class="mk-id">rst_n</span>,',
  '  <span class="mk-kw">input</span>  <span class="mk-kw">wire</span> [<span class="mk-num">7</span>:<span class="mk-num">0</span>] <span class="mk-id">data_in</span>,',
  '  <span class="mk-kw">output</span> <span class="mk-kw">reg</span>  [<span class="mk-num">7</span>:<span class="mk-num">0</span>] <span class="mk-id">data_out</span>',
  ');',
  '',
  '  <span class="mk-kw">localparam</span> IDLE = <span class="mk-num">3</span>\'d0, RUN = <span class="mk-num">3</span>\'d1;',
  '  <span class="mk-kw">reg</span> [<span class="mk-num">2</span>:<span class="mk-num">0</span>] <span class="mk-id">state</span>, <span class="mk-id">nstate</span>;',
  '  <span class="mk-kw">reg</span> [<span class="mk-num">11</span>:<span class="mk-num">0</span>] <span class="mk-id">cnt</span>;',
  '',
  '  <span class="mk-kw">always</span> @(<span class="mk-kw">posedge</span> <span class="mk-id">clk</span> <span class="mk-kw">or</span> <span class="mk-kw">negedge</span> <span class="mk-id">rst_n</span>) <span class="mk-kw">begin</span>',
  '    <span class="mk-kw">if</span> (!<span class="mk-id">rst_n</span>) <span class="mk-kw">begin</span> <span class="mk-id">state</span> &lt;= IDLE; <span class="mk-id">cnt</span> &lt;= <span class="mk-num">0</span>; <span class="mk-kw">end</span>',
  '    <span class="mk-kw">else</span> <span class="mk-kw">begin</span>',
  '      <span class="mk-id">state</span> &lt;= <span class="mk-id">nstate</span>;',
  '      <span class="mk-id">cnt</span>   &lt;= <span class="mk-id">cnt</span> + <span class="mk-num">1</span>\'b1;   <span class="mk-cmt">// 计数器</span>',
  '    <span class="mk-kw">end</span>',
  '  <span class="mk-kw">end</span>',
  '',
  '  <span class="mk-kw">assign</span> <span class="mk-id">data_out</span> = <span class="mk-id">data_in</span> ^ {<span class="mk-num">8</span>{<span class="mk-id">valid</span>}};',
  '<span class="mk-kw">endmodule</span>',
];
function panelSource() {
  const gutter = CODE_LINES.map((_, i) => i + 1).join('\n');
  // L3 源码面板上下文带：不再重复「运行仿真」（R2 —— 全应用唯一入口在 L1）
  return `<div class="mk-toolrow">
      <div class="mk-tbg"><button>打开…</button><button>保存</button></div>
      <div class="mk-tbg"><button>解析 RTL</button><button>生成 TB</button></div>
      <div class="mk-tbg mk-ovf">
        <button type="button" class="tool-btn mk-ovf-btn" title="更多（本带放不下的整组控件收在这里）">⋯</button>
        <div class="mk-ovf-menu"></div>
      </div>
    </div>
    <div class="mk-code">
      <div class="mk-gutter">${gutter}</div>
      <div class="mk-code-body">${CODE_LINES.join('\n')}</div>
    </div>`;
}
function panelRtl() {
  const row = (depth, text, cls, extra) =>
    `<div class="mk-node-row ${cls || ''}" style="padding-left:${6 + depth * 14}px">` +
    `<span class="mk-tw">${extra && extra.tw ? extra.tw : ''}</span>${text}` +
    `${extra && extra.w ? `<span class="mk-w">${extra.w}</span>` : ''}</div>`;
  return `<div class="mk-toolrow">
      <div class="mk-tbg"><button>展开全部</button><button>折叠全部</button></div>
      <div class="mk-tbg mk-ovf">
        <button type="button" class="tool-btn mk-ovf-btn" title="更多（本带放不下的整组控件收在这里）">⋯</button>
        <div class="mk-ovf-menu"></div>
      </div>
    </div>
    <div class="mk-tree">
      ${row(0, '<span class="mk-scope">▾</span> fifo_ctrl.v')}
      ${row(1, '<span class="mk-scope">▾</span> <b>fifo_ctrl</b>（顶层）', '', { w: 'module' })}
      ${row(2, '<span class="mk-scope">▾</span> u_fifo : <span class="mk-scope">fifo_core</span>', 'inst', { w: 'inst' })}
      ${row(3, 'u_ram : <span class="mk-scope">sram_1rw</span>', 'inst', { w: 'inst' })}
      ${row(3, 'u_ptr : <span class="mk-scope">ptr_ctrl</span>', 'inst', { w: 'inst' })}
      ${row(2, 'u_arb : <span class="mk-scope">arbiter</span>', 'inst', { w: 'inst' })}
      ${row(1, '<span class="mk-scope">▸</span> <b>fifo_core</b>', '', { w: 'module' })}
      ${row(1, '<span class="mk-scope">▸</span> <b>sram_1rw</b>', '', { w: 'module' })}
      ${row(0, '<span class="mk-scope">▸</span> tb_fifo.v')}
      ${row(1, '<span class="mk-scope">▸</span> <b>tb</b>', '', { w: 'module' })}
    </div>`;
}
function panelVcd() {
  const sig = (depth, name, w, hot) =>
    `<div class="mk-node-row sig${hot ? ' hot' : ''}" style="padding-left:${6 + depth * 14}px">` +
    `<span class="mk-tw"></span>${name}<span class="mk-w">${w}</span></div>`;
  return `<div class="mk-toolrow">
      <div class="mk-tbg"><button>全部加入波形</button><button>过滤…</button></div>
      <div class="mk-tbg mk-ovf">
        <button type="button" class="tool-btn mk-ovf-btn" title="更多（本带放不下的整组控件收在这里）">⋯</button>
        <div class="mk-ovf-menu"></div>
      </div>
    </div>
    <div class="mk-tree">
      <div class="mk-node-row"><span class="mk-tw">▾</span><span class="mk-scope">tb</span><span class="mk-path">tb</span></div>
      <div class="mk-node-row"><span class="mk-tw">▾</span><span class="mk-scope">dut</span><span class="mk-path">tb.dut</span></div>
      ${sig(2, 'clk', 'bit')}
      ${sig(2, 'rst_n', 'bit')}
      ${sig(2, 'state', '[2:0]')}
      ${sig(2, 'valid', 'bit')}
      ${sig(2, 'data', '[7:0]', true)}
      ${sig(2, 'addr', '[15:0]')}
      ${sig(2, 'cnt', '[11:0]')}
    </div>`;
}
function panelTb() {
  return `<div class="mk-toolrow">
      <div class="mk-tbg"><button>自动生成</button><button>手动编辑</button></div>
      <div class="mk-tbg"><button>复制</button><button>导出 .sv</button></div>
      <div class="mk-tbg mk-ovf">
        <button type="button" class="tool-btn mk-ovf-btn" title="更多（本带放不下的整组控件收在这里）">⋯</button>
        <div class="mk-ovf-menu"></div>
      </div>
    </div>
    <pre class="mk-pre">\`timescale 1ns/1ps
module tb;
  reg         clk = 0;
  reg         rst_n = 0;
  reg  [7:0]  data_in = 8'h00;
  wire [7:0]  data_out;

  fifo_ctrl dut (.clk(clk), .rst_n(rst_n), .data_in(data_in), .data_out(data_out));

  always #5 clk = ~clk;              // 10ns 周期

  initial begin
    $dumpfile("wave_out.vcd");
    $dumpvars(0, tb);
    #20 rst_n = 1;
    #40 data_in = 8'hA5;
    #80 data_in = 8'h3F;
    #200 $finish;
  end
endmodule</pre>`;
}
function panelConsole() {
  return `<div class="mk-console"><span class="c-cmd">$ iverilog -g2012 -s tb -o sim.vvp fifo_ctrl.v tb_fifo.v</span>
<span class="c-dim">  本地仿真服务 127.0.0.1:17817 · 引擎 ivl 12.0</span>
<span class="c-ok">[编译] 成功（0 error / 0 warning）→ sim.vvp</span>
<span class="c-cmd">$ vvp sim.vvp</span>
<span class="c-warn">[警告] fifo_ctrl.v:23: 位宽隐式扩展 (8 → 12)</span>
<span class="c-ok">[仿真] 完成 @ 200ns · VCD 2.1 KB / 7 条信号</span>
<span class="c-dim">[回传] wave_out.vcd 已解析 → 波形窗口 7 条信号</span>
<span class="c-dim">就绪。</span></div>`;
}
function panelFiles() {
  const f = (n, a) => `<span class="mk-file${a ? ' active' : ''}">${n}<span class="x">✕</span></span>`;
  return `<div class="mk-toolrow">
      <div class="mk-tbg"><button>添加文件</button><button>导入源码…</button><button>移除文件</button></div>
      <div class="mk-tbg" data-ovp="1"><button>解析 RTL</button><button>自动加信号</button><button>生成 TB</button></div>
      <div class="mk-tbg mk-ovf">
        <button type="button" class="tool-btn mk-ovf-btn" title="更多（本带放不下的整组控件收在这里）">⋯</button>
        <div class="mk-ovf-menu"></div>
      </div>
    </div>
    <div class="mk-filelist">${f('fifo_ctrl.v', 1)}${f('fifo_core.v')}${f('tb_fifo.v')}</div>
    <div class="mk-table"><table>
      <tr><th>顶层候选</th><th>未被例化</th></tr>
      <tr><td>fifo_ctrl</td><td>✔</td></tr>
      <tr><td>fifo_core</td><td>—</td></tr>
    </table></div>`;
}
function panelProps() {
  const d = (k) => `<span class="mk-dir ${k}">${k === 'in' ? 'input' : k === 'out' ? 'output' : 'inout'}</span>`;
  return `<div class="mk-toolrow">
      <div class="mk-tbg"><button>全部加入波形</button></div>
      <div class="mk-tbg mk-ovf">
        <button type="button" class="tool-btn mk-ovf-btn" title="更多（本带放不下的整组控件收在这里）">⋯</button>
        <div class="mk-ovf-menu"></div>
      </div>
    </div>
    <div class="mk-table"><table>
      <tr><th>端口</th><th>方向</th><th>位宽</th><th>类型</th></tr>
      <tr><td>clk</td><td>${d('in')}</td><td>1</td><td>wire</td></tr>
      <tr><td>rst_n</td><td>${d('in')}</td><td>1</td><td>wire</td></tr>
      <tr><td>data_in</td><td>${d('in')}</td><td>[7:0]</td><td>wire</td></tr>
      <tr><td>data_out</td><td>${d('out')}</td><td>[7:0]</td><td>reg</td></tr>
      <tr><td colspan="4" style="color:var(--text-muted)">参数：WIDTH=8（默认）· DEPTH=16</td></tr>
    </table></div>`;
}
const RENDER = { wave: panelWave, source: panelSource, rtl: panelRtl, vcd: panelVcd,
  tb: panelTb, console: panelConsole, files: panelFiles, props: panelProps };

/* ── 5. 渲染 ────────────────────────────────────────────────────────── */
const wb = document.getElementById('workbench');
const floatsLayer = document.getElementById('mk-floats');
const dropEl = document.getElementById('mk-drop');
const caretEl = document.getElementById('mk-caret');
let focusedTabsId = null;

function render() {
  wb.querySelectorAll(':scope > .mk-split').forEach((el) => el.remove());
  wb.insertBefore(buildNode(root), floatsLayer);
  renderFloats();
  updateStatus();
  setupBands();
}
function buildNode(node) {
  if (node.kind === 'tabs') return buildGroup(node);
  const el = document.createElement('div');
  el.className = 'mk-split ' + node.dir;
  node.children.forEach((child, i) => {
    if (i > 0) {
      const h = document.createElement('div');
      h.className = 'mk-handle ' + (node.dir === 'row' ? 'v' : 'h');
      h.dataset.splitIdx = String(i - 1);
      h.title = '拖拽调整比例';
      h.addEventListener('pointerdown', (ev) => startSplitDrag(ev, node, i - 1, el));
      el.appendChild(h);
    }
    const slot = document.createElement('div');
    slot.className = 'mk-slot';
    slot.style.flex = node.sizes[i] + ' 1 0';
    slot.appendChild(buildNode(child));
    el.appendChild(slot);
  });
  return el;
}
function buildGroup(node) {
  const el = document.createElement('div');
  el.className = 'mk-group' + (focusedTabsId === node.id ? ' focused' : '');
  el.dataset.tabsId = node.id;
  el.addEventListener('pointerdown', () => { focusedTabsId = node.id; });

  const bar = document.createElement('div');
  bar.className = 'mk-tabbar';
  bar.dataset.tabbar = node.id;
  node.panels.forEach((pid, i) => {
    const t = document.createElement('div');
    t.className = 'mk-tab' + (node.active === pid ? ' active' : '');
    t.dataset.panel = pid;
    t.dataset.tabIndex = String(i);
    t.title = PANELS[pid].title + '（拖动停靠 / 中键或双击浮出）';
    t.textContent = PANELS[pid].title;
    const x = document.createElement('span');
    x.className = 'mk-tab-x';
    x.textContent = '✕';
    x.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    x.addEventListener('click', (ev) => { ev.stopPropagation(); hidePanel(pid); });
    t.appendChild(x);
    t.addEventListener('click', () => { node.active = pid; focusedTabsId = node.id; render(); });
    t.addEventListener('dblclick', (ev) => { ev.preventDefault(); floatPanel(pid); });
    t.addEventListener('auxclick', (ev) => { if (ev.button === 1) { ev.preventDefault(); floatPanel(pid); } });
    t.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      startPanelDrag(ev, pid, node.id);
    });
    bar.appendChild(t);
  });
  const btns = document.createElement('div');
  btns.className = 'mk-grp-btns';
  const mk = (label, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.title = title;
    b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); });
    return b;
  };
  const act = node.active;
  btns.appendChild(mk('⧉', '浮出当前面板', () => act && floatPanel(act)));
  btns.appendChild(mk('▣', '最大化 / 还原（浮出为最大）', () => act && floatPanel(act, { max: true })));
  btns.appendChild(mk('✕', '关闭当前面板', () => act && hidePanel(act)));
  bar.appendChild(btns);
  el.appendChild(bar);

  const body = document.createElement('div');
  body.className = 'mk-panel';
  const pid = node.active || node.panels[0];
  if (pid) body.innerHTML = RENDER[pid]();
  el.appendChild(body);
  if (pid === 'wave') afterWave(body);
  return el;
}

/* 波形面板内的三个小交互：游标拖动 + 信号名列宽 + 时间轴随横滚同步 */
function afterWave(scope) {
  const cursor = scope.querySelector('#mk-cursor');
  const tracks = scope.querySelector('#mk-tracks');
  if (cursor && tracks) {
    cursor.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      cursor.setPointerCapture(ev.pointerId);
      const move = (e) => {
        // 以滚动视口 tracks 的左上为基准，再补上自身 scrollLeft（视觉位置 = t - scrollLeft）
        const r = tracks.getBoundingClientRect();
        const t = Math.max(0, Math.min(WAVE_W, e.clientX - r.left + tracks.scrollLeft));
        cursor.style.left = t + 'px';
        cursor.dataset.t = Math.round(t) + 'ns';
      };
      const up = () => { cursor.removeEventListener('pointermove', move); cursor.removeEventListener('pointerup', up); };
      cursor.addEventListener('pointermove', move);
      cursor.addEventListener('pointerup', up);
    });
  }
  const axisScroll = scope.querySelector('.mk-taxis-scroll');
  if (tracks && axisScroll) {
    const sync = () => { axisScroll.scrollLeft = tracks.scrollLeft; };
    tracks.addEventListener('scroll', sync);
    sync();
  }
  const splitEl = scope.querySelector('#mk-name-split');
  const nameCol = scope.querySelector('#mk-name-col');
  const waveEl = scope.querySelector('.mk-wave');
  if (splitEl && nameCol && waveEl) {
    splitEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const startX = ev.clientX, startW = nameCol.getBoundingClientRect().width;
      const move = (e) => {
        const w = Math.max(120, Math.min(460, startW + (e.clientX - startX)));
        waveEl.style.setProperty('--mk-name-w', w + 'px');
      };
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
  scope.querySelectorAll('.mk-track-row[data-row]').forEach((row) => {
    row.addEventListener('click', () => {
      scope.querySelectorAll('.mk-track-row.sel').forEach((r) => r.classList.remove('sel'));
      row.classList.add('sel');
    });
  });
}

/* ── 5.5 控件层（第二十四轮 U0：分层 / 刻度 / 溢出收集 / 假交互）──────────
   规范见 memory/08-ROADMAP.md §7（R1~R9）：
   · R5 组内 4px、组间 12px —— 全部由父容器 gap 给，组件不带 margin；
   · R6 带子 flex-wrap:nowrap，放不下的「整组」按 data-ovp 优先级收进本带 ⋯；
   · R2/R3 全应用唯一主按钮 = L1 的 #sim-run；
   · R9 长文本只进状态栏 / 面板头，不进工具带。
   本函数在每次 render() 与 resize 后重跑（幂等：先按出厂顺序还原，再测量）。 */
function setupBands() {
  document.querySelectorAll('#toolbar, .mk-toolrow').forEach((band) => {
    if (!band.__order) band.__order = Array.from(band.children);
    const order = band.__order;
    const ovf = order.find((el) => el.classList && el.classList.contains('mk-ovf'));
    if (!ovf) return;
    // 1) 还原出厂顺序（把上次收进菜单的组放回带里），才能量到真实宽度
    order.forEach((el) => band.appendChild(el));
    ovf.style.display = '';                                   // 先显示 ⋯ 才能量到它的宽度
    const groups = order.filter((el) => el.classList && el.classList.contains('mk-tbg') && el !== ovf);
    const menu = ovf.querySelector('.mk-ovf-menu');
    const GAP = 12;                                          // = --ui-gap-out
    const cs = getComputedStyle(band);
    const avail = band.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ovfW = ovf.querySelector('.mk-ovf-btn').offsetWidth + GAP;
    const widthOf = (list) => list.reduce((s, g) => s + g.offsetWidth, 0) + GAP * Math.max(0, list.length - 1);

    let kept = groups.slice();
    const moved = [];
    if (widthOf(kept) > avail) {
      const cand = groups.filter((g) => g.dataset.ovp).sort((a, b) => Number(a.dataset.ovp) - Number(b.dataset.ovp));
      for (const g of cand) {
        if (widthOf(kept) <= avail - ovfW) break;
        kept = kept.filter((x) => x !== g);
        moved.push(g);
      }
      // 若把全部候选都收走仍放不下（极端窄窗口），保持现状不硬塞
      if (widthOf(kept) > avail - ovfW) { kept = groups.slice(); moved.length = 0; }
    }
    ovf.style.display = moved.length ? '' : 'none';
    menu.innerHTML = '';
    moved.sort((a, b) => order.indexOf(a) - order.indexOf(b)).forEach((g) => menu.appendChild(g));
  });
}

/* 下拉（位状态 / 添加信号 / ⋯）：点外面/再点一次自动收起 */
function setupFlyouts() {
  document.addEventListener('click', (ev) => {
    const host = ev.target.closest('.mk-dd, .mk-ovf');
    document.querySelectorAll('.mk-dd.open, .mk-ovf.open').forEach((d) => { if (d !== host) d.classList.remove('open'); });
    if (host && host.querySelector('.mk-dd-menu, .mk-ovf-menu').children.length) host.classList.toggle('open');
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') document.querySelectorAll('.mk-dd.open, .mk-ovf.open').forEach((d) => d.classList.remove('open'));
  });
}

/* 分段控件（整步·子步 / Dec·Hex·Bin）与步进器 ±1：点了有反馈 */
function setupCtlFeedback() {
  document.addEventListener('click', (ev) => {
    const segBtn = ev.target.closest('.mk-seg button');
    if (segBtn) {
      const seg = segBtn.closest('.mk-seg');
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === segBtn));
      return;
    }
    const arrow = ev.target.closest('.mk-stepper button');
    if (arrow) {
      const inp = arrow.closest('.mk-step-input').querySelector('input');
      const dir = arrow.textContent.trim() === '▲' ? 1 : -1;
      inp.value = String(Math.max(0, (parseInt(inp.value, 10) || 0) + dir));
    }
  });
}
setupFlyouts();
setupCtlFeedback();

/* ── 6. 分隔条拖拽 ──────────────────────────────────────────────────── */
function startSplitDrag(ev, node, idx, splitEl) {
  ev.preventDefault();
  const handle = ev.currentTarget;
  const slots = Array.from(splitEl.children).filter((el) => el.classList.contains('mk-slot'));
  const a = slots[idx], b = slots[idx + 1];
  if (!a || !b) return;
  const horizontal = node.dir === 'row';
  const startPos = horizontal ? ev.clientX : ev.clientY;
  const sizeA = horizontal ? a.offsetWidth : a.offsetHeight;
  const sizeB = horizontal ? b.offsetWidth : b.offsetHeight;
  const total = sizeA + sizeB;
  const MIN = 120;
  handle.classList.add('active');
  handle.setPointerCapture(ev.pointerId);
  const move = (e) => {
    const cur = horizontal ? e.clientX : e.clientY;
    let na = sizeA + (cur - startPos);
    na = Math.max(MIN, Math.min(total - MIN, na));
    a.style.flex = na + ' 0 0'; a.style.flexBasis = na + 'px';
    b.style.flex = (total - na) + ' 0 0'; b.style.flexBasis = (total - na) + 'px';
    a.dataset.px = String(na); b.dataset.px = String(total - na);
  };
  const up = () => {
    handle.classList.remove('active');
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    const na = Number(a.dataset.px || sizeA), nb = Number(b.dataset.px || sizeB);
    const sum = na + nb || 1;
    // 把「本对」的比例换算回整棵树的归一化 sizes
    const share = node.sizes[idx] + node.sizes[idx + 1];
    node.sizes[idx] = share * (na / sum);
    node.sizes[idx + 1] = share * (nb / sum);
    delete a.dataset.px; delete b.dataset.px;
    render(); persist();
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
}

/* ── 7. 面板拖拽停靠（DnD）──────────────────────────────────────────── */
let drag = null;
function startPanelDrag(ev, panelId, fromTabsId) {
  if (ev.button !== 0) return;
  ev.preventDefault();
  drag = { panelId, fromTabsId, x: ev.clientX, y: ev.clientY, moved: false, target: null };
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
}
function onDragMove(ev) {
  if (!drag) return;
  drag.x = ev.clientX; drag.y = ev.clientY;
  if (!drag.moved) {
    drag.moved = true;
    const g = document.createElement('div');
    g.className = 'mk-drag-ghost';
    g.textContent = '⠿ ' + PANELS[drag.panelId].title;
    document.body.appendChild(g);
    drag.ghost = g;
  }
  drag.ghost.style.left = (ev.clientX + 12) + 'px';
  drag.ghost.style.top = (ev.clientY + 12) + 'px';
  drag.target = hitTest(ev.clientX, ev.clientY, drag.panelId);
  showIndicator(drag.target);
}
function onDragEnd() {
  if (!drag) return;
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);
  if (drag.ghost) drag.ghost.remove();
  hideIndicator();
  if (drag.moved && drag.target) {
    placePanel(drag.panelId, drag.target);
    if (floats[drag.panelId]) delete floats[drag.panelId];
    render(); persist();
  }
  drag = null;
}
function hitTest(x, y, panelId) {
  const wbR = wb.getBoundingClientRect();
  if (x < wbR.left || x > wbR.right || y < wbR.top || y > wbR.bottom) return null;
  const EDGE = 22;
  const groups = Array.from(wb.querySelectorAll('.mk-group'));
  // 外缘环带（新建区）优先——但仅当没有命中「更贴边」的组内带时
  const inner = groups.find((g) => {
    const r = g.getBoundingClientRect();
    return x > r.left + EDGE && x < r.right - EDGE && y > r.top && y < r.bottom;
  });
  if (!inner) {
    if (x < wbR.left + EDGE) return { type: 'edge', side: 'left' };
    if (x > wbR.right - EDGE) return { type: 'edge', side: 'right' };
    if (y > wbR.bottom - EDGE) return { type: 'edge', side: 'bottom' };
    if (y < wbR.top + EDGE) return { type: 'edge', side: 'top' };
  }
  for (const g of groups) {
    const r = g.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const node = findTabs(root, g.dataset.tabsId);
    if (!node) continue;
    const barR = g.querySelector('.mk-tabbar').getBoundingClientRect();
    if (y <= barR.bottom + 3) {
      return { type: 'tab', tabsId: node.id, index: tabInsertIndex(node, g, x), rect: barR };
    }
    const band = Math.max(24, Math.min(120, Math.min(r.width, r.height) * 0.26));
    const d = { left: x - r.left, right: r.right - x, top: y - r.top, bottom: r.bottom - y };
    const min = Math.min(d.left, d.right, d.top, d.bottom);
    if (min <= band) {
      const side = min === d.left ? 'left' : min === d.right ? 'right' : min === d.top ? 'top' : 'bottom';
      return { type: 'split', tabsId: node.id, side, rect: r, band };
    }
    if (node.panels.length === 1 && node.panels[0] === panelId) continue;
    return { type: 'tab', tabsId: node.id, index: node.panels.length, rect: barR };
  }
  return null;
}
function tabInsertIndex(node, groupEl, x) {
  const tabsEls = Array.from(groupEl.querySelectorAll('.mk-tab'));
  for (let i = 0; i < tabsEls.length; i++) {
    const r = tabsEls[i].getBoundingClientRect();
    if (x < r.left + r.width / 2) return i;
  }
  return node.panels.length;
}
function showIndicator(t) {
  document.querySelectorAll('.mk-group.drop-tab').forEach((el) => el.classList.remove('drop-tab'));
  if (!t) { dropEl.style.display = 'none'; caretEl.style.display = 'none'; return; }
  const wbR = wb.getBoundingClientRect();
  if (t.type === 'tab') {
    caretEl.style.display = 'block';
    const bar = t.rect;
    const owner = document.querySelector('.mk-group[data-tabs-id="' + t.tabsId + '"]');
    if (owner) owner.classList.add('drop-tab');
    caretEl.style.left = (bar.left - wbR.left + 2) + 'px';
    caretEl.style.top = (bar.top - wbR.top) + 'px';
    caretEl.style.height = bar.height + 'px';
    dropEl.style.display = 'none';
    return;
  }
  caretEl.style.display = 'none';
  let r;
  if (t.type === 'edge') {
    const R = { left: [wbR.left + 2, wbR.top + 2, 90, wbR.height - 4],
      right: [wbR.right - 92, wbR.top + 2, 90, wbR.height - 4],
      top: [wbR.left + 2, wbR.top + 2, wbR.width - 4, 90],
      bottom: [wbR.left + 2, wbR.bottom - 92, wbR.width - 4, 90] }[t.side];
    r = R;
  } else {
    const b = t.rect, band = t.band;
    r = t.side === 'left' ? [b.left, b.top, band, b.height]
      : t.side === 'right' ? [b.right - band, b.top, band, b.height]
        : t.side === 'top' ? [b.left, b.top, b.width, band]
          : [b.left, b.bottom - band, b.width, band];
  }
  dropEl.style.display = 'block';
  dropEl.style.left = (r[0] - wbR.left) + 'px';
  dropEl.style.top = (r[1] - wbR.top) + 'px';
  dropEl.style.width = r[2] + 'px';
  dropEl.style.height = r[3] + 'px';
}
function hideIndicator() {
  dropEl.style.display = 'none';
  caretEl.style.display = 'none';
  document.querySelectorAll('.mk-group.drop-tab').forEach((el) => el.classList.remove('drop-tab'));
}

/* ── 8. 浮出 / 收回 ─────────────────────────────────────────────────── */
let cascade = 0;
function floatPanel(id, opts) {
  opts = opts || {};
  if (!PANELS[id]) return;
  removePanel(id);
  const wbR = wb.getBoundingClientRect();
  const w = Math.min(720, Math.round(wbR.width * 0.55));
  const h = Math.min(460, Math.round(wbR.height * 0.6));
  const step = (cascade++ % 6) * 26;
  const x = typeof opts.x === 'number' ? opts.x : 90 + step;
  const y = typeof opts.y === 'number' ? opts.y : 60 + step;
  floats[id] = floats[id] || { x, y, w, h, max: false };
  floats[id].max = !!opts.max;
  focusedTabsId = null;
  render(); persist();
}
function dockPanel(id, target) {
  delete floats[id];
  const fallback = lastDock[id];
  if (!placePanel(id, target) && !(fallback && insertTab(fallback.tabsId, id, fallback.index))) {
    insertTab(allTabsIds()[0], id, null);
  }
  render(); persist();
}
function renderFloats() {
  floatsLayer.innerHTML = '';
  Object.keys(floats).forEach((id) => {
    const f = floats[id];
    const el = document.createElement('div');
    el.className = 'mk-float' + (f.max ? ' max' : '');
    el.dataset.float = id;
    el.style.left = f.x + 'px'; el.style.top = f.y + 'px';
    el.style.width = f.w + 'px'; el.style.height = f.h + 'px';
    const head = document.createElement('div');
    head.className = 'mk-float-head';
    head.innerHTML = '<span class="mk-float-title">' + PANELS[id].title + '</span>';
    const mkBtn = (label, title, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.title = title;
      b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); });
      return b;
    };
    head.appendChild(mkBtn('⤓', '收回停靠', () => dockPanel(id, null)));
    head.appendChild(mkBtn('▣', '最大化 / 还原', () => { f.max = !f.max; render(); persist(); }));
    head.appendChild(mkBtn('✕', '关闭面板', () => hidePanel(id)));
    el.appendChild(head);
    const body = document.createElement('div');
    body.className = 'mk-float-body';
    body.innerHTML = RENDER[id]();
    el.appendChild(body);
    if (id === 'wave') afterWave(body);
    const rz = document.createElement('div');
    rz.className = 'mk-float-resize';
    el.appendChild(rz);
    head.addEventListener('pointerdown', (ev) => startFloatDrag(ev, id, el));
    rz.addEventListener('pointerdown', (ev) => startFloatResize(ev, id, el));
    floatsLayer.appendChild(el);
  });
}
function startFloatDrag(ev, id, el) {
  if (ev.button !== 0 || floats[id].max) return;
  ev.preventDefault();
  const f = floats[id];
  const sx = ev.clientX, sy = ev.clientY, ox = f.x, oy = f.y;
  const move = (e) => {
    const wbR = wb.getBoundingClientRect();
    f.x = Math.max(0, Math.min(wbR.width - 60, ox + (e.clientX - sx)));
    f.y = Math.max(0, Math.min(wbR.height - 30, oy + (e.clientY - sy)));
    el.style.left = f.x + 'px'; el.style.top = f.y + 'px';
    showIndicator(hitTest(e.clientX, e.clientY, id));
  };
  const up = (e) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (typeof e.clientX === 'number') move(e);
    hideIndicator();
    const t = hitTest(e.clientX, e.clientY, id);
    if (t) dockPanel(id, t); else persist();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function startFloatResize(ev, id, el) {
  ev.preventDefault(); ev.stopPropagation();
  const f = floats[id];
  const sx = ev.clientX, sy = ev.clientY, ow = f.w, oh = f.h;
  const move = (e) => {
    f.w = Math.max(260, ow + (e.clientX - sx));
    f.h = Math.max(150, oh + (e.clientY - sy));
    el.style.width = f.w + 'px'; el.style.height = f.h + 'px';
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); persist(); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function hidePanel(id) {
  removePanel(id);
  delete floats[id];
  if (!hidden.includes(id)) hidden.push(id);
  render(); persist();
}
function showPanel(id) {
  if (hidden.indexOf(id) >= 0) hidden.splice(hidden.indexOf(id), 1);
  const host = HOME_ZONE[id];
  if (!insertTab(host, id, null)) {
    const ids = allTabsIds();
    if (ids.length) insertTab(ids[0], id, null);
    else root = tabs([id], id);
  }
  render(); persist();
}

/* ── 9. 菜单 / 预设 / 持久化 ───────────────────────────────────────── */
const menus = document.getElementById('menus');
function closeMenus() { menus.querySelectorAll('.mk-menu.open').forEach((m) => m.classList.remove('open')); }
menus.addEventListener('click', (ev) => {
  const head = ev.target.closest('.mk-menu');
  if (!head) return;
  const opened = head.classList.contains('open');
  closeMenus();
  if (!opened && ev.target === head) head.classList.add('open');
  const mi = ev.target.closest('.mk-mi');
  if (!mi) return;
  ev.stopPropagation();
  closeMenus();
  if (mi.dataset.preset) { applyPreset(mi.dataset.preset); return; }
  if (mi.dataset.panelToggle) {
    const id = mi.dataset.panelToggle;
    if (visiblePanels().indexOf(id) >= 0) hidePanel(id); else showPanel(id);
    return;
  }
  const act = mi.dataset.act;
  if (act === 'reset') applyPreset('sim', true);
  else if (act === 'save') { persist(true); flash('布局已保存到 localStorage'); }
  else if (act === 'clear') { try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ } flash('已清除保存的布局'); }
  else if (act === 'float-all') { visiblePanels().slice().forEach((p) => { if (!floats[p]) floatPanel(p); }); }
  else if (act === 'dock-all') { Object.keys(floats).slice().forEach((p) => dockPanel(p, null)); }
  else if (act === 'cascade') { cascade = 0; let i = 0; Object.keys(floats).forEach((p) => { floats[p].x = 80 + i * 28; floats[p].y = 50 + i * 28; i++; }); renderFloats(); persist(); }
  else if (act === 'help') document.getElementById('help-overlay').classList.remove('hidden');
});
document.addEventListener('pointerdown', (ev) => {
  if (!ev.target.closest('.mk-menu')) closeMenus();
});
function buildPanelMenu() {
  const box = document.getElementById('panel-menu');
  const vis = visiblePanels();
  box.innerHTML = '';
  PANEL_ORDER.forEach((id) => {
    const on = vis.indexOf(id) >= 0;
    const el = document.createElement('div');
    el.className = 'mk-mi';
    el.dataset.panelToggle = id;
    el.innerHTML = '<span class="mk-tick">' + (on ? '✔' : '') + '</span>' + PANELS[id].title +
      '<span class="mk-key">' + (floats[id] ? '浮动' : on ? '停靠' : '隐藏') + '</span>';
    box.appendChild(el);
  });
  const sep = document.createElement('div'); sep.className = 'mk-sep'; box.appendChild(sep);
  const addAll = document.createElement('div');
  addAll.className = 'mk-mi'; addAll.dataset.act = 'float-all'; addAll.textContent = '全部浮出（演示）';
  box.appendChild(addAll);
}
function applyPreset(name, hard) {
  if (!PRESETS[name]) return;
  root = PRESETS[name]();
  // hard = 重置语义：丢弃当前浮动 / 隐藏状态（下面已清空），并把预设写回存储
  floats = {}; hidden = [];
  if (name === 'review') {
    floats.tb = { x: 120, y: 90, w: 560, h: 300, max: false };
    floats.vcd = { x: 700, y: 150, w: 420, h: 340, max: false };
  }
  preset = name;
  cascade = 0;
  focusedTabsId = null;
  render(); persist();
}
const LS_KEY = 'wavepaint.mock.layout.v1';
let saveTimer = null;
function persist(now) {
  const doIt = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ root, floats, hidden, preset }));
    } catch (e) { /* 隐私模式等：忽略 */ }
  };
  if (now) { doIt(); return; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doIt, 400);
}
function restore() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || !data.root || !data.root.kind) return false;
  root = data.root;
  floats = data.floats || {};
  hidden = Array.isArray(data.hidden) ? data.hidden : [];
  preset = data.preset || 'sim';
  return true;
}
function updateStatus() {
  let zones = 0, docked = 0;
  eachTabs(root, (n) => { zones++; docked += n.panels.length; });
  document.getElementById('st-layout').textContent =
    '布局：' + (PRESET_NAME[preset] || '自定义') + '预设' + (hidden.length ? '（' + hidden.length + ' 个面板已隐藏）' : '');
  const vis = visiblePanels();
  const unplaced = PANEL_ORDER.filter((p) => vis.indexOf(p) < 0).length;
  document.getElementById('st-panels').textContent =
    PANEL_ORDER.length + ' 面板：' + docked + ' 停靠 / ' + zones + ' 区 / ' +
    Object.keys(floats).length + ' 浮动' + (unplaced ? ' / ' + unplaced + ' 未显示' : '');
  buildPanelMenu();
}
function flash(msg) { document.getElementById('st-text').textContent = msg; setTimeout(() => { document.getElementById('st-text').textContent = '就绪（原型演示）'; }, 2200); }

/* ── 10. 键盘 / 初始化 ─────────────────────────────────────────────── */
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    closeMenus();
    document.getElementById('help-overlay').classList.add('hidden');
    if (drag) { if (drag.ghost) drag.ghost.remove(); hideIndicator(); drag = null;
      document.removeEventListener('pointermove', onDragMove); document.removeEventListener('pointerup', onDragEnd); }
  }
  if (ev.ctrlKey && ev.altKey) {
    if (ev.key === '1') { ev.preventDefault(); applyPreset('sim'); }
    if (ev.key === '2') { ev.preventDefault(); applyPreset('edit'); }
    if (ev.key === '3') { ev.preventDefault(); applyPreset('review'); }
    if (ev.key === '0') { ev.preventDefault(); applyPreset('sim', true); }
  }
});
document.getElementById('mock-help-btn').addEventListener('click', () => document.getElementById('help-overlay').classList.remove('hidden'));
document.getElementById('help-close').addEventListener('click', () => document.getElementById('help-overlay').classList.add('hidden'));
document.getElementById('help-overlay').addEventListener('click', (ev) => {
  if (ev.target.id === 'help-overlay') ev.target.classList.add('hidden');
});
window.addEventListener('resize', () => { if (Object.keys(floats).length) renderFloats(); setupBands(); });

const restored = restore();
render();
if (!restored) persist();
document.getElementById('st-text').textContent = restored ? '已恢复上次布局（localStorage）' : '就绪（原型演示）';
window.__mock = { PANELS, get root() { return root; }, get floats() { return floats; }, visiblePanels,
  applyPreset, floatPanel, dockPanel, hidePanel, showPanel, render, hitTest, placePanel,
  setRoot: (r) => { root = r; }, persistState: () => { persist(true); }, reset: () => applyPreset('sim', true),
  setupBands };
