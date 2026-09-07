import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchGameSummary, WorldChampionshipMatch } from '../../../../core/models/world-championship.model';

/**
 * World Championship Match Games Series & Results Matrix Component.
 * 
 * WHY:
 * World Chess Championships consist of multiple games (e.g. 14 classical games or 24 games),
 * but match cards historically treated duels as a single game. This component visualizes the
 * complete multi-game contest directly on the card with interactive game pills and an expandable
 * game-by-game roster for reading and authoring coverage.
 * 
 * ARCHITECTURAL CHOICE:
 * - Standalone Angular component with Signals (`input()`, `output()`, `signal()`).
 * - Emits `gameSelected` when an annotated game is clicked to support deep linking.
 * - Emits `coverGame` with the match and gameNumber to launch the editor pre-configured.
 * 
 * ASSUMPTIONS & EDGE CASES:
 * - Handles matches ranging from 1 game (e.g. Opera Game) up to 48 games (1984 match).
 * - Distinguishes white wins (1-0), black wins (0-1), and draws (1/2-1/2) visually.
 */
@Component({
  selector: 'app-wcc-games-matrix',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-4 pt-4 border-t border-slate-200">
      <!-- Games Header & Scope Strip -->
      <div class="flex items-center justify-between gap-2 mb-2.5">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase text-gray-500">
            Games Series ({{ games().length }})
          </span>
          @if (match().coveredGamesCount; as covered) {
            @if (covered > 0) {
              <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                <svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                {{ covered }} Story{{ covered === 1 ? '' : 'ies' }}
              </span>
            }
          }
        </div>

        <!-- Toggle Full Breakdown Accordion -->
        <button
          type="button"
          (click)="toggleExpanded($event)"
          class="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
        >
          {{ isExpanded() ? 'Hide Roster' : 'View Roster' }}
          <svg
            class="w-3.5 h-3.5 transition-transform duration-200"
            [class.rotate-180]="isExpanded()"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      <!-- Compact Interactive Game Pills Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none">
        @for (game of games(); track game.gameNumber) {
          <button
            type="button"
            (click)="onGameClick(game, $event)"
            [title]="getGameTooltip(game)"
            [class.ring-2]="game.hasStory"
            [class.ring-emerald-500]="game.hasStory"
            [class.bg-emerald-50]="game.hasStory"
            [class.bg-white]="!game.hasStory && isWhiteWin(game.result)"
            [class.text-slate-900]="!game.hasStory && isWhiteWin(game.result)"
            [class.bg-slate-800]="!game.hasStory && isBlackWin(game.result)"
            [class.text-white]="!game.hasStory && isBlackWin(game.result)"
            [class.bg-slate-100]="!game.hasStory && isDraw(game.result)"
            [class.text-slate-700]="!game.hasStory && isDraw(game.result)"
            class="min-w-[34px] px-1.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-400 hover:transition-all flex flex-col items-center justify-center shrink-0 cursor-pointer text-center relative"
          >
            <span class="text-[10px] leading-none opacity-70">G{{ game.gameNumber }}</span>
            <span class="text-[11px] font-bold leading-tight">
              {{ formatPillResult(game.result) }}
            </span>

            @if (game.hasStory) {
              <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500"></span>
            }
          </button>
        }
      </div>

      <!-- Expandable Full Games Breakdown Roster -->
      @if (isExpanded()) {
        <div (click)="$event.stopPropagation()" class="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-64 overflow-y-auto">
          <div class="flex items-center justify-between text-xs text-gray-500 font-semibold border-b border-slate-200 pb-1.5 px-1">
            <span>Round &amp; Pairing</span>
            <span>Result &amp; Action</span>
          </div>

          <div class="space-y-1.5">
            @for (game of games(); track game.gameNumber) {
              <div class="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors">
                <div class="min-w-0 pr-2">
                  <div class="font-semibold text-slate-900 truncate">
                    Game {{ game.gameNumber }}: {{ game.white }} (W) vs {{ game.black }} (B)
                  </div>
                  <div class="text-[11px] text-gray-500 truncate">
                    {{ game.opening || 'Classical Opening' }}
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <span
                    class="font-mono font-bold text-xs px-2 py-0.5 rounded-md"
                    [class.bg-emerald-100]="isWhiteWin(game.result) || isBlackWin(game.result)"
                    [class.text-emerald-800]="isWhiteWin(game.result) || isBlackWin(game.result)"
                    [class.bg-slate-100]="isDraw(game.result)"
                    [class.text-slate-700]="isDraw(game.result)"
                  >
                    {{ formatTableResult(game.result) }}
                  </span>

                  @if (game.hasStory) {
                    <button
                      type="button"
                      (click)="onGameClick(game, $event)"
                      class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                      title="Read full annotated story"
                    >
                      Read Story
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="onGameClick(game, $event)"
                      class="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      title="View game on interactive board"
                    >
                      View Game
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class WccGamesMatrixComponent {
  match = input.required<WorldChampionshipMatch>();
  games = input.required<MatchGameSummary[]>();

  gameSelected = output<{ match: WorldChampionshipMatch; game: MatchGameSummary }>();
  coverGame = output<{ match: WorldChampionshipMatch; gameNumber: number }>();

  isExpanded = signal<boolean>(false);

  toggleExpanded(event: Event): void {
    event.stopPropagation();
    this.isExpanded.update((v) => !v);
  }

  onGameClick(game: MatchGameSummary, event: Event): void {
    event.stopPropagation();
    this.gameSelected.emit({ match: this.match(), game });
  }

  onCoverGame(gameNumber: number, event: Event): void {
    event.stopPropagation();
    this.coverGame.emit({ match: this.match(), gameNumber });
  }

  isWhiteWin(result?: string): boolean {
    if (!result) return false;
    const t = result.trim();
    return t === '1-0' || t === '1 - 0' || t === '1-0 (F)';
  }

  isBlackWin(result?: string): boolean {
    if (!result) return false;
    const t = result.trim();
    return t === '0-1' || t === '0 - 1' || t === '0-1 (F)';
  }

  isDraw(result?: string): boolean {
    return !this.isWhiteWin(result) && !this.isBlackWin(result);
  }

  formatPillResult(result?: string): string {
    if (this.isWhiteWin(result)) return '1';
    if (this.isBlackWin(result)) return '0';
    return '½';
  }

  formatTableResult(result?: string): string {
    if (this.isWhiteWin(result)) return '1-0';
    if (this.isBlackWin(result)) return '0-1';
    if (!result || result.trim() === '') return '1/2-1/2';
    const t = result.trim();
    if (t === '1/2-1/2' || t === '1/2 - 1/2' || t === '½-½' || t === '½' || t === '0.5-0.5') {
      return '1/2-1/2';
    }
    return t;
  }

  getGameTooltip(game: MatchGameSummary): string {
    const status = game.hasStory ? '📖 Full Story Available' : 'Result Logged';
    const res = this.formatTableResult(game.result);
    return `Game ${game.gameNumber}: ${game.white} vs ${game.black} (${res}) - ${game.opening || 'Classical Opening'} [${status}]`;
  }
}
