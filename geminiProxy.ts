import { Env } from './env';
import { formatClaudeToGemini } from './formatRequestGemini';
import { formatGeminiToClaude } from './formatResponseGemini';
import { streamGeminiToAnthropic } from './streamResponseGemini';

export async function handleGeminiProxy(request: Request, env: Env): Promise<Response> {
  try {
    const claudeRequest = await request.json();
    const { geminiBody, isStream } = formatClaudeToGemini(claudeRequest);
    // Accept API key from x-api-key or Authorization: Bearer <key>
    let apiKey = request.headers.get('x-api-key') || '';
    if (!apiKey) {
      const auth = request.headers.get('authorization') || request.headers.get('Authorization');
      if (auth && /^Bearer\s+(.+)$/i.test(auth)) {
        apiKey = auth.replace(/^Bearer\s+/i, '').trim();
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: {
            type: 'authentication_error',
            message: 'Missing API key. Provide via x-api-key or Authorization: Bearer <key>.',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const baseUrl = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    const endpoint = isStream ? 'streamGenerateContent' : 'generateContent';
    const geminiUrl = `${baseUrl}/models/${claudeRequest.model}:${endpoint}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: isStream ? 'text/event-stream' : 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      const text = await geminiResponse.text();
      let upstream: unknown;
      try {
        upstream = JSON.parse(text);
      } catch {
        upstream = text;
      }
      const message =
        (upstream as any)?.error?.message ||
        (typeof upstream === 'string' ? upstream : 'Upstream error');
      return new Response(
        JSON.stringify({
          error: {
            type: 'upstream_error',
            message,
            status: geminiResponse.status,
            upstream,
          },
        }),
        {
          status: geminiResponse.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (isStream) {
      const geminiStream = streamGeminiToAnthropic(
        geminiResponse.body as ReadableStream,
        claudeRequest.model
      );
      return new Response(geminiStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      const geminiData = await geminiResponse.json();
      const claudeResponse = formatGeminiToClaude(geminiData, claudeRequest.model);
      return new Response(JSON.stringify(claudeResponse), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch (error: unknown) {
    console.error('Error processing Gemini proxy request:', error);
    return new Response(
      JSON.stringify({
        error: {
          type: 'internal_error',
          message: (error as Error).message || 'Internal server error',
          cause: (error as Error).stack,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
