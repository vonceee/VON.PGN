import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference, PcapPlayerCategory, getFederationFlag, getBoardPlayer } from '../../../../core/models/pcap.model';
import { SelectComponent, SelectItem } from '../../../../shared/components/ui/select/select.component';
import {
  getPcapCategoryBadgeClass,
  getPcapCategoryLabel
} from '../../utils/pcap.utils';

export interface PcapPlayerGameHistoryItem {
  id: string;
  matchId: string;
  round: number;
  season?: string;
  date?: string;
  time?: string;
  boardNumber: number;
  gameType: 'rapid' | 'blitz';
  color: 'white' | 'black';
  score: number;
  maxScore: number;
  resultDisplay: string;
  resultBadge: 'win' | 'draw' | 'loss';
  opponentName: string;
  opponentTitle?: string;
  opponentRating?: number;
  opponentTeamName: string;
  opponentTeamId: string;
  opponentFederation?: string;
  pgn?: string;
}

export interface PcapPlayerStats {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  conference: PcapConference;
  title?: string;
  rating: number | null;
  category?: PcapPlayerCategory;
  categoryLabel?: string;
  federation?: string;
  hometown?: string;
  rank: number;
  gamesPlayed: number;
  matchesPlayed: number;
  rapidGamesPlayed: number;
  blitzGamesPlayed: number;
  rapidPoints: number;
  blitzPoints: number;
  totalPoints: number;
  maxPossiblePoints: number;
  winRate: number;
  wins: number;
  draws: number;
  losses: number;
  history: PcapPlayerGameHistoryItem[];
}

/**
 * PcapStatsComponent
 * 
 * Displays the league-wide Player Rankings and comprehensive Statistics leaderboard.
 * Features:
 * - Division (Alpha / Omega) and Board Category filters
 * - Dynamic leaderboard sorted by total points and win rate
 * - Fixed 25-row client-side pagination for optimal 60fps rendering
 * - Expandable accordion row displaying a chess-results inspired player profile card
 *   and individual match game history ledger
 * - Interactive game viewing and direct PGN copying to clipboard
 */
@Component({
  selector: 'app-pcap-stats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SelectComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-stats.component.html'
})
export class PcapStatsComponent {
  public pcapService = inject(PcapService);

  // Filter signals
  readonly selectedConference = signal<PcapConference | 'all'>('all');
  readonly selectedCategory = signal<string>('all');


  // Pagination signals (Fixed at 25 per page)
  readonly pageSize = 25;
  readonly currentPage = signal<number>(1);

  // Accordion state (expanded player ID)
  readonly expandedPlayerId = signal<string | null>(null);

  // Dropdown filter options
  readonly conferenceOptions: SelectItem<PcapConference | 'all'>[] = [
    { label: 'All Divisions', value: 'all' },
    { label: 'Division Alpha', value: 'alpha' },
    { label: 'Division Omega', value: 'omega' }
  ];

