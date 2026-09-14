import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { StudyApiService } from '../../features/study';
import {
  WorldChampionshipMatch,
  WorldChampionshipGame,
  MatchGameSummary,
} from '../models/world-championship.model';
import { environment } from '../../../environments/environment';
import { DevLogger } from '../utils/dev-logger';

@Injectable({
  providedIn: 'root',
})
export class WorldChampionshipService {
  private http = inject(HttpClient);
  private studyApiService = inject(StudyApiService);
  private apiUrl = environment.apiUrl;

  private readonly matchesList = signal<WorldChampionshipMatch[]>([]);
  private readonly studiesMap = signal<Map<number, number | string>>(new Map()); // year -> studyId
  readonly isFetchingStudies = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isLoaded = signal<boolean>(false);

  readonly allMatches = computed<WorldChampionshipMatch[]>(() => {
    const map = this.studiesMap();
    return this.matchesList().map((match: WorldChampionshipMatch) => {
      const studyId = map.get(match.year) || match.studyId;
      const games = match.games || [];
      const gamesSummary =
        match.gamesSummary && match.gamesSummary.length > 0
          ? match.gamesSummary
          : this.generateMatchGamesSummary(match, games);
      const coveredCount =
        match.coveredGamesCount ??
        games.filter(
          (g: WorldChampionshipGame) =>
            g.narrativeOverview || (g.sections && g.sections.length > 0)
        ).length;

      return {
        ...match,
        studyId: studyId || match.studyId,
        games,
        gamesSummary,
        gamesCount: gamesSummary.length || match.gamesCount || games.length,
        coveredGamesCount: coveredCount,
      };
    });
  });

  private generateMatchGamesSummary(
    match: WorldChampionshipMatch,
    matchGames: WorldChampionshipGame[]
  ): MatchGameSummary[] {
    if (
      match.score.toLowerCase().includes('default') ||
      match.score.toLowerCase().includes('forfeit')
    ) {
      return [
        {
          gameNumber: 1,
          white: match.champion,
          black: match.challenger,
          result: '1-0 (F)',
          opening: 'Title Conferred by Default / Uncontested',
          eco: 'N/A',
          hasStory: false,
          title: 'Uncontested Default',
        },
      ];
    }

    if (match.gamesSummary && match.gamesSummary.length > 0) {
      return match.gamesSummary.map((g) => {
        const game = matchGames.find(
          (f) => f.gameNumber === g.gameNumber || f.id === g.gameId
        );
        return {
          ...g,
          result: this.normalizeResult(g.result),
          hasStory: !!game || g.hasStory,
          gameId: game?.id || g.gameId,
          title: game?.title || g.title || `Game ${g.gameNumber}`,
        };
      });
    }

    let totalCount = 14;
    let s1 = 0;
    let s2 = 0;
    const scoreMatch = match.score.match(/(\d+(?:\.5)?)\s*-\s*(\d+(?:\.5)?)/);
    if (scoreMatch) {
      s1 = parseFloat(scoreMatch[1]);
      s2 = parseFloat(scoreMatch[2]);
      totalCount = Math.max(1, Math.round(s1 + s2));
    } else if (match.format) {
      const fmtMatch = match.format.match(/(\d+)\s*(?:Classical\s*)?Games/i);
      if (fmtMatch) {
        totalCount = parseInt(fmtMatch[1], 10);
      }
    }

    totalCount = Math.min(Math.max(1, totalCount), 48);

    const isChampWinner = match.winner === match.champion;
    const list: MatchGameSummary[] = [];

    for (let i = 1; i <= totalCount; i++) {
      const isWhiteChamp = i % 2 === 1;
      const white = isWhiteChamp ? match.champion : match.challenger;
      const black = isWhiteChamp ? match.challenger : match.champion;
      const game = matchGames.find((f) => f.gameNumber === i);

      let result: string = '1/2-1/2';
      if (game) {
        result = this.normalizeResult(game.result);
      } else if (i === totalCount && s1 !== s2) {
        result = isChampWinner
          ? isWhiteChamp
            ? '1-0'
            : '0-1'
          : isWhiteChamp
          ? '0-1'
          : '1-0';
      }

      list.push({
        gameNumber: i,
        white,
        black,
        result: this.normalizeResult(result),
        opening: game ? game.opening : 'Classical Match Game',
        eco: game ? game.eco : 'ECO',
        hasStory: !!game,
        gameId: game?.id,
        title: game?.title || `Game ${i}`,
      });
    }

    return list;
  }

  private normalizeResult(raw?: string): '1-0' | '0-1' | '1/2-1/2' | string {
    if (!raw) return '1/2-1/2';
    const t = raw.trim();
    if (t === '1-0' || t === '1 - 0' || t === '1-0 (F)') return '1-0';
    if (t === '0-1' || t === '0 - 1' || t === '0-1 (F)') return '0-1';
    if (
      t === '1/2-1/2' ||
      t === '1/2 - 1/2' ||
      t === '½-½' ||
      t === '½' ||
      t === '0.5-0.5'
    ) {
      return '1/2-1/2';
    }
    return t;
  }

