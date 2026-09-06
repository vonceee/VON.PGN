import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchGameSummary, WorldChampionshipMatch } from '../../../../core/models/world-championship.model';

interface ScorecardPlayerRow {
  name: string;
  role: 'champion' | 'challenger';
  isWinner: boolean;
  gameScores: {
    gameNumber: number;
    points: number | string; // 1, 0.5, 0
    displayPoints: string; // '1', '½', '0'
    isWhite: boolean;
    hasStory: boolean;
    result: string;
  }[];
  totalPoints: number;
}

/**
 * World Championship Match Scorecard & Cross-Table Component.
 * 
 * WHY:
 * A championship match is decided across multiple games. This component renders an interactive
 * cross-table displaying both contenders, round-by-round points (1, ½, 0), color alternation,
 * and running scores, highlighting the currently selected game and providing 1-click navigation.
 * 
 * ARCHITECTURAL CHOICE:
 * - Standalone Angular component with Signals (`computed()`, `input()`, `output()`).
 * - Horizontally scrollable cross-table with sticky player column for mobile viewports.
 * - Emits `gameSelected` with `gameNumber` on click.
 */
@Component({
  selector: 'app-wcc-scorecard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs">
      <!-- Header Strip -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <span class="text-xs font-bold uppercase text-gray-500 tracking-wider">
            Match Scorecard
          </span>
          <span class="text-xs text-gray-400">•</span>
          <span class="text-xs font-medium text-slate-700">
            {{ match().format }}
          </span>
        </div>

        <div class="flex items-center gap-2 text-xs font-semibold">
          <span class="text-gray-500">Official Result:</span>
          <span class="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            {{ match().winner }} won ({{ match().score }})
          </span>
        </div>
      </div>

      <!-- Cross-Table Container -->
      <div class="overflow-x-auto scrollbar-thin pb-2">
        <table class="w-full text-center border-collapse select-none min-w-[580px]">
          <thead>
            <tr class="text-xs text-gray-500 font-semibold border-b border-slate-200">
              <th class="text-left py-2 px-3 font-semibold text-slate-700 bg-white sticky left-0 z-10 min-w-[170px] shadow-xs">
                Contenders
              </th>
              @for (game of gamesSummary(); track game.gameNumber) {
                <th
                  (click)="gameSelected.emit(game.gameNumber)"
                  [class.bg-slate-100]="selectedGameNumber() === game.gameNumber"
                  [class.font-bold]="selectedGameNumber() === game.gameNumber"
                  [class.text-slate-900]="selectedGameNumber() === game.gameNumber"
                  class="py-2 px-1.5 min-w-[34px] cursor-pointer hover:bg-slate-50 transition-colors relative"
                  [title]="'Select Game ' + game.gameNumber"
                >
                  <div class="flex flex-col items-center">
                    <span class="text-[11px]">G{{ game.gameNumber }}</span>
                    @if (game.hasStory) {
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" title="Story Available"></span>
                    }
                  </div>
                </th>
              }
              <th class="py-2 px-3 font-bold text-slate-900 min-w-[50px] bg-slate-50 border-l border-slate-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            @for (player of tableRows(); track player.name) {
              <tr class="hover:bg-slate-50/50 transition-colors">
                <!-- Player Name (Sticky Left) -->
                <td class="text-left py-2.5 px-3 bg-white sticky left-0 z-10 shadow-xs">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      [class.bg-emerald-500]="player.isWinner"
                      [class.bg-slate-300]="!player.isWinner"
                    ></span>
                    <span class="font-medium truncate max-w-[130px]" [class.font-bold]="player.isWinner">
                      {{ player.name }}
                    </span>
                    <span class="text-[10px] uppercase text-gray-400 shrink-0">
                      ({{ player.role === 'champion' ? 'Def' : 'Chall' }})
                    </span>
                  </div>
                </td>

                <!-- Round Scores -->
                @for (score of player.gameScores; track score.gameNumber) {
                  <td
                    (click)="gameSelected.emit(score.gameNumber)"
                    [class.bg-slate-100]="selectedGameNumber() === score.gameNumber"
                    [class.ring-1]="selectedGameNumber() === score.gameNumber"
                    [class.ring-slate-400]="selectedGameNumber() === score.gameNumber"
                    class="py-2.5 px-1.5 cursor-pointer hover:bg-slate-100/70 transition-colors font-mono"
                    [title]="player.name + ' scored ' + score.displayPoints + ' in Game ' + score.gameNumber + (score.isWhite ? ' (White)' : ' (Black)')"
                  >
                    <div class="flex flex-col items-center justify-center leading-tight">
                      <span
                        class="text-xs font-bold"
                        [class.text-emerald-700]="score.points === 1"
                        [class.text-slate-800]="score.points === 0.5"
                        [class.text-gray-400]="score.points === 0"
                      >
                        {{ score.displayPoints }}
                      </span>
                      <span class="text-[9px] text-gray-400 font-sans leading-none mt-0.5">
                        {{ score.isWhite ? 'W' : 'B' }}
                      </span>
                    </div>
                  </td>
                }

                <!-- Total Score -->
                <td class="py-2.5 px-3 font-mono font-bold text-sm bg-slate-50 border-l border-slate-200" [class.text-emerald-700]="player.isWinner">
                  {{ player.totalPoints }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Legend Footer -->
      <div class="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-gray-500">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="font-bold text-emerald-700">1</span> Win
          </span>
          <span class="flex items-center gap-1">
            <span class="font-bold text-slate-800">½</span> Draw
          </span>
          <span class="flex items-center gap-1">
            <span class="font-bold text-gray-400">0</span> Loss
          </span>
          <span class="flex items-center gap-1">
            <span class="text-gray-400">W / B</span> White / Black pieces
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Click any column to jump to that game</span>
        </div>
      </div>
    </div>
  `,
})
export class WccScorecardComponent {
  match = input.required<WorldChampionshipMatch>();
  gamesSummary = input.required<MatchGameSummary[]>();
  selectedGameNumber = input<number | undefined>(undefined);

  gameSelected = output<number>();

  tableRows = computed<ScorecardPlayerRow[]>(() => {
    const m = this.match();
    const games = this.gamesSummary();
    if (!m) return [];

    const champ = m.champion;
    const chall = m.challenger;
    const winner = m.winner;

    let champTotal = 0;
    let challTotal = 0;

    const champScores = games.map((g) => {
      const isChampWhite = g.white === champ;
      const res = this.normalizeResult(g.result);
      let points = 0.5;

      if (res === '1-0' || res === '1-0 (F)') {
        points = isChampWhite ? 1 : 0;
      } else if (res === '0-1' || res === '0-1 (F)') {
        points = isChampWhite ? 0 : 1;
      } else {
        points = 0.5;
      }

      champTotal += points;

      return {
        gameNumber: g.gameNumber,
        points,
        displayPoints: points === 1 ? '1' : points === 0 ? '0' : '½',
        isWhite: isChampWhite,
        hasStory: !!g.hasStory,
        result: res,
      };
    });

    const challScores = games.map((g) => {
      const isChallWhite = g.white === chall;
      const res = this.normalizeResult(g.result);
      let points = 0.5;

      if (res === '1-0' || res === '1-0 (F)') {
        points = isChallWhite ? 1 : 0;
      } else if (res === '0-1' || res === '0-1 (F)') {
        points = isChallWhite ? 0 : 1;
      } else {
        points = 0.5;
      }

      challTotal += points;

      return {
        gameNumber: g.gameNumber,
        points,
        displayPoints: points === 1 ? '1' : points === 0 ? '0' : '½',
        isWhite: isChallWhite,
        hasStory: !!g.hasStory,
        result: res,
      };
    });

    return [
      {
        name: champ,
        role: 'champion',
        isWinner: winner === champ,
        gameScores: champScores,
        totalPoints: champTotal,
      },
      {
        name: chall,
        role: 'challenger',
        isWinner: winner === chall,
        gameScores: challScores,
        totalPoints: challTotal,
      },
    ];
  });

  private normalizeResult(raw?: string): string {
    if (!raw) return '1/2-1/2';
    const t = raw.trim();
    if (t === '1-0' || t === '1 - 0' || t === '1-0 (F)') return '1-0';
    if (t === '0-1' || t === '0 - 1' || t === '0-1 (F)') return '0-1';
    return '1/2-1/2';
  }
}
