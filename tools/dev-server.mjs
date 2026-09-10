// 简易开发用静态服务器：直接以源码目录起服务，便于浏览器调试（不走 exe 内嵌资源）。
// 用法：node tools/dev-server.mjs [端口，默认 8944]
//
// 除了静态文件，还实现了 exe 内置服务的 /api/sim 端点（真实 iverilog + vvp），
// 这样无需构建 exe 就能在浏览器里端到端调试仿真链路（尤其是「第二次仿真失败」
// 这类只在真实 DOM 环境复现的问题）。
import http from 'node:http';
import { promises as fs, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const port = Number(process.argv[2]) || 8944;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.json': 'application/json', '.vcd': 'text/plain; charset=utf-8', '.zip': 'application/zip'
};

// ---------------------------------------------------------------------------
// /api/sim：与 exe 内置服务同协议（成功返回 VCD 文本；失败返回 `XX-ERROR: 原因`）
// ---------------------------------------------------------------------------
let ivlRootCache = null;
function ivlRoot() {
  if (ivlRootCache) return ivlRootCache;
  const cache = path.join(os.tmpdir(), 'wavepaint-ivl-cache');
  const exe = path.join(cache, 'bin', 'iverilog.exe');
  if (!existsSync(exe)) {
    mkdirSync(cache, { recursive: true });
    execFileSync('powershell.exe', ['-NoProfile', '-Command',
      `Expand-Archive -Path '${path.join(root, 'ivl.zip')}' -DestinationPath '${cache}' -Force`],
      { stdio: ['ignore', 'ignore', 'pipe'] });
  }
  if (!existsSync(exe)) throw new Error('ivl.zip 解压失败，未找到 bin/iverilog.exe');
  ivlRootCache = cache;
  return cache;
}

function parseSimPayload(text) {
  const files = [];
  const lines = String(text || '').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const m = /^@@FILE:(.+)$/.exec(line);
    if (m) { current = { name: m[1].trim(), content: [] }; files.push(current); continue; }
    if (line === '@@END') { current = null; continue; }
    if (current) current.content.push(line);
  }
  return files.map((f) => ({ name: f.name, content: f.content.join('\n') }));
}

function runSim(text) {
  const files = parseSimPayload(text);
  if (!files.length) return 'SIM-ERROR: empty payload';
  const work = path.join(os.tmpdir(), 'ivl_work_' + Math.random().toString(16).slice(2));
  mkdirSync(work, { recursive: true });
  try {
    const names = files.map((f) => f.name.replace(/[\\/]/g, '_') || 'dut.sv');
    // 写文件（同步，避免并发竞态）
    for (let i = 0; i < files.length; i += 1) {
      writeFileSync(path.join(work, names[i]), files[i].content);
    }
    const compileArgs = ['-g2012', '-s', 'tb', '-o', 'sim.vvp', ...names];
    try {
      execFileSync(path.join(ivlRoot(), 'bin', 'iverilog.exe'), compileArgs,
        { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    } catch (e) {
      return 'IVERILOG-ERROR: ' + String((e && (e.stderr || e.stdout)) || e).slice(0, 4000);
    }
    try {
      execFileSync(path.join(ivlRoot(), 'bin', 'vvp.exe'), ['sim.vvp'],
        { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    } catch (e) {
      return 'VVP-ERROR: ' + String((e && (e.stderr || e.stdout)) || e).slice(0, 4000);
    }
    const vcd = path.join(work, 'wave_out.vcd');
    if (!existsSync(vcd)) return 'SIM-ERROR: wave_out.vcd not generated';
    return readFileSync(vcd, 'utf8');
  } catch (e) {
    return 'SIM-ERROR: ' + String(e && e.message || e).slice(0, 4000);
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (req.method === 'POST' && urlPath === '/api/sim') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString('utf8');
      let out;
      try { out = runSim(body); } catch (e) { out = 'SIM-ERROR: ' + String(e && e.message || e); }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(out);
      return;
    }
    if (urlPath === '/api/ping') { // 与 exe 内置服务同款心跳（js/core/heartbeat.js）
      // 2026-09-10：与 WavePaintLauncher.exe 的身份标识格式对齐（PING_TAG 首行 +
      // 端口 + 构建标识），供 js/core/service-guard.js 判活时区分「本应用」与
      // 「占用同端口的第三方服务」。仅回 "OK" 会让前端身份校验判为离线。
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('WAVEPAINT-SERVICE\n' + port + '\ndev-server\n');
      return;
    }
    if (urlPath === '/') urlPath = '/index.html';
    const file = path.join(root, urlPath);
    if (!file.startsWith(path.resolve(root))) { res.writeHead(403); res.end(); return; }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not Found');
  }
}).listen(port, '127.0.0.1', () => console.log(`dev server: http://127.0.0.1:${port}/index.html`));