  constructor() {
    this.loadStudiesAndMatch();
  }

  loadStudiesAndMatch(): void {
    this.isFetchingStudies.set(true);
    this.isLoading.set(true);

    // 1. Fetch matches and stories directly from the database API
    this.http.get<any>(`${this.apiUrl}/world-championships`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.isLoaded.set(true);
        const dbMatches: any[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        const mapped = dbMatches.map((item) => this.mapDbMatch(item));
        this.matchesList.set(mapped);
      },
      error: (err) => {
        this.isLoading.set(false);
        DevLogger.error(
          '[WorldChampionshipService] Could not reach WCC database API:',
          err
        );
      },
    });

    // 2. Fetch public studies including owner info
    this.studyApiService
      .getStudies(false, undefined, true, undefined, undefined, 'owner')
      .subscribe({
        next: (res) => {
          this.isFetchingStudies.set(false);
          const studies: any[] = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];
          const yearMap = new Map<number, number | string>();

          studies.forEach((study) => {
            const ownerName = (
              study.owner?.username ||
              study.owner?.name ||
              study.owner_name ||
              ''
            ).toLowerCase();
            const title = (study.name || '').trim();

            const isVonchess = ownerName.includes('vonchess');
            const matchYear = title.match(/(\d{4})\s*World\s*Chess\s*Championship/i);
            if (matchYear && matchYear[1]) {
              const year = parseInt(matchYear[1], 10);
              if (isVonchess || !yearMap.has(year)) {
                yearMap.set(year, study.id);
              }
            }
          });

          DevLogger.log(
            '[WorldChampionshipService] Resolved study links count:',
            yearMap.size
          );
          this.studiesMap.set(yearMap);
        },
        error: (err) => {
          this.isFetchingStudies.set(false);
          DevLogger.error(
            '[WorldChampionshipService] Error loading public studies:',
            err
          );
        },
      });
  }

  fetchMatchById(slugOrId: string): Observable<WorldChampionshipMatch> {
    return this.http.get<any>(`${this.apiUrl}/world-championships/${slugOrId}`).pipe(
      map((res) => {
        const item = res?.data || res;
        const mapped = this.mapDbMatch(item);
        const current = [...this.matchesList()];
        const idx = current.findIndex((m) => m.id === mapped.id || m.id === slugOrId);
        if (idx >= 0) {
          current[idx] = mapped;
        } else {
          current.push(mapped);
        }
        this.matchesList.set(current);
        return mapped;
      }),
      catchError((err) => {
        DevLogger.error(`[WorldChampionshipService] Error fetching match ${slugOrId}:`, err);
        throw err;
      })
    );
  }

  private mapDbMatch(dbItem: any): WorldChampionshipMatch {
    const games: WorldChampionshipGame[] = (dbItem.games || []).map((g: any) => ({
      id: g.slug || `${dbItem.slug || dbItem.id}-g${g.game_number || 1}`,
      matchId: dbItem.slug || `${dbItem.id}`,
      gameNumber: g.game_number || 1,
      title: g.title,
      subtitle: g.subtitle,
      white: g.white_player || g.white,
      black: g.black_player || g.black,
      result: g.result,
      date: g.game_date || g.date,
      eco: g.eco,
      opening: g.opening_name || g.opening,
      pgn: g.pgn,
      initialFen: g.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      totalPlies: g.total_plies || 0,
      narrativeOverview: g.narrative_overview || g.narrativeOverview,
      sections: (g.sections || []).map((s: any) => ({
        id: `${s.id || ''}`,
        title: s.title,
        order: s.order || 1,
        content: s.content || '',
        startPly: s.start_ply ?? s.startPly,
        endPly: s.end_ply ?? s.endPly,
        keyMoveSan: s.key_move_san ?? s.keyMoveSan,
      })),
    }));

    const coveredGamesCount = games.filter(
      (g) => g.narrativeOverview || (g.sections && g.sections.length > 0)
    ).length;

    let keyHighlights: string[] = [];
    if (Array.isArray(dbItem.key_highlights)) {
      keyHighlights = dbItem.key_highlights;
    } else if (typeof dbItem.key_highlights === 'string') {
      try {
        keyHighlights = JSON.parse(dbItem.key_highlights);
      } catch {
        keyHighlights = [];
      }
    }

    return {
      id: dbItem.slug || `${dbItem.id}`,
      year: dbItem.year,
      displayYear: dbItem.display_year,
      title: dbItem.title,
      champion: dbItem.champion,
      challenger: dbItem.challenger,
      winner: dbItem.winner,
      score: dbItem.score,
      format: dbItem.format,
      location: dbItem.location,
      description: dbItem.description,
      keyHighlights,
      studyId: dbItem.study_id,
      games,
      gamesSummary: games.map((g) => ({
        gameNumber: g.gameNumber,
        white: g.white,
        black: g.black,
        result: g.result,
        eco: g.eco,
        opening: g.opening,
        hasStory: !!(g.narrativeOverview || (g.sections && g.sections.length > 0)),
        gameId: g.id,
        title: g.title,
      })),
      gamesCount: dbItem.games_count || games.length,
      coveredGamesCount,
    };
  }

  getMatchById(id: string): WorldChampionshipMatch | undefined {
    return this.allMatches().find((m: WorldChampionshipMatch) => m.id === id);
  }

  getGamesForMatch(matchId: string): WorldChampionshipGame[] {
    const match = this.getMatchById(matchId);
    return match?.games || [];
  }

  getAllGamesForMatch(matchId: string): WorldChampionshipGame[] {
    const match = this.getMatchById(matchId);
    if (!match) return [];

    const games = match.games || [];
    const summaries = match.gamesSummary || [];

    if (summaries.length === 0) {
      return games;
    }

    return summaries.map((s) => {
      const found = games.find(
        (f) => f.gameNumber === s.gameNumber || f.id === s.gameId
      );
      if (found) {
        return found;
      }

      // Synthesize playable game shell for non-annotated game
      return {
        id: `${match.id}-g${s.gameNumber}`,
        matchId: match.id,
        gameNumber: s.gameNumber,
        title: s.title || `Game ${s.gameNumber}: ${s.white} vs. ${s.black}`,
        subtitle: `${s.white} vs. ${s.black} – ${match.location}, ${match.year}`,
        white: s.white,
        black: s.black,
        result: s.result,
        date: s.date || `${match.year}.01.01`,
        eco: s.eco || 'C00',
        opening: s.opening || 'Classical Match Game',
        pgn: `[Event "${match.title}"]\n[Site "${match.location}"]\n[Date "${match.year}.01.01"]\n[Round "${s.gameNumber}"]\n[White "${s.white}"]\n[Black "${s.black}"]\n[Result "${s.result}"]\n[ECO "${s.eco || 'C00'}"]\n[Opening "${s.opening || 'Classical Match Game'}"]\n\n1. e4 e5 2. Nf3 Nc6 *`,
        totalPlies: 4,
        narrativeOverview: undefined,
        sections: [],
      };
    });
  }

  saveMatch(match: WorldChampionshipMatch): void {
    const current = this.matchesList();
    const idx = current.findIndex((m: WorldChampionshipMatch) => m.id === match.id);
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = match;
      this.matchesList.set(updated);
    } else {
      this.matchesList.set([match, ...current]);
    }

    this.persistMatchToApi(match);
  }

  private persistMatchToApi(match: WorldChampionshipMatch): void {
    const firstGame = match.games && match.games.length > 0 ? match.games[0] : null;
    const payload: any = {
      title: match.title,
      year: match.year,
      champion: match.champion,
      challenger: match.challenger,
      winner: match.winner,
      score: match.score,
      format: match.format,
      location: match.location,
      description: match.description,
      key_highlights: match.keyHighlights || [],
      study_id: match.studyId || null,
      slug: match.id,
    };

    if (firstGame) {
      payload.game = {
        game_number: firstGame.gameNumber,
        title: firstGame.title,
        subtitle: firstGame.subtitle,
        white_player: firstGame.white,
        black_player: firstGame.black,
        result: firstGame.result,
        pgn: firstGame.pgn,
        eco: firstGame.eco,
        opening_name: firstGame.opening,
        total_plies: firstGame.totalPlies || 0,
        narrative_overview: firstGame.narrativeOverview,
        sections: (firstGame.sections || []).map((s, idx) => ({
          title: s.title,
          content: s.content,
          start_ply: s.startPly,
          end_ply: s.endPly,
          key_move_san: s.keyMoveSan,
          order: s.order || idx + 1,
        })),
      };
    }

    this.http.post(`${this.apiUrl}/world-championships`, payload).subscribe({
      next: (res) =>
        DevLogger.log('[WorldChampionshipService] Match persisted to database:', res),
      error: (err) =>
        DevLogger.warn('[WorldChampionshipService] Could not persist to database:', err),
    });
  }

  deleteMatch(matchId: string): void {
    this.matchesList.update((list: WorldChampionshipMatch[]) =>
      list.filter((m: WorldChampionshipMatch) => m.id !== matchId)
    );
    this.http.delete(`${this.apiUrl}/world-championships/${matchId}`).subscribe({
      next: () =>
        DevLogger.log('[WorldChampionshipService] Match deleted from database:', matchId),
      error: (err) =>
        DevLogger.warn('[WorldChampionshipService] Could not delete from database:', err),
    });
  }
}
