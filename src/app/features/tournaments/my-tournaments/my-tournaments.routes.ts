import { Routes } from '@angular/router';

export const MY_TOURNAMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./my-tournaments.component').then((m) => m.MyTournamentsComponent),
    title: 'My Tournaments - CHESS.PGN',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('../tournament-editor/tournament-editor').then((m) => m.TournamentEditorComponent),
    data: { mode: 'user' },
    title: 'New Tournament - CHESS.PGN',
  },
  {
    path: ':tournamentId',
    loadComponent: () =>
      import('../tournament-editor/tournament-editor').then((m) => m.TournamentEditorComponent),
    data: { mode: 'user' },
    title: 'Edit Tournament - CHESS.PGN',
  },
];
