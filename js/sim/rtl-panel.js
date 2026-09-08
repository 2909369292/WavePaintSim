// js/sim/rtl-panel.js —— #75 P0 的 UI 渲染层（代码视图 + RTL 树 + VCD 层次）
// -----------------------------------------------------------------------------
// 职责：
//   1. installCodeEditor：把 CodeMirror 6 代码视图挂到 .cm-host；textarea 作为
//      「数据镜像」保留（display:none），所有旧路径读 refs.sourceEditor.value
//      依然成立，ui-bridge 无需大规模改写；
//   2. renderRtlTree：把 buildRtlNav() 的模块/端口/参数/实例树渲染成可点击跳转
//      的行（点击 → onJump({fileIndex, line, kind, name})）；
//   3. renderVcdTree：把 buildVcdHierarchy() 的 VCD 层次树渲染成折叠列表
//      （点击信号 → onSignalPick(完整点分路径)）。
// 约束：纯 DOM 渲染 + 持有 CodeMirror 实例，不 import ui-bridge（避免循环依赖）；
//      结构数据来自 js/sim/rtl-nav.js 与 js/sim/vcd-index.js（已可单测）。

function elFromDoc(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

// ---------------------------------------------------------------------------
// 1. CodeMirror 6 代码视图
// ---------------------------------------------------------------------------
export function installCodeEditor({ host, textarea, doc = "", onChange }) {
  const cm = globalThis.WPCm;
  const canUseCm = !!(host && textarea && cm && typeof cm.createVerilogEditor === "function");
  let view = null;
  let lastText = String(doc || "");

  const notifyUserChange = (text) => {
    if (typeof onChange === "function") onChange(text);
  };

  if (canUseCm) {
    // 用户编辑：先镜像回 textarea（保持旧读路径 .value 恒等于当前 doc），再回调
    const userChanged = (text) => {
      textarea.value = text;
      lastText = text;
      notifyUserChange(text);
    };
    view = cm.createVerilogEditor(host, { doc: lastText, onChange: userChanged });
  }

  return {
    get active() {
      return canUseCm && !!view;
    },
    // textarea 永远是镜像源：无论 CM 是否可用，读 .value 都是「当前文档」
    getText() {
      return textarea.value;
    },
    // 程序性切换文档（切文件/新建/载入）。CM 可用时重建 EditorView：
    //   1) 每次切换重置 undo/redo 历史（否则 Ctrl+Z 会把上一文件的全文回滚进来）；
    //   2) 不触发 onChange（程序性写入，由调用方负责保存旧文件）。
    setText(text) {
      const next = String(text || "");
      textarea.value = next;
      if (!canUseCm) return;
      if (next === lastText && view) return;
      lastText = next;
      if (view) view.destroy();
      view = cm.createVerilogEditor(host, {
        doc: next,
        onChange: (changed) => {
          textarea.value = changed;
          lastText = changed;
          notifyUserChange(changed);
        }
      });
    },
    jumpToLine(line) {
      const target = Math.max(1, Number(line) || 1);
      if (view && typeof cm.jumpToLine === "function") {
        cm.jumpToLine(view, target);
        return true;
      }
      if (textarea) {
        // 无 CM（如 bundle 缺失回退 textarea）：尽力定位到行首
        textarea.focus();
        try {
          const lines = textarea.value.split("\n");
          const index = Math.min(target - 1, Math.max(0, lines.length - 1));
          const offset = lines.slice(0, index).reduce((sum, l) => sum + l.length + 1, 0);
          textarea.setSelectionRange(offset, offset);
          textarea.scrollTop = Math.max(0, (index + 1) * 16 - 60);
        } catch (e) { /* 忽略：跳行是增强能力 */ }
        return true;
      }
      return false;
    }
  };
}

// ---------------------------------------------------------------------------
// 2. RTL 结构树渲染
// ---------------------------------------------------------------------------
function makeJumpRow(doc, className, text, title, jump) {
  const row = elFromDoc(doc, "button", "rtl-jump-btn" + (className ? " " + className : ""), text);
  row.type = "button";
  if (title) row.title = title;
  row.addEventListener("click", (event) => {
    event.preventDefault();   // 阻止 <summary> 默认折叠切换
    event.stopPropagation();
    if (typeof jump === "function") jump();
  });
  return row;
}

function groupRows(doc, groupTitle, count, children) {
  const wrap = elFromDoc(doc, "div", "rtl-grp");
  wrap.append(elFromDoc(doc, "div", "rtl-grp-title", `${groupTitle}（${count}）`));
  const list = elFromDoc(doc, "div", "rtl-grp-list");
  for (const child of children) list.append(child);
  wrap.append(list);
  return wrap;
}

// 按文件分组渲染模块树。modules = buildRtlNav(files) 返回的模块列表。
export function renderRtlTree(container, modules, onJump) {
  if (!container) return;
  const doc = container.ownerDocument;
  container.replaceChildren();
  const list = Array.isArray(modules) ? modules : [];
  if (!list.length) {
    container.append(elFromDoc(doc, "div", "rtl-empty",
      "未解析到 module。源码为空，或等待编辑停止后自动刷新 / 点「解析 RTL」。"));
    return;
  }

  const fileOrder = [];
  const byFile = new Map();
  for (const mod of list) {
    const key = Number(mod?.fileIndex) || 0;
    if (!byFile.has(key)) {
      byFile.set(key, []);
      fileOrder.push(key);
    }
    byFile.get(key).push(mod);
  }

  for (const fileIndex of fileOrder) {
    const mods = byFile.get(fileIndex);
    const fileName = mods[0]?.file || `file_${fileIndex + 1}`;
    const fileDetails = elFromDoc(doc, "details", "rtl-file");
    fileDetails.open = true;
    const fileSummary = elFromDoc(doc, "summary", "rtl-file-summary", `📄 ${fileName}（${mods.length} 模块）`);
    fileDetails.append(fileSummary);

    for (const mod of mods) {
      const modDetails = elFromDoc(doc, "details", "rtl-module");
      modDetails.open = true;
      const modSummary = elFromDoc(doc, "summary", "rtl-module-summary");
      const go = () => onJump && onJump({ fileIndex, line: mod.moduleLine, kind: "module", name: mod.name });
      modSummary.append(makeJumpRow(doc, "rtl-module-go", `module ${mod.name}`, `跳转到 ${fileName} 第 ${mod.moduleLine} 行`, go));
      modSummary.append(elFromDoc(doc, "span", "rtl-module-meta",
        `端口 ${mod.portCount || 0} · 实例 ${mod.instanceCount || 0} · L${mod.moduleLine}`));
      modDetails.append(modSummary);

      if (mod.ports && mod.ports.length) {
        const rows = mod.ports.map((port) => {
          const label = `${port.direction || "?"} ${port.name}${port.range || ""}`;
          return makeJumpRow(doc, "rtl-port", `${label}  L${port.line}`,
            `${fileName}:${port.line} — ${label}`, () => onJump && onJump({
              fileIndex, line: port.line, kind: "port", name: port.name
            }));
        });
        modDetails.append(groupRows(doc, "端口 Ports", mod.ports.length, rows));
      }
      if (mod.parameters && mod.parameters.length) {
        const rows = mod.parameters.map((param) => {
          const label = param.value ? `${param.name} = ${param.value}` : param.name;
          return makeJumpRow(doc, "rtl-param", `parameter ${label}  L${param.line}`,
            `${fileName}:${param.line} — parameter ${label}`, () => onJump && onJump({
              fileIndex, line: param.line, kind: "parameter", name: param.name
            }));
        });
        modDetails.append(groupRows(doc, "参数 Parameters", mod.parameters.length, rows));
      }
      if (mod.instances && mod.instances.length) {
        const rows = mod.instances.map((inst) => {
          const label = inst.instanceName
            ? `${inst.instanceName} : ${inst.moduleName}`
            : `${inst.moduleName}`;
          return makeJumpRow(doc, "rtl-inst", `${label}  L${inst.line}`,
            `${fileName}:${inst.line} — ${label}`, () => onJump && onJump({
              fileIndex, line: inst.line, kind: "instance", name: inst.instanceName || inst.moduleName
            }));
        });
        modDetails.append(groupRows(doc, "实例 Instances", mod.instances.length, rows));
      }
      fileDetails.append(modDetails);
    }
    container.append(fileDetails);
  }
}

// ---------------------------------------------------------------------------
// 3. VCD 层次树渲染
// ---------------------------------------------------------------------------
export function renderVcdTree(container, index, onSignalPick) {
  if (!container) return;
  const doc = container.ownerDocument;
  container.replaceChildren();
  const tree = index?.tree;
  if (!tree || !index.signalCount) {
    container.append(elFromDoc(doc, "div", "vcd-empty",
      "暂无 VCD 信号。运行一次仿真后，这里会按 $scope 层次列出全部信号索引。"));
    return;
  }
  const meta = elFromDoc(doc, "div", "vcd-meta",
    `共 ${index.signalCount} 个信号 · ${index.scopeCount} 个层次作用域`);
  container.append(meta);

  // node.path 已经是完整点分路径（root 为 ""），信号全路径 = scope.path + 信号名
  const fullPathOf = (node) => String(node.path || "");

  // 把「作用域内直属信号」与「子作用域」一起渲染；root 直接列出顶层信号
  function appendScopeContent(parent, node) {
    const signals = Array.isArray(node.signals) ? node.signals : [];
    if (signals.length) {
      const signalList = elFromDoc(doc, "div", "vcd-signals");
      for (const signal of signals) {
        const scopePrefix = fullPathOf(node);
        const path = scopePrefix ? `${scopePrefix}.${signal.name}` : signal.name;
        const widthText = signal.width > 1 ? `[${signal.width - 1}:0]` : "";
        const row = elFromDoc(doc, "button", "vcd-signal-row", `${signal.name}${widthText}`);
        row.type = "button";
        row.title = `完整路径：${path}`;
        row.addEventListener("click", () => {
          if (typeof onSignalPick === "function") onSignalPick(path, signal);
        });
        signalList.append(row);
      }
      parent.append(signalList);
    }
    const scopes = Array.isArray(node.scopes) ? node.scopes : [];
    for (const scope of scopes) {
      const child = elFromDoc(doc, "details", "vcd-scope");
      child.open = true;
      const count = (scope.signals ? scope.signals.length : 0) + countDescendantSignals(scope);
      child.append(elFromDoc(doc, "summary", "vcd-scope-summary",
        `${scope.name}（${count} 信号）`));
      const childContent = elFromDoc(doc, "div", "vcd-scope-body");
      appendScopeContent(childContent, scope);
      child.append(childContent);
      parent.append(child);
    }
  }

  appendScopeContent(container, tree);
}

function countDescendantSignals(scope) {
  let count = 0;
  for (const child of scope?.scopes || []) {
    count += (child.signals ? child.signals.length : 0) + countDescendantSignals(child);
  }
  return count;
}
