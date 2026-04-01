import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { SeoService } from './core/services/seo.service';
import { ProfileComponent } from './features/profile/profile.component';
import { UserProfileComponent } from './features/user-profile/user-profile.component';
import { MyProgressComponent } from './features/my-progress/my-progress.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email.component';
import { GoogleCallbackComponent } from './features/auth/google-callback/google-callback.component';
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
import { ChatComponent } from './features/chat/chat.component';
import { MatchmakingComponent } from './features/play/matchmaking/matchmaking.component';
import { LiveGameComponent } from './features/play/live-game/live-game.component';
import { adminGuard } from './core/guards/admin.guard';
import { MainLayoutComponent } from './shared/components/layout/main-layout';
import { PrivacyPolicyComponent } from './features/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from './features/terms-of-service/terms-of-service.component';
import { CookiePolicyComponent } from './features/cookie-policy/cookie-policy.component';
import { AboutComponent } from './features/about/about.component';
import { ContactComponent } from './features/contact/contact.component';
import { BookmarksComponent } from './features/bookmarks/bookmarks.component';
import { WhatsNewComponent } from './features/whats-new/whats-new.component';
import { environment } from '../environments/environment';

function seoResolver(route: import('@angular/router').ActivatedRouteSnapshot) {
  const seo = inject(SeoService);
  const data = route.data;
  seo.update({
    title: data['title'] ?? 'VON.PGN',
    description: data['description'] ?? 'VON.PGN — the Philippines\' chess platform for learning, playing, and competing.',
  });
}

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login - CHESS.PGN',
    data: { description: 'Log in to your VON.PGN account to access courses, tournaments, and more.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Register - CHESS.PGN',
    data: { description: 'Create a free VON.PGN account and start your chess journey today.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    title: 'Verify Email - CHESS.PGN',
    data: { description: 'Verify your email address to activate your VON.PGN account.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'auth/google/callback',
    component: GoogleCallbackComponent,
    title: 'Signing in... - CHESS.PGN',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Forgot Password - CHESS.PGN',
    data: { description: 'Reset your VON.PGN account password.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Reset Password - CHESS.PGN',
    data: { description: 'Set a new password for your VON.PGN account.' },
    resolve: { seo: seoResolver },
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent,
        title: 'Home - CHESS.PGN',
        data: { description: 'VON.PGN is the Philippines\' chess platform — learn openings, solve tactics, find coaches, and join tournaments.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard],
        title: 'User Profile - CHESS.PGN',
        data: { description: 'Edit your VON.PGN profile, update your avatar, and manage your account settings.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'user/:id',
        component: UserProfileComponent,
        title: 'User Profile - CHESS.PGN',
        data: { description: 'View a player\'s profile, ratings, and activity on VON.PGN.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'my-progress',
        component: MyProgressComponent,
        canActivate: [authGuard],
        title: 'My Progress - CHESS.PGN',
        data: { description: 'Track your chess learning progress, completed courses, and puzzle ratings.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'bookmarks',
        component: BookmarksComponent,
        canActivate: [authGuard],
        title: 'Bookmarks - CHESS.PGN',
        data: { description: 'View your bookmarked tournaments for quick access.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'learn/:courseSlug',
        component: LearnComponent,
        title: 'Learn Chess',
        data: { description: 'Study chess lessons with interactive boards, chapter navigation, and course materials.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'documentation',
        loadComponent: () => import('./features/documentation/documentation.component').then(m => m.DocumentationComponent),
        title: 'Documentation - CHESS.PGN',
        data: { description: 'VON.PGN documentation — guides, FAQs, and platform information.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'roadmap',
        component: RoadmapComponent,
        title: 'Tutorials Roadmap - CHESS.PGN',
        data: { description: 'Follow a structured chess curriculum from beginner to advanced with the VON.PGN roadmap.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'privacy-policy',
        component: PrivacyPolicyComponent,
        title: 'Privacy Policy - CHESS.PGN',
        data: { description: 'Read the VON.PGN privacy policy — how we collect, use, and protect your data.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'terms-of-service',
        component: TermsOfServiceComponent,
        title: 'Terms of Service - CHESS.PGN',
        data: { description: 'VON.PGN terms of service — rules and guidelines for using our platform.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'cookie-policy',
        component: CookiePolicyComponent,
        title: 'Cookie Policy - CHESS.PGN',
        data: { description: 'VON.PGN cookie policy — how and why we use cookies on our platform.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'about',
        component: AboutComponent,
        title: 'About - CHESS.PGN',
        data: { description: 'Learn about VON.PGN — the Philippines\' chess platform for learning, playing, and competing.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'whats-new',
        component: WhatsNewComponent,
        title: "What's New - CHESS.PGN",
        data: { description: 'Changelog and release notes for VON.PGN — see what\'s been added, improved, and fixed.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'contact',
        component: ContactComponent,
        title: 'Contact - CHESS.PGN',
        data: { description: 'Get in touch with the VON.PGN team — questions, feedback, and support.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics',
        component: TacticsComponent,
        title: 'Tactics - CHESS.PGN',
        data: { description: 'Sharpen your chess skills with daily tactical puzzles on VON.PGN.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'explorer',
        component: OpeningExplorerComponent,
        title: 'Opening Explorer - CHESS.PGN',
        data: { description: 'Explore chess openings with an interactive database — study popular lines and variations.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'coaches',
        component: CoachesComponent,
        title: 'Find a Coach - CHESS.PGN',
        data: { description: 'Browse and connect with verified chess coaches on VON.PGN.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'coaches/:id',
        component: CoachDetailComponent,
        title: 'Coach Profile - CHESS.PGN',
        data: { description: 'View a chess coach\'s profile, specialties, and contact information.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tournaments',
        component: TournamentsComponent,
        title: 'Tournaments - CHESS.PGN',
        data: { description: 'Browse upcoming, ongoing, and past chess tournaments across the Philippines.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tournaments/:id',
        component: TournamentDetailComponent,
        title: 'Tournament Details - CHESS.PGN',
        data: { description: 'View tournament details, schedule, prizes, standings, and registration info.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'chat',
        component: ChatComponent,
        canActivate: [authGuard],
        title: 'Messages - CHESS.PGN',
        data: { description: 'Send and receive messages with other VON.PGN players and coaches.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'my-tournaments',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/my-tournaments/my-tournaments.routes').then((m) => m.MY_TOURNAMENTS_ROUTES),
        title: 'My Tournaments - CHESS.PGN',
      },
      ...(environment.production ? [] : [
        {
          path: 'play',
          component: MatchmakingComponent,
          canActivate: [authGuard],
          title: 'Play - CHESS.PGN',
          data: { description: 'Find a match and play live chess on VON.PGN.' },
          resolve: { seo: seoResolver },
        },
        {
          path: 'play/:gameId',
          component: LiveGameComponent,
          canActivate: [authGuard],
          title: 'Game - CHESS.PGN',
          data: { description: 'Watch or continue a live chess game on VON.PGN.' },
          resolve: { seo: seoResolver },
        }
      ])
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
