import { Env } from './env';
import { handleGeminiProxy } from './geminiProxy';
import { indexHtml } from './indexHtml';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // CORS preflight support
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(indexHtml, {
        headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (
      (url.pathname === '/v1/gemini/messages' || url.pathname.startsWith('/v1/gemini/')) &&
      request.method === 'POST'
    ) {
      return handleGeminiProxy(request, env);
    }

    // Fallback for original /v1/messages, now also routes to Gemini
    // This can be deprecated or changed to another provider in the future
    if (url.pathname === '/v1/messages' && request.method === 'POST') {
      return handleGeminiProxy(request, env);
    }

    return new Response('Not Found', {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  },
};
