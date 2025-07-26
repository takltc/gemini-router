[English](./README.md) | [中文](./README.zh-CN.md)

# gemini-router

A Cloudflare Worker that translates between Anthropic's Claude API and Google's Gemini API. This allows you to use Claude-compatible clients with Google Gemini models.

## Features

gemini-router acts as a translation layer that:
- Accepts requests in the Anthropic API format.
- Converts the request to Google Gemini's format.
- Forwards the request to the Gemini API.
- Converts the Gemini API's response back into Anthropic's format.
- Supports both streaming and non-streaming responses.

This tool is particularly useful for tools that natively support the Claude API, like Claude Code, allowing them to seamlessly switch to using Gemini models.

## Quick Start

### Manual Setup

**Step 1:** Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

**Step 2:** Configure your client to use the gemini-router's endpoint. For example, for Claude Code, you can set the following environment variables in your shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
export ANTHROPIC_BASE_URL="https://xxxx" // Your deployed Cloudflare worker instance address
export ANTHROPIC_API_KEY="your-gemini-api-key"
export ANTHROPIC_MODEL="gemini-2.5-pro"
export ANTHROPIC_SMALL_FAST_MODEL="gemini-2.5-pro"
```

## Self-Hosting

For better reliability and control, you can deploy your own instance of gemini-router.

1. **Clone and deploy:**
   ```bash
   git clone https://github.com/takltc/gemini-router
   cd gemini-router
   npm install -g wrangler
   wrangler deploy
   ```

2. **Set environment variables:**
   
   ```bash
   # Optional: defaults to https://generativelanguage.googleapis.com/v1beta
   wrangler secret put GEMINI_BASE_URL
   ```
   
3. **Configure your client:**
   - Set the API endpoint to your deployed Worker URL.
   - Use your own Gemini API key.

## Development

```bash
npm run dev    # Start the development server
npm run deploy # Deploy to Cloudflare Workers
```

## Disclaimer

**Important Legal Notice:**

- **Third-Party Tool**: gemini-router is an independent, unofficial tool and is not affiliated with, endorsed by, or supported by Anthropic PBC or Google in any way.
- **Terms of Service**: Users are responsible for ensuring their usage complies with the terms of service of all relevant parties, including Anthropic, Google, and any other API providers.
- **API Key Responsibility**: Users must use their own valid API keys and are solely responsible for any usage, costs, or violations associated with those keys.
- **No Warranty**: This software is provided "as is" without any warranty of any kind. The author is not responsible for any damages, service interruptions, or legal issues that may arise from its use.
- **Data Privacy**: While gemini-router does not intentionally store user data, users should review the privacy policies of all connected services.
- **Compliance**: Users are responsible for ensuring their usage complies with all applicable laws and regulations in their jurisdiction.

**Use at your own risk.**
