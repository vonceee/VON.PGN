import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes with parameters — render on-demand (server-side)
  {
    path: 'user/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'learn/:courseSlug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'coaches/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'tournaments/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'my-tournaments/:tournamentId',
    renderMode: RenderMode.Server,
  },
  // Auth-required routes — server-rendered (no session during prerender)
  {
    path: 'profile',
    renderMode: RenderMode.Server,
  },
  {
    path: 'my-progress',
    renderMode: RenderMode.Server,
  },
  {
    path: 'bookmarks',
    renderMode: RenderMode.Server,
  },
  {
    path: 'chat',
    renderMode: RenderMode.Server,
  },
  {
    path: 'my-tournaments',
    renderMode: RenderMode.Server,
  },
  // Admin routes — always server-rendered (require auth)
  {
    path: 'admin/**',
    renderMode: RenderMode.Server,
  },
  // All other routes — render on-demand (server-side)
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
