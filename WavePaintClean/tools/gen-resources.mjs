// WavePaintClean tools/gen-resources.mjs —— 生成 csc 内嵌资源清单 resources.txt
// 每行: <磁盘相对路径>,<逻辑资源名>
// 逻辑资源名 = 目录前缀(root_/css_/img_/lib_/js_) + 去掉首目录段的相对路径
//   e.g. js/core/__core.js -> js_core/__core.js   （保留子目录，launcher 还原到 js/core/）
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = [];

function walk(dir, prefix) {
  const full = join(root, dir);
  if (!existsSync(full)) return;
  for (const name of readdirSync(full)) {
    const p = join(full, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(join(dir, name), prefix); continue; }
    const rel = join(dir, name).replace(/\\/g, '\\');
    if (name === 'wavepaint.63e6dade.js') continue; // 源混淆核心不进 exe
    // 逻辑名：前缀 + 去掉首目录段后的路径（分隔符统一 /）
    const strip = rel.indexOf('\\') >= 0 ? rel.slice(rel.indexOf('\\') + 1).replace(/\\/g, '/') : rel;
    out.push(rel + ',' + prefix + strip);
  }
}

// 顶层单文件
for (const f of ['index.html']) {
  if (existsSync(join(root, f))) out.push(f + ',root_' + f);
}
walk('css', 'css_');
walk('js', 'js_');
walk('img', 'img_');
walk('lib', 'lib_');
if (existsSync(join(root, 'ivl.zip'))) out.push('ivl.zip,ivl.zip');

writeFileSync(join(root, 'resources.txt'), out.join('\n') + '\n', 'utf8');
console.log('资源清单: ' + out.length + ' 项 -> resources.txt');
