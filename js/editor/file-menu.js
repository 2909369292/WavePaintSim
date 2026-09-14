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

    // 状态出口：全应用唯一状态口 = 「仿真状态」日志流（window.wpConsoleAppend）。
    // 打不开时不再弹英文模态框（核心 tool-open 原行为），而是写一行日志。
    function notify(text, kind) {
      if (typeof window.wpConsoleAppend === 'function') window.wpConsoleAppend(text, kind || 'info');
    }

    // 临时包一层 picker，用来区分「用户点了取消」（AbortError）与真正的失败：
    // 核心 openFile / saveToFile 的 catch 会把两者都吞成 false，外层无从分辨。
    // 返回值 { value, cancelled }；无论成功失败都保证把原函数还原。
    async function withPickerCancelWatch(pickerName, run) {
      const original = window[pickerName];
      let cancelled = false;
      if (typeof original === 'function') {
        window[pickerName] = function () {
          return original.apply(window, arguments).catch(function (err) {
            if (err && err.name === 'AbortError') cancelled = true;
            throw err;
          });
        };
      }
      try {
        const value = await run();
        return { value: value, cancelled: cancelled };
      } finally {
        if (typeof original === 'function') window[pickerName] = original;
      }
    }

    // 打开（菜单「打开」与工具栏「打开」共用）：直接弹系统「打开文件」对话框。
    async function onOpen() {
      const { value: loaded, cancelled } = await withPickerCancelWatch('showOpenFilePicker',
        function () { return window.openFile(window.document_wave); });
      if (loaded) {
        try { if (typeof window.clearSignalSelection === 'function') window.clearSignalSelection(); } catch (e) {}
        syncAfterDocChange();
        const handle = window.document_wave && window.document_wave._fileHandle;
        notify('已打开工程' + (handle && handle.name ? '：' + handle.name : '。'), 'ok');
      } else if (cancelled || typeof window.showOpenFilePicker !== 'function') {
        // 无 FSA 时走核心的隐藏 <input type=file> 回退：用户取消同样拿不到文件，
        // 这时无法与「打开失败」区分，按正常软件语义静默处理，不误报失败。
        notify('已取消打开工程。', 'info');
      } else {
        notify('打开工程失败：文件不是有效的 .wp 工程，或读取被拒绝。', 'error');
      }
    }

    async function onOpenExample() {
      try { await window.openLoadExampleDialog(); } catch (e) { /* 核心内部已兜底提示 */ }
      syncAfterDocChange();
    }

    // 另存为（第 51 轮用户裁决）：**不弹自定义输入框问文件名**，点一下直接就是系统
    // 「保存文件」对话框 —— 与正常软件的保存逻辑一致。核心 saveToFile 内部已优先用
    // `window.showSaveFilePicker`（回退 blob 下载），这里只去掉外面那层 wpPrompt。
    //
    // · 建议文件名：已保存 / 已打开过的工程沿用它的文件名（`_fileHandle.name`，
    //   核心保存成功时会记下 handle），否则用核心默认的 `waveform.wp`。
    // · 取消语义：用户在系统对话框点「取消」→ showSaveFilePicker 抛 AbortError，
    //   而核心 saveToFile 的 try/catch 会把它吞成 `false`（与真正的写盘失败无法区分）。
    //   这里临时包一层 picker 记录「是不是取消」，取消就静默返回（正常软件按取消
    //   不会弹「失败」提示）；只有**非取消**的失败才提示。
    // · 成功不弹模态框（正常软件保存成功不打断用户），工程「已修改」标记由核心清除。
    async function onSaveAs() {
      const dw = window.document_wave;
      if (!dw) return;
      const suggested = (dw._fileHandle && dw._fileHandle.name) || 'waveform.wp';
      let cancelled = false;
      const originalPicker = window.showSaveFilePicker;
      if (typeof originalPicker === 'function') {
        window.showSaveFilePicker = function () {
          const args = arguments;
          return originalPicker.apply(window, args).catch(function (err) {
            if (err && err.name === 'AbortError') cancelled = true;
            throw err;
          });
        };
      }
      let ok = false;
      try {
        ok = await window.saveToFile(dw, suggested);
      } finally {
        if (typeof originalPicker === 'function') window.showSaveFilePicker = originalPicker;
      }
      if (cancelled) return;
      if (!ok) await window.wpAlert('工程保存失败。', '保存工程');
    }

    // #122：打开源码目录（RTL 源码集合的自动扫描入口）。
    // 实现全在仿真侧 js/sim/ui-bridge.js（源码集合 state.files 归它管），这里只转发。
    async function onOpenSourceDir() {
      const sim = window.__wpsim;
      if (!sim || typeof sim.openSourceDirectory !== 'function') {
        await window.wpAlert('仿真面板尚未就绪，请稍后重试。', '打开源码目录');
        return;
      }
      try {
        await sim.openSourceDirectory();
      } catch (err) {
        console.error('[file-menu] openSourceDirectory', err);
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // 第 52 轮用户裁决：工具栏「打开 / 保存」= **正常软件的文件逻辑**
    //   · 打开 → 直接弹系统「打开文件」对话框（就是上面的 onOpen，取消/成功都有反馈）；
    //   · 保存 → 直接弹系统「保存文件」对话框（核心的 tool-save 是弹自定义输入框
    //     问文件名，按裁决废弃）；**已经存过盘的工程**（有 _fileHandle）沿用正常软件
    //     语义直接写回原文件、不再弹框；写回失败（权限过期等）自动退到「另存为」。
    //
    // 绑定方式：核心 initToolbarHandlers 用 `element.onclick = …` 赋值绑定，本模块的
    // 就绪回调必然在核心之后执行（index.html 里 wavepaint.clean.js 的 <script> 先于
    // editor/file-menu.js，两者的 DOMContentLoaded 回调按注册顺序触发），因此直接覆盖
    // .onclick 属性即可 —— 不新增监听，天然不会与核心处理器重复触发。
    async function onSave() {
      const dw = window.document_wave;
      if (!dw) return;
      const handle = (typeof window.showSaveFilePicker === 'function') ? dw._fileHandle : null;
      if (!handle) { await onSaveAs(); return; }   // 没存过盘 → 等同「另存为」
      // 复用核心写盘路径：把 picker 临时换成「直接返回已有 handle」，
      // saveToFile 就会走 createWritable/write/close 静默写回原文件（零对话框）。
      const original = window.showSaveFilePicker;
      window.showSaveFilePicker = function () { return Promise.resolve(handle); };
      let ok = false;
      try {
        ok = await window.saveToFile(dw, handle.name || 'waveform.wp');
      } finally {
        window.showSaveFilePicker = original;
      }
      if (ok) { notify('工程已保存到 ' + (handle.name || '原文件') + '。', 'ok'); return; }
      notify('写回原文件失败（文件权限可能已过期），改为弹出「另存为」对话框。', 'warn');
      await onSaveAs();
    }

    function bindToolbarFileButtons() {
      const openBtn = document.getElementById('tool-open');
      const saveBtn = document.getElementById('tool-save');
      if (openBtn) openBtn.onclick = function () { onOpen(); };
      if (saveBtn) saveBtn.onclick = function () { onSave(); };
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
      // 第 52 轮新增：正常软件语义的「保存」——已存过盘直接写回原文件（零对话框），
      // 没存过盘等同「另存为」（弹系统保存对话框）。
      '保存': onSave,
      '另存为': onSaveAs,
      '复制分享链接': onShareLink
    };

    // #122：带 data-wpv-* 的菜单项不走文本表（文本将来改字不会失联）。
    document.querySelectorAll('#menu-bar [data-wpv-open-source-dir]').forEach(function (li) {
      li.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        collapseMenus();
        Promise.resolve().then(onOpenSourceDir).catch(function (err) {
          console.error('[file-menu]', err);
        });
      });
    });

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

    // （历史）「教程」拦截块已在第 48 轮删除：index.html 的「帮助 → 教程」菜单项
    // 被移除后，核心 data-action="tutorial" 的隐形教程入口再也点不到，这里的
    // 捕获拦截成为死代码。核心里的 handleAction('tutorial') case 属于 C9 红线
    // 内的死代码，保留不动、也无害。
    bindToolbarFileButtons();
  }, 'editor/file-menu');
})();
