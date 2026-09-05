import { Injectable, inject, signal, computed, effect, untracked, NgZone, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chess, Move } from 'chess.js';
import { environment } from '../../../../environments/environment';
import { AudioService } from '../../../core/services/audio.service';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { BughouseInviteService, SentInvite } from '../../../core/services/bughouse-invite.service';
import { BughouseTvService } from './bughouse-tv.service';
import { UserService } from '../../../core/services/user.service';
import {
  PieceType,
  MoveLogEntry,
  BughouseTeamsState,
  BughouseGameOverState,
  LobbyPlayer,
  BughouseRecordState,
} from '../../../core/models/bughouse.model';
import { CannibalAvailabilityMap } from '../components/cannibal-promotion-dialog/cannibal-promotion-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class BughouseGameStateService implements OnDestroy {
  private audioService = inject(AudioService);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);
  private gameService = inject(GameService);
  private bughouseInviteService = inject(BughouseInviteService);
  private tvService = inject(BughouseTvService);

  // ── Lobby & Pairing State ──────────────────────────────────────────
  lobbyState = signal<'lobby' | 'queuing' | 'matched' | 'playing'>('lobby');
  activeSidebarTab = signal<'players' | 'moves'>('players');

  // ── Bughouse Record & Persist State ───────────────────────────────
  bughouseRecord = signal<BughouseRecordState>({ wins: 0, draws: 0, losses: 0 });
  private lastProcessedGameId: string | null = null;
  recordStorageKey = computed(() => {
    const uid = this.authService.currentUser()?.uid;
    return uid ? `bughouse_record_${uid}` : 'bughouse_record_guest';
  });

  // ── Active game identity ───────────────────────────────────────────
  gameId = signal<string | null>(null);
  myBoard = signal<'A' | 'B' | null>(null);
  myColor = signal<'w' | 'b' | null>(null);
  userColor = signal<'w' | 'b'>('w');

  teamsState = signal<BughouseTeamsState>({
    teamA: {
      captain: { name: '', color: '', board: '' },
      partner: { name: '', color: '', board: '' },
    },
    teamB: {
      captain: { name: '', color: '', board: '' },
      partner: { name: '', color: '', board: '' },
    },
    boards: {
      boardA: { white: '', black: '' },
      boardB: { white: '', black: '' },
    }
  });

  lobbyType = signal<'casual' | 'ranked'>('casual');
  partner = signal<LobbyPlayer | null>(null);
  isHost = signal<boolean>(true);
  opponent1 = signal<LobbyPlayer | null>(null);
  opponent2 = signal<LobbyPlayer | null>(null);

  inviteNotification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  isSpectating = signal<boolean>(false);

  rematchOffers = signal<string[]>([]);
  rematchDeclined = signal<boolean>(false);
  rematchCooldown = signal<boolean>(false);
  cooldownRemainingSecs = signal<number>(0);
  seriesRound = signal<number>(1);
  seriesScore = signal<{ [lobbyId: string]: number }>({});
  nextGameId = signal<string | null>(null);
  private rematchCooldownTimeout: any = null;
  private cooldownInterval: any = null;

  chessA = new Chess();
  chessB = new Chess();

  boardAFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  boardBFen = signal<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  boardAOrientation = signal<'white' | 'black'>('white');
  boardBOrientation = signal<'white' | 'black'>('black');

  pocketA_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  pocketA_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  pocketB_W = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });
  pocketB_B = signal<Record<PieceType, number>>({ p: 0, n: 0, b: 0, r: 0, q: 0 });

  timeA_W = signal<number>(300);
  timeA_B = signal<number>(300);
  timeB_W = signal<number>(300);
  timeB_B = signal<number>(300);

  turnA = computed(() => this.boardAFen().split(' ')[1] as 'w' | 'b');
  turnB = computed(() => this.boardBFen().split(' ')[1] as 'w' | 'b');

  gameActive = signal<boolean>(false);
  winner = signal<string | null>(null);
  gameEndReason = signal<string | null>(null);

  movesLog = signal<MoveLogEntry[]>([]);
  boardAMoveRows = computed(() => this.getRowsForBoard('A'));
  boardBMoveRows = computed(() => this.getRowsForBoard('B'));

  activeDropBoard = signal<'A' | 'B' | null>(null);
  activeDropPiece = signal<PieceType | null>(null);
  activeDropColor = signal<'w' | 'b' | null>(null);

  // ── Cannibal Promotion (Piece Conservation) State ──────────────────
  variant = signal<'cannibal' | 'standard'>('cannibal');
  pendingCannibalPromotion = signal<{
    board: 'A' | 'B';
    from: string;
    to: string;
    color: 'w' | 'b';
  } | null>(null);
  lastPluckedPiece = signal<{
    board: 'A' | 'B';
    square?: string;
    piece: string;
    source: 'pocket' | 'board';
  } | null>(null);

  private timerInterval: any = null;
  private lastTickTime: number = 0;

  // AI-GENERATED WORKAROUND: Robust team lobby ID and rematch offer detection.
  // WHY: Matchmaker associates rematches by captain lobbyId. Resolving myTeamLobbyId via teamsState
  // guarantees both captain and partner (on Team A or Team B) accurately detect when their team or
  // the opposing team offered rematch, even if partner() signal is not populated on game over.
  myTeamLobbyId = computed(() => {
    const user = this.authService.currentUser();
    const myUid = String(user?.uid || user?.id || '');
    if (!myUid) return null;

    // A team captain's lobby ID in Lila / matchmaker is their own user ID
    if (this.isCaptain()) return myUid;

    const teamA = this.teamsState()?.teamA;
    const teamB = this.teamsState()?.teamB;
    const isTeamA = String(teamA?.captain?.id) === myUid || String(teamA?.partner?.id) === myUid;
    const isTeamB = String(teamB?.captain?.id) === myUid || String(teamB?.partner?.id) === myUid;

    if (isTeamA && teamA?.captain?.id) return String(teamA.captain.id);
    if (isTeamB && teamB?.captain?.id) return String(teamB.captain.id);
    return this.isHost() ? myUid : (this.partner()?.uid ? String(this.partner()?.uid) : null);
  });

  hasMyTeamOfferedRematch = computed(() => {
    const myLobbyId = this.myTeamLobbyId();
    const user = this.authService.currentUser();
    const myUid = String(user?.uid || user?.id || '');
    const offers = this.rematchOffers().map(String);
    if (offers.length === 0) return false;
    if (myLobbyId && offers.includes(String(myLobbyId))) return true;
    if (myUid && offers.includes(String(myUid))) return true;
    return false;
  });

  hasOpponentTeamOfferedRematch = computed(() => {
    const myLobbyId = this.myTeamLobbyId();
    const user = this.authService.currentUser();
    const myUid = String(user?.uid || user?.id || '');
    const offers = this.rematchOffers().map(String);
    if (offers.length === 0) return false;
    return offers.some(id => id !== String(myLobbyId) && id !== String(myUid));
  });

  isCaptain = computed(() => {
    const user = this.authService.currentUser();
    const myUid = String(user?.uid || user?.id || '');
    if (!myUid) return this.isHost();

    const teamA = this.teamsState()?.teamA;
    const teamB = this.teamsState()?.teamB;

    if (teamA && String(teamA.captain?.id) === myUid) return true;
    if (teamB && String(teamB.captain?.id) === myUid) return true;

    return this.isHost();
  });

  gameOverState = computed<BughouseGameOverState>(() => ({
    winner: this.winner(),
    gameEndReason: this.gameEndReason(),
    rematchDeclined: this.rematchDeclined(),
    rematchCooldown: this.rematchCooldown(),
    cooldownRemainingSecs: this.cooldownRemainingSecs(),
    rematchOffers: this.rematchOffers(),
    hasMyTeamOfferedRematch: this.hasMyTeamOfferedRematch(),
    hasOpponentTeamOfferedRematch: this.hasOpponentTeamOfferedRematch(),
    seriesRound: this.seriesRound(),
    nextGameId: this.nextGameId(),
    isCaptain: this.isCaptain(),
  }));

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        if (user?.bughouse_stats) {
          this.bughouseRecord.set({
            wins: user.bughouse_stats.wins,
            draws: user.bughouse_stats.draws,
            losses: user.bughouse_stats.losses
          });
        } else {
          const key = this.recordStorageKey();
          if (isPlatformBrowser(this.platformId)) {
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                this.bughouseRecord.set(JSON.parse(saved));
              } catch (e) {
                console.error('Error parsing bughouse record', e);
                this.bughouseRecord.set({ wins: 0, draws: 0, losses: 0 });
              }
            } else {
              this.bughouseRecord.set({ wins: 0, draws: 0, losses: 0 });
            }
          }
        }
      });
    });

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

    effect(() => {
      const state = this.lobbyState();
      if (state === 'matched' || state === 'playing') {
        untracked(() => {
          this.tvService.tvGameId.set(null);
          this.tvService.resetTvGameState();
        });
      }
    });
  }

  private getRowsForBoard(board: 'A' | 'B') {
    const moves = this.movesLog().filter((m) => m.board === board);
    const rows: { moveNo: number; w?: string; b?: string }[] = [];
    moves.forEach((m) => {
      let row = rows.find((r) => r.moveNo === m.moveNo);
      if (!row) {
        row = { moveNo: m.moveNo };
        rows.push(row);
      }
      if (m.moveColor === 'w') {
        row.w = m.san;
      } else {
        row.b = m.san;
      }
    });
    return rows.sort((a, b) => a.moveNo - b.moveNo);
  }

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
    this.teamsState.set({
      teamA: {
        captain: { name: '', color: '', board: '' },
        partner: { name: '', color: '', board: '' },
      },
      teamB: {
        captain: { name: '', color: '', board: '' },
        partner: { name: '', color: '', board: '' },
      },
      boards: {
        boardA: { white: '', black: '' },
        boardB: { white: '', black: '' },
      }
    });

    this.cancelDropMode();
    this.syncBoardOrientations();
    if (this.rematchCooldownTimeout) {
      clearTimeout(this.rematchCooldownTimeout);
      this.rematchCooldownTimeout = null;
    }
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.rematchOffers.set([]);
    this.rematchDeclined.set(false);
    this.rematchCooldown.set(false);
    this.cooldownRemainingSecs.set(0);
    this.nextGameId.set(null);
    this.activeSidebarTab.set('players');
  }

  startGame() {
    if (this.winner()) {
      this.resetGame();
    }
    this.gameActive.set(true);
    this.audioService.playBoardStart();
  }

  pauseGame() {
    this.gameActive.set(false);
    this.stopClocks();
  }

  resignGame() {
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_resign', { gameId: gId });
    }
  }

  spectateGame(gameId: string) {
    const socket = this.gameService.socket();
    if (socket?.connected) {
      this.gameId.set(gameId);
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

    const active = this.tvService.ongoingMatches();
    if (active.length > 0) {
      this.tvService.tvGameId.set(active[0].gameId);
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

  startClocks() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopClocks();

    this.lastTickTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (!this.gameActive() || this.winner()) return;

        const now = Date.now();
        const delta = (now - this.lastTickTime) / 1000;
        this.lastTickTime = now;

        // Board A clock decrement
        if (this.turnA() === 'w') {
          this.timeA_W.update((t) => this.decrementClock(t, delta, 'Team B', 'Board A White flagged'));
        } else {
          this.timeA_B.update((t) => this.decrementClock(t, delta, 'Team A', 'Board A Black flagged'));
        }

        // Board B clock decrement
        if (this.turnB() === 'w') {
          this.timeB_W.update((t) => this.decrementClock(t, delta, 'Team A', 'Board B White flagged'));
        } else {
          this.timeB_B.update((t) => this.decrementClock(t, delta, 'Team B', 'Board B Black flagged'));
        }
      });
    }, 100);
  }

  stopClocks() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private decrementClock(currentTime: number, delta: number, winningTeam: string, reason: string): number {
    if (currentTime <= 0) {
      return 0;
    }
    const nextTime = Math.max(0, currentTime - delta);
    if (nextTime <= 0) {
      this.endGame(winningTeam, reason);
      return 0;
    }
    if (currentTime > 15 && nextTime <= 15) {
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
    this.activeSidebarTab.set('players');

    const gId = this.gameId();
    if (!gId || this.lastProcessedGameId === gId || this.isSpectating()) {
      return;
    }
    this.lastProcessedGameId = gId;

    const myUid = this.authService.currentUser()?.uid;
    if (!myUid) {
      return; // Offline / Guest mode outcome calculation not persisted to DB
    }

    const teamA = this.teamsState().teamA;
    const teamB = this.teamsState().teamB;
    
    // Normalize IDs using String() to ensure correct type matching
    const isPlayerInTeamA = String(teamA.captain.id) === String(myUid) || String(teamA.partner.id) === String(myUid);
    const isPlayerInTeamB = String(teamB.captain.id) === String(myUid) || String(teamB.partner.id) === String(myUid);

    if (isPlayerInTeamA || isPlayerInTeamB) {
      if (winningTeam === 'Draw') {
        this.updateRecord(gId, 'draw');
      } else if (winningTeam === 'Team A') {
        this.updateRecord(gId, isPlayerInTeamA ? 'win' : 'loss');
      } else if (winningTeam === 'Team B') {
        this.updateRecord(gId, isPlayerInTeamB ? 'win' : 'loss');
      }
    }
  }

  onBoardMoveMade(board: 'A' | 'B', event: { move: Move; fen: string; uci?: string }) {
    if (!this.gameActive() || this.winner()) {
      this.syncFens();
      return;
    }

    if (this.myBoard() !== board) return;

    const { move, fen } = event;
    const chess = board === 'A' ? this.chessA : this.chessB;

    chess.load(fen);
    if (board === 'A') this.boardAFen.set(chess.fen());
    else this.boardBFen.set(chess.fen());

    this.audioService.playChessMove({ san: move.san, flags: move.flags });

    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_move', {
        gameId: gId,
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
  }

  private syncFens() {
    const a = this.chessA.fen();
    const b = this.chessB.fen();
    this.boardAFen.set(a + ' ');
    this.boardBFen.set(b + ' ');
    requestAnimationFrame(() => {
      this.boardAFen.set(a);
      this.boardBFen.set(b);
    });
  }

  setVariant(variant: 'cannibal' | 'standard') {
    this.variant.set(variant);
    const socket = this.gameService.socket();
    const myUid = this.authService.currentUser()?.uid;
    if (socket?.connected && this.isHost()) {
      socket.emit('bughouse_set_variant', { variant });
    }
  }

  computeCannibalAvailability(board: 'A' | 'B', color: 'w' | 'b'): CannibalAvailabilityMap {
    const otherBoard = board === 'A' ? 'B' : 'A';
    const ownPocket = board === 'A'
      ? (color === 'w' ? this.pocketA_W() : this.pocketA_B())
      : (color === 'w' ? this.pocketB_W() : this.pocketB_B());

    const otherChess = otherBoard === 'A' ? this.chessA : this.chessB;
    const partnerColor = color === 'w' ? 'b' : 'w';
    // Pluck targets the opponent's piece on otherBoard (which has the SAME color as promoting pawn)
    const targetPluckColor = color;
    const pieces: ('q' | 'r' | 'b' | 'n')[] = ['q', 'r', 'b', 'n'];

    const result: CannibalAvailabilityMap = {
      q: { inPocket: 0, boardSquares: [], totalAvailable: 0 },
      r: { inPocket: 0, boardSquares: [], totalAvailable: 0 },
      b: { inPocket: 0, boardSquares: [], totalAvailable: 0 },
      n: { inPocket: 0, boardSquares: [], totalAvailable: 0 },
    };

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const type of pieces) {
      const inPocket = ownPocket[type] || 0;
      const boardSquares: string[] = [];

      for (const f of files) {
        for (const r of ranks) {
          const sq = f + r;
          const p = otherChess.get(sq as any);
          if (p && p.type === type && p.color === targetPluckColor) {
            // Test if removing sq leaves either King in check
            const testClone = new Chess(otherChess.fen());
            testClone.remove(sq as any);
            const parts = testClone.fen().split(' ');
            parts[3] = '-';
            try {
              parts[1] = targetPluckColor;
              const checkTestOpponent = new Chess(parts.join(' '));
              parts[1] = partnerColor;
              const checkTestPartner = new Chess(parts.join(' '));
              if (!checkTestOpponent.inCheck() && !checkTestPartner.inCheck()) {
                boardSquares.push(sq);
              }
            } catch {
              // Ignore invalid FEN
            }
          }
        }
      }

      result[type] = {
        inPocket,
        boardSquares,
        totalAvailable: inPocket + boardSquares.length,
      };
    }

    return result;
  }

  confirmCannibalPromotion(
    pieceType: 'q' | 'r' | 'b' | 'n',
    requisition?: { source: 'pocket' | 'board'; square?: string }
  ) {
    const pending = this.pendingCannibalPromotion();
    if (!pending) return;

    const { board, from, to } = pending;
    const chess = board === 'A' ? this.chessA : this.chessB;

    try {
      // Test-validate promotion move without permanently mutating local board yet
      const testClone = new Chess(chess.fen());
      const move = testClone.move({ from: from as any, to: to as any, promotion: pieceType as any });
      if (!move) return;

      const socket = this.gameService.socket();
      const gId = this.gameId();
      if (socket?.connected && gId) {
        socket.emit('bughouse_move', {
          gameId: gId,
          board,
          move: {
            from,
            to,
            san: move.san,
            flags: move.flags,
            color: move.color,
            captured: move.captured ?? null,
            promotion: pieceType,
          },
          fen: testClone.fen(),
          requisition: {
            source: requisition?.source,
            targetBoard: board === 'A' ? 'B' : 'A',
            square: requisition?.square,
            expectedPiece: pieceType,
          },
        });
      }
      // NOTE: We deliberately keep pendingCannibalPromotion active.
      // If the target moved on the other board, the server sends 'bughouse_requisition_stale'
      // which seamlessly refreshes the other board while keeping this promotion prompt open!
      // When the move succeeds, handleMoveBroadcast will clear pendingCannibalPromotion.
    } catch (e) {
      console.error('Failed to submit cannibal promotion move:', e);
      this.cancelCannibalPromotion();
    }
  }

  cancelCannibalPromotion() {
    this.pendingCannibalPromotion.set(null);
    this.syncFens();
  }

  /**
   * Computed map of legal squares on the other board that can be plucked for a pending promotion.
   * Key: square string (e.g. 'd1'), Value: { piece: 'q'|'r'|'b'|'n', square: string }
   */
  eligiblePluckSquares = computed<Record<string, { piece: 'q' | 'r' | 'b' | 'n'; square: string }>>(() => {
    const pending = this.pendingCannibalPromotion();
    if (!pending) return {};

    const { board, color } = pending;
    const otherBoard = board === 'A' ? 'B' : 'A';
    // Reactive signal dependency: re-evaluates automatically whenever the other board's FEN changes!
    const otherFen = otherBoard === 'A' ? this.boardAFen() : this.boardBFen();
    const partnerColor = color === 'w' ? 'b' : 'w';
    const targetPluckColor = color;
    const pieceTypes: ('q' | 'r' | 'b' | 'n')[] = ['q', 'r', 'b', 'n'];

    const squaresMap: Record<string, { piece: 'q' | 'r' | 'b' | 'n'; square: string }> = {};
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    let otherChess: Chess;
    try {
      otherChess = new Chess(otherFen);
    } catch {
      otherChess = otherBoard === 'A' ? this.chessA : this.chessB;
    }

    for (const f of files) {
      for (const r of ranks) {
        const sq = f + r;
        const p = otherChess.get(sq as any);
        if (p && pieceTypes.includes(p.type as any) && p.color === targetPluckColor) {
          const testClone = new Chess(otherChess.fen());
          testClone.remove(sq as any);
          const parts = testClone.fen().split(' ');
          parts[3] = '-';
          try {
            parts[1] = targetPluckColor;
            const checkTestOpponent = new Chess(parts.join(' '));
            parts[1] = partnerColor;
            const checkTestPartner = new Chess(parts.join(' '));
            if (!checkTestOpponent.inCheck() && !checkTestPartner.inCheck()) {
              squaresMap[sq] = { piece: p.type as any, square: sq };
            }
          } catch {
            // Ignore invalid FEN
          }
        }
      }
    }

    return squaresMap;
  });

  onPluckSquareClicked(board: 'A' | 'B', square: string) {
    const pending = this.pendingCannibalPromotion();
    if (!pending) return;

    const targetBoard = pending.board === 'A' ? 'B' : 'A';
    if (board !== targetBoard) return;

    const target = this.eligiblePluckSquares()[square];
    if (target) {
      this.confirmCannibalPromotion(target.piece, { source: 'board', square });
    }
  }

  onPocketPieceSelectedForPromotion(piece: PieceType) {
    const pending = this.pendingCannibalPromotion();
    if (!pending) return;

    if (['q', 'r', 'b', 'n'].includes(piece)) {
      const ownPocket = pending.board === 'A'
        ? (pending.color === 'w' ? this.pocketA_W() : this.pocketA_B())
        : (pending.color === 'w' ? this.pocketB_W() : this.pocketB_B());

      if (ownPocket[piece] > 0) {
        this.confirmCannibalPromotion(piece as any, { source: 'pocket' });
      }
    }
  }

  startDropMode(board: 'A' | 'B', piece: PieceType, color: 'w' | 'b') {
    if (!this.gameActive() || this.winner()) return;

    const activeTurn = board === 'A' ? this.turnA() : this.turnB();
    if (activeTurn !== color) return;

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

  updateRecord(gameId: string, outcome: 'win' | 'draw' | 'loss') {
    const user = this.authService.currentUser();
    const previousStats = this.bughouseRecord();

    // Optimistic UI update
    this.bughouseRecord.update(rec => ({
      wins: rec.wins + (outcome === 'win' ? 1 : 0),
      draws: rec.draws + (outcome === 'draw' ? 1 : 0),
      losses: rec.losses + (outcome === 'loss' ? 1 : 0),
    }));

    if (user) {
      this.http.post<{ bughouse_stats: BughouseRecordState }>(`${environment.apiUrl}/bughouse/record`, { 
        game_id: gameId, 
        outcome 
      })
        .subscribe({
          next: (res) => {
            this.bughouseRecord.set(res.bughouse_stats);
            // Immutable cached user profile update
            const currentProfile = this.userService.currentUser();
            if (currentProfile) {
              this.userService.currentUser.set({
                ...currentProfile,
                bughouse_stats: res.bughouse_stats
              });
              this.userService.cacheProfile(this.userService.currentUser()!);
            }
          },
          error: (err) => {
            console.error('Failed to sync bughouse record with backend, rolling back.', err);
            this.bughouseRecord.set(previousStats);
          }
        });
    } else {
      // Fallback to local storage namespace for guest session
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.recordStorageKey(), JSON.stringify(this.bughouseRecord()));
      }
    }
  }

  resetRecord() {
    const user = this.authService.currentUser();
    const previousStats = this.bughouseRecord();

    // Optimistic UI update
    this.bughouseRecord.set({ wins: 0, draws: 0, losses: 0 });

    if (user) {
      this.http.post<{ bughouse_stats: BughouseRecordState }>(`${environment.apiUrl}/bughouse/record/reset`, {})
        .subscribe({
          next: (res) => {
            this.bughouseRecord.set(res.bughouse_stats);
            const currentProfile = this.userService.currentUser();
            if (currentProfile) {
              this.userService.currentUser.set({
                ...currentProfile,
                bughouse_stats: res.bughouse_stats
              });
              this.userService.cacheProfile(this.userService.currentUser()!);
            }
          },
          error: (err) => {
            console.error('Failed to reset bughouse record with backend, rolling back.', err);
            this.bughouseRecord.set(previousStats);
          }
        });
    } else {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.recordStorageKey(), JSON.stringify({ wins: 0, draws: 0, losses: 0 }));
      }
    }
  }

  onGridSquareClicked(board: 'A' | 'B', square: string) {
    const piece = this.activeDropPiece();
    const color = this.activeDropColor();
    const gId = this.gameId();
    if (!piece || !color || !gId) return;

    const socket = this.gameService.socket();
    if (socket?.connected) {
      socket.emit('bughouse_drop', {
        gameId: gId,
        board,
        piece,
        square,
        color,
      });
    }
    this.audioService.playChessMove({ san: `${piece.toUpperCase()}@${square}`, flags: 'n' });
    this.cancelDropMode();
  }

  rematchYes() {
    if (!this.isCaptain()) {
      this.showNotification('Only team captains can offer or accept a rematch.', 'info');
      return;
    }
    if (this.rematchCooldown()) return;

    // Start 60s cooldown immediately to disable the rematch button and prevent repeated clicks
    this.startCooldownCountdown(Date.now() + 60000);

    // Optimistically update local offer state for instant 0ms UI feedback
    const myLobbyId = this.myTeamLobbyId() || String(this.authService.currentUser()?.uid || '');
    if (myLobbyId) {
      this.rematchOffers.update((offers) => {
        const list = offers.map(String);
        if (!list.includes(String(myLobbyId))) {
          return [...list, String(myLobbyId)];
        }
        return list;
      });
    }

    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_rematch_yes', { gameId: gId });
    }
  }

  rematchNo() {
    if (!this.isCaptain()) {
      this.showNotification('Only team captains can decline or cancel a rematch.', 'info');
      return;
    }

    // Stop active cooldown interval if offer is cancelled
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    if (this.rematchCooldownTimeout) {
      clearTimeout(this.rematchCooldownTimeout);
      this.rematchCooldownTimeout = null;
    }
    this.rematchCooldown.set(false);
    this.cooldownRemainingSecs.set(0);

    // Optimistically remove local offer state
    const myLobbyId = this.myTeamLobbyId() || String(this.authService.currentUser()?.uid || '');
    if (myLobbyId) {
      this.rematchOffers.update((offers) => offers.filter((id) => String(id) !== String(myLobbyId)));
    }

    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_rematch_no', { gameId: gId });
    }
  }

  // Backward-compatible aliases
  offerRematch() {
    this.rematchYes();
  }

  cancelRematchOffer() {
    this.rematchNo();
  }

  declineRematch() {
    this.rematchNo();
  }

  resign() {
    if (!this.isHost()) return;
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_resign', { gameId: gId });
    }
  }

  offerDraw() {
    if (!this.isHost()) return;
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_offer_draw', { gameId: gId });
      this.showNotification('Draw offer sent to opponent captain.', 'info');
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



  invitePlayer(player: LobbyPlayer) {
    if (!isPlatformBrowser(this.platformId)) return;

    const inviteId = player.uid || Math.random().toString();
    const newInvite: SentInvite = { id: inviteId, receiver: player.name, status: 'pending' };
    this.bughouseInviteService.sentInvites.update((list) => [...list, newInvite]);
    this.showNotification(`Invite sent to ${player.name}!`, 'success');

    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_create_lobby');
      socket.emit('bughouse_invite_player', {
        receiverId: player.uid,
        receiverName: player.name,
      });
    }

    this.http
      .post(`${environment.apiUrl}/bughouse/invite`, {
        receiver_username: player.name,
      })
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  cancelSentInvite(inviteId: string) {
    this.bughouseInviteService.cancelSentInvite(inviteId);
    this.showNotification('Invite cancelled.', 'info');
  }

  startQueue() {
    if (!this.partner()) return;
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_join_queue');
    }
  }

  kickPartner() {
    this.partner.set(null);
    this.audioService.playNotification();

    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_kick_partner');
    }
  }

  acceptIncomingInvite(inviteId: string) {
    if (inviteId.startsWith('sim_')) {
      const invite = this.bughouseInviteService.incomingInvites().find((i) => i.id === inviteId);
      if (invite) {
        this.partner.set({ uid: invite.id, name: invite.sender, isOnline: true });
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
      const invite = this.bughouseInviteService.incomingInvites().find((i) => i.id === inviteId);
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

  private handleLobbySync = (lobby: any) => {
    this.ngZone.run(() => {
      if (!lobby) {
        this.partner.set(null);
        this.isHost.set(true);
        this.lobbyState.set('lobby');
        this.resetGame();
        return;
      }

      const myUser = this.authService.currentUser();
      const myUid = String(myUser?.uid);

      if (String(lobby.captain.userId) === myUid) {
        this.isHost.set(true);
        if (lobby.partner) {
          const partnerId = String(lobby.partner.userId);
          const currentPartner = this.partner();
          if (!currentPartner || currentPartner.uid !== partnerId) {
            this.partner.set({
              uid: partnerId,
              name: lobby.partner.userName,
              isOnline: true,
            });
            this.userService.getUserProfile(partnerId).subscribe({
              next: (profile) => {
                if (profile.bughouse_stats) {
                  this.partner.update((p) => p ? { ...p, stats: profile.bughouse_stats } : null);
                }
              },
            });
          }
          this.bughouseInviteService.sentInvites.set([]);
        } else {
          this.partner.set(null);
        }
      } else if (lobby.partner && String(lobby.partner.userId) === myUid) {
        this.isHost.set(false);
        const captainId = String(lobby.captain.userId);
        const currentPartner = this.partner();
        if (!currentPartner || currentPartner.uid !== captainId) {
          this.partner.set({
            uid: captainId,
            name: lobby.captain.userName,
            isOnline: true,
          });
          this.userService.getUserProfile(captainId).subscribe({
            next: (profile) => {
              if (profile.bughouse_stats) {
                this.partner.update((p) => p ? { ...p, stats: profile.bughouse_stats } : null);
              }
            },
          });
        }
      }

      if (lobby.variant) {
        this.variant.set(lobby.variant);
      }

      if (lobby.status === 'waiting') {
        if (this.lobbyState() !== 'playing') {
          this.lobbyState.set('lobby');
          this.resetGame();
        }
      } else if (lobby.status === 'queued') {
        this.lobbyState.set('queuing');
        if (this.lobbyState() !== 'playing') {
          this.resetGame();
        }
      } else if (lobby.status === 'matched') {
        if (this.lobbyState() !== 'playing') {
          this.lobbyState.set('lobby');
        }
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

  /**
   * Handles matchmaking queue cancellation emitted by either player.
   * 
   * WHY: Alerts the teammate when the search is cancelled and resets lobbyState.
   */
  private handleQueueCancelled = (data?: { cancelledByUserId?: string; cancelledByName?: string }) => {
    this.ngZone.run(() => {
      const myUid = String(this.authService.currentUser()?.uid);
      if (data && data.cancelledByUserId && String(data.cancelledByUserId) !== myUid) {
        const name = data.cancelledByName || 'Teammate';
        this.showNotification(`Matchmaking cancelled by ${name}.`, 'info');
        this.audioService.playNotification();
      }
      if (this.lobbyState() !== 'playing') {
        this.lobbyState.set('lobby');
      }
    });
  };

  private handleMatched = (data: any) => {
    this.ngZone.run(() => {
      this.opponent1.set({ name: data.opponent1.name, isOnline: true });
      this.opponent2.set({ name: data.opponent2.name, isOnline: true });
      this.audioService.playBoardStart();
      this.lobbyState.set('playing');
      this.startGame();
    });
  };

  private handleGameStart = (data: any) => {
    this.ngZone.run(() => {
      const isSpectator = data.isSpectator ?? false;
      const myUid = String(this.authService.currentUser()?.uid);
      const amIParticipant = !!(data.colors && data.colors[myUid]);

      if ((!isSpectator && amIParticipant) || (isSpectator && !amIParticipant && data.gameId === this.gameId())) {
        this.isSpectating.set(isSpectator);
        this.activeSidebarTab.set('players');

        if (isSpectator) {
          this.myBoard.set(null);
          this.myColor.set(null);
        } else {
          const myBoard: 'A' | 'B' = data.yourBoard ?? 'A';
          const myColor: 'w' | 'b' = data.yourColor ?? 'w';

          this.myBoard.set(myBoard);
          this.myColor.set(myColor);
          this.userColor.set(myColor);
          this.lobbyState.set('playing');
        }

        this.gameId.set(data.gameId);
        if (data.variant) {
          this.variant.set(data.variant);
        }

        const colorsMap: Record<string, { board: string; color: string }> = data.colors ?? {};
        let bAW = '';
        let bAB = '';
        let bBW = '';
        let bBB = '';

        const allPlayers = [
          { id: String(data.teamA.captainId), name: data.teamA.captainName },
          { id: String(data.teamA.partnerId), name: data.teamA.partnerName },
          { id: String(data.teamB.captainId), name: data.teamB.captainName },
          { id: String(data.teamB.partnerId), name: data.teamB.partnerName },
        ];
        for (const player of allPlayers) {
          const a = colorsMap[player.id];
          if (!a) continue;
          if (a.board === 'A' && a.color === 'w') bAW = player.name;
          if (a.board === 'A' && a.color === 'b') bAB = player.name;
          if (a.board === 'B' && a.color === 'w') bBW = player.name;
          if (a.board === 'B' && a.color === 'b') bBB = player.name;
        }

        const teamACaptainInfo = colorsMap[String(data.teamA.captainId)] || { board: '', color: '' };
        const teamAPartnerInfo = colorsMap[String(data.teamA.partnerId)] || { board: '', color: '' };
        const teamBCaptainInfo = colorsMap[String(data.teamB.captainId)] || { board: '', color: '' };
        const teamBPartnerInfo = colorsMap[String(data.teamB.partnerId)] || { board: '', color: '' };

        this.teamsState.set({
          teamA: {
            captain: { id: String(data.teamA.captainId), name: data.teamA.captainName || '', color: teamACaptainInfo.color || '', board: teamACaptainInfo.board || '' },
            partner: { id: String(data.teamA.partnerId), name: data.teamA.partnerName || '', color: teamAPartnerInfo.color || '', board: teamAPartnerInfo.board || '' },
          },
          teamB: {
            captain: { id: String(data.teamB.captainId), name: data.teamB.captainName || '', color: teamBCaptainInfo.color || '', board: teamBCaptainInfo.board || '' },
            partner: { id: String(data.teamB.partnerId), name: data.teamB.partnerName || '', color: teamBPartnerInfo.color || '', board: teamBPartnerInfo.board || '' },
          },
          boards: {
            boardA: { white: bAW, black: bAB },
            boardB: { white: bBW, black: bBB },
          }
        });

        this.syncBoardOrientations();

        this.chessA.load(data.boardAFen);
        this.chessB.load(data.boardBFen);
        this.boardAFen.set(data.boardAFen);
        this.boardBFen.set(data.boardBFen);

        this.pocketA_W.set({ ...data.pockets.A_W });
        this.pocketA_B.set({ ...data.pockets.A_B });
        this.pocketB_W.set({ ...data.pockets.B_W });
        this.pocketB_B.set({ ...data.pockets.B_B });

        this.timeA_W.set(data.clocks.A_W);
        this.timeA_B.set(data.clocks.A_B);
        this.timeB_W.set(data.clocks.B_W);
        this.timeB_B.set(data.clocks.B_B);

        if (data.movesHistory) {
          this.movesLog.set(data.movesHistory);
        } else {
          this.movesLog.set([]);
        }

        if (data.seriesRound) {
          this.seriesRound.set(data.seriesRound);
        }
        if (data.seriesScore) {
          this.seriesScore.set(data.seriesScore);
        }
        this.nextGameId.set(null);
        this.rematchOffers.set([]);
        this.rematchDeclined.set(false);
        this.rematchCooldown.set(false);
        this.cooldownRemainingSecs.set(0);
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }

        this.gameActive.set(true);
        this.startClocks();
      }
    });
  };

  private handleRequisitionStale = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId !== this.gameId()) return;

      const targetBoard = data.targetBoard || (data.board === 'A' ? 'B' : 'A');
      const freshFen = data.freshFen || (targetBoard === 'A' ? data.fenA : data.fenB);

      // 1. Instantly refresh the other board with the authoritative fresh FEN
      if (targetBoard === 'B') {
        this.chessB.load(freshFen);
        this.boardBFen.set(freshFen);
      } else {
        this.chessA.load(freshFen);
        this.boardAFen.set(freshFen);
      }

      // 2. Refresh pockets if provided
      if (data.pockets) {
        this.pocketA_W.set({ ...data.pockets.A_W });
        this.pocketA_B.set({ ...data.pockets.A_B });
        this.pocketB_W.set({ ...data.pockets.B_W });
        this.pocketB_B.set({ ...data.pockets.B_B });
      }

      // 3. Keep pawn staged on 8th rank! (pendingCannibalPromotion is NOT cleared)
    });
  };

  private handleMoveBroadcast = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.gameId()) {
        const myUid = String(this.authService.currentUser()?.uid);
        const isMyMove = data.senderId === myUid;

        if (data.senderId === 'server_rollback') {
          this.pendingCannibalPromotion.set(null);
          this.syncFens();
          return;
        }

        const pending = this.pendingCannibalPromotion();
        const isMyPromotionFinished = pending && (data.board === pending.board) && (!!data.plucked || !!data.move?.promotion);

        if (isMyPromotionFinished) {
          this.pendingCannibalPromotion.set(null);
        }

        if (data.fenA && data.fenB) {
          // If my board has a pending promotion staged and this broadcast was a move on the OTHER board,
          // only update the other board so we don't snap the staged pawn back
          if (pending && pending.board === 'A' && data.board === 'B') {
            this.chessB.load(data.fenB);
            this.boardBFen.set(data.fenB);
          } else if (pending && pending.board === 'B' && data.board === 'A') {
            this.chessA.load(data.fenA);
            this.boardAFen.set(data.fenA);
          } else {
            this.chessA.load(data.fenA);
            this.chessB.load(data.fenB);
            this.boardAFen.set(data.fenA);
            this.boardBFen.set(data.fenB);
          }
        } else if (data.board === 'A') {
          if (!pending || pending.board !== 'A') {
            this.chessA.load(data.fen);
            this.boardAFen.set(data.fen);
          }
        } else {
          if (!pending || pending.board !== 'B') {
            this.chessB.load(data.fen);
            this.boardBFen.set(data.fen);
          }
        }

        if (data.pockets) {
          this.pocketA_W.set({ ...data.pockets.A_W });
          this.pocketA_B.set({ ...data.pockets.A_B });
          this.pocketB_W.set({ ...data.pockets.B_W });
          this.pocketB_B.set({ ...data.pockets.B_B });
        }

        if (data.plucked) {
          this.lastPluckedPiece.set(data.plucked);

          setTimeout(() => {
            this.ngZone.run(() => {
              if (this.lastPluckedPiece() === data.plucked) {
                this.lastPluckedPiece.set(null);
              }
            });
          }, 3500);
        }

        if ((!isMyMove || isMyPromotionFinished) && data.move) {
          this.audioService.playChessMove({ san: data.move.san, flags: data.move.flags ?? 'n' });
        }

        if (data.moveEntry) {
          this.movesLog.update((log) => [...log, data.moveEntry]);
        }
      }
    });
  };

  private handleClockTick = (data: any) => {
    this.ngZone.run(() => {
      if (!data.gameId || data.gameId === this.gameId()) {
        this.lastTickTime = Date.now();

        const prev_A_W = this.timeA_W();
        const prev_B_W = this.timeB_W();
        const prev_A_B = this.timeA_B();
        const prev_B_B = this.timeB_B();

        this.timeA_W.set(data.clocks.A_W);
        this.timeA_B.set(data.clocks.A_B);
        this.timeB_W.set(data.clocks.B_W);
        this.timeB_B.set(data.clocks.B_B);

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

  private startCooldownCountdown(cooldownUntilMs: number) {
    if (this.rematchCooldownTimeout) {
      clearTimeout(this.rematchCooldownTimeout);
      this.rematchCooldownTimeout = null;
    }
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }

    const updateSecs = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntilMs - Date.now()) / 1000));
      this.cooldownRemainingSecs.set(remaining);
      if (remaining <= 0) {
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }
        this.rematchCooldown.set(false);
        this.rematchDeclined.set(false);
        const myLobbyId = this.myTeamLobbyId() || String(this.authService.currentUser()?.uid || '');
        if (myLobbyId) {
          this.rematchOffers.update((offers) => offers.filter((id) => String(id) !== String(myLobbyId)));
        }
      }
    };

    this.rematchCooldown.set(true);
    updateSecs();

    this.cooldownInterval = setInterval(() => {
      this.ngZone.run(updateSecs);
    }, 1000);
  }

  private handleGameOver = (data: any) => {
    this.ngZone.run(() => {
      if (!data.gameId || data.gameId === this.gameId()) {
        if (data.seriesRound) this.seriesRound.set(data.seriesRound);
        if (data.seriesScore) this.seriesScore.set(data.seriesScore);
        if (data.cooldownUntil && data.cooldownUntil > Date.now()) {
          this.startCooldownCountdown(data.cooldownUntil);
        }
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
      // Rollback optimistic offer if rejected by server
      if (errorMsg.includes('wait') || errorMsg.includes('rate-limited') || errorMsg.includes('offline') || errorMsg.includes('expired')) {
        const myLobbyId = this.myTeamLobbyId() || String(this.authService.currentUser()?.uid || '');
        if (myLobbyId) {
          this.rematchOffers.update((offers) => offers.filter((id) => String(id) !== String(myLobbyId)));
        }
        if (errorMsg.includes('offline') || errorMsg.includes('expired')) {
          if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
          }
          this.rematchCooldown.set(false);
          this.cooldownRemainingSecs.set(0);
        }
      }
    });
  };

  private handleRematchStatus = (data: any) => {
    this.ngZone.run(() => {
      console.log('[Bughouse] Received bughouse_rematch_status:', data, 'Current gameId:', this.gameId());
      if (!data) return;
      if (!this.gameId() || data.gameId === this.gameId() || this.winner()) {
        if (data.gameId && (!this.gameId() || this.winner())) this.gameId.set(data.gameId);
        this.rematchOffers.set((data.offers || []).map(String));
        if (data.seriesRound) this.seriesRound.set(data.seriesRound);
        const myLobbyId = this.myTeamLobbyId() || String(this.authService.currentUser()?.uid || '');
        const isMyTeamInOffers = myLobbyId && (data.offers || []).map(String).includes(String(myLobbyId));
        if (isMyTeamInOffers && !this.rematchCooldown()) {
          this.startCooldownCountdown(Date.now() + 60000);
        }
      }
    });
  };

  private handleRematchCancelled = (data: any) => {
    this.ngZone.run(() => {
      console.log('[Bughouse] Received bughouse_rematch_cancelled:', data);
      if (!this.gameId() || data?.gameId === this.gameId() || this.winner()) {
        this.rematchOffers.set([]);
        if (data?.reason === 'lobby_left') {
          this.showNotification('Opponent lobby left the match.', 'info');
        } else if (data?.reason === 'declined') {
          this.rematchDeclined.set(true);
        } else if (data?.reason === 'cancelled_by_team') {
          if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
          }
          this.rematchCooldown.set(false);
          this.cooldownRemainingSecs.set(0);
        }
      }
    });
  };

  private handleRematchDeclined = (data: any) => {
    this.ngZone.run(() => {
      console.log('[Bughouse] Received bughouse_rematch_declined:', data);
      if (!this.gameId() || data?.gameId === this.gameId() || this.winner()) {
        this.rematchOffers.set([]);
        this.rematchDeclined.set(true);
        const cooldownUntil = data?.cooldownUntil || (Date.now() + (data?.cooldownMs || 60000));
        this.startCooldownCountdown(cooldownUntil);
      }
    });
  };

  private handleRematchOfferExpired = (data: any) => {
    this.ngZone.run(() => {
      console.log('[Bughouse] Received bughouse_rematch_offer_expired:', data);
      if (!this.gameId() || data?.gameId === this.gameId() || this.winner()) {
        this.rematchOffers.set([]);
        this.rematchDeclined.set(false);
        this.rematchCooldown.set(false);
        this.cooldownRemainingSecs.set(0);
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }
      }
    });
  };

  private handleRematchTaken = (data: any) => {
    this.ngZone.run(() => {
      console.log('[Bughouse] Received bughouse_rematch_taken:', data);
      if (!this.gameId() || data?.prevGameId === this.gameId() || this.winner()) {
        this.nextGameId.set(data?.nextGameId);
        if (data?.seriesRound) this.seriesRound.set(data.seriesRound);
        if (data?.seriesScore) this.seriesScore.set(data.seriesScore);
      }
    });
  };

  private handleDrawOffered = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.gameId() && this.isHost()) {
        this.showNotification(`${data.offeredBy || 'Opponent captain'} offered a draw.`, 'info');
      }
    });
  };

  private setupSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    this.removeSocketListeners();

    socket.on('bughouse_lobby_sync', this.handleLobbySync);
    socket.on('bughouse_queue_cancelled', this.handleQueueCancelled);
    socket.on('bughouse_invite_rejected', this.handleInviteRejected);
    socket.on('bughouse_kicked', this.handleKicked);
    socket.on('bughouse_matched', this.handleMatched);
    socket.on('bughouse_game_start', this.handleGameStart);
    socket.on('bughouse_move_broadcast', this.handleMoveBroadcast);
    socket.on('bughouse_requisition_stale', this.handleRequisitionStale);
    socket.on('bughouse_clock_tick', this.handleClockTick);
    socket.on('bughouse_game_over', this.handleGameOver);
    socket.on('bughouse_opponent_disconnected', this.handleOpponentDisconnected);
    socket.on('bughouse_error', this.handleBughouseError);
    socket.on('bughouse_draw_offered', this.handleDrawOffered);
    socket.on('bughouse_rematch_status', this.handleRematchStatus);
    socket.on('bughouse_rematch_cancelled', this.handleRematchCancelled);
    socket.on('bughouse_rematch_declined', this.handleRematchDeclined);
    socket.on('bughouse_rematch_offer_expired', this.handleRematchOfferExpired);
    socket.on('bughouse_rematch_taken', this.handleRematchTaken);

    socket.emit('bughouse_join');
  }

  private removeSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    socket.off('bughouse_lobby_sync', this.handleLobbySync);
    socket.off('bughouse_queue_cancelled', this.handleQueueCancelled);
    socket.off('bughouse_invite_rejected', this.handleInviteRejected);
    socket.off('bughouse_kicked', this.handleKicked);
    socket.off('bughouse_matched', this.handleMatched);
    socket.off('bughouse_game_start', this.handleGameStart);
    socket.off('bughouse_move_broadcast', this.handleMoveBroadcast);
    socket.off('bughouse_requisition_stale', this.handleRequisitionStale);
    socket.off('bughouse_clock_tick', this.handleClockTick);
    socket.off('bughouse_game_over', this.handleGameOver);
    socket.off('bughouse_opponent_disconnected', this.handleOpponentDisconnected);
    socket.off('bughouse_error', this.handleBughouseError);
    socket.off('bughouse_draw_offered', this.handleDrawOffered);
    socket.off('bughouse_rematch_status', this.handleRematchStatus);
    socket.off('bughouse_rematch_cancelled', this.handleRematchCancelled);
    socket.off('bughouse_rematch_declined', this.handleRematchDeclined);
    socket.off('bughouse_rematch_offer_expired', this.handleRematchOfferExpired);
    socket.off('bughouse_rematch_taken', this.handleRematchTaken);
  }

  ngOnDestroy() {
    this.removeSocketListeners();
    if (this.rematchCooldownTimeout) {
      clearTimeout(this.rematchCooldownTimeout);
      this.rematchCooldownTimeout = null;
    }
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.stopClocks();
  }
}
