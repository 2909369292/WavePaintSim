// ============================================================================
// WavePaintClean js/editor/file-menu.js —— 文件菜单修复与工程存取
// ----------------------------------------------------------------------------
// 背景（2026-09-04 发现的「死菜单」）：
//   核心 initMenuHandlers 按【英文菜单文本】绑定处理器（'New' / 'Open' /
//   'Save As' / 'Copy Share Link' / 'Load Example'），而 index.html 的菜单早已
//   汉化（新建/打开/另存为/复制分享链接/载入示例）→ 文本永不相等 →
//   文件菜单前五项点击毫无反应，核心自带的 .wp 工程保存/加载能力整体不可达。
//
// 本模块按当前中文文本重新绑定，直接复用核心自己的实现，不重造文件格式：
//   · 打开 / 另存为 → 核心 .wp 工程格式（openFile / saveToFile），
//     完整保存信号 values、标记、时间跳转、箭头、文本标注、步数等全部文档状态。
//   · 载入示例 → openLoadExampleDialog()
//   · 复制分享链接 → window.createShareLink()
//   · 新建 → 就地重置 document_wave。
//
// ⚠ 为什么「新建」必须就地重置而不是 new WaveDocument()：
//   核心内部的 document_wave 是脚本顶层 let（词法绑定），外部模块只能访问
//   window.document_wave。核心自己的 New 处理器只赋值词法变量（对象身份撕裂，
//   window 侧仍指旧文档 —— 潜伏 bug，因菜单死了从未暴露）。就地清空同一对象，
//   保证核心与 editor/sim 各模块永远操作同一个文档。
//
// 依赖：解混淆核心全局函数（openFile/saveToFile/openLoadExampleDialog/
//   wpConfirm/wpAlert/wpPrompt/createShareLink）、core/wpf.js。
// 加载顺序：普通 script，需在核心之后（跟其它 editor 模块一起即可）。
// ============================================================================
(function () {
  'use strict';
  if (window.__wpfFeatureFileMenu) return;
  window.__wpfFeatureFileMenu = true;

  window.__wpf.ready(function () {
    const wpf = window.__wpf;

    // 收起所有菜单（与核心处理器行为一致）
    function collapseMenus() {
      document.querySelectorAll('#menu-bar .submenu').forEach(function (el) {
        el.style.visibility = '';
        el.style.display = '';
      });
    }

    // 加载完成后（打开/示例/新建）同步画布周边 UI
    function syncAfterDocChange() {
      try {
        const dw = window.document_wave;
        const s = document.getElementById('sample-spin');
        const b = document.getElementById('substep-spin');
        if (s && dw) s.value = dw.m_sampleCount;
        if (b && dw) b.value = dw.m_subStepCount;
      } catch (e) { /* 控件缺失不致命 */ }
      try { if (typeof window.drawWaveform === 'function') window.drawWaveform(); } catch (e) {}
      try { if (typeof window.updateSidePanels === 'function') window.updateSidePanels(); } catch (e) {}
      try { if (typeof window.updateColorPicker === 'function') window.updateColorPicker(); } catch (e) {}
    }

    // 就地重置文档（见文件头注释：绝不 new WaveDocument() 替换对象）
    function resetDocumentInPlace() {
      const dw = window.document_wave;
      if (!dw) return;
      dw.m_signals = [];
      dw.m_vcdSignals = [];
      dw.m_markers = [];
      dw.m_timeJumps = [];
      dw.m_timeSpanMarkers = [];
      dw.m_arrows = [];
      dw.m_textAnnotations = [];
      dw.m_sampleCount = 30;
      dw.m_subStepCount = 1;
      dw.m_hasBlockClipboard = false;
      dw.m_undoStack = [];
      dw.m_redoStack = [];
      dw.m_modified = false;
      dw.m_nextArrowId = 1;
      dw.m_nextMarkerId = 1;
      dw.m_nextTimeJumpId = 1;
      dw.m_nextTimeSpanMarkerId = 1;
      dw.m_nextTextAnnotationId = 1;
      if (typeof window.clearSignalSelection === 'function') {
        try { window.clearSignalSelection(); } catch (e) { /* 非致命 */ }
      }
    }

    async function onNew() {
      const ok = await window.wpConfirm('新建波形？所有未保存的修改将丢失。', '新建');
      if (!ok) return;
      resetDocumentInPlace();
      // #86 A4：源码集合随工程走 —— 新建即复位源码标签页，避免残留上一个工程的源码。
      try { window.__wpsim && window.__wpsim.resetSourceFiles(); } catch (e) { /* 仿真面板未就绪：非致命 */ }
      syncAfterDocChange();
    }

    async function onOpen() {
      let loaded = false;
      try { loaded = await window.openFile(window.document_wave); } catch (e) { loaded = false; }
      if (loaded) {
        try { if (typeof window.clearSignalSelection === 'function') window.clearSignalSelection(); } catch (e) {}
        syncAfterDocChange();
      }
    }

    async function onOpenExample() {
      try { await window.openLoadExampleDialog(); } catch (e) { /* 核心内部已兜底提示 */ }
      syncAfterDocChange();
    }

    async function onSaveAs() {
      const name = await window.wpPrompt('输入文件名：', 'waveform.wp', '保存工程');
      if (!name) return;
      const ok = await window.saveToFile(window.document_wave, name);
      if (ok) await window.wpAlert('工程保存成功！', '保存工程');
      else await window.wpAlert('工程保存失败。', '保存工程');
    }

    async function onShareLink() {
      try {
        const link = await window.createShareLink(window.document_wave);
        let copied = false;
        try {
          await navigator.clipboard.writeText(link);
          copied = true;
        } catch (e) { /* 剪贴板不可用（非安全上下文等）→ 弹窗展示链接 */ }
        copied
          ? await window.wpAlert('分享链接已复制到剪贴板！\n\n' + link, '分享链接')
          : await window.wpPrompt('复制此分享链接：', link, '分享链接');
      } catch (e) {
        await window.wpAlert('创建分享链接失败。', '分享链接');
      }
    }

    // 汉化后的菜单文本 → 处理器。文本匹配与 index.html 保持同源
    // （核心历史实现即按文本绑定，本项目 UI 语言为中文）。
    const handlers = {
      '新建': onNew,
      '打开': onOpen,
      '载入示例': onOpenExample,
      '另存为': onSaveAs,
      '复制分享链接': onShareLink
    };

    document.querySelectorAll('#menu-bar .submenu li').forEach(function (li) {
      const text = String(li.textContent || '').trim();
      const handler = handlers[text];
      if (!handler) return;
      li.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation(); // 防核心同名文本处理器重复绑定（未来恢复英文兜底）
        collapseMenus();
        Promise.resolve().then(handler).catch(function (err) {
          console.error('[file-menu]', err);
        });
      });
    });

    // 「教程」菜单（data-action=tutorial）：核心处理器会 removeItem 教程完成标记并
    // 重跑隐形教程 —— 教程 UI 已被汉化版整体隐藏，重跑只会重新挂上
    // .wp-tutorial-highlight 并在 document 拦截 Enter/Space/方向键（无任何可见回报）。
    // 这里在捕获阶段拦下并改为一句中文提示，杜绝隐形教程重启。
    document.addEventListener('click', function (e) {
      const li = e.target && e.target.closest
        ? e.target.closest('#menu-bar li[data-action="tutorial"]')
        : null;
      if (!li) return;
      e.preventDefault();
      e.stopPropagation();
      collapseMenus();
      Promise.resolve().then(function () {
        return window.wpAlert('引导教程已在本版本隐藏，可直接上手绘制。\n\n想快速上手？试试「文件 → 载入示例」，或阅读底部仿真面板内的提示。', '教程');
      }).catch(function (err) {
        console.error('[file-menu] tutorial', err);
      });
    }, true);
  }, 'editor/file-menu');
})();
