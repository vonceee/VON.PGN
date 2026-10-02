import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, catchError, map, tap, finalize, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PcapTeam, PcapMatch, PcapStanding, PcapConference, PcapMatchStatus } from '../models/pcap.model';

@Injectable({
  providedIn: 'root'
})
export class PcapService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pcap`;

  readonly isLoading = signal<boolean>(true);

  private readonly _teams = signal<PcapTeam[]>([]);
  private readonly _matches = signal<PcapMatch[]>([]);
  private readonly _standings = signal<PcapStanding[]>([]);

  private lastSyncedAt = 0;
  private readonly CACHE_TTL_MS = 3 * 60 * 1000;
  private activeSync$?: Observable<boolean>;

  syncFromBackend(force: boolean = false): Observable<boolean> {
    const isFresh = (Date.now() - this.lastSyncedAt) < this.CACHE_TTL_MS;
    if (!force && this.lastSyncedAt > 0 && isFresh) {
      this.isLoading.set(false);
      return of(true);
    }

    if (!force && this.activeSync$) {
      return this.activeSync$;
    }

    this.isLoading.set(true);

    const headers: Record<string, string> = force
      ? { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      : {};

    const sync$ = forkJoin({
      teams: this.http.get<{ success: boolean; data: PcapTeam[] }>(`${this.apiUrl}/teams`, { headers }).pipe(
        catchError((err) => {
          console.warn('PcapService: Failed to fetch teams from backend', err);
          return of(null);
        })
      ),
      matches: this.http.get<{ success: boolean; data: PcapMatch[] }>(`${this.apiUrl}/matches`, { headers }).pipe(
        catchError((err) => {
          console.warn('PcapService: Failed to fetch matches from backend', err);
          return of(null);
        })
      ),
      standings: this.http.get<{ success: boolean; data: PcapStanding[] }>(`${this.apiUrl}/standings`, { headers }).pipe(
        catchError((err) => {
          console.warn('PcapService: Failed to fetch standings from backend', err);
          return of(null);
        })
      )
    }).pipe(
      map(({ teams, matches, standings }) => {
        if (teams?.data && Array.isArray(teams.data)) {
          this._teams.set(teams.data);
        }
        if (matches?.data !== undefined && Array.isArray(matches.data)) {
          this._matches.set(matches.data);
        }
        if (standings?.data && Array.isArray(standings.data)) {
          this._standings.set(standings.data);
        }
        this.lastSyncedAt = Date.now();
        return true;
      }),
      catchError((e) => {
        console.warn('PcapService: Backend sync error, keeping current state', e);
        return of(false);
      }),
      finalize(() => {
        this.isLoading.set(false);
        this.activeSync$ = undefined;
      }),
      shareReplay(1)
    );

    this.activeSync$ = sync$;
    sync$.subscribe();

    return sync$;
  }

  readonly conferenceFilter = signal<PcapConference | 'all'>('all');
  readonly statusFilter = signal<PcapMatchStatus | 'all'>('all');
  readonly searchQuery = signal<string>('');

  readonly allTeams = this._teams.asReadonly();
  readonly allMatches = this._matches.asReadonly();
  readonly allStandings = this._standings.asReadonly();

  readonly alphaTeams = computed(() =>
    this._teams().filter(t => t.conference === 'alpha')
  );

  readonly omegaTeams = computed(() =>
    this._teams().filter(t => t.conference === 'omega')
  );

  readonly northTeams = this.alphaTeams;
  readonly southTeams = this.omegaTeams;

  readonly alphaStandings = computed(() =>
    this._standings()
      .filter(s => s.conference === 'alpha')
      .sort((a, b) => b.matchPoints - a.matchPoints || b.boardPointsDiff - a.boardPointsDiff)
      .map((s, idx) => ({ ...s, rank: idx + 1 }))
  );

  readonly omegaStandings = computed(() =>
    this._standings()
      .filter(s => s.conference === 'omega')
      .sort((a, b) => b.matchPoints - a.matchPoints || b.boardPointsDiff - a.boardPointsDiff)
      .map((s, idx) => ({ ...s, rank: idx + 1 }))
  );

  readonly northStandings = this.alphaStandings;
  readonly southStandings = this.omegaStandings;

  readonly upcomingMatches = computed(() =>
    this._matches().filter(m => m.status === 'upcoming')
  );

  readonly completedMatches = computed(() =>
    this._matches().filter(m => m.status === 'completed')
  );

  readonly filteredTeams = computed(() => {
    const conf = this.conferenceFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return this._teams().filter(team => {
      const matchConf = conf === 'all' || team.conference === conf;
      if (!matchConf) return false;

      if (!query) return true;

      const inName = team.name.toLowerCase().includes(query);
      const inRoster = team.roster.some(p =>
        p.name.toLowerCase().includes(query) ||
        (p.title && p.title.toLowerCase().includes(query))
      );

      return inName || inRoster;
    });
  });

  readonly filteredMatches = computed(() => {
    const conf = this.conferenceFilter();
    const status = this.statusFilter();

    return this._matches().filter(match => {
      const matchConf =
        conf === 'all' ||
        match.conference === conf ||
        match.teamA.conference === conf ||
        match.teamB.conference === conf;

      const matchStatus = status === 'all' || match.status === status;

      return matchConf && matchStatus;
    });
  });

  readonly leagueStats = computed(() => {
    const teams = this._teams();
    const matches = this._matches();
    const upcomingCount = matches.filter(m => m.status === 'upcoming').length;
    const completedCount = matches.filter(m => m.status === 'completed').length;

    let totalGMs = 0;
    let totalIMs = 0;
    teams.forEach(t => {
      t.roster.forEach(p => {
        if (p.title === 'GM') totalGMs++;
        if (p.title === 'IM') totalIMs++;
      });
    });

    const alphaCount = teams.filter(t => t.conference === 'alpha').length;
    const omegaCount = teams.filter(t => t.conference === 'omega').length;

    return {
      totalTeams: teams.length,
      alphaCount,
      omegaCount,
      northCount: alphaCount,
      southCount: omegaCount,
      upcomingCount,
      completedCount,
      totalGMs,
      totalIMs,
      season: '2026 Season • All-Filipino Cup'
    };
  });

  getTeamById(id: string): PcapTeam | undefined {
    return this._teams().find(t => t.id === id);
  }

  getMatchById(id: string): PcapMatch | undefined {
    return this._matches().find(m => m.id === id);
  }

  getMatch(id: string): Observable<PcapMatch | null> {
    const cached = this._matches().find(m => m.id === id);
    if (cached) {
      return of(cached);
    }
    return this.http.get<{ success: boolean; data: PcapMatch }>(`${this.apiUrl}/matches/${id}`).pipe(
      map(res => res.data || null),
      tap(match => {
        if (match) {
          this._matches.update(matches => {
            const index = matches.findIndex(m => m.id === match.id);
            if (index >= 0) {
              const updated = [...matches];
              updated[index] = match;
              return updated;
            }
            return [...matches, match];
          });
        }
      }),
      catchError(err => {
        console.warn(`PcapService: Failed to fetch match ${id}`, err);
        return of(null);
      })
    );
  }


  addTeam(team: PcapTeam): Observable<PcapTeam> {
    return this.http.post<{ success: boolean; data: PcapTeam }>(`${this.apiUrl}/teams`, team).pipe(
      map(res => res.data || team),
      tap(persistedTeam => {
        this._teams.update(teams => [persistedTeam, ...teams.filter(t => t.id !== persistedTeam.id)]);
        const existingStanding = this._standings().find(s => s.teamId === persistedTeam.id);
        if (!existingStanding) {
          const newStanding: PcapStanding = {
            teamId: persistedTeam.id,
            teamName: persistedTeam.name,
            conference: persistedTeam.conference,
            matchesPlayed: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            matchPoints: 0,
            boardPointsFor: 0,
            boardPointsAgainst: 0,
            boardPointsDiff: 0,
            form: [],
            rank: 99
          };
          this._standings.update(standings => [...standings, newStanding]);
        }
        this.lastSyncedAt = 0;
      })
    );
  }

  updateTeam(id: string, updates: Partial<PcapTeam>): Observable<PcapTeam> {
    return this.http.put<{ success: boolean; data: PcapTeam }>(`${this.apiUrl}/teams/${id}`, updates).pipe(
      map(res => res.data),
      tap(updatedTeam => {
        const teamData = updatedTeam || updates;
        this._teams.update(teams =>
          teams.map(t => (t.id === id ? { ...t, ...teamData } : t))
        );
        this._standings.update(standings =>
          standings.map(s => {
            if (s.teamId === id) {
              return {
                ...s,
                teamName: teamData.name ?? s.teamName,
                conference: teamData.conference ?? s.conference
              };
            }
            return s;
          })
        );
        this.lastSyncedAt = 0;
      })
    );
  }

  deleteTeam(id: string): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/teams/${id}`).pipe(
      map(res => res.success ?? true),
      tap(() => {
        this._teams.update(teams => teams.filter(t => t.id !== id));
        this._standings.update(standings => standings.filter(s => s.teamId !== id));
        this.lastSyncedAt = 0;
      })
    );
  }

  addMatch(match: PcapMatch): Observable<PcapMatch> {
    return this.http.post<{ success: boolean; data: PcapMatch }>(`${this.apiUrl}/matches`, match).pipe(
      map(res => res.data || match),
      tap(persistedMatch => {
        this._matches.update(matches => [persistedMatch, ...matches.filter(m => m.id !== persistedMatch.id)]);
        this.lastSyncedAt = 0;
      })
    );
  }

  updateMatch(id: string, updates: Partial<PcapMatch>): Observable<PcapMatch> {
    return this.http.put<{ success: boolean; data: PcapMatch }>(`${this.apiUrl}/matches/${id}`, updates).pipe(
      map(res => res.data),
      tap(updatedMatch => {
        const matchData = updatedMatch || updates;
        this._matches.update(matches =>
          matches.map(m => (m.id === id ? { ...m, ...matchData } : m))
        );
        this.lastSyncedAt = 0;
      })
    );
  }

  deleteMatch(id: string): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/matches/${id}`).pipe(
      map(res => res.success ?? true),
      tap(() => {
        this._matches.update(matches => matches.filter(m => m.id !== id));
        this.lastSyncedAt = 0;
      })
    );
  }

  updateStanding(teamId: string, updates: Partial<PcapStanding>): Observable<PcapStanding> {
    return this.http.put<{ success: boolean; data: PcapStanding }>(`${this.apiUrl}/standings/${teamId}`, updates).pipe(
      map(res => res.data),
      tap(updatedStanding => {
        const standingData = updatedStanding || updates;
        this._standings.update(standings =>
          standings.map(s => {
            if (s.teamId === teamId) {
              const updated = { ...s, ...standingData };
              updated.boardPointsDiff = Number((updated.boardPointsFor - updated.boardPointsAgainst).toFixed(1));
              return updated;
            }
            return s;
          })
        );
        this.lastSyncedAt = 0;
      })
    );
  }

  recalculateStandingsFromMatches(): void {
    const teams = this._teams();
    const completed = this._matches().filter(m => m.status === 'completed');

    const updatedStandings: PcapStanding[] = teams.map(team => {
      let matchesPlayed = 0;
      let won = 0;
      let drawn = 0;
      let lost = 0;
      let boardPointsFor = 0;
      let boardPointsAgainst = 0;
      const form: ('W' | 'D' | 'L')[] = [];

      const teamMatches = completed.filter(m => m.teamA.id === team.id || m.teamB.id === team.id);

      for (const m of teamMatches) {
        matchesPlayed++;
        const isTeamA = m.teamA.id === team.id;
        const ptsFor = isTeamA ? m.scoreA : m.scoreB;
        const ptsAgainst = isTeamA ? m.scoreB : m.scoreA;

        boardPointsFor += ptsFor;
        boardPointsAgainst += ptsAgainst;

        if (ptsFor > ptsAgainst) {
          won++;
          form.push('W');
        } else if (ptsFor === ptsAgainst) {
          drawn++;
          form.push('D');
        } else {
          lost++;
          form.push('L');
        }
      }

      const matchPoints = won * 3 + drawn * 1;
      const boardPointsDiff = Number((boardPointsFor - boardPointsAgainst).toFixed(1));

      return {
        teamId: team.id,
        teamName: team.name,
        conference: team.conference,
        matchesPlayed,
        won,
        drawn,
        lost,
        matchPoints,
        boardPointsFor: Number(boardPointsFor.toFixed(1)),
        boardPointsAgainst: Number(boardPointsAgainst.toFixed(1)),
        boardPointsDiff,
        form: form.slice(-5),
        rank: 1
      };
    });

    this._standings.set(updatedStandings);
    this.lastSyncedAt = 0;
  }

  clearAllData(): void {
    this._teams.set([]);
    this._matches.set([]);
    this._standings.set([]);
    this.lastSyncedAt = 0;
  }

  resetToDefaults(): void {
    this.isLoading.set(true);
    this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/reset`, {}).subscribe({
      next: () => this.syncFromBackend(true),
      error: (e) => {
        console.warn('Failed to reset backend PCAP database', e);
        this.isLoading.set(false);
      }
    });
  }

  loadSampleData(): void {
    this.resetToDefaults();
  }
}
