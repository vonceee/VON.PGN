import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { SeoService } from './core/services/seo.service';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin.guard';
import { HomeComponent } from './features/home/home.component';
import { TournamentsComponent } from './features/tournaments/tournaments.component';
import { MainLayoutComponent } from './shared/components/layout/main-layout';

function seoResolver(route: import('@angular/router').ActivatedRouteSnapshot) {
  const seo = inject(SeoService);
  const data = route.data;
  seo.update({
    title: data['title'] ?? 'vonchess',
    description:
      data['description'] ??
      "vonchess — the Philippines' chess platform for learning, playing, and competing.",
  });
}

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Login - vonchess',
    data: {
      description: 'Log in to your vonchess account to access courses, tournaments, and more.',
    },
    resolve: { seo: seoResolver },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    title: 'Register - vonchess',
    data: { description: 'Create a free vonchess account and start your chess journey today.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent,
      ),
    title: 'Verify Email - vonchess',
    data: { description: 'Verify your email address to activate your vonchess account.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    title: 'Forgot Password - vonchess',
    data: { description: 'Reset your vonchess account password.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    title: 'Reset Password - vonchess',
    data: { description: 'Set a new password for your vonchess account.' },
    resolve: { seo: seoResolver },
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: TournamentsComponent,
        title: 'Tournaments - vonchess',
        data: {
          description:
            'Browse upcoming, ongoing, and past chess tournaments across the Philippines.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'home',
        component: HomeComponent,
        title: 'Home - vonchess',
        data: {
          description:
            "vonchess is the Philippines' chess platform — learn openings, solve tactics, find coaches, and join tournaments.",
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        canActivate: [authGuard],
        title: 'User Profile - vonchess',
        data: {
          description:
            'Edit your vonchess profile, update your avatar, and manage your account settings.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'user/:id',
        loadComponent: () =>
          import('./features/user-profile/user-profile.component').then(
            (m) => m.UserProfileComponent,
          ),
        title: 'User Profile - vonchess',
        data: { description: "View a player's profile, ratings, and activity on vonchess." },
        resolve: { seo: seoResolver },
      },
      {
        path: 'my-progress',
        loadComponent: () =>
          import('./features/my-progress/my-progress.component').then((m) => m.MyProgressComponent),
        canActivate: [authGuard],
        title: 'My Progress - vonchess',
        data: {
          description: 'Track your chess learning progress, completed courses, and puzzle ratings.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'bookmarks',
        loadComponent: () =>
          import('./features/bookmarks/bookmarks.component').then((m) => m.BookmarksComponent),
        canActivate: [authGuard],
        title: 'Bookmarks - vonchess',
        data: { description: 'View your bookmarked tournaments for quick access.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'learn/:courseSlug',
        loadComponent: () =>
          import('./features/learn/learn.component').then((m) => m.LearnComponent),
        title: 'Learn Chess',
        data: {
          description:
            'Study chess lessons with interactive boards, chapter navigation, and course materials.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'documentation',
        loadComponent: () =>
          import('./features/documentation/documentation.component').then(
            (m) => m.DocumentationComponent,
          ),
        title: 'Documentation - vonchess',
        data: { description: 'vonchess documentation — guides, FAQs, and platform information.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'roadmap',
        loadComponent: () =>
          import('./features/roadmap/roadmap.component').then((m) => m.RoadmapComponent),
        title: 'Tutorials Roadmap - vonchess',
        data: {
          description:
            'Follow a structured chess curriculum from beginner to advanced with the vonchess roadmap.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'privacy-policy',
        loadComponent: () =>
          import('./features/privacy-policy/privacy-policy.component').then(
            (m) => m.PrivacyPolicyComponent,
          ),
        title: 'Privacy Policy - vonchess',
        data: {
          description:
            'Read the vonchess privacy policy — how we collect, use, and protect your data.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'terms-of-service',
        loadComponent: () =>
          import('./features/terms-of-service/terms-of-service.component').then(
            (m) => m.TermsOfServiceComponent,
          ),
        title: 'Terms of Service - vonchess',
        data: {
          description: 'vonchess terms of service — rules and guidelines for using our platform.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'cookie-policy',
        loadComponent: () =>
          import('./features/cookie-policy/cookie-policy.component').then(
            (m) => m.CookiePolicyComponent,
          ),
        title: 'Cookie Policy - vonchess',
        data: {
          description: 'vonchess cookie policy — how and why we use cookies on our platform.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'whats-new',
        loadComponent: () =>
          import('./features/whats-new/whats-new.component').then((m) => m.WhatsNewComponent),
        title: "What's New - vonchess",
        data: {
          description:
            "Changelog and release notes for vonchess — see what's been added, improved, and fixed.",
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/contact.component').then((m) => m.ContactComponent),
        title: 'Contact - vonchess',
        data: {
          description: 'Get in touch with the vonchess team — questions, feedback, and support.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics',
        loadComponent: () =>
          import('./features/tactics/tactics.component').then((m) => m.TacticsComponent),
        title: 'Tactics - vonchess',
        data: { description: 'Sharpen your chess skills with daily tactical puzzles on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'explorer',
        loadComponent: () =>
          import('./features/opening-explorer/opening-explorer.component').then(
            (m) => m.OpeningExplorerComponent,
          ),
        title: 'Opening Explorer - vonchess',
        data: {
          description:
            'Explore chess openings with an interactive database — study popular lines and variations.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'coaches',
        loadComponent: () =>
          import('./features/coaches/coaches.component').then((m) => m.CoachesComponent),
        title: 'Find a Coach - vonchess',
        data: { description: 'Browse and connect with verified chess coaches on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'coaches/:id',
        loadComponent: () =>
          import('./features/coaches/coach-detail/coach-detail.component').then(
            (m) => m.CoachDetailComponent,
          ),
        title: 'Coach Profile - vonchess',
        data: {
          description: "View a chess coach's profile, specialties, and contact information.",
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./features/tournaments/tournaments.component').then(
            (m) => m.TournamentsComponent,
          ),
        title: 'Tournaments - vonchess',
        data: {
          description:
            'Browse upcoming, ongoing, and past chess tournaments across the Philippines.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tournaments/:id',
        loadComponent: () =>
          import('./features/tournaments/tournament-detail/tournament-detail.component').then(
            (m) => m.TournamentDetailComponent,
          ),
        title: 'Tournament Details - vonchess',
        data: {
          description:
            'View tournament details, schedule, prizes, standings, and registration info.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'broadcasts',
        loadChildren: () =>
          import('./features/broadcasts/broadcasts.routes').then((m) => m.BROADCASTS_ROUTES),
        title: 'Live Broadcasts - vonchess',
      },
      {
        path: 'my-tournaments',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/my-tournaments/my-tournaments.routes').then(
            (m) => m.MY_TOURNAMENTS_ROUTES,
          ),
        title: 'My Tournaments - vonchess',
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent),
        canActivate: [authGuard],
        title: 'Messages - vonchess',
        data: { description: 'Send and receive messages with other vonchess players and coaches.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'my-tournaments',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/my-tournaments/my-tournaments.routes').then(
            (m) => m.MY_TOURNAMENTS_ROUTES,
          ),
        title: 'My Tournaments - vonchess',
      },
      {
        path: 'play',
        loadComponent: () =>
          import('./features/play/matchmaking/matchmaking.component').then(
            (m) => m.MatchmakingComponent,
          ),
        canActivate: [authGuard],
        title: 'Play - vonchess',
        data: { description: 'Find a match and play live chess on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'play/:gameId',
        loadComponent: () =>
          import('./features/play/live-game/live-game.component').then((m) => m.LiveGameComponent),
        canActivate: [authGuard],
        title: 'Game - vonchess',
        data: { description: 'Watch or continue a live chess game on vonchess.' },
        resolve: { seo: seoResolver },
      },
    ],
  },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
