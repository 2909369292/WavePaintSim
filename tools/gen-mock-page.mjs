// WavePaint 原型页生成器：把真机 index.html 逐字复制成 prototype/ui-mockup.html
// ---------------------------------------------------------------------------
// 目的（用户裁决 · 第二十七轮）：原型里的**菜单栏 / 工具带 / 代码区 / 波形区**必须与
// 真机 1:1 完全一致（原来是「按预测的显示效果复刻」，用户明确否决）。
// 做法：不手写骨架，直接从真机 index.html 读全文，只做「机械替换 + 追加外壳」：
//   1) 资源路径：css/ js/ lib/ img/  → ../css/ ../js/ ../lib/ ../img/
//      （原型页在 prototype/ 子目录下，URL 层级必须与真机一致，否则 js/sim 的
//        ESM 相对 import 会 404）；
//   2) 内联 module 的 './js/sim/project-model.js' → '../js/sim/project-model.js'
//      （module 的 import 说明符按**文档 URL**解析，同样受子目录影响）；
//   3) 在真机 head 内联 <style> 之后插一行 ui-mockup.css（保证原型外壳样式
//      在层叠上压过真机样式，只在最后覆盖，不改真机任何元素的原生规则）；
//   4) 在 </body> 前追加 prototype/mock-tail.html（工作区宿主 / 状态栏 / 帮助浮层 /
//      ui-mockup.js）。
// 真机 index.html / js/ / css/ / img/ / lib/ **一律只读**，本脚本不写它们。
// 用法：node tools/gen-mock-page.mjs   （改完真机骨架后必须重跑，再跑 build-prototype.ps1）
//
// ⚠ 已弃用（第三十五轮起）：wavepaint mockup 是「真机停靠 UI 落地之前」的纯前端
//   预览页。现在真机 index.html 自带 #workbench/#wp-status-bar + js/sim/dock/workspace.js，
//   而 prototype/mock-tail.html 里也有一份同名元素（#workbench/#mk-*/#status-bar）——
//   继续「照搬真机 + 追加 tail」会生成**重复 id** 的坏页（两份停靠引擎抢同一批节点）。
//   所以默认只打印弃用提示并退出（0），不产生产物；确需复现历史 mockup 时用 --force。
//   淘汰 prototype/ + build-prototype.ps1 + WavePaintMockup.exe 需用户确认，见 memory。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORCE = process.argv.includes('--force');
if (!FORCE) {
  console.log('⚠ prototype/ mockup 已弃用：真机 index.html 现自带停靠外壳（#workbench /');
  console.log('  js/sim/dock/workspace.js），再追加 prototype/mock-tail.html 会产生重复 id。');
  console.log('  真机 UI 请直接 node build.ps1 → WavePaintClean.exe；');
  console.log('  确需复现历史 mockup：node tools/gen-mock-page.mjs --force（产物仅供考古）。');
  process.exit(0);
}
const srcPath = path.join(root, 'index.html');
const tailPath = path.join(root, 'prototype', 'mock-tail.html');
const outPath = path.join(root, 'prototype', 'ui-mockup.html');

const BANNER =
  '<!-- ⚠ 本文件由 tools/gen-mock-page.mjs 从真机 index.html 自动生成（1:1 逐字照搬）。\n' +
  '     请勿手改：改真机请改 index.html 后重跑 node tools/gen-mock-page.mjs；\n' +
  '     改原型外壳（工作区/状态栏/帮助浮层/拖拽引擎）请改 prototype/mock-tail.html、\n' +
  '     prototype/ui-mockup.css、prototype/ui-mockup.js。\n' +
  '     生成后需重跑 .\\build-prototype.ps1 才会进 WavePaintMockup.exe 的内嵌快照。 -->';

// 资源路径重写：顺序重要（先把 src="js/ 改掉，后续规则不会误伤已改成的 ../js/）
const REWRITES = [
  [/href="css\//g, 'href="../css/'],
  [/src="js\//g, 'src="../js/'],
  [/src="lib\//g, 'src="../lib/'],
  [/href="img\//g, 'href="../img/'],
  [/src="img\//g, 'src="../img/'],
  [/from '\.\/js\/sim\/project-model\.js'/g, "from '../js/sim/project-model.js'"],
];

// 真机 head 内联样式块之后（即 removeLoader 脚本之前）插入原型样式表；
// 用「removeLoader 的 IIFE 头」当锚点，避免误命中别处的 </style>。
const STYLE_ANCHOR = '    <script>\n        (function () {\n            function removeLoader() {';
const STYLE_INSERT = '    <link rel="stylesheet" href="ui-mockup.css">\n';

function fail(msg) {
  console.error('✖ ' + msg);
  process.exit(1);
}

let out = readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');
const tail = readFileSync(tailPath, 'utf8').replace(/\r\n/g, '\n').replace(/\s*$/, '\n');

for (const [re, to] of REWRITES) out = out.replace(re, to);

// 自检：真机骨架里不该再残留任何「相对真机根」的资源引用
const leftovers = ['href="css/', 'src="js/', 'src="lib/', 'href="img/', 'src="img/', "from './js/"]
  .filter((s) => out.includes(s));
if (leftovers.length) fail('路径重写不完整，仍残留：' + leftovers.join(' '));
if ((out.match(/href="\.\.\/css\//g) || []).length !== 1) fail('css 链接数量异常（期望 1）');
if (!out.includes('href="../css/wavepaint.e7b903ef.css"')) fail('真机主样式表链接缺失');

if (!out.includes(STYLE_ANCHOR)) fail('未找到 head 内联样式块锚点（真机 index.html 结构变了？）');
if (out.includes('"ui-mockup.css"')) fail('原型样式表已被插入过（index.html 里不应出现 ui-mockup.css）');
out = out.replace(STYLE_ANCHOR, STYLE_INSERT + STYLE_ANCHOR);

const bodyClose = out.lastIndexOf('\n</body>');
if (bodyClose < 0) fail('未找到 </body>');
out = out.slice(0, bodyClose + 1) + tail + out.slice(bodyClose + 1);

if (!out.startsWith('<!DOCTYPE html>')) fail('产物开头不是 <!DOCTYPE html>');
out = out.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + BANNER);

writeFileSync(outPath, out, 'utf8');
const lines = out.split('\n').length;
console.log('✔ 已生成 prototype/ui-mockup.html（' + Buffer.byteLength(out, 'utf8') + ' B / ' + lines + ' 行，LF）');
