import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, switchMap } from 'rxjs';

export interface ChesscomPlayerInfo {
  username: string;
  rating: number;
  result: string;
  uuid?: string;
}

export interface ChesscomGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  time_class: 'blitz' | 'rapid' | 'bullet' | 'daily' | string;
  white: ChesscomPlayerInfo;
  black: ChesscomPlayerInfo;
}

export interface ChesscomMatchupResult {
  success: boolean;
  blitzGame?: ChesscomGame;
  rapidGame?: ChesscomGame;
  blitzScoreA?: number;
  blitzScoreB?: number;
  rapidScoreA?: number;
  rapidScoreB?: number;
  allCandidates: ChesscomGame[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChesscomService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://api.chess.com/pub/player';

  /**
   * Fetch game archive for a player for a specific year and month.
   */
  fetchMonthlyGames(username: string, year: number, month: number): Observable<ChesscomGame[]> {
    const cleanUser = username.trim().toLowerCase();
    const mm = String(month).padStart(2, '0');
    const url = `${this.baseUrl}/${cleanUser}/games/${year}/${mm}`;

    return this.http.get<{ games: ChesscomGame[] }>(url).pipe(
      map(res => res.games || []),
      catchError(err => {
        console.warn(`ChesscomService: Failed to fetch games for ${cleanUser} (${year}/${mm})`, err);
        return of([]);
      })
    );
  }

  /**
   * Find head-to-head match games between two players for a specific PCAP matchday.
   * - Filters by 24h Philippine Time (UTC+8) window.
   * - Identifies 180+2 (Blitz) and 900* (Rapid) time controls.
   * - Computes official PCAP points (Blitz: 1/0.5/0, Rapid: 2/1/0).
   */
  findHeadToHeadGames(
    playerAHandle: string,
    playerBHandle: string,
    matchDatePht?: string
  ): Observable<ChesscomMatchupResult> {
    const uA = playerAHandle?.trim().toLowerCase();
    const uB = playerBHandle?.trim().toLowerCase();

    if (!uA || !uB) {
      return of({
        success: false,
        allCandidates: [],
        message: 'Both Chess.com usernames are required to search for head-to-head games.'
      });
    }

    if (uA === uB) {
      return of({
        success: false,
        allCandidates: [],
        message: 'Player A and Player B Chess.com usernames cannot be identical.'
      });
    }

    // Determine target year/month and PHT date window boundaries
    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth() + 1;
    let minTimestamp = 0;
    let maxTimestamp = Infinity;

    if (matchDatePht && /^\d{4}-\d{2}-\d{2}$/.test(matchDatePht.trim())) {
      const cleanDate = matchDatePht.trim();
      const [yStr, mStr] = cleanDate.split('-');
      targetYear = parseInt(yStr, 10);
      targetMonth = parseInt(mStr, 10);

      // PHT is UTC+8: Midnight to 23:59:59 in Philippine Time
      const startPht = new Date(`${cleanDate}T00:00:00+08:00`).getTime() / 1000;
      const endPht = new Date(`${cleanDate}T23:59:59+08:00`).getTime() / 1000;
      minTimestamp = startPht;
      maxTimestamp = endPht;
    }

    return this.fetchMonthlyGames(uA, targetYear, targetMonth).pipe(
      switchMap(allGames => {
        const headToHead = allGames.filter(g => {
          const w = g.white?.username?.toLowerCase();
          const b = g.black?.username?.toLowerCase();
          return (w === uA && b === uB) || (w === uB && b === uA);
        });

        if (headToHead.length > 0) {
          return of(headToHead);
        }

        // Fallback: Query Player B's monthly archive in case Player A was cached or incomplete
        return this.fetchMonthlyGames(uB, targetYear, targetMonth).pipe(
          map(gamesB => gamesB.filter(g => {
            const w = g.white?.username?.toLowerCase();
            const b = g.black?.username?.toLowerCase();
            return (w === uA && b === uB) || (w === uB && b === uA);
          }))
        );
      }),
      map(headToHead => {
        if (headToHead.length === 0) {
          return {
            success: false,
            allCandidates: [],
            message: `No games found on Chess.com between @${playerAHandle} and @${playerBHandle} for ${targetYear}/${String(targetMonth).padStart(2, '0')}.`
          };
        }

        // Apply date filter if date was specified
        let dateFiltered = headToHead;
        if (minTimestamp > 0 && maxTimestamp < Infinity) {
          const onDate = headToHead.filter(g => g.end_time >= minTimestamp && g.end_time <= maxTimestamp);
          // If games matched on exact date, prioritize them; otherwise retain all for candidate picker
          if (onDate.length > 0) {
            dateFiltered = onDate;
          }
        }

        // Isolate Blitz (prioritize '180+2' or time_class === 'blitz')
        const blitzCandidates = dateFiltered.filter(g => g.time_class === 'blitz' || g.time_control.startsWith('180'));
        const blitzGame = blitzCandidates.find(g => g.time_control === '180+2') || blitzCandidates[0];

        // Isolate Rapid (prioritize '900' / '900+5' or time_class === 'rapid')
        const rapidCandidates = dateFiltered.filter(g => g.time_class === 'rapid' || g.time_control.startsWith('900'));
        const rapidGame = rapidCandidates.find(g => g.time_control === '900' || g.time_control.startsWith('900+')) || rapidCandidates[0];

        const scores = this.calculateMatchScores(uA, blitzGame, rapidGame);

        return {
          success: Boolean(blitzGame || rapidGame),
          blitzGame,
          rapidGame,
          blitzScoreA: scores.blitzScoreA,
          blitzScoreB: scores.blitzScoreB,
          rapidScoreA: scores.rapidScoreA,
          rapidScoreB: scores.rapidScoreB,
          allCandidates: dateFiltered,
          message: Boolean(blitzGame && rapidGame)
            ? 'Successfully retrieved both Blitz and Rapid games!'
            : blitzGame
            ? 'Retrieved Blitz game (Rapid game not found on this date).'
            : rapidGame
            ? 'Retrieved Rapid game (Blitz game not found on this date).'
            : 'Games were found but did not match standard PCAP time controls.'
        };
      })
    );
  }

  /**
   * Determine board score from Chess.com game results.
   * Blitz: 1 pt (Win), 0.5 pt (Draw), 0 pt (Loss)
   * Rapid: 2 pts (Win), 1 pt (Draw), 0 pt (Loss)
   */
  calculateMatchScores(
    playerAHandle: string,
    blitzGame?: ChesscomGame,
    rapidGame?: ChesscomGame
  ): { blitzScoreA: number; blitzScoreB: number; rapidScoreA: number; rapidScoreB: number } {
    const uA = playerAHandle.trim().toLowerCase();

    const getPoints = (game: ChesscomGame | undefined, winPoints: number, drawPoints: number) => {
      if (!game) return { scoreA: 0, scoreB: 0 };
      const isPlayerAWhite = game.white.username.toLowerCase() === uA;
      const myResult = isPlayerAWhite ? game.white.result : game.black.result;
      const oppResult = isPlayerAWhite ? game.black.result : game.white.result;

      if (myResult === 'win') {
        return { scoreA: winPoints, scoreB: 0 };
      }
      if (oppResult === 'win') {
        return { scoreA: 0, scoreB: winPoints };
      }
      // Draws (agreed, repetition, stalemate, timevsinsufficient, insufficient, 50move)
      return { scoreA: drawPoints, scoreB: drawPoints };
    };

    const blitz = getPoints(blitzGame, 1.0, 0.5);
    const rapid = getPoints(rapidGame, 2.0, 1.0);

    return {
      blitzScoreA: blitz.scoreA,
      blitzScoreB: blitz.scoreB,
      rapidScoreA: rapid.scoreA,
      rapidScoreB: rapid.scoreB
    };
  }
}
