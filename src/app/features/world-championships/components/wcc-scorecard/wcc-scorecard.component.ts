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

@Component({
  selector: 'app-wcc-scorecard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white mb-6">
      <!-- Cross-Table Container -->
      <div class="overflow-x-auto">
        <table class="w-full text-center border-collapse select-none min-w-[580px]">
          <thead>
            <tr class="text-xs text-gray-500 font-semibold border-b border-slate-200">
              <th class="text-left py-2 px-3 font-semibold text-slate-700 bg-white sticky left-0 z-10 min-w-[170px]">
                _
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
                    <span class="text-[11px]">{{ game.gameNumber }}</span>
                  </div>
                </th>
              }
              @if (isEditable()) {
                <th
                  (click)="addGame.emit()"
                  class="py-2 px-2 min-w-[34px] cursor-pointer hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors font-bold text-center border-l border-dashed border-slate-200"
                  title="Add New Game / Round"
                >
                  <span class="text-xs">+</span>
                </th>
              }
              <th class="py-2 px-3 font-bold text-slate-900 min-w-[50px] bg-slate-50 border-l border-slate-200">
                T
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            @for (player of tableRows(); track player.name) {
              <tr class="hover:bg-slate-50/50 transition-colors">
                <!-- Player Name (Sticky Left) -->
                <td class="text-left py-2.5 px-3 bg-white sticky left-0 z-10">
                  <div class="flex items-center gap-1.5">
                    @if (isEditable()) {
                      <input
                        type="text"
                        [value]="player.name"
                        (input)="onNameChange(player.role, $event)"
                        [placeholder]="player.role === 'champion' ? 'Defender / Champion' : 'Challenger'"
                        class="font-medium text-xs text-slate-800 hover:bg-slate-50 focus:bg-white px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-slate-300 transition-colors w-32 sm:w-40"
                        [class.font-bold]="player.isWinner"
                        [title]="player.role === 'champion' ? 'Edit Defending Champion' : 'Edit Challenger'"
                      />
                    } @else {
                      <span class="font-medium truncate max-w-[130px]" [class.font-bold]="player.isWinner">
                        {{ player.name }}
                      </span>
                    }
                    @if (player.role === 'champion') {
                      <!-- Crown Icon for Defending Champion -->
                      <svg class="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" viewBox="0 0 24 24" title="Defending Champion">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                      </svg>
                    }
                  </div>
                </td>

                <!-- Round Scores -->
                @for (score of player.gameScores; track score.gameNumber) {
                  <td
                    (click)="gameSelected.emit(score.gameNumber)"
                    [class.bg-slate-100]="selectedGameNumber() === score.gameNumber"
                    class="py-2.5 px-1.5 cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <div class="flex flex-col items-center justify-center leading-tight">
                      <span class="font-semibold">
                        {{ score.displayPoints }}
                      </span>
                    </div>
                  </td>
                }

                @if (isEditable()) {
                  <td class="py-2.5 px-2 bg-slate-50/40 border-l border-dashed border-slate-200 text-slate-300 text-center">
                    -
                  </td>
                }

                <!-- Total Score -->
                <td class="py-2.5 px-3 font-bold text-sm bg-slate-50 border-l border-slate-200" [class.text-emerald-700]="player.isWinner">
                  {{ player.totalPoints }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class WccScorecardComponent {
  match = input.required<WorldChampionshipMatch>();
  gamesSummary = input.required<MatchGameSummary[]>();
  selectedGameNumber = input<number | undefined>(undefined);
  isEditable = input<boolean>(false);

  gameSelected = output<number>();
  championChange = output<string>();
  challengerChange = output<string>();
  addGame = output<void>();

  onNameChange(role: 'champion' | 'challenger', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (role === 'champion') {
      this.championChange.emit(value);
    } else {
      this.challengerChange.emit(value);
    }
  }

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
      let points: number | string = '-';
      let displayPoints = '-';

      if (res === '1-0') {
        const p = isChampWhite ? 1 : 0;
        points = p;
        displayPoints = p.toString();
        champTotal += p;
      } else if (res === '0-1') {
        const p = isChampWhite ? 0 : 1;
        points = p;
        displayPoints = p.toString();
        champTotal += p;
      } else if (res === '1/2-1/2') {
        points = 0.5;
        displayPoints = '½';
        champTotal += 0.5;
      } else {
        points = '-';
        displayPoints = '-';
      }

      return {
        gameNumber: g.gameNumber,
        points,
        displayPoints,
        isWhite: isChampWhite,
        hasStory: !!g.hasStory,
        result: res,
      };
    });

    const challScores = games.map((g) => {
      const isChallWhite = g.white === chall;
      const res = this.normalizeResult(g.result);
      let points: number | string = '-';
      let displayPoints = '-';

      if (res === '1-0') {
        const p = isChallWhite ? 1 : 0;
        points = p;
        displayPoints = p.toString();
        challTotal += p;
      } else if (res === '0-1') {
        const p = isChallWhite ? 0 : 1;
        points = p;
        displayPoints = p.toString();
        challTotal += p;
      } else if (res === '1/2-1/2') {
        points = 0.5;
        displayPoints = '½';
        challTotal += 0.5;
      } else {
        points = '-';
        displayPoints = '-';
      }

      return {
        gameNumber: g.gameNumber,
        points,
        displayPoints,
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
    if (!raw) return '*';
    const t = raw.trim();
    if (t === '1-0' || t === '1 - 0' || t === '1-0 (F)') return '1-0';
    if (t === '0-1' || t === '0 - 1' || t === '0-1 (F)') return '0-1';
    if (t === '1/2-1/2' || t === '1/2 - 1/2' || t === '½-½' || t === '0.5-0.5') return '1/2-1/2';
    return '*';
  }
}
