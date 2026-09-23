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
  MatchGameSummary,
} from '../../../core/models/world-championship.model';
import { Chess } from '@von/chess';
import {
  WccBoardViewerComponent,
  WccSectionEditorComponent,
  WccScorecardComponent,
} from '../components';
import {
  DEFAULT_START_FEN,
  ParsedMove,
  parsePgnTimeline,
  formatMoveLabel,
  updatePgnComment,
  deletePgnMoveFrom,
} from '../utils/wcc-timeline.utils';
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
    SelectComponent,
    WccBoardViewerComponent,
    WccSectionEditorComponent,
    WccScorecardComponent,
  ],
  templateUrl: './matchup-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wccService = inject(WorldChampionshipService);

  // Editor State
  isEditMode = signal<boolean>(false);
  saveStatusMessage = signal<string | null>(null);

  // Match & Championship Information
  selectedMatchId = signal<string>('new');
  selectedGameNumber = signal<number | null>(null);
  gamesSummary = signal<MatchGameSummary[]>([]);

  readonly gameNumberOptions = computed<SelectItem<number>[]>(() => {
    return this.gamesSummary().map((s) => ({
      label: `Game ${s.gameNumber}`,
      value: s.gameNumber,
    }));
  });

  championshipTitle = signal<string>('');
  matchTitle = signal<string>('');
  matchSubtitle = signal<string>('');
  champion = signal<string>('');
  challenger = signal<string>('');
  location = signal<string>('');
  matchDescription = signal<string>('');

  // Game & Story Content
  whitePlayer = signal<string>('');
  blackPlayer = signal<string>('');
  result = signal<string>('*');
  eco = signal<string>('');
  openingName = signal<string>('');
  gameDate = signal<string>(new Date().toISOString().split('T')[0]);
  pgn = signal<string>('');

  narrativeOverview = signal<string>('');

  sections = signal<GameNarrativeSection[]>([]);

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

  activeMatch = computed<WorldChampionshipMatch>(() => {
    const games = this.gamesSummary();
    const champ = this.champion() || 'Defender';
    const chall = this.challenger() || 'Challenger';

    let champTotal = 0;
    let challTotal = 0;
    for (const g of games) {
      const isChampWhite = g.white === champ;
      const res = g.result?.trim();
      if (res === '1-0' || res === '1-0 (F)') {
        if (isChampWhite) champTotal += 1;
        else challTotal += 1;
      } else if (res === '0-1' || res === '0-1 (F)') {
        if (isChampWhite) challTotal += 1;
        else champTotal += 1;
      } else if (res === '1/2-1/2' || res === '½-½') {
        champTotal += 0.5;
        challTotal += 0.5;
      }
    }

    const winner =
      champTotal > challTotal
        ? champ
        : challTotal > champTotal
        ? chall
        : champ;

    const yearNum = this.extractYearFromTitle(this.championshipTitle());

    const currentGame: WorldChampionshipGame = {
      id: `${this.selectedMatchId()}-g${this.selectedGameNumber() || 1}`,
      matchId: this.selectedMatchId() || 'draft-wcc',
      gameNumber: this.selectedGameNumber() || 1,
      title: this.matchTitle(),
      subtitle: this.matchSubtitle(),
      white: this.whitePlayer(),
      black: this.blackPlayer(),
      result: this.result(),
      date: this.gameDate(),
      eco: this.eco(),
      opening: this.openingName(),
      pgn: this.pgn(),
      narrativeOverview: this.narrativeOverview(),
      sections: this.sections(),
    };

    return {
      id: this.selectedMatchId() || 'draft-wcc',
      year: yearNum,
      title: this.championshipTitle() || 'World Chess Championship',
      champion: champ,
      challenger: chall,
      winner,
      score: `${champTotal} - ${challTotal}`,
      format: `${games.length} Games`,
      location: this.location() || '',
      description:
        this.narrativeOverview() ||
        this.matchDescription() ||
        'World Chess Championship Match',
      keyHighlights: [],
      games: [currentGame],
      gamesSummary: games,
    };
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
      } else if (matchId === 'new') {
        this.isEditMode.set(false);
        this.startNewStory();
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
    this.selectedGameNumber.set(1);
    this.isEditMode.set(false);
    this.championshipTitle.set('');
    this.matchTitle.set('');
    this.matchSubtitle.set('');
    this.champion.set('');
    this.challenger.set('');
    this.location.set('');
    this.matchDescription.set('');
    this.whitePlayer.set('');
    this.blackPlayer.set('');
    this.result.set('*');
    this.eco.set('');
    this.openingName.set('');
    this.gameDate.set(new Date().toISOString().split('T')[0]);
    this.pgn.set('');
    this.narrativeOverview.set('');
    this.sections.set([]);
    this.gamesSummary.set([]);
    this.timeline.set([DEFAULT_START_FEN]);
    this.moveHistory.set([]);
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

    const match = this.wccService.getMatchById(matchId);
    if (!match && matchId !== 'new') {
      this.wccService.fetchMatchById(matchId).subscribe({
        next: () => this.loadMatchData(matchId, targetGameNumber),
        error: () => this.startNewStory(),
      });
      return;
    }
    if (match) {
      this.championshipTitle.set(match.title);
      this.champion.set(match.champion);
      this.challenger.set(match.challenger);
      this.location.set(match.location);
      this.matchDescription.set(match.description);

      const summaries =
        match.gamesSummary && match.gamesSummary.length > 0
          ? [...match.gamesSummary]
          : [
              {
                gameNumber: 1,
                white: match.champion,
                black: match.challenger,
                result: '1/2-1/2',
                hasStory: true,
              },
            ];
      this.gamesSummary.set(summaries);

      const activeGameNum = targetGameNumber || 1;
      this.selectedGameNumber.set(activeGameNum);

      const games = this.wccService.getGamesForMatch(match.id);
      const targetGame = games.find((g) => g.gameNumber === activeGameNum);

      if (targetGame) {
        this.matchTitle.set(targetGame.title);
        this.matchSubtitle.set(
          targetGame.subtitle || `${match.champion} vs. ${match.challenger}`
        );
        this.whitePlayer.set(targetGame.white);
        this.blackPlayer.set(targetGame.black);
        this.result.set(targetGame.result);
        this.eco.set(targetGame.eco || 'C00');
        this.openingName.set(targetGame.opening || 'Classical Match Game');
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
        this.matchSubtitle.set(`${white} vs. ${black}`);
        this.whitePlayer.set(white);
        this.blackPlayer.set(black);
        this.result.set(result);
        this.eco.set(eco);
        this.openingName.set(opening);

        // Auto-scaffold PGN with standard headers
        const pgnScaffold = `[Event "${match.title}"]\n[Site "${match.location}"]\n[Date "${match.year}.01.01"]\n[Round "${activeGameNum}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[Opening "${opening}"]\n\n*`;

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
            content: `The duel commenced in Game ${activeGameNum} with **${white}** directing the white pieces against **${black}**, steering into **${opening}**.`,
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

  onSelectGameNumber(gameNumber: number): void {
    this.selectedGameNumber.set(gameNumber);
    const matchId = this.selectedMatchId();
    if (matchId && matchId !== 'new') {
      this.loadMatchData(matchId, gameNumber);
    } else {
      const found = this.gamesSummary().find((g) => g.gameNumber === gameNumber);
      if (found) {
        this.matchTitle.set(found.title || `Game ${gameNumber}: ${found.white} vs. ${found.black}`);
        this.whitePlayer.set(found.white);
        this.blackPlayer.set(found.black);
        this.result.set(found.result);
      }
    }
  }

  addNewGame(): void {
    const current = this.gamesSummary();
    const nextGameNumber =
      current.length > 0 ? Math.max(...current.map((g) => g.gameNumber)) + 1 : 1;
    const isOdd = nextGameNumber % 2 === 1;
    const champ = this.champion();
    const chall = this.challenger();
    const white = isOdd ? champ : chall;
    const black = isOdd ? chall : champ;

    const newGameSummary: MatchGameSummary = {
      gameNumber: nextGameNumber,
      white,
      black,
      result: '*',
      hasStory: true,
      title: white && black ? `Game ${nextGameNumber}: ${white} vs. ${black}` : `Game ${nextGameNumber}`,
    };

    this.gamesSummary.set([...current, newGameSummary]);
    this.selectedGameNumber.set(nextGameNumber);
    this.matchTitle.set(newGameSummary.title || `Game ${nextGameNumber}`);
    this.whitePlayer.set(white);
    this.blackPlayer.set(black);
    this.result.set('*');
    this.pgn.set('');
    this.timeline.set([DEFAULT_START_FEN]);
    this.moveHistory.set([]);
    this.currentPly.set(0);
    this.sections.set([]);
  }

  onChampionChange(newChamp: string): void {
    this.champion.set(newChamp);
    const chall = this.challenger();
    this.matchSubtitle.set(`${newChamp} vs. ${chall}`);
    this.updatePlayerNamesInGames(newChamp, chall);
  }

  onChallengerChange(newChall: string): void {
    this.challenger.set(newChall);
    const champ = this.champion();
    this.matchSubtitle.set(`${champ} vs. ${newChall}`);
    this.updatePlayerNamesInGames(champ, newChall);
  }

  private updatePlayerNamesInGames(champ: string, chall: string): void {
    const current = this.gamesSummary();
    if (current.length === 0) return;
    this.gamesSummary.set(
      current.map((g) => {
        const isOdd = g.gameNumber % 2 === 1;
        return {
          ...g,
          white: isOdd ? (champ || g.white) : (chall || g.white),
          black: isOdd ? (chall || g.black) : (champ || g.black),
        };
      })
    );
  }

  private extractYearFromTitle(title?: string): number {
    if (!title) return new Date().getFullYear();
    const match = title.match(/\b(18\d\d|19\d\d|20\d\d)\b/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
  }

  private parsePgn(pgnString: string): void {
    const result = parsePgnTimeline(pgnString);
    this.timeline.set(result.timeline);
    this.moveHistory.set(result.moves);
    this.currentPly.set(0);
    this.pgnError.set(result.error);
    if (result.startComment !== undefined) {
      this.narrativeOverview.set(result.startComment);
    }

    // Automatically extract White, Black, and Result from PGN headers
    if (pgnString) {
      const whiteMatch = pgnString.match(/\[White\s+"([^"]+)"\]/i);
      const blackMatch = pgnString.match(/\[Black\s+"([^"]+)"\]/i);
      const resultMatch = pgnString.match(/\[Result\s+"([^"]+)"\]/i);

      const white = whiteMatch?.[1]?.trim();
      const black = blackMatch?.[1]?.trim();
      const res = resultMatch?.[1]?.trim();

      if (white) {
        this.whitePlayer.set(white);
      }
      if (black) {
        this.blackPlayer.set(black);
      }
      if (res) {
        this.result.set(res);
      }

      // Update gamesSummary for the current round
      const activeNum = this.selectedGameNumber() || 1;
      if (white || black || res) {
        this.gamesSummary.update((list) =>
          list.map((g) =>
            g.gameNumber === activeNum
              ? {
                  ...g,
                  white: white || g.white,
                  black: black || g.black,
                  result: res || g.result,
                }
              : g
          )
        );
      }
    }
  }

  // Interactive Board Move Handling (Like Study Mode)
  onBoardMoveMade(event: { move: any; fen: string; uci: string }): void {
    try {
      const chess = new Chess();
      let loaded = false;
      const currentPgn = this.pgn().trim();
      if (currentPgn) {
        try {
          chess.loadPgn(currentPgn);
          loaded = true;
        } catch {}
      }
      if (!loaded) {
        chess.load(this.currentFen());
      }

      const played = chess.move({
        from: event.move.from,
        to: event.move.to,
        promotion: event.move.promotion,
      });

      if (played) {
        chess.header(
          'Event', this.championshipTitle() || 'World Chess Championship',
          'Site', this.location() || 'Championship Venue',
          'Date', this.gameDate() || new Date().toISOString().split('T')[0].replace(/-/g, '.'),
          'Round', `${this.selectedGameNumber() || 1}`,
          'White', this.whitePlayer() || 'White',
          'Black', this.blackPlayer() || 'Black',
          'Result', this.result() || '*'
        );
        const newPgn = chess.pgn();
        this.pgn.set(newPgn);
        setTimeout(() => {
          this.currentPly.set(this.maxPly());
        }, 0);
        this.saveStatusMessage.set(`Played ${played.san}`);
        setTimeout(() => this.saveStatusMessage.set(null), 2000);
      }
    } catch (err) {
      console.warn('Could not execute move made on board', err);
    }
  }

  onAnnotationChanged(event: { ply: number; comment: string; glyphId?: any; hasBreak?: boolean }): void {
    const updated = updatePgnComment(
      this.pgn(),
      event.ply,
      event.comment,
      event.glyphId,
      event.hasBreak
    );
    if (updated !== this.pgn()) {
      this.pgn.set(updated);
    }
    if (event.ply === 0) {
      this.narrativeOverview.set(event.comment);
    }
  }

  onDeleteFromHere(ply: number): void {
    const updated = deletePgnMoveFrom(this.pgn(), ply);
    if (updated !== this.pgn()) {
      this.pgn.set(updated);
      this.currentPly.set(Math.max(0, ply - 1));
      this.saveStatusMessage.set('Truncated moves from this position');
      setTimeout(() => this.saveStatusMessage.set(null), 2000);
    }
  }

  undoLastBoardMove(): void {
    try {
      const chess = new Chess();
      const currentPgn = this.pgn().trim();
      if (currentPgn) {
        chess.loadPgn(currentPgn);
        const undone = chess.undo();
        if (undone) {
          this.pgn.set(chess.pgn());
          setTimeout(() => {
            this.currentPly.set(this.maxPly());
          }, 0);
          this.saveStatusMessage.set(`Undid move ${undone.san}`);
          setTimeout(() => this.saveStatusMessage.set(null), 2000);
        }
      }
    } catch (err) {
      console.warn('Could not undo move', err);
    }
  }

  annotateCurrentMove(): void {
    const move = this.currentMoveLabel();
    if (this.currentPly() === 0) return;

    const currentSections = this.sections();
    if (currentSections.length === 0) {
      this.addSectionAtCurrentMove();
      return;
    }

    // Target the section matching the current ply range, or default to the last section
    let targetIndex = currentSections.findIndex(
      (s) =>
        s.startPly !== undefined &&
        s.endPly !== undefined &&
        this.currentPly() >= s.startPly &&
        this.currentPly() <= s.endPly
    );
    if (targetIndex === -1) {
      targetIndex = currentSections.length - 1;
    }

    const section = currentSections[targetIndex];
    const updatedContent = (section.content || '') + ` **${move}** `;
    const newEndPly = Math.max(section.endPly || 0, this.currentPly());
    const newStartPly = section.startPly ? Math.min(section.startPly, this.currentPly()) : this.currentPly();

    this.sections.update((list) => {
      const copy = [...list];
      copy[targetIndex] = {
        ...copy[targetIndex],
        content: updatedContent,
        startPly: newStartPly,
        endPly: newEndPly,
        keyMoveSan: copy[targetIndex].keyMoveSan || move,
      };
      return copy;
    });

    this.saveStatusMessage.set(`Annotated ${move} in Section ${targetIndex + 1}`);
    setTimeout(() => this.saveStatusMessage.set(null), 2500);
  }

  addSectionAtCurrentMove(): void {
    const ply = this.currentPly();
    const move = this.currentMoveLabel();
    const nextOrder = this.sections().length + 1;

    this.sections.update((list) => [
      ...list,
      {
        title: ply > 0 ? `Critical Phase: ${move}` : `Section ${nextOrder}`,
        order: nextOrder,
        startPly: ply > 0 ? Math.max(1, ply - 1) : 1,
        endPly: ply > 0 ? Math.min(this.maxPly(), ply + 2) : (this.maxPly() || 6),
        keyMoveSan: ply > 0 ? move : undefined,
        content:
          ply > 0
            ? `At **${move}**, the duel entered critical waters. Document the deep storyline and tactical maneuvers here.`
            : 'Add your analytical storyline here.',
      },
    ]);

    this.saveStatusMessage.set(`Added new section at ${move}`);
    setTimeout(() => this.saveStatusMessage.set(null), 2500);
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
    const m = this.activeMatch();
    const draftPayload = {
      matchId: this.selectedMatchId(),
      championshipTitle: this.championshipTitle(),
      matchTitle: this.matchTitle(),
      matchSubtitle: this.matchSubtitle(),
      year: m.year,
      champion: this.champion(),
      challenger: this.challenger(),
      winner: m.winner,
      score: m.score,
      format: m.format,
      location: this.location(),
      matchDescription: this.matchDescription(),
      whitePlayer: this.whitePlayer(),
      blackPlayer: this.blackPlayer(),
      result: this.result(),
      eco: this.eco(),
      openingName: this.openingName(),
      pgn: this.pgn(),
      narrativeOverview: this.narrativeOverview(),
      sections: this.sections(),
      gamesSummary: this.gamesSummary(),
      updatedAt: new Date().toISOString(),
    };

    try {
      this.wccService.saveMatch(this.activeMatch());
      localStorage.setItem('wcc_editorial_draft', JSON.stringify(draftPayload));
      this.saveStatusMessage.set('Saved to Championship Directory & Draft!');
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
        if (data && data.matchTitle) {
          this.selectedMatchId.set(data.matchId || 'new');
          this.championshipTitle.set(data.championshipTitle || '2026 World Chess Championship');
          this.matchTitle.set(data.matchTitle);
          this.matchSubtitle.set(data.matchSubtitle || '');
          this.champion.set(data.champion || '');
          this.challenger.set(data.challenger || '');
          this.location.set(data.location || '');
          this.matchDescription.set(data.matchDescription || '');
          this.whitePlayer.set(data.whitePlayer || '');
          this.blackPlayer.set(data.blackPlayer || '');
          this.result.set(data.result || '*');
          this.eco.set(data.eco || 'C00');
          this.openingName.set(data.openingName || 'Classical Match Game');
          this.pgn.set(data.pgn || '');
          this.narrativeOverview.set(data.narrativeOverview || '');
          if (data.sections && data.sections.length > 0) {
            this.sections.set(data.sections);
          }
          if (data.gamesSummary && data.gamesSummary.length > 0) {
            this.gamesSummary.set(data.gamesSummary);
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
    this.wccService.saveMatch(this.activeMatch());
    const id = this.selectedMatchId();
    if (id && id !== 'new') {
      this.router.navigate(['/world-championships', id]);
    } else {
      this.router.navigate(['/admin/world-championships-editor']);
    }
  }
}

