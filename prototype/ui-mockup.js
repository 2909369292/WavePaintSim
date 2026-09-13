/* ============================================================================
 * WavePaint UI 原型逻辑（mock）—— 停靠布局引擎 + 浮出 + 预设 + 持久化
 * ----------------------------------------------------------------------------
 * 目的：给用户 review「Verdi 式多窗格 + Word 式自由拖拽」的**形态**。
 *
 * ★ 1:1 照搬原则（用户第三十七轮拍板，本文件最高优先级）
 *   波形 / 源码 / RTL / VCD / TB 五个面板的内容**不是仿制**，而是把真机
 *   index.html 里的原生节点整块搬进面板：
 *     wave   ← #main-area（内含 #wave-view > #wave-canvas，真画布 + 真绘制代码）
 *     source ← #sim-card-source（CodeMirror 6 宿主 / 源文件工具条 / 解析结果）
 *     rtl    ← #sim-card-rtl（#rtl-tree）
 *     vcd    ← #sim-card-vcd（#vcd-tree）
 *     tb     ← #sim-card-tb（#tb-source）
 *   于是外壳的 DOM / CSS / JS 与真机是同一份：菜单栏、工具带、画布、代码区
 *   的观感与行为都等于真机，只是从「全屏」变成「面板」。
 *   ⚠ 绝不在本文件里重写这些区域的外观。历史教训：早期版本按「预测的显示
 *     效果」自绘了一套假菜单栏 / 假工具带 / 假波形 SVG / 假源码高亮，与真机
 *     不一致，用户第三十七轮明确否决，那批代码已全部删除，不许再长回来。
 *
 * ★ 节点常驻约束
 *   真机脚本（js/sim/ui-bridge.js）用 getElementById 抓节点，所以被搬走的节点
 *   必须**始终留在文档里**：面板没显示时（被隐藏 / 被并成页签 / 停在别处），
 *   节点被摘到 #mk-park（display:none）暂存，**绝不 remove()**。
 *   同理 #sim-panel / #sim-panel-body / #sim-resize-x 原地不动（只是被 CSS 隐藏），
 *   好让 ui-bridge 的 initRefs() 与 installSimPanelLayout() 都拿到非空引用
 *   （后者因为 #sim-panel-body 里已无 [data-sim-card] 而返回 null，属预期）。
 *
 * ★ 落点预览 == 落位结果（用户第三十七轮点名要修的两个 bug）
 *   computeDrop() 是唯一数据源：先把候选操作在**布局树副本**上真的执行一遍，
 *   再用布局求解器反算目标矩形；showIndicator() 只画这个矩形，
 *   placePanel() 只执行同一个操作。任何一方都不许自己算几何 —— 这正是
 *   「预览矩形 ≠ 落位后矩形」的历史根因（过去预览用一套 90px 常量、落位用
 *   另一套 0.34 比例，互相对不上）。
 *
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
  tb:      { title: 'Testbench (TB)' },
  console: { title: '控制台' },
  files:   { title: '源文件' },
  props:   { title: '端口 / 模块' },
};
const PANEL_ORDER = ['wave', 'source', 'rtl', 'vcd', 'tb', 'console', 'files', 'props'];
const HOME_ZONE = { wave: 'z-center', source: 'z-right', rtl: 'z-left', vcd: 'z-left',
  tb: 'z-right', console: 'z-bottom', files: 'z-left', props: 'z-right' };

// 真机宿主映射（id 见 index.html:838 / 861 / 898 / 909 / 919）
const HOST_ID = {
  wave: 'main-area',
  source: 'sim-card-source',
  rtl: 'sim-card-rtl',
  vcd: 'sim-card-vcd',
  tb: 'sim-card-tb',
};
const HOST_PANELS = Object.keys(HOST_ID);
const HOST_EL = {};
HOST_PANELS.forEach((pid) => { HOST_EL[pid] = document.getElementById(HOST_ID[pid]); });

/* ── 2. 布局树 / 预设 ───────────────────────────────────────────────── */
let seq = 0;
const tabs = (panels, active) => ({ kind: 'tabs', id: 'z-' + (++seq), panels: panels.slice(), active: active || panels[0] || null });
// split 节点也给稳定 id：拖分隔条时不缓存 DOM，靠 data-split-id 重新查活节点
const split = (dir, sizes, children) => ({ kind: 'split', id: 's-' + (++seq), dir, sizes: sizes.slice(), children });

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
  return split('col', [0.72, 0.28], [
    split('row', [0.16, 0.58, 0.26], [
      tabs(['rtl', 'vcd'], 'vcd'),
      tabs(['wave', 'source'], 'wave'),
      tabs(['source', 'tb'], 'source'),
    ]),
    tabs(['console'], 'console'),
  ]);
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
function cloneTree(node) {
  if (!node) return null;
  if (node.kind === 'tabs') return { kind: 'tabs', id: node.id, panels: node.panels.slice(), active: node.active };
  return { kind: 'split', id: node.id, dir: node.dir, sizes: node.sizes.slice(), children: node.children.map(cloneTree) };
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
// 摘掉一个面板。注意：**不在这里兜底恢复预设**——树被摘空（root 变 null）是合法
// 中间态，由 placePanel / showPanel 决定怎么收场；旧版在这里 `|| presetSim()`
// 会让「把最后一个面板拖走」变成「整棵布局突然回到仿真预设」。
function removePanel(panelId) {
  const owner = findTabsOfPanel(root, panelId);
  if (!owner) return;
  const idx = owner.panels.indexOf(panelId);
  lastDock[panelId] = { tabsId: owner.id, index: idx };
  owner.panels.splice(idx, 1);
  if (owner.active === panelId) owner.active = owner.panels[Math.min(idx, owner.panels.length - 1)] || null;
  root = prune(root);
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

/* 落位操作（唯一的三个：并入页签 / 组内切分 / 工作区外缘新建）
   —— 三者都只做「可预测的定比例插入」，比例常量集中在 DROP，绝不因为
      父节点方向相同就改用另一套比例（那正是旧版预览对不上的原因之一）。 */
const DROP = {
  outer: 14,          // 工作区最外缘环带宽度（px）：新建整行 / 整列
  tabBand: 3,         // 页签条下方的额外容差（px）
  groupRatio: 0.25,   // 组内边缘带 = 组短边 * 该比例
  groupMin: 28,       //   但不小于 28px
  groupMax: 96,       //   也不大于 96px
  splitShare: 0.30,   // 组内切分：新面板占该组的比例
  rootShare: 0.22,    // 工作区外缘插入：新面板占工作区的比例
};

function applyOp(op, panelId) {
  if (!op || !root) return false;
  if (op.type === 'tab') return insertTab(op.tabsId, panelId, op.index);
  if (op.type === 'split') return splitAtGroup(op.tabsId, op.side, panelId);
  if (op.type === 'edge') return addRootEdge(op.side, panelId);
  return false;
}
// 组内切分：始终把目标组包进一个新的 split（不论父节点是不是同方向），
// 这样新面板的矩形 = 目标组矩形 * DROP.splitShare，与预览严格一致。
function splitAtGroup(tabsId, side, panelId) {
  const target = findTabs(root, tabsId);
  if (!target) return false;
  const horiz = side === 'left' || side === 'right';
  const dir = horiz ? 'row' : 'col';
  const before = (side === 'left' || side === 'top');
  const s = DROP.splitShare;
  const fresh = tabs([panelId], panelId);
  const node = before ? split(dir, [s, 1 - s], [fresh, target])
    : split(dir, [1 - s, s], [target, fresh]);
  return replaceNode(target, node);
}
// 工作区外缘：在整棵树的这一侧新建一整行 / 一整列，新面板占 DROP.rootShare。
function addRootEdge(side, panelId) {
  const dir = (side === 'left' || side === 'right') ? 'row' : 'col';
  const before = (side === 'left' || side === 'top');
  const s = DROP.rootShare;
  const fresh = tabs([panelId], panelId);
  if (root.kind === 'split' && root.dir === dir) {
    root.sizes = root.sizes.map((v) => v * (1 - s));
    const idx = before ? 0 : root.children.length;
    root.children.splice(idx, 0, fresh);
    root.sizes.splice(idx, 0, s);
    return true;
  }
  root = before ? split(dir, [s, 1 - s], [fresh, root]) : split(dir, [1 - s, s], [root, fresh]);
  return true;
}

/* ── 4. 布局求解器（像素矩形）────────────────────────────────────────
   必须与 CSS 完全同构：
     · #workbench 的内容盒 = 起算原点（CSS 里是 padding: var(--mk-gap)）；
     · 每个 split 有 n-1 条 flex:0 0 auto 的分隔条，宽/高 = --mk-handle；
     · 剩下的可用长按 sizes 比例分给各 .mk-slot（CSS 为 flex: sizes[i] 1 0）。 */
function metrics() {
  const cs = getComputedStyle(document.documentElement);
  const h = parseFloat(cs.getPropertyValue('--mk-handle'));
  const g = parseFloat(cs.getPropertyValue('--mk-gap'));
  return { handle: Number.isFinite(h) ? h : 7, gap: Number.isFinite(g) ? g : 6 };
}
function workbenchContentRect() {
  const r = wb.getBoundingClientRect();
  const cs = getComputedStyle(wb);
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const pl = num(cs.paddingLeft), pr = num(cs.paddingRight);
  const pt = num(cs.paddingTop), pb = num(cs.paddingBottom);
  return { x: r.left + pl, y: r.top + pt, w: Math.max(0, r.width - pl - pr), h: Math.max(0, r.height - pt - pb) };
}
function layoutRects(node, rect, out, M) {
  out = out || {};
  if (!node) return out;
  if (node.kind === 'tabs') { out[node.id] = rect; return out; }
  M = M || metrics();
  const horiz = node.dir === 'row';
  const n = node.children.length;
  const total = horiz ? rect.w : rect.h;
  const avail = Math.max(0, total - M.handle * Math.max(0, n - 1));
  const sum = node.sizes.reduce((a, b) => a + b, 0) || 1;
  let pos = horiz ? rect.x : rect.y;
  for (let i = 0; i < n; i++) {
    const size = avail * (node.sizes[i] / sum);
    layoutRects(node.children[i],
      horiz ? { x: pos, y: rect.y, w: size, h: rect.h } : { x: rect.x, y: pos, w: rect.w, h: size }, out, M);
    pos += size + (i < n - 1 ? M.handle : 0);
  }
  return out;
}

/* ── 5. 假数据面板（控制台 / 源文件 / 端口；真机没有这三块）──────────── */
function panelConsole() {
  return `<div class="mk-mockrow">原型假数据 <em>（真机没有这块面板）</em></div>
<div class="mk-console"><span class="c-cmd">$ iverilog -g2012 -s tb -o sim.vvp counter.sv tb_counter.sv</span>
<span class="c-dim">  本地仿真服务 127.0.0.1:17817 · 引擎 ivl 12.0</span>
<span class="c-ok">[编译] 成功（0 error / 0 warning）→ sim.vvp</span>
<span class="c-cmd">$ vvp sim.vvp</span>
<span class="c-warn">[警告] counter.sv:23: 位宽隐式扩展 (8 → 12)</span>
<span class="c-ok">[仿真] 完成 @ 200ns · VCD 2.1 KB / 4 条信号</span>
<span class="c-dim">[回传] wave_out.vcd 已解析 → 波形窗口 4 条信号</span>
<span class="c-dim">就绪。</span></div>`;
}
function panelFiles() {
  const f = (n, a) => `<span class="mk-file${a ? ' active' : ''}">${n}<span class="x">✕</span></span>`;
  return `<div class="mk-mockrow">原型假数据 <em>（真机没有这块面板，真机是源码卡片里的文件页签）</em></div>
    <div class="mk-filelist">${f('counter.sv', 1)}${f('tb_counter.sv')}</div>
    <div class="mk-table"><table>
      <tr><th>模块</th><th>顶层候选</th></tr>
      <tr><td>counter</td><td>✔</td></tr>
      <tr><td>tb</td><td>—</td></tr>
    </table></div>`;
}
function panelProps() {
  const d = (k) => `<span class="mk-dir ${k}">${k === 'in' ? 'input' : k === 'out' ? 'output' : 'inout'}</span>`;
  return `<div class="mk-mockrow">原型假数据 <em>（真机把端口预览放在源码卡片底部）</em></div>
    <div class="mk-table"><table>
      <tr><th>端口</th><th>方向</th><th>位宽</th><th>类型</th></tr>
      <tr><td>clk</td><td>${d('in')}</td><td>1</td><td>wire</td></tr>
      <tr><td>rst_n</td><td>${d('in')}</td><td>1</td><td>wire</td></tr>
      <tr><td>en</td><td>${d('in')}</td><td>1</td><td>wire</td></tr>
      <tr><td>q</td><td>${d('out')}</td><td>[7:0]</td><td>reg</td></tr>
      <tr><td colspan="4" style="color:var(--text-muted)">参数：WIDTH=8（默认）· N=4</td></tr>
    </table></div>`;
}
const MOCK_RENDER = {
  console: () => panelConsole(),
  files: () => panelFiles(),
  props: () => panelProps(),
};

/* ── 6. 渲染（把真机节点搬进面板 / 其余摘到暂存区）────────────────── */
const wb = document.getElementById('workbench');
const floatsLayer = document.getElementById('mk-floats');
const dropEl = document.getElementById('mk-drop');
const caretEl = document.getElementById('mk-caret');
const parkEl = document.getElementById('mk-park');
let focusedTabsId = null;

function parkHost(pid) {
  const el = HOST_EL[pid];
  if (el && el.parentNode !== parkEl) parkEl.appendChild(el);
}
// 面板内容：真机节点直接搬（不是克隆），假数据面板才自己产 HTML。
function buildPanelBody(pid) {
  const body = document.createElement('div');
  body.className = 'mk-panel';
  if (HOST_ID[pid]) {
    body.classList.add('mk-host');
    if (HOST_EL[pid]) body.appendChild(HOST_EL[pid]);
  } else {
    body.classList.add('mk-mock');
    if (MOCK_RENDER[pid]) body.innerHTML = MOCK_RENDER[pid]();
  }
  return body;
}

function render() {
  // 1) 先把所有真机节点收回暂存区：这样旧树被删时不会把节点一起带走
  HOST_PANELS.forEach(parkHost);
  // 2) 重建停靠树（buildPanelBody 会把用到的节点从暂存区里再摘出来）
  wb.querySelectorAll(':scope > .mk-split').forEach((el) => el.remove());
  if (root) wb.insertBefore(buildNode(root), floatsLayer);
  renderFloats();
  // 3) 画布只认 #wave-view 的尺寸，而真机 clean.js 没有 resize 监听
  //    （全靠 js/editor/measure.js:187 的 window resize → scheduleDraw）→
  //    每次重排后必须手动派发一次，等 flex 收敛再补一发。
  afterLayout();
  updateStatus();
}
let rafId = 0;
function afterLayout() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  });
}
function buildNode(node) {
  if (node.kind === 'tabs') return buildGroup(node);
  const el = document.createElement('div');
  el.className = 'mk-split ' + node.dir;
  el.dataset.splitId = node.id;
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
    // pointerdown 与 pointermove 都要拦住：历史 bug —— 拖拽时指针划过别的面板的
    // ⧉▣✕ 会把它们「点亮」，看起来像按钮在乱闪。CSS 侧另有 body.mk-dragging 兜底。
    b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    b.addEventListener('pointermove', (ev) => ev.stopPropagation());
    b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); });
    return b;
  };
  const act = node.active;
  btns.appendChild(mk('⧉', '浮出当前面板', () => act && floatPanel(act)));
  btns.appendChild(mk('▣', '最大化 / 还原（浮出为最大）', () => act && floatPanel(act, { max: true })));
  btns.appendChild(mk('✕', '关闭当前面板', () => act && hidePanel(act)));
  bar.appendChild(btns);
  el.appendChild(bar);
  el.appendChild(buildPanelBody(node.active || node.panels[0]));
  return el;
}

