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
      class="lg:hidden fixed top-0 right-0 z-50 w-full sm:w-[500px] md:w-[600px] h-full bg-main border-l border-border-base flex flex-col overflow-y-auto transition-transform duration-300"
    >
      <!-- Menu Header -->
      <div class="flex items-center justify-end shrink-0 h-16 px-4">
        <!-- Close Button -->
        <button
          (click)="close.emit()"
          aria-label="Close menu"
          class="p-1.5 cursor-pointer relative group text-muted transition-colors flex items-center justify-center rounded-lg hover:bg-subtle"
        >
          <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Search Section -->
      <div class="px-6 py-4 border-b border-border-base">
        <div class="flex items-center bg-surface/50 rounded-full px-4 py-2 border border-border-base focus-within:border-accent/50 focus-within:bg-main transition-all">
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
        </div>
        @if (searchResults().length > 0) {
          <div class="mt-2 py-1 max-h-60 overflow-y-auto bg-main border border-border-base rounded-2xl shadow-md">
            @for (user of searchResults(); track user.uid) {
              <button
                (click)="viewUserProfile(user)"
                class="w-full flex items-center px-4 py-2 text-sm/6 hover:bg-subtle text-left transition-colors cursor-pointer"
              >
                <span class="font-medium truncate">{{ user.username }}</span>
              </button>
            }
          </div>
        } @else if (searchQuery().length >= 2 && !isSearching()) {
          <div class="mt-2 px-4 py-2 text-xs italic">No players found</div>
        }
      </div>

      <!-- Navigation Grid -->
      <div class="flex-1 p-6 md:p-8 overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
          @for (group of linkGroups; track group.title) {
            <div class="flex flex-col gap-2">
              <span class="text-sm/6 font-medium pb-1.5 border-b border-border-base block">
                {{ group.title }}
              </span>
              <div class="flex flex-col gap-1 pl-1">
                @for (link of group.links; track link.label) {
                  <a
                    [routerLink]="link.path"
                    [queryParams]="link.queryParams"
                    routerLinkActive="text-accent font-semibold"
                    [routerLinkActiveOptions]="{ exact: !link.queryParams }"
                    (click)="close.emit()"
                    class="py-1 text-sm/6 font-medium text-muted hover:underline transition-all flex items-center justify-between"
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
          <!-- User Profile Label -->
          <div class="px-3 py-2 mb-3">
            <span class="text-sm/6 font-semibold block">
              {{ userService.currentUser()?.username || 'User' }}
            </span>
          </div>

          <!-- User Actions Grid (Matches Desktop Dropdown Items) -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
            <a
              routerLink="/profile"
              routerLinkActive="text-accent font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="close.emit()"
              class="py-1 text-xs font-medium text-muted hover:underline transition-all"
            >
              Profile
            </a>



            @if (userService.currentUser()?.is_admin || authService.currentUser()?.is_admin) {
              <a
                routerLink="/my-events"
                routerLinkActive="text-accent font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="close.emit()"
                class="py-1 text-xs font-medium text-muted hover:underline transition-all"
              >
                My Tournaments
              </a>


            }

            @if (userService.currentUser()?.is_admin || authService.currentUser()?.is_admin) {
              <a
                routerLink="/admin"
                routerLinkActive="text-accent font-semibold"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="close.emit()"
                class="py-1 text-xs font-medium text-muted hover:underline transition-all"
              >
                Admin Panel
              </a>
            }

            <button
              (click)="authService.logout(); close.emit()"
              class="col-span-2 mt-2 py-1.5 px-4 rounded-full border border-rose-200/60 hover:bg-rose-50/50 text-center text-xs font-medium text-rose-600 transition-all cursor-pointer"
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
      title: 'Blog',
      links: [
        { path: '/blog', label: 'Chess blogs' },
      ],
    },
  ];



}

