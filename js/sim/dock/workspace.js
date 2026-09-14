/* ============================================================================
 * WavePaint 工作区停靠引擎（真机）—— 多窗格停靠 + 浮出 + 预设 + 持久化
 * ----------------------------------------------------------------------------
 * 目的：让真机（WavePaintClean.exe）拥有 Verdi 式多窗格布局 + Word 式自由拖拽。
 *   · 外壳 DOM（#workbench / #mk-floats …）在 index.html 里；
 *   · 本文件 = 唯一停靠引擎（prototype/ 页由 tools/gen-mock-page.mjs 从真机
 *     index.html 逐字复制而来，天然共用这份引擎，不再另养一份拷贝）。
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
 *   好让 ui-bridge 的 initRefs() 拿到非空引用；侧栏那套折叠/分割控制器则由
 *   ui-bridge 显式让位（见 installSimPanelLayout 前的 __wpDock 守卫）。
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
 *   tabs  节点 {kind:'tabs',  id:'z-xxx', panels:['wave',...], active:'wave',
 *               zone:'left'|'center'|'right'|'bottom'|null}
 *     zone 只是**语义标签**（预设建区时盖上，用户拖出来的新区没有），用于
 *     「隐藏后重新显示」时把面板放回它该在的那一类位置；它不是 id，不参与查找。
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
  console: { title: '仿真状态' },
};
const PANEL_ORDER = ['wave', 'source', 'rtl', 'vcd', 'tb', 'console'];
// 面板的「主位」= 它的语义归属区（见下方 tabs 节点的 zone 字段）。不是 id。
const HOME_ZONE = { wave: 'center', source: 'right', rtl: 'left', vcd: 'left',
  tb: 'right', console: 'bottom' };

// 宿主映射：面板内容 = 真机原生节点整块搬入（id 见 index.html 的 #main-area /
// #sim-card-* / #sim-console），不是克隆、不是仿制。
const HOST_ID = {
  wave: 'main-area',
  source: 'sim-card-source',
  rtl: 'sim-card-rtl',
  vcd: 'sim-card-vcd',
  tb: 'sim-card-tb',
  console: 'sim-console',
};
const HOST_PANELS = Object.keys(HOST_ID);
const HOST_EL = {};
HOST_PANELS.forEach((pid) => { HOST_EL[pid] = document.getElementById(HOST_ID[pid]); });

/* ── 2. 布局树 / 预设 ───────────────────────────────────────────────── */
let seq = 0;
const tabs = (panels, active, zone) => ({ kind: 'tabs', id: 'z-' + (++seq), panels: panels.slice(),
  active: active || panels[0] || null, zone: zone || null });
// split 节点也给稳定 id：拖分隔条时不缓存 DOM，靠 data-split-id 重新查活节点
const split = (dir, sizes, children) => ({ kind: 'split', id: 's-' + (++seq), dir, sizes: sizes.slice(), children });

function presetSim() {
  return split('col', [0.74, 0.26], [
    split('row', [0.19, 0.55, 0.26], [
      tabs(['rtl', 'vcd'], 'rtl', 'left'),
      tabs(['wave'], 'wave', 'center'),
      tabs(['source', 'tb'], 'source', 'right'),
    ]),
    tabs(['console'], 'console', 'bottom'),
  ]);
}
function presetEdit() {
  return split('col', [0.76, 0.24], [
    split('row', [0.18, 0.56, 0.26], [
      tabs(['rtl', 'vcd'], 'rtl', 'left'),
      tabs(['source', 'wave'], 'source', 'center'),
      tabs(['tb'], 'tb', 'right'),
    ]),
    tabs(['console'], 'console', 'bottom'),
  ]);
}
function presetReview() {
  return split('col', [0.72, 0.28], [
    split('row', [0.16, 0.58, 0.26], [
      tabs(['rtl', 'vcd'], 'vcd', 'left'),
      tabs(['wave', 'source'], 'wave', 'center'),
      tabs(['tb'], 'tb', 'right'),
    ]),
    tabs(['console'], 'console', 'bottom'),
  ]);
}
const PRESETS = { sim: presetSim, edit: presetEdit, review: presetReview };
const PRESET_NAME = { sim: '仿真', edit: '编辑', review: '审阅' };

let root = presetSim();
let floats = {};                  // id -> {x,y,w,h,max}
let hidden = [];                  // 未显示的面板 id
let preset = 'sim';
let lastDock = {};                // id -> {tabsId, index}
let zoneCtx = {};                 // zoneId -> {parentId,index,size,dir,parentKids,zone}

