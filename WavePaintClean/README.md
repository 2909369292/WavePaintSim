# WavePaintClean — 混淆核心解混淆 + 重构

将 WavePaintSim 的混淆核心（`wavepaint.63e6dade.js`，1.4MB 单行 obfuscator.io）
解混淆为可读可改的 `js/wavepaint.clean.js`（33K 行），并以此为主项目整合全部功能，
UI/功能与原版完全一致（原样引用，非复刻），持续进行“去历史 hack”重构。
原混淆项目归档在 `../WavePaintSim/`（含原混淆核心，可对照）。

## 解混淆

`tools/deobfuscate.mjs` 三阶段（可重跑）：
1. **字符串还原**：定位 stringArray 解码器 `_0x55bf` + 工厂 `_0x3f97` + rotate IIFE，
   在 node:vm 建解码环境；AST 遍历把 **19,090 处解码调用全部还原为字符串字面量**（失败 0）
2. **hex → 十进制**（escodegen 重生成自动处理）
3. **格式化**：单行 → 33K 行缩进（函数/类名保留）

**关键事实**：clean.js 无外层 IIFE，323 个顶层函数 + 核心状态
（`currentTool / isMouseDown / rangeSel* / vectorSelecting …`）全在浏览器全局作用域
可直接读写（曾因混淆不可见）——这是重构“去 hack”的可行性基础。

## 行为一致性（clean vs 原混淆，Edge headless + CDP）

- 全局 API、添加信号渲染一致；**画布 `toDataURL()` hash 完全相同（像素级）**
- 控制台异常 0；交互（框选/翻转/值输入/两次仿真）一致

## 功能总览 / 补丁清单 / 重构方案（重要）

| 文档 | 内容 |
|------|------|
| `docs/00_功能总览.md` | 全功能基线：数据模型 / 画布 / 扩展编辑 / 仿真后端 / 打包形态 |
| `docs/01_补丁与妥协清单.md` | 历史 hack 清单：A 类核心能力外泄型（合成事件框选 / MutationObserver 抑制弹窗 / valueToLabel 原型补丁 / DOM 汉化…）→ 去 hack 方案 |
| `docs/02_重构方案.md` | 目标分层（core/editor/sim/util）+ 分阶段路线 + 回归门槛 |

## 当前代码分层

```
js/
  wavepaint.clean.js       解混淆核心（行为 = 原混淆，黑盒底线，可重跑生成）
  core/__core.js           官方核心桥接 window.__core（state/selection/redraw/…）
  core/wpf.js              历史共享层（迁移中）
  editor/                  画布编辑域（draw / selection / value-input / shortcuts /
                           measure / resize / generator / templates）
  sim/                     仿真（engine 纯逻辑 / project-model 数据模型 / ui-bridge 面板）
  util/id.js               工具（uid / deepClone / clamp）
```

`index.html` 加载顺序：核心 → `js/core/__core.js` → wpf → editor/* → sim/*。
目录/命名规范见 `docs/03_代码与目录规范.md`。

## 打包为独立 exe（装有 Edge 的任意 Windows 电脑）

```powershell
node tools\gen-resources.mjs   # Node 生成资源清单 resources.txt（支持 js/ 子目录递归）
.\build.ps1                    # → WavePaintClean.exe（22.4MB，自包含 iverilog）
```

exe 运行时：资源解压到 `%TEMP%\WavePaintClean_<用户>\` → 随机端口 HttpListener
（`/api/sim` iverilog+vvp、`/api/snapshot`、`/api/ping`）→ 自动开本机 Edge
`--app=` 窗口；单实例。构建注意：build.ps1 需 UTF-8 BOM；csc 失败仍可能 exit 0，
以 exe 体积/时间戳为准。

## 目录

```
css/  img/  lib/         UI 资产（原样）
index.html               入口（引 clean 核心 + core/editor/sim 分层脚本）
index.obf.html           引原混淆核心的对照页
js/                      分层结构（见上；docs/03 有规范与迁移对照表）
docs/                    功能总览 / 补丁清单 / 重构方案 / 代码规范
tools/deobfuscate.mjs    解混淆管线
tools/gen-resources.mjs  内嵌资源清单生成（递归 js/ 子目录）
tools/dev-server.mjs     开发服务器（含 /api/sim）
tools/regression.mjs     34 项逻辑回归
tools/e2e-sim.mjs        仿真链路端到端
tools/probe-core.mjs     混淆核心语句探查
WavePaintLauncher.cs     启动器（资源解压 + HTTP + sim + Edge）
build.ps1                构建 exe
ivl.zip                  iverilog 便携包
```

## 怎么用

```bash
npm install                # acorn/escodegen（重跑 deobfuscate 需要）
node tools/dev-server.mjs 8947     # 开发服务器
# 浏览器打开 http://127.0.0.1:8947/index.html
node tools/regression.mjs          # 34 项回归
node tools/e2e-sim.mjs             # 仿真 e2e
```

## 后续可做

- 按 docs/02 阶段推进：editor/sim 重组、删除全部 hack（合成事件层、MutationObserver、
  原型补丁、DOM 汉化）、sim 后端分层整理（C1 数据模型 API 统一读写口径）
- 核心内文案/行为修正走“补丁段”，保持 deobfuscate 可重跑不丢
- 每步改动用回归 + 浏览器像素/交互 e2e 守门
