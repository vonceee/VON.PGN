import './polyfills.server';
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

const angularApp = new AngularAppEngine();

export const reqHandler = createRequestHandler(async (req) => {
  const response = await angularApp.handle(req);
  return response || new Response('Not Found', { status: 404 });
});

// Cloudflare Workers expect a default export with a fetch function
export default {
  async fetch(request: Request) {
    return reqHandler(request);
  }
};
