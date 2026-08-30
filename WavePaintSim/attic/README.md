# attic/ —— 已停用的代码（不再参与构建）

`build.ps1` 只内嵌 `index.html`、`css/*`、`js/*`、`img/*`、`lib/*` 与 `ivl.zip`，
**不会**打包 `attic/`，因此放在这里的文件不会进入 `WavePaint.exe`。

## 目录内容

| 文件 | 原位置 | 停用原因 |
| --- | --- | --- |
| `js/app.js` | `js/app.js` | 早期「第二套实现」的入口，从未被 `index.html` 引用 |
| `js/renderer.js` | `js/renderer.js` | 仅被 `app.js` 引用 |
| `css/styles.css` | `css/styles.css` | 早期样式表，运行时实际使用 `css/wavepaint.e7b903ef.css` |

> **注意**：`js/utils.js` 曾被误判为死代码移入此处，但它被 `js/model.js`
> `import { uid, deepClone } from "./utils.js"` 真实依赖，已移回 `js/`。
> 判断死代码前请先做 ES module 导入可达性检查，不要只看是否被 `index.html` 直接引用。

当前实际运行的架构是：`index.html` + 混淆核心 `js/wavepaint.63e6dade.js`
+ 若干 `js/feature-*.js` 功能模块 + 仿真链 `js/sim.js` / `js/model.js` / `js/sim-bridge.js`。

## 恢复方式

把文件移回原路径即可（例如 `mv attic/js/app.js js/app.js`），
随后重建 exe：`Get-Process WavePaint -ErrorAction SilentlyContinue | Stop-Process -Force; .\build.ps1`。

> 若确认长期不需要，可直接删除本目录。
