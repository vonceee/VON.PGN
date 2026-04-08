import { Injectable, inject, signal } from '@angular/core';
import { Socket } from 'socket.io-client';
import { GameService } from './game.service';
import { Router } from '@angular/router';

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
  endTime: number;
  isWaiting: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ArenaService {
  private gameService = inject(GameService);
  private router = inject(Router);

  activeArena = signal<ArenaState | null>(null);
  leaderboard = signal<ArenaParticipant[]>([]);
  isWaiting = signal(false);
  countdown = signal<string>('00:00:00');

  private timerInterval: any;

  constructor() {}

  joinArena(arenaId: string, name: string, rating: number, timeControl: string = '3+0') {
    const socket = this.gameService['socket']; // Accessing private socket for now
    if (!socket) {
      console.error('[ArenaService] Socket not initialized');
      return;
    }

    socket.emit('join_arena', { arenaId, name, rating, timeControl });

    socket.on('arena_joined', (data: any) => {
      this.activeArena.set({
        arenaId: data.arenaId,
        leaderboard: [],
        endTime: data.endTime,
        isWaiting: data.isWaiting
      });
      this.startCountdown(data.endTime);
    });

    socket.on('arena_leaderboard_update', (data: any) => {
      this.leaderboard.set(data.leaderboard);
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
      console.log('[Arena] Game matched:', data.gameId);
      this.router.navigate(['/play', data.gameId]);
    });
  }

  startPairing() {
    const arena = this.activeArena();
    const socket = this.gameService['socket'];
    if (arena && socket) {
      socket.emit('start_pairing', arena.arenaId);
    }
  }

  stopPairing() {
    const arena = this.activeArena();
    const socket = this.gameService['socket'];
    if (arena && socket) {
      socket.emit('stop_pairing', arena.arenaId);
    }
  }

  leaveArena() {
    const arena = this.activeArena();
    const socket = this.gameService['socket'];
    if (arena && socket) {
      socket.emit('leave_arena', arena.arenaId);
      this.activeArena.set(null);
      this.stopCountdown();
    }
  }

  private startCountdown(endTime: number) {
    this.stopCountdown();
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        this.countdown.set('00:00:00');
        this.stopCountdown();
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      this.countdown.set(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
  }

  private stopCountdown() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private getUserId() {
    // Helper to get current user ID
    return this.gameService['authService'].currentUser()?.uid;
  }
}
