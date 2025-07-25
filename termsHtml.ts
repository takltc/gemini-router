export const termsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - gemini-router</title>
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
            background: #f8f9fa;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            padding: 40px;
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.5em;
            font-weight: 300;
        }

        .last-updated {
            color: #6c757d;
            margin-bottom: 30px;
            font-size: 0.9em;
        }

        h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 1.4em;
        }

        h3 {
            color: #34495e;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 1.1em;
        }

        p, li {
            margin-bottom: 10px;
            color: #555;
        }

        ul {
            padding-left: 20px;
        }

        .highlight {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }

        .contact {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }

        .nav {
            text-align: center;
            margin-bottom: 30px;
        }

        .nav a {
            color: #4285F4;
            text-decoration: none;
            margin: 0 15px;
            padding: 5px 10px;
            border-radius: 4px;
            transition: background 0.3s;
        }

        .nav a:hover {
            background: #e3f2fd;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">Home</a>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
        </div>

        <h1>Terms of Service</h1>
        <div class="last-updated">Last updated: July 12, 2025</div>

        <div class="highlight">
            <strong>Important:</strong> By using gemini-router (cc.yovy.app), you acknowledge that this is a third-party service not affiliated with Anthropic or Google. You use this service at your own risk.
        </div>

        <h2>1. Service Description</h2>
        <p>gemini-router is an API translation service that converts requests between Anthropic's Claude API format and Google's Gemini API format. The service acts as a proxy to enable compatibility between different API standards.</p>

        <h2>2. Acceptance of Terms</h2>
        <p>By accessing or using gemini-router, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the service.</p>

        <h2>3. User Responsibilities</h2>
        <h3>3.1 API Key Management</h3>
        <ul>
            <li>You must provide your own valid API keys for Google Gemini</li>
            <li>You are solely responsible for the security and proper use of your API keys</li>
            <li>You are responsible for all costs and usage associated with your API keys</li>
        </ul>

        <h3>3.2 Compliance</h3>
        <ul>
            <li>You must comply with all applicable laws and regulations</li>
            <li>You must comply with the terms of service of all connected API providers (Google, Anthropic)</li>
            <li>You must not use the service for illegal, harmful, or malicious purposes</li>
        </ul>

        <h2>4. Service Limitations</h2>
        <ul>
            <li>gemini-router is provided "as is" without warranties of any kind</li>
            <li>Service availability is not guaranteed</li>
            <li>We reserve the right to modify, suspend, or discontinue the service at any time</li>
            <li>Rate limits and usage restrictions may apply</li>
        </ul>

        <h2>5. Data and Privacy</h2>
        <ul>
            <li>gemini-router processes requests in real-time and does not intentionally store user data</li>
            <li>Requests are forwarded to Google according to their own privacy policies</li>
            <li>You should review the privacy policies of all connected services</li>
        </ul>

        <h2>6. Limitation of Liability</h2>
        <p>gemini-router, its operators, and contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, including but not limited to:</p>
        <ul>
            <li>Data loss or corruption</li>
            <li>Service interruptions</li>
            <li>Cost overruns from API usage</li>
            <li>Violations of third-party terms of service</li>
            <li>Security breaches or unauthorized access</li>
        </ul>

        <h2>7. Indemnification</h2>
        <p>You agree to indemnify and hold harmless gemini-router and its operators from any claims, damages, or expenses arising from your use of the service or violation of these terms.</p>

        <h2>8. Third-Party Services</h2>
        <p>gemini-router integrates with Google's API services. Your use of these services through gemini-router is subject to their respective terms of service and privacy policies. We are not responsible for the actions, policies, or content of third-party services.</p>

        <h2>9. Intellectual Property</h2>
        <p>gemini-router is open-source software. All trademarks, service marks, and logos used in connection with third-party services are the property of their respective owners.</p>

        <h2>10. Modifications to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the service after modifications constitutes acceptance of the updated terms.</p>

        <h2>11. Termination</h2>
        <p>We may terminate or suspend access to the service immediately, without prior notice or liability, for any reason, including if you breach these terms.</p>

        <div class="contact">
            <h3>Contact Information</h3>
            <p>For questions about these Terms of Service, please contact us through the <a href="https://github.com/jizhejiang/gemini-router" target="_blank">GitHub repository</a>.</p>
        </div>

        <div class="footer">
            <p>gemini-router is an independent, open-source project.<br>
            Not affiliated with Anthropic or Google.</p>
        </div>
    </div>
</body>
</html>`;