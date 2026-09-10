// js/sim/rtl-panel.js —— #75 P0 的 UI 渲染层（代码视图 + RTL 树 + VCD 层次）
// -----------------------------------------------------------------------------
// 职责：
//   1. installCodeEditor：把 CodeMirror 6 代码视图挂到 .cm-host；textarea 作为
//      「数据镜像」保留（display:none），所有旧路径读 refs.sourceEditor.value
//      依然成立，ui-bridge 无需大规模改写；
//   2. renderRtlTree：把 buildRtlNav() 的模块/实例树渲染成可点击跳转的行（点击 →
//      onJump({fileIndex, line, kind, name})）。第十二轮澄清：RTL 树只做「代码层级
//      浏览」（文件 → 模块 → 实例），不渲染端口/参数分组、不显示接口信号、不承担
//      任何加信号交互（数据层 buildRtlNav 仍产出 ports/params 供解析与 scope 映射复用）；
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
// 1a. #76 B4：从「选区 / 光标」取符号名（“中追”式「点代码变量 → 加波形」的取词口径）
// ---------------------------------------------------------------------------
// 纯函数（不碰 DOM），regression.mjs 直接单测。规则：
//   1) 有选区   → 取选区里的第一个「非关键字」标识符（"assign acc = q;" 选中整行 → acc）；
//   2) 无选区   → 以光标为界向左右扩到标识符边界（"q <= q + 1;" 点在 q 内 → q）；
//   3) 层次名   → 只取末段基名（"tb.dut.q" / "u_sub.q" → q，交给 B1 按行/文件消歧）；
//   4) 位选下标 → 光标落在 "q[3:0]" 的 3 上 → 向前找回基名 q；纯数字/越界 → 空串；
//   5) Verilog 关键字（module / wire / always ...）→ 空串（不触发加信号）。
const VERILOG_IDENT = "[A-Za-z_$][A-Za-z0-9_$]*";
// 选区取词允许带层次点号（一次把 "tb.dut.q" 整段吃掉，再取末段基名）。
const IDENT_SCAN = new RegExp(`${VERILOG_IDENT}(?:\\.${VERILOG_IDENT})*`, "g");
const IDENT_CHAR = /[A-Za-z0-9_$]/;
const BITSEL_LOOKBACK = /([A-Za-z_$][A-Za-z0-9_$]*)\s*\[[^\[\]]*$/;
const VERILOG_KEYWORDS = new Set([
  "module", "endmodule", "input", "output", "inout", "wire", "reg", "logic", "bit", "byte",
  "integer", "real", "realtime", "time", "parameter", "localparam", "defparam", "genvar",
  "assign", "initial", "always", "always_comb", "always_ff", "always_latch", "begin", "end",
  "if", "else", "case", "casex", "casez", "endcase", "default", "for", "while", "repeat",
  "forever", "function", "endfunction", "task", "endtask", "generate", "endgenerate",
  "posedge", "negedge", "signed", "unsigned", "packed", "struct", "enum", "typedef", "union",
  "import", "export", "package", "endpackage", "interface", "endinterface", "modport",
  "virtual", "class", "endclass", "new", "return", "break", "continue", "do", "fork", "join",
  "join_any", "join_none", "wait", "disable", "force", "release", "deassign", "specify",
  "endspecify", "primitive", "endprimitive", "table", "endtable", "string", "int", "longint",
  "shortint", "void", "automatic", "static", "const", "ref", "this", "super", "extends",
  "implements", "extern", "pure", "unique", "unique0", "priority", "assert", "assume",
  "cover", "property", "endproperty", "sequence", "endsequence", "covergroup", "endgroup",
  "rand", "randc", "supply0", "supply1", "tri", "tri0", "tri1", "wand", "wor", "and", "or",
  "nand", "nor", "xor", "xnor", "not", "buf", "bufif0", "bufif1", "notif0", "notif1", "pulldown",
  "pullup", "tran", "tranif0", "tranif1", "cmos", "nmos", "pmos", "rcmos", "rtran", "rtranif0",
  "rtranif1", "scalared", "vectored", "highz0", "highz1", "strong0", "strong1", "weak0", "weak1"
]);

function baseSymbolName(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const segments = text.split(".");
  // ⚠ 关键字只看首段：裸 "wire" 要挡掉，但 "tb.wire" / "u.wire" 是层次名，必须保留。
  if (!segments[0] || VERILOG_KEYWORDS.has(segments[0].toLowerCase())) return "";
  const name = segments[segments.length - 1] || "";
  if (!name) return "";
  return name;
}

// 选区里可能出现关键字前缀（"assign acc = q;"）：逐个扫，取第一个能成符号的标识符。
function firstSymbolIn(segment) {
  IDENT_SCAN.lastIndex = 0;
  let hit;
  while ((hit = IDENT_SCAN.exec(segment))) {
    const name = baseSymbolName(hit[0]);
    if (name) return name;
  }
  return "";
}

function isIdentAdjacent(text, pos) {
  const src = String(text ?? "");
  return (pos > 0 && IDENT_CHAR.test(src[pos - 1])) || (pos < src.length && IDENT_CHAR.test(src[pos]));
}

export function symbolNameAt(text, from, to) {
  const src = String(text ?? "");
  const len = src.length;
  const clampIndex = (value) => Math.min(Math.max(0, Number(value) || 0), len);
  let start = clampIndex(from);
  let end = clampIndex(to);
  if (end < start) { const swap = start; start = end; end = swap; }
  if (end > start) {
    return firstSymbolIn(src.slice(start, end));
  }
  let wordStart = start;
  let wordEnd = start;
  while (wordStart > 0 && IDENT_CHAR.test(src[wordStart - 1])) wordStart -= 1;
  while (wordEnd < len && IDENT_CHAR.test(src[wordEnd])) wordEnd += 1;
  const word = src.slice(wordStart, wordEnd);
  if (word && !/^[0-9]+$/.test(word)) return baseSymbolName(word);
  // 光标落在位选下标（"q[3:0]" 的 3、"q[1]" 的 1）→ 向前找回基名
  const back = src.slice(0, start).match(BITSEL_LOOKBACK);
  return back ? baseSymbolName(back[1]) : "";
}

// ---------------------------------------------------------------------------
// 1. CodeMirror 6 代码视图
// ---------------------------------------------------------------------------
// onAddSymbol({name,line,selection,exact,via,anchor})：#76 B4 的代码侧入口，
// 由 ui-bridge 负责「符号 → VCD 路径 → 画布观察行」；rtl-panel 只负责取词与触发。
export function installCodeEditor({ host, textarea, doc = "", onChange, onAddSymbol }) {
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

  // 当前光标/选区处的符号上下文（B4 加信号 + B3 反向定位都用它取词）。
  function readContext() {
    if (view) {
      const text = view.state.doc.toString();
      const sel = view.state.selection.main;
      return {
        name: symbolNameAt(text, sel.from, sel.to),
        line: view.state.doc.lineAt(sel.from).number,
        selection: text.slice(sel.from, sel.to),
        exact: sel.to > sel.from || isIdentAdjacent(text, sel.from),
        source: "cm"
      };
    }
    if (textarea) {
      const text = String(textarea.value || "");
      const from = Number(textarea.selectionStart) || 0;
      const to = Number(textarea.selectionEnd) || 0;
      return {
        name: symbolNameAt(text, from, to),
        line: text.slice(0, from).split("\n").length,
        selection: text.slice(from, to),
        exact: to > from || isIdentAdjacent(text, from),
        source: "textarea"
      };
    }
    return { name: "", line: 0, selection: "", exact: false, source: "none" };
  }

  // #76 B4 触发面：双击变量名 / 右键菜单 / Ctrl+Alt+W（Verdi「中追」的等价手势）。
  // ⚠ 不用 Ctrl+W：浏览器（Edge --app 窗口）把它保留为「关闭窗口」，页面无法拦截。
  // ⚠ 监听挂在宿主上（捕获 keydown + 冒泡 dblclick/contextmenu）：CM6 自己会处理
  //    双击选词，冒泡阶段读选区即可拿到完整词；不需要改 CM6 bundle（免重建 lib/）。
  if (typeof onAddSymbol === "function" && host) {
    const request = (via, event) => {
      const ctx = readContext();
      if (via === "dblclick" && !ctx.exact) return; // 双击空白/运算符不触发
      const anchor = event
        ? { x: Number(event.clientX) || 0, y: Number(event.clientY) || 0 }
        : null;
      onAddSymbol({ ...ctx, via, anchor });
    };
    host.addEventListener("dblclick", (event) => request("dblclick", event));
    host.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      request("menu", event);
    });
    host.addEventListener("keydown", (event) => {
      const key = String(event.key || "").toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || !event.altKey || key !== "w") return;
      event.preventDefault();
      event.stopPropagation();
      request("hotkey", event);
    }, true);
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
    },
    // 取词口径见文件头 §1a；exact=true 表示「真的指着一个标识符」
    // （有选区，或光标紧贴标识符字符）——双击触发表用它过滤误触。
    getContext: readContext,
    focus() {
      if (view) view.focus();
      else textarea?.focus();
    }
  };
}