  readonly categoryOptions: SelectItem<string>[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'Open (B1-B2)', value: 'O' },
    { label: 'Lady (B3)', value: 'L' },
    { label: 'Senior (B4)', value: 'S' },
    { label: 'Homegrown (B5-B7)', value: 'HG' }
  ];

  setConference(conf: PcapConference | 'all'): void {
    this.selectedConference.set(conf);
    this.currentPage.set(1);
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
  }

  // Helper bindings for template
  readonly getCategoryBadgeClass = getPcapCategoryBadgeClass;
  readonly getCategoryLabel = getPcapCategoryLabel;
  readonly getFedFlag = getFederationFlag;

  /**
   * Aggregates all player statistics across rosters and completed matches.
   */
  readonly allPlayerStats = computed<PcapPlayerStats[]>(() => {
    const teams = this.pcapService.allTeams();
    const matches = this.pcapService.allMatches();

    const playerMap = new Map<string, {
      name: string;
      teamId: string;
      teamName: string;
      conference: PcapConference;
      title?: string;
      rating: number | null;
      category?: PcapPlayerCategory;
      categoryLabel?: string;
      federation?: string;
      hometown?: string;
      history: PcapPlayerGameHistoryItem[];
      rapidPoints: number;
      blitzPoints: number;
      rapidGamesPlayed: number;
      blitzGamesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
      matchIds: Set<string>;
    }>();

    // 1. Seed all official roster players from teams
    for (const team of teams) {
      if (!team.roster) continue;
      for (const player of team.roster) {
        if (!player.name) continue;
        const key = player.name.trim().toLowerCase();
        if (!playerMap.has(key)) {
          playerMap.set(key, {
            name: player.name,
            teamId: team.id,
            teamName: team.name,
            conference: team.conference,
            title: player.title,
            rating: player.rating,
            category: player.category,
            categoryLabel: getPcapCategoryLabel(player.category),
            federation: player.federation || 'PHI',
            hometown: player.hometown,
            history: [],
            rapidPoints: 0,
            blitzPoints: 0,
            rapidGamesPlayed: 0,
            blitzGamesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            matchIds: new Set<string>()
          });
        }
      }
    }

    // 2. Process all matches and boards
    for (const match of matches) {
      if (!match.boards || match.boards.length === 0) continue;

      for (const board of match.boards) {
        const pA = board.playerA;
        const pB = board.playerB;
        if (!pA?.name || !pB?.name) continue;

        const isOdd = board.boardNumber % 2 !== 0;
        // In PCAP: Odd boards White = Team A, Even boards White = Team B
        const colorA: 'white' | 'black' = isOdd ? 'white' : 'black';
        const colorB: 'white' | 'black' = isOdd ? 'black' : 'white';

        const getOrInitPlayer = (
          playerObj: typeof pA,
          teamObj: typeof match.teamA,
          boardNum: number,
          role: string
        ) => {
          const key = playerObj.name.trim().toLowerCase();
          let entry = playerMap.get(key);
          if (!entry) {
            let inferredCategory: PcapPlayerCategory = 'O';
            if (boardNum === 3 || role === 'lady') inferredCategory = 'L';
            else if (boardNum === 4 || role === 'senior') inferredCategory = 'S';
            else if (boardNum >= 5 || role === 'homegrown') inferredCategory = 'HG';

            entry = {
              name: playerObj.name,
              teamId: teamObj.id,
              teamName: teamObj.name,
              conference: teamObj.conference,
              title: playerObj.title,
              rating: playerObj.rating,
              category: inferredCategory,
              categoryLabel: getPcapCategoryLabel(inferredCategory),
              federation: 'PHI',
              history: [],
              rapidPoints: 0,
              blitzPoints: 0,
              rapidGamesPlayed: 0,
              blitzGamesPlayed: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              matchIds: new Set<string>()
            };
            playerMap.set(key, entry);
          }
          return entry;
        };

        // 2a. Rapid Game Processing
        const rPlayerA = getBoardPlayer(board, 'teamA', 'rapid');
        const rPlayerB = getBoardPlayer(board, 'teamB', 'rapid');
        const hasRapidResult = !!(rPlayerA?.name && rPlayerB?.name) && (
          match.status === 'completed' || !!board.rapidPgn ||
          (board.rapidScoreA !== undefined && board.rapidScoreB !== undefined && (board.rapidScoreA > 0 || board.rapidScoreB > 0))
        );

        if (hasRapidResult && rPlayerA?.name && rPlayerB?.name) {
          const entryA = getOrInitPlayer(rPlayerA, match.teamA, board.boardNumber, board.role);
          const entryB = getOrInitPlayer(rPlayerB, match.teamB, board.boardNumber, board.role);
          entryA.matchIds.add(match.id);
          entryB.matchIds.add(match.id);

          const scoreA = board.rapidScoreA ?? 0;
          const scoreB = board.rapidScoreB ?? 0;

          entryA.rapidPoints += scoreA;
          entryB.rapidPoints += scoreB;
          entryA.rapidGamesPlayed += 1;
          entryB.rapidGamesPlayed += 1;

          if (scoreA === 2) {
            entryA.wins++;
            entryB.losses++;
          } else if (scoreA === 1) {
            entryA.draws++;
            entryB.draws++;
          } else {
            entryA.losses++;
            entryB.wins++;
          }

          entryA.history.push({
            id: `${match.id}-b${board.boardNumber}-rapid`,
            matchId: match.id,
            round: match.round,
            season: match.season,
            date: match.date,
            time: match.time,
            boardNumber: board.boardNumber,
            gameType: 'rapid',
            color: colorA,
            score: scoreA,
            maxScore: 2,
            resultDisplay: scoreA === 2 ? '1 - 0' : (scoreA === 1 ? '½ - ½' : '0 - 1'),
            resultBadge: scoreA === 2 ? 'win' : (scoreA === 1 ? 'draw' : 'loss'),
            opponentName: rPlayerB.name,
            opponentTitle: rPlayerB.title,
            opponentRating: rPlayerB.rating,
            opponentTeamName: match.teamB.name,
            opponentTeamId: match.teamB.id,
            pgn: board.rapidPgn
          });

          entryB.history.push({
            id: `${match.id}-b${board.boardNumber}-rapid`,
            matchId: match.id,
            round: match.round,
            season: match.season,
            date: match.date,
            time: match.time,
            boardNumber: board.boardNumber,
            gameType: 'rapid',
            color: colorB,
            score: scoreB,
            maxScore: 2,
            resultDisplay: scoreB === 2 ? '1 - 0' : (scoreB === 1 ? '½ - ½' : '0 - 1'),
            resultBadge: scoreB === 2 ? 'win' : (scoreB === 1 ? 'draw' : 'loss'),
            opponentName: rPlayerA.name,
            opponentTitle: rPlayerA.title,
            opponentRating: rPlayerA.rating,
            opponentTeamName: match.teamA.name,
            opponentTeamId: match.teamA.id,
            pgn: board.rapidPgn
          });
        }

        // 2b. Blitz Game Processing
        const bPlayerA = getBoardPlayer(board, 'teamA', 'blitz');
        const bPlayerB = getBoardPlayer(board, 'teamB', 'blitz');
        const hasBlitzResult = !!(bPlayerA?.name && bPlayerB?.name) && (
          match.status === 'completed' || !!board.blitzPgn ||
          (board.blitzScoreA !== undefined && board.blitzScoreB !== undefined && (board.blitzScoreA > 0 || board.blitzScoreB > 0))
        );

        if (hasBlitzResult && bPlayerA?.name && bPlayerB?.name) {
          const entryA = getOrInitPlayer(bPlayerA, match.teamA, board.boardNumber, board.role);
          const entryB = getOrInitPlayer(bPlayerB, match.teamB, board.boardNumber, board.role);
          entryA.matchIds.add(match.id);
          entryB.matchIds.add(match.id);

          const scoreA = board.blitzScoreA ?? 0;
          const scoreB = board.blitzScoreB ?? 0;

          entryA.blitzPoints += scoreA;
          entryB.blitzPoints += scoreB;
          entryA.blitzGamesPlayed += 1;
          entryB.blitzGamesPlayed += 1;

          if (scoreA === 1) {
            entryA.wins++;
            entryB.losses++;
          } else if (scoreA === 0.5) {
            entryA.draws++;
            entryB.draws++;
          } else {
            entryA.losses++;
            entryB.wins++;
          }

          entryA.history.push({
            id: `${match.id}-b${board.boardNumber}-blitz`,
            matchId: match.id,
            round: match.round,
            season: match.season,
            date: match.date,
            time: match.time,
            boardNumber: board.boardNumber,
            gameType: 'blitz',
            color: colorA,
            score: scoreA,
            maxScore: 1,
            resultDisplay: scoreA === 1 ? '1 - 0' : (scoreA === 0.5 ? '½ - ½' : '0 - 1'),
            resultBadge: scoreA === 1 ? 'win' : (scoreA === 0.5 ? 'draw' : 'loss'),
            opponentName: bPlayerB.name,
            opponentTitle: bPlayerB.title,
            opponentRating: bPlayerB.rating,
            opponentTeamName: match.teamB.name,
            opponentTeamId: match.teamB.id,
            pgn: board.blitzPgn
          });

          entryB.history.push({
            id: `${match.id}-b${board.boardNumber}-blitz`,
            matchId: match.id,
            round: match.round,
            season: match.season,
            date: match.date,
            time: match.time,
            boardNumber: board.boardNumber,
            gameType: 'blitz',
            color: colorB,
            score: scoreB,
            maxScore: 1,
            resultDisplay: scoreB === 1 ? '1 - 0' : (scoreB === 0.5 ? '½ - ½' : '0 - 1'),
            resultBadge: scoreB === 1 ? 'win' : (scoreB === 0.5 ? 'draw' : 'loss'),
            opponentName: bPlayerA.name,
            opponentTitle: bPlayerA.title,
            opponentRating: bPlayerA.rating,
            opponentTeamName: match.teamA.name,
            opponentTeamId: match.teamA.id,
            pgn: board.blitzPgn
          });
        }
      }
    }

    // 3. Compile stats array
    const players: PcapPlayerStats[] = Array.from(playerMap.entries()).map(([key, entry]) => {
      const gamesPlayed = entry.rapidGamesPlayed + entry.blitzGamesPlayed;
      const maxPossiblePoints = entry.rapidGamesPlayed * 2 + entry.blitzGamesPlayed * 1;
      const totalPoints = Number((entry.rapidPoints + entry.blitzPoints).toFixed(1));
      const winRate = maxPossiblePoints > 0 ? Number(((totalPoints / maxPossiblePoints) * 100).toFixed(1)) : 0;

      const sortedHistory = [...entry.history].sort((a, b) => {
        if (b.round !== a.round) return b.round - a.round;
        if (a.gameType === 'rapid' && b.gameType === 'blitz') return -1;
        if (a.gameType === 'blitz' && b.gameType === 'rapid') return 1;
        return a.boardNumber - b.boardNumber;
      });

      return {
        id: key,
        name: entry.name,
        teamId: entry.teamId,
        teamName: entry.teamName,
        conference: entry.conference,
        title: entry.title,
        rating: entry.rating,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        federation: entry.federation,
        hometown: entry.hometown,
        rank: 1,
        gamesPlayed,
        matchesPlayed: entry.matchIds.size,
        rapidGamesPlayed: entry.rapidGamesPlayed,
        blitzGamesPlayed: entry.blitzGamesPlayed,
        rapidPoints: Number(entry.rapidPoints.toFixed(1)),
        blitzPoints: Number(entry.blitzPoints.toFixed(1)),
        totalPoints,
        maxPossiblePoints,
        winRate,
        wins: entry.wins,
        draws: entry.draws,
        losses: entry.losses,
        history: sortedHistory
      };
    });

    // Sort globally by total points descending to establish global ranking
    players.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
      return a.name.localeCompare(b.name);
    });

    players.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    return players;
  });

  /**
   * Filtered player list preserving the global leaderboard ranking (Points descending, Win Rate tiebreak).
   */
  readonly filteredPlayerStats = computed<PcapPlayerStats[]>(() => {
    const all = this.allPlayerStats();
    const conf = this.selectedConference();
    const cat = this.selectedCategory();

    return all.filter(player => {
      if (conf !== 'all' && player.conference !== conf) return false;
      if (cat !== 'all') {
        if (cat === 'HG') {
          if (player.category !== 'HG' && player.category !== 'HG/S' && player.category !== 'HG/L') return false;
        } else if (player.category !== cat) {
          return false;
        }
      }
      return true;
    });
  });


  /**
   * Toggles the accordion row open/closed for a given player.
   */
  togglePlayer(playerId: string): void {
    if (this.expandedPlayerId() === playerId) {
      this.expandedPlayerId.set(null);
    } else {
      this.expandedPlayerId.set(playerId);
    }
  }



  /**
   * Total number of pages based on filtered results and fixed page size (25).
   */
  readonly totalPages = computed<number>(() => {
    const total = this.filteredPlayerStats().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  /**
   * Paginated slice of filtered players for current page (25 per page).
   */
  readonly paginatedPlayerStats = computed<PcapPlayerStats[]>(() => {
    const list = this.filteredPlayerStats();
    const page = Math.min(this.currentPage(), this.totalPages());
    const startIndex = (page - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  });

  /**
   * Human-friendly pagination range info (e.g. 1-25 of 242).
   */
  readonly paginationInfo = computed(() => {
    const total = this.filteredPlayerStats().length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize + 1;
    const end = Math.min(page * this.pageSize, total);
    return { start, end, total };
  });

  /**
   * Generates smart visible page buttons for pagination navigation.
   */
  readonly visiblePages = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (current < total - 2) pages.push('...');
      if (!pages.includes(total)) pages.push(total);
    }
    return pages;
  });

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }
}
