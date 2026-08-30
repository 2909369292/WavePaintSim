# attic/core-original —— 混淆核心的「打补丁前」原始副本

| 文件 | 对应的在用文件 | 说明 |
| --- | --- | --- |
| `wavepaint.63e6dade.js` | `js/wavepaint.63e6dade.js` | 混淆核心 JS（未修改版） |
| `wavepaint.e7b903ef.css` | `css/wavepaint.e7b903ef.css` | 核心样式表（未修改版） |

## ⚠️ 这两个文件不是垃圾，不要删除

它们与在用版本的差异只有一处，但这一处是**当前所有 feature 模块能工作的前提**：

```diff
- document_wave = new WaveDocument();
+ document_wave = window.document_wave = new WaveDocument();
```

在用版本（`js/` 下）把 `document_wave` 挂到了 `window` 上，
`js/feature-*.js` 与 `js/sim-bridge.js` 全靠 `window.document_wave` 读写数据。

**如果把本目录的文件覆盖回 `js/`，所有新增功能会立刻失效**（并且不会报错，
只是画布没反应 —— 这是本项目最难排查的一类故障）。

保留原始副本的用途：

1. 对比确认「核心到底被改了什么」（目前只有上面那一处）；
2. 万一在用的核心被误改，可以从这里还原后重新打那一个补丁。

## 还原方式

```powershell
Copy-Item attic\core-original\wavepaint.63e6dade.js js\wavepaint.63e6dade.js -Force
Copy-Item attic\core-original\wavepaint.e7b903ef.css css\wavepaint.e7b903ef.css -Force
# 然后重新打 window. 补丁（把 document_wave=new WaveDocument()
#   改成 document_wave=window.document_wave=new WaveDocument()），再重建 exe
```
