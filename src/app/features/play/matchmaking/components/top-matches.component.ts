import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresenceService } from '../../../../core/services/presence.service';
import { GameService } from '../../../../core/services/game.service';
import { ChessBoardComponent, ChessClockComponent } from '@shared/chess';
import { GameInfoComponent } from '../../live-game/components/game-info.component';
import { Chess } from 'chess.js';
import { Config } from 'chessground/config';

@Component({
  selector: 'app-top-matches',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    ChessClockComponent,
    GameInfoComponent,
  ],
  template: `
    <div class="flex flex-col h-full gap-4 min-h-0">
      <!-- Live Game Board Container -->
      <div class="shrink-0 flex flex-col gap-2">
        <div class="flex-1">
          @if (game(); as g) {
            <!-- Top Player (Black) -->
            <div class="flex items-center justify-between gap-4 mb-2">
              <app-game-info
                [player]="g.black_player || placeholderPlayer"
                [color]="'black'"
                [showStatus]="false"
                class="flex-1 min-w-0"
              />
              <app-chess-clock
                class="shrink-0"
                [size]="'md'"
                [serverTimeMs]="g.black_time_remaining_ms || 0"
                [serverTimestamp]="g.server_timestamp || ''"
                [isActive]="g.turn === 'black' && g.status === 'active'"
              />
            </div>

            <!-- Board -->
            <div class="aspect-square w-full relative">
              <app-chess-board
                [fen]="displayFen()"
                [orientation]="'white'"
                [interactive]="false"
                [configOverride]="cgConfig()"
                [hideCoordinates]="true"
                [resizable]="false"
                [fluid]="true"
              ></app-chess-board>
            </div>

            <!-- Bottom Player (White) -->
            <div class="flex items-center justify-between gap-4 mt-2">
              <app-game-info
                [player]="g.white_player || placeholderPlayer"
                [color]="'white'"
                [showStatus]="false"
                class="flex-1 min-w-0"
              />
              <app-chess-clock
                class="shrink-0"
                [size]="'md'"
                [serverTimeMs]="g.white_time_remaining_ms || 0"
                [serverTimestamp]="g.server_timestamp || ''"
                [isActive]="g.turn === 'white' && g.status === 'active'"
              />
            </div>
          } @else {
            <div class="aspect-square w-full relative">
              <app-chess-board
                [fen]="STARTING_FEN"
                [orientation]="'white'"
                [interactive]="false"
                [hideCoordinates]="true"
                [resizable]="false"
                [fluid]="true"
              ></app-chess-board>
            </div>
          }
        </div>
      </div>

      <!-- Top Games List -->
      <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-1 pr-1">
        <h3 class="text-[10px] uppercase font-bold text-muted px-2 mb-2">Top Ongoing Matches</h3>
        @for (match of presenceService.topGames(); track match.gameId) {
          @let isActive = selectedGameId() === match.gameId || (!selectedGameId() && match.gameId === presenceService.topGameId());
          <div 
            (click)="selectGame(match.gameId)"
            class="ui-panel p-2.5 transition-all cursor-pointer group relative shrink-0"
            [class.border-accent]="isActive"
            [class.bg-accent/[0.02]]="isActive"
            [class.shadow-sm]="isActive"
            [class.hover:bg-subtle]="!isActive"
          >
            <!-- Active Indicator Bar -->
            @if (isActive) {
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
            }

            <div class="flex flex-col gap-2">
              <!-- Top Row (White) -->
              <div class="flex items-center justify-between gap-4">
                <span 
                  class="text-sm font-semibold truncate"
                  [class]="isActive ? 'text-accent' : 'text-content'"
                >
                  {{ match.white.name }}
                </span>
                <span class="text-xs font-medium text-muted tabular-nums">{{ match.white.rating }}</span>
              </div>

              <!-- Bottom Row (Black) -->
              <div class="flex items-center justify-between gap-4">
                <span class="text-xs font-medium text-muted tabular-nums">{{ match.black.rating }}</span>
                <span 
                  class="text-sm font-semibold truncate text-right"
                  [class]="isActive ? 'text-accent' : 'text-content'"
                >
                  {{ match.black.name }}
                </span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TopMatchesComponent implements OnInit {
  public presenceService = inject(PresenceService);
  private gameService = inject(GameService);

  readonly STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  readonly placeholderPlayer = { id: 0, name: '...' };

  selectedGameId = signal<string | null>(null);
  
  // Board signals
  chess = new Chess();
  displayFen = signal<string>(this.STARTING_FEN);
  game = this.gameService.gameState;

  cgConfig = computed(() => {
    const g = this.game();
    if (!g) return {};
    return {
      turnColor: g.turn,
      viewOnly: true,
      movable: { color: undefined, dests: new Map() },
      coordinates: false,
    } as Config;
  });

  constructor() {
    // Watch for top game changes or manual selection
    effect(() => {
      const targetId = this.selectedGameId() || this.presenceService.topGameId();
      
      if (targetId) {
        const currentId = this.gameService.gameState()?.id;
        if (currentId !== targetId) {
          this.gameService.loadGame(targetId);
        }
      } else {
        this.gameService.clearGame(false);
      }
    });

    // Sync chess instance and display when game state updates
    effect(() => {
      const g = this.game();
      if (g) {
        this.chess.load(g.fen);
        this.displayFen.set(g.fen);
      } else {
        this.displayFen.set(this.STARTING_FEN);
      }
    });
  }

  ngOnInit(): void {}

  selectGame(gameId: string) {
    if (this.selectedGameId() === gameId) {
      this.selectedGameId.set(null);
    } else {
      this.selectedGameId.set(gameId);
    }
  }
}