// ---------------------------------------------------------------------------
// 2. RTL 结构树渲染
// ---------------------------------------------------------------------------
// jump：主入口（左键）。secondaryJump：次入口（右键 / Alt+左键）——
// #86 A2：实例行的主入口 = 跳到该模块的**源码定义**（仿 Verdi nTrace 点实例跳定义），
// 次入口 = 跳到**例化点行**（保留原有的“树 → 代码”能力）。
function makeJumpRow(doc, className, text, title, jump, secondaryJump) {
  const row = elFromDoc(doc, "button", "rtl-jump-btn" + (className ? " " + className : ""), text);
  row.type = "button";
  if (title) row.title = title;
  row.addEventListener("click", (event) => {
    event.preventDefault();   // 阻止 <summary> 默认折叠切换
    event.stopPropagation();
    const action = (event.altKey && typeof secondaryJump === "function") ? secondaryJump : jump;
    if (typeof action === "function") action();
  });
  if (typeof secondaryJump === "function") {
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      secondaryJump();
    });
  }
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
        `实例 ${mod.instanceCount || 0} · L${mod.moduleLine}`));
      modDetails.append(modSummary);

      if (mod.instances && mod.instances.length) {
        const rows = mod.instances.map((inst) => {
          const label = inst.instanceName
            ? `${inst.instanceName} : ${inst.moduleName}`
            : `${inst.moduleName}`;
          const payload = {
            fileIndex,
            line: inst.line,
            moduleName: inst.moduleName,
            instanceName: inst.instanceName,
            name: inst.instanceName || inst.moduleName
          };
          return makeJumpRow(doc, "rtl-inst", `${label}  L${inst.line}`,
            `${label}\n左键：跳到模块 ${inst.moduleName} 的源码定义\n右键 / Alt+左键：跳到例化点（${fileName}:${inst.line}）`,
            () => onJump && onJump({ ...payload, kind: "instance" }),
            () => onJump && onJump({ ...payload, kind: "instanceSite" }));
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
