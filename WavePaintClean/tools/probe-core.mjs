// 核心探查 v2：纯 ASCII 输出；--dump <start> <count> 输出连续语句段
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const core = readFileSync(join(here, '..', 'js', 'wavepaint.63e6dade.js'), 'utf8');
const stmts = core.split(';').map((s) => s.trim()).filter((s) => s.length > 0);

const args = process.argv.slice(2);
if (args[0] === '--dump') {
  const start = Number(args[1] || 0);
  const count = Number(args[2] || 10);
  for (let i = start; i < Math.min(start + count, stmts.length); i++) {
    console.log(`\n===== #${i} =====`);
    console.log(stmts[i].slice(0, 900));
  }
  process.exit(0);
}

const keywords = args;
const hits = [];
stmts.forEach((st, i) => {
  for (const kw of keywords) {
    if (st.includes(kw)) { hits.push({ i, kw }); break; }
  }
});
console.log(`total_stmts: ${stmts.length}`);
console.log(`hits: ${hits.length}`);
hits.forEach((h) => console.log(`#${h.i}\t${h.kw}\t${stmts[h.i].slice(0, 120)}`));
