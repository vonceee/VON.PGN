// @ts-ignore
import { createRequire } from 'node:module';
// @ts-ignore
import EventEmitter from 'node:events';

// Polyfill require for Cloudflare Workers (nodejs_compat)
if (typeof (globalThis as any).require === 'undefined') {
  try {
    (globalThis as any).require = createRequire((import.meta as any).url || 'file:///index.js');
  } catch (e) {
    // Fallback if createRequire fails
    (globalThis as any).require = (id: string) => {
      if (id === 'events' || id === 'node:events') return EventEmitter;
      if (id === 'fs' || id === 'node:fs') return {}; // Mock fs
      throw new Error(`Require of ${id} is not supported on the edge`);
    };
  }
}
