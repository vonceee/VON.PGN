import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChallengeService } from '../../../../core/services/challenge.service';
import { ButtonComponent } from '@shared/ui';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCheck, heroXMark, heroTrophy } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-challenge-notification',
  standalone: true,
  imports: [CommonModule, ButtonComponent, NgIcon],
  providers: [provideIcons({ heroCheck, heroXMark, heroTrophy })],
  template: `
    <div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      @for (challenge of challengeService.incomingChallenges(); track challenge.id) {
        <div
          class="pointer-events-auto ui-panel w-80 border border-accent/20 p-5 animate-in slide-in-from-right-full duration-300"
        >
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <ng-icon name="heroTrophy" class="text-accent text-xl"></ng-icon>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate">
                {{ challenge.challenger.name }}
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Challenged you to a <span class="font-bold text-accent">{{ formatTime(challenge.settings.timeControl) }}</span> game.
              </p>
            </div>
          </div>

          <div class="mt-5 flex items-center gap-2">
            <button
              appButton
              variant="primary"
              class="flex-1 text-xs py-2"
              (click)="challengeService.acceptChallenge(challenge.id)"
            >
              <ng-icon name="heroCheck" class="mr-1"></ng-icon>
              Accept
            </button>
            <button
              appButton
              variant="outline"
              class="flex-1 text-xs py-2"
              (click)="challengeService.declineChallenge(challenge.id)"
            >
              <ng-icon name="heroXMark" class="mr-1"></ng-icon>
              Decline
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ChallengeNotificationComponent {
  challengeService = inject(ChallengeService);

  formatTime(timeControl: string): string {
    const [base, inc] = timeControl.split('+');
    const mins = Math.floor(parseInt(base) / 60);
    return `${mins}+${inc}`;
  }
}
