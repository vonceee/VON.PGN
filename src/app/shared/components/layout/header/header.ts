import { Component, inject, signal, HostListener, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme.service';
import { UserService, UserSearchResult } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameService } from '../../../../core/services/game.service';
import { ChatService } from '../../../../core/services/chat.service';
import { AudioService, SOUND_THEMES } from '../../../../core/services/audio.service';
import { BoardThemeService, BOARD_THEMES, PIECE_SETS } from '../../../../core/services/board-theme.service';
import { environment } from 'environments/environment';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChevronDown,
  heroMagnifyingGlass,
  heroSun,
  heroMoon,
  heroXMark,
  heroBars3,
} from '@ng-icons/heroicons/outline';
import { MobileMenuComponent } from './mobile-menu.component';
import { ButtonComponent, LinkComponent, SectionHeadingComponent } from '@shared/ui';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, FormsModule, NgIcon, MobileMenuComponent, LinkComponent],
  providers: [
    provideIcons({
      heroChevronDown,
      heroMagnifyingGlass,
      heroSun,
      heroMoon,
      heroXMark,
      heroBars3,
    }),
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    class: 'relative',
  },
})
export class Header implements OnInit, OnDestroy {
  themeService = inject(ThemeService);
  userService = inject(UserService);
  authService = inject(AuthService);
  gameService = inject(GameService);
  chatService = inject(ChatService);
  audioService = inject(AudioService);
  boardThemeService = inject(BoardThemeService);
  private router = inject(Router);

  soundThemes = SOUND_THEMES;
  boardThemes = BOARD_THEMES;
  pieceSets = PIECE_SETS;

  @ViewChild('profileContainer') profileContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('searchContainer') searchContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isProfileDropdownOpen = signal(false);
  isMobileMenuOpen = signal(false);
  isTournamentDropdownOpen = signal(false);
  isRoadmapDropdownOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  isSearchOpen = signal(false);
  isSearching = signal(false);
  pingSignal = signal(0);
  pingStrength = signal<'strong' | 'medium' | 'weak'>('strong');
  lastPingTime = 0;

  private searchSubject = new Subject<string>();

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.chatService.loadUnreadCount();
    }

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) {
            return of(null);
          }
          this.isSearching.set(true);
          return this.userService.searchUsers(query);
        }),
      )
      .subscribe({
        next: (results) => {
          this.isSearching.set(false);
          if (results !== null) {
            this.searchResults.set(results);
            this.isSearchOpen.set(results.length > 0);
          }
        },
        error: () => {
          this.isSearching.set(false);
          this.searchResults.set([]);
        },
      });
  }

  ngOnInit() {}

  ngOnDestroy() {}

  private measurePing() {
    const now = Date.now();
    if (now - this.lastPingTime < 30000) {
      return;
    }
    this.lastPingTime = now;
    
    const start = performance.now();
    fetch(`${environment.apiUrl}/ping`, {
      method: 'HEAD',
      cache: 'no-cache',
    })
      .then(() => {
        const latency = Math.round(performance.now() - start);
        this.pingSignal.set(latency);
        if (latency < 150) {
          this.pingStrength.set('strong');
        } else if (latency < 300) {
          this.pingStrength.set('medium');
        } else {
          this.pingStrength.set('weak');
        }
      })
      .catch(() => {
        this.pingSignal.set(-1);
        this.pingStrength.set('weak');
      });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
    if (value.length === 0) {
      this.searchResults.set([]);
      this.isSearchOpen.set(false);
    }
  }

  viewUserProfile(user: UserSearchResult) {
    this.isSearchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.router.navigate(['/user', user.uid]);
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((v) => !v);
    if (this.isProfileDropdownOpen()) {
      this.measurePing();
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((v) => !v);
  }

  toggleTournamentDropdown() {
    this.isTournamentDropdownOpen.update((v) => !v);
    this.isRoadmapDropdownOpen.set(false);
  }

  toggleRoadmapDropdown() {
    this.isRoadmapDropdownOpen.update((v) => !v);
    this.isTournamentDropdownOpen.set(false);
  }

  closeNavDropdowns() {
    this.isTournamentDropdownOpen.set(false);
    this.isRoadmapDropdownOpen.set(false);
  }

  logout() {
    this.authService.logout();
  }

  onSoundThemeChange(value: string) {
    if (value === 'off') {
      this.audioService.soundEnabled.set(false);
    } else {
      this.audioService.soundEnabled.set(true);
      this.audioService.setTheme(value as any);
      this.audioService.playMove();
    }
  }

  onBoardThemeChange(value: string) {
    this.boardThemeService.boardTheme.set(value as any);
  }

  onPieceSetChange(value: string) {
    this.boardThemeService.pieceSet.set(value as any);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isProfileDropdownOpen() &&
      this.profileContainer &&
      !this.profileContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isProfileDropdownOpen.set(false);
    }
    if (
      this.isSearchOpen() &&
      this.searchContainer &&
      !this.searchContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isSearchOpen.set(false);
    }
    this.closeNavDropdowns();
  }

  getConnectionStatus(): string {
    return this.gameService.isConnected() ? 'Connected' : 'Offline';
  }

  getConnectionColor(): string {
    return this.gameService.isConnected() ? '#22c55e' : '#ef4444';
  }

  getPingColor(): string {
    const strength = this.pingStrength();
    if (strength === 'strong') return '#22c55e';
    if (strength === 'medium') return '#eab308';
    return '#ef4444';
  }

  getPingBarHeight(index: number): string {
    const strength = this.pingStrength();
    const heights = {
      strong: ['40%', '60%', '80%', '100%'],
      medium: ['40%', '60%', '80%', '0%'],
      weak: ['40%', '60%', '0%', '0%'],
    };
    return heights[strength][index];
  }
}

