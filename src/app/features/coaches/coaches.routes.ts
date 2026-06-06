import { Routes } from '@angular/router';

export const COACHES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./coaches.component').then((m) => m.CoachesComponent),
    title: 'Find a Coach - vonchess',
  },

  {
    path: ':id',
    loadComponent: () =>
      import('./coach-detail/coach-detail.component').then((m) => m.CoachDetailComponent),
    title: 'Coach Profile - vonchess',
  },
];