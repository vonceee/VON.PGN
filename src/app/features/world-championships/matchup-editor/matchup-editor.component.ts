import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorldChampionshipService } from '../../../core/services/world-championship.service';
import {
  WorldChampionshipMatch,
  WorldChampionshipGame,
  GameNarrativeSection,
} from '../../../core/models/world-championship.model';
import { FEATURED_WCC_GAMES } from '../../../core/data/world-championship-games.data';
import {
  WccBoardViewerComponent,
  WccStoryViewerComponent,
  WccSectionEditorComponent,
} from '../components';
import {
  DEFAULT_START_FEN,
  ParsedMove,
  parsePgnTimeline,
  formatMoveLabel,
} from '../utils/wcc-timeline.utils';
import { TextInputComponent } from '../../../shared/components/ui/text-input/text-input.component';
import { SelectComponent, SelectItem } from '../../../shared/components/ui/select/select.component';

/**
 * World Championship Story & Matchup Editor Component.
 * 
 * WHY: Provides rich authoring tools for championship game walkthroughs,
 *      leveraging modular subcomponents for instant synchronized live previews.
 */
@Component({
  selector: 'app-matchup-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextInputComponent,
    SelectComponent,
    WccBoardViewerComponent,
    WccStoryViewerComponent,
    WccSectionEditorComponent,
  ],
  templateUrl: './matchup-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wccService = inject(WorldChampionshipService);

  // Available eras
  readonly eras = [
    'Modern Era (2006-Present)',
    'Split Era (1993-2005)',
    'FIDE Soviet Era (1948-1990)',
    'Early Classical (1886-1946)',
  ];

  readonly eraOptions: SelectItem<string>[] = this.eras.map((e) => ({
    label: e,
    value: e,
  }));

  // Editor State
  isEditMode = signal<boolean>(false);
  activeTab = signal<'edit' | 'preview'>('edit');
  saveStatusMessage = signal<string | null>(null);

  // Match Information
  selectedMatchId = signal<string>('new');
  selectedGameNumber = signal<number | null>(null);
  allMatches = computed(() => this.wccService.allMatches());

  readonly matchOptions = computed<SelectItem<string>[]>(() => [
    { label: '✨ New Custom / Unlisted Match', value: 'new' },
    ...this.allMatches().map((m) => ({
      label: `${m.year} - ${m.title}`,
      value: m.id,
    })),
    { label: 'Demo: The Opera Game (Paul Morphy, 1858)', value: 'opera-game' },
  ]);

  readonly gameNumberOptions = computed<SelectItem<number>[]>(() => {
    const matchId = this.selectedMatchId();
    if (!matchId || matchId === 'new' || matchId === 'opera-game') return [];
    const match = this.wccService.getMatchById(matchId);
    if (!match) return [];
    const summaries = match.gamesSummary || [];
    return summaries.map((s) => ({
      label: `Game ${s.gameNumber}: ${s.white} vs. ${s.black} (${s.result})${s.hasStory ? ' • [Story exists]' : ' • [New Story]'}`,
      value: s.gameNumber,
    }));
  });

  matchTitle = signal<string>('New Championship Story');
  matchSubtitle = signal<string>('');
  year = signal<number | string>(new Date().getFullYear());
  champion = signal<string>('');
  challenger = signal<string>('');
  winner = signal<string>('');
  score = signal<string>('');
  format = signal<string>('14 Classical Games');
  location = signal<string>('');
  era = signal<string>('Modern Era (2006-Present)');
  matchDescription = signal<string>('');

  // Game & Story Content
  whitePlayer = signal<string>('');
  blackPlayer = signal<string>('');
  result = signal<string>('*');
  eco = signal<string>('');
  openingName = signal<string>('');
  gameDate = signal<string>(new Date().toISOString().split('T')[0]);
  pgn = signal<string>(
    `[Event "World Chess Championship"]\n[Site ""]\n[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]\n[Round "1"]\n[White ""]\n[Black ""]\n[Result "*"]\n\n1. e4 e5 *`
  );

  narrativeOverview = signal<string>('');

  sections = signal<GameNarrativeSection[]>([
    {
      title: 'Opening Phase',
      order: 1,
      startPly: 1,
      endPly: 2,
      content: '',
    },
  ]);

  // Chessboard and Timeline
  timeline = signal<string[]>([DEFAULT_START_FEN]);
  moveHistory = signal<ParsedMove[]>([]);
  currentPly = signal<number>(0);
  boardOrientation = signal<'white' | 'black'>('white');
  pgnError = signal<string | null>(null);

  // Derived State
  currentFen = computed(() => {
    const list = this.timeline();
    const ply = this.currentPly();
    return list[ply] || DEFAULT_START_FEN;
  });

  maxPly = computed(() => Math.max(0, this.timeline().length - 1));

  currentMoveLabel = computed(() => {
    return formatMoveLabel(this.currentPly(), this.moveHistory());
  });

  constructor() {
    effect(() => {
      const pgnStr = this.pgn();
      this.parsePgn(pgnStr);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const matchId = params.get('id');
      const gameNumberParam = this.route.snapshot.queryParamMap.get('gameNumber');
      const gameNumber = gameNumberParam ? parseInt(gameNumberParam, 10) : undefined;
      if (matchId && matchId !== 'new') {
        this.isEditMode.set(true);
        this.loadMatchData(matchId, gameNumber);
      } else {
        this.isEditMode.set(false);
        const restored = this.loadDraftFromStorage();
        if (!restored) {
          this.startNewStory();
        }
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const gameNumberParam = queryParams.get('gameNumber');
      const matchId = this.selectedMatchId();
      if (gameNumberParam && matchId && matchId !== 'new') {
        const gameNumber = parseInt(gameNumberParam, 10);
        this.loadMatchData(matchId, gameNumber);
      }
    });
  }

  startNewStory(): void {
    this.selectedMatchId.set('new');
    this.selectedGameNumber.set(null);
    this.isEditMode.set(false);
    this.matchTitle.set('New Championship Story');
    this.matchSubtitle.set('');
    this.year.set(new Date().getFullYear());
    this.champion.set('');
    this.challenger.set('');
    this.winner.set('');
    this.score.set('');
    this.format.set('14 Classical Games');
    this.location.set('');
    this.era.set('Modern Era (2006-Present)');
    this.matchDescription.set('');
    this.whitePlayer.set('');
    this.blackPlayer.set('');
    this.result.set('*');
    this.eco.set('');
    this.openingName.set('');
    this.gameDate.set(new Date().toISOString().split('T')[0]);
    this.pgn.set(
      `[Event "World Chess Championship"]\n[Site ""]\n[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]\n[Round "1"]\n[White ""]\n[Black ""]\n[Result "*"]\n\n1. e4 e5 *`
    );
    this.narrativeOverview.set('');
    this.sections.set([
      {
        title: 'Opening Phase',
        order: 1,
        startPly: 1,
        endPly: 2,
        content: '',
      },
    ]);
    this.currentPly.set(0);
    this.saveStatusMessage.set('Started new blank story');
    setTimeout(() => this.saveStatusMessage.set(null), 2500);
  }

  loadMatchData(matchId: string, targetGameNumber?: number): void {
    this.selectedMatchId.set(matchId);

    if (matchId === 'new') {
      this.startNewStory();
      return;
    }

    if (matchId === 'opera-game') {
      this.loadTemplate('opera');
      return;
    }

    const match = this.wccService.getMatchById(matchId);
    if (match) {
      this.year.set(match.year);
      this.champion.set(match.champion);
      this.challenger.set(match.challenger);
      this.winner.set(match.winner);
      this.score.set(match.score);
      this.format.set(match.format);
      this.location.set(match.location);
      this.era.set(match.era);
      this.matchDescription.set(match.description);

      const activeGameNum = targetGameNumber || 1;
      this.selectedGameNumber.set(activeGameNum);

      const games = this.wccService.getGamesForMatch(match.id);
      const targetGame = games.find((g) => g.gameNumber === activeGameNum);

      if (targetGame) {
        this.matchTitle.set(targetGame.title);
        this.matchSubtitle.set(
          targetGame.subtitle ||
            `${match.champion} vs. ${match.challenger} – ${match.location}, ${match.year}`
        );
        this.whitePlayer.set(targetGame.white);
        this.blackPlayer.set(targetGame.black);
        this.result.set(targetGame.result);
        this.eco.set(targetGame.eco || '');
        this.openingName.set(targetGame.opening || '');
        this.pgn.set(targetGame.pgn);
        this.narrativeOverview.set(targetGame.narrativeOverview || match.description);
        if (targetGame.sections && targetGame.sections.length > 0) {
          this.sections.set(targetGame.sections);
        }
      } else {
        // Covering a game that does not have an editorial story yet -> auto-scaffold clean PGN and narrative structure
        const summary = (match.gamesSummary || []).find((s) => s.gameNumber === activeGameNum);
        const isWhiteChamp = activeGameNum % 2 === 1;
        const white = summary?.white || (isWhiteChamp ? match.champion : match.challenger);
        const black = summary?.black || (isWhiteChamp ? match.challenger : match.champion);
        const result = summary?.result || '1/2-1/2';
        const eco = summary?.eco || 'C00';
        const opening = summary?.opening || 'Classical Opening';

        this.matchTitle.set(`Game ${activeGameNum}: ${white} vs. ${black}`);
        this.matchSubtitle.set(`${white} vs. ${black} – ${match.location}, ${match.year}`);
        this.whitePlayer.set(white);
        this.blackPlayer.set(black);
        this.result.set(result);
        this.eco.set(eco);
        this.openingName.set(opening);

        // Auto-scaffold PGN with standard headers and starting moves
        const pgnScaffold = `[Event "${match.title}"]\n[Site "${match.location}"]\n[Date "${match.year}.01.01"]\n[Round "${activeGameNum}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[ECO "${eco}"]\n[Opening "${opening}"]\n\n1. e4 e5 2. Nf3 Nc6 *`;

        this.pgn.set(pgnScaffold);
        this.narrativeOverview.set(
          `Round ${activeGameNum} of the ${match.year} World Chess Championship held in ${match.location} between ${match.champion} and ${match.challenger}.`
        );
        this.sections.set([
          {
            title: 'Opening Phase',
            order: 1,
            startPly: 1,
            endPly: 4,
            content: `The duel commenced in Game ${activeGameNum} with **${white}** directing the white pieces against **${black}**, steering into **${opening}** (**${eco}**).`,
          },
          {
            title: 'Central Battle & Turning Point',
            order: 2,
            startPly: 4,
            endPly: 4,
            content: `Document the critical tactical turning point and strategic developments of Game ${activeGameNum}.`,
          },
        ]);
      }
    }
  }

  onSelectExistingMatch(matchId: string): void {
    if (!matchId) return;
    if (matchId === 'new') {
      this.startNewStory();
      return;
    }
    this.selectedGameNumber.set(null);
    this.loadMatchData(matchId);
  }

  onSelectGameNumber(gameNumber: number): void {
    this.selectedGameNumber.set(gameNumber);
    const matchId = this.selectedMatchId();
    if (matchId && matchId !== 'new') {
      this.loadMatchData(matchId, gameNumber);
    }
  }

  loadTemplate(type: 'opera' | 'wcc2024' | 'wcc2023' | 'wcc1972' | 'empty'): void {
    if (type === 'empty') {
      this.startNewStory();
      return;
    }

    if (type === 'opera') {
      this.selectedMatchId.set('opera-game');
      this.selectedGameNumber.set(1);
    } else if (type === 'wcc2024') {
      this.selectedMatchId.set('wcc-2024');
      this.selectedGameNumber.set(14);
    } else if (type === 'wcc2023') {
      this.selectedMatchId.set('wcc-2023');
      this.selectedGameNumber.set(18);
    } else if (type === 'wcc1972') {
      this.selectedMatchId.set('wcc-1972');
      this.selectedGameNumber.set(6);
    }

    const templateGames = FEATURED_WCC_GAMES[type === 'opera' ? 'opera-game' : type];
    if (templateGames && templateGames.length > 0) {
      const g = templateGames[0];
      this.matchTitle.set(g.title);
      this.matchSubtitle.set(g.subtitle || '');
      this.whitePlayer.set(g.white);
      this.blackPlayer.set(g.black);
      this.result.set(g.result);
      this.eco.set(g.eco || '');
      this.openingName.set(g.opening || '');
      this.pgn.set(g.pgn);
      this.narrativeOverview.set(g.narrativeOverview || '');
      if (g.sections) {
        this.sections.set([...g.sections]);
      }
    }
  }

  private parsePgn(pgnString: string): void {
    const result = parsePgnTimeline(pgnString);
    this.timeline.set(result.timeline);
    this.moveHistory.set(result.moves);
    this.currentPly.set(0);
    this.pgnError.set(result.error);
  }

  // Board Navigation
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

  // Save & Storage
  saveDraft(): void {
    const draftPayload = {
      matchId: this.selectedMatchId(),
      matchTitle: this.matchTitle(),
      matchSubtitle: this.matchSubtitle(),
      year: this.year(),
      champion: this.champion(),
      challenger: this.challenger(),
      winner: this.winner(),
      score: this.score(),
      format: this.format(),
      location: this.location(),
      era: this.era(),
      matchDescription: this.matchDescription(),
      whitePlayer: this.whitePlayer(),
      blackPlayer: this.blackPlayer(),
      result: this.result(),
      eco: this.eco(),
      openingName: this.openingName(),
      pgn: this.pgn(),
      narrativeOverview: this.narrativeOverview(),
      sections: this.sections(),
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('wcc_editorial_draft', JSON.stringify(draftPayload));
      this.saveStatusMessage.set('Draft saved locally to browser!');
      setTimeout(() => this.saveStatusMessage.set(null), 3000);
    } catch (e) {
      console.warn('Could not save draft to localStorage', e);
    }
  }

  private loadDraftFromStorage(): boolean {
    try {
      const saved = localStorage.getItem('wcc_editorial_draft');
      if (saved) {
        const data = JSON.parse(saved);
        // Do not auto-restore opera-game as a generic saved draft
        if (data && data.matchTitle && data.matchId !== 'opera-game') {
          this.selectedMatchId.set(data.matchId || 'new');
          this.matchTitle.set(data.matchTitle);
          this.matchSubtitle.set(data.matchSubtitle || '');
          this.year.set(data.year || new Date().getFullYear());
          this.champion.set(data.champion || '');
          this.challenger.set(data.challenger || '');
          this.winner.set(data.winner || '');
          this.score.set(data.score || '');
          this.location.set(data.location || '');
          this.era.set(data.era || 'Modern Era (2006-Present)');
          this.matchDescription.set(data.matchDescription || '');
          this.whitePlayer.set(data.whitePlayer || '');
          this.blackPlayer.set(data.blackPlayer || '');
          this.result.set(data.result || '*');
          this.eco.set(data.eco || '');
          this.openingName.set(data.openingName || '');
          this.pgn.set(data.pgn || '1. e4 e5 *');
          this.narrativeOverview.set(data.narrativeOverview || '');
          if (data.sections && data.sections.length > 0) {
            this.sections.set(data.sections);
          }
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not load draft from localStorage', e);
    }
    return false;
  }

  publishStory(): void {
    this.saveDraft();
    const id = this.selectedMatchId() || 'wcc-2024';
    this.router.navigate(['/world-championships', id]);
  }

  copyJson(): void {
    const payload = {
      matchId: this.selectedMatchId(),
      title: this.matchTitle(),
      subtitle: this.matchSubtitle(),
      white: this.whitePlayer(),
      black: this.blackPlayer(),
      result: this.result(),
      eco: this.eco(),
      opening: this.openingName(),
      pgn: this.pgn(),
      totalPlies: this.maxPly(),
      narrativeOverview: this.narrativeOverview(),
      sections: this.sections(),
    };

    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    this.saveStatusMessage.set('Copied story JSON to clipboard!');
    setTimeout(() => this.saveStatusMessage.set(null), 3000);
  }
}
