import { Injectable, inject, signal, computed, effect, untracked, NgZone, PLATFORM_ID } from '@angular/core';
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

@Injectable({
  providedIn: 'root',
})
export class BughouseGameStateService {
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

  private timerInterval: any = null;
  private lastTickTime: number = 0;

  myTeamLobbyId = computed(() => {
    const myUid = this.authService.currentUser()?.uid;
    if (!myUid) return null;
    return this.isHost() ? String(myUid) : (this.partner()?.uid ? String(this.partner()?.uid) : null);
  });

  hasMyTeamOfferedRematch = computed(() => {
    const myLobbyId = this.myTeamLobbyId();
    if (!myLobbyId) return false;
    return this.rematchOffers().includes(myLobbyId);
  });

  hasOpponentTeamOfferedRematch = computed(() => {
    const myLobbyId = this.myTeamLobbyId();
    if (!myLobbyId) return false;
    return this.rematchOffers().some(id => id !== myLobbyId);
  });

  gameOverState = computed<BughouseGameOverState>(() => ({
    winner: this.winner(),
    gameEndReason: this.gameEndReason(),
    rematchDeclined: this.rematchDeclined(),
    rematchOffers: this.rematchOffers(),
    hasMyTeamOfferedRematch: this.hasMyTeamOfferedRematch(),
    hasOpponentTeamOfferedRematch: this.hasOpponentTeamOfferedRematch(),
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
    this.rematchOffers.set([]);
    this.rematchDeclined.set(false);
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
    this.boardAFen.set(this.chessA.fen());
    this.boardBFen.set(this.chessB.fen());
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

  offerRematch() {
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_offer_rematch', { gameId: gId });
    }
  }

  declineRematch() {
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_decline_rematch', { gameId: gId });
    }
  }

  resign() {
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_resign', { gameId: gId });
    }
  }

  offerDraw() {
    const socket = this.gameService.socket();
    const gId = this.gameId();
    if (socket?.connected && gId) {
      socket.emit('bughouse_offer_draw', { gameId: gId });
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
    this.bughouseInviteService.isInvitesOpen.set(true);

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

        this.gameActive.set(true);
        this.startClocks();
      }
    });
  };

  private handleMoveBroadcast = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.gameId()) {
        const myUid = String(this.authService.currentUser()?.uid);
        const isMyMove = data.senderId === myUid;

        if (data.board === 'A') {
          this.chessA.load(data.fen);
          this.boardAFen.set(data.fen);
        } else {
          this.chessB.load(data.fen);
          this.boardBFen.set(data.fen);
        }

        this.pocketA_W.set({ ...data.pockets.A_W });
        this.pocketA_B.set({ ...data.pockets.A_B });
        this.pocketB_W.set({ ...data.pockets.B_W });
        this.pocketB_B.set({ ...data.pockets.B_B });

        if (!isMyMove) {
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

  private handleGameOver = (data: any) => {
    this.ngZone.run(() => {
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

  private handleRematchStatus = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.gameId()) {
        this.rematchOffers.set(data.offers);
      }
    });
  };

  private handleRematchCancelled = (data: any) => {
    this.ngZone.run(() => {
      if (data.gameId === this.gameId()) {
        this.rematchDeclined.set(true);
        this.rematchOffers.set([]);
      }
    });
  };

  private setupSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

    this.removeSocketListeners();

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
    socket.on('bughouse_rematch_status', this.handleRematchStatus);
    socket.on('bughouse_rematch_cancelled', this.handleRematchCancelled);

    socket.emit('bughouse_join');
  }

  private removeSocketListeners() {
    const socket = this.gameService.socket();
    if (!socket) return;

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
    socket.off('bughouse_rematch_status', this.handleRematchStatus);
    socket.off('bughouse_rematch_cancelled', this.handleRematchCancelled);
  }
}
