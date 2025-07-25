import { Env } from './env';
import { handleGeminiProxy } from './geminiProxy';
import { indexHtml } from './indexHtml';
import { termsHtml } from './termsHtml';
import { privacyHtml } from './privacyHtml';
import { installSh } from './installSh';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(indexHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname === '/terms' && request.method === 'GET') {
      return new Response(termsHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname === '/privacy' && request.method === 'GET') {
      return new Response(privacyHtml, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname === '/install.sh' && request.method === 'GET') {
      return new Response(installSh, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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
