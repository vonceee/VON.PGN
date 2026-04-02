import { Component, inject, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { UserService, UserSearchResult } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { AudioService, SOUND_THEMES } from '../../../core/services/audio.service';
import { BoardThemeService, BOARD_THEMES, PIECE_SETS } from '../../../core/services/board-theme.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-header',
  imports: [RouterLink, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    class: 'relative',
  },
})
export class Header {
  themeService = inject(ThemeService);
  userService = inject(UserService);
  authService = inject(AuthService);
  chatService = inject(ChatService);
  audioService = inject(AudioService);
  boardThemeService = inject(BoardThemeService);
  private router = inject(Router);

  soundThemes = SOUND_THEMES;
  boardThemes = BOARD_THEMES;
  pieceSets = PIECE_SETS;

  @ViewChild('profileContainer') profileContainer!: ElementRef;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  isProfileDropdownOpen = signal(false);
  isMobileMenuOpen = signal(false);
  isProduction = environment.production;
  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  isSearchOpen = signal(false);
  isSearching = signal(false);

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
            return of([]);
          }
          this.isSearching.set(true);
          return this.userService.searchUsers(query);
        }),
      )
      .subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.isSearching.set(false);
          this.isSearchOpen.set(results.length > 0);
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
  }

  viewUserProfile(user: UserSearchResult) {
    this.isSearchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.router.navigate(['/user', user.uid]);
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((v) => !v);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((v) => !v);
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
  }
}
