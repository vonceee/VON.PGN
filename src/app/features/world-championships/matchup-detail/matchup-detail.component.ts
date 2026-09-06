import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorldChampionshipService } from '../../../core/services/world-championship.service';
import {
  WorldChampionshipMatch,
  WorldChampionshipGame,
} from '../../../core/models/world-championship.model';
import {
  WccBoardViewerComponent,
  WccStoryViewerComponent,
  WccSummaryDrawerComponent,
  WccScorecardComponent,
} from '../components';
import { SelectComponent, SelectItem } from '@shared/ui';
import {
  DEFAULT_START_FEN,
  ParsedMove,
  parsePgnTimeline,
  formatMoveLabel,
} from '../utils/wcc-timeline.utils';

/**
 * Dedicated Matchup Detail Component.
 * 
 * WHY: Displays complete championship duels and annotated games in an editorial two-column layout.
 *      Modularized using focused subcomponents for the story, board controls, summary drawer,
 *      game selector, and interactive scorecard cross-table.
 */
@Component({
  selector: 'app-matchup-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    WccBoardViewerComponent,
    WccStoryViewerComponent,
    WccSummaryDrawerComponent,
    WccScorecardComponent,
    SelectComponent,
  ],
  templateUrl: './matchup-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wccService = inject(WorldChampionshipService);

  // State signals
  match = signal<WorldChampionshipMatch | null>(null);
  games = signal<WorldChampionshipGame[]>([]);
  selectedGame = signal<WorldChampionshipGame | null>(null);

  timeline = signal<string[]>([DEFAULT_START_FEN]);
  moveHistory = signal<ParsedMove[]>([]);
  currentPly = signal<number>(0);
  boardOrientation = signal<'white' | 'black'>('white');
  showMatchDetailsDrawer = signal<boolean>(false);
  showScorecard = signal<boolean>(true);

  // Derived state
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
      const hasDetailedStory = g.sections && g.sections.length > 1;
      return {
        label: `Game ${g.gameNumber}: ${g.white} vs. ${g.black} (${g.result})${hasDetailedStory ? ' • Story 📖' : ''}`,
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
      const matchId = params.get('id') || 'wcc-2024';
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
    if (matchId === 'opera-game') {
      const demoMatch: WorldChampionshipMatch = {
        id: 'opera-game',
        year: 1858,
        title: 'The Opera Game',
        champion: 'Paul Morphy',
        challenger: 'Duke of Brunswick & Count Isouard',
        winner: 'Paul Morphy',
        score: '1 - 0',
        format: 'Casual Consultation Game',
        location: 'Salle Le Peletier, Paris, France',
        era: 'Early Classical (1886-1946)',
        description:
          'Played during an intermission of Bellini’s Norma at the Paris Opera, Morphy produced the quintessential instructional masterpiece demonstrating the supremacy of rapid piece development over material greed.',
        keyHighlights: [
          'Seventeen moves of pure harmonious piece development.',
          'Double piece sacrifice terminating in an iconic queen sacrifice checkmate.',
          'Immortal standard for attacking against an uncastled king.',
        ],
        gamesSummary: [
          {
            gameNumber: 1,
            white: 'Paul Morphy',
            black: 'Duke of Brunswick & Count Isouard',
            result: '1-0',
            opening: "Philidor's Defense",
            eco: 'C41',
            hasStory: true,
            gameId: 'opera-game',
            title: 'The Opera Game',
          },
        ],
      };
      this.match.set(demoMatch);
      const games = this.wccService.getAllGamesForMatch('opera-game');
      this.games.set(games);
      if (games.length > 0) {
        this.selectGame(games[0]);
      }
      return;
    }

    const foundMatch = this.wccService.getMatchById(matchId);
    if (foundMatch) {
      this.match.set(foundMatch);
      const matchGames = this.wccService.getAllGamesForMatch(foundMatch.id);
      this.games.set(matchGames);
      if (matchGames.length > 0) {
        const matched = targetGameId
          ? matchGames.find((g) => g.id === targetGameId)
          : null;
        this.selectGame(matched || matchGames[0]);
      }
    } else {
      const fallback = this.wccService.getMatchById('wcc-2024');
      if (fallback) {
        this.match.set(fallback);
        const matchGames = this.wccService.getAllGamesForMatch(fallback.id);
        this.games.set(matchGames);
        if (matchGames.length > 0) {
          const matched = targetGameId
            ? matchGames.find((g) => g.id === targetGameId)
            : null;
          this.selectGame(matched || matchGames[0]);
        }
      }
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

  toggleScorecard(): void {
    this.showScorecard.update((v) => !v);
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

  toggleMatchDetails(): void {
    this.showMatchDetailsDrawer.update((v) => !v);
  }

  openStudy(): void {
    const m = this.match();
    if (!m) return;
    if (m.studyId) {
      this.router.navigate(['/study', m.studyId]);
    } else {
      this.router.navigate(['/study'], {
        queryParams: { search: `${m.year} World Chess Championship` },
      });
    }
  }
}
