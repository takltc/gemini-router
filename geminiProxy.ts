import { Env } from './env';
import { formatClaudeToGemini } from './formatRequestGemini';
import { formatGeminiToClaude } from './formatResponseGemini';
import { streamGeminiToAnthropic } from './streamResponseGemini';

export async function handleGeminiProxy(request: Request, env: Env): Promise<Response> {
  try {
    const claudeRequest = await request.json();
    const { geminiBody, isStream } = formatClaudeToGemini(claudeRequest);
    const bearerToken = request.headers.get('x-api-key');

    const baseUrl = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    const endpoint = isStream ? 'streamGenerateContent' : 'generateContent';
    const geminiUrl = `${baseUrl}/models/${claudeRequest.model}:${endpoint}${bearerToken ? `?key=${bearerToken}` : ''}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': bearerToken || '',
      },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      return new Response(await geminiResponse.text(), { status: geminiResponse.status });
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
        },
      });
    } else {
      const geminiData = await geminiResponse.json();
      const claudeResponse = formatGeminiToClaude(geminiData, claudeRequest.model);
      return new Response(JSON.stringify(claudeResponse), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('Error processing Gemini proxy request:', error);
    return new Response(
      JSON.stringify({
        error: {
          type: 'internal_error',
          message: error.message || 'Internal server error',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
