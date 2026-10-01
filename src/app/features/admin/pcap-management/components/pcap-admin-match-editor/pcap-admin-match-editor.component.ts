import { Component, ChangeDetectionStrategy, input, model, output, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectComponent, SelectItem } from '../../../../../shared/components/ui/select/select.component';
import { TextInputComponent } from '../../../../../shared/components/ui/text-input/text-input.component';
import {
  PcapMatch,
  PcapTeam,
  PcapBoardMatchup,
  PcapRosterPlayer,
  PcapConference,
  PcapMatchStatus
} from '../../../../../core/models/pcap.model';

export interface ScoreOption {
  label: string;
  value: string;
  scoreA: number;
  scoreB: number;
}

@Component({
  selector: 'app-pcap-admin-match-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, TextInputComponent],
  templateUrl: './pcap-admin-match-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminMatchEditorComponent implements OnInit {
  readonly match = model.required<PcapMatch>();
  readonly isEditing = input<boolean>(false);
  readonly allTeams = input.required<PcapTeam[]>();

  readonly divisionOptions: SelectItem<PcapConference | 'interconference'>[] = [
    { label: 'Division Alpha', value: 'alpha' },
    { label: 'Division Omega', value: 'omega' },
    { label: 'Inter-Division', value: 'interconference' },
  ];

  readonly statusOptions: SelectItem<PcapMatchStatus>[] = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Completed', value: 'completed' },
  ];

  readonly teamItems = computed<SelectItem<string>[]>(() => {
    const teams = this.allTeams();
    const alphaTeams = teams.filter(t => t.conference === 'alpha');
    const omegaTeams = teams.filter(t => t.conference === 'omega');
    const otherTeams = teams.filter(t => t.conference !== 'alpha' && t.conference !== 'omega');

    const result: SelectItem<string>[] = [];

    if (alphaTeams.length > 0) {
      result.push({ label: 'Division Alpha', isHeader: true, disabled: true });
      result.push(...alphaTeams.map(t => ({ label: t.name, value: t.id })));
    }

    if (omegaTeams.length > 0) {
      result.push({ label: 'Division Omega', isHeader: true, disabled: true });
      result.push(...omegaTeams.map(t => ({ label: t.name, value: t.id })));
    }

    if (otherTeams.length > 0) {
      result.push({ label: 'Other Teams', isHeader: true, disabled: true });
      result.push(...otherTeams.map(t => ({ label: t.name, value: t.id })));
    }

    return result;
  });

  readonly save = output<void>();
  readonly cancel = output<void>();
  readonly openPgn = output<PcapBoardMatchup>();
  readonly teamChange = output<{ side: 'teamA' | 'teamB'; teamId: string }>();
  readonly recalculate = output<void>();
  readonly fillRosters = output<void>();

  readonly blitzOptions: ScoreOption[] = [
    { label: '0 - 0', value: '0-0', scoreA: 0, scoreB: 0 },
    { label: '1 - 0', value: '1-0', scoreA: 1, scoreB: 0 },
    { label: '0.5 - 0.5', value: '0.5-0.5', scoreA: 0.5, scoreB: 0.5 },
    { label: '0 - 1', value: '0-1', scoreA: 0, scoreB: 1 },
  ];

  readonly rapidOptions: ScoreOption[] = [
    { label: '0 - 0', value: '0-0', scoreA: 0, scoreB: 0 },
    { label: '2 - 0', value: '2-0', scoreA: 2, scoreB: 0 },
    { label: '1 - 1', value: '1-1', scoreA: 1, scoreB: 1 },
    { label: '0 - 2', value: '0-2', scoreA: 0, scoreB: 2 },
  ];

  ngOnInit(): void {
    // Automatically prefill players if boards have empty entries
    this.prefillIfEmpty('teamA');
    this.prefillIfEmpty('teamB');
  }

  private prefillIfEmpty(side: 'teamA' | 'teamB'): void {
    const field = side === 'teamA' ? 'playerA' : 'playerB';
    const hasAnyEmpty = this.match().boards.some(b => !b[field]?.name?.trim());
    if (hasAnyEmpty) {
      this.prefillRosterForSide(side, undefined, false);
    }
  }

  prefillRosterForSide(side: 'teamA' | 'teamB', specificTeam?: PcapTeam, force = false): void {
    const currentMatch = this.match();
    const team = specificTeam || this.getTeam(side);
    if (!team?.roster || team.roster.length === 0) return;

    const playerField = side === 'teamA' ? 'playerA' : 'playerB';
    const usedNames = new Set<string>();

    if (!force) {
      for (const b of currentMatch.boards) {
        const existingName = b[playerField]?.name?.trim();
        if (existingName) {
          usedNames.add(existingName.toLowerCase());
        }
      }
    }

    const roster = team.roster;
    const findAvailable = (predicate: (p: PcapRosterPlayer) => boolean): PcapRosterPlayer | undefined => {
      const found = roster.find(p => predicate(p) && !usedNames.has(p.name.trim().toLowerCase()));
      if (found) {
        usedNames.add(found.name.trim().toLowerCase());
        return found;
      }
      return undefined;
    };

    for (const b of currentMatch.boards) {
      if (!force && b[playerField]?.name?.trim()) {
        continue;
      }

      let selected: PcapRosterPlayer | undefined;
      if (b.boardNumber === 1 || b.boardNumber === 2) {
        selected = findAvailable(p => p.category === 'O');
      } else if (b.boardNumber === 3) {
        selected = findAvailable(p => p.category === 'L' || p.category === 'F' || p.category === 'HG/L');
      } else if (b.boardNumber === 4) {
        selected = findAvailable(p => p.category === 'S' || p.category === 'HG/S');
      } else if (b.boardNumber >= 5 && b.boardNumber <= 7) {
        selected = findAvailable(p => p.category === 'HG' || p.category === 'HG/S' || p.category === 'HG/L');
      }

      if (!selected) {
        selected = findAvailable(p => this.isPlayerEligibleForBoard(p, b.boardNumber));
      }
      if (!selected) {
        selected = findAvailable(() => true);
      }

      if (selected) {
        b[playerField] = {
          name: selected.name,
          title: selected.title || '',
          rating: selected.rating || 2000
        };
      }
    }
  }

  onTeamSelect(side: 'teamA' | 'teamB', teamId: string): void {
    const team = this.allTeams().find(t => t.id === teamId);
    if (team) {
      this.match()[side] = {
        id: team.id,
        name: team.name,
        conference: team.conference
      };
      this.prefillRosterForSide(side, team, true);
    }
    this.teamChange.emit({ side, teamId });
  }

  autoSumBoardScores(): void {
    const m = this.match();
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

    this.recalculate.emit();
  }

  onAutoSum(): void {
    this.autoSumBoardScores();
  }

  onFillRosters(): void {
    this.prefillRosterForSide('teamA', undefined, true);
    this.prefillRosterForSide('teamB', undefined, true);
    this.fillRosters.emit();
  }

  getBlitzValue(board: PcapBoardMatchup): string {
    return `${board.blitzScoreA ?? 0}-${board.blitzScoreB ?? 0}`;
  }

  onBlitzChange(board: PcapBoardMatchup, val: string): void {
    const option = this.blitzOptions.find(o => o.value === val);
    if (option) {
      board.blitzScoreA = option.scoreA;
      board.blitzScoreB = option.scoreB;
    } else {
      const parts = val.split('-').map(Number);
      board.blitzScoreA = parts[0] || 0;
      board.blitzScoreB = parts[1] || 0;
    }
    this.autoSumBoardScores();
  }

  getRapidValue(board: PcapBoardMatchup): string {
    return `${board.rapidScoreA ?? 0}-${board.rapidScoreB ?? 0}`;
  }

  onRapidChange(board: PcapBoardMatchup, val: string): void {
    const option = this.rapidOptions.find(o => o.value === val);
    if (option) {
      board.rapidScoreA = option.scoreA;
      board.rapidScoreB = option.scoreB;
    } else {
      const parts = val.split('-').map(Number);
      board.rapidScoreA = parts[0] || 0;
      board.rapidScoreB = parts[1] || 0;
    }
    this.autoSumBoardScores();
  }

  /**
   * Get the PcapTeam object for teamA or teamB.
   */
  getTeam(side: 'teamA' | 'teamB'): PcapTeam | undefined {
    const teamId = side === 'teamA' ? this.match().teamA?.id : this.match().teamB?.id;
    return this.allTeams().find(t => t.id === teamId);
  }

  /**
   * Determine if a player's category matches the designated board slot:
   * - Boards 1 & 2: Open ('O')
   * - Board 3: Lady ('L', 'F', 'HG/L')
   * - Board 4: Senior ('S', 'HG/S')
   * - Boards 5, 6, 7: HomeGrown ('HG', 'HG/S', 'HG/L')
   */
  isPlayerEligibleForBoard(player: PcapRosterPlayer, boardNumber: number): boolean {
    const cat = player.category;
    if (!cat) return false;
    if (boardNumber === 1 || boardNumber === 2) {
      return cat === 'O';
    }
    if (boardNumber === 3) {
      return cat === 'L' || cat === 'F' || cat === 'HG/L';
    }
    if (boardNumber === 4) {
      return cat === 'S' || cat === 'HG/S';
    }
    if (boardNumber >= 5 && boardNumber <= 7) {
      return cat === 'HG' || cat === 'HG/S' || cat === 'HG/L';
    }
    return false;
  }

  getEligiblePlayers(boardNumber: number, side: 'teamA' | 'teamB'): PcapRosterPlayer[] {
    const team = this.getTeam(side);
    if (!team?.roster) return [];
    return team.roster.filter(p => this.isPlayerEligibleForBoard(p, boardNumber));
  }

  getOtherPlayers(boardNumber: number, side: 'teamA' | 'teamB'): PcapRosterPlayer[] {
    const team = this.getTeam(side);
    if (!team?.roster) return [];
    return team.roster.filter(p => !this.isPlayerEligibleForBoard(p, boardNumber));
  }

  getEligibleGroupLabel(boardNumber: number): string {
    if (boardNumber === 1 || boardNumber === 2) return 'Eligible (Open • B1-B2)';
    if (boardNumber === 3) return 'Eligible (Lady • B3)';
    if (boardNumber === 4) return 'Eligible (Senior • B4)';
    if (boardNumber >= 5 && boardNumber <= 7) return 'Eligible (Homegrown • B5-B7)';
    return 'Eligible Players';
  }

  /**
   * Returns the board number where this player is already placed in this match, or null if unassigned.
   */
  getAssignedBoard(playerName: string, currentBoard: number, side: 'teamA' | 'teamB'): number | null {
    if (!playerName) return null;
    const target = playerName.trim().toLowerCase();
    for (const b of this.match().boards) {
      if (b.boardNumber === currentBoard) continue;
      const assignedName = (side === 'teamA' ? b.playerA?.name : b.playerB?.name) || '';
      if (assignedName.trim().toLowerCase() === target) {
        return b.boardNumber;
      }
    }
    return null;
  }

  formatPlayerOption(p: PcapRosterPlayer): string {
    const titlePart = p.title ? `${p.title} ` : '';
    const ratingPart = p.rating ? ` (${p.rating})` : '';
    return `${titlePart}${p.name}${ratingPart}`;
  }

  onRosterSelect(board: PcapBoardMatchup, playerField: 'playerA' | 'playerB', selectedName: string): void {
    if (!board[playerField]) {
      board[playerField] = { name: '', rating: 2000 };
    }
    if (!selectedName) {
      board[playerField].name = '';
      return;
    }
    const side = playerField === 'playerA' ? 'teamA' : 'teamB';
    const team = this.getTeam(side);
    const rosterPlayer = team?.roster?.find(p => p.name === selectedName);
    if (rosterPlayer) {
      board[playerField].name = rosterPlayer.name;
      board[playerField].title = rosterPlayer.title || '';
      board[playerField].rating = rosterPlayer.rating || 2000;
    } else {
      board[playerField].name = selectedName;
    }
  }
}

