import { Injectable, signal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface TvGame {
  gameId: string;
  fen: string;
  whitePlayer: any;
  blackPlayer: any;
  whiteTimeRemainingMs: number;
  blackTimeRemainingMs: number;
  turn: string;
  timeControl: string;
}

export interface TvState {
  bullet: TvGame | null;
  blitz: TvGame | null;
  rapid: TvGame | null;
}

@Injectable({
  providedIn: 'root'
})
export class TvService implements OnDestroy {
  private socket: Socket | null = null;
  private socketUrl = environment.chessMicroserviceUrl || 'http://localhost:3006';

  tvState = signal<TvState>({ bullet: null, blitz: null, rapid: null });

  joinTv(): void {
    if (!this.socket) {
      this.socket = io(this.socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        this.socket?.emit('join_tv');
      });

      this.socket.on('tv_state', (data: TvState) => {
        this.tvState.set(data);
      });

      this.socket.on('tv_switch_game', (data: any) => {
        const { category, ...gameData } = data;
        const validCategory = category as keyof TvState;
        this.tvState.update(state => ({
          ...state,
          [validCategory]: gameData
        }));
      });

      this.socket.on('tv_move', (data: any) => {
        const { category, gameId, fen, turn, whiteTimeRemainingMs, blackTimeRemainingMs } = data;
        const validCategory = category as keyof TvState;
        this.tvState.update(state => {
          const catState = state[validCategory];
          if (catState && catState.gameId === gameId) {
            return {
              ...state,
              [validCategory]: {
                ...catState,
                fen,
                turn,
                whiteTimeRemainingMs,
                blackTimeRemainingMs
              }
            };
          }
          return state;
        });
      });
    } else if (this.socket.connected) {
      this.socket.emit('join_tv');
    }
  }

  leaveTv(): void {
    if (this.socket) {
      this.socket.emit('leave_tv');
      this.socket.disconnect();
      this.socket = null;
    }
    this.tvState.set({ bullet: null, blitz: null, rapid: null });
  }

  ngOnDestroy(): void {
    this.leaveTv();
  }
}
