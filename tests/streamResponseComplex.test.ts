/**
 * Complex streaming test: text/functionCall interleaving, args incremental, and sources suffix
 */

import { describe, it, expect } from 'vitest';
import { streamGeminiToAnthropic } from '../streamResponseGemini';

function sseStream(lines: string[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      for (const l of lines) controller.enqueue(enc.encode(l));
      controller.close();
    },
  });
}

async function readAll(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out + dec.decode();
}

describe('streamGeminiToAnthropic complex sequence', () => {
  it('handles interleaved text, function calls with incremental args, and appends sources', async () => {
    const chunks = [
      'data: ' +
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hello ' }] } }] }) +
        '\n\n',
      'data: ' +
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ functionCall: { id: 'tool1', name: 'add', args: { a: 1 } } }] },
            },
          ],
        }) +
        '\n\n',
      'data: ' +
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { functionCall: { id: 'tool1', name: 'add', args: { a: 1, b: 2 } } },
                  { text: 'world.' },
                ],
              },
            },
          ],
        }) +
        '\n\n',
      'data: ' +
        JSON.stringify({
          candidates: [
            {
              content: { parts: [] },
              groundingMetadata: {
                groundingChunks: [{ web: { uri: 'https://ex.com', title: 'Ex' } }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
        }) +
        '\n\n',
      'data: [DONE]\n\n',
    ];

    const upstream = sseStream(chunks);
    const converted = streamGeminiToAnthropic(upstream, 'gemini-pro');
    const sse = await readAll(converted);

    // Text deltas appear
    expect(sse).toContain('"type":"text_delta"');
    expect(sse).toContain('Hello ');
    expect(sse).toContain('world.');

    // Tool use started and incremental args sent
    expect(sse).toContain('"type":"content_block_start"');
    expect(sse).toContain('"type":"input_json_delta"');
    // Parse SSE data lines and verify second input_json_delta contains b:2
    const deltas: string[] = [];
    for (const line of sse.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        if (
          obj &&
          obj.type === 'content_block_delta' &&
          obj.delta &&
          obj.delta.type === 'input_json_delta'
        ) {
          deltas.push(obj.delta.partial_json);
        }
      } catch {}
    }
    if (!(deltas.length >= 2)) throw new Error('expected >=2 input_json_delta deltas');
    if (!String(deltas[1]).includes('\"b\":2'))
      throw new Error('expected second delta to contain \"b\":2');
    // Sources suffix appended as plain text
    expect(sse).toContain('Sources:');
    expect(sse).toContain('Ex (https://ex.com)');
  });
});
