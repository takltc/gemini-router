/**
 * Stream conversion tests for Gemini -> Claude SSE
 */

import { describe, it, expect } from 'vitest';
import { streamGeminiToAnthropic } from '../streamResponseGemini';

function textStream(chunks: string[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function readAll(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

describe('streamGeminiToAnthropic', () => {
  it('accepts SSE-style data: JSON lines', async () => {
    const chunks = [
      'data: ' +
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] }) +
        '\n',
      'data: [DONE]\n',
    ];
    const s = textStream(chunks);
    const converted = streamGeminiToAnthropic(s, 'gemini-pro');
    const data = await readAll(converted);
    expect(data).toContain('event: message_start');
    expect(data).toContain('event: content_block_start');
    expect(data).toContain('"type":"text_delta"');
    expect(data).toContain('Hello');
    expect(data).toContain('event: message_stop');
  });

  it('accepts raw NDJSON lines', async () => {
    const ndjson =
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Raw' }] }, finishReason: 'MAX_TOKENS' }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2 },
      }) + '\n';
    const s = textStream([ndjson]);
    const converted = streamGeminiToAnthropic(s, 'gemini-pro');
    const data = await readAll(converted);
    expect(data).toContain('"type":"text_delta"');
    expect(data).toContain('Raw');
    expect(data).toContain('max_tokens');
  });
});
