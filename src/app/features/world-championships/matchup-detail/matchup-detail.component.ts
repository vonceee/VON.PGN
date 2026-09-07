import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WorldChampionshipService } from '../../../core/services/world-championship.service';
import {
  WorldChampionshipMatch,
  WorldChampionshipGame,
} from '../../../core/models/world-championship.model';
import {
  WccBoardViewerComponent,
  WccStoryViewerComponent,
  WccScorecardComponent,
} from '../components';
import { SelectComponent, SelectItem } from '@shared/ui';
import {
  DEFAULT_START_FEN,
  ParsedMove,
  parsePgnTimeline,
  formatMoveLabel,
} from '../utils/wcc-timeline.utils';

@Component({
  selector: 'app-matchup-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WccBoardViewerComponent,
    WccStoryViewerComponent,
    WccScorecardComponent,
    SelectComponent,
  ],
  templateUrl: './matchup-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private wccService = inject(WorldChampionshipService);

  // State signals
  isLoading = signal<boolean>(true);
  notFound = signal<boolean>(false);
  match = signal<WorldChampionshipMatch | null>(null);
  games = signal<WorldChampionshipGame[]>([]);
  selectedGame = signal<WorldChampionshipGame | null>(null);

  timeline = signal<string[]>([DEFAULT_START_FEN]);
  moveHistory = signal<ParsedMove[]>([]);
  currentPly = signal<number>(0);
  boardOrientation = signal<'white' | 'black'>('white');

  currentFen = computed(() => {
    const list = this.timeline();
    const ply = this.currentPly();
    return list[ply] || DEFAULT_START_FEN;
  });

  maxPly = computed(() => Math.max(0, this.timeline().length - 1));

  currentMoveLabel = computed(() => {
    return formatMoveLabel(this.currentPly(), this.moveHistory());
  });

  readonly gameOptions = computed<SelectItem<string>[]>(() => {
    return this.games().map((g) => {
      return {
        label: `Game ${g.gameNumber}`,
        value: g.id,
      };
    });
  });

  readonly currentGameNumber = computed(() => this.selectedGame()?.gameNumber);

  readonly currentIndex = computed(() => {
    const sel = this.selectedGame();
    if (!sel) return -1;
    return this.games().findIndex((g) => g.id === sel.id);
  });

  readonly hasPrevGame = computed(() => this.currentIndex() > 0);
  readonly hasNextGame = computed(() => {
    const idx = this.currentIndex();
    return idx >= 0 && idx < this.games().length - 1;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const matchId = params.get('id');
      if (!matchId) {
        this.notFound.set(true);
        this.isLoading.set(false);
        return;
      }
      const targetGameId = this.route.snapshot.queryParamMap.get('game');
      this.loadMatch(matchId, targetGameId);
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const targetGameId = queryParams.get('game');
      if (targetGameId && this.games().length > 0) {
        const found = this.games().find((g) => g.id === targetGameId);
        if (found && this.selectedGame()?.id !== found.id) {
          this.selectGame(found);
        }
      }
    });
  }

  loadMatch(matchId: string, targetGameId?: string | null): void {
    this.isLoading.set(true);
    this.notFound.set(false);

    const foundMatch = this.wccService.getMatchById(matchId);
    if (foundMatch) {
      this.setupMatch(foundMatch, targetGameId);
      this.isLoading.set(false);
    } else {
      this.wccService.fetchMatchById(matchId).subscribe({
        next: (loaded) => {
          this.setupMatch(loaded, targetGameId);
          this.isLoading.set(false);
        },
        error: () => {
          this.match.set(null);
          this.games.set([]);
          this.selectedGame.set(null);
          this.notFound.set(true);
          this.isLoading.set(false);
        },
      });
    }
  }

  private setupMatch(match: WorldChampionshipMatch, targetGameId?: string | null): void {
    this.match.set(match);
    const matchGames = this.wccService.getAllGamesForMatch(match.id);
    this.games.set(matchGames);
    if (matchGames.length > 0) {
      const matched = targetGameId
        ? matchGames.find((g) => g.id === targetGameId)
        : null;
      this.selectGame(matched || matchGames[0]);
    } else {
      this.selectedGame.set(null);
    }
  }

  selectGame(game: WorldChampionshipGame): void {
    this.selectedGame.set(game);
    const result = parsePgnTimeline(game.pgn);
    this.timeline.set(result.timeline);
    this.moveHistory.set(result.moves);
    this.currentPly.set(0);
  }

  selectGameById(gameId: string): void {
    const game = this.games().find((g) => g.id === gameId);
    if (game) {
      this.selectGame(game);
    }
  }

  selectGameByNumber(gameNumber: number): void {
    const game = this.games().find((g) => g.gameNumber === gameNumber);
    if (game) {
      this.selectGame(game);
    }
  }

  prevGame(): void {
    const idx = this.currentIndex();
    if (idx > 0) {
      this.selectGame(this.games()[idx - 1]);
    }
  }

  nextGame(): void {
    const idx = this.currentIndex();
    if (idx >= 0 && idx < this.games().length - 1) {
      this.selectGame(this.games()[idx + 1]);
    }
  }

  goToPly(ply: number): void {
    if (ply >= 0 && ply <= this.maxPly()) {
      this.currentPly.set(ply);
    }
  }

  goToFirst(): void {
    this.currentPly.set(0);
  }

  goToLast(): void {
    this.currentPly.set(this.maxPly());
  }

  prevMove(): void {
    if (this.currentPly() > 0) {
      this.currentPly.update((p) => p - 1);
    }
  }

  nextMove(): void {
    if (this.currentPly() < this.maxPly()) {
      this.currentPly.update((p) => p + 1);
    }
  }

  flipBoard(): void {
    this.boardOrientation.update((o) => (o === 'white' ? 'black' : 'white'));
  }
}