/* 工具带溢出收集：真机 #toolbar 现在被逐字照搬（自带 flex-wrap:nowrap 与它自己的
   溢出行为），原型不再改它的 DOM。保留本函数只为不破坏 __mock.setupBands 契约。 */
function setupBands() { /* 真机工具带原样保留，不做任何收拢 */ }

/* ── 7. 分隔条拖拽 ──────────────────────────────────────────────────── */
function startSplitDrag(ev, node, idx, splitEl) {
  ev.preventDefault();
  const handle = ev.currentTarget;
  const slotsOf = (el) => Array.from(el.children).filter((c) => c.classList.contains('mk-slot'));
  // ★ 不缓存 DOM：拖动期间任何一次 render() 都会重建整棵树，缓存的 slot/handle
  //   会变成游离节点（写样式无效 → 视觉上「拖动中」与「松手后」不一致）。
  //   每个 move 都按 node.id 重新查活节点，node.sizes 始终是唯一数据源。
  const liveSplit = () => document.querySelector('.mk-split[data-split-id="' + node.id + '"]') || splitEl;
  const slots = slotsOf(splitEl);
  const a = slots[idx], b = slots[idx + 1];
  if (!a || !b) return;
  const horizontal = node.dir === 'row';
  const startPos = horizontal ? ev.clientX : ev.clientY;
  const sizeA = horizontal ? a.offsetWidth : a.offsetHeight;
  const sizeB = horizontal ? b.offsetWidth : b.offsetHeight;
  // ★ 关键：只动「这一对」的归一化份额（pairNorm 恒定），绝不重写其它 slot 的 flex。
  //   旧版有三处错：① 用 a+b(px) 当总量、② 只重写被拖的两个 slot 的 flex（其余子项
  //   的 grow 仍是 0.26 这种小数份额，会被 546 / 1108 这种大数直接挤成 0）、
  //   ③ 把「绝对像素目标」又乘了一遍 share（尺寸被缩成 0.74×）。
  //   现在：像素 → 归一化 的换算严格用本对自身的 (pairPx ↔ pairNorm) 比例，
  //   而 render() 里所有 slot 共用同一个 px/norm 因子，所以
  //   拖动中的实时宽度 == 松手后 render() 的宽度（逐像素相等），分界线严格跟随指针，
  //   且相邻的第三个面板不受任何影响。
  const pairPx = sizeA + sizeB || 1;
  const pairNorm = node.sizes[idx] + node.sizes[idx + 1] || 1;
  const scale = pairNorm / pairPx;              // 归一化份额 / 像素
  const MIN = Math.min(120, pairPx / 2);
  const savedSizes = node.sizes.slice();
  const apply = (na) => {
    node.sizes[idx] = na * scale;
    node.sizes[idx + 1] = (pairPx - na) * scale;
    slotsOf(liveSplit()).forEach((el, i) => { el.style.flex = node.sizes[i] + ' 1 0'; });
  };
  const liveHandle = () => liveSplit().querySelector('.mk-handle[data-split-idx="' + idx + '"]') || handle;
  liveHandle().classList.add('active');
  const move = (e) => {
    const cur = horizontal ? e.clientX : e.clientY;
    const na = Math.max(MIN, Math.min(pairPx - MIN, sizeA + (cur - startPos)));
    apply(na);
  };
  const up = () => {
    liveHandle().classList.remove('active');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    // node.sizes 在拖动过程中就已经是「最终值」，render() 只是把同一份数据重建成
    // 同样的 DOM / 同样的 flex —— 因此松手前后不产生任何跳变。
    render(); persist();
  };
  const cancel = () => {
    liveHandle().classList.remove('active');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    node.sizes = savedSizes;
    render();
  };
  // 监听挂在 window 上：手柄被 render() 换掉也不会中断拖动
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
}

