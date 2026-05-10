import { Component, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { ChatService } from '../../../../core/services/chat.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIcon],
  providers: [provideIcons({ heroXMark, heroMagnifyingGlass })],
  template: `
    <div class="md:hidden fixed inset-0 z-40 bg-black/50" (click)="close.emit()"></div>
    <div
      class="md:hidden fixed top-0 right-0 z-50 w-72 h-full bg-white   flex flex-col overflow-y-auto"
    >
      <!-- Mobile Menu Header -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-border-base "
      >
        <span class="font-semibold text-lg">Menu</span>
        <button
          (click)="close.emit()"
          class="p-2 rounded-lg hover:bg-slate-200 "
        >
          <ng-icon name="heroXMark" class="w-5 h-5"></ng-icon>
        </button>
      </div>

      <!-- Mobile Search -->
      <div class="px-4 py-3 border-b border-border-base ">
        <div
          class="flex items-center bg-slate-100 /10 rounded-xl px-3 py-2 border border-transparent focus-within:border-cyan-500/50 "
        >
          <ng-icon name="heroMagnifyingGlass" class="w-4 h-4  mr-2"></ng-icon>
          <input
            type="text"
            placeholder="Search accounts..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="bg-transparent outline-none flex-1 text-sm text-slate-900 "
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
                class="w-full flex flex-col px-3 py-2 rounded-lg hover:bg-slate-50  text-left "
              >
                <span class="text-xs font-semibold text-slate-900  capitalize">{{
                  user.displayName
                }}</span>
                <span class="text-xs  ">{{
                  '@' + user.username
                }}</span>
              </button>
            }
          </div>
        } @else if (searchQuery().length >= 2 && !isSearching()) {
          <div class="mt-2 px-3 py-2 text-xs  italic">No players found</div>
        }
      </div>

      <!-- Mobile Navigation Sections -->
      <div class="flex flex-col py-2">
        @for (group of linkGroups; track group.title) {
          <div class="px-4 py-2 mt-2">
            <span class="text-xs font-semibold   uppercase ">{{ group.title }}</span>
          </div>
          @for (link of group.links; track link.path) {
            <a
              [routerLink]="link.path"
              (click)="close.emit()"
              class="px-4 py-3 hover:bg-slate-50  font-semibold  flex items-center justify-between group"
            >
              <span class="text-slate-900 ">{{ link.label }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-slate-300  group-hover:text-cyan-500 ">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </a>
          }
        }
      </div>

      <!-- Mobile Auth Section -->
      <div class="border-t border-border-base  py-2">

        @if (authService.isAuthenticated()) {
          <a
            routerLink="/profile"
            (click)="close.emit()"
            class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 "
          >
            <span class="font-semibold">Profile</span>
          </a>

          <!-- Shared Links -->
          @for (link of authLinks; track link.path) {
            <a
              [routerLink]="link.path"
              (click)="close.emit()"
              class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50  font-semibold"
            >
              {{ link.label }}
              @if (link.label === 'Messages' && chatService.totalUnreadCount() > 0) {
                <span
                  class="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-accent text-white text-xs font-semibold"
                >
                  {{ chatService.totalUnreadCount() > 99 ? '99+' : chatService.totalUnreadCount() }}
                </span>
              }
            </a>
          }


          <button
            (click)="authService.logout(); close.emit()"
            class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-red-50  text-red-600  font-semibold"
          >
            Logout
          </button>
        } @else {
          <a
            routerLink="/login"
            (click)="close.emit()"
            class="flex items-center justify-center gap-2 mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700  border border-border-base  hover:border-cyan-500/60 hover:text-cyan-600 "
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
      title: 'Play',
      links: [
        { path: '/play', label: 'Play' },
        { path: '/tactics', label: 'Tactics' },
        { path: '/tactics/leaderboard', label: 'Rankings' },
        { path: '/tv', label: 'Watch' },
        { path: '/explorer', label: 'Opening Explorer' },
      ],
    },
    {
      title: 'Learn',
      links: [
        { path: '/study', label: 'Study' },
        { path: '/roadmap', label: 'Roadmap' },
        { path: '/academy', label: 'Academy' },
        { path: '/coaches', label: 'Coaches' },
      ],
    },
    {
      title: 'Compete',
      links: [
        { path: '/events', label: 'Tournaments' },
        { path: '/arena', label: 'Arena' },
        { path: '/broadcasts', label: 'Broadcasts' },
      ],
    },
  ];

  authLinks = [
    { path: '/my-progress', label: 'My Progress' },
    { path: '/games/history', label: 'Game History' },
    { path: '/chat', label: 'Messages' },
    { path: '/my-events', label: 'My Tournaments' },
    { path: '/bookmarks', label: 'Following' },
  ];
}

