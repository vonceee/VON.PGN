import { Routes } from '@angular/router';
import { LearnComponent } from './features/learn/learn.component';
import { ProfileComponent } from './features/profile/profile.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  // {
  //   path: '',
  //   component: LearnComponent,
  //   title: 'Learn Chess',
  // },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
    title: 'User Profile - CHESS.PGN',
  },
];
