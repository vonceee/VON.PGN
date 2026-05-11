import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Arena } from '../models/arena.model';
import { environment } from '../../../environments/environment';
import { Observable, Subject, map, tap, catchError, of } from 'rxjs';
import { Injectable, inject, signal } from '@angular/core';
import { GameService } from './game.service';
import { AuthService } from './auth.service';

export interface ArenaParticipant {
  userId: string;
  name: string;
  score: number;
  streak: number;
  rating: number;
  isWaiting: boolean;
}

export interface ArenaState {
  arenaId: string;
  leaderboard: ArenaParticipant[];
  startTime: number;
  endTime: number;
  isWaiting: boolean;
  isStarted: boolean;
  status: 'upcoming' | 'ongoing' | 'past';
  winner?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ArenaService {
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private chessUrl = environment.chessMicroserviceUrl;

  gameId = signal<string | null>(null);
  arenas = signal<Arena[]>([]);
  activeArena = signal<ArenaState | null>(null);
  leaderboard = signal<ArenaParticipant[]>([]);
  isWaiting = signal(false);
  countdown = signal<string>('00:00:00');
  countdownLabel = signal<string>('Starting in');
  topGameId = signal<string | null>(null);

  private timerInterval: any;
  private serverTimeOffset = 0;

  private chatMessageSubject = new Subject<any>();
  onChatMessage$ = this.chatMessageSubject.asObservable();

  constructor() {
    this.syncServerTime();
  }

  private syncServerTime() {
    this.http.get<{ timestamp: string }>(`${this.chessUrl}/api/ping`).pipe(
      catchError(err => {
        console.warn('[ArenaService] Failed to sync server time:', err);
        return of({ timestamp: new Date().toISOString() });
      })
    ).subscribe(res => {
      const serverTime = new Date(res.timestamp).getTime();
      const localTime = Date.now();
      this.serverTimeOffset = serverTime - localTime;
      console.log('[ArenaService] Microservice time sync offset:', this.serverTimeOffset);
    });
  }

  // HTTP Methods
  fetchArenas() {
    return this.http.get<{ data: Arena[] }>(`${this.apiUrl}/arenas`).pipe(
      tap((res) => {
        this.arenas.set(res.data);
      })
    );
  }

  createMyArena(data: any): Observable<Arena> {
    return this.http
      .post<{ data: Arena }>(`${this.apiUrl}/my/arenas`, data)
      .pipe(map((res) => res.data));
  }

  // Socket Logic
  joinArena(arenaId: string, name: string, rating: number, timeControl: string = '3+0') {
    const socket = this.gameService.socket();
    if (!socket) {
      console.error('[ArenaService] Socket not initialized');
      return;
    }

    socket.emit('join_arena', { arenaId, name, rating, timeControl });

    socket.off('arena_joined');
    socket.off('arena_started');
    socket.off('arena_leaderboard_update');
    socket.off('pairing_started');
    socket.off('pairing_stopped');
    socket.off('arena_game_matched');
    socket.off('arena_ended');
    socket.off('arena_chat_message');

    socket.on('arena_chat_message', (payload: any) => {
      this.chatMessageSubject.next(payload);
    });

    socket.on('arena_joined', (data: any) => {
      console.log('[ArenaService] arena_joined received:', data);
      this.activeArena.set({
        arenaId: data.arenaId,
        leaderboard: [],
        startTime: data.startTime,
        endTime: data.endTime,
        isWaiting: data.isWaiting,
        isStarted: Date.now() + this.serverTimeOffset >= data.startTime,
        status: data.status || 'ongoing',
        winner: data.winner
      });
      this.isWaiting.set(data.isWaiting);
      if (data.isWaiting) {
        this.gameService.isSearching.set(true);
      }
      this.startCountdown(data.startTime, data.endTime);
    });

    socket.on('arena_started', () => {
      const current = this.activeArena();
      if (current) {
        this.activeArena.set({ ...current, isStarted: true });
      }
    });

    socket.on('arena_leaderboard_update', (data: any) => {
      this.leaderboard.set(data.leaderboard);
      this.topGameId.set(data.topGameId || null);
      // Update our own isWaiting status based on leaderboard if needed
      const me = data.leaderboard.find((p: any) => p.userId === this.getUserId());
      if (me) {
        this.isWaiting.set(me.isWaiting);
      }
    });

    socket.on('pairing_started', () => {
      this.isWaiting.set(true);
    });

    socket.on('pairing_stopped', () => {
      this.isWaiting.set(false);
    });

    socket.on('arena_game_matched', (data: any) => {
      console.log('[Arena] Match found:', data.gameId);
      const myId = this.getUserId();
      const isMe = data.whiteId == myId || data.blackId == myId || data.white == myId || data.black == myId;
      if (!isMe) return;

      this.gameId.set(data.gameId);
      this.gameService.clearGame(false);
      this.router.navigate(['/play', data.gameId]);
      this.gameService.isSearching.set(false);
    });

    socket.on('arena_ended', (data: any) => {
      console.log('[Arena] Tournament finished');
      this.isWaiting.set(false);
      this.gameService.isSearching.set(false);
      this.stopCountdown();
      // Optional: Refresh arena data from Laravel to get official past status
      if (this.activeArena()) {
        this.joinArena(this.activeArena()!.arenaId, '', 0); 
      }
    });
  }

  startPairing() {
    const socket = this.gameService.socket();
    if (socket && this.activeArena()) {
      socket.emit('start_pairing', this.activeArena()?.arenaId);
      this.gameService.isSearching.set(true);
      console.log('[Arena] Pairing started, polling activated');
    }
  }

  stopPairing() {
    const socket = this.gameService.socket();
    if (socket && this.activeArena()) {
      socket.emit('stop_pairing', this.activeArena()?.arenaId);
      this.gameService.isSearching.set(false);
    }
  }

  leaveArena() {
    const arena = this.activeArena();
    const socket = this.gameService.socket();
    if (arena && socket) {
      socket.emit('leave_arena', arena.arenaId);
      this.activeArena.set(null);
      this.stopCountdown();
    }
  }

  getArenaMessages(arenaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arenas/${arenaId}/messages`);
  }

  sendArenaChatMessage(arenaId: string, text: string): void {
    const socket = this.gameService.socket();
    if (socket) {
      socket.emit('arena_send_chat', { arenaId, text });
    }
    // Also persist to DB
    this.http.post(`${this.apiUrl}/arenas/${arenaId}/messages`, { body: text }).subscribe();
  }

  private startCountdown(startTime: number, endTime: number) {
    this.stopCountdown();
    this.timerInterval = setInterval(() => {
      const now = Date.now() + this.serverTimeOffset;

      let target = startTime;
      let label = 'Starting in';

      if (now >= startTime) {
        target = endTime;
        label = 'Time left';
        
        // Transition status to ongoing if it was upcoming
        const current = this.activeArena();
        if (current && current.status === 'upcoming') {
           this.activeArena.set({ ...current, status: 'ongoing', isStarted: true });
        }
      }

      this.countdownLabel.set(label);
      const diff = target - now;

      if (diff <= 0 && label === 'Time left') {
        this.countdown.set('00:00:00');
        this.stopCountdown();
        
        // Finalize status to past
        const current = this.activeArena();
        if (current && current.status !== 'past') {
           this.activeArena.set({ ...current, status: 'past', isStarted: true });
        }
        return;
      }

      const safeDiff = Math.max(0, diff);
      const h = Math.floor(safeDiff / 3600000);
      const m = Math.floor((safeDiff % 3600000) / 60000);
      const s = Math.floor((safeDiff % 60000) / 1000);

      this.countdown.set(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      );
    }, 1000);
  }

  private stopCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private getUserId() {
    return this.authService.currentUser()?.uid;
  }
}