/* ── 3. 布局树工具 ──────────────────────────────────────────────────── */
function eachTabs(node, fn) {
  if (!node) return;
  if (node.kind === 'tabs') { fn(node); return; }
  node.children.forEach((c) => eachTabs(c, fn));
}
function cloneTree(node) {
  if (!node) return null;
  if (node.kind === 'tabs') return { kind: 'tabs', id: node.id, panels: node.panels.slice(),
    active: node.active, zone: node.zone || null };
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
// 一个区在树里的位置快照。只在「该区即将被 prune 折叠」那一刻采一次：
// 区一消失，光看布局树就再也推不出它原先在哪、占多宽。showPanel 靠它原样重建。
function zoneContext(tabsId) {
  const target = findTabs(root, tabsId);
  if (!target) return null;
  const ctx = { parentId: null, index: -1, size: null, dir: null, parentKids: 0, zone: target.zone || null };
  (function walk(n) {
    if (!n || n.kind === 'tabs' || ctx.parentId) return;
    const i = n.children.indexOf(target);
    if (i >= 0) {
      ctx.parentId = n.id; ctx.index = i; ctx.size = n.sizes[i];
      ctx.dir = n.dir; ctx.parentKids = n.children.length;
      return;
    }
    n.children.forEach(walk);
  })(root);
  return ctx;
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
  // 摘完这一块这个区就空了 → prune 会把整个区连同它的比例一起折叠掉。
  // 折叠前先把位置存下来（同一区里先前被摘走的面板共用这份快照）。
  if (!owner.panels.length) zoneCtx[owner.id] = zoneContext(owner.id);
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
  outerTop: 8,        //   顶边环带**刻意更窄**：顶部那一圈正落在各组页签条上，
                      //   若与页签条等高（32px）就会把「并入页签」整个顶掉 ——
                      //   把页签拖到波形组页签条上却被判成「新建整行」。收窄后
                      //   页签条中下部恢复「并入」，顶边 8px 仍可新建整行。
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

/* ── 5. 渲染（把真机节点搬进面板 / 其余摘到暂存区）──────────────────── */
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

/* ── 4.5 滚动位置快照 / 回填（第 50 轮修 Bug：拖动分隔条后代码框跳回最上面）───
 * 现象：拖分隔条改变「源码 / 仿真状态」面板大小（或拖动浮窗）后，代码框（CM6 的
 *   .cm-scroller）、日志框等滚动位置被重置到顶部。
 * 根因：render() 为保证「整块搬家不克隆」，会先把所有真机节点 parkHost 到 #mk-park、
 *   重建树后再搬回 —— 元素一旦脱离文档，浏览器会销毁该滚动容器的布局对象，滚动偏移
 *   （scrollTop / scrollLeft）随之归零。这是**搬运 DOM 的固有代价**，不是 CSS / CM 的问题。
 * 修法：render() 前按「从面板宿主出发的子节点下标路径」快照所有已滚动过的后代（含宿主
 *   自身），重建后按同一路径回填。面板是整块搬移、子树结构与子节点顺序不变，路径天然
 *   一一对应（CM6 自己在视口内增删的节点都在被记录节点之下，不影响上层路径）。
 * 代价：只快照 scrollTop/scrollLeft 非 0 的节点，正常编辑时几乎为空数组。
 * ⚠ 顺序要求：快照必须在 parkHost **之前**（一摘节点就清零，之后再取已是 0）。 */
function snapshotScrollState() {
  const snap = [];
  const visit = (hostEl, node, path) => {
    if (node.nodeType !== 1) return;
    const top = node.scrollTop || 0;
    const left = node.scrollLeft || 0;
    if (top || left) snap.push({ hostEl, path: path.slice(), top, left });
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) {
      path.push(i);
      visit(hostEl, kids[i], path);
      path.pop();
    }
  };
  HOST_PANELS.forEach((pid) => {
    const el = HOST_EL[pid];
    if (el) visit(el, el, []);
  });
  return snap;
}
function restoreScrollState(snap) {
  if (!snap || !snap.length) return;
  for (const item of snap) {
    let node = item.hostEl;
    for (const idx of item.path) {
      node = node && node.children ? node.children[idx] : null;
      if (!node) break;
    }
    if (!node) continue;
    try {
      node.scrollTop = item.top;
      node.scrollLeft = item.left;
    } catch (e) { /* 只读 / 已销毁节点：忽略（滚动位置恢复是增强，失败不影响功能） */ }
  }
}
// 面板内容：真机节点直接搬（不是克隆、绝不 remove），六个面板全部如此。
function buildPanelBody(pid) {
  const body = document.createElement('div');
  body.className = 'mk-panel';
  body.classList.add('mk-host');
  if (HOST_EL[pid]) body.appendChild(HOST_EL[pid]);
  return body;
}

function render() {
  // 0) 先记下所有滚动位置（必须在 parkHost 之前 —— 见 snapshotScrollState 注释）
  const scrollSnap = snapshotScrollState();
  // 1) 先把所有真机节点收回暂存区：这样旧树被删时不会把节点一起带走
  HOST_PANELS.forEach(parkHost);
  // 2) 重建停靠树（buildPanelBody 会把用到的节点从暂存区里再摘出来）
  //    注意：不能只按 `.mk-split` 清理 —— 根节点是单个 tabs 节点时（隐藏到只剩一个
  //    面板），顶层插入的直接是 `.mk-group`，漏删会让旧组永远留在 DOM 里越积越多
  //    （实测：隐藏到 1 个面板再重置布局 → 残留 2 个孤儿组，四区变六区、
  //    `.mk-group` 计数与拖拽落点判定全部失真）。所以用 data-mk-root 标记根节点。
  wb.querySelectorAll(':scope > [data-mk-root]').forEach((el) => el.remove());
  if (root) {
    const built = buildNode(root);
    built.dataset.mkRoot = '1';
    wb.insertBefore(built, floatsLayer);
  }
  renderFloats();
  // 2.5) 回填滚动位置（含浮窗：renderFloats 之后所有宿主都已归位）
  restoreScrollState(scrollSnap);
  // 3) 画布只认 #wave-view 的尺寸，而真机 clean.js 没有 resize 监听
  //    （全靠 js/editor/measure.js:187 的 window resize → scheduleDraw）→
  //    每次重排后必须手动派发一次，等 flex 收敛再补一发。
  afterLayout();
  updateStatus();
}
let rafId = 0;
// 真机核心（js/wavepaint.clean.js 的 drawWaveform）**不监听 window resize**：
// 画布尺寸是在每次重绘时按 #wave-view 的 clientWidth/Height 现算的
// （v10 = max(内容宽, 视图宽)）。旧 UI 里窗口大小基本不变、且侧栏开关会走
// 核心自己的重绘路径，所以没暴露问题；到了停靠面板里，面板尺寸完全由停靠树
// 决定，若只派发 resize 事件，核心不会重画 —— 画布会停留在**上一次**的尺寸上
// （实测：面板宽 908，画布还是整页时的 1540，右侧一片空白 + 多出横向滚动条）。
// 所以每次重排后显式调 __wpf.scheduleRedraw()（rAF 合并，重复调用无代价）。
function redrawWave() {
  const wpf = window.__wpf;
  if (wpf && typeof wpf.scheduleRedraw === 'function') {
    try { wpf.scheduleRedraw(); } catch (e) { /* 核心未就绪：忽略 */ }
  }
}
function afterLayout() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    redrawWave();
    window.setTimeout(() => { window.dispatchEvent(new Event('resize')); redrawWave(); }, 60);
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
      // ★ 第 47 轮修 Bug：分隔条必须记住「自己属于哪个 split」（见 data-split-owner）——
      //   理由写在 startSplitDrag 的 liveHandle() 处。
      h.dataset.splitOwner = node.id;
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
    b.addEventListener('click', (ev) => { ev.stopPropagation(); fn(ev); });
    return b;
  };
  const act = node.active;
  const plus = mk('＋', '显示面板 / 布局预设', (ev) => openPanelMenu(ev.currentTarget));
  plus.dataset.menu = 'panels';
  btns.appendChild(plus);
  btns.appendChild(mk('⧉', '浮出当前面板', () => act && floatPanel(act)));
  btns.appendChild(mk('▣', '最大化 / 还原（浮出为最大）', () => act && floatPanel(act, { max: true })));
  btns.appendChild(mk('✕', '关闭当前面板', () => act && hidePanel(act)));
  bar.appendChild(btns);
  el.appendChild(bar);
  el.appendChild(buildPanelBody(node.active || node.panels[0]));
  return el;
}

