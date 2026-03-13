import { Routes } from '@angular/router';
import { ProfileComponent } from './features/profile/profile.component';
import { MyProgressComponent } from './features/my-progress/my-progress.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { authGuard } from './core/guards/auth-guard';
import { HomeComponent } from './features/home/home.component';
import { RoadmapComponent } from './features/roadmap/roadmap.component';
import { LearnComponent } from './features/learn/learn.component';
import { TacticsComponent } from './features/tactics/tactics.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
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
    path: 'learn',
    redirectTo: 'learn/chess-basics',
    pathMatch: 'full',
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
];
