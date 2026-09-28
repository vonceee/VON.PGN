import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PcapService } from '../../../core/services/pcap.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  PcapTeam,
  PcapMatch,
  PcapStanding,
  PcapConference,
  PcapMatchStatus,
  PcapRosterPlayer,
  PcapBoardMatchup,
  PcapPlayerRole,
  PcapPlayerCategory,
  CHESS_FEDERATIONS,
  CHESS_MASTER_TITLE_GROUPS,
  getFederationFlag
} from '../../../core/models/pcap.model';

import { TextInputComponent } from '../../../shared/components/ui/text-input/text-input.component';
import {
  PcapAdminTeamsTableComponent,
  PcapAdminMatchesListComponent,
  PcapAdminStandingsTablesComponent,
  PcapAdminTeamEditorComponent,
  PcapAdminMatchEditorComponent,
  PcapAdminStandingModalComponent,
  PcapAdminDeleteModalComponent,
  PcapAdminPgnModalComponent,
  PgnEditingBoardData
} from './components';

@Component({
  selector: 'app-pcap-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TextInputComponent,
    PcapAdminTeamsTableComponent,
    PcapAdminMatchesListComponent,
    PcapAdminStandingsTablesComponent,
    PcapAdminTeamEditorComponent,
    PcapAdminMatchEditorComponent,
    PcapAdminStandingModalComponent,
    PcapAdminDeleteModalComponent,
    PcapAdminPgnModalComponent
  ],
  templateUrl: './pcap-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapManagementComponent {
  readonly pcapService = inject(PcapService);
  private readonly toast = inject(ToastService);

  // Master titles and federations for team roster editor
  readonly chessFederations = CHESS_FEDERATIONS;
  readonly chessMasterTitleGroups = CHESS_MASTER_TITLE_GROUPS;
  readonly getFederationFlag = getFederationFlag;

  // Active view tab
  readonly activeTab = signal<'teams' | 'matches' | 'standings'>('teams');

  // Search & Filter
  readonly searchQuery = signal<string>('');
  readonly conferenceFilter = signal<PcapConference | 'all'>('all');
  readonly statusFilter = signal<PcapMatchStatus | 'all'>('all');

  // Delete Target state for confirmation modal
  readonly deleteConfirmation = signal<{
    type: 'team' | 'match';
    id: string;
    name: string;
  } | null>(null);

  // Active view mode: list overview or dedicated in-page editor
  readonly currentView = signal<'list' | 'team-editor' | 'match-editor'>('list');

  // --- TEAMS STATE ---
  readonly isEditingTeam = signal<boolean>(false);
  readonly editingTeam = signal<PcapTeam>(this.createEmptyTeam());

  // Filtered teams computed
  readonly teamsList = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const conf = this.conferenceFilter();

    return this.pcapService.allTeams().filter(t => {
      const matchConf = conf === 'all' || t.conference === conf;
      if (!matchConf) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    });
  });

  // --- MATCHES STATE ---
  readonly isEditingMatch = signal<boolean>(false);
  readonly editingMatch = signal<PcapMatch>(this.createEmptyMatch());

  // --- PGN DRAWER STATE ---
  readonly pgnDrawerOpen = signal<boolean>(false);
  readonly pgnEditingBoard = signal<PgnEditingBoardData | null>(null);

  // Filtered matches computed
  readonly matchesList = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const conf = this.conferenceFilter();
    const st = this.statusFilter();

    return this.pcapService.allMatches().filter(m => {
      const matchConf =
        conf === 'all' ||
        m.conference === conf ||
        m.teamA.conference === conf ||
        m.teamB.conference === conf;
      const matchStatus = st === 'all' || m.status === st;

      if (!matchConf || !matchStatus) return false;
      if (!q) return true;

      return (
        m.teamA.name.toLowerCase().includes(q) ||
        m.teamB.name.toLowerCase().includes(q) ||
        `round ${m.round}`.includes(q) ||
        m.season.toLowerCase().includes(q)
      );
    });
  });

  // --- STANDINGS STATE ---
  readonly standingModalOpen = signal<boolean>(false);
  readonly editingStanding = signal<PcapStanding | null>(null);

  readonly alphaStandings = computed(() => this.pcapService.alphaStandings());
  readonly omegaStandings = computed(() => this.pcapService.omegaStandings());
  readonly northStandings = this.alphaStandings;
  readonly southStandings = this.omegaStandings;

  // Available teams for matchup selectors
  readonly allTeams = computed(() => this.pcapService.allTeams());

  // --- TEAM CRUD HANDLERS ---

  openNewTeamModal(): void {
    this.editingTeam.set(this.createEmptyTeam());
    this.isEditingTeam.set(false);
    this.currentView.set('team-editor');
  }

  openEditTeamModal(team: PcapTeam): void {
    // Deep clone team so edits don't mutate signal prematurely
    const cloned: PcapTeam = JSON.parse(JSON.stringify(team));
    if (cloned.roster) {
      cloned.roster.forEach(p => {
        if (!p.federation) p.federation = 'PHI';
        if (!p.title) p.title = '';
      });
    }
    this.editingTeam.set(cloned);
    this.isEditingTeam.set(true);
    this.currentView.set('team-editor');
  }

  addPlayerToTeam(): void {
    const team = this.editingTeam();
    const newIndex = team.roster.length + 1;
    const newPlayer: PcapRosterPlayer = {
      id: `${team.id || 'team'}-p${Date.now().toString(36)}-${newIndex}`,
      name: '',
      title: '',
      rating: null,
      category: 'HG',
      federation: 'PHI',
      hometown: ''
    };
    this.editingTeam.set({
      ...team,
      roster: [...team.roster, newPlayer]
    });
  }

  removePlayerFromTeam(index: number): void {
    const team = this.editingTeam();
    if (team.roster.length <= 1) {
      this.toast.show('A team must have at least 1 player slot', 'error');
      return;
    }
    const updated = team.roster.filter((_, i) => i !== index);
    this.editingTeam.set({
      ...team,
      roster: updated
    });
  }

  closeTeamModal(): void {
    this.currentView.set('list');
  }

  saveTeam(): void {
    const team = this.editingTeam();
    if (!team.name.trim()) {
      this.toast.show('Please provide a team name', 'error');
      return;
    }

    if (!team.id) {
      team.id = team.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    if (this.isEditingTeam()) {
      this.pcapService.updateTeam(team.id, team);
      this.toast.show(`Team "${team.name}" updated successfully!`, 'success');
    } else {
      this.pcapService.addTeam(team);
      this.toast.show(`Team "${team.name}" created successfully!`, 'success');
    }

    this.closeTeamModal();
  }

  requestDeleteTeam(team: PcapTeam): void {
    this.deleteConfirmation.set({
      type: 'team',
      id: team.id,
      name: team.name
    });
  }

  // --- MATCH CRUD HANDLERS ---

  openNewMatchModal(): void {
    const freshMatch = this.createEmptyMatch();
    const teams = this.allTeams();
    if (teams.length >= 2) {
      this.applyTeamToMatchup(freshMatch, 'teamA', teams[0].id);
      this.applyTeamToMatchup(freshMatch, 'teamB', teams[1].id);
    }
    this.editingMatch.set(freshMatch);
    this.isEditingMatch.set(false);
    this.currentView.set('match-editor');
  }

  openEditMatchModal(match: PcapMatch): void {
    this.editingMatch.set(JSON.parse(JSON.stringify(match)));
    this.isEditingMatch.set(true);
    this.currentView.set('match-editor');
  }

  closeMatchModal(): void {
    this.currentView.set('list');
  }

  onMatchTeamChange(side: 'teamA' | 'teamB', teamId: string): void {
    const current = { ...this.editingMatch() };
    this.applyTeamToMatchup(current, side, teamId);
    this.editingMatch.set(current);
  }

  private applyTeamToMatchup(match: PcapMatch, side: 'teamA' | 'teamB', teamId: string): void {
    const team = this.pcapService.getTeamById(teamId);
    if (!team) return;

    match[side] = {
      id: team.id,
      name: team.name,
      conference: team.conference
    };

    // Prepopulate board players from roster based on category eligibility
    // B1-B2: 'O', B3: 'L', B4: 'S', B5-B7: 'HG'
    const openPlayers = team.roster.filter(p => p.category === 'O');
    const ladyPlayers = team.roster.filter(p => p.category === 'L' || p.category === 'HG/L');
    const seniorPlayers = team.roster.filter(p => p.category === 'S' || p.category === 'HG/S');
    const hgPlayers = team.roster.filter(p => p.category === 'HG' || p.category === 'HG/S' || p.category === 'HG/L');

    match.boards = match.boards.map((b) => {
      let rosterPlayer: PcapRosterPlayer | undefined;
      if (b.boardNumber === 1) rosterPlayer = openPlayers[0];
      else if (b.boardNumber === 2) rosterPlayer = openPlayers[1] || openPlayers[0];
      else if (b.boardNumber === 3) rosterPlayer = ladyPlayers[0];
      else if (b.boardNumber === 4) rosterPlayer = seniorPlayers[0];
      else if (b.boardNumber === 5) rosterPlayer = hgPlayers[0];
      else if (b.boardNumber === 6) rosterPlayer = hgPlayers[1];
      else if (b.boardNumber === 7) rosterPlayer = hgPlayers[2];

      if (!rosterPlayer) {
        rosterPlayer = team.roster[b.boardNumber - 1];
      }

      if (side === 'teamA') {
        return {
          ...b,
          playerA: rosterPlayer
            ? { name: rosterPlayer.name, title: rosterPlayer.title, rating: rosterPlayer.rating || 2000 }
            : b.playerA
        };
      } else {
        return {
          ...b,
          playerB: rosterPlayer
            ? { name: rosterPlayer.name, title: rosterPlayer.title, rating: rosterPlayer.rating || 2000 }
            : b.playerB
        };
      }
    });
  }

  recalculateMatchTotals(): void {
    const m = this.editingMatch();
    let blitzA = 0;
    let blitzB = 0;
    let rapidA = 0;
    let rapidB = 0;

    m.boards.forEach(b => {
      blitzA += Number(b.blitzScoreA || 0);
      blitzB += Number(b.blitzScoreB || 0);
      rapidA += Number(b.rapidScoreA || 0);
      rapidB += Number(b.rapidScoreB || 0);
    });

    m.blitzScoreA = Number(blitzA.toFixed(1));
    m.blitzScoreB = Number(blitzB.toFixed(1));
    m.rapidScoreA = Number(rapidA.toFixed(1));
    m.rapidScoreB = Number(rapidB.toFixed(1));
    m.scoreA = Number((m.blitzScoreA + m.rapidScoreA).toFixed(1));
    m.scoreB = Number((m.blitzScoreB + m.rapidScoreB).toFixed(1));

    this.editingMatch.set({ ...m });
  }

  saveMatch(): void {
    const match = this.editingMatch();
    this.recalculateMatchTotals();

    if (!match.id) {
      match.id = `match-${Date.now().toString(36)}`;
    }

    if (this.isEditingMatch()) {
      this.pcapService.updateMatch(match.id, match);
      this.toast.show(`Match #${match.round} updated successfully!`, 'success');
    } else {
      this.pcapService.addMatch(match);
      this.toast.show(`Match #${match.round} scheduled successfully!`, 'success');
    }

    this.closeMatchModal();
  }

  requestDeleteMatch(match: PcapMatch): void {
    this.deleteConfirmation.set({
      type: 'match',
      id: match.id,
      name: `Round ${match.round}: ${match.teamA.name} vs ${match.teamB.name}`
    });
  }

  quickSetStatus(match: PcapMatch, status: PcapMatchStatus): void {
    this.pcapService.updateMatch(match.id, { status });
    this.toast.show(`Match status updated to "${status.toUpperCase()}"`, 'success');
  }

  // --- PGN MANAGEMENT FOR BOARDS ---

  openPgnDrawer(board: PcapBoardMatchup): void {
    this.pgnEditingBoard.set({
      boardNumber: board.boardNumber,
      roleLabel: board.roleLabel,
      playerA: board.playerA.name,
      playerB: board.playerB.name,
      blitzPgn: board.blitzPgn || '',
      rapidPgn: board.rapidPgn || ''
    });
    this.pgnDrawerOpen.set(true);
  }

  closePgnDrawer(): void {
    this.pgnDrawerOpen.set(false);
    this.pgnEditingBoard.set(null);
  }

  saveBoardPgns(): void {
    const data = this.pgnEditingBoard();
    if (!data) return;

    const current = { ...this.editingMatch() };
    current.boards = current.boards.map(b => {
      if (b.boardNumber === data.boardNumber) {
        return {
          ...b,
          blitzPgn: data.blitzPgn.trim() || undefined,
          rapidPgn: data.rapidPgn.trim() || undefined
        };
      }
      return b;
    });

    this.editingMatch.set(current);
    this.toast.show(`PGN saved for Board ${data.boardNumber}`, 'success');
    this.closePgnDrawer();
  }

  onPgnFileSelected(payload: { event: Event; type: 'blitz' | 'rapid' } | Event, maybeType?: 'blitz' | 'rapid'): void {
    const event = ('event' in payload) ? payload.event : payload;
    const type = ('type' in payload) ? payload.type : maybeType!;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const current = this.pgnEditingBoard();
      if (current) {
        if (type === 'blitz') {
          current.blitzPgn = content;
        } else {
          current.rapidPgn = content;
        }
        this.pgnEditingBoard.set({ ...current });
        this.toast.show(`Loaded ${file.name} for ${type.toUpperCase()}`, 'success');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  // --- STANDINGS ACTIONS ---

  openEditStanding(standing: PcapStanding): void {
    this.editingStanding.set(JSON.parse(JSON.stringify(standing)));
    this.standingModalOpen.set(true);
  }

  closeStandingModal(): void {
    this.standingModalOpen.set(false);
    this.editingStanding.set(null);
  }

  saveStanding(): void {
    const s = this.editingStanding();
    if (!s) return;
    s.matchesPlayed = (s.won || 0) + (s.drawn || 0) + (s.lost || 0);
    s.matchPoints = (s.won || 0) * 3 + (s.drawn || 0) * 1;
    s.boardPointsDiff = Number(((s.boardPointsFor || 0) - (s.boardPointsAgainst || 0)).toFixed(1));

    this.pcapService.updateStanding(s.teamId, s);
    this.toast.show(`Standing for ${s.teamName} updated!`, 'success');
    this.closeStandingModal();
  }

  recalculateStandings(): void {
    this.pcapService.recalculateStandingsFromMatches();
    this.toast.show('Standings recalculated from all completed matches!', 'success');
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to clear all PCAP teams, matches, and standings to start with a completely clean slate?')) {
      this.pcapService.clearAllData();
      this.toast.show('All PCAP data cleared. You can now enter legitimate data.', 'success');
    }
  }

  loadSampleData(): void {
    if (confirm('Populate demo PCAP franchises, matches, and standings?')) {
      this.pcapService.loadSampleData();
      this.toast.show('Demo sample data loaded.', 'success');
    }
  }

  resetToDefaults(): void {
    this.clearAllData();
  }

  // --- DELETE CONFIRMATION HANDLERS ---

  confirmDelete(): void {
    const item = this.deleteConfirmation();
    if (!item) return;

    if (item.type === 'team') {
      this.pcapService.deleteTeam(item.id);
      this.toast.show(`Team "${item.name}" deleted`, 'success');
    } else if (item.type === 'match') {
      this.pcapService.deleteMatch(item.id);
      this.toast.show(`Match "${item.name}" deleted`, 'success');
    }

    this.deleteConfirmation.set(null);
  }

  cancelDelete(): void {
    this.deleteConfirmation.set(null);
  }

  // --- DEFAULT FACTORIES ---

  private createEmptyTeam(): PcapTeam {
    const id = `team-${Date.now().toString(36)}`;
    const starterCategories: PcapPlayerCategory[] = ['O', 'O', 'L', 'S', 'HG', 'HG', 'HG'];
    const starterSlots: PcapRosterPlayer[] = starterCategories.map((cat, i) => ({
      id: `${id}-p${i + 1}`,
      name: '',
      title: '',
      rating: null,
      category: cat,
      federation: 'PHI',
      hometown: ''
    }));

    return {
      id,
      name: '',
      conference: 'alpha',
      wins: 0,
      losses: 0,
      draws: 0,
      matchPoints: 0,
      boardPointsFor: 0,
      boardPointsAgainst: 0,
      roster: starterSlots
    };
  }

  private createEmptyMatch(): PcapMatch {
    const id = `match-${Date.now().toString(36)}`;
    const roles: { role: PcapPlayerRole; label: string }[] = [
      { role: 'top_gun', label: 'Board 1 • Top Gun' },
      { role: 'top_gun', label: 'Board 2 • Top Gun' },
      { role: 'lady', label: 'Board 3 • Lady Board' },
      { role: 'senior', label: 'Board 4 • Senior (60+)' },
      { role: 'homegrown', label: 'Board 5 • Homegrown' },
      { role: 'homegrown', label: 'Board 6 • Homegrown' },
      { role: 'homegrown', label: 'Board 7 • Homegrown' }
    ];

    const boards: PcapBoardMatchup[] = roles.map((r, i) => ({
      boardNumber: i + 1,
      role: r.role,
      roleLabel: r.label,
      playerA: { name: `Board ${i + 1} Player A`, title: undefined, rating: 2200 },
      playerB: { name: `Board ${i + 1} Player B`, title: undefined, rating: 2200 },
      blitzScoreA: 0,
      blitzScoreB: 0,
      rapidScoreA: 0,
      rapidScoreB: 0
    }));

    return {
      id,
      round: 13,
      conference: 'alpha',
      season: '2026 All-Filipino Cup',
      date: new Date().toISOString().split('T')[0],
      time: '7:00 PM PHT',
      status: 'upcoming',
      teamA: {
        id: '',
        name: 'Select Team A',
        conference: 'alpha'
      },
      teamB: {
        id: '',
        name: 'Select Team B',
        conference: 'alpha'
      },
      scoreA: 0,
      scoreB: 0,
      blitzScoreA: 0,
      blitzScoreB: 0,
      rapidScoreA: 0,
      rapidScoreB: 0,
      boards
    };
  }
}
