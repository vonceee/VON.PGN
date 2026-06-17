import './polyfills.server';
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

const devHosts = typeof process !== 'undefined' && process.env?.['NG_ALLOWED_HOSTS']
  ? process.env['NG_ALLOWED_HOSTS'].split(',')
  : ['localhost', '127.0.0.1', '192.168.254.146'];

const angularApp = new AngularAppEngine({
  allowedHosts: [
    ...devHosts,
    'von-pgn.alonarvoncedric.workers.dev',
    'vonchess.net',
    'www.vonchess.net'
  ]
});

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
