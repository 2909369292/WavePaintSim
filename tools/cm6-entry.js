// tools/cm6-entry.js —— CodeMirror 6 离线打包入口（仅构建期使用，不进入 exe）。
// 用法：npx esbuild tools/cm6-entry.js --bundle --minify --format=iife --outfile=lib/codemirror.bundle.js
// 产物 lib/codemirror.bundle.js 会被 gen-resources.mjs 扫描进 exe（lib/ 前缀），
// 使应用完全离线也能获得 Verilog 语法高亮的代码视图。
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle, StreamLanguage } from "@codemirror/language";
import { tags as hltags } from "@lezer/highlight";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";

// Verilog / SystemVerilog 词法（CM6 的 legacy StreamLanguage 端口）
function verilogLang() {
  return StreamLanguage.define(verilog);
}

// ── 语法高亮配色（第 46 轮）──────────────────────────────────────────────
// 用户反馈：CM6 默认配色（紫关键字 / 淡蓝变量 / 浅灰注释）在低对比度屏上
// 「看不出差别」。这里换成一组**高对比度**配色，规则：
//   1. 全部取"深色 + 高饱和"，专为浅色底（--input-bg 默认 #fff）设计；
//   2. 关键字 / 运算符加粗，与普通标识符再拉开一档；
//   3. 关键字 = 蓝、变量 = 墨绿、类型/实例 = 深青、数字 = 砖红、字符串 = 深橙、
//      注释 = 暗绿斜体、运算符 = 深洋红 —— 任意两类的明度差都够大，
//      即使在低对比度屏上也能靠"色相 + 粗细"两个维度区分。
// ⚠ Verilog legacy 词法只吐 bracket/def/meta/comment/number/keyword/variable/string，
//    经 language 包的 legacyTokenTable 映射后命中下面这些 tag（def → definition(variableName)）。
// ⚠ 只在这里加 tag，**不要**去改 lib/ 以外的东西；改完必须重建 bundle（见文件头）。
const verilogHighlight = HighlightStyle.define([
  { tag: hltags.keyword, color: "#0b39cc", fontWeight: "700" },
  { tag: [hltags.controlKeyword, hltags.moduleKeyword, hltags.definitionKeyword, hltags.operatorKeyword],
    color: "#0b39cc", fontWeight: "700" },
  { tag: [hltags.definition(hltags.variableName), hltags.definition(hltags.name)],
    color: "#0b5d1e", fontWeight: "700" },
  { tag: [hltags.variableName, hltags.name], color: "#0b5d1e" },
  { tag: [hltags.special(hltags.variableName), hltags.standard(hltags.variableName),
          hltags.constant(hltags.variableName)], color: "#7a1fa2" },
  { tag: [hltags.typeName, hltags.className, hltags.propertyName, hltags.labelName, hltags.namespace],
    color: "#0b6ea8", fontWeight: "600" },
  { tag: [hltags.number, hltags.integer, hltags.float, hltags.bool, hltags.null, hltags.atom],
    color: "#b3001b" },
  { tag: [hltags.string, hltags.character, hltags.special(hltags.string)], color: "#95500a" },
  { tag: [hltags.comment, hltags.lineComment, hltags.blockComment],
    color: "#2f6b3f", fontStyle: "italic" },
  { tag: [hltags.operator, hltags.arithmeticOperator, hltags.logicOperator, hltags.bitwiseOperator,
          hltags.compareOperator, hltags.updateOperator, hltags.definitionOperator, hltags.derefOperator],
    color: "#9c0f8f", fontWeight: "600" },
  { tag: [hltags.meta, hltags.annotation, hltags.modifier], color: "#7a1fa2" },
  { tag: [hltags.punctuation, hltags.separator], color: "#333a33" },
  { tag: [hltags.bracket, hltags.squareBracket, hltags.paren, hltags.brace,
          hltags.angleBracket], color: "#5a3a00" },
  { tag: hltags.invalid, color: "#c62828", textDecoration: "underline" }
]);

function makeExtensions() {
  return [
    lineNumbers(),
    history(),
    drawSelection(),
    dropCursor(),
    // ⚠ 第 46 轮：**去掉 highlightActiveLine**（整行高亮条）——
    //    它横跨整行（实测 403px），被用户读成"双击某个信号却框选了一整行"。
    //    当前行的位置提示只留行号栏（.cm-activeLineGutter）这一处，不会再伪装成选区。
    highlightActiveLineGutter(),
    syntaxHighlighting(verilogHighlight),
    // 兜底：上面没配到的 tag 仍用 CM6 默认色（fallback 优先级低于自定义样式），
    // 避免"没配到的语法变成一片纯黑"。
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
      // 当前行：只染行号栏，不染整行（见上方 highlightActiveLine 的注释）
      ".cm-activeLineGutter": { backgroundColor: "var(--hover-bg, rgba(76,175,80,0.16))", color: "var(--text-color, #1a1f1a)" },
      // 选区：默认那层极淡的灰蓝在低对比度屏上几乎看不见，且容易被误读成
      // "整行高亮"。这里换成高饱和蓝（选中几个字符就只框几个字符）。
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { backgroundColor: "rgba(30,105,220,0.34)" },
      ".cm-scroller > .cm-selectionLayer .cm-selectionBackground": { backgroundColor: "rgba(30,105,220,0.20)" },
      ".cm-content ::selection": { backgroundColor: "rgba(30,105,220,0.34)" }
    }),
    EditorView.contentAttributes.of({ spellcheck: "false", autocapitalize: "off", autocorrect: "off" })
  ];
}

// 在 parent 容器内创建可编辑的 Verilog 代码视图。opts.onChange(docText) 仅在
// 用户编辑触发；程序性 setSourceValue 会由调用方抑制，避免「切文件→误回写旧内容」。
export function createVerilogEditor(parent, opts = {}) {
  const onChange = typeof opts.onChange === "function" ? opts.onChange : null;
  const extensions = makeExtensions();
  // 只读视图（TB 面板）：仍然可以聚焦 / 选中 / 复制，只是不接受键入。
  // ⚠ 两侧都要给：EditorState.readOnly 只挡命令与输入事务，EditorView.editable
  //    才把 contenteditable 关掉（配合 :read-only 的浏览器原生行为）。
  if (opts.readonly) {
    extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  }
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
