import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import {
  heroUsers,
  heroArrowPath,
  heroArrowLeft,
  heroPlay,
  heroPause,
  heroInformationCircle,
  heroCpuChip,
  heroArrowRight,
  heroTrash,
  heroUserPlus,
  heroCheckCircle,
  heroXCircle,
  heroMagnifyingGlass,
  heroFlag,
  heroChevronLeft,
  heroChevronRight,
  heroDocumentDuplicate,
} from '@ng-icons/heroicons/outline';

import { LobbyPlayer } from '../../core/models/bughouse.model';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { BughouseInviteService } from '../../core/services/bughouse-invite.service';
import { BughouseQueueService } from '../../core/services/bughouse-queue.service';
import { BughouseGameStateService } from './services/bughouse-game-state.service';
import { BughouseTvService } from './services/bughouse-tv.service';

import { BughouseLobbyComponent } from './components/bughouse-lobby/bughouse-lobby.component';
import { BughouseMatchedComponent } from './components/bughouse-matched/bughouse-matched.component';
import { BughouseBoardComponent } from './components/bughouse-board/bughouse-board.component';
import { BughouseSidebarComponent } from './components/bughouse-sidebar/bughouse-sidebar.component';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

/**
 * Controller Component for the Bughouse chess page.
 * 
 * WHY: Streamlined to handle viewport layout sizing, initial query parameter checks,
 *      and player search. Delegating gameplay, TV, queue, and invite states to dedicated
 *      services preserves cleanliness and scalability.
 */
@Component({
  selector: 'app-bughouse',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    BughouseLobbyComponent,
    BughouseMatchedComponent,
    BughouseBoardComponent,
    BughouseSidebarComponent,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
  ],
  providers: [
    provideIcons({
      heroUsers,
      heroArrowPath,
      heroArrowLeft,
      heroPlay,
      heroPause,
      heroInformationCircle,
      heroCpuChip,
      heroArrowRight,
      heroTrash,
      heroUserPlus,
      heroCheckCircle,
      heroXCircle,
      heroMagnifyingGlass,
      heroFlag,
      heroChevronLeft,
      heroChevronRight,
      heroDocumentDuplicate,
    }),
  ],
  host: {
    '[class.absolute]': "gameStateService.lobbyState() === 'playing'",
    '[class.inset-0]': "gameStateService.lobbyState() === 'playing'",
    '[class.overflow-hidden]': "gameStateService.lobbyState() === 'playing'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse.component.html',
  styleUrls: ['./bughouse.component.css'],
})
export class BughouseComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);

  // Injected Services
  bughouseInviteService = inject(BughouseInviteService);
  bughouseQueueService = inject(BughouseQueueService);
  gameStateService = inject(BughouseGameStateService);
  tvService = inject(BughouseTvService);

  // ── Local UI Search State ──────────────────────────────────────────
  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]);
  isSearchingPlayers = signal<boolean>(false);
  private searchSubject = new Subject<string>();

  // ── Layout Sizing Signals & Computeds ─────────────────────────────
  windowWidth = signal<number>(1200);
  windowHeight = signal<number>(800);
  private resizeListener: (() => void) | null = null;

  isSideBySide = computed(() => this.windowWidth() >= 1024);
  isHeaderBarVisible = computed(() => this.gameStateService.isSpectating() || !this.gameStateService.gameActive() || !!this.gameStateService.winner());

  maxBoardSize = computed(() => {
    const width = this.windowWidth();
    const height = this.windowHeight();
    
    const showNotation = this.gameStateService.lobbyState() === 'playing' && width >= 1280;
    const paddingAndGaps = showNotation ? 368 : 48;
    const availableWidth = width - paddingAndGaps;
    
    const maxWidth = this.isSideBySide() ? (availableWidth / 1.75) : (width - 32);
    
    const isPlayingPage = this.gameStateService.lobbyState() === 'playing';
    const headerOffset = isPlayingPage ? 272 : 360;
    const maxHeight = this.isSideBySide() ? (height - headerOffset) : 9999;
    
    const maxPossible = Math.min(maxWidth, maxHeight);
    return Math.max(280, Math.min(700, maxPossible));
  });

  // Current User Profile
  currentUserProfile = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.username || user?.displayName || user?.name || 'You',
    };
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.windowWidth.set(window.innerWidth);
      this.windowHeight.set(window.innerHeight);
      this.resizeListener = () => {
        this.windowWidth.set(window.innerWidth);
        this.windowHeight.set(window.innerHeight);
      };
      window.addEventListener('resize', this.resizeListener);
    }

    // Setup Search subscription
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) return of(null);
          this.isSearchingPlayers.set(true);
          return this.userService.searchUsers(query);
        }),
      )
      .subscribe({
        next: (results) => {
          this.isSearchingPlayers.set(false);
          if (results !== null) {
            const myUid = this.authService.currentUser()?.uid;
            const myUsername = this.currentUserProfile().name;
            this.searchResults.set(
              results
                .filter((r: any) => r.uid !== myUid && r.username !== myUsername)
                .map((r: any) => ({
                  uid: r.uid,
                  name: r.username,
                  isOnline: true,
                  stats: r.bughouse_stats,
                })),
            );
          }
        },
        error: () => {
          this.isSearchingPlayers.set(false);
          this.searchResults.set([]);
        },
      });
  }

  ngOnInit() {
    this.gameStateService.resetGame();

    // Read query parameters for incoming invite details
    this.route.queryParams.subscribe(params => {
      const inviteId = params['inviteId'];
      const sender = params['sender'];
      const senderId = params['senderId'];

      if (inviteId && sender && senderId) {
        this.ngZone.run(() => {
          const exists = this.bughouseInviteService.incomingInvites().some(i => i.id === senderId);
          if (!exists) {
            this.bughouseInviteService.incomingInvites.update(list => [...list, { id: senderId, sender }]);
            this.gameStateService.showNotification(`Incoming lobby invitation from ${sender}!`, 'info');
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.gameStateService.stopClocks();
    this.gameStateService.stopCountdownInterval();
    if (this.resizeListener && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  // ── Local Search Actions ───────────────────────────────────────────
  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
    if (value.length === 0) {
      this.searchResults.set([]);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  invitePlayer(player: LobbyPlayer) {
    this.clearSearch();
    this.gameStateService.invitePlayer(player);
  }
}
