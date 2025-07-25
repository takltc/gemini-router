export const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Use Claude Code with Gemini</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #4285F4 0%, #34A853 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(45deg, #2c3e50, #4285F4);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }

        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
            font-weight: 300;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .content {
            padding: 40px;
        }

        .step {
            margin-bottom: 30px;
            padding: 20px;
            border-left: 4px solid #4285F4;
            background: #f8f9fa;
            border-radius: 0 8px 8px 0;
        }

        .step h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            font-size: 1.3em;
        }

        .step-number {
            background: #4285F4;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-weight: bold;
            font-size: 0.9em;
        }

        .code-block {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            margin: 15px 0;
            overflow-x: auto;
            font-size: 0.9em;
            position: relative;
        }

        .code-block-wrapper {
            position: relative;
        }

        .copy-button {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #4285F4;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
            opacity: 0.8;
            transition: opacity 0.2s;
        }

        .copy-button:hover {
            opacity: 1;
            background: #3367D6;
        }

        .copy-button.copied {
            background: #34A853;
        }

        .success {
            background: linear-gradient(45deg, #34A853, #0F9D58);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 30px 0;
        }

        .success h2 {
            margin-bottom: 10px;
            font-size: 1.5em;
        }

        .footer-links {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }

        .footer-links a {
            color: #6c757d;
            text-decoration: none;
            margin: 0 15px;
            font-size: 0.9em;
        }

        .footer-links a:hover {
            color: #4285F4;
        }

        .note {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            color: #1565c0;
            padding: 12px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Claude Code + Gemini</h1>
            <p>One-line install or 3 steps to get started</p>
        </div>

        <div class="content">
            <div class="step">
                <h2><span class="step-number">⚡</span>One-line Install (Recommended)</h2>
                <div class="code-block-wrapper">
                    <div class="code-block">bash -c "$(curl -fsSL https://cc.yovy.app/install.sh)"</div>
                    <button class="copy-button" onclick="copyToClipboard(this, 'bash -c &quot;$(curl -fsSL https://cc.yovy.app/install.sh)&quot;')">Copy</button>
                </div>
                <div class="note">This script will automatically install Node.js, Claude Code, and configure your environment to use Gemini.</div>
            </div>

            <div class="step">
                <h2><span class="step-number">1</span>Manual: Install Claude Code</h2>
                <div class="code-block-wrapper">
                    <div class="code-block">npm install -g @anthropic-ai/claude-code</div>
                    <button class="copy-button" onclick="copyToClipboard(this, 'npm install -g @anthropic-ai/claude-code')">Copy</button>
                </div>
                <div class="note">Or download from <a href="https://claude.ai/code" target="_blank">claude.ai/code</a></div>
            </div>

            <div class="step">
                <h2><span class="step-number">2</span>Manual: Get Gemini API Key</h2>
                <p>Sign up at <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a> and get your API key</p>
            </div>

            <div class="step">
                <h2><span class="step-number">3</span>Manual: Configure</h2>
                <p>Add these to your shell config (<code>~/.bashrc</code> or <code>~/.zshrc</code>):</p>
                <div class="code-block-wrapper">
                    <div class="code-block">export ANTHROPIC_BASE_URL="https://cc.yovy.app"<br>
export ANTHROPIC_API_KEY="your-gemini-api-key"</div>
                    <button class="copy-button" onclick="copyToClipboard(this, 'export ANTHROPIC_BASE_URL=&quot;https://cc.yovy.app&quot;\\nexport ANTHROPIC_API_KEY=&quot;your-gemini-api-key&quot;')">Copy</button>
                </div>
                <p><strong>Optional:</strong> Configure a specific model:</p>
                <div class="code-block-wrapper">
                    <div class="code-block">export ANTHROPIC_MODEL="gemini-1.5-flash-latest"</div>
                    <button class="copy-button" onclick="copyToClipboard(this, 'export ANTHROPIC_MODEL=&quot;gemini-1.5-flash-latest&quot;')">Copy</button>
                </div>
                <p>Then reload your shell:</p>
                <div class="code-block-wrapper">
                    <div class="code-block">source ~/.bashrc</div>
                    <button class="copy-button" onclick="copyToClipboard(this, 'source ~/.bashrc')">Copy</button>
                </div>
            </div>

            <div class="success">
                <h2>🎉 Ready to go!</h2>
                <p>Run <code>claude</code> in your terminal and enjoy access to Gemini models</p>
            </div>

        </div>

        <div class="footer-links">
            <a href="https://github.com/jizhejiang/gemini-router" target="_blank">gemini-router</a>
            <a href="https://deepmind.google/technologies/gemini/" target="_blank">Google Gemini</a>
            <a href="https://claude.ai/code" target="_blank">Claude Code</a>
            <a href="https://yovy.app" target="_blank">Yovy Chat</a>
            <br>
        </div>
    </div>

    <script>
        function copyToClipboard(button, text) {
            navigator.clipboard.writeText(text).then(function() {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(function() {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                console.error('Failed to copy: ', err);
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    button.textContent = 'Copied!';
                    button.classList.add('copied');
                    setTimeout(function() {
                        button.textContent = 'Copy';
                        button.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                }
                document.body.removeChild(textArea);
            });
        }
    </script>
</body>
</html>`;