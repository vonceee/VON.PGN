import { Routes } from '@angular/router';

export const COACHES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./coaches.component').then((m) => m.CoachesComponent),
    title: 'Find a Coach - vonchess',
  },
  {
    path: 'apply',
    loadComponent: () =>
      import('./coach-application/coach-application.component').then((m) => m.CoachApplicationComponent),
    title: 'Submit Coach Profile - vonchess',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./coach-detail/coach-detail.component').then((m) => m.CoachDetailComponent),
    title: 'Coach Profile - vonchess',
  },
];