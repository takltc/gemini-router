/**
 * Tests for geminiProxy authentication and forwarding
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleGeminiProxy } from '../geminiProxy';
import type { Env } from '../env';

describe('handleGeminiProxy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when API key is missing', async () => {
    const body = {
      model: 'gemini-test',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const req = new Request('https://example.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const env: Env = { GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta' };

    const res = await handleGeminiProxy(req, env);
    expect(res.status).toBe(401);
    const json = (await res.json()) as any;
    expect(json?.error?.type).toBe('authentication_error');
  });

  it('uses Authorization Bearer key and forwards to Gemini without query key', async () => {
    const body = {
      model: 'gemini-test',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const req = new Request('https://example.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer TESTKEY',
      },
      body: JSON.stringify(body),
    });

    const env: Env = { GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta' };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: 'ok' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ) as any
    );

    const res = await handleGeminiProxy(req, env);

    // Verify forwarding
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent'
    );
    expect(url.includes('?key=')).toBe(false);
    const headers = (init.headers || {}) as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('TESTKEY');

    // Verify response converted back to Claude format
    const json = (await res.json()) as any;
    expect(json?.content?.[0]?.text).toBe('ok');
    expect(json?.usage?.input_tokens).toBe(2);
    expect(json?.usage?.output_tokens).toBe(3);
  });

  it('streams with correct Accept header and CORS headers', async () => {
    const body = {
      model: 'gemini-stream',
      stream: true,
      messages: [{ role: 'user', content: 'Hi' }],
    };

    const req = new Request('https://example.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer KEY',
      },
      body: JSON.stringify(body),
    });

    // Upstream SSE payload
    const upstream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(
          enc.encode(
            'data: ' +
              JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A' }] } }] }) +
              '\n\n'
          )
        );
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(upstream, { status: 200 })) as any;

    const env: Env = { GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta' };
    const res = await handleGeminiProxy(req, env);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Accept']).toBe('text/event-stream');
    expect(url.endsWith(':streamGenerateContent')).toBe(true);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('wraps upstream non-OK error as Claude-style error', async () => {
    const body = {
      model: 'gemini-test',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    const req = new Request('https://example.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'KEY',
      },
      body: JSON.stringify(body),
    });

    const env: Env = { GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta' };

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Bad request' } }), { status: 400 })
      ) as any;

    const res = await handleGeminiProxy(req, env);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json?.error?.type).toBe('upstream_error');
    expect(json?.error?.message).toBe('Bad request');
  });
});
