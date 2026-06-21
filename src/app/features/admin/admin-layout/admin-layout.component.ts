import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  encapsulation: ViewEncapsulation.None,
  providers: [],
  template: `
    <div class="flex min-h-screen bg-subtle text-content">
      <!-- Sidebar -->
      <aside class="w-80 bg-main text-content fixed top-0 left-0 h-screen overflow-y-auto z-50 border-r border-border-base">
        <div class="p-8 border-b border-border-base">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-content rounded flex items-center justify-center text-white font-semibold">
              V
            </div>
            <h1 class="text-xl font-semibold ">Admin</h1>
          </div>
        </div>

        <nav class="mt-4">
          <div class="px-4 mb-2">
            <p class="text-xs font-semibold  uppercase  px-2">Main</p>
          </div>
          <ul class="space-y-1 px-2">
            <li>
              <a routerLink="/admin" routerLinkActive="bg-blue-50 text-blue-600" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-4 py-2.5 rounded-lg  hover:bg-subtle hover:text-blue-600 mx-2  ">
                
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/users" routerLinkActive="bg-blue-50 text-blue-600" class="flex items-center gap-3 px-4 py-2.5 rounded-lg  hover:bg-subtle hover:text-blue-600 mx-2  ">
                
                <span>Users</span>
              </a>
            </li>
          </ul>

          <div class="px-4 mt-8 mb-2">
            <p class="text-xs font-semibold  uppercase  px-2">Content</p>
          </div>
          <ul class="space-y-1 px-2">
            <li>
              <a routerLink="/admin/courses" routerLinkActive="bg-blue-50 text-blue-600" class="flex items-center gap-3 px-4 py-2.5 rounded-lg  hover:bg-subtle hover:text-blue-600 mx-2  ">
                
                <span>Courses</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/guess-game-import" routerLinkActive="bg-blue-50 text-blue-600" class="flex items-center gap-3 px-4 py-2.5 rounded-lg  hover:bg-subtle hover:text-blue-600 mx-2  ">
                
                <span>Guess the Game</span>
              </a>
            </li>
          </ul>

          <div class="px-4 mt-8 mb-2">
            <p class="text-xs font-semibold  uppercase  px-2">Applications</p>
          </div>
          <ul class="space-y-1 px-2">
            <li>
              <a routerLink="/admin/coaches" routerLinkActive="bg-blue-50 text-blue-600" class="flex items-center gap-3 px-4 py-2.5 rounded-lg  hover:bg-subtle hover:text-blue-600 mx-2  ">
                
                <span>Coach Profiles</span>
              </a>
            </li>

            <li>
              <a routerLink="/admin/academy-enrollments" routerLinkActive="bg-blue-50 text-blue-600" class="flex items-center gap-3 px-4 py-2.5 rounded-lg  hover:bg-subtle hover:text-blue-600 mx-2  ">
                
                <span>Enrollments</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <div class="ml-[280px] flex-1 flex flex-col min-h-screen">
        <!-- Header -->
        <header class="sticky top-0 right-0 w-full z-40 bg-main border-b border-border-base px-8 h-20 flex items-center justify-between">
          <div class="flex items-center gap-8">
            <h2 class="text-lg font-semibold text-content ">{{ pageTitle() }}</h2>
          </div>

          <div class="flex items-center gap-4">
            <div class="h-8 w-px bg-subtle mx-2"></div>

            <div class="flex items-center gap-3 pl-2 group cursor-pointer">
              <div class="w-10 h-10 rounded bg-subtle flex items-center justify-center text-muted font-semibold overflow-hidden">
                @if (user()?.avatar) {
                  <img [src]="user()?.avatar" class="w-full h-full object-cover">
                } @else {
                  <span>{{ user()?.name?.charAt(0) }}</span>
                }
              </div>
              <div class="hidden sm:block text-left">
                <div class="text-sm font-semibold text-content leading-none mb-1">{{ user()?.name }}</div>
                <div class="text-xs font-semibold text-muted uppercase  leading-none">Super Admin</div>
              </div>
              
            </div>
          </div>
        </header>

        <main class="flex-1 p-8 lg:p-12 bg-subtle">
          <div class="mx-auto w-full h-full">
            <router-outlet></router-outlet>
          </div>
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
    else if (url.includes('/admin/coaches')) this.pageTitle.set('Coach Management');
    else if (url.includes('/admin/coach/')) this.pageTitle.set('Coach Editor');
    else if (url.includes('/admin/guess-game-import')) this.pageTitle.set('Guess the Game Import');
    else if (url.includes('/admin/academy-enrollments')) this.pageTitle.set('Academy Enrollments');
    else this.pageTitle.set('Dashboard Overview');
  }

  logout() {
    this.authService.logout();
  }
}
