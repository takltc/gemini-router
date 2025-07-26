[English](./README.md) | [中文](./README.zh-CN.md)

# gemini-router

一个 Cloudflare Worker，用于在 Anthropic 的 Claude API 和 Google 的 Gemini API 之间进行转换。这使您能够将兼容 Claude 的客户端与 Google Gemini 模型一起使用。

## 功能

gemini-router 作为一个转换层，可以：
- 接受 Anthropic API 格式的请求。
- 将请求转换为 Google Gemini 的格式。
- 将请求转发给 Gemini API。
- 将 Gemini API 的响应转换回 Anthropic 的格式。
- 同时支持流式和非流式响应。

这个工具对于原生支持 Claude API 的工具如Claude Code特别有用，让它们可以无缝切换使用 Gemini 模型。

## 快速使用

### 手动设置

**第一步:** 从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取一个 Gemini API 密钥。

**第二步:** 配置您的客户端以使用 gemini-router 的端点。例如，对于 Claude Code，您可以在您的 shell 配置文件 (`~/.bashrc` 或 `~/.zshrc`) 中设置以下环境变量：

```bash
export ANTHROPIC_BASE_URL="https://xxxx" //你自己部署的cloudflare woker实例地址
export ANTHROPIC_API_KEY="your-gemini-api-key"
export ANTHROPIC_MODEL="gemini-2.5-pro"
export ANTHROPIC_SMALL_FAST_MODEL="gemini-2.5-pro"
```

## 自行托管

为了获得更好的可靠性和控制权，您可以部署自己的 gemini-router 实例。

1. **克隆并部署:**
   ```bash
   git clone https://github.com/takltc/gemini-router
   cd gemini-router
   npm install -g wrangler
   wrangler deploy
   ```

2. **设置环境变量:**
   
   ```bash
   # 可选：默认指向 https://generativelanguage.googleapis.com/v1beta
   wrangler secret put GEMINI_BASE_URL
   ```
   
3. **配置您的客户端:**
   - 将 API 端点设置为您部署的 Worker URL。
   - 使用您自己的 Gemini API 密钥。

## 开发

```bash
npm run dev    # 启动开发服务器
npm run deploy # 部署到 Cloudflare Workers
```

## 免责声明

**重要法律声明:**

- **第三方工具**: gemini-router 是一个独立的、非官方的工具，与 Anthropic PBC 或 Google 没有任何关联，也未获得它们的认可或支持。
- **服务条款**: 用户有责任确保其使用行为遵守所有相关方（包括 Anthropic、Google 及任何其他 API 提供商）的服务条款。
- **API 密钥责任**: 用户必须使用自己有效的 API 密钥，并对与这些密钥相关的任何使用、费用或违规行为负全部责任。
- **无担保**: 本软件按“原样”提供，不附带任何形式的担保。作者不对因使用本软件而导致的任何损害、服务中断或法律问题负责。
- **数据隐私**: 虽然 gemini-router 不会有意存储用户数据，但用户应自行审阅所有连接服务的隐私政策。
- **合规性**: 用户有责任确保其使用行为符合其所在司法管辖区的适用法律和法规。

**请自行承担使用风险。**