/* 工具带溢出收集：真机 #toolbar 被逐字照搬（自带 flex-wrap:nowrap 与它自己的溢出
   行为），本引擎不改它的 DOM。保留空实现只为不破坏 window.__wpDock.setupBands 契约
   （早期版本在这里做「溢出收拢」，用户否决：工具带必须与真机 1:1）。 */
function setupBands() { /* 真机工具带原样保留，不做任何收拢 */ }

/* ── 6.5 拖拽基元（指针捕获 + 拖拽阈值 + 统一收尾）───────────────────────
 * 背景：本引擎有四种拖拽 —— 分隔条、面板页签（停靠）、浮窗标题栏、浮窗右下角
 * （缩放）。它们看似各写一套，实际上都踩过同一批坑，这里统一收口。
 *
 * ★ 为什么必须 setPointerCapture：
 *   pointermove / pointerup 只挂在 window 上时，指针一旦离开浏览器窗口
 *   （拖到屏幕外、越过窗口边界、被系统弹窗抢焦点），浏览器就不再派发事件，
 *   于是「拖拽停不下来」—— 浮窗粘在指针上、落点框不消失、body.mk-dragging
 *   一直挂着、松手后布局还留在半路。setPointerCapture 把后续指针事件强制
 *   路由给被按下的元素，出窗口也照样收得到 pointerup。
 *   元素中途被 render() 换掉时浏览器会自动释放捕获，所以捕获失败不致命
 *   （window 上的监听仍在兜底）。
 *
 * ★ 为什么需要 DRAG_THRESHOLD：
 *   页签的 pointerdown 同时承担「点击切 active」和「拖动停靠」两件事。
 *   没有阈值时，手抖 1px 就进入拖拽态（冒出 ghost、隐藏 ✕、亮起落点框），
 *   表现为「想点一下却把面板拖起来了」。阈值内一律按点击处理。
 */
const DRAG_THRESHOLD = 4;
/* 活动拖拽收尾登记表：每条拖拽路径开始时登记自己的「取消」函数、结束时注销。
   Esc 与 window blur 会统一调用这里。用途：指针被系统没收、窗口失焦、拖拽中
   脚本抛异常……任何非正常路径下都不会留下「拖拽中」的僵尸状态
   （历史现象：松手后浮窗还粘在指针上、落点框不消失）。 */
