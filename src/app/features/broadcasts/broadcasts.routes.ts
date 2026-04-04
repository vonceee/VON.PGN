import { Routes } from '@angular/router';

export const BROADCASTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./broadcasts.component').then((m) => m.BroadcastsComponent),
    title: 'Live Broadcasts - CHESS.PGN',
  },
];
