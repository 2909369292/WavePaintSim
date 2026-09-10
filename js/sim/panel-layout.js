// WavePaintClean js/sim/panel-layout.js —— 仿真侧栏「可拖拽多面板」布局控制器（第二十一轮）
//
// 设计口径（用户第二十/二十一轮拍板）：
//   · 面板形态 = 可拖拽多面板（引入 splitter），侧栏仍固定在右侧，层次树不左置；
//   · 本模块**只做布局**：折叠 / 分割 / 宽度 / session 持久化。
//     不碰仿真语义、不碰加信号链路、不碰服务自愈（C19）、不写 .wp 工程存档。
//
// 职责：
//   1. 卡片折叠：点卡片标题（或聚焦后 Enter/Space）切换 .collapsed；
//   2. 纵向 splitter：拖拽在相邻两张卡片之间重新分配高度权重（flex-grow）；
//      权重按「像素比例」记账 → 窗口缩放 / 侧栏变宽变窄时按比例自适应；
//   3. 横向 splitter（侧栏左缘）：拖拽改 --sim-panel-w，画布随之重新排布；
//   4. session 级持久化：sessionStorage 保存 {权重, 折叠态, 宽度}，
//      刷新页面保留，关闭标签页即弃（**绝不进工程存档**，见 memory/08 §2.4-4）。
//
// 契约面（memory/08 §2.5 冻结清单）：只读写本模块自己新增的
//   `[data-sim-card]` / `[data-sim-card-toggle]` / `[data-sim-split]` / `#sim-resize-x`，
//   以及 CSS 变量 `--sim-panel-w`；不改任何既有 id / class 的语义。

const STORAGE_VERSION = 1;
const MIN_CARD_PX = 24;        // 卡片最小高度（折叠态只剩标题行）
const MIN_BODY_PX = 24;        // 展开态卡片体最小高度（低于此值就只剩标题，没意义）
const MIN_CARD_CAP_RATIO = 0.8; // 单张卡片 min-height 上限 = 面板可视高 * 该比例（防止一张卡吃掉整屏）
const MIN_PANEL_WIDTH = 280;   // 侧栏最窄
const MAX_PANEL_WIDTH = 760;   // 侧栏最宽（再宽会挤压画布）
const KEY_STEP_PX = 16;        // 键盘微调步长

// 默认高度权重：按「像素比例」记账，比例约等于重构前的 180 / 240 / 240 / 160 + 卡片头
const DEFAULT_WEIGHTS = { source: 300, rtl: 245, vcd: 245, tb: 190 };
const FALLBACK_WEIGHT = 100;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * 把侧栏装配成可拖拽多面板。
 * @param {object} options
 * @param {HTMLElement} options.panel   #sim-panel（定位容器，宽度由 CSS 变量驱动）
 * @param {HTMLElement} options.body    .sim-panel-body（纵向 flex 容器）
 * @param {HTMLElement} [options.handle] #sim-resize-x（侧栏左缘拖拽条）
 * @param {string} [options.storageKey] sessionStorage key
 * @param {(info:{reason:string,width:number})=>void} [options.onLayout] 布局变化回调
 * @returns {null|{getState:Function, setWidth:Function, reset:Function, destroy:Function}}
 */