const activeDragCancels = new Set();
function registerDragCancel(fn) {
  activeDragCancels.add(fn);
  return () => activeDragCancels.delete(fn);
}
function cancelAllDrags() {
  Array.from(activeDragCancels).forEach((fn) => { try { fn(); } catch (e) { /* 单个取消失败不影响其它 */ } });
}
function capturePointer(el, ev) {
  try {
    if (el && typeof el.setPointerCapture === 'function' && ev && ev.pointerId != null) el.setPointerCapture(ev.pointerId);
  } catch (e) { /* 元素已游离 / 非指针事件：忽略 */ }
}
function releasePointer(el, pointerId) {
  try {
    if (el && typeof el.releasePointerCapture === 'function' && el.hasPointerCapture && el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
  } catch (e) { /* 同上 */ }
}

/* ── 7. 分隔条拖拽 ──────────────────────────────────────────────────── */
let splitDragActive = false;
function startSplitDrag(ev, node, idx, splitEl) {
  if (splitDragActive) return;      // 防御：上一次分隔条拖拽没收尾
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
  // ★ 第 47 轮修 Bug：必须按「本 split 的 id」限定，不能用裸的
  //   querySelector('.mk-handle[data-split-idx="N"]') —— querySelector 搜的是**子树**，
  //   而嵌套 split 的分隔条序号会与父 split 撞号（默认布局里 root 的 col-split 与
  //   它第一个 slot 内的 row-split 都有一条 idx=0 的 handle），doc order 上子 split 的
  //   handle 更靠前，会被先命中：于是拖「上下分界横条」时 .active 贴给了左中右之间
  //   那条**竖条**（用户报：无论调节哪个都是竖条高亮、正在拖的那条不亮）。
  //   data-split-owner 在 buildNode 里逐条写入 = node.id，天然唯一。
  const liveHandle = () => liveSplit().querySelector(
    '.mk-handle[data-split-owner="' + node.id + '"][data-split-idx="' + idx + '"]') || handle;
  liveHandle().classList.add('active');
  const move = (e) => {
    const cur = horizontal ? e.clientX : e.clientY;
    const na = Math.max(MIN, Math.min(pairPx - MIN, sizeA + (cur - startPos)));
    apply(na);
  };
  const up = () => {
    splitDragActive = false;
    unreg();
    liveHandle().classList.remove('active');
    releasePointer(handle, pid);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    // node.sizes 在拖动过程中就已经是「最终值」，render() 只是把同一份数据重建成
    // 同样的 DOM / 同样的 flex —— 因此松手前后不产生任何跳变。
    render(); persist();
  };
  const cancel = () => {
    splitDragActive = false;
    unreg();
    liveHandle().classList.remove('active');
    releasePointer(handle, pid);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    node.sizes = savedSizes;
    render();
  };
  const pid = ev.pointerId;
  splitDragActive = true;
  const unreg = registerDragCancel(cancel);
  capturePointer(handle, ev);
  // 监听挂在 window 上：手柄被 render() 换掉也不会中断拖动
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
}

/* ── 8. 面板拖拽停靠（预览 == 落位：唯一数据源 computeDrop）────────── */
let drag = null;

// 候选操作：只看指针落在哪，不算任何几何
// strict = true（浮窗拖动专用）：只认两类**显式**落点 —— 工作区外缘环带（新建整
//   行整列）与某个组的页签条（并入）。其余一律 null = 自由摆放。
//   原因：浮窗拖动时指针总压在浮窗标题栏上，而标题栏下方必然压着某个停靠组；
//   若沿用页签拖动那套（组内部 = 追加页签、组边缘带 = 切分），指针一进工作区就被
//   吸进某个组 —— 浮窗**永远无法自由摆放**（用户报的「拖动预览与最后实际效果不
//   一致」正是它），且窄组（如左侧 314px 宽）的边缘带能吃掉组内大半面积。要切分，
//   把并入后的页签再拖一次即可，两条路径都不丢。
function hitTestOp(x, y, panelId, strict) {
  if (!root) return null;
  const c = workbenchContentRect();
  const M = metrics();
  if (x < c.x - M.gap || x > c.x + c.w + M.gap || y < c.y - M.gap || y > c.y + c.h + M.gap) return null;

  const groups = Array.from(wb.querySelectorAll('.mk-group'));
  const hit = groups.find((g) => {
    const r = g.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });
  const node = hit ? findTabs(root, hit.dataset.tabsId) : null;
  const only = !!(node && node.panels.length === 1 && node.panels[0] === panelId);
  // 页签条候选（并入 / 组内重排）：指针落在页签条带里，语义就是「并入」。
  let barOp = null;
  if (hit && node) {
    const barR = hit.querySelector('.mk-tabbar').getBoundingClientRect();
    if (y <= barR.bottom + DROP.tabBand) {
      barOp = { type: 'tab', tabsId: node.id, index: tabInsertIndex(node, hit, x, panelId), panelId };
    }
  }

  // a) 工作区最外缘环带 → 新建一整行 / 一整列（优先于组内带，否则最外侧的组
  //    永远只剩「组内切分」，做不出整行/整列）。四条边各自判定、取最近的一条：
  //    顶边用更窄的 outerTop（见 DROP 注释），免得吃掉组页签条上的「并入」。
  const eL = x - c.x, eR = c.x + c.w - x, eT = y - c.y, eB = c.y + c.h - y;
  const ring = [];
  if (eL <= DROP.outer) ring.push(['left', eL]);
  if (eR <= DROP.outer) ring.push(['right', eR]);
  if (eT <= DROP.outerTop) ring.push(['top', eT]);
  if (eB <= DROP.outer) ring.push(['bottom', eB]);
  if (ring.length) {
    ring.sort((a, b) => a[1] - b[1]);
    // 页签条优先：落点在某组的页签条上时，除「顶边窄环带」外一律按「并入」处理。
    // 否则最左 / 最右组的页签条末端会被整列环带吃掉 —— 用户想把页签拖到组内末尾
    // 重排，结果凭空多出一整列（旧版「拖动预览和实际效果不一致」的同类残留）。
    if (!(barOp && ring[0][0] !== 'top')) return { type: 'edge', side: ring[0][0], panelId };
  }

  if (!hit || !node) return null;
  const r = hit.getBoundingClientRect();

  // b) 页签条 → 并入该组（含组内重排）
  if (barOp) return barOp;

  // c) 组内边缘 → 在该侧切分（浮窗拖动不认，见 strict 说明）
  const band = Math.max(DROP.groupMin, Math.min(DROP.groupMax, Math.min(r.width, r.height) * DROP.groupRatio));
  const dl = x - r.left, dr = r.right - x, dt = y - r.top, db = r.bottom - y;
  const m = Math.min(dl, dr, dt, db);
  if (m <= band && !only && !strict) {
    const side = m === dl ? 'left' : m === dr ? 'right' : m === dt ? 'top' : 'bottom';
    return { type: 'split', tabsId: node.id, side, panelId };
  }
  // d) 组内部 → 追加为该组最后一个页签（拖回自己所在的独苗组 = 无操作）
  if (only) return null;
  if (strict) return null;
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
function computeDrop(x, y, panelId, strict) {
  const op = hitTestOp(x, y, panelId, strict);
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
  if (drag) endPanelDrag(false);   // 防御：上一次拖拽没收尾（例如 Esc 之外的异常路径）
  ev.preventDefault();
  const origin = { el: ev.currentTarget, pid: ev.pointerId, x: ev.clientX, y: ev.clientY };
  drag = { panelId, fromTabsId, x: ev.clientX, y: ev.clientY, moved: false, drop: null, origin };
  drag.unreg = registerDragCancel(() => endPanelDrag(false));
  capturePointer(origin.el, ev);
  // 监听挂 window（不是 document）：鼠标在窗口外松开时 document 收不到 pointerup，
  // 会留下「拖拽停不下来」。pointercancel（系统抢走指针）也必须收尾。
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragCancel);
}
function onDragMove(ev) {
  if (!drag) return;
  drag.x = ev.clientX; drag.y = ev.clientY;
  if (!drag.moved) {
    // 阈值内的位移按「点击」处理：不建 ghost、不亮落点框、不隐藏 ✕/⧉▣✕。
    const dx = ev.clientX - drag.origin.x, dy = ev.clientY - drag.origin.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
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
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragCancel);
  if (drag.unreg) drag.unreg();
  if (drag.origin) releasePointer(drag.origin.el, drag.origin.pid);
  document.body.classList.remove('mk-dragging');
  if (drag.ghost) drag.ghost.remove();
  hideIndicator();
  const moved = drag.moved;
  const panelId = drag.panelId;
  const drop = drag.drop;
  drag = null;
  // 只在「真的拖过」时才 persist：单击页签只是切 active，不必写盘
  if (!moved) return;
  if (commit && drop) {
    placePanel(panelId, drop);
    if (floats[panelId]) delete floats[panelId];
    render(); persist();
  }
}
function onDragEnd() { endPanelDrag(true); }
// pointercancel = 指针被系统没收（触摸/笔/窗口失焦）：当作取消，不改布局树。
function onDragCancel() { endPanelDrag(false); }

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
  flash('浮出面板：' + PANELS[id].title);
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
  if (PANELS[id]) flash('停靠面板：' + PANELS[id].title);
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
    // 浮窗内容也带上 .mk-float-body：拖动浮窗时 CSS 靠它把内容置为
    // pointer-events:none，避免指针划到面板里的画布 / 代码区时被内容抢走事件
    // （历史 bug：拖浮窗经过波形画布，画布收到 pointermove 起了悬停高亮）。
    const bodyEl = buildPanelBody(id);
    bodyEl.classList.add('mk-float-body');
    el.appendChild(bodyEl);
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
  const grip = ev.currentTarget, pid = ev.pointerId;
  capturePointer(grip, ev);
  const unreg = registerDragCancel(() => onCancel());
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
    // strict=true：浮窗只在「页签条 / 组边缘 / 工作区外缘」落位，组内部 = 自由摆放
    showIndicator(computeDrop(e.clientX, e.clientY, id, true));
  };
  const up = (e) => {
    unreg();
    releasePointer(grip, pid);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', onCancel);
    document.body.classList.remove('mk-dragging');
    draggingFloatId = null;
    if (typeof e.clientX === 'number') move(e);
    const drop = computeDrop(e.clientX, e.clientY, id, true);
    hideIndicator();
    // 中途若被 render() 换过节点，也必须让「松手后」的 DOM 就是 f 的最终值
    if (drop) dockPanel(id, drop); else { renderFloats(); persist(); }
  };
  const onCancel = () => {
    unreg();
    releasePointer(grip, pid);
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
  const grip = ev.currentTarget, pid = ev.pointerId;
  capturePointer(grip, ev);
  const unreg = registerDragCancel(() => up());
  const sx = ev.clientX, sy = ev.clientY, ow = f.w, oh = f.h;
  const elOf = () => floatsLayer.querySelector('.mk-float[data-float="' + id + '"]') || el;
  const move = (e) => {
    f.w = Math.max(260, ow + (e.clientX - sx));
    f.h = Math.max(150, oh + (e.clientY - sy));
    const node = elOf();
    node.style.width = f.w + 'px'; node.style.height = f.h + 'px';
  };
  const up = () => {
    unreg();
    releasePointer(grip, pid);
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
  // 「至少保留一个可见面板」：全部隐藏后工作区是空的，而唯一能把面板加回来的入口
  // （组的页签条 ＋）也随之消失 —— 那是死局（底部状态栏按用户口径保持纯只读、不放菜单）。
  // ✕ 的语义始终是「隐藏」，不是「删除」：隐藏的都能从 ＋ 里加回来。
  const vis = visiblePanels();
  if (vis.length <= 1 && vis.indexOf(id) >= 0) {
    flash('至少保留一个面板：✕ 只是隐藏，隐藏的可用页签条上的 ＋ 加回来');
    return;
  }
  removePanel(id);
  delete floats[id];
  if (!hidden.includes(id)) hidden.push(id);
  render(); persist();
  flash('隐藏面板：' + (PANELS[id] ? PANELS[id].title : id));
}
// 找第一个带指定语义标签的区（预设建的区才有标签；用户拖出来的区没有）。
function findTabsByZone(zone) {
  if (!zone) return null;
  let hit = null;
  eachTabs(root, (n) => { if (!hit && n.zone === zone) hit = n; });
  return hit;
}
// 把「折叠前记下的那个区」在树里原样重建出来（含它在父 split 里的序号与比例）。
// 父 split 也一起没了（例如底部区是 root 的第二个孩子，摘掉后 prune 让 root 变成
// 上面那一半）时，只要当时是「两个孩子」的结构，就把当前 root 重新包一层还原。
function restoreZone(zoneId, panelId) {
  const ctx = zoneCtx[zoneId];
  if (!ctx) return false;
  // 重建出来的区**沿用原来的 id**：该 id 此刻不在树里（区已被折叠），复用它不会
  // 撞号，却能让 lastDock / zoneCtx / 已落盘的布局继续指着同一个区 —— 否则同一个
  // 区里的第二个面板再被加回来时，会照着旧 id 重建出第二个并排的区（本该是一个
  // 区里的两个页签）。
  const make = () => { const node = tabs([panelId], panelId, ctx.zone); node.id = zoneId; return node; };
  if (ctx.parentId) {
    const parent = (function find(n) {
      if (!n || n.kind === 'tabs') return null;
      if (n.id === ctx.parentId) return n;
      for (const c of n.children) { const r = find(c); if (r) return r; }
      return null;
    })(root);
    if (parent && parent.children.length < ctx.parentKids) {
      const add = Math.max(0.05, Math.min(0.9, ctx.size == null ? 0.3 : ctx.size));
      const i = Math.max(0, Math.min(ctx.index, parent.children.length));
      parent.children.splice(i, 0, make());
      // 原有各份额等比缩到 1-add，再插入新份额：整体比例不失真。
      parent.sizes = parent.sizes.map((s) => s * (1 - add));
      parent.sizes.splice(i, 0, add);
      return true;
    }
  }
  // 父节点也没了：只有当原结构是「父 + 这一个区」两个孩子时才可能精确还原。
  if (ctx.dir && ctx.parentKids === 2) {
    const add = Math.max(0.05, Math.min(0.9, ctx.size == null ? 0.3 : ctx.size));
    const node = make();
    root = ctx.index === 0
      ? split(ctx.dir, [add, 1 - add], [node, root])
      : split(ctx.dir, [1 - add, add], [root, node]);
    return true;
  }
  return false;
}
function showPanel(id) {
  if (hidden.indexOf(id) >= 0) hidden.splice(hidden.indexOf(id), 1);
  // 归位优先级：① 它原来那个区还在 → 按原序号插回去（与被并成页签的兄弟并列）；
  // ② 那个区已被折叠，但位置有记录 → 原地重建；③ 有同语义标签的区 → 插进那一类；
  // ④ 兜底：第一组 / 空树就单开一组。旧版只有 ③④，而 ③ 找的又是永远不存在的
  //    'z-…' 字符串，于是实测「隐藏波形再显示」把波形塞进左栏 —— 这是本轮修的根因。
  const rec = lastDock[id];
  let placed = false;
  if (rec && rec.tabsId) {
    placed = insertTab(rec.tabsId, id, rec.index);
    if (!placed) placed = restoreZone(rec.tabsId, id);
  }
  if (!placed) {
    const home = findTabsByZone(HOME_ZONE[id]);
    if (home) placed = insertTab(home.id, id, null);
  }
  if (!placed) {
    const ids = allTabsIds();
    if (ids.length) placed = insertTab(ids[0], id, null);
  }
  if (!placed) root = tabs([id], id);
  render(); persist();
  flash('显示面板：' + (PANELS[id] ? PANELS[id].title : id));
}

/* ── 9.5 面板菜单（页签条上的 ＋）──────────────────────────────────────
 * 为什么需要它：
 *   · ✕ 的语义是「隐藏」而非「删除」→ 必须有一条把隐藏面板加回来的路，否则关掉
 *     一个面板就再也找不回来（状态栏按用户口径是纯只读、不放菜单）。
 *   · 「布局预设 / 恢复默认」同理：布局被拖乱了需要一键回到已知状态。用户否决的是
 *     **底部状态栏里的** 「布局 ▾ / 面板 ▾ / 帮助」，不是「禁止有恢复入口」；
 *     这里把两件事收进页签条侧的小菜单，状态栏保持只读不变。
 * 交互：点 ＋ 展开 / 再点收起 / 点空白处或 Esc 关闭；菜单用 position:fixed 贴按钮下方。
 */
let menuEl = null, menuOff = null;
function closePanelMenu() {
  if (menuOff) { menuOff(); menuOff = null; }
  if (menuEl) { menuEl.remove(); menuEl = null; }
}
function openPanelMenu(anchor) {
  if (menuEl) { closePanelMenu(); return; }   // 同一个按钮再点一次 = 收起
  const el = document.createElement('div');
  el.className = 'mk-menu';
  const title = (t) => {
    const d = document.createElement('div');
    d.className = 'mk-menu-title'; d.textContent = t; el.appendChild(d);
  };
  const item = (label, enabled, on, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mk-menu-item' + (on ? ' on' : '');
    b.textContent = label; b.disabled = !enabled;
    b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!enabled) return;
      closePanelMenu();            // 先收菜单再动作：动作会 render()，锚点按钮会被重建
      fn();
    });
    el.appendChild(b);
  };
  title('面板');
  PANEL_ORDER.forEach((pid) => {
    const vis = visiblePanels().indexOf(pid) >= 0;
    item((vis ? '✓ ' : '＋ ') + PANELS[pid].title, !vis, vis, () => showPanel(pid));
  });
  title('布局');
  ['sim', 'edit', 'review'].forEach((n) => {
    item(PRESET_NAME[n] + '预设', true, preset === n, () => applyPreset(n, true));
  });
  item('恢复默认布局（仿真预设）', true, false, () => applyPreset('sim', true));
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(4, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + 'px';
  el.style.top = Math.min(r.bottom + 2, window.innerHeight - el.offsetHeight - 4) + 'px';
  menuEl = el;
  const onDoc = (ev) => { if (menuEl && !menuEl.contains(ev.target) && ev.target !== anchor && !anchor.contains(ev.target)) closePanelMenu(); };
  const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); closePanelMenu(); } };
  document.addEventListener('pointerdown', onDoc, true);
  document.addEventListener('keydown', onKey, true);
  menuOff = () => {
    document.removeEventListener('pointerdown', onDoc, true);
    document.removeEventListener('keydown', onKey, true);
  };
}

