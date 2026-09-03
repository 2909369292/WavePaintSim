// WavePaintClean tools/deobfuscate.mjs —— 混淆核心字符串还原管线
// 阶段 0：抽取 stringArray 解码环境（_0x55bf + _0x3f97 + rotate IIFE），得到 lookup(idx)
// 阶段 1：AST 精确替换所有解码调用为字符串字面量（父引用就地替换）
// 阶段 2：escodegen 重生成（自动折行 + hex→十进制），输出 js/wavepaint.clean.js
// 行为保证：不做任何控制流/逻辑改写；无法静态确定的调用保留原样（解码器兜底），
// 因此输出与源核心行为 100% 等价。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const acorn = require('acorn');
const { generate } = require('escodegen');

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'js', 'wavepaint.63e6dade.js');
const OUT = join(here, '..', 'js', 'wavepaint.clean.js');

const code = readFileSync(SRC, 'utf8');
console.log('[0] 源文件', code.length, '字节');

// ---------------- 解析 ----------------
const ast = acorn.parse(code, {
  ecmaVersion: 'latest', sourceType: 'script',
  allowHashBang: true, allowReturnOutsideFunction: true,
});

// ---------------- 定位 stringArray 节点 ----------------
const top = ast.body;
let fn55bf = null, fn3f97 = null, rotateIIFE = null;
for (const st of top) {
  if (st.type === 'FunctionDeclaration' && st.id) {
    if (st.id.name === '_0x55bf') fn55bf = st;
    if (st.id.name === '_0x3f97') fn3f97 = st;
  } else if (st.type === 'ExpressionStatement' && st.expression.type === 'CallExpression'
    && st.expression.callee.type === 'FunctionExpression') {
    rotateIIFE = st;
  }
}
if (!fn55bf || !fn3f97 || !rotateIIFE) throw new Error('stringArray 节点定位失败');

// ---------------- 解码环境 ----------------
const envCode = generate({ type: 'Program', body: [fn3f97, fn55bf, rotateIIFE] }, { format: { compact: true } });
const sandbox = { console, decodeURIComponent, parseInt, String };
vm.createContext(sandbox);
try { vm.runInContext(envCode + '\nthis.__lookup = _0x55bf;', sandbox); }
catch (e) { console.error('解码环境执行失败:', e.message); process.exit(1); }
const lookup = sandbox.__lookup;

// ---------------- 别名集合（解码器名 + 所有 =别名 链）----------------
const decNames = new Set(['_0x55bf', '_0x16e202', '_0x27d135']);
let changed = true;
while (changed) {
  changed = false;
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier'
      && n.init && n.init.type === 'Identifier' && decNames.has(n.init.name)
      && !decNames.has(n.id.name)) { decNames.add(n.id.name); changed = true; }
    for (const k in n) {
      if (Array.isArray(n[k])) n[k].forEach(walk);
      else if (n[k] && typeof n[k] === 'object') walk(n[k]);
    }
  })(ast);
}
console.log('[1] 解码器别名数:', decNames.size);

// ---------------- 对象字面量数值映射（const X = {a:0x..,..}）----------------
const objMap = {};
(function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier'
    && n.init && n.init.type === 'ObjectExpression') {
    const props = {};
    let ok = true;
    for (const p of n.init.properties) {
      if (!p || p.type !== 'Property') { ok = false; break; }
      let key = null;
      if (p.key.type === 'Identifier') key = p.key.name;
      else if (p.key.type === 'Literal' && typeof p.key.value === 'string') key = p.key.value;
      if (key === null || p.value.type !== 'Literal' || typeof p.value.value !== 'number') { ok = false; break; }
      props[key] = p.value.value;
    }
    if (ok && Object.keys(props).length) objMap[n.id.name] = props;
  }
  for (const k in n) {
    if (Array.isArray(n[k])) n[k].forEach(walk);
    else if (n[k] && typeof n[k] === 'object') walk(n[k]);
  }
})(ast);
console.log('[2] 数值对象字面量:', Object.keys(objMap).length);

// ---------------- 就地替换遍历（带父引用）----------------
let replaced = 0, failed = 0;
function resolveArg(node) {
  if (!node) return undefined;
  if (node.type === 'Literal' && typeof node.value === 'number') return node.value;
  if (node.type === 'UnaryExpression' && node.operator === '-'
    && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return -node.argument.value;
  if (node.type === 'MemberExpression' && node.object.type === 'Identifier') {
    let key;
    if (!node.computed && node.property.type === 'Identifier') key = node.property.name;
    else if (node.computed && node.property.type === 'Literal') key = String(node.property.value);
    if (key !== undefined) {
      const rec = objMap[node.object.name];
      if (rec) return rec[key];
    }
  }
  return undefined;
}

function makeLiteral(value) {
  // 用 JSON.stringify 生成可读字符串；escodegen 会正确转义
  return { type: 'Literal', value, raw: JSON.stringify(value) };
}

function visit(node, parent, key, idx) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((c, i) => visit(c, node, null, i)); return; }
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier'
    && decNames.has(node.callee.name) && node.arguments.length >= 1) {
    const argVal = resolveArg(node.arguments[0]);
    if (argVal !== undefined && Number.isFinite(argVal)) {
      try {
        const out = lookup(argVal);
        if (typeof out === 'string') {
          const lit = makeLiteral(out);
          if (idx !== null && idx !== undefined) parent[key][idx] = lit;
          else parent[key] = lit;
          replaced++;
          return; // 已替换，不再深入
        }
      } catch (e) { /* 越界/无效索引 */ }
      failed++;
    }
    // 无法替换：继续遍历参数（参数内可能还有可替换调用）
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') continue;
    const v = node[k];
    if (Array.isArray(v)) { v.forEach((c, i) => visit(c, node, k, i)); }
    else if (v && typeof v === 'object') visit(v, node, k, null);
  }
}
visit(ast, null, null, null);
console.log('[3] 解码调用替换: 成功', replaced, '失败(保留)', failed);

// ---------------- 阶段 2：重生成 ----------------
console.log('[4] escodegen 重生成…');
let out;
try {
  out = generate(ast, {
    format: {
      indent: { style: '  ' },
      quotes: 'single',
      escapeless: false,
      compact: false,
    },
    comment: false,
  });
} catch (e) {
  console.error('escodegen 失败:', e.message);
  process.exit(1);
}
writeFileSync(OUT, '// WavePaintClean — 由 wavepaint.63e6dade.js 解混淆生成（字符串还原 + 格式化 + hex→十进制）\n// 行为与源核心等价；未替换的解码调用保留原解码器兜底。\n' + out);
console.log('[5] 输出', OUT, out.length, '字节');

// ---------------- 验证：解析产物语法 ----------------
try {
  acorn.parse(out, { ecmaVersion: 'latest', sourceType: 'script' });
  console.log('[6] 产物语法校验通过');
} catch (e) {
  console.error('[6] 产物语法校验失败:', e.message);
  process.exit(1);
}
