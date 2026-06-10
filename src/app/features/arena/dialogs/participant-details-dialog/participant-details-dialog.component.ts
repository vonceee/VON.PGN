import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { RouterLink } from '@angular/router';
import { ArenaParticipant } from '../../../../core/services/arena.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';

@Component({
  selector: 'app-participant-details-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DialogWrapperComponent, RouterLink],
  template: `
    <app-dialog-wrapper [title]="player.name" (close)="dialogRef.close()">
      <div class="space-y-6">
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div class="stat-card">
            <span class="stat-label">Performance</span>
            <span class="stat-value">{{ player.performance || '-' }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Games played</span>
            <span class="stat-value">{{ player.games?.length || 0 }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Win rate</span>
            <span class="stat-value">{{ winRate() }}%</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Avg opponent</span>
            <span class="stat-value">{{ avgOpponentRating() }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Points</span>
            <span class="stat-value">{{ player.score }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Rank</span>
            <span class="stat-value">#{{ data.rank }}</span>
          </div>
        </div>

        <!-- Games List -->
        <div class="space-y-3">
          <label class="text-xs font-semibold text-muted uppercase">Tournament Games</label>
          <div class="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-1">
            @for (game of player.games?.slice()?.reverse(); track game.gameId; let i = $index) {
              <div class="flex items-center justify-between p-3 bg-subtle border border-border-base rounded-lg group hover:border-accent/30 transition-all">
                <div class="flex items-center gap-4">
                  <span class="text-xs font-bold text-muted w-4">{{ player.games!.length - i }}</span>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <span class="text-xs w-3 h-3 rounded-sm border border-border-base" [class.bg-white]="game.color === 'white'" [class.bg-black]="game.color === 'black'"></span>
                      <a [routerLink]="['/play', game.gameId]" (click)="dialogRef.close()" class="text-sm font-semibold text-content transition-colors">
                        {{ game.opponentName }}
                      </a>
                    </div>
                    <span class="text-xs text-muted">{{ game.opponentRating }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-6">
                  <span class="text-xs font-bold uppercase" [class.text-green-500]="game.result === 'win'" [class.text-orange-500]="game.result === 'draw'" [class.text-muted]="game.result === 'loss'">
                    {{ game.result }}
                  </span>
                  <span class="text-sm font-bold tabular-nums w-4 text-right" [class.text-accent]="game.points > 2">
                    {{ game.points }}
                  </span>
                </div>
              </div>
            } @empty {
              <div class="py-8 text-center text-sm text-muted italic">No games played yet</div>
            }
          </div>
        </div>
      </div>

      <button actions appButton variant="outline" class="w-full" (click)="dialogRef.close()">Close</button>
    </app-dialog-wrapper>
  `,
  styles: [`
    @reference "../../../../../styles.css";
    .stat-card {
      @apply flex flex-col p-3 bg-subtle border border-border-base rounded-xl;
    }
    .stat-label {
      @apply text-xs font-bold text-muted uppercase mb-1;
    }
    .stat-value {
      @apply text-lg font-bold text-content tabular-nums;
    }
  `]
})
export class ParticipantDetailsDialogComponent {
  dialogRef = inject(DialogRef);
  data = inject<{ player: ArenaParticipant; rank: number }>(DIALOG_DATA);

  get player() { return this.data.player; }

  winRate() {
    if (!this.player.games || this.player.games.length === 0) return 0;
    const wins = this.player.games.filter(g => g.result === 'win').length;
    return Math.round((wins / this.player.games.length) * 100);
  }

  avgOpponentRating() {
    if (!this.player.games || this.player.games.length === 0) return 0;
    const total = this.player.games.reduce((acc, g) => acc + g.opponentRating, 0);
    return Math.round(total / this.player.games.length);
  }
}
