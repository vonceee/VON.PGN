import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PcapTeam, PcapMatch, PcapStanding, PcapConference, PcapMatchStatus } from '../models/pcap.model';

const STORAGE_KEYS = {
  TEAMS: 'pcap_teams_v5',
  MATCHES: 'pcap_matches_v5',
  STANDINGS: 'pcap_standings_v5',
};

// Clean legacy mock seed data from v1, v2, v3, and v4
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    localStorage.removeItem('pcap_teams_v1');
    localStorage.removeItem('pcap_matches_v1');
    localStorage.removeItem('pcap_standings_v1');
    localStorage.removeItem('pcap_teams_v2');
    localStorage.removeItem('pcap_matches_v2');
    localStorage.removeItem('pcap_standings_v2');
    localStorage.removeItem('pcap_teams_v3');
    localStorage.removeItem('pcap_matches_v3');
    localStorage.removeItem('pcap_standings_v3');
    localStorage.removeItem('pcap_teams_v4');
    localStorage.removeItem('pcap_matches_v4');
    localStorage.removeItem('pcap_standings_v4');
  } catch {}
}

@Injectable({
  providedIn: 'root'
})
export class PcapService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pcap`;

  readonly isLoading = signal<boolean>(true);

  private readonly _teams = signal<PcapTeam[]>(this.loadInitialTeams());
  private readonly _matches = signal<PcapMatch[]>(this.loadInitialMatches());
  private readonly _standings = signal<PcapStanding[]>(this.loadInitialStandings());

  constructor() {
    this.syncFromBackend();
  }

  /**
   * Fetch latest PCAP data from the PostgreSQL database API (Single Source of Truth).
   */
  syncFromBackend(): void {
    this.isLoading.set(true);
    forkJoin({
      teams: this.http.get<{ success: boolean; data: PcapTeam[] }>(`${this.apiUrl}/teams`),
      matches: this.http.get<{ success: boolean; data: PcapMatch[] }>(`${this.apiUrl}/matches`),
      standings: this.http.get<{ success: boolean; data: PcapStanding[] }>(`${this.apiUrl}/standings`)
    }).subscribe({
      next: ({ teams, matches, standings }) => {
        if (teams?.data && Array.isArray(teams.data)) {
          this._teams.set(teams.data);
        }
        if (matches?.data !== undefined && Array.isArray(matches.data)) {
          this._matches.set(matches.data);
        }
        if (standings?.data && Array.isArray(standings.data)) {
          this._standings.set(standings.data);
        }
        this.saveToStorage();
        this.isLoading.set(false);
      },
      error: (e) => {
        console.warn('PcapService: Backend offline or unreachable, using local cache', e);
        this.isLoading.set(false);
      }
    });
  }

  // Filter signals
  readonly conferenceFilter = signal<PcapConference | 'all'>('all');
  readonly statusFilter = signal<PcapMatchStatus | 'all'>('all');
  readonly searchQuery = signal<string>('');

  // Public state signals
  readonly allTeams = this._teams.asReadonly();
  readonly allMatches = this._matches.asReadonly();
  readonly allStandings = this._standings.asReadonly();

  // Computed division teams
  readonly alphaTeams = computed(() =>
    this._teams().filter(t => t.conference === 'alpha')
  );

  readonly omegaTeams = computed(() =>
    this._teams().filter(t => t.conference === 'omega')
  );

  // Backward-compatible aliases
  readonly northTeams = this.alphaTeams;
  readonly southTeams = this.omegaTeams;

  // Computed division standings
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

  // Backward-compatible aliases
  readonly northStandings = this.alphaStandings;
  readonly southStandings = this.omegaStandings;

  readonly upcomingMatches = computed(() =>
    this._matches().filter(m => m.status === 'upcoming')
  );

  readonly completedMatches = computed(() =>
    this._matches().filter(m => m.status === 'completed')
  );

  // Dynamic filter for Teams tab
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

  // Dynamic filter for Matches tab
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

  // Overview statistics
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

  // --- CRUD & Mutation Methods for Admin ---

  addTeam(team: PcapTeam): void {
    this._teams.update(teams => [team, ...teams]);
    const existingStanding = this._standings().find(s => s.teamId === team.id);
    if (!existingStanding) {
      const newStanding: PcapStanding = {
        teamId: team.id,
        teamName: team.name,
        conference: team.conference,
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
    this.saveToStorage();

    // Persist to backend database
    this.http.post(`${this.apiUrl}/teams`, team).subscribe({
      error: (e) => console.warn('Failed to persist new team to backend', e)
    });
  }

  updateTeam(id: string, updates: Partial<PcapTeam>): void {
    this._teams.update(teams =>
      teams.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
    this._standings.update(standings =>
      standings.map(s => {
        if (s.teamId === id) {
          return {
            ...s,
            teamName: updates.name ?? s.teamName,
            conference: updates.conference ?? s.conference
          };
        }
        return s;
      })
    );
    this.saveToStorage();

    // Persist to backend database
    this.http.put(`${this.apiUrl}/teams/${id}`, updates).subscribe({
      error: (e) => console.warn('Failed to update team on backend', e)
    });
  }

  deleteTeam(id: string): void {
    this._teams.update(teams => teams.filter(t => t.id !== id));
    this._standings.update(standings => standings.filter(s => s.teamId !== id));
    this.saveToStorage();

    // Persist to backend database
    this.http.delete(`${this.apiUrl}/teams/${id}`).subscribe({
      error: (e) => console.warn('Failed to delete team on backend', e)
    });
  }

  addMatch(match: PcapMatch): void {
    this._matches.update(matches => [match, ...matches]);
    this.saveToStorage();

    // Persist to backend database
    this.http.post(`${this.apiUrl}/matches`, match).subscribe({
      error: (e) => console.warn('Failed to persist match to backend', e)
    });
  }

  updateMatch(id: string, updates: Partial<PcapMatch>): void {
    this._matches.update(matches =>
      matches.map(m => (m.id === id ? { ...m, ...updates } : m))
    );
    this.saveToStorage();

    // Persist to backend database
    this.http.put(`${this.apiUrl}/matches/${id}`, updates).subscribe({
      error: (e) => console.warn('Failed to update match on backend', e)
    });
  }

  deleteMatch(id: string): void {
    this._matches.update(matches => matches.filter(m => m.id !== id));
    this.saveToStorage();

    // Persist to backend database
    this.http.delete(`${this.apiUrl}/matches/${id}`).subscribe({
      error: (e) => console.warn('Failed to delete match on backend', e)
    });
  }

  updateStanding(teamId: string, updates: Partial<PcapStanding>): void {
    this._standings.update(standings =>
      standings.map(s => {
        if (s.teamId === teamId) {
          const updated = { ...s, ...updates };
          updated.boardPointsDiff = Number((updated.boardPointsFor - updated.boardPointsAgainst).toFixed(1));
          return updated;
        }
        return s;
      })
    );
    this.saveToStorage();

    // Persist to backend database
    this.http.put(`${this.apiUrl}/standings/${teamId}`, updates).subscribe({
      error: (e) => console.warn('Failed to update standing on backend', e)
    });
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
    this.saveToStorage();
  }

  clearAllData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.TEAMS);
      localStorage.removeItem(STORAGE_KEYS.MATCHES);
      localStorage.removeItem(STORAGE_KEYS.STANDINGS);
      localStorage.removeItem('pcap_teams_v1');
      localStorage.removeItem('pcap_matches_v1');
      localStorage.removeItem('pcap_standings_v1');
    }
    this._teams.set([]);
    this._matches.set([]);
    this._standings.set([]);
  }

  resetToDefaults(): void {
    this.isLoading.set(true);
    // Reset database on PostgreSQL backend and re-sync
    this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/reset`, {}).subscribe({
      next: () => this.syncFromBackend(),
      error: (e) => {
        console.warn('Failed to reset backend PCAP database', e);
        this.isLoading.set(false);
      }
    });
  }

  loadSampleData(): void {
    this.resetToDefaults();
  }

  // --- LocalStorage persistence helpers ---

  private loadInitialTeams(): PcapTeam[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.TEAMS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return (parsed as PcapTeam[]).map(t => ({
              ...t,
              roster: (t.roster || []).map(p => ({
                ...p,
                federation: p.federation || 'PHI'
              }))
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored PCAP teams', e);
      }
    }
    return [];
  }

  private loadInitialMatches(): PcapMatch[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.MATCHES);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse stored PCAP matches', e);
      }
    }
    return [];
  }

  private loadInitialStandings(): PcapStanding[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.STANDINGS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse stored PCAP standings', e);
      }
    }
    return [];
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(this._teams()));
        localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(this._matches()));
        localStorage.setItem(STORAGE_KEYS.STANDINGS, JSON.stringify(this._standings()));
      } catch (e) {
        console.warn('Failed to persist PCAP data to localStorage', e);
      }
    }
  }
}
