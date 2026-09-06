import { Injectable, inject, signal, computed } from '@angular/core';
import { StudyApiService } from './study-api.service';
import { WORLD_CHAMPIONSHIP_MATCHES } from '../data/world-championships.data';
import { FEATURED_WCC_GAMES } from '../data/world-championship-games.data';
import {
  WorldChampionshipMatch,
  WorldChampionshipEra,
  WorldChampionshipGame,
  MatchGameSummary,
} from '../models/world-championship.model';
import { DevLogger } from '../utils/dev-logger';

@Injectable({
  providedIn: 'root',
})
export class WorldChampionshipService {
  private studyApiService = inject(StudyApiService);

  private readonly matchesList = signal<WorldChampionshipMatch[]>(WORLD_CHAMPIONSHIP_MATCHES);
  private readonly studiesMap = signal<Map<number, number | string>>(new Map()); // year -> studyId
  readonly isFetchingStudies = signal<boolean>(false);

  readonly allMatches = computed(() => {
    const map = this.studiesMap();
    return this.matchesList().map((match) => {
      const studyId = map.get(match.year);
      const games = FEATURED_WCC_GAMES[match.id] || [];
      const gamesSummary = this.generateMatchGamesSummary(match, games);
      const coveredCount = games.length;

      return {
        ...match,
        studyId: studyId || match.studyId,
        games,
        gamesSummary,
        gamesCount: gamesSummary.length,
        coveredGamesCount: coveredCount,
      };
    });
  });

  private generateMatchGamesSummary(
    match: WorldChampionshipMatch,
    featuredGames: WorldChampionshipGame[]
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
        const featured = featuredGames.find(
          (f) => f.gameNumber === g.gameNumber || f.id === g.gameId
        );
        return {
          ...g,
          result: this.normalizeResult(g.result),
          hasStory: !!featured || g.hasStory,
          gameId: featured?.id || g.gameId,
          title: featured?.title || g.title || `Game ${g.gameNumber}`,
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
      const featured = featuredGames.find((f) => f.gameNumber === i);

      let result: string = '1/2-1/2';
      if (featured) {
        result = this.normalizeResult(featured.result);
      } else if (i === totalCount && s1 !== s2) {
        // Final game often decisive
        result = isChampWinner ? (isWhiteChamp ? '1-0' : '0-1') : (isWhiteChamp ? '0-1' : '1-0');
      }

      list.push({
        gameNumber: i,
        white,
        black,
        result: this.normalizeResult(result),
        opening: featured ? featured.opening : 'Classical Match Game',
        eco: featured ? featured.eco : 'ECO',
        hasStory: !!featured,
        gameId: featured?.id,
        title: featured?.title || `Game ${i}`,
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
    // Fetch public studies including owner info
    this.studyApiService.getStudies(false, undefined, true, undefined, undefined, 'owner').subscribe({
      next: (res) => {
        this.isFetchingStudies.set(false);
        const studies: any[] = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const yearMap = new Map<number, number | string>();

        studies.forEach((study) => {
          const ownerName = (study.owner?.username || study.owner?.name || study.owner_name || '').toLowerCase();
          const title = (study.name || '').trim();

          // Check if study is created by account vonchess or starts/contains <Year> World Chess Championship
          const isVonchess = ownerName.includes('vonchess');
          
          // Match year pattern e.g. "1886 World Chess Championship" or "2024 World Chess Championship"
          const matchYear = title.match(/(\d{4})\s*World\s*Chess\s*Championship/i);
          if (matchYear && matchYear[1]) {
            const year = parseInt(matchYear[1], 10);
            // If study is created by vonchess, or if no study assigned for that year yet
            if (isVonchess || !yearMap.has(year)) {
              yearMap.set(year, study.id);
            }
          }
        });

        DevLogger.log('[WorldChampionshipService] Resolved study links count:', yearMap.size);
        this.studiesMap.set(yearMap);
      },
      error: (err) => {
        this.isFetchingStudies.set(false);
        DevLogger.error('[WorldChampionshipService] Error loading public studies:', err);
      },
    });
  }

  getMatchById(id: string): WorldChampionshipMatch | undefined {
    return this.allMatches().find((m) => m.id === id);
  }

  getGamesForMatch(matchId: string): WorldChampionshipGame[] {
    if (FEATURED_WCC_GAMES[matchId]) {
      return FEATURED_WCC_GAMES[matchId];
    }
    // Fallback: Check if match exists and generate a placeholder game if needed
    const match = this.getMatchById(matchId);
    if (!match) return [];

    return [
      {
        id: `${match.id}-g1`,
        matchId: match.id,
        gameNumber: 1,
        title: `${match.year} Title Clash: ${match.champion} vs. ${match.challenger}`,
        subtitle: `${match.champion} vs. ${match.challenger} – ${match.location}`,
        white: match.champion,
        black: match.challenger,
        result: match.score.split('-')[0].trim() === '1' ? '1-0' : '1/2-1/2',
        pgn: `[Event "${match.title}"]\n[Site "${match.location}"]\n[Date "${match.year}.01.01"]\n[White "${match.champion}"]\n[Black "${match.challenger}"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *`,
        totalPlies: 10,
        narrativeOverview: match.description,
        sections: [
          {
            title: 'Historical Encounter',
            order: 1,
            startPly: 1,
            endPly: 10,
            content: `The duel between **${match.champion}** and **${match.challenger}** in ${match.year} captivated the chess world. The contest concluded with a final score of **${match.score}** in favor of **${match.winner}**.\n\nOpening moves: **1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7** established classic battlegrounds.`,
          },
        ],
      },
    ];
  }

  getAllGamesForMatch(matchId: string): WorldChampionshipGame[] {
    const match = this.getMatchById(matchId);
    if (!match) return [];

    const featured = FEATURED_WCC_GAMES[matchId] || [];
    const summaries = match.gamesSummary || [];

    if (summaries.length === 0) {
      return this.getGamesForMatch(matchId);
    }

    return summaries.map((s) => {
      const foundFeatured = featured.find(
        (f) => f.gameNumber === s.gameNumber || f.id === s.gameId
      );
      if (foundFeatured) {
        return foundFeatured;
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
        narrativeOverview: `Round ${s.gameNumber} of the ${match.year} World Chess Championship held in ${match.location}. The duel between ${s.white} (White) and ${s.black} (Black) in ${s.opening || 'the match'} concluded in a ${s.result} result.`,
        sections: [
          {
            title: 'Round Summary',
            order: 1,
            startPly: 1,
            endPly: 4,
            content: `Game ${s.gameNumber} featured **${s.white}** playing White against **${s.black}** playing Black in the **${s.opening || 'Classical'}** opening (**${s.eco || 'ECO'}**). The encounter concluded with a final result of **${s.result}**.\n\n*Move-by-move editorial commentary has not yet been authored for this round. Click "Edit Story" above to author detailed annotations.*`,
          },
        ],
      };
    });
  }

  getMatchesByEra(era: WorldChampionshipEra): WorldChampionshipMatch[] {
    return this.allMatches().filter((m) => m.era === era);
  }
}