export function installSimPanelLayout(options = {}) {
  const panel = options.panel || null;
  const body = options.body || null;
  if (!panel || !body || typeof document === "undefined") return null;
  const doc = panel.ownerDocument || document;
  const win = doc.defaultView || globalThis;
  const storageKey = String(options.storageKey || "wavepaint.sim-panel-layout.v1");
  const onLayout = typeof options.onLayout === "function" ? options.onLayout : null;
  const handle = options.handle || null;

  const cards = [...body.querySelectorAll("[data-sim-card]")]
    .map((el) => ({
      key: String(el.dataset.simCard || ""),
      el,
      head: el.querySelector("[data-sim-card-toggle]"),
      bodyEl: el.querySelector(".sim-card-body"),
      collapsed: el.classList.contains("collapsed"),
      weight: FALLBACK_WEIGHT
    }))
    .filter((card) => card.key && card.head);
  if (!cards.length) return null;
  const byKey = new Map(cards.map((card) => [card.key, card]));

  const splits = [...body.querySelectorAll("[data-sim-split]")]
    .map((el) => ({
      el,
      pair: String(el.dataset.simSplit || "").split(":").map((part) => part.trim()).filter(Boolean)
    }))
    .filter((split) => split.pair.length === 2 && byKey.has(split.pair[0]) && byKey.has(split.pair[1]));

  const state = {
    weights: {},
    collapsed: {},
    width: readInitialWidth()
  };

  let saveTimer = null;
  let destroyed = false;

  for (const card of cards) {
    state.weights[card.key] = isPositiveNumber(DEFAULT_WEIGHTS[card.key])
      ? DEFAULT_WEIGHTS[card.key]
      : FALLBACK_WEIGHT;
    state.collapsed[card.key] = card.collapsed;
  }

  // ── 读取 / 写回 sessionStorage（只认本模块的 v1 结构；任何异常静默回退默认值）──
  function restore() {
    let raw = null;
    try {
      raw = win.sessionStorage ? win.sessionStorage.getItem(storageKey) : null;
    } catch {
      return; // 隐私模式 / 被禁用
    }
    if (!raw) return;
    let saved = null;
    try {
      saved = JSON.parse(raw);
    } catch {
      return;
    }
    if (!saved || typeof saved !== "object" || Number(saved.v) !== STORAGE_VERSION) return;
    if (saved.w && typeof saved.w === "object") {
      for (const card of cards) {
        if (isPositiveNumber(saved.w[card.key])) state.weights[card.key] = saved.w[card.key];
      }
    }
    if (saved.c && typeof saved.c === "object") {
      for (const card of cards) {
        if (typeof saved.c[card.key] === "boolean") state.collapsed[card.key] = saved.c[card.key];
      }
    }
    if (isPositiveNumber(saved.width)) state.width = saved.width;
  }

  function save() {
    if (destroyed) return;
    try {
      win.sessionStorage?.setItem(storageKey, JSON.stringify({
        v: STORAGE_VERSION,
        w: state.weights,
        c: state.collapsed,
        width: state.width
      }));
    } catch {
      /* 配额 / 禁用：布局仍然可用，只是不持久化 */
    }
  }

  function scheduleSave() {
    if (saveTimer) win.clearTimeout(saveTimer);
    saveTimer = win.setTimeout(() => {
      saveTimer = null;
      save();
    }, 220);
  }

  // ── 高度：按权重写 flex-grow（归一化到合计 100，保证窗口缩放时按比例自适应）──
  function applyWeights() {
    const visible = cards.filter((card) => !state.collapsed[card.key]);
    const total = visible.reduce((sum, card) => sum + state.weights[card.key], 0) || 1;
    for (const card of cards) {
      if (state.collapsed[card.key]) {
        card.el.style.flexGrow = "0";
        card.el.style.flexBasis = "auto";
        continue;
      }
      card.el.style.flexGrow = String((state.weights[card.key] / total) * 100);
      card.el.style.flexBasis = "0";
    }
  }

  function syncSplitState() {
    for (const split of splits) {
      const disabled = split.pair.some((key) => !!state.collapsed[key]);
      split.el.classList.toggle("disabled", disabled);
      split.el.setAttribute("aria-disabled", disabled ? "true" : "false");
    }
  }

  function syncCardAria() {
    for (const card of cards) {
      card.head.setAttribute("aria-expanded", state.collapsed[card.key] ? "false" : "true");
    }
  }

  function applyCollapsed() {
    for (const card of cards) {
      card.el.classList.toggle("collapsed", !!state.collapsed[card.key]);
    }
  }

  // ── 内容最小高度：防止窗口变矮时把卡片的固定控件（尤其源码卡的工具栏）压没 ──
  // 历史 bug（第二十一轮自测发现）：视口 750x485 时源码卡被压到 80px，
  // 工具栏（约 170px）被 overflow 裁掉，坐标点击「运行仿真」落到 VCD 卡上 → 仿真无法触发。
  // 口径：固定块（flex-grow=0）按实测 offsetHeight 计，弹性块按自身 min-height 计，
  //      再加上卡片体的 padding / gap；折叠卡片不写（交给 CSS 只留标题行）。
  function measureMinHeight(card) {
    const headH = card.head.offsetHeight || 0;
    if (!card.bodyEl) return Math.max(MIN_CARD_PX, headH + MIN_BODY_PX);
    const bodyStyle = win.getComputedStyle(card.bodyEl);
    const pad = (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);
    const gap = parseFloat(bodyStyle.rowGap) || 0;
    const kids = [...card.bodyEl.children].filter(
      (kid) => win.getComputedStyle(kid).display !== "none"
    );
    let need = pad + gap * Math.max(0, kids.length - 1);
    for (const kid of kids) {
      const kidStyle = win.getComputedStyle(kid);
      const grow = parseFloat(kidStyle.flexGrow) || 0;
      need += grow > 0 ? parseFloat(kidStyle.minHeight) || 0 : kid.offsetHeight || 0;
    }
    return Math.max(MIN_CARD_PX, Math.ceil(headH + need));
  }

  // 写 min-height：既保证卡片不低于内容需求，又给单卡一个上限（否则一张卡能把
  // 其它卡全顶出可视区、用户要滚很远）。上限按面板可视高比例算，滚动由 CSS 兜住。
  function applyMinHeights() {
    const viewportH = body.clientHeight || 0;
    const cap = viewportH > 0
      ? Math.max(MIN_CARD_PX, Math.round(viewportH * MIN_CARD_CAP_RATIO))
      : Infinity;
    for (const card of cards) {
      if (state.collapsed[card.key]) {
        card.el.style.minHeight = "";
        continue;
      }
      card.el.style.minHeight = Math.min(measureMinHeight(card), cap) + "px";
    }
  }

  function notify(reason) {
    if (!onLayout) return;
    try {
      onLayout({ reason, width: state.width });
    } catch {
      /* 回调失败不影响布局 */
    }
  }

  function commit(reason) {
    applyMinHeights();
    applyWeights();
    syncSplitState();
    syncCardAria();
    scheduleSave();
    notify(reason);
  }

  function toggleCard(key, force) {
    const card = byKey.get(key);
    if (!card) return;
    const next = typeof force === "boolean" ? force : !state.collapsed[key];
    if (next === state.collapsed[key]) return;
    state.collapsed[key] = next;
    applyCollapsed();
    commit("card-toggle");
  }

  // ── 宽度：写 CSS 变量（#sim-panel 与 body.sim-open #main-area 同时读它）──
  function maxWidth() {
    const viewport = Number(win.innerWidth) || 1280;
    return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, Math.round(viewport * 0.6)));
  }

  function applyWidth() {
    state.width = Math.round(clamp(state.width, MIN_PANEL_WIDTH, maxWidth()));
    doc.documentElement.style.setProperty("--sim-panel-w", state.width + "px");
  }

  function setWidth(px) {
    state.width = Number(px);
    applyWidth();
    // 侧栏变宽/变窄会让工具栏折行数变化 → 内容最小高度要重算
    applyMinHeights();
    return state.width;
  }

  function readInitialWidth() {
    const cssValue = Number.parseFloat(
      (doc.defaultView || globalThis).getComputedStyle?.(panel)?.width || ""
    );
    if (Number.isFinite(cssValue) && cssValue > 0) return cssValue;
    return 328;
  }

  // 拖拽宽度时画布要跟着重排：派发一次 window resize（核心 editor/measure.js 监听它）
  let resizeFrame = null;
  function requestCanvasReflow() {
    if (resizeFrame) return;
    const raf = win.requestAnimationFrame || ((fn) => win.setTimeout(fn, 16));
    resizeFrame = raf(() => {
      resizeFrame = null;
      try {
        win.dispatchEvent(new win.Event("resize"));
      } catch {
        /* 老环境没有 Event 构造器：忽略 */
      }
    });
  }

  // ── 事件：卡片标题折叠 ──
  const toggleHandlers = [];
  for (const card of cards) {
    const onClick = (event) => {
      // 标题行里可能有按钮（如 #sim-tb-copy）：点这些控件不折叠
      if (event.target?.closest?.("button, a, input, select, textarea, label")) return;
      toggleCard(card.key);
    };
    const onKeyDown = (event) => {
      if (event.target !== card.head) return;
      const key = String(event.key || "");
      if (key !== "Enter" && key !== " " && key !== "Spacebar") return;
      event.preventDefault();
      toggleCard(card.key);
    };
    card.head.addEventListener("click", onClick);
    card.head.addEventListener("keydown", onKeyDown);
    toggleHandlers.push({ head: card.head, onClick, onKeyDown });
  }

  // ── 事件：纵向 splitter（拖拽 / 键盘）──
  const dragCleanups = [];
  let activeDragCleanup = null; // 正在进行的拖拽（同一时刻最多一个）

  function resizePair(pair, deltaPx) {
    const [keyA, keyB] = pair;
    const cardA = byKey.get(keyA);
    const cardB = byKey.get(keyB);
    if (!cardA || !cardB || state.collapsed[keyA] || state.collapsed[keyB]) return false;
    const heightA = cardA.el.offsetHeight;
    const heightB = cardB.el.offsetHeight;
    const total = heightA + heightB;
    if (total <= MIN_CARD_PX * 2) return false;
    const nextA = clamp(heightA + deltaPx, MIN_CARD_PX, total - MIN_CARD_PX);
    state.weights[keyA] = nextA;
    state.weights[keyB] = total - nextA;
    applyWeights();
    return true;
  }

  for (const split of splits) {
    const onPointerDown = (event) => {
      if (split.el.classList.contains("disabled")) return;
      if (event.button != null && event.button !== 0) return;
      const [keyA, keyB] = split.pair;
      const cardA = byKey.get(keyA);
      const cardB = byKey.get(keyB);
      if (!cardA || !cardB) return;
      const heightA = cardA.el.offsetHeight;
      const heightB = cardB.el.offsetHeight;
      const total = heightA + heightB;
      if (total <= MIN_CARD_PX * 2) return;
      event.preventDefault();
      const startY = Number(event.clientY) || 0;
      split.el.classList.add("dragging");
      doc.body.classList.add("sim-resizing");
      split.el.setPointerCapture?.(event.pointerId);

      const onMove = (moveEvent) => {
        const delta = (Number(moveEvent.clientY) || 0) - startY;
        if (resizePair(split.pair, delta)) notify("split");
      };
      const removeDragListeners = () => {
        doc.removeEventListener("pointermove", onMove, true);
        doc.removeEventListener("pointerup", finish, true);
        doc.removeEventListener("pointercancel", finish, true);
      };
      const finish = () => {
        split.el.classList.remove("dragging");
        doc.body.classList.remove("sim-resizing");
        removeDragListeners();
        activeDragCleanup = null;
        save();
        notify("split-end");
      };
      doc.addEventListener("pointermove", onMove, true);
      doc.addEventListener("pointerup", finish, true);
      doc.addEventListener("pointercancel", finish, true);
      activeDragCleanup = removeDragListeners;
    };
    const onKeyDown = (event) => {
      const key = String(event.key || "");
      const step = key === "ArrowUp" ? -KEY_STEP_PX : key === "ArrowDown" ? KEY_STEP_PX : 0;
      if (!step) return;
      event.preventDefault();
      if (resizePair(split.pair, step)) {
        scheduleSave();
        notify("split-key");
      }
    };
    split.el.addEventListener("pointerdown", onPointerDown);
    split.el.addEventListener("keydown", onKeyDown);
    dragCleanups.push(() => {
      split.el.removeEventListener("pointerdown", onPointerDown);
      split.el.removeEventListener("keydown", onKeyDown);
    });
  }

  // ── 事件：侧栏宽度（拖左缘 / 键盘）──
  if (handle) {
    const onPointerDown = (event) => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      const startX = Number(event.clientX) || 0;
      const startWidth = state.width;
      handle.classList.add("dragging");
      doc.body.classList.add("sim-resizing");
      handle.setPointerCapture?.(event.pointerId);

      const onMove = (moveEvent) => {
        // 侧栏贴右缘：鼠标左移（clientX 变小）→ 侧栏变宽
        const delta = startX - (Number(moveEvent.clientX) || 0);
        setWidth(startWidth + delta);
        requestCanvasReflow();
      };
      const removeDragListeners = () => {
        doc.removeEventListener("pointermove", onMove, true);
        doc.removeEventListener("pointerup", finish, true);
        doc.removeEventListener("pointercancel", finish, true);
      };
      const finish = () => {
        handle.classList.remove("dragging");
        doc.body.classList.remove("sim-resizing");
        removeDragListeners();
        activeDragCleanup = null;
        // 收尾时再派发一次并让画布按最终宽度重排（拖动过程用的是 rAF 节流）
        try {
          win.dispatchEvent(new win.Event("resize"));
        } catch {
          /* 忽略 */
        }
        save();
        notify("width-end");
      };
      doc.addEventListener("pointermove", onMove, true);
      doc.addEventListener("pointerup", finish, true);
      doc.addEventListener("pointercancel", finish, true);
      activeDragCleanup = removeDragListeners;
    };
    const onKeyDown = (event) => {
      const key = String(event.key || "");
      // 左方向键 = 变宽（更贴 Verdi 习惯：拖手往左拉 = 面板变宽）
      const step = key === "ArrowLeft" ? KEY_STEP_PX : key === "ArrowRight" ? -KEY_STEP_PX : 0;
      if (!step) return;
      event.preventDefault();
      setWidth(state.width + step);
      requestCanvasReflow();
      scheduleSave();
      notify("width-key");
    };
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("keydown", onKeyDown);
    dragCleanups.push(() => {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("keydown", onKeyDown);
    });
  }

  // 窗口尺寸变化：宽度上限跟着视口走（不主动改用户设定的宽度，只做收缩保护）
  const onWindowResize = () => {
    applyMinHeights();
    if (state.width > maxWidth()) {
      applyWidth();
      scheduleSave();
      notify("clamp");
    }
  };
  win.addEventListener("resize", onWindowResize);
  dragCleanups.push(() => win.removeEventListener("resize", onWindowResize));

  function reset() {
    for (const card of cards) {
      state.weights[card.key] = isPositiveNumber(DEFAULT_WEIGHTS[card.key])
        ? DEFAULT_WEIGHTS[card.key]
        : FALLBACK_WEIGHT;
      state.collapsed[card.key] = false;
    }
    state.width = 328;
    applyCollapsed();
    applyWidth();
    commit("reset");
    return getState();
  }

  function getState() {
    return {
      width: state.width,
      cards: cards.map((card) => ({
        key: card.key,
        collapsed: !!state.collapsed[card.key],
        weight: state.weights[card.key],
        grow: card.el.style.flexGrow || ""
      }))
    };
  }

  function destroy() {
    destroyed = true;
    if (saveTimer) win.clearTimeout(saveTimer);
    for (const entry of toggleHandlers) {
      entry.head.removeEventListener("click", entry.onClick);
      entry.head.removeEventListener("keydown", entry.onKeyDown);
    }
    for (const cleanup of dragCleanups) cleanup();
    dragCleanups.length = 0;
    if (activeDragCleanup) activeDragCleanup();
    activeDragCleanup = null;
  }

  restore();
  applyCollapsed();
  applyMinHeights();
  applyWidth();
  applyWeights();
  syncSplitState();
  syncCardAria();

  return { getState, setWidth, reset, destroy };
}
