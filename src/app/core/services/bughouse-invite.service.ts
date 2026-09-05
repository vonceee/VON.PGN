import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GameService } from './game.service';
import { AudioService } from './audio.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface IncomingBughouseInvite {
  id: string;      // The lobby ID (Captain's user ID)
  sender: string;  // Captain's username
}

export interface SentInvite {
  id: string;
  receiver: string;
  status: 'pending' | 'accepted' | 'rejected';
}

@Injectable({
  providedIn: 'root'
})
export class BughouseInviteService {
  private gameService = inject(GameService);
  private audioService = inject(AudioService);
  private router = inject(Router);
  private http = inject(HttpClient);

  incomingInvites = signal<IncomingBughouseInvite[]>([]);
  sentInvites = signal<SentInvite[]>([]);
  cancellingInvites = signal<Record<string, boolean>>({});

  constructor() {
    effect((onCleanup) => {
      const socket = this.gameService.socket();
      untracked(() => {
        if (socket) {
          socket.on('bughouse_invite_received', this.handleInviteReceived);
          socket.on('bughouse_invite_cancelled', this.handleInviteCancelled);
          socket.on('bughouse_invite_rejected', this.handleInviteRejected);
          socket.on('bughouse_lobby_sync', this.handleLobbySync);

          const emitSync = () => {
            console.log('BughouseInviteService: Emitting bughouse_sync_invites & bughouse_join. Socket connected:', socket.connected);
            socket.emit('bughouse_sync_invites');
            socket.emit('bughouse_join');
          };

          if (socket.connected) {
            emitSync();
          } else {
            socket.on('connect', emitSync);
          }

          onCleanup(() => {
            socket.off('bughouse_invite_received', this.handleInviteReceived);
            socket.off('bughouse_invite_cancelled', this.handleInviteCancelled);
            socket.off('bughouse_invite_rejected', this.handleInviteRejected);
            socket.off('bughouse_lobby_sync', this.handleLobbySync);
            socket.off('connect', emitSync);
          });
        }
      });
    });
  }

  private handleInviteReceived = (data: { lobbyId: string; senderId: string; senderName: string }) => {
    console.log('BughouseInviteService: Received bughouse_invite_received event:', data);
    this.incomingInvites.update(list => [
      ...list.filter(i => i.id !== data.lobbyId),
      { id: data.lobbyId, sender: data.senderName }
    ]);
    this.audioService.playNotification();
  };

  private handleInviteCancelled = (data: { lobbyId: string; senderId: string }) => {
    console.log('BughouseInviteService: Received bughouse_invite_cancelled event:', data);
    this.incomingInvites.update(list => list.filter(i => i.id !== data.lobbyId));
  };

  private handleInviteRejected = (data: { inviteeName: string }) => {
    console.log('BughouseInviteService: Received bughouse_invite_rejected event:', data);
    this.sentInvites.set([]);
    this.audioService.playNotification();
  };

  private handleLobbySync = (lobby: any) => {
    console.log('BughouseInviteService: Received bughouse_lobby_sync event:', lobby);
    if (!lobby) {
      this.sentInvites.set([]);
      return;
    }
    if (lobby.partner) {
      this.sentInvites.set([]);
    } else if (lobby.inviteeList && lobby.inviteeList.length > 0) {
      const mapped: SentInvite[] = lobby.inviteeList.map((i: any) => ({
        id: i.userId,
        receiver: i.userName,
        status: 'pending'
      }));
      this.sentInvites.set(mapped);
      
      this.cancellingInvites.update(record => {
        const next = { ...record };
        const activeIds = new Set(mapped.map(item => item.id));
        for (const key of Object.keys(next)) {
          if (!activeIds.has(key)) {
            delete next[key];
          }
        }
        return next;
      });
    } else {
      this.sentInvites.set([]);
    }
  };

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

  dismissInvite(lobbyId: string) {
    this.rejectInvite(lobbyId);
  }

  cancelSentInvite(inviteId: string) {
    const invite = this.sentInvites().find(i => i.id === inviteId);
    if (!invite) return;

    this.cancellingInvites.update(record => ({
      ...record,
      [inviteId]: true
    }));

    const socket = this.gameService.socket();
    if (socket && socket.connected) {
      socket.emit('bughouse_leave_lobby');
    }

    this.http.post(`${environment.apiUrl}/bughouse/cancel-invite`, {
      receiver_username: invite.receiver
    }).subscribe({
      next: () => {
        this.sentInvites.update(list => list.filter(i => i.id !== inviteId));
        this.cancellingInvites.update(record => {
          const next = { ...record };
          delete next[inviteId];
          return next;
        });
      },
      error: () => {
        this.cancellingInvites.update(record => {
          const next = { ...record };
          delete next[inviteId];
          return next;
        });
      }
    });
  }
}
