# Chuan API / New API 接入

## 已确认的接口

`https://chuan.sylu.cc` 是 New API 网关，兼容 OpenAI Chat Completions：

- API Base URL：`https://chuan.sylu.cc/v1`
- 模型列表：`GET /v1/models`
- 对话接口：`POST /v1/chat/completions`
- 请求头：`Authorization: Bearer <API Key>`
- 请求体至少包含 `model` 和 `messages`

这里测试的是 Chuan/New API 的 OpenAI 兼容 Chat Completions，不是 OpenAI 官方 Codex API。若返回 `401 Unauthorized`，说明网关已可达，但 API Key 缺失、失效或没有传入当前 PowerShell/VS Code 任务进程。

密钥不能写进项目文件。复制 `.env.example` 为 `.env.local`，或在 PowerShell 当前会话中设置：

```powershell
$env:CHUAN_API_BASE_URL = 'https://chuan.sylu.cc/v1'
$env:CHUAN_API_KEY = 'sk-你的密钥'
$env:CHUAN_MODEL = '从 /v1/models 返回的模型 ID'
```

测试连接：

```powershell
& .\tools\chuan-api-test.ps1
```

也可以在 VS Code 中运行任务「测试 Chuan API 连接」。脚本会先验证模型确实在账号的可用列表中，再发送一条最小请求。

脚本会在请求失败时显示 HTTP 状态码和请求地址；先确认 `CHUAN_API_KEY` 已在启动 VS Code 的同一环境中设置，再运行测试。

## 在 VS Code Copilot Chat 中使用

新版 VS Code 的 Chat 支持 BYOK，但项目设置不能直接修改 Copilot 的模型服务。要在 Copilot Chat 聊天框中使用 Chuan 模型，应在 Chat 的模型选择器中打开「Manage Language Models」，选择「Add Models」→「Custom Endpoint」，使用 Chat Completions，并配置：

- URL：`https://chuan.sylu.cc/v1/chat/completions`
- API Key：通过 VS Code 的安全输入框保存，不要写进 `settings.json`
- Model ID：使用 `GET /v1/models` 返回的 `data[].id`

也可以安装支持 Copilot 原生模型选择器的 DeepSeek 扩展。该扩展的 `baseUrl` 应为 `https://chuan.sylu.cc/v1`，并通过它提供的「DeepSeek: Set API Key」命令保存密钥；如果代理使用不同的模型 ID，再设置 `deepseek-copilot.modelIdOverrides`。这条路径仍然是在 Copilot Chat 中运行，不是 Codex Chat。

若返回 `401`，注意扩展会优先读取 VS Code SecretStorage 中的密钥，旧密钥会覆盖 `settings.json` 中的同名配置。先执行「DeepSeek: Clear API Key」，再执行「DeepSeek: Set API Key」重新输入属于该网关的新密钥，最后执行「Developer: Reload Window」。若返回 `400`，检查模型 ID；若返回 `402`，说明认证成功但账户余额或额度不足。

## New API 官方 Skill

该 Skill 用于在编码 Agent 中管理 New API 资源，而不是替代聊天模型 Provider。安装：

```powershell
npx skills add https://github.com/QuantumNous/skills --skill newapi
```

设置以下环境变量后，支持 Skills 的 Agent 可使用 `/newapi models`、`/newapi balance` 等命令：

```powershell
$env:NEWAPI_BASE_URL = 'https://chuan.sylu.cc'
$env:NEWAPI_ACCESS_TOKEN = '你的系统访问令牌'
$env:NEWAPI_USER_ID = '1'
```

官方文档：

- API：[docs.newapi.pro/zh/docs/api](https://docs.newapi.pro/zh/docs/api)
- Skill：[docs.newapi.pro/zh/docs/skills/newapi](https://docs.newapi.pro/zh/docs/skills/newapi)