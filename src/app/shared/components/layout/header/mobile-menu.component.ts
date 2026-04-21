import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { ChatService } from '../../../../core/services/chat.service';
import { ThemeService } from '../../../../core/services/theme.service';
import {
  BoardThemeService,
  BOARD_THEMES,
  PIECE_SETS,
} from '../../../../core/services/board-theme.service';
import { AudioService, SOUND_THEMES } from '../../../../core/services/audio.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroSun, heroMoon, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIcon],
  providers: [provideIcons({ heroXMark, heroSun, heroMoon, heroMagnifyingGlass })],
  template: `
    <div class="md:hidden fixed inset-0 z-40 bg-black/50" (click)="close.emit()"></div>
    <div
      class="md:hidden fixed top-0 right-0 z-50 w-72 h-full bg-white dark:bg-black  flex flex-col overflow-y-auto"
    >
      <!-- Mobile Menu Header -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800"
      >
        <span class="font-bold text-lg">Menu</span>
        <button
          (click)="close.emit()"
          class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
        >
          <ng-icon name="heroXMark" class="w-5 h-5"></ng-icon>
        </button>
      </div>

      <!-- Mobile Search -->
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div
          class="flex items-center bg-slate-100 dark:bg-white/10 rounded-xl px-3 py-2 border border-transparent focus-within:border-cyan-500/50 transition-colors"
        >
          <ng-icon name="heroMagnifyingGlass" class="w-4 h-4 text-slate-500 mr-2"></ng-icon>
          <input
            type="text"
            placeholder="Search accounts..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="bg-transparent outline-none flex-1 text-sm text-slate-900 dark:text-white"
          />
          @if (isSearching()) {
            <div
              class="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"
            ></div>
          }
        </div>

        @if (searchResults().length > 0) {
          <div class="mt-2 space-y-1 max-h-60 overflow-y-auto">
            @for (user of searchResults(); track user.uid) {
              <button
                (click)="viewUserProfile(user)"
                class="w-full flex flex-col px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-colors"
              >
                <span class="text-xs font-semibold text-slate-900 dark:text-white capitalize">{{
                  user.displayName
                }}</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400">{{
                  '@' + user.username
                }}</span>
              </button>
            }
          </div>
        } @else if (searchQuery().length >= 2 && !isSearching()) {
          <div class="mt-2 px-3 py-2 text-[10px] text-slate-500 italic">No players found</div>
        }
      </div>

      <!-- Mobile Navigation Links -->
      <nav class="flex flex-col py-2">
        @for (link of navLinks; track link.path) {
          <a
            [routerLink]="link.path"
            (click)="close.emit()"
            class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 font-semibold"
          >
            {{ link.label }}
          </a>
        }
      </nav>

      <!-- Mobile Auth Section -->
      <div class="border-t border-slate-200 dark:border-slate-800 py-2">
        @if (authService.isAuthenticated()) {
          <a
            routerLink="/profile"
            (click)="close.emit()"
            class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <span class="font-semibold">Profile</span>
          </a>

          <!-- Shared Links -->
          @for (link of authLinks; track link.path) {
            <a
              [routerLink]="link.path"
              (click)="close.emit()"
              class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 font-semibold"
            >
              {{ link.label }}
              @if (link.label === 'Messages' && chatService.totalUnreadCount() > 0) {
                <span
                  class="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold"
                >
                  {{ chatService.totalUnreadCount() > 99 ? '99+' : chatService.totalUnreadCount() }}
                </span>
              }
            </a>
          }

          <!-- Chess Settings -->
          <div
            class="px-4 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4"
          >
            <span
              class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >Chess Settings</span
            >

            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase"
                >Board Theme</label
              >
              <select
                [ngModel]="boardThemeService.boardTheme()"
                (ngModelChange)="boardThemeService.boardTheme.set($event)"
                class="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
              >
                @for (theme of boardThemes; track theme.value) {
                  <option [value]="theme.value">{{ theme.label }}</option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase"
                >Piece Style</label
              >
              <select
                [ngModel]="boardThemeService.pieceSet()"
                (ngModelChange)="boardThemeService.pieceSet.set($event)"
                class="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
              >
                @for (set of pieceSets; track set.value) {
                  <option [value]="set.value">{{ set.label }}</option>
                }
              </select>
            </div>
          </div>

          <button
            (click)="themeService.toggleTheme(); close.emit()"
            class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-900 dark:text-white font-semibold"
          >
            <ng-icon
              [name]="themeService.isDarkMode() ? 'heroSun' : 'heroMoon'"
              class="w-5 h-5"
            ></ng-icon>
            <span>{{ themeService.isDarkMode() ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>

          <button
            (click)="authService.logout(); close.emit()"
            class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 font-semibold"
          >
            Logout
          </button>
        } @else {
          <button
            (click)="themeService.toggleTheme(); close.emit()"
            class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-900 dark:text-white font-semibold"
          >
            <span>{{ themeService.isDarkMode() ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
          <a
            routerLink="/login"
            (click)="close.emit()"
            class="flex items-center justify-center gap-2 mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/15 hover:border-cyan-500/60 hover:text-cyan-600 dark:hover:text-cyan-400"
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
  chatService = inject(ChatService);
  themeService = inject(ThemeService);
  boardThemeService = inject(BoardThemeService);
  audioService = inject(AudioService);
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

  boardThemes = BOARD_THEMES;
  pieceSets = PIECE_SETS;
  soundThemes = SOUND_THEMES;

  navLinks = [
    { path: '/play', label: 'Play' },
    { path: '/study', label: 'Study' },
    { path: '/roadmap', label: 'Roadmap' },
    { path: '/tactics', label: 'Tactics' },
    { path: '/tactics/leaderboard', label: 'Rankings' },
    { path: '/explorer', label: 'Opening Explorer' },
    { path: '/events', label: 'Tournaments' },
    { path: '/arena', label: 'Arena' },
    { path: '/broadcasts', label: 'Broadcasts' },
    { path: '/coaches', label: 'Coaches' },
    { path: '/academy', label: 'Academy' },
  ];

  authLinks = [
    { path: '/my-progress', label: 'My Progress' },
    { path: '/games/history', label: 'Game History' },
    { path: '/chat', label: 'Messages' },
    { path: '/my-events', label: 'My Tournaments' },
    { path: '/bookmarks', label: 'Following' },
  ];
}

