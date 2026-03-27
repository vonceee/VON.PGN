import { Routes } from '@angular/router';
import { ProfileComponent } from './features/profile/profile.component';
import { MyProgressComponent } from './features/my-progress/my-progress.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { authGuard } from './core/guards/auth-guard';
import { HomeComponent } from './features/home/home.component';
import { RoadmapComponent } from './features/roadmap/roadmap.component';
import { LearnComponent } from './features/learn/learn.component';
import { TacticsComponent } from './features/tactics/tactics.component';
import { OpeningExplorerComponent } from './features/opening-explorer/opening-explorer.component';
import { CoachesComponent } from './features/coaches/coaches.component';
import { CoachDetailComponent } from './features/coaches/coach-detail/coach-detail.component';
import { TournamentsComponent } from './features/tournaments/tournaments.component';
import { TournamentDetailComponent } from './features/tournaments/tournament-detail/tournament-detail.component';
import { adminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './shared/components/layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login - CHESS.PGN',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Register - CHESS.PGN',
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    title: 'Verify Email - CHESS.PGN',
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent,
        title: 'Home - CHESS.PGN',
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard],
        title: 'User Profile - CHESS.PGN',
      },
      {
        path: 'my-progress',
        component: MyProgressComponent,
        canActivate: [authGuard],
        title: 'My Progress - CHESS.PGN',
      },
      {
        path: 'learn/:courseSlug',
        component: LearnComponent,
        title: 'Learn Chess',
      },
      {
        path: 'roadmap',
        component: RoadmapComponent,
        title: 'Tutorials Roadmap - CHESS.PGN',
      },
      {
        path: 'tactics',
        component: TacticsComponent,
        title: 'Tactics - CHESS.PGN',
      },
      {
        path: 'explorer',
        component: OpeningExplorerComponent,
        title: 'Opening Explorer - CHESS.PGN',
      },
      {
        path: 'coaches',
        component: CoachesComponent,
        title: 'Find a Coach - CHESS.PGN',
      },
      {
        path: 'coaches/:id',
        component: CoachDetailComponent,
        title: 'Coach Profile - CHESS.PGN',
      },
      {
        path: 'tournaments',
        component: TournamentsComponent,
        title: 'Tournaments - CHESS.PGN',
      },
      {
        path: 'tournaments/:id',
        component: TournamentDetailComponent,
        title: 'Tournament Details - CHESS.PGN',
      }
    ],
  },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
