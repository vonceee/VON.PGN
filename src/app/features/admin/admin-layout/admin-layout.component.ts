import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroHome,
  heroAcademicCap,
  heroChatBubbleLeftEllipsis,
  heroIdentification,
  heroUserGroup,
  heroTrophy,
  heroUserPlus,
  heroMagnifyingGlass,
  heroBell,
  heroChevronDown,
  heroArrowLeftOnRectangle,
  heroUser,
} from '@ng-icons/heroicons/outline';
import { AuthService } from '../../../core/services/auth.service';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NgIcon],
  styleUrl: '../admin-styles.css',
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideIcons({
      heroHome,
      heroAcademicCap,
      heroChatBubbleLeftEllipsis,
      heroIdentification,
      heroUserGroup,
      heroTrophy,
      heroUserPlus,
      heroMagnifyingGlass,
      heroBell,
      heroChevronDown,
      heroArrowLeftOnRectangle,
      heroUser,
    }),
  ],
  template: `
    <div class="admin-layout bg-slate-50 dark:bg-slate-950">
      <!-- Sidebar -->
      <aside class="admin-sidebar ui-panel border-r border-slate-200 dark:border-slate-800">
        <div class="admin-sidebar-header p-8">
          <div class="flex items-center gap-4">
            <div class="relative group">
              <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div class="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span class="text-white font-black text-xl tracking-tighter">V</span>
              </div>
            </div>
            <div>
              <h1 class="text-xl font-black tracking-tight text-slate-900 dark:text-white">Admin</h1>
              <p class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest -mt-1">Control Panel</p>
            </div>
          </div>
        </div>

        <nav class="admin-sidebar-nav mt-4">
          <div class="px-4 mb-2">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Main</p>
          </div>
          <ul class="space-y-1 px-2">
            <li>
              <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
                <ng-icon name="heroHome" class="nav-icon"></ng-icon>
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/users" routerLinkActive="active" class="nav-link">
                <ng-icon name="heroUserGroup" class="nav-icon"></ng-icon>
                <span>Users</span>
              </a>
            </li>
          </ul>

          <div class="px-4 mt-8 mb-2">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Content</p>
          </div>
          <ul class="space-y-1 px-2">
            <li>
              <a routerLink="/admin/courses" routerLinkActive="active" class="nav-link">
                <ng-icon name="heroAcademicCap" class="nav-icon"></ng-icon>
                <span>Courses</span>
              </a>
            </li>
          </ul>

          <div class="px-4 mt-8 mb-2">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Applications</p>
          </div>
          <ul class="space-y-1 px-2">
            <li>
              <a routerLink="/admin/coach-applications" routerLinkActive="active" class="nav-link">
                <ng-icon name="heroIdentification" class="nav-icon"></ng-icon>
                <span>Coaches</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/academy-enrollments" routerLinkActive="active" class="nav-link">
                <ng-icon name="heroUserPlus" class="nav-icon"></ng-icon>
                <span>Enrollments</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/feedback" routerLinkActive="active" class="nav-link">
                <ng-icon name="heroChatBubbleLeftEllipsis" class="nav-icon"></ng-icon>
                <span>Feedback</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <div class="admin-content-wrapper flex-1 flex flex-col min-h-screen">
        <!-- Header -->
        <header class="admin-header sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 px-8 h-20 flex items-center justify-between">
          <div class="flex items-center gap-8">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{{ pageTitle() }}</h2>
            
            <div class="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 w-80 group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <ng-icon name="heroMagnifyingGlass" class="text-slate-400 group-focus-within:text-blue-500"></ng-icon>
              <input type="text" placeholder="Global search..." class="bg-transparent border-none outline-none text-sm px-3 w-full text-slate-900 dark:text-white placeholder:text-slate-400">
            </div>
          </div>

          <div class="flex items-center gap-4">
            <button class="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <ng-icon name="heroBell" class="text-xl"></ng-icon>
              <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>

            <div class="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

            <div class="flex items-center gap-3 pl-2 group cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/10 overflow-hidden">
                @if (user()?.avatar) {
                  <img [src]="user()?.avatar" class="w-full h-full object-cover">
                } @else {
                  <ng-icon name="heroUser" class="text-xl"></ng-icon>
                }
              </div>
              <div class="hidden sm:block text-left">
                <div class="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">{{ user()?.name }}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Super Admin</div>
              </div>
              <ng-icon name="heroChevronDown" class="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors"></ng-icon>
            </div>
          </div>
        </header>

        <main class="admin-main p-8 lg:p-12">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  user = this.authService.currentUser;
  pageTitle = signal('Dashboard');

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null)
    ).subscribe(() => {
      this.updatePageTitle();
    });
  }

  private updatePageTitle() {
    const url = this.router.url;
    if (url.includes('/admin/users')) this.pageTitle.set('User Management');
    else if (url.includes('/admin/courses')) this.pageTitle.set('Course Management');
    else if (url.includes('/admin/coach-applications')) this.pageTitle.set('Coach Applications');
    else if (url.includes('/admin/academy-enrollments')) this.pageTitle.set('Academy Enrollments');
    else if (url.includes('/admin/feedback')) this.pageTitle.set('User Feedback');
    else this.pageTitle.set('Dashboard Overview');
  }

  logout() {
    this.authService.logout();
  }
}