import { Routes } from '@angular/router';
import { ProfileComponent } from './features/profile/profile.component';
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
    path: 'learn',
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