/* ── 10. 外壳接线：仿真状态面板 / 底部状态栏 / 预设 / 持久化 ─────────────
 *
 * 与「原型」时期的两点关键差别（用户第三十八轮拍板）：
 *   · 底部不再有「布局 ▾ / 面板 ▾ / 帮助」菜单 —— 外壳只保留纯状态显示，
 *     所有布局动作都在面板页签上完成（拖动 = 停靠，双击 / 中键 = 浮出，✕ = 隐藏）；
 *   · 状态变化不再用一次性 toast，而是按时间顺序追加到「仿真状态」面板的
 *     日志区（#sim-console-log）里，可回溯。
 *   · 第 39 轮起，这条日志流同时是**仿真链路的状态出口**（ui-bridge 的
 *     consoleOut → window.wpConsoleAppend）：仿真完成摘要 / 编译报错 /
 *     $display 输出都变成纯文本行进这里，不再用「框套框」的提示框。
 */

// 真机 #sim-recover（服务自愈按钮）从侧栏（.sim-panel-body）搬进「仿真状态」面板
// （#sim-console）。**只是换父节点**：id / inline style 与 ui-bridge 的 recoverBtn
// 事件绑定一律不动，所以手动自愈按钮照常工作。
// 本函数是幂等的安全网：index.html 里已按「日志 → 自愈」排好，正常情况什么都不做；
// 若将来外壳顺序被改乱，它会把按钮拉回日志流之后。
// ⚠ 第 44 轮删除了原来的单行状态行 #sim-status（用户裁决：占一行界面高度、内容与
// 日志流重复），这里不再有「状态行」需要校准。
function mountStatusNodes() {
  const host = document.getElementById('sim-console');
  if (!host) return;
  const rc = document.getElementById('sim-recover');
  if (rc && rc.parentNode !== host) host.appendChild(rc);
}

