import { Routes } from '@angular/router';

export const MY_ARENA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-arena.component').then((m) => m.MyArenaComponent),
    title: 'My Arenas - vonchess',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./my-arena-editor.component').then((m) => m.MyArenaEditorComponent),
    title: 'New Arena - vonchess',
  },
];
