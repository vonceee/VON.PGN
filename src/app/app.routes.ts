import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { SeoService } from './core/services/seo.service';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin.guard';
import { HomeComponent } from './features/home/home.component';
import { TournamentsComponent } from './features/tournaments/tournaments.component';
import { MainLayoutComponent } from '@shared/layout';

function seoResolver(route: import('@angular/router').ActivatedRouteSnapshot) {
  const seo = inject(SeoService);
  const data = route.data;
  seo.update({
    title: data['title'] ?? 'vonchess',
    description:
      data['description'] ??
      "vonchess — your online chess platform for learning, playing, and competing.",
  });
}

export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Vonchess.net • Login',
    data: {
      description: 'Log in to your vonchess account to access courses, tournaments, and more.',
    },
    resolve: { seo: seoResolver },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    title: 'Vonchess.net • Register',
    data: { description: 'Create a free vonchess account and start your chess journey today.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent,
      ),
    title: 'Vonchess.net • Verify',
    data: { description: 'Verify your email address to activate your vonchess account.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    title: 'Vonchess.net • Forgot',
    data: { description: 'Reset your vonchess account password.' },
    resolve: { seo: seoResolver },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    title: 'Vonchess.net • Reset',
    data: { description: 'Set a new password for your vonchess account.' },
    resolve: { seo: seoResolver },
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent,
        title: 'Vonchess.net • Home',
        data: {
          description:
            "vonchess is your online chess platform — learn openings, solve tactics, find coaches, and join tournaments.",
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'home',
        component: HomeComponent,
        title: 'Vonchess.net • Home',
        data: {
          description:
            "vonchess is your online chess platform — learn openings, solve tactics, find coaches, and join tournaments.",
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tv',
        redirectTo: 'study',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        canActivate: [authGuard],
        title: 'Vonchess.net • Profile',
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
        title: 'Vonchess.net • Profile',
        data: { description: "View a player's profile, ratings, and activity on vonchess." },
        resolve: { seo: seoResolver },
      },


      {
        path: 'learn/:courseSlug',
        loadComponent: () =>
          import('./features/learn/learn.component').then((m) => m.LearnComponent),
        title: 'Vonchess.net • Learn',
        data: {
          description:
            'Study chess lessons with interactive boards, chapter navigation, and course materials.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'study',
        loadComponent: () =>
          import('./features/study/study-list/study-list.component').then((m) => m.StudyListComponent),
        title: 'Vonchess.net • Studies',
        data: { description: 'Create and join collaborative chess studies on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'study/drills',
        loadComponent: () =>
          import('./features/study/opening-drills/opening_drill-list.component').then((m) => m.OpeningDrillListComponent),
        canActivate: [authGuard],
        title: 'Vonchess.net • Opening Drills',
        data: { description: 'Build opening muscle memory by practicing your repertoires against an automated opponent.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'study/drills/solve/:id',
        loadComponent: () =>
          import('./features/study/opening-drills/solve/opening-drill.component').then((m) => m.OpeningDrillComponent),
        canActivate: [authGuard],
        title: 'Vonchess.net • Repertoire Drill',
        data: { description: 'Build opening muscle memory by practicing your repertoires against an automated opponent.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'study/:id',
        loadComponent: () =>
          import('./features/study/study.component').then((m) => m.StudyComponent),
        canActivate: [authGuard],
        title: 'Vonchess.net • Study',
        data: { description: 'Collaborate on chess analysis in real-time.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'blog',
        loadComponent: () =>
          import('./features/blog/blog-list/blog-list.component').then((m) => m.BlogListComponent),
        title: 'Vonchess.net • Blog',
        data: { description: 'Read chess articles, tutorials, and community blogs.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'blog/new',
        loadComponent: () =>
          import('./features/blog/blog-editor/blog-editor.component').then((m) => m.BlogEditorComponent),
        canActivate: [adminGuard],
        title: 'Vonchess.net • Create Blog',
        data: { description: 'Write a new blog post.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'blog/:slug',
        loadComponent: () =>
          import('./features/blog/blog-detail/blog-detail.component').then((m) => m.BlogDetailComponent),
        title: 'Vonchess.net • Blog Post',
        data: { description: 'Read this blog post on Vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'blog/:slug/edit',
        loadComponent: () =>
          import('./features/blog/blog-editor/blog-editor.component').then((m) => m.BlogEditorComponent),
        canActivate: [adminGuard],
        title: 'Vonchess.net • Edit Blog',
        data: { description: 'Edit your blog post.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'documentation',
        loadComponent: () =>
          import('./features/documentation/documentation.component').then(
            (m) => m.DocumentationComponent,
          ),
        title: 'Vonchess.net • Docs',
        data: { description: 'vonchess documentation — guides, FAQs, and platform information.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'roadmap',
        loadComponent: () =>
          import('./features/roadmap/roadmap.component').then((m) => m.RoadmapComponent),
        title: 'Vonchess.net • Roadmap',
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
        title: 'Vonchess.net • Privacy',
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
        title: 'Vonchess.net • Terms',
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
        title: 'Vonchess.net • Cookies',
        data: {
          description: 'vonchess cookie policy — how and why we use cookies on our platform.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'whats-new',
        loadComponent: () =>
          import('./features/whats-new/whats-new.component').then((m) => m.WhatsNewComponent),
        title: "Vonchess.net • What's New",
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
        title: 'Vonchess.net • Contact',
        data: {
          description: 'Get in touch with the vonchess team — questions, feedback, and support.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'academy',
        loadComponent: () => import('./features/academy/academy').then((m) => m.AcademyComponent),
        title: 'Vonchess.net • Academy',
        data: {
          description:
            'Join Vonchess Academy — a structured 5-week chess program for beginners to intermediates.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics',
        loadComponent: () =>
          import('./features/tactics/selection/tactics-selection.component').then((m) => m.TacticsSelectionComponent),
        title: 'Vonchess.net • Tactics training',
        data: { description: 'Choose your tactics training mode on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/play',
        loadComponent: () =>
          import('./features/tactics/tactics.component').then((m) => m.TacticsComponent),
        title: 'Vonchess.net • Casual puzzles',
        data: { description: 'Sharpen your chess skills with daily tactical puzzles on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/guess',
        loadComponent: () =>
          import('./features/tactics/guess-the-game/guess-the-game.component').then(
            (m) => m.GuessTheGameComponent
          ),
        title: 'Vonchess.net • Guess the Game',
        data: { description: 'Replay a popular chess game and guess whose game it was.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/practice/:theme',
        loadComponent: () =>
          import('./features/tactics/tactics.component').then((m) => m.TacticsComponent),
        title: 'Vonchess.net • Themed puzzles',
        data: { description: 'Sharpen your chess skills with daily themed tactical puzzles on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/themes',
        loadComponent: () =>
          import('./features/tactics/themes/themes.component').then((m) => m.PuzzleThemesComponent),
        title: 'Vonchess.net • Puzzle Themes',
        data: { description: 'Practice specific tactical motifs and checkmate patterns.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/leaderboard',
        redirectTo: 'tactics',
        pathMatch: 'full',
      },
      {
        path: 'tactics/woodpecker',
        loadComponent: () =>
          import('./features/tactics/woodpecker/dashboard/woodpecker-dashboard.component').then(
            (m) => m.WoodpeckerDashboardComponent,
          ),
        canActivate: [authGuard],
        title: 'Vonchess.net • Woodpecker Method',
        data: { description: 'Train your tactical vision using the Woodpecker spaced repetition method.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/woodpecker/setup',
        loadComponent: () =>
          import('./features/tactics/woodpecker/setup/woodpecker-setup.component').then(
            (m) => m.WoodpeckerSetupComponent,
          ),
        canActivate: [authGuard],
        title: 'Vonchess.net • Woodpecker Setup',
        data: { description: 'Configure a new Woodpecker spaced repetition chess training session.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'tactics/woodpecker/solve/:id',
        loadComponent: () =>
          import('./features/tactics/woodpecker/solve/woodpecker-solve.component').then(
            (m) => m.WoodpeckerSolveComponent,
          ),
        canActivate: [authGuard],
        title: 'Vonchess.net • Woodpecker Solve',
        data: { description: 'Solve tactical puzzles in your active Woodpecker training session.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'explorer',
        redirectTo: 'study',
        pathMatch: 'full',
      },
      {
        path: 'coaches',
        loadChildren: () =>
          import('./features/coaches/coaches.routes').then((m) => m.COACHES_ROUTES),
        title: 'Vonchess.net • Coaches',
        data: { description: 'Browse and connect with verified chess coaches on vonchess.' },
        resolve: { seo: seoResolver },
      },
      {
        path: 'events',
        component: TournamentsComponent,
        title: 'Vonchess.net • Events',
        data: {
          description: 'Browse upcoming, ongoing, and past chess events worldwide.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'arena',
        redirectTo: 'events',
        pathMatch: 'full',
      },
      {
        path: 'events/:id',
        loadComponent: () =>
          import('./features/tournaments/tournament-detail/tournament-detail.component').then(
            (m) => m.TournamentDetailComponent,
          ),
        title: 'Vonchess.net • Event',
        data: {
          description: 'View event details, schedule, prizes, standings, and registration info.',
        },
        resolve: { seo: seoResolver },
      },
      {
        path: 'events/:id/arena',
        redirectTo: 'events/:id',
        pathMatch: 'full',
      },
      {
        path: 'broadcasts',
        redirectTo: 'study',
        pathMatch: 'full',
      },
      {
        path: 'my-events',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/tournaments/my-tournaments/my-tournaments.routes').then(
            (m) => m.MY_TOURNAMENTS_ROUTES,
          ),
        title: 'Vonchess.net • My Events',
      },
      {
        path: 'my-arena',
        redirectTo: 'my-events',
        pathMatch: 'full',
      },
      {
        path: 'play',
        redirectTo: 'study',
        pathMatch: 'full',
      },
      {
        path: 'games/:gameId/review',
        redirectTo: 'study',
        pathMatch: 'full',
      },
      {
        path: 'play/:gameId',
        redirectTo: 'study',
        pathMatch: 'full',
      },
      {
        path: 'play-computer',
        redirectTo: 'study',
        pathMatch: 'full',
      },


    ],
  },
];
