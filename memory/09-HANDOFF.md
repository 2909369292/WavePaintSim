# 09 · 交接说明（下一任 AI 从这里开始）

> 本文件是“当前会话 → 下一任 AI”的交接页。
> 若你刚接手，请按顺序读：`01-PROJECT.md` → `02-WORKFLOW.md` → `04-PROGRESS.md` → 本文件。

---

## 1. 你现在接手的项目状态

| 项 | 状态 |
|---|---|
| 主线 | `main` |
| 当前版本 | `v0.4.0 build <自动时间> <git短哈希>` |
| 最近完成 | #73 参数化位宽完整支持；#80 记忆体系重构 |
| 测试基线 | regression 49/49；e2e-sim 0 失败；probe-param 全过 |
| 当前阻塞 | 无 |
| 下一步 | #75 Verdi 借鉴 P0 |

---

## 2. 你必须先做的三件事

1. **读 `01-PROJECT.md`**
   - 理解架构、数据流、模块职责、唯一入口。
2. **读 `02-WORKFLOW.md`**
   - 理解 C1~C18 铁律，尤其是改代码后必须重建 exe、更新记忆、commit/push。
3. **读 `04-PROGRESS.md`**
   - 确认当前进度，不要重做已完成工作。

---

## 3. 下一步任务：#75 Verdi 借鉴 P0

### 3.1 目标

1. 内嵌 CodeMirror 6 代码视图
2. 建 RTL Tree 面板
3. 建 VCD 全路径索引

### 3.2 建议顺序

1. **代码视图**
   - 引入 CodeMirror 6，先支持 Verilog 语法高亮。
   - 不急着做编辑，先做“可读 + 可跳转”。
2. **RTL Tree**
   - 复用 `parseVerilogDesign()` 的 module / ports / instances / params。
   - 树节点点击后跳转对应代码行。
3. **VCD 全路径索引**
   - 复用 `parseVcd()` 的层次路径。
   - 为 P1 的“点变量 → 加波形”打地基。

### 3.3 不要做

- 不要一次性做 P1/P2/P3。
- 不要换主仿真器。
- 不要重写核心引擎。
- 不要绕过 `__core` / `wpf` 直接抓内部标识符。

---

## 4. 立即可用的命令

```powershell
node --check js/sim/engine.js
node tools/regression.mjs
node tools/e2e-sim.mjs
node tools/probe-param.mjs
node tools/e2e-ui.mjs
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

---

## 8. 如果你不确定

1. 先查 `06-PITFALLS.md`。
2. 再查 `07-DECISIONS.md`。
3. 最后查 `memory/logs/`。
4. 仍不确定时，优先保守：**不改动 `sim/engine.js` 的 stride / 端口匹配 / VCD 回填**。

---

## 9. 本轮遗留

- 无。`memory/` 已成为唯一记忆入口，`.workbuddy/` 与 `docs/` 已删除。
