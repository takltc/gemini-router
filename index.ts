import { Env } from './env';
import { handleGeminiProxy } from './geminiProxy';
import { indexHtml } from './indexHtml';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(indexHtml, {
        headers: { 'Content-Type': 'text/html' },
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

    return new Response('Not Found', { status: 404 });
  },
};