/* ── 8. 面板拖拽停靠（预览 == 落位：唯一数据源 computeDrop）────────── */
let drag = null;

// 候选操作：只看指针落在哪，不算任何几何
function hitTestOp(x, y, panelId) {
  if (!root) return null;
  const c = workbenchContentRect();
  const M = metrics();
  if (x < c.x - M.gap || x > c.x + c.w + M.gap || y < c.y - M.gap || y > c.y + c.h + M.gap) return null;

  const groups = Array.from(wb.querySelectorAll('.mk-group'));
  const hit = groups.find((g) => {
    const r = g.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });

  // a) 工作区最外缘环带 → 新建一整行 / 一整列（优先于组内带，否则最外侧的组
  //    永远只剩「组内切分」，做不出整行/整列）
  const dEdge = Math.min(x - c.x, c.x + c.w - x, y - c.y, c.y + c.h - y);
  if (dEdge <= DROP.outer) {
    const dl = x - c.x, dr = c.x + c.w - x, dt = y - c.y, db = c.y + c.h - y;
    const m = Math.min(dl, dr, dt, db);
    const side = m === dl ? 'left' : m === dr ? 'right' : m === dt ? 'top' : 'bottom';
    return { type: 'edge', side, panelId };
  }

  if (!hit) return null;
  const node = findTabs(root, hit.dataset.tabsId);
  if (!node) return null;
  const r = hit.getBoundingClientRect();
  const barR = hit.querySelector('.mk-tabbar').getBoundingClientRect();

  // b) 页签条 → 并入该组（含组内重排）
  if (y <= barR.bottom + DROP.tabBand) {
    return { type: 'tab', tabsId: node.id, index: tabInsertIndex(node, hit, x, panelId), panelId };
  }
  const only = node.panels.length === 1 && node.panels[0] === panelId;
  // c) 组内边缘 → 在该侧切分
  const band = Math.max(DROP.groupMin, Math.min(DROP.groupMax, Math.min(r.width, r.height) * DROP.groupRatio));
  const dl = x - r.left, dr = r.right - x, dt = y - r.top, db = r.bottom - y;
  const m = Math.min(dl, dr, dt, db);
  if (m <= band && !only) {
    const side = m === dl ? 'left' : m === dr ? 'right' : m === dt ? 'top' : 'bottom';
    return { type: 'split', tabsId: node.id, side, panelId };
  }
  // d) 组内部 → 追加为该组最后一个页签（拖回自己所在的独苗组 = 无操作）
  if (only) return null;
  return { type: 'tab', tabsId: node.id, index: node.panels.length, panelId };
}
// 页签插入位序号：按「摘掉被拖面板之后」的数组来数，这样预览与落位不会差一位
function tabInsertIndex(node, groupEl, x, panelId) {
  const els = Array.from(groupEl.querySelectorAll('.mk-tab'));
  let idx = 0;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (x < r.left + r.width / 2) break;
    if (el.dataset.panel !== panelId) idx++;
  }
  return idx;
}
// 在布局树副本上真跑一遍操作，得到"松手后"的树
function simulateDrop(panelId, op) {
  const saved = root;
  root = cloneTree(saved);
  let next = null;
  try {
    removePanel(panelId);
    if (root && applyOp(op, panelId)) next = root;
  } catch (e) {
    next = null;
  }
  root = saved;
  return next;
}
// ★ 唯一数据源：{op: 候选操作, rect: 松手后该面板的真实矩形(client 坐标)}
function computeDrop(x, y, panelId) {
  const op = hitTestOp(x, y, panelId);
  if (!op) return null;
  const tree = simulateDrop(panelId, op);
  if (!tree) return null;
  const node = findTabsOfPanel(tree, panelId);
  if (!node) return null;
  const rect = layoutRects(tree, workbenchContentRect(), {})[node.id];
  if (!rect || rect.w < 1 || rect.h < 1) return null;
  return { op, tree, rect };
}
// 只执行操作（与 computeDrop 同一条代码路径，因此结果必然一致）
function placePanel(panelId, target) {
  if (!target) return false;
  const tree = target.tree || simulateDrop(panelId, target.op || target);
  if (!tree) return false;
  root = tree;
  return true;
}

