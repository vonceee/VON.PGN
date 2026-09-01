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
import { BughousePlayComponent } from './components/bughouse-play/bughouse-play.component';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

/**
 * Controller Component for the Bughouse chess page.
 * 
 * WHY: Streamlined to handle top-level view routing (lobby, match-found, playing),
 *      initial query parameter checks, and player search. Delegating gameplay, TV,
 *      queue, and invite states to dedicated services and subcomponents preserves
 *      cleanliness and eliminates template spaghetti.
 */
@Component({
  selector: 'app-bughouse',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    BughouseLobbyComponent,
    BughousePlayComponent,
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
    class: 'absolute inset-0 overflow-hidden flex flex-col',
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

  // Current User Profile
  currentUserProfile = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.username || user?.displayName || user?.name || 'You',
    };
  });

  constructor() {
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

