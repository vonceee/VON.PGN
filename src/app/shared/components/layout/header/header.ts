import { Component, inject, signal, computed, HostListener, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme.service';
import { UserService, UserSearchResult } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameService } from '../../../../core/services/game.service';

import { NotificationService } from '../../../../core/services/notification.service';
import { BughouseInviteService } from '../../../../core/services/bughouse-invite.service';
import { environment } from 'environments/environment';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MobileMenuComponent } from './mobile-menu.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChevronDown,
  heroBookOpen,
  heroChartBar,
  heroFlag,
  heroMap,
  heroArrowPath,
  heroPuzzlePiece,
  heroUser,
  heroTrophy,
  heroQuestionMarkCircle,
  heroAcademicCap,
  heroUsers,
  heroCalendar,
  heroDocumentText,
  heroMagnifyingGlass,
  heroBell,
  heroUserCircle,
  heroBriefcase,
  heroCog6Tooth,
  heroArrowLeftOnRectangle,
  heroBars3,
  heroQueueList,
  heroAtSymbol,
  heroBugAnt,
  heroCheck,
  heroXMark,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MobileMenuComponent,
    NgIcon,
  ],
  providers: [
    provideIcons({
      heroChevronDown,
      heroBookOpen,
      heroChartBar,
      heroFlag,
      heroMap,
      heroArrowPath,
      heroPuzzlePiece,
      heroUser,
      heroTrophy,
      heroQuestionMarkCircle,
      heroAcademicCap,
      heroUsers,
      heroCalendar,
      heroDocumentText,
      heroMagnifyingGlass,
      heroBell,
      heroUserCircle,
      heroBriefcase,
      heroCog6Tooth,
      heroArrowLeftOnRectangle,
      heroBars3,
      heroQueueList,
      heroAtSymbol,
      heroBugAnt,
      heroCheck,
      heroXMark,
    }),
  ],
  templateUrl: './header.html',
  host: {
    class: 'block relative',
  },
})
export class Header implements OnInit, OnDestroy {
  themeService = inject(ThemeService);
  userService = inject(UserService);
  authService = inject(AuthService);
  gameService = inject(GameService);

  notificationService = inject(NotificationService);
  bughouseInviteService = inject(BughouseInviteService);
  private router = inject(Router);


  @ViewChild('profileContainer') profileContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('searchContainer') searchContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('invitesContainer') invitesContainer!: ElementRef<HTMLDivElement>;

  isProfileDropdownOpen = signal(false);
  isMobileMenuOpen = signal(false);
  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  isSearchOpen = signal(false);
  isSearching = signal(false);
  isNotificationsOpen = signal(false);
  isInvitesOpen = this.bughouseInviteService.isInvitesOpen;
  totalBughouseInvites = computed(() => this.bughouseInviteService.incomingInvites().length);

  toggleNotifications() {
    this.isInvitesOpen.set(false);
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) {
      this.notificationService.getNotifications().subscribe();
    }
  }

  toggleInvites() {
    this.isNotificationsOpen.set(false);
    this.isInvitesOpen.update(v => !v);
  }
  pingSignal = signal(0);
  pingStrength = signal<'strong' | 'medium' | 'weak'>('strong');
  lastPingTime = 0;

  private searchSubject = new Subject<string>();

  constructor() {

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

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.notificationService.getUnreadCount().subscribe();
    }
  }

  ngOnDestroy() { }

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
    this.router.navigate(['/user', user.username]);
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

  navigateToNotification(n: any) {
    this.notificationService.markAsRead(n.id).subscribe();
    this.isNotificationsOpen.set(false);
    if (n.data?.action_url) {
      this.router.navigateByUrl(n.data.action_url);
    }
  }



  logout() {
    this.authService.logout();
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
    if (
      this.isInvitesOpen() &&
      this.invitesContainer &&
      !this.invitesContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isInvitesOpen.set(false);
    }
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

  formatTime(timeControl: string): string {
    if (!timeControl) return '';
    const [base, inc] = timeControl.split('+');
    const mins = Math.floor(parseInt(base) / 60);
    return `${mins}+${inc}`;
  }
}