function startPanelDrag(ev, panelId, fromTabsId) {
  if (ev.button !== 0) return;
  ev.preventDefault();
  drag = { panelId, fromTabsId, x: ev.clientX, y: ev.clientY, moved: false, drop: null };
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
}
function onDragMove(ev) {
  if (!drag) return;
  drag.x = ev.clientX; drag.y = ev.clientY;
  if (!drag.moved) {
    drag.moved = true;
    // 拖拽期间靠这个类强制隐藏所有悬停显隐（⧉▣✕ / 页签 ✕ / 页签高亮）
    document.body.classList.add('mk-dragging');
    const g = document.createElement('div');
    g.className = 'mk-drag-ghost';
    g.textContent = '⠿ ' + PANELS[drag.panelId].title;
    document.body.appendChild(g);
    drag.ghost = g;
  }
  drag.ghost.style.left = (ev.clientX + 12) + 'px';
  drag.ghost.style.top = (ev.clientY + 12) + 'px';
  drag.drop = computeDrop(ev.clientX, ev.clientY, drag.panelId);
  showIndicator(drag.drop);
}
function endPanelDrag(commit) {
  if (!drag) return;
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);
  document.body.classList.remove('mk-dragging');
  if (drag.ghost) drag.ghost.remove();
  hideIndicator();
  const moved = drag.moved;
  const panelId = drag.panelId;
  const drop = drag.drop;
  drag = null;
  if (!moved) return;
  if (commit && drop) {
    placePanel(panelId, drop);
    if (floats[panelId]) delete floats[panelId];
    render(); persist();
  }
}
function onDragEnd() { endPanelDrag(true); }

