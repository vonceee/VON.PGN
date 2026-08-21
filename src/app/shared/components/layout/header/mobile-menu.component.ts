import { Component, inject, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, NgIcon],
  providers: [provideIcons({ heroXMark, heroMagnifyingGlass })],
  template: `
    <div class="lg:hidden fixed inset-0 z-40 bg-black/40" (click)="close.emit()"></div>
    <div
      class="lg:hidden fixed top-0 right-0 z-50 w-full sm:w-[500px] md:w-[600px] h-full bg-white border-l border-border-base flex flex-col overflow-y-auto transition-transform duration-300"
    >
      <!-- Menu Header -->
      <div class="flex items-center gap-4 shrink-0 h-16 px-4 border-b border-border-base relative">
        <!-- Inline Search Bar -->
        <div class="flex-1 flex items-center bg-surface/50 rounded-full px-4 py-1.5 border border-border-base focus-within:border-accent/50 focus-within:bg-white transition-all relative">
          <ng-icon name="heroMagnifyingGlass" class="w-4 h-4 mr-2 shrink-0"></ng-icon>
          <input
            type="text"
            placeholder="Search players..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="bg-transparent outline-none flex-1 text-sm/6 placeholder-muted"
          />
          @if (isSearching()) {
            <div class="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0 ml-2"></div>
          }

          <!-- Search Results Dropdown -->
          @if (searchResults().length > 0) {
            <div class="absolute left-0 right-0 top-full mt-2 py-1 max-h-60 overflow-y-auto bg-white border border-border-base rounded-2xl shadow-md z-50">
              @for (user of searchResults(); track user.uid) {
                <button
                  (click)="viewUserProfile(user)"
                  class="w-full flex items-center px-4 py-2 text-sm/6 hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span class="font-medium truncate">{{ user.username }}</span>
                </button>
              }
            </div>
          } @else if (searchQuery().length >= 2 && !isSearching()) {
            <div class="absolute left-0 right-0 top-full mt-2 px-4 py-2 bg-white border border-border-base rounded-2xl shadow-md text-xs italic z-50">
              No players found
            </div>
          }
        </div>

        <!-- Close Button -->
        <button
          (click)="close.emit()"
          aria-label="Close menu"
          class="p-1.5 cursor-pointer relative group text-gray-500 transition-colors flex items-center justify-center rounded-lg hover:bg-slate-50 shrink-0"
        >
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Grid -->
      <div class="flex-1 p-6 md:p-8 overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
          @for (group of linkGroups; track group.title) {
            <div class="flex flex-col">
              <span class="text-xs font-bold text-gray-500 uppercase block mb-1">
                {{ group.title }}
              </span>
              <div class="flex flex-col gap-0.5">
                @for (link of group.links; track link.label) {
                  <a
                    [routerLink]="link.path"
                    [queryParams]="link.queryParams"
                    routerLinkActive="bg-slate-50 text-accent font-semibold"
                    [routerLinkActiveOptions]="{ exact: !link.queryParams }"
                    (click)="close.emit()"
                    class="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-content hover:bg-slate-50 transition-all duration-200"
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
      <div class="border-t border-border-base p-6 bg-surface/30 shrink-0 md:hidden">
        @if (authService.isAuthenticated()) {
          <!-- User Profile Card -->
          <div class="flex items-center gap-3 px-3.5 py-2.5 mb-4 bg-white rounded-xl border border-border-base">
            <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span class="text-sm font-semibold text-content truncate leading-tight">
              {{ userService.currentUser()?.username || 'User' }}
            </span>
          </div>

          <!-- User Actions List -->
          <div class="flex flex-col gap-1">
            <a
              routerLink="/profile"
              routerLinkActive="bg-slate-50 text-accent font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="close.emit()"
              class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-content hover:bg-slate-50 transition-all duration-200"
            >
              Profile
            </a>

            @if (userService.currentUser()?.is_admin || authService.currentUser()?.is_admin) {
              <a
                routerLink="/my-events"
                routerLinkActive="bg-slate-50 text-accent font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="close.emit()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-content hover:bg-slate-50 transition-all duration-200"
              >
                My Tournaments
              </a>
            }

            @if (userService.currentUser()?.is_admin || authService.currentUser()?.is_admin) {
              <a
                routerLink="/admin"
                routerLinkActive="bg-slate-50 text-accent font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="close.emit()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-content hover:bg-slate-50 transition-all duration-200"
              >
                Admin Panel
              </a>
            }

            <button
              (click)="authService.logout(); close.emit()"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 transition-all duration-200 cursor-pointer text-left"
            >
              Logout
            </button>
          </div>
        } @else {
          <!-- Google-style Primary Button for Login -->
          <a
            routerLink="/login"
            (click)="close.emit()"
            class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm/6 font-semibold text-white bg-accent hover:bg-accent/90 transition-colors text-center cursor-pointer"
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

