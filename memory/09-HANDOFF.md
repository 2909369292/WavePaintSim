# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | #75 Verdi 借鉴 P0（CM6 代码视图 + RTL Tree + VCD 全路径索引）；#73 参数化位宽；#80 记忆体系重构 |
| 测试基线 | regression 58/58；e2e-sim 0 失败；probe-param 全过；e2e-rtl 9/9 |
| 当前阻塞 | 无 |
| 下一步 | #75 Verdi 借鉴 P1 |

---

## 2. 你必须先做的三件事

1. **读 `01-PROJECT.md`**
   - 理解架构、数据流、模块职责、唯一入口。
2. **读 `02-WORKFLOW.md`**
   - 理解 C1~C18 铁律，尤其是改代码后必须重建 exe、更新记忆、commit/push。
3. **读 `04-PROGRESS.md`**
   - 确认当前进度，不要重做已完成工作。

---

## 3. 下一步任务：#75 Verdi 借鉴 P1

### 3.1 目标

1. **点变量 → 加波形**（复用 P0 的 VCD/结构树完整路径 + `toNativeSignal` 注入链路）。
2. **树 ↔ 代码双向跳转**（P0 已有「代码侧跳转」，补「代码行 → 反向高亮树节点」）。
3. **信号组入 `.wp` 工程**（存档后重开可恢复）。

### 3.2 建议顺序

1. **信号选择 → 加波形**
   - 先确认 P0 数据源输出：`buildVcdHierarchy` 的节点含 `path`（点分作用域）、信号含完整路径 title；`buildRtlNav` 的节点含文件/行号。
   - 处理多实例歧义：同名模块多次例化时需让用户选实例作用域。
   - 未 dump 信号（仿真没跑到 / 被优化掉）给中文提示，不要静默失败。
2. **双向跳转**
   - 点代码里的信号名 → 高亮对应结构树/VCD 树节点。
3. **信号组入 `.wp`**
   - 复用 `editor/file-menu.js` 的 `.wp` 存取链路，P0/P1 新增的面板状态随工程存档/恢复。

### 3.3 不要做

- 不要一次性做 P2/P3。
- 不要换主仿真器。
- 不要重写核心引擎。
- 不要绕过 `__core` / `wpf` 直接抓内部标识符。
- 不要改 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填（最易碎区）。

---

## 4. 立即可用的命令

```powershell
node --check js/sim/engine.js
node tools/regression.mjs
node tools/e2e-sim.mjs
node tools/probe-param.mjs
node tools/e2e-ui.mjs
node tools/e2e-rtl.mjs   # #75 P0 浏览器冒烟 9 项（需真实 Edge，非沙箱执行）
.\build.ps1
```

---

## 5. 当前已知环境注意点

- `build.ps1` 必须保持 UTF-8 BOM。
- Git Bash 下 `taskkill` 参数用单斜杠：`/F /IM`。
- 中文路径 git 操作建议加 `git -c core.quotepath=false`。
- `e2e-ui` 依赖本机 Edge，C 盘满会卡死组件更新。
- `package.json` 无 `"type": "module"`，Node 会以 ESM 探测加载，出现无害警告。
- `WavePaintClean.exe` 为构建产物，不提交。
- 改 `lib/codemirror.bundle.js` 依赖重跑 `npx esbuild tools/cm6-entry.js`（见该文件头注释），再重建 exe。
- `memory/logs/2026-09-09.md` 记录了 #75 P0 的实现细节与设计决策，P1 开工前建议先读。

---

## 6. 交付时必须提醒用户

1. 重启应用。
2. 从唯一路径启动：
   `D:\Files\Code\波形\WavePaintClean.exe`
3. 在面板查看版本号，确认不是旧副本。

---

## 7. 你接手后不要重做的事

- 解混淆核心
- Phase 重构
- 批次1~10
- 参数化位宽修复
- 记忆体系重构
- #75 Verdi 借鉴 P0（CM6 代码视图 / RTL Tree / VCD 全路径索引）

---

## 8. 如果你不确定

1. 先查 `06-PITFALLS.md`。
2. 再查 `07-DECISIONS.md`。
3. 最后查 `memory/logs/`。
4. 仍不确定时，优先保守：**不改动 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填**。

---

## 9. 本轮遗留

- 无功能阻塞。#75 P1（点变量加波形 / 双向跳转 / 信号组入 `.wp`）为下一主线。
- P0 已验证：regression 58/58、e2e-rtl 9/9、exe 已按 C1 重建并核验特征串。