/* ── 10.1 统一状态输出流 consoleAppend(text, kind) ───────────────────────
 * 「仿真状态」面板的 #sim-console-log 是**全应用唯一的状态 / 日志出口**（第 39 轮）：
 *   · 本文件内部的布局动作（切预设 / 显隐 / 浮出 / 停靠）走 flash(msg)；
 *   · js/sim/ui-bridge.js（ESM）通过 window.wpConsoleAppend(text, kind) 写仿真链路的
 *     完成摘要 / 编译报错 / $display 输出 —— 对应 ui-bridge 的 consoleOut()。
 * 口径：
 *   · 一行一条；多行文本按换行拆行，**首行带时间戳**，续行缩进对齐（11 字符 =
 *     「[hh:mm:ss] 」的宽度），这样「编译报错原文」这类多行块仍是一整块可读文本；
 *   · kind ∈ info（默认）| ok | warn | error → 行类名 mk-cline[ mk-ok|mk-warn|mk-err]；
 *     `.mk-cline` 必须保留（tools/dock-probe.mjs 按它计行）；
 *   · 只留最近 CONSOLE_MAX 行（防长跑把 DOM 撑爆），追加后自动滚到底部。
 */
const CONSOLE_MAX = 300;
const CONSOLE_KIND_CLASS = { info: '', ok: ' mk-ok', warn: ' mk-warn', error: ' mk-err' };

