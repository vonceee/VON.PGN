import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  untracked,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Chess, Move } from 'chess.js';
import { AudioService } from '../../core/services/audio.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { BughouseInviteService, SentInvite } from '../../core/services/bughouse-invite.service';
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
} from '@ng-icons/heroicons/outline';

interface MoveLogEntry {
  board: 'A' | 'B';
  moveNo: number;
  turn: 'w' | 'b';
  san: string;
  timestamp: Date;
}

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q';

interface LobbyPlayer {
  uid?: string;
  name: string;
  isOnline: boolean;
}

interface IncomingInvite {
  id: string;
  sender: string;
}

import { BughouseLobbyComponent, BughouseTvState } from './components/bughouse-lobby/bughouse-lobby.component';
import { BughouseMatchedComponent } from './components/bughouse-matched/bughouse-matched.component';
import { BughouseBoardComponent } from './components/bughouse-board/bughouse-board.component';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';
import { BughouseQueueService } from '../../core/services/bughouse-queue.service';

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
    }),
  ],
  host: {
    '[class.absolute]': "lobbyState() === 'playing'",
    '[class.inset-0]': "lobbyState() === 'playing'",
    '[class.overflow-hidden]': "lobbyState() === 'playing'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse.component.html',
  styleUrls: ['./bughouse.component.css'],
})
export class BughouseComponent implements OnInit, OnDestroy {
  private audioService = inject(AudioService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private gameService = inject(GameService);
  bughouseInviteService = inject(BughouseInviteService);
  public bughouseQueueService = inject(BughouseQueueService);
  private router = inject(Router);

  // ── Lobby & Pairing State ──────────────────────────────────────────
  lobbyState = signal<'lobby' | 'queuing' | 'matched' | 'playing'>('lobby');

  // ── Active game identity (set by bughouse_game_start) ─────────────
  gameId = signal<string | null>(null);
  myBoard = signal<'A' | 'B' | null>(null);
  myColor = signal<'w' | 'b' | null>(null);

  // Board player name labels (set from bughouse_game_start, used in the UI)
  boardAWhiteName = signal<string>('');
  boardABlackName = signal<string>('');
  boardBWhiteName = signal<string>('');
  boardBBlackName = signal<string>('');
  lobbyType = signal<'casual' | 'ranked'>('casual');
  partner = signal<LobbyPlayer | null>(null);
  isHost = signal<boolean>(true);
  opponent1 = signal<LobbyPlayer | null>(null);
  opponent2 = signal<LobbyPlayer | null>(null);

  // Searching & Invitations
  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]);
  isSearchingPlayers = signal<boolean>(false);
  private searchSubject = new Subject<string>();

  // New Invite Outbox/Inbox States
  incomingInvites = this.bughouseInviteService.incomingInvites;
  inviteNotification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  isSpectating = signal<boolean>(false);
  ongoingMatches = signal<any[]>([]);

  // ── TV Stream State ──────────────────────────────────────────────────
  tvGameId = signal<string | null>(null);
  tvBoardAFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  tvBoardBFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  tvPocketA_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvPocketA_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvPocketB_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvPocketB_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  tvTimeA_W = signal<number>(300);
  tvTimeA_B = signal<number>(300);
  tvTimeB_W = signal<number>(300);
  tvTimeB_B = signal<number>(300);
  tvTurnA = computed(() => this.tvBoardAFen().split(' ')[1] as 'w' | 'b');
  tvTurnB = computed(() => this.tvBoardBFen().split(' ')[1] as 'w' | 'b');
  tvGameActive = signal<boolean>(false);
  tvWinner = signal<string | null>(null);
  tvBoardAWhiteName = signal<string>('');
  tvBoardABlackName = signal<string>('');
  tvBoardBWhiteName = signal<string>('');
  tvBoardBBlackName = signal<string>('');

  tvState = computed<BughouseTvState | null>(() => {
    const gameId = this.tvGameId();
    if (!gameId) return null;
    return {
      gameId,
      isActive: this.tvGameActive(),
      winner: this.tvWinner(),
      boardA: {
        fen: this.tvBoardAFen(),
        pocketW: this.tvPocketA_W(),
        pocketB: this.tvPocketA_B(),
        timeW: this.tvTimeA_W(),
        timeB: this.tvTimeA_B(),
        turn: this.tvTurnA(),
        whiteName: this.tvBoardAWhiteName(),
        blackName: this.tvBoardABlackName(),
      },
      boardB: {
        fen: this.tvBoardBFen(),
        pocketW: this.tvPocketB_W(),
        pocketB: this.tvPocketB_B(),
        timeW: this.tvTimeB_W(),
        timeB: this.tvTimeB_B(),
        turn: this.tvTurnB(),
        whiteName: this.tvBoardBWhiteName(),
        blackName: this.tvBoardBBlackName(),
      },
    };
  });

  // Queue State (bound to global BughouseQueueService)
  queueTime = computed(() => this.bughouseQueueService.queueTime());
  queueStatus = computed(() => this.bughouseQueueService.queueStatus());

  // Match Countdown
  matchCountdown = signal<number>(5);
  private countdownInterval: any = null;

  // Current User (Active player)
  currentUserProfile = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.username || user?.displayName || user?.name || 'You',
    };
  });

  // ── Chess Engine Instances ──────────────────────────────────────────
  chessA = new Chess();
  chessB = new Chess();

  // ── Board FEN Signals ───────────────────────────────────────────────
  boardAFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  boardBFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  // ── Board Orientations ──────────────────────────────────────────────
  boardAOrientation = signal<'white' | 'black'>('white');
  boardBOrientation = signal<'white' | 'black'>('black');

  // ── Pockets (Reserve Pieces) ────────────────────────────────────────
  pocketA_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  pocketA_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  pocketB_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  pocketB_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });

  // ── Active Turn Computeds ──────────────────────────────────────────
  turnA = computed(() => this.boardAFen().split(' ')[1] as 'w' | 'b');
  turnB = computed(() => this.boardBFen().split(' ')[1] as 'w' | 'b');

  // ── Timers (seconds) ──────────────────────────────────────────────
  timeA_W = signal<number>(300);
  timeA_B = signal<number>(300);
  timeB_W = signal<number>(300);
  timeB_B = signal<number>(300);

  // ── Game Metadata ──────────────────────────────────────────────────
  gameActive = signal<boolean>(false);
  winner = signal<string | null>(null); // 'Team A' (P1/P2) or 'Team B' (P3/P4) or 'Draw'
  gameEndReason = signal<string | null>(null);

  // ── Move Logging ───────────────────────────────────────────────────
  movesLog = signal<MoveLogEntry[]>([]);

  // ── User Color Configuration ────────────────────────────────────────
  userColor = signal<'w' | 'b'>('w');

  // ── Interactive Drop State ─────────────────────────────────────────
  activeDropBoard = signal<'A' | 'B' | null>(null);
  activeDropPiece = signal<PieceType | null>(null);
  activeDropColor = signal<'w' | 'b' | null>(null);

  // ── Active Tabs ────────────────────────────────────────────────────
  activeTab = signal<'game' | 'rules'>('game');
  isSidebarExpanded = signal<boolean>(true);

  // ── Layout Sizing Signals and Computeds ───────────────────────────
  windowWidth = signal<number>(1200);
  windowHeight = signal<number>(800);
  private resizeListener: (() => void) | null = null;

  isSideBySide = computed(() => this.windowWidth() >= 1024);
  isHeaderBarVisible = computed(() => this.isSpectating() || !this.gameActive() || !!this.winner());

  maxBoardSize = computed(() => {
    const width = this.windowWidth();
    const height = this.windowHeight();
    
    // Width constraint: must not exceed window width minus other columns (partner board + padding + gaps)
    const maxWidth = this.isSideBySide() ? (width - 400) : (width - 32);
    
    // Height constraint (only applies when side-by-side)
    const headerOffset = this.isHeaderBarVisible() ? 360 : 272;
    const maxHeight = this.isSideBySide() ? (height - headerOffset) : 9999;
    
    const maxPossible = Math.min(maxWidth, maxHeight);
    return Math.max(280, Math.min(700, maxPossible));
  });

  // ── Timers Handling ────────────────────────────────────────────────
  private timerInterval: any = null;

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
            this.searchResults.set(
              results.map((r: any) => ({
                uid: r.uid,
                name: r.username,
                isOnline: true,
              })),
            );
          }
        },
        error: () => {
          this.isSearchingPlayers.set(false);
          this.searchResults.set([]);
        },
      });

    // React to Socket changes reactively
    effect((onCleanup) => {
      const s = this.gameService.socket();
      if (s) {
        untracked(() => {
          const setup = () => {
            this.setupSocketListeners();
          };

          if (s.connected) {
            setup();
          } else {
            s.on('connect', setup);
          }

          onCleanup(() => {
            s.off('connect', setup);
            this.removeSocketListeners();
          });
        });
      }
    });

    // Reactive Room switching for TV Stream
    effect((onCleanup) => {
      const socket = this.gameService.socket();
      const currentTvId = this.tvGameId();
      if (socket && socket.connected && currentTvId) {
        socket.emit('bughouse_spectate', { gameId: currentTvId });
        
        onCleanup(() => {
          // If we are actively playing in this game, do NOT leave the game room socket channel
          if (currentTvId && currentTvId === this.gameId() && !this.isSpectating()) {
            return;
          }
          socket.emit('bughouse_leave_spectate', { gameId: currentTvId });
        });
      }
    });

    // Automatically clear TV game if we are matched or playing our own game
    effect(() => {
      const state = this.lobbyState();
      if (state === 'matched' || state === 'playing') {
        untracked(() => {
          this.tvGameId.set(null);
          this.resetTvGameState();
        });
      }
    });
  }

  ngOnInit() {
    this.resetGame();

    // 1. Establish Socket.io connection and let the effect trigger listeners setup
    this.gameService.connectSocket();

    // 2. Read query parameters for incoming invite details (DB fallback)
    this.route.queryParams.subscribe(params => {
      const inviteId = params['inviteId'];
      const sender = params['sender'];
      const senderId = params['senderId'];

      if (inviteId && sender && senderId) {
        this.ngZone.run(() => {
          const exists = this.incomingInvites().some(i => i.id === senderId);
          if (!exists) {
            this.incomingInvites.update(list => [...list, { id: senderId, sender }]);
            this.audioService.playNotification();
            this.showNotification(`Incoming lobby invitation from ${sender}!`, 'info');
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.stopClocks();
    this.stopCountdownInterval();
    this.removeSocketListeners();
    if (this.resizeListener && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private handleActiveGames = (games: any[]) => {
    this.ngZone.run(() => {
      this.ongoingMatches.set(games);

      if (this.lobbyState() === 'matched' || this.lobbyState() === 'playing') {
        this.tvGameId.set(null);
        this.resetTvGameState();
        return;
      }

      const currentTvId = this.tvGameId();
      if (games.length > 0) {
        if (!currentTvId || !games.some((g) => g.gameId === currentTvId)) {
          this.tvGameId.set(games[0].gameId);
        }
      } else {
        this.tvGameId.set(null);
        this.resetTvGameState();
      }
    });
  };

  private handleLobbySync = (lobby: any) => {
    this.ngZone.run(() => {
      if (!lobby) {
        this.partner.set(null);
        this.isHost.set(true);
        this.lobbyState.set('lobby');
        return;
      }

      const myUser = this.authService.currentUser();
      const myUid = String(myUser?.uid);

      if (String(lobby.captain.userId) === myUid) {
        this.isHost.set(true);
        // I am the captain: show partner if joined
        if (lobby.partner) {
          this.partner.set({
            uid: String(lobby.partner.userId),
            name: lobby.partner.userName,
            isOnline: true,
          });
          this.bughouseInviteService.sentInvites.set([]);
        } else {
          this.partner.set(null);
        }
      } else if (lobby.partner && String(lobby.partner.userId) === myUid) {
        this.isHost.set(false);
        // I am the partner: show captain as partner
        this.partner.set({
          uid: String(lobby.captain.userId),
          name: lobby.captain.userName,
          isOnline: true,
        });
      }

      if (lobby.status === 'waiting') {
        this.lobbyState.set('lobby');
      } else if (lobby.status === 'queued') {
        this.lobbyState.set('queuing');
      } else if (lobby.status === 'matched') {
        this.lobbyState.set('matched');
      }
    });
  };

  private handleInviteRejected = (data: any) => {
    this.ngZone.run(() => {
      this.showNotification(`Invitation rejected by ${data.inviteeName}.`, 'error');
      this.bughouseInviteService.sentInvites.set([]);
    });
  };

  private handleKicked = () => {
    this.ngZone.run(() => {
      this.showNotification('You have been kicked from the lobby.', 'info');
      this.partner.set(null);
      this.isHost.set(true);
      this.lobbyState.set('lobby');
    });
  };

  private handleMatched = (data: any) => {
    this.ngZone.run(() => {
      this.opponent1.set({ name: data.opponent1.name, isOnline: true });
      this.opponent2.set({ name: data.opponent2.name, isOnline: true });
      this.lobbyState.set('matched');
      this.matchCountdown.set(5);
      this.audioService.playBoardStart();

      // Start 5s countdown
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.countdownInterval = setInterval(() => {
        this.ngZone.run(() => {
          const count = this.matchCountdown() - 1;
          this.matchCountdown.set(count);
          this.audioService.playNavigationSound();

          if (count <= 0) {
            this.stopCountdownInterval();
            this.lobbyState.set('playing');
            this.startGame();
          }
        });
      }, 1000);
    });
  };

  private handleGameStart = (data: any) => {
    this.ngZone.run(() => {
      // 1. Check if this is the TV game start payload
      if (data.gameId === this.tvGameId()) {
        this.tvBoardAFen.set(data.boardAFen);
        this.tvBoardBFen.set(data.boardBFen);
        this.tvPocketA_W.set({ ...data.pockets.A_W });
        this.tvPocketA_B.set({ ...data.pockets.A_B });
        this.tvPocketB_W.set({ ...data.pockets.B_W });
        this.tvPocketB_B.set({ ...data.pockets.B_B });
        this.tvTimeA_W.set(data.clocks.A_W);
        this.tvTimeA_B.set(data.clocks.A_B);
        this.tvTimeB_W.set(data.clocks.B_W);
        this.tvTimeB_B.set(data.clocks.B_B);
        this.tvGameActive.set(true);
        this.tvWinner.set(null);

        // Build board player name labels
        const colorsMap: Record<string, { board: string; color: string }> = data.colors ?? {};
        const allPlayers = [
          { id: String(data.teamA.captainId), name: data.teamA.captainName },
          { id: String(data.teamA.partnerId), name: data.teamA.partnerName },
          { id: String(data.teamB.captainId), name: data.teamB.captainName },
          { id: String(data.teamB.partnerId), name: data.teamB.partnerName },
        ];
        for (const player of allPlayers) {
          const a = colorsMap[player.id];
          if (!a) continue;
          if (a.board === 'A' && a.color === 'w') this.tvBoardAWhiteName.set(player.name);
          if (a.board === 'A' && a.color === 'b') this.tvBoardABlackName.set(player.name);
          if (a.board === 'B' && a.color === 'w') this.tvBoardBWhiteName.set(player.name);
          if (a.board === 'B' && a.color === 'b') this.tvBoardBBlackName.set(player.name);
        }
      }

      // 2. Check if this is the active game start payload
      const isSpectator = data.isSpectator ?? false;
      const myUid = String(this.authService.currentUser()?.uid);
      const amIParticipant = !!(data.colors && data.colors[myUid]);

      if ((!isSpectator && amIParticipant) || (isSpectator && !amIParticipant && data.gameId === this.gameId())) {
        // Clear TV game to save resources while playing
        this.tvGameId.set(null);
        this.resetTvGameState();

        this.isSpectating.set(isSpectator);

        if (isSpectator) {
          this.myBoard.set(null);
          this.myColor.set(null);
        } else {
          // Use server-supplied assignment directly — avoids UID format mismatch
          const myBoard: 'A' | 'B' = data.yourBoard ?? 'A';
          const myColor: 'w' | 'b' = data.yourColor ?? 'w';

          this.myBoard.set(myBoard);
          this.myColor.set(myColor);
          this.userColor.set(myColor);

          // Force transition to game view
          this.lobbyState.set('playing');
        }

        this.gameId.set(data.gameId);

        // Build board player name labels from full player list
        const colorsMap: Record<string, { board: string; color: string }> = data.colors ?? {};
        const allPlayers: { id: string; name: string }[] = [
          { id: String(data.teamA.captainId), name: data.teamA.captainName },
          { id: String(data.teamA.partnerId), name: data.teamA.partnerName },
          { id: String(data.teamB.captainId), name: data.teamB.captainName },
          { id: String(data.teamB.partnerId), name: data.teamB.partnerName },
        ];
        for (const player of allPlayers) {
          const a = colorsMap[player.id];
          if (!a) continue;
          if (a.board === 'A' && a.color === 'w') this.boardAWhiteName.set(player.name);
          if (a.board === 'A' && a.color === 'b') this.boardABlackName.set(player.name);
          if (a.board === 'B' && a.color === 'w') this.boardBWhiteName.set(player.name);
          if (a.board === 'B' && a.color === 'b') this.boardBBlackName.set(player.name);
        }

        this.syncBoardOrientations();

        this.chessA.load(data.boardAFen);
        this.chessB.load(data.boardBFen);
        this.boardAFen.set(data.boardAFen);
        this.boardBFen.set(data.boardBFen);

        // Restore pockets from server state
        this.pocketA_W.set({ ...data.pockets.A_W });
        this.pocketA_B.set({ ...data.pockets.A_B });
        this.pocketB_W.set({ ...data.pockets.B_W });
        this.pocketB_B.set({ ...data.pockets.B_B });

        // Set clocks from server
        this.timeA_W.set(data.clocks.A_W);
        this.timeA_B.set(data.clocks.A_B);
        this.timeB_W.set(data.clocks.B_W);
        this.timeB_B.set(data.clocks.B_B);

        // Server is the clock authority — do NOT start local clocks here
        this.gameActive.set(true);
      }
    });
  };

  private handleMoveBroadcast = (data: any) => {
    this.ngZone.run(() => {
      // Update TV game
      if (data.gameId === this.tvGameId()) {
        if (data.board === 'A') {
          this.tvBoardAFen.set(data.fen);
        } else {
          this.tvBoardBFen.set(data.fen);
        }
        this.tvPocketA_W.set({ ...data.pockets.A_W });
        this.tvPocketA_B.set({ ...data.pockets.A_B });
        this.tvPocketB_W.set({ ...data.pockets.B_W });
        this.tvPocketB_B.set({ ...data.pockets.B_B });
      }

      // Update active game
      if (data.gameId === this.gameId()) {
        const myUid = String(this.authService.currentUser()?.uid);
        const isMyMove = data.senderId === myUid;

        // Update the chess instance and board FEN signal
        if (data.board === 'A') {
          this.chessA.load(data.fen);
          this.boardAFen.set(data.fen);
        } else {
          this.chessB.load(data.fen);
          this.boardBFen.set(data.fen);
        }

        // Apply authoritative full pocket state from server
        this.pocketA_W.set({ ...data.pockets.A_W });
        this.pocketA_B.set({ ...data.pockets.A_B });
        this.pocketB_W.set({ ...data.pockets.B_W });
        this.pocketB_B.set({ ...data.pockets.B_B });

        // Play audio only for remote moves (local moves already triggered audio)
        if (!isMyMove) {
          this.audioService.playChessMove({ san: data.move.san, flags: data.move.flags ?? 'n' });
        }

        // Log the move for all clients (single source of truth)
        this.logMoveFromBroadcast(data.board, data.move.san, data.move.color);
      }
    });
  };

  private handleClockTick = (data: any) => {
    this.ngZone.run(() => {
      // Update TV game
      if (data.gameId === this.tvGameId()) {
        this.tvTimeA_W.set(data.clocks.A_W);
        this.tvTimeA_B.set(data.clocks.A_B);
        this.tvTimeB_W.set(data.clocks.B_W);
        this.tvTimeB_B.set(data.clocks.B_B);
      }

      // Update active game
      if (!data.gameId || data.gameId === this.gameId()) {
        const prev_A_W = this.timeA_W();
        const prev_B_W = this.timeB_W();
        const prev_A_B = this.timeA_B();
        const prev_B_B = this.timeB_B();

        this.timeA_W.set(data.clocks.A_W);
        this.timeA_B.set(data.clocks.A_B);
        this.timeB_W.set(data.clocks.B_W);
        this.timeB_B.set(data.clocks.B_B);

        // Low-time audio cue (crossing 15s)
        if (
          (prev_A_W > 15 && data.clocks.A_W <= 15) ||
          (prev_A_B > 15 && data.clocks.A_B <= 15) ||
          (prev_B_W > 15 && data.clocks.B_W <= 15) ||
          (prev_B_B > 15 && data.clocks.B_B <= 15)
        ) {
          this.audioService.playLowTime();
        }
      }
    });
  };

  private handleGameOver = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.tvGameId()) {
        this.tvGameActive.set(false);
        this.tvWinner.set(data.winner);

        // Auto-switch TV game after 5 seconds
        setTimeout(() => {
          this.ngZone.run(() => {
            if (this.tvGameId() === data.gameId) {
              const activeGames = this.ongoingMatches();
              const remaining = activeGames.filter((g) => g.gameId !== data.gameId);
              if (remaining.length > 0) {
                this.tvGameId.set(remaining[0].gameId);
              } else {
                this.tvGameId.set(null);
                this.resetTvGameState();
              }
            }
          });
        }, 5000);
      }

      if (!data.gameId || data.gameId === this.gameId()) {
        this.endGame(data.winner, data.reason);
      }
    });
  };

  private handleOpponentDisconnected = (data: any) => {
    this.ngZone.run(() => {
      this.showNotification(`${data.playerName} disconnected from the game.`, 'info');
    });
  };

  private handleBughouseError = (errorMsg: string) => {
    this.ngZone.run(() => {
      this.showNotification(errorMsg, 'error');
    });
  };

  // ── Socket Event Bindings ──────────────────────────────────────────
  setupSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    this.removeSocketListeners();

    socket.on('bughouse_active_games', this.handleActiveGames);
    socket.on('bughouse_lobby_sync', this.handleLobbySync);
    socket.on('bughouse_invite_rejected', this.handleInviteRejected);
    socket.on('bughouse_kicked', this.handleKicked);
    socket.on('bughouse_matched', this.handleMatched);
    socket.on('bughouse_game_start', this.handleGameStart);
    socket.on('bughouse_move_broadcast', this.handleMoveBroadcast);
    socket.on('bughouse_clock_tick', this.handleClockTick);
    socket.on('bughouse_game_over', this.handleGameOver);
    socket.on('bughouse_opponent_disconnected', this.handleOpponentDisconnected);
    socket.on('bughouse_error', this.handleBughouseError);

    // Notify microservice that we joined
    socket.emit('bughouse_join');
  }

  private removeSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    socket.off('bughouse_active_games', this.handleActiveGames);
    socket.off('bughouse_lobby_sync', this.handleLobbySync);
    socket.off('bughouse_invite_rejected', this.handleInviteRejected);
    socket.off('bughouse_kicked', this.handleKicked);
    socket.off('bughouse_matched', this.handleMatched);
    socket.off('bughouse_game_start', this.handleGameStart);
    socket.off('bughouse_move_broadcast', this.handleMoveBroadcast);
    socket.off('bughouse_clock_tick', this.handleClockTick);
    socket.off('bughouse_game_over', this.handleGameOver);
    socket.off('bughouse_opponent_disconnected', this.handleOpponentDisconnected);
    socket.off('bughouse_error', this.handleBughouseError);
  }

  // ── Lobby Actions ──────────────────────────────────────────────────
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
    if (!isPlatformBrowser(this.platformId)) return;

    // Clear search query and results
    this.searchQuery.set('');
    this.searchResults.set([]);

    // Add to Sent Invites Outbox as pending
    const inviteId = player.uid || Math.random().toString();
    const newInvite: SentInvite = { id: inviteId, receiver: player.name, status: 'pending' };
    this.bughouseInviteService.sentInvites.update((list) => [...list, newInvite]);
    this.bughouseInviteService.isInvitesOpen.set(true);

    // 1. Emit live Socket.io invitation event
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_create_lobby');
      socket.emit('bughouse_invite_player', {
        receiverId: player.uid,
        receiverName: player.name,
      });
    }

    // 2. Fallback: post Laravel database notification
    this.http
      .post(`${environment.apiUrl}/bughouse/invite`, {
        receiver_username: player.name,
      })
      .subscribe({
        next: () => {
          this.showNotification(`Invitation sent to ${player.name}!`, 'success');
        },
        error: () => {},
      });
  }

  cancelSentInvite(inviteId: string) {
    this.bughouseInviteService.cancelSentInvite(inviteId);
    this.showNotification('Invite cancelled.', 'info');
  }

  kickPartner() {
    this.partner.set(null);
    this.audioService.playNotification();

    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_kick_partner');
    }
  }

  // ── Incoming Invites Handlers (User B perspective) ────────────────
  acceptIncomingInvite(inviteId: string) {
    if (inviteId.startsWith('sim_')) {
      // Fallback local simulation (for local test button)
      const invite = this.incomingInvites().find((i) => i.id === inviteId);
      if (invite) {
        this.partner.set({ name: invite.sender, isOnline: true });
        this.showNotification(`Joined lobby with partner ${invite.sender}!`, 'success');
        this.audioService.playBoardStart();
      }
      this.bughouseInviteService.incomingInvites.update((list) =>
        list.filter((i) => i.id !== inviteId),
      );
    } else {
      this.bughouseInviteService.acceptInvite(inviteId);
    }
  }

  rejectIncomingInvite(inviteId: string) {
    if (inviteId.startsWith('sim_')) {
      const invite = this.incomingInvites().find((i) => i.id === inviteId);
      if (invite) {
        this.showNotification(`Rejected invite from ${invite.sender}.`, 'info');
        this.audioService.playNotification();
      }
      this.bughouseInviteService.incomingInvites.update((list) =>
        list.filter((i) => i.id !== inviteId),
      );
    } else {
      this.bughouseInviteService.rejectInvite(inviteId);
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info') {
    this.inviteNotification.set({ message, type });
    setTimeout(() => {
      this.ngZone.run(() => {
        if (this.inviteNotification()?.message === message) {
          this.inviteNotification.set(null);
        }
      });
    }, 4000);
  }

  // ── Queue & Matchmaking Simulation ─────────────────────────────────
  startQueue() {
    if (!this.partner()) return;
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_join_queue');
    }
  }

  cancelQueue() {
    this.bughouseQueueService.cancelQueue();
  }

  private stopCountdownInterval() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // ── Game Management ────────────────────────────────────────────────
  resetGame() {
    this.stopClocks();

    this.chessA.reset();
    this.chessB.reset();

    this.boardAFen.set(this.chessA.fen());
    this.boardBFen.set(this.chessB.fen());

    this.pocketA_W.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.pocketA_B.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.pocketB_W.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.pocketB_B.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });

    this.timeA_W.set(300);
    this.timeA_B.set(300);
    this.timeB_W.set(300);
    this.timeB_B.set(300);

    this.gameActive.set(false);
    this.winner.set(null);
    this.gameEndReason.set(null);
    this.movesLog.set([]);

    this.cancelDropMode();
    this.syncBoardOrientations();
  }

  resetTvGameState() {
    this.tvBoardAFen.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.tvBoardBFen.set('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.tvPocketA_W.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvPocketA_B.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvPocketB_W.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvPocketB_B.set({ p: 0, n: 0, b: 0, r: 0, q: 0 });
    this.tvTimeA_W.set(300);
    this.tvTimeA_B.set(300);
    this.tvTimeB_W.set(300);
    this.tvTimeB_B.set(300);
    this.tvGameActive.set(false);
    this.tvWinner.set(null);
    this.tvBoardAWhiteName.set('');
    this.tvBoardABlackName.set('');
    this.tvBoardBWhiteName.set('');
    this.tvBoardBBlackName.set('');
  }

  startGame() {
    if (this.winner()) {
      this.resetGame();
    }
    this.gameActive.set(true);
    this.audioService.playBoardStart();
    // NOTE: clocks are driven by server bughouse_clock_tick events — do NOT start local clocks.
  }

  pauseGame() {
    this.gameActive.set(false);
    this.stopClocks();
  }

  resignGame() {
    const socket = this.gameService.socket();
    if (socket?.connected && this.gameId()) {
      socket.emit('bughouse_resign', { gameId: this.gameId() });
    }
  }

  spectateGame(gameId: string) {
    const socket = this.gameService.socket();
    if (socket?.connected) {
      this.gameId.set(gameId); // Set the active gameId first so handleGameStart resolves correctly
      socket.emit('bughouse_spectate', { gameId });
      this.lobbyState.set('playing');
    }
  }

  exitToLobby() {
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      if (this.isSpectating()) {
        socket.emit('bughouse_leave_spectate', { gameId: this.gameId() });
      } else {
        socket.emit('bughouse_leave_lobby');
      }
    }
    this.resetGame();
    this.gameId.set(null);
    this.myBoard.set(null);
    this.myColor.set(null);
    this.isSpectating.set(false);
    this.isHost.set(true);
    this.lobbyState.set('lobby');

    // Auto-select TV game on return to lobby
    const active = this.ongoingMatches();
    if (active.length > 0) {
      this.tvGameId.set(active[0].gameId);
    }
  }

  syncBoardOrientations() {
    const board = this.myBoard();
    const color = this.myColor() ?? 'w';

    if (!board) {
      this.boardAOrientation.set('white');
      this.boardBOrientation.set('white');
      return;
    }

    if (board === 'A') {
      this.boardAOrientation.set(color === 'w' ? 'white' : 'black');
      this.boardBOrientation.set(color === 'w' ? 'black' : 'white');
    } else {
      this.boardAOrientation.set(color === 'w' ? 'black' : 'white');
      this.boardBOrientation.set(color === 'w' ? 'white' : 'black');
    }
  }

  // ── Clocks Logic ───────────────────────────────────────────────────
  private startClocks() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopClocks();

    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (!this.gameActive() || this.winner()) return;

        // Board A clock decrement
        if (this.turnA() === 'w') {
          this.timeA_W.update((t) => this.decrementClock(t, 'Team B', 'Board A White flagged'));
        } else {
          this.timeA_B.update((t) => this.decrementClock(t, 'Team A', 'Board A Black flagged'));
        }

        // Board B clock decrement
        if (this.turnB() === 'w') {
          this.timeB_W.update((t) => this.decrementClock(t, 'Team A', 'Board B White flagged'));
        } else {
          this.timeB_B.update((t) => this.decrementClock(t, 'Team B', 'Board B Black flagged'));
        }
      });
    }, 1000);
  }

  private stopClocks() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private decrementClock(currentTime: number, winningTeam: string, reason: string): number {
    if (currentTime <= 1) {
      this.endGame(winningTeam, reason);
      return 0;
    }
    const nextTime = currentTime - 1;
    if (nextTime === 15) {
      this.audioService.playLowTime();
    }
    return nextTime;
  }

  private endGame(winningTeam: string | null, reason: string) {
    this.winner.set(winningTeam);
    this.gameEndReason.set(reason);
    this.gameActive.set(false);
    this.stopClocks();
    this.audioService.playBoardEnd();
  }

  // ── Capture and Move Handling ──────────────────────────────────────
  onBoardMoveMade(board: 'A' | 'B', event: { move: Move; fen: string; uci?: string }) {
    if (!this.gameActive() || this.winner()) {
      this.syncFens();
      return;
    }

    // Only allow moves on the board this player is assigned to
    if (this.myBoard() !== board) return;

    const { move, fen } = event;
    const chess = board === 'A' ? this.chessA : this.chessB;

    // Update local chess instance immediately (ChessBoardComponent already made the move)
    chess.load(fen);
    if (board === 'A') this.boardAFen.set(chess.fen());
    else this.boardBFen.set(chess.fen());

    // Play audio immediately for the local player
    this.audioService.playChessMove({ san: move.san, flags: move.flags });

    // Emit to server — server validates, applies pocket transfer, checks game-over, broadcasts
    const socket = this.gameService.socket();
    if (socket?.connected) {
      socket.emit('bughouse_move', {
        gameId: this.gameId(),
        board,
        move: {
          san: move.san,
          flags: move.flags,
          color: move.color,
          captured: move.captured ?? null,
        },
        fen,
      });
    }
    // Pocket transfer and game-over are handled by the server;
    // results arrive via bughouse_move_broadcast / bughouse_game_over.
  }

  /**
   * Apply a full authoritative pocket state broadcast from the server.
   * The server sends all 4 pockets after every move/drop.
   */
  private applyPocketUpdate(pockets: Record<string, Record<PieceType, number>>) {
    if (pockets['A_W']) this.pocketA_W.set({ ...pockets['A_W'] } as Record<PieceType, number>);
    if (pockets['A_B']) this.pocketA_B.set({ ...pockets['A_B'] } as Record<PieceType, number>);
    if (pockets['B_W']) this.pocketB_W.set({ ...pockets['B_W'] } as Record<PieceType, number>);
    if (pockets['B_B']) this.pocketB_B.set({ ...pockets['B_B'] } as Record<PieceType, number>);
  }

  /**
   * Log a move received from the server broadcast.
   * All 4 clients log from the same broadcast to keep logs in sync.
   */
  private logMoveFromBroadcast(board: 'A' | 'B', san: string, moveColor: 'w' | 'b') {
    const chess = board === 'A' ? this.chessA : this.chessB;
    const history = chess.history();
    const moveNo = Math.ceil(history.length / 2) || 1;

    const entry: MoveLogEntry = {
      board,
      moveNo,
      turn: moveColor,
      san,
      timestamp: new Date(),
    };
    this.movesLog.update((log) => [...log, entry]);
  }

  private checkGameOver(board: 'A' | 'B') {
    const chess = board === 'A' ? this.chessA : this.chessB;
    if (chess.isCheckmate()) {
      const losingColor = chess.turn();
      if (board === 'A') {
        const winningTeam = losingColor === 'w' ? 'Team B' : 'Team A';
        this.endGame(winningTeam, `Checkmate on Board A`);
      } else {
        const winningTeam = losingColor === 'w' ? 'Team A' : 'Team B';
        this.endGame(winningTeam, `Checkmate on Board B`);
      }
    } else if (
      chess.isDraw() ||
      chess.isStalemate() ||
      chess.isThreefoldRepetition() ||
      chess.isInsufficientMaterial()
    ) {
      this.endGame('Draw', `Draw by rule on Board ${board}`);
    }
  }

  private syncFens() {
    this.boardAFen.set(this.chessA.fen());
    this.boardBFen.set(this.chessB.fen());
  }

  // ── Drop Mode Interface ────────────────────────────────────────────
  startDropMode(board: 'A' | 'B', piece: PieceType, color: 'w' | 'b') {
    if (!this.gameActive() || this.winner()) return;

    // Check turn
    const activeTurn = board === 'A' ? this.turnA() : this.turnB();
    if (activeTurn !== color) return;

    // Toggle drop mode
    if (this.activeDropBoard() === board && this.activeDropPiece() === piece) {
      this.cancelDropMode();
    } else {
      this.activeDropBoard.set(board);
      this.activeDropPiece.set(piece);
      this.activeDropColor.set(color);
    }
  }

  cancelDropMode() {
    this.activeDropBoard.set(null);
    this.activeDropPiece.set(null);
    this.activeDropColor.set(null);
  }

  isSquareTargetable(board: 'A' | 'B', square: string): boolean {
    if (this.activeDropBoard() !== board) return false;
    const piece = this.activeDropPiece();
    if (!piece) return false;

    const chess = board === 'A' ? this.chessA : this.chessB;
    if (chess.get(square as any)) return false;

    // Pawn cannot be placed on 1st or 8th rank
    if (piece === 'p') {
      const rank = square[1];
      if (rank === '1' || rank === '8') return false;
    }

    return true;
  }

  onGridSquareClicked(board: 'A' | 'B', square: string) {
    if (!this.isSquareTargetable(board, square)) return;

    const piece = this.activeDropPiece()!;
    const color = this.activeDropColor()!;

    // Emit drop to server; server validates, applies, and broadcasts back to all 4 clients
    const socket = this.gameService.socket();
    if (socket?.connected) {
      socket.emit('bughouse_drop', {
        gameId: this.gameId(),
        board,
        piece,
        square,
        color,
      });
    }
    // Play audio immediately for the local player
    this.audioService.playChessMove({ san: `${piece.toUpperCase()}@${square}`, flags: 'n' });
    this.cancelDropMode();
    // Board FEN, pocket decrement, and game-over check arrive via bughouse_move_broadcast / bughouse_game_over
  }

  // decrementPocket removed — server is the authoritative pocket owner.
  // Pocket state is applied only via applyPocketUpdate() from bughouse_move_broadcast.

  // ── Grid Generation for Drop Highlights ───────────────────────────
  getGridSquares(board: 'A' | 'B'): string[] {
    const orientation = board === 'A' ? this.boardAOrientation() : this.boardBOrientation();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    if (orientation === 'white') {
      ranks.reverse();
    } else {
      files.reverse();
    }

    const squares: string[] = [];
    for (const rank of ranks) {
      for (const file of files) {
        squares.push(file + rank);
      }
    }
    return squares;
  }

  // ── Utility Formatting Helpers ─────────────────────────────────────
  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const sStr = s < 10 ? '0' + s : s;
    return `${m}:${sStr}`;
  }

  getPocketKeys(): PieceType[] {
    return ['q', 'r', 'b', 'n', 'p'];
  }

  getPieceLabel(type: string): string {
    const labels: Record<string, string> = {
      q: 'Queen',
      r: 'Rook',
      b: 'Bishop',
      n: 'Knight',
      p: 'Pawn',
    };
    return labels[type] || type.toUpperCase();
  }

  getPocketPieceSvg(type: PieceType, color: 'w' | 'b'): string {
    const theme = 'cburnett';
    const typeUpper = type.toUpperCase();
    return `/pieces/${theme}/${color}${typeUpper}.svg`;
  }
}