/* 落点提示：只消费 computeDrop().rect，绝不自己算几何 */
function clearDropMarks() {
  document.querySelectorAll('.mk-group.drop-tab').forEach((el) => el.classList.remove('drop-tab'));
}
function hideIndicator() {
  dropEl.style.display = 'none';
  caretEl.style.display = 'none';
  clearDropMarks();
}
function showIndicator(d) {
  clearDropMarks();
  if (!d) { hideIndicator(); return; }
  const wbR = wb.getBoundingClientRect();
  const r = d.rect;
  dropEl.className = d.op.type === 'tab' ? 'tab' : '';
  dropEl.style.display = 'block';
  dropEl.style.left = (r.x - wbR.left) + 'px';
  dropEl.style.top = (r.y - wbR.top) + 'px';
  dropEl.style.width = r.w + 'px';
  dropEl.style.height = r.h + 'px';
  if (d.op.type !== 'tab') { caretEl.style.display = 'none'; return; }
  const owner = document.querySelector('.mk-group[data-tabs-id="' + d.op.tabsId + '"]');
  if (owner) owner.classList.add('drop-tab');
  const bar = owner && owner.querySelector('.mk-tabbar');
  if (!bar) { caretEl.style.display = 'none'; return; }
  const barR = bar.getBoundingClientRect();
  const rest = Array.from(owner.querySelectorAll('.mk-tab')).filter((el) => el.dataset.panel !== d.op.panelId);
  let cx = barR.left + 2;
  if (rest.length) {
    cx = d.op.index >= rest.length
      ? rest[rest.length - 1].getBoundingClientRect().right + 1
      : rest[d.op.index].getBoundingClientRect().left;
  }
  caretEl.style.display = 'block';
  caretEl.style.left = (cx - wbR.left) + 'px';
  caretEl.style.top = (barR.top - wbR.top + 2) + 'px';
  caretEl.style.height = (barR.height - 4) + 'px';
}

