# attic/residue —— 根目录残留

从项目根目录清出来的两类东西，**都不参与构建**（`build.ps1` 只内嵌
`index.html` + `css/*` + `js/*` + `img/*` + `lib/*` + `ivl.zip`）。

## 1. 与子目录字节完全一致的重复副本

根目录曾同时放着一份 `img/*.svg`、`logo.webp`、`lib/wavedrom*.js`、
`js/step-commit-patch.js`、`js/zh-lang-patch.js`。
`index.html` 引用的是 `img/`、`lib/`、`js/` 下的那一份，根目录这些是纯冗余。
已逐一用 SHA-256 比对确认与子目录版本**完全相同**后才移走。

## 2. 与项目无关的零散文件

| 文件 | 说明 |
| --- | --- |
| `CHUAN_API_SETUP.md` | 早期接入外部 API 的说明，当前代码里没有任何引用 |
| `.env.example` | 同上，当前代码不读环境变量 |
| `closedloop_waveform.json` / `waveform.json` / `waveform.vcd` | 调试时留下的示例波形数据 |

> 若确认长期不需要，可直接删除本目录。
