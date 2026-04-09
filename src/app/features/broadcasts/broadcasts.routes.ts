import { Routes } from '@angular/router';

export const BROADCASTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./broadcasts.component').then((m) => m.BroadcastsComponent),
    title: 'Live Broadcasts - CHESS.PGN',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./broadcast-detail/broadcast-detail.component').then((m) => m.BroadcastDetailComponent),
    title: 'Broadcast Detail - CHESS.PGN',
  },
];
