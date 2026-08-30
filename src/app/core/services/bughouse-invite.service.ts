import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GameService } from './game.service';
import { AudioService } from './audio.service';
import { Router } from '@angular/router';

export interface IncomingBughouseInvite {
  id: string;      // The lobby ID (Captain's user ID)
  sender: string;  // Captain's username
}

@Injectable({
  providedIn: 'root'
})
export class BughouseInviteService {
  private gameService = inject(GameService);
  private audioService = inject(AudioService);
  private router = inject(Router);

  incomingInvites = signal<IncomingBughouseInvite[]>([]);

  constructor() {
    effect(() => {
      const socket = this.gameService.socket();
      untracked(() => {
        if (socket) {
          // console.log('BughouseInviteService: Socket available, binding invite listeners...');
          socket.off('bughouse_invite_received');
          socket.off('bughouse_invite_cancelled');

          socket.on('bughouse_invite_received', (data: { lobbyId: string; senderId: string; senderName: string }) => {
            console.log('BughouseInviteService: Received bughouse_invite_received event:', data);
            // Remove any existing invite from the same sender lobby before adding to prevent duplicates
            this.incomingInvites.update(list => [
              ...list.filter(i => i.id !== data.lobbyId),
              { id: data.lobbyId, sender: data.senderName }
            ]);
            this.audioService.playNotification();
          });

          socket.on('bughouse_invite_cancelled', (data: { lobbyId: string; senderId: string }) => {
            console.log('BughouseInviteService: Received bughouse_invite_cancelled event:', data);
            this.incomingInvites.update(list => list.filter(i => i.id !== data.lobbyId));
          });

          // Bind sync emit to connect event or fire immediately if already connected
          const emitSync = () => {
            console.log('BughouseInviteService: Emitting bughouse_sync_invites. Socket connected:', socket.connected);
            socket.emit('bughouse_sync_invites');
          };

          socket.off('connect');
          if (socket.connected) {
            emitSync();
          } else {
            socket.on('connect', () => {
              emitSync();
            });
          }
        }
      });
    });
  }

  acceptInvite(lobbyId: string) {
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_accept_invite', { lobbyId });
    }
    this.incomingInvites.update(list => list.filter(i => i.id !== lobbyId));
    this.router.navigate(['/bughouse']);
  }

  rejectInvite(lobbyId: string) {
    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_reject_invite', { lobbyId });
    }
    this.incomingInvites.update(list => list.filter(i => i.id !== lobbyId));
  }
}