function consoleAppend(text, kind) {
  const log = document.getElementById('sim-console-log');
  if (!log) return;
  const body = text == null ? '' : String(text);
  if (!body) return;
  const lines = body.split('\n');
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  const t = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  const stamp = '[' + p(t.getHours()) + ':' + p(t.getMinutes()) + ':' + p(t.getSeconds()) + '] ';
  const cls = 'mk-cline' + (CONSOLE_KIND_CLASS[kind] || '');
  for (let i = 0; i < lines.length; i += 1) {
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = i === 0 ? stamp + lines[i] : '           ' + lines[i];
    log.appendChild(line);
  }
  while (log.childElementCount > CONSOLE_MAX) log.removeChild(log.firstElementChild);
  log.scrollTop = log.scrollHeight;
}

// 对外暴露（ESM 的 ui-bridge 与 e2e 探针都靠它写日志流）。
window.wpConsoleAppend = consoleAppend;

function flash(msg) { consoleAppend(msg, 'info'); }

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
  // 预设会把整棵树换成新 id 的节点：上一棵树的「原位 / 折叠前位置」记忆全部失效，
  // 留着只会在 showPanel 里多绕两步（虽然结果仍被兜底修正）。清掉更省心。
  lastDock = {}; zoneCtx = {};
  render(); persist();
  flash('切换布局：' + (PRESET_NAME[name] || name) + '预设');
}
// 键名带 workspace 前缀：这是**真机**工作区布局（面板停靠树），与 .wp 工程存档无关，
// 也不与原型时期的 wavepaint.mock.* 键互相污染。
const LS_KEY = 'wavepaint.workspace.layout.v1';
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
  // 兜底：旧版本可能存下「一个面板都不剩」的死局（那时 ✕ 没有护栏）→ 直接回到
  // 默认预设，否则工作区空着、连「用 ＋ 加回来」的入口都不存在。
  if (!visiblePanels().length) {
    root = presetSim(); floats = {}; hidden = []; preset = 'sim';
    flash('上次保存的布局已无可见面板，已回到仿真预设');
  }
  return true;
}
// 第 44 轮：底部状态栏 #wp-status-bar 已整条删除（用户裁决：它占一行界面高度）。
// 本函数保留为「纯计数」工具：只统计 区 / 停靠 / 浮动 / 未显示 数量并返回，不碰 DOM。
// 调用点（初始化后与每次 render 后）保持不动，返回值目前无人消费；真正的状态文本
// 一律走日志流（consoleAppend → #sim-console-log，见第 10.1 节）。
function updateStatus() {
  let zones = 0, docked = 0;
  eachTabs(root, (n) => { zones++; docked += n.panels.length; });
  const vis = visiblePanels();
  const unplaced = PANEL_ORDER.filter((p) => vis.indexOf(p) < 0).length;
  return { zones, docked, floats: Object.keys(floats).length, unplaced };
}
function visiblePanels() {
  const out = [];
  eachTabs(root, (n) => n.panels.forEach((p) => out.push(p)));
  Object.keys(floats).forEach((p) => out.push(p));
  return out;
}

