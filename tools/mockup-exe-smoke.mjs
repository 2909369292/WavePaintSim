// ============================================================================
// WavePaintMockup.exe 冒烟（原型打包产物的「无浏览器」自检）
// ----------------------------------------------------------------------------
// 用法：node tools/mockup-exe-smoke.mjs [exe 路径] [端口]
//   默认 exe = <repo>/WavePaintMockup.exe，默认端口 = 17899
// 做的事：/nolaunch 起服务 → 断言 /api/ping 身份标识、首页 / 资源（长度与磁盘源码逐字节
//   一致）、404 分支、HEAD、以及原始 socket 的 `..` 目录穿越必须被拒 → 杀进程。
// 为什么不用浏览器：这条链路要能在 CI/无人值守下判定「exe 里嵌的确实是当前原型快照」；
//   渲染/交互另有 node tools/mock-probe.mjs（可用 MOCK_BASE 直接打 exe）。
// ============================================================================
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import net from 'node:net';

const root = 'D:/Files/Code/波形';
const exe = process.argv[2] || root + '/WavePaintMockup.exe';
const PORT = Number(process.argv[3]) || 17899;
const base = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (detail ? '  [' + detail + ']' : ''));
};
const read = (p) => readFileSync(root + '/' + p);

if (!existsSync(exe)) {
  console.log('FAIL exe 不存在: ' + exe + '（先跑 build-prototype.ps1）');
  process.exit(1);
}

const child = spawn(exe, ['/nolaunch', '/port=' + PORT], { stdio: 'ignore' });
let up = false;
for (let i = 0; i < 40; i += 1) {
  await sleep(400);
  try { const r = await fetch(base + '/api/ping'); if (r.ok) { up = true; break; } } catch (e) { /* retry */ }
}
if (!up) {
  console.log('FAIL 服务未在 16s 内起来（端口 ' + PORT + '）');
  try { child.kill(); } catch (e) { /* ignore */ }
  process.exit(1);
}
console.log('服务已起: ' + base);

// 1) /api/ping 身份标识（单实例发现依赖它，必须区别于真机 WAVEPAINT-SERVICE）
{
  const r = await fetch(base + '/api/ping');
  const t = await r.text();
  check('/api/ping 200', r.status === 200, String(r.status));
  check('/api/ping 含 WAVEPAINT-MOCKUP', t.indexOf('WAVEPAINT-MOCKUP') >= 0, t.slice(0, 60));
  check('/api/ping 不含真机标识 WAVEPAINT-SERVICE', t.indexOf('WAVEPAINT-SERVICE') < 0);
}

// 2) 首页与三类资源：状态码 + Content-Type + 与磁盘源码长度一致（= 内嵌的是当前快照）
const assets = [
  ['/', 'text/html', null],
  ['/prototype/ui-mockup.html', 'text/html', 'prototype/ui-mockup.html'],
  ['/prototype/ui-mockup.css', 'text/css', 'prototype/ui-mockup.css'],
  ['/prototype/ui-mockup.js', 'text/javascript', 'prototype/ui-mockup.js'],
  ['/ui-mockup.css', 'text/css', 'prototype/ui-mockup.css'],
  ['/img/logo.webp', 'image/webp', 'img/logo.webp'],
  ['/img/undo.svg', 'image/svg+xml', 'img/undo.svg'],
  ['/img/favicon.svg', 'image/svg+xml', 'img/favicon.svg']
];
for (const [url, type, disk] of assets) {
  const r = await fetch(base + url);
  const buf = Buffer.from(await r.arrayBuffer());
  check(url + ' 200', r.status === 200, String(r.status));
  check(url + ' Content-Type ' + type, (r.headers.get('content-type') || '').indexOf(type) >= 0,
    r.headers.get('content-type') || '');
  if (disk) {
    const src = read(disk);
    check(url + ' 字节数 == 磁盘源码 (' + src.length + ')', buf.length === src.length,
      'exe=' + buf.length);
  }
}
{
  const html = await (await fetch(base + '/')).text();
  check('首页含原型脚本引用', html.indexOf('ui-mockup.js') >= 0);
  check('首页含 mock 横条', html.indexOf('mock-banner') >= 0);
}

// 3) 构建戳：exe 顶部横条显示的版本号（用户自查「是不是最新构建」）
{
  const r = await fetch(base + '/mockup-version.txt');
  const t = (await r.text()).trim();
  check('/mockup-version.txt 200', r.status === 200, String(r.status));
  check('构建戳形如 v0.4.0-mock build …', /^v0\.4\.0-mock build \d{4}-\d{2}-\d{2} /.test(t), t);
}

// 4) 404 分支（原型 exe 只内嵌 prototype/ + img/，不该泄漏仓库其它文件）
for (const url of ['/nope.txt', '/index.html.bak', '/js/core/__core.js', '/resources.txt']) {
  const r = await fetch(base + url);
  check(url + ' 404', r.status === 404, String(r.status));
}

// 5) HEAD：有 Content-Length、无 body
{
  const r = await fetch(base + '/prototype/ui-mockup.html', { method: 'HEAD' });
  const len = r.headers.get('content-length');
  const body = await r.text();
  check('HEAD 200 + Content-Length', r.status === 200 && Number(len) > 1000, 'len=' + len);
  check('HEAD 无 body', body.length === 0, 'body=' + body.length);
}

// 6) 原始 socket 的目录穿越（fetch 会在客户端归一化路径，测不到服务端）。
//    实测口径（HttpListener 自己会拒 `..`；即便被归一化，服务端也只认内嵌资源表，
//    磁盘上任何仓库文件都读不到）：越界路径一律不能是 200。
const rawGet = (path) => new Promise((resolve) => {
  const sock = net.connect(PORT, '127.0.0.1', () => {
    sock.write('GET ' + path + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
  });
  let buf = '';
  sock.on('data', (d) => { buf += d.toString('latin1'); });
  sock.on('close', () => resolve(buf));
  sock.on('error', () => resolve('ERROR'));
  setTimeout(() => { try { sock.destroy(); } catch (e) { /* ignore */ } resolve(buf || 'TIMEOUT'); }, 3000);
});
{
  const cases = [
    ['/../resources.txt', '仓库文件不可读'],
    ['/../../Windows/win.ini', '盘上系统文件不可读'],
    ['/prototype/..%2f..%2findex.html', '编码穿越不可读'],
    ['/prototype/../resources.txt', '归一化后仍不可读']
  ];
  for (const c of cases) {
    const resp = await rawGet(c[0]);
    const line = resp.split('\r\n')[0] || 'TIMEOUT';
    check('穿越 ' + c[0] + ' 非 200（' + c[1] + '）', !/ 200 /.test(line), line.slice(0, 30));
  }
  const ok = await rawGet('/prototype/ui-mockup.css');
  check('原始 socket 正常路径 200', / 200 /.test(ok.split('\r\n')[0] || ''), ok.split('\r\n')[0]);
}

try { child.kill(); } catch (e) { /* ignore */ }
await sleep(500);
try { child.kill(); } catch (e) { /* ignore */ }

const failed = results.filter((r) => !r.ok);
console.log('mockup-exe-smoke: ' + (results.length - failed.length) + '/' + results.length + ' 通过');
process.exit(failed.length ? 1 : 0);
