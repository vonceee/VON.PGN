import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GameService } from './game.service';
import { Challenge, ChallengeSettings } from '../models/game.model';
import { AudioService } from './audio.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ChallengeService {
  private gameService = inject(GameService);
  private audioService = inject(AudioService);
  private router = inject(Router);

  incomingChallenges = signal<Challenge[]>([]);
  outgoingChallenges = signal<Challenge[]>([]);

  constructor() {
    effect(() => {
      const socket = this.gameService.socket();
      untracked(() => {
        if (socket) {
          socket.off('challenge_offered');
          socket.off('challenge_issued');
          socket.off('challenge_accepted');
          socket.off('challenge_declined');
          socket.off('challenge_canceled');

          socket.on('challenge_offered', (challenge: Challenge) => {
            this.incomingChallenges.update(prev => [...prev, challenge]);
            this.audioService.playNotification();
          });

          socket.on('challenge_issued', (challenge: Challenge) => {
            this.outgoingChallenges.update(prev => [...prev, challenge]);
          });

          socket.on('challenge_accepted', (data: { challengeId: string, gameId: string }) => {
            this.incomingChallenges.update(prev => prev.filter(c => c.id !== data.challengeId));
            this.outgoingChallenges.update(prev => prev.filter(c => c.id !== data.challengeId));
            this.audioService.playMatchFound();
            this.router.navigate(['/play', data.gameId]);
          });

          socket.on('challenge_declined', (data: { challengeId: string }) => {
            this.outgoingChallenges.update(prev => prev.filter(c => c.id !== data.challengeId));
          });

          socket.on('challenge_canceled', (data: { challengeId: string }) => {
            this.incomingChallenges.update(prev => prev.filter(c => c.id !== data.challengeId));
          });
        }
      });
    });
  }

  issueChallenge(targetUserId: number, settings: ChallengeSettings) {
    const socket = this.gameService.socket();
    if (!socket?.connected) return;

    socket.emit('issue_challenge', { targetUserId, settings });
  }

  acceptChallenge(challengeId: string) {
    const socket = this.gameService.socket();
    if (!socket?.connected) return;

    socket.emit('accept_challenge', { challengeId });
  }

  declineChallenge(challengeId: string) {
    const socket = this.gameService.socket();
    if (!socket?.connected) return;

    socket.emit('decline_challenge', { challengeId });
  }

  cancelChallenge(challengeId: string) {
    const socket = this.gameService.socket();
    if (!socket?.connected) return;

    socket.emit('cancel_challenge', { challengeId });
  }
}
