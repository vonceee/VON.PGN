import { Component, inject, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="lg:hidden fixed inset-0 z-40 bg-black/40" (click)="close.emit()"></div>
    <div
      class="lg:hidden fixed top-0 right-0 z-50 w-full sm:w-[500px] md:w-[600px] h-full bg-white flex flex-col overflow-y-auto transition-transform duration-300"
    >
      <!-- Menu Header -->
      <div class="flex items-center gap-4 shrink-0 h-16 px-4 relative">
        <!-- Close Button -->
        <button
          (click)="close.emit()"
          aria-label="Close menu"
          class="relative group flex items-center justify-center shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <!-- Navigation Grid -->
      <div class="flex-1 p-6 md:p-4 pt-0 overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
          @for (group of linkGroups; track group.title) {
            <div class="flex flex-col">
              <span class="text-gray-500 block mb-1">
                {{ group.title }}
              </span>
              <div class="flex flex-col gap-0.5">
                @for (link of group.links; track link.label) {
                  <a
                    [routerLink]="link.path"
                    [queryParams]="link.queryParams"
                    routerLinkActive="bg-slate-200 text-blue-600"
                    [routerLinkActiveOptions]="{ exact: !link.queryParams }"
                    (click)="close.emit()"
                    class="flex items-center justify-between px-3 py-2 rounded-xl"
                  >
                    <span>{{ link.label }}</span>
                  </a>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Auth Section -->
      <div class="p-6 shrink-0 md:hidden">
        @if (authService.isAuthenticated()) {
          <!-- User Profile Card -->
          <div class="flex items-center justify-between px-3.5">
            <a
              routerLink="/profile"
              (click)="close.emit()"
              class="flex items-center gap-3 min-w-0 flex-1 hover:text-blue-600 transition-colors"
            >
              <span class="leading-tight">
                {{ userService.currentUser()?.username || 'User' }}
              </span>
            </a>

            <!-- Logout Button -->
            <button
              (click)="authService.logout(); close.emit()"
              aria-label="Logout"
              title="Logout"
              class="text-rose-600"
            >
              Logout
            </button>
          </div>

          <!-- User Actions List -->
          @if (userService.currentUser()?.is_admin || authService.currentUser()?.is_admin) {
            <div class="flex flex-col gap-1">
              <a
                routerLink="/my-events"
                routerLinkActive="bg-slate-200 text-blue-600 font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="close.emit()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-slate-900 hover:bg-slate-200 transition-all duration-200"
              >
                My Tournaments
              </a>

              <a
                routerLink="/admin"
                routerLinkActive="bg-slate-200 text-blue-600 font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="close.emit()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-slate-900 hover:bg-slate-200 transition-all duration-200"
              >
                Admin Panel
              </a>
            </div>
          }
        } @else {
          <!-- Google-style Primary Button for Login -->
          <a
            routerLink="/login"
            (click)="close.emit()"
            class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm/6 font-semibold text-white bg-blue-600 hover:bg-blue-600/90 transition-colors text-center cursor-pointer"
          >
            Log in
          </a>
        }
      </div>
    </div>
  `,
})
export class MobileMenuComponent {
  authService = inject(AuthService);
  userService = inject(UserService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  close = output();

  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  isSearching = signal(false);
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) return of(null);
          this.isSearching.set(true);
          return this.userService.searchUsers(query);
        }),
      )
      .subscribe({
        next: (results) => {
          this.isSearching.set(false);
          if (results !== null) {
            this.searchResults.set(results);
          }
        },
        error: () => {
          this.isSearching.set(false);
          this.searchResults.set([]);
        },
      });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
    if (value.length === 0) {
      this.searchResults.set([]);
    }
  }

  viewUserProfile(user: any) {
    this.router.navigate(['/user', user.uid]);
    this.close.emit();
  }


  linkGroups = [
    {
      title: 'Learn',
      links: [
        { path: '/study', label: 'Study' },
        { path: '/study', label: 'Opening', queryParams: { category: 'opening_repertoire' } },
        { path: '/study', label: 'Middlegame', queryParams: { category: 'middlegame' } },
        { path: '/study', label: 'Endgame', queryParams: { category: 'endgame' } },
        { path: '/roadmap', label: 'Roadmap' },
      ],
    },
    {
      title: 'Practice',
      links: [
        { path: '/tactics', label: 'Tactics' },
        { path: '/study/drills', label: 'Opening drills' },
        { path: '/bughouse', label: 'Bughouse' },
      ],
    },
    {
      title: 'Academy',
      links: [
        { path: '/academy', label: 'Academy' },
      ],
    },
    {
      title: 'Coaches',
      links: [
        { path: '/coaches', label: 'Coaches' },
      ],
    },
    {
      title: 'Events',
      links: [
        { path: '/events', label: 'Tournaments' },
      ],
    },
    {
      title: 'Museum',
      links: [
        { path: '/monikers', label: 'Player monikers' },
        { path: '/world-championships', label: 'World Championships' },
        { path: '/tactics/guess', label: 'Guess the game' },
      ],
    },
    {
      title: 'Blog',
      links: [
        { path: '/blog', label: 'Chess blogs' },
      ],
    },
  ];



}