/* ── 9. 浮出 / 收回 ─────────────────────────────────────────────────── */
let cascade = 0;
let draggingFloatId = null;
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
function dockPanel(id, drop) {
  delete floats[id];
  if (!placePanel(id, drop)) {
    const fallback = lastDock[id];
    if (!(fallback && insertTab(fallback.tabsId, id, fallback.index))) {
      if (!root) root = tabs([id], id);
      else if (!insertTab(allTabsIds()[0], id, null)) root = tabs([id], id);
    }
  }
  render(); persist();
}
function renderFloats() {
  floatsLayer.innerHTML = '';
  Object.keys(floats).forEach((id) => {
    const f = floats[id];
    const el = document.createElement('div');
    // draggingFloatId 是模块级状态：拖动中即使浮窗被重建，也保持「拖动中」外观
    el.className = 'mk-float' + (f.max ? ' max' : '') + (draggingFloatId === id ? ' dragging' : '');
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
      b.addEventListener('pointermove', (ev) => ev.stopPropagation());
      b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(); });
      return b;
    };
    head.appendChild(mkBtn('⤓', '收回停靠', () => dockPanel(id, null)));
    head.appendChild(mkBtn('▣', '最大化 / 还原', () => { f.max = !f.max; render(); persist(); }));
    head.appendChild(mkBtn('✕', '关闭面板', () => hidePanel(id)));
    el.appendChild(head);
    el.appendChild(buildPanelBody(id));
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
  document.body.classList.add('mk-dragging');
  draggingFloatId = id;
  const live0 = floatsLayer.querySelector('.mk-float[data-float="' + id + '"]') || el;
  live0.classList.add('dragging');
  const move = (e) => {
    const wbR = wb.getBoundingClientRect();
    f.x = Math.max(0, Math.min(Math.max(0, wbR.width - 60), ox + (e.clientX - sx)));
    f.y = Math.max(0, Math.min(Math.max(0, wbR.height - 30), oy + (e.clientY - sy)));
    // ★ 不缓存 el：拖动期间任何一次 render()（例如 afterLayout 的 60ms resize →
    //   renderFloats）都会把浮窗重建，旧引用变游离节点 → 位置写进空气里，
    //   看起来就是「拖动预览」和「松手后落位」不一致。每次按 data-float 查活节点。
    const node = floatsLayer.querySelector('.mk-float[data-float="' + id + '"]') || el;
    node.style.left = f.x + 'px'; node.style.top = f.y + 'px';
    showIndicator(computeDrop(e.clientX, e.clientY, id));
  };
  const up = (e) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', onCancel);
    document.body.classList.remove('mk-dragging');
    draggingFloatId = null;
    if (typeof e.clientX === 'number') move(e);
    const drop = computeDrop(e.clientX, e.clientY, id);
    hideIndicator();
    // 中途若被 render() 换过节点，也必须让「松手后」的 DOM 就是 f 的最终值
    if (drop) dockPanel(id, drop); else { renderFloats(); persist(); }
  };
  const onCancel = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', onCancel);
    document.body.classList.remove('mk-dragging');
    draggingFloatId = null;
    hideIndicator();
    renderFloats(); persist();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', onCancel);
}
function startFloatResize(ev, id, el) {
  ev.preventDefault(); ev.stopPropagation();
  const f = floats[id];
  const sx = ev.clientX, sy = ev.clientY, ow = f.w, oh = f.h;
  const elOf = () => floatsLayer.querySelector('.mk-float[data-float="' + id + '"]') || el;
  const move = (e) => {
    f.w = Math.max(260, ow + (e.clientX - sx));
    f.h = Math.max(150, oh + (e.clientY - sy));
    const node = elOf();
    node.style.width = f.w + 'px'; node.style.height = f.h + 'px';
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    renderFloats(); persist();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
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

/* ── 10. 状态栏（原型独有）/ 菜单 / 预设 / 持久化 ────────────────────── */
// 真机 #sim-status / #sim-recover 搬进原型状态栏（真机脚本仍按 id 找得到它们）
function mountStatusNodes() {
  const bar = document.getElementById('status-bar');
  const st = document.getElementById('sim-status');
  const rc = document.getElementById('sim-recover');
  const ctx = document.getElementById('st-ctx');
  if (!bar || !ctx) return;
  if (st) bar.insertBefore(st, ctx.nextSibling);
  if (rc) bar.insertBefore(rc, (st || ctx).nextSibling);
}

function closeMenus() {
  document.querySelectorAll('#status-bar .mk-menu.open').forEach((m) => m.classList.remove('open'));
}
document.addEventListener('click', (ev) => {
  const mi = ev.target.closest('.mk-mi');
  const head = ev.target.closest('.mk-menu');
  if (mi) {
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
    else if (act === 'cascade') {
      cascade = 0; let i = 0;
      Object.keys(floats).forEach((p) => { floats[p].x = 80 + i * 28; floats[p].y = 50 + i * 28; i++; });
      renderFloats(); persist();
    } else if (act === 'help') document.getElementById('help-overlay').classList.remove('hidden');
    return;
  }
  if (head) {
    const opened = head.classList.contains('open');
    closeMenus();
    if (!opened) head.classList.add('open');
    return;
  }
  closeMenus();
});
document.addEventListener('pointerdown', (ev) => {
  if (!ev.target.closest('#status-bar .mk-menu')) closeMenus();
});
function buildPanelMenu() {
  const box = document.getElementById('panel-menu');
  if (!box) return;
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
  const all = document.createElement('div');
  all.className = 'mk-mi'; all.dataset.act = 'dock-all'; all.textContent = '全部收回停靠';
  box.appendChild(all);
}
function applyPreset(name, hard) {
  if (!PRESETS[name]) return;
  root = PRESETS[name]();
  // hard = 重置语义：丢弃当前浮动 / 隐藏状态（下面已清空）
  floats = {}; hidden = [];
  if (name === 'review' && !hard) {
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
    try { localStorage.setItem(LS_KEY, JSON.stringify({ root, floats, hidden, preset })); } catch (e) { /* 隐私模式等：忽略 */ }
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
  const elLayout = document.getElementById('st-layout');
  if (elLayout) {
    elLayout.textContent = '布局：' + (PRESET_NAME[preset] || '自定义') + '预设' +
      (hidden.length ? '（' + hidden.length + ' 个面板已隐藏）' : '');
  }
  const vis = visiblePanels();
  const unplaced = PANEL_ORDER.filter((p) => vis.indexOf(p) < 0).length;
  const elPanels = document.getElementById('st-panels');
  if (elPanels) {
    elPanels.textContent = PANEL_ORDER.length + ' 面板：' + docked + ' 停靠 / ' + zones + ' 区 / ' +
      Object.keys(floats).length + ' 浮动' + (unplaced ? ' / ' + unplaced + ' 未显示' : '');
  }
  buildPanelMenu();
}
function flash(msg) {
  const t = document.getElementById('st-text');
  if (!t) return;
  t.textContent = msg;
  setTimeout(() => { t.textContent = '就绪（原型演示）'; }, 2200);
}
function visiblePanels() {
  const out = [];
  eachTabs(root, (n) => n.panels.forEach((p) => out.push(p)));
  Object.keys(floats).forEach((p) => out.push(p));
  return out;
}

/* ── 11. 键盘 / 初始化 ─────────────────────────────────────────────── */
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    closeMenus();
    document.getElementById('help-overlay').classList.add('hidden');
    if (drag) endPanelDrag(false);
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
window.addEventListener('resize', () => { if (Object.keys(floats).length) renderFloats(); });

mountStatusNodes();
const restored = restore();
render();
if (!restored) persist();
document.getElementById('st-text').textContent = restored ? '已恢复上次布局（localStorage）' : '就绪（原型演示）';
document.documentElement.dataset.mockReady = '1';

window.__mock = {
  PANELS, get root() { return root; }, get floats() { return floats; }, visiblePanels,
  applyPreset, floatPanel, dockPanel, hidePanel, showPanel, render,
  // 几何 / 落点：hitTest 返回 computeDrop 的完整结果（{op, rect, tree}），
  // 兼容旧断言只需读 .op.type / .op.side / .op.index。
  hitTest: (x, y, panelId) => computeDrop(x, y, panelId),
  computeDrop, placePanel, layoutRects, workbenchContentRect, metrics, DROP,
  get ready() { return true; },
  setRoot: (r) => { root = r; },
  persistState: () => { persist(true); },
  reset: () => applyPreset('sim', true),
  setupBands,
};
