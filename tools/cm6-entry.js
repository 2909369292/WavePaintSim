// tools/cm6-entry.js —— CodeMirror 6 离线打包入口（仅构建期使用，不进入 exe）。
// 用法：npx esbuild tools/cm6-entry.js --bundle --minify --format=iife --outfile=lib/codemirror.bundle.js
// 产物 lib/codemirror.bundle.js 会被 gen-resources.mjs 扫描进 exe（lib/ 前缀），
// 使应用完全离线也能获得 Verilog 语法高亮的代码视图。
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { defaultHighlightStyle, syntaxHighlighting, StreamLanguage } from "@codemirror/language";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";

// Verilog / SystemVerilog 词法（CM6 的 legacy StreamLanguage 端口）
function verilogLang() {
  return StreamLanguage.define(verilog);
}

function makeExtensions() {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    dropCursor(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    verilogLang(),
    EditorView.theme({
      "&": {
        height: "100%",
        fontSize: "12px",
        backgroundColor: "var(--input-bg, #fff)",
        color: "var(--text-color, #1a1f1a)"
      },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": {
        fontFamily: "Consolas, 'Courier New', monospace",
        lineHeight: "1.5",
        overflow: "auto"
      },
      ".cm-content": { caretColor: "var(--signal-color, #2e7d32)", padding: "4px 0" },
      ".cm-gutters": {
        backgroundColor: "var(--section-bg, #f8faf8)",
        color: "var(--text-muted, #8a9a8a)",
        borderRight: "1px solid var(--section-border, #e0e8e0)"
      },
      ".cm-activeLine": { backgroundColor: "var(--hover-bg, rgba(76,175,80,0.08))" },
      ".cm-activeLineGutter": { backgroundColor: "var(--hover-bg, rgba(76,175,80,0.12))" }
    }),
    EditorView.contentAttributes.of({ spellcheck: "false", autocapitalize: "off", autocorrect: "off" })
  ];
}

// 在 parent 容器内创建可编辑的 Verilog 代码视图。opts.onChange(docText) 仅在
// 用户编辑触发；程序性 setSourceValue 会由调用方抑制，避免「切文件→误回写旧内容」。
export function createVerilogEditor(parent, opts = {}) {
  const onChange = typeof opts.onChange === "function" ? opts.onChange : null;
  const extensions = makeExtensions();
  if (onChange) {
    extensions.push(EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
    }));
  }
  return new EditorView({
    parent,
    state: EditorState.create({ doc: String(opts.doc || ""), extensions })
  });
}

// 跳转：选中第 lineNumber 行并滚动到视口中央（RTL 树 / VCD 双击跳转复用）。
export function jumpToLine(view, lineNumber) {
  if (!view) return false;
  const doc = view.state.doc;
  const target = Math.min(Math.max(1, Number(lineNumber) || 1), doc.lines);
  const pos = doc.line(target).from;
  view.dispatch({
    selection: { anchor: pos },
    effects: EditorView.scrollIntoView(pos, { y: "center" })
  });
  view.focus();
  return true;
}

globalThis.WPCm = { createVerilogEditor, jumpToLine, EditorView };