/* ── 11. 键盘 / 逃生开关 / 初始化 ──────────────────────────────────── */
// 键盘绑定只有 Esc：取消进行中的拖动（四种拖拽全部登记在 activeDragCancels）。
// 改布局一律靠鼠标，不留键盘快捷方式（免得不小心改坏布局）。
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') cancelAllDrags();
});
// 窗口失焦（Alt+Tab / 系统弹窗抢焦点）时统一收尾：此时指针的 pointerup 大概率
// 不会派发到本页面，不兜底就会留下「拖拽中」的僵尸状态。
window.addEventListener('blur', () => cancelAllDrags());
window.addEventListener('resize', () => { if (Object.keys(floats).length) renderFloats(); });

// ★ 停靠总开关（逃生口）
//   URL 带 ?dock=off（或 <html data-dock="off">）时本引擎整体让位：外壳保持
//   display:none，真机节点全部留在 #sim-panel-body，侧栏（含 panel-layout 的
//   折叠 / 高度分割 / 宽度拖拽）按老样子工作，ui-bridge 也照常装配它。用途：
//     · 线上出问题时改一个 URL 参数即可回退旧 UI，不必重编 exe；
//     · 回归脚本里「侧栏口径」的断言用同一台真机页面就能复现（见 tools/e2e-ui.mjs）。
function dockDisabled() {
  try {
    if (/(?:^|[?&])dock=off(?:&|#|$)/.test(location.search)) return true;
    if (document.documentElement.dataset.dock === 'off') return true;
  } catch (e) { /* 无 location（非浏览器环境）：不适用 */ }
  return false;
}

if (dockDisabled()) {
  // 关键：**不**定义 window.__wpDock —— ui-bridge 就是靠它判断「侧栏控制器是否让位」，
  // 不定义等于告诉 ui-bridge「照旧装配 initPanelLayout」。
  window.__wpDockOff = true;
} else {
  document.body.classList.add('wp-dock');
  mountStatusNodes();
  const restored = restore();
  render();
  if (!restored) persist();
  updateStatus();
  flash(restored ? '工作区已恢复上次布局（localStorage）' : '工作区就绪（默认仿真预设）');
  document.documentElement.dataset.dockReady = '1';

  window.__wpDock = {
  PANELS, get root() { return root; }, get floats() { return floats; }, visiblePanels,
  applyPreset, floatPanel, dockPanel, hidePanel, showPanel, render,
  openPanelMenu, closePanelMenu,
  // 几何 / 落点：hitTest 返回 computeDrop 的完整结果（{op, rect, tree}），
  // 兼容旧断言只需读 .op.type / .op.side / .op.index。
  hitTest: (x, y, panelId) => computeDrop(x, y, panelId),
  computeDrop, placePanel, layoutRects, workbenchContentRect, metrics, DROP,
  get ready() { return true; },
  get preset() { return preset; },
  get hidden() { return hidden.slice(); },
  setRoot: (r) => { root = r; },
  persistState: () => { persist(true); },
  reset: () => applyPreset('sim', true),
  flash,
  setupBands,
  };
}
