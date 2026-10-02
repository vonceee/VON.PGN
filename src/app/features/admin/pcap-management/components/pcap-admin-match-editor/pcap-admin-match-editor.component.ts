import { Component, ChangeDetectionStrategy, input, model, output, computed, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SelectComponent, SelectItem } from '../../../../../shared/components/ui/select/select.component';
import { TextInputComponent } from '../../../../../shared/components/ui/text-input/text-input.component';
import { ChesscomService } from '../../../../../core/services/chesscom.service';
import { ToastService } from '../../../../../core/services/toast.service';
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
  private readonly chesscomService = inject(ChesscomService);
  private readonly toast = inject(ToastService);

  readonly match = model.required<PcapMatch>();
  readonly isEditing = input<boolean>(false);
  readonly allTeams = input.required<PcapTeam[]>();

  readonly isBatchFetching = signal<boolean>(false);

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
    this.syncBoardUsernames();
    this.prefillIfEmpty('teamA');
    this.prefillIfEmpty('teamB');
  }

  /**
   * Syncs Chess.com handles from team rosters onto boards that lack them.
   */
  syncBoardUsernames(): void {
    const match = this.match();
    const teamA = this.getTeam('teamA');
    const teamB = this.getTeam('teamB');

    for (const b of match.boards) {
      const nameA = b.playerA?.name?.trim().toLowerCase();
      if (nameA && !b.playerA.chesscomUsername && teamA?.roster) {
        const p = teamA.roster.find(r => r.name.trim().toLowerCase() === nameA);
        if (p?.chesscomUsername) {
          b.playerA.chesscomUsername = p.chesscomUsername;
        }
      }
      const rapidNameA = b.rapidPlayerA?.name?.trim().toLowerCase();
      if (rapidNameA && b.rapidPlayerA && !b.rapidPlayerA.chesscomUsername && teamA?.roster) {
        const p = teamA.roster.find(r => r.name.trim().toLowerCase() === rapidNameA);
        if (p?.chesscomUsername) {
          b.rapidPlayerA.chesscomUsername = p.chesscomUsername;
        }
      }
      const nameB = b.playerB?.name?.trim().toLowerCase();
      if (nameB && !b.playerB.chesscomUsername && teamB?.roster) {
        const p = teamB.roster.find(r => r.name.trim().toLowerCase() === nameB);
        if (p?.chesscomUsername) {
          b.playerB.chesscomUsername = p.chesscomUsername;
        }
      }
      const rapidNameB = b.rapidPlayerB?.name?.trim().toLowerCase();
      if (rapidNameB && b.rapidPlayerB && !b.rapidPlayerB.chesscomUsername && teamB?.roster) {
        const p = teamB.roster.find(r => r.name.trim().toLowerCase() === rapidNameB);
        if (p?.chesscomUsername) {
          b.rapidPlayerB.chesscomUsername = p.chesscomUsername;
        }
      }
    }
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
          rating: selected.rating || 2000,
          chesscomUsername: selected.chesscomUsername || ''
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

  private clearBoardScoresAndPgns(board: PcapBoardMatchup): void {
    board.blitzScoreA = 0;
    board.blitzScoreB = 0;
    board.rapidScoreA = 0;
    board.rapidScoreB = 0;
    board.blitzPgn = undefined;
    board.rapidPgn = undefined;
  }

  onRosterSelect(board: PcapBoardMatchup, playerField: 'playerA' | 'playerB', selectedName: string): void {
    if (!board[playerField]) {
      board[playerField] = { name: '', rating: 2000 };
    }
    if (!selectedName) {
      board[playerField].name = '';
      board[playerField].title = '';
      board[playerField].rating = 2000;
      board[playerField].chesscomUsername = '';
      return;
    }

    const side = playerField === 'playerA' ? 'teamA' : 'teamB';
    const team = this.getTeam(side);
    const targetName = selectedName.trim().toLowerCase();

    // Check if the selected player is already assigned to a different board on this side
    const otherBoard = this.match().boards.find(b =>
      b.boardNumber !== board.boardNumber &&
      b[playerField]?.name?.trim().toLowerCase() === targetName
    );

    if (otherBoard) {
      // SWAP: The selected player is already on another board
      // 1. Snapshot previous player from current board
      const prevPlayer = {
        name: board[playerField]?.name || '',
        title: board[playerField]?.title || '',
        rating: board[playerField]?.rating || 2000,
        chesscomUsername: board[playerField]?.chesscomUsername || ''
      };

      // 2. Put selected player onto current board
      const rosterPlayer = team?.roster?.find(p => p.name.trim().toLowerCase() === targetName);
      if (rosterPlayer) {
        board[playerField].name = rosterPlayer.name;
        board[playerField].title = rosterPlayer.title || '';
        board[playerField].rating = rosterPlayer.rating || 2000;
        board[playerField].chesscomUsername = rosterPlayer.chesscomUsername || '';
      } else if (otherBoard[playerField]) {
        board[playerField].name = otherBoard[playerField].name;
        board[playerField].title = otherBoard[playerField].title || '';
        board[playerField].rating = otherBoard[playerField].rating || 2000;
        board[playerField].chesscomUsername = otherBoard[playerField].chesscomUsername || '';
      }

      // 3. Put current board's previous player onto the other board
      if (!otherBoard[playerField]) {
        otherBoard[playerField] = { name: '', rating: 2000 };
      }
      otherBoard[playerField].name = prevPlayer.name;
      otherBoard[playerField].title = prevPlayer.title;
      otherBoard[playerField].rating = prevPlayer.rating;
      otherBoard[playerField].chesscomUsername = prevPlayer.chesscomUsername;

      // 4. Clear scores and PGNs for both swapped boards
      this.clearBoardScoresAndPgns(board);
      this.clearBoardScoresAndPgns(otherBoard);

      // 5. Automatically recalculate match score totals
      this.autoSumBoardScores();
    } else {
      // Normal single assignment
      const rosterPlayer = team?.roster?.find(p => p.name === selectedName);
      if (rosterPlayer) {
        board[playerField].name = rosterPlayer.name;
        board[playerField].title = rosterPlayer.title || '';
        board[playerField].rating = rosterPlayer.rating || 2000;
        board[playerField].chesscomUsername = rosterPlayer.chesscomUsername || '';
      } else {
        board[playerField].name = selectedName;
      }
    }
  }

  getRosterPlayers(side: 'teamA' | 'teamB'): PcapRosterPlayer[] {
    const team = this.getTeam(side);
    return team?.roster || [];
  }

  hasRapidSub(board: PcapBoardMatchup, side: 'teamA' | 'teamB'): boolean {
    const sub = side === 'teamA' ? board.rapidPlayerA : board.rapidPlayerB;
    return sub !== undefined;
  }

  enableRapidSub(board: PcapBoardMatchup, side: 'teamA' | 'teamB'): void {
    const starter = side === 'teamA' ? board.playerA : board.playerB;
    const initialSub = {
      name: '',
      title: '',
      rating: starter?.rating || 2000,
      chesscomUsername: ''
    };
    if (side === 'teamA') {
      board.rapidPlayerA = initialSub;
    } else {
      board.rapidPlayerB = initialSub;
    }
  }

  removeRapidSub(board: PcapBoardMatchup, side: 'teamA' | 'teamB'): void {
    if (side === 'teamA') {
      delete board.rapidPlayerA;
    } else {
      delete board.rapidPlayerB;
    }
    this.autoSumBoardScores();
  }

  onRapidSubSelect(board: PcapBoardMatchup, side: 'teamA' | 'teamB', selectedName: string): void {
    const team = this.getTeam(side);
    if (!selectedName) {
      if (side === 'teamA' && board.rapidPlayerA) {
        board.rapidPlayerA.name = '';
        board.rapidPlayerA.title = '';
        board.rapidPlayerA.chesscomUsername = '';
      } else if (side === 'teamB' && board.rapidPlayerB) {
        board.rapidPlayerB.name = '';
        board.rapidPlayerB.title = '';
        board.rapidPlayerB.chesscomUsername = '';
      }
      return;
    }

    const rosterPlayer = team?.roster?.find(p => p.name.trim().toLowerCase() === selectedName.trim().toLowerCase());
    const subObj = {
      name: rosterPlayer ? rosterPlayer.name : selectedName,
      title: rosterPlayer?.title || '',
      rating: rosterPlayer?.rating || 2000,
      chesscomUsername: rosterPlayer?.chesscomUsername || ''
    };

    if (side === 'teamA') {
      board.rapidPlayerA = subObj;
    } else {
      board.rapidPlayerB = subObj;
    }
  }

  /**
   * Batch fetch games from Chess.com for all 7 boards of this match fixture.
   */
  async fetchAllBoardsFromChesscom(): Promise<void> {
    const match = this.match();
    const date = match.date; // e.g. '2026-09-26'
    if (!date) {
      this.toast.show('Please select a Match Date in Fixture Details first', 'error');
      return;
    }

    this.isBatchFetching.set(true);
    this.syncBoardUsernames();

    let successCount = 0;
    const warnings: string[] = [];

    const teamA = this.getTeam('teamA');
    const teamB = this.getTeam('teamB');

    for (const board of match.boards) {
      // 1. Resolve Blitz handles
      let uBlitzA = board.playerA?.chesscomUsername?.trim();
      if (!uBlitzA && board.playerA?.name && teamA?.roster) {
        const pA = teamA.roster.find(r => r.name.trim().toLowerCase() === board.playerA.name.trim().toLowerCase());
        uBlitzA = pA?.chesscomUsername?.trim();
        if (uBlitzA) board.playerA.chesscomUsername = uBlitzA;
      }

      let uBlitzB = board.playerB?.chesscomUsername?.trim();
      if (!uBlitzB && board.playerB?.name && teamB?.roster) {
        const pB = teamB.roster.find(r => r.name.trim().toLowerCase() === board.playerB.name.trim().toLowerCase());
        uBlitzB = pB?.chesscomUsername?.trim();
        if (uBlitzB) board.playerB.chesscomUsername = uBlitzB;
      }

      // 2. Resolve Rapid handles (substitute or fallback to starter)
      const rapidA = (board.rapidPlayerA?.name?.trim()) ? board.rapidPlayerA : board.playerA;
      let uRapidA = rapidA?.chesscomUsername?.trim();
      if (!uRapidA && rapidA?.name && teamA?.roster) {
        const pA = teamA.roster.find(r => r.name.trim().toLowerCase() === rapidA.name.trim().toLowerCase());
        uRapidA = pA?.chesscomUsername?.trim();
        if (uRapidA) rapidA.chesscomUsername = uRapidA;
      }

      const rapidB = (board.rapidPlayerB?.name?.trim()) ? board.rapidPlayerB : board.playerB;
      let uRapidB = rapidB?.chesscomUsername?.trim();
      if (!uRapidB && rapidB?.name && teamB?.roster) {
        const pB = teamB.roster.find(r => r.name.trim().toLowerCase() === rapidB.name.trim().toLowerCase());
        uRapidB = pB?.chesscomUsername?.trim();
        if (uRapidB) rapidB.chesscomUsername = uRapidB;
      }

      let boardHadSuccess = false;

      // Case A: Identical handles for Blitz and Rapid (No substitutions)
      if (uBlitzA === uRapidA && uBlitzB === uRapidB) {
        if (!uBlitzA || !uBlitzB) {
          const pAName = board.playerA?.name || 'Player A';
          const pBName = board.playerB?.name || 'Player B';
          warnings.push(`Board ${board.boardNumber} (${pAName} vs ${pBName}): Missing Chess.com handle in Team Roster`);
          continue;
        }

        try {
          const res = await firstValueFrom(this.chesscomService.findHeadToHeadGames(uBlitzA, uBlitzB, date));
          if (res.success) {
            if (res.blitzGame) {
              board.blitzPgn = res.blitzGame.pgn;
              board.blitzScoreA = res.blitzScoreA ?? board.blitzScoreA;
              board.blitzScoreB = res.blitzScoreB ?? board.blitzScoreB;
            }
            if (res.rapidGame) {
              board.rapidPgn = res.rapidGame.pgn;
              board.rapidScoreA = res.rapidScoreA ?? board.rapidScoreA;
              board.rapidScoreB = res.rapidScoreB ?? board.rapidScoreB;
            }
            if (res.blitzGame || res.rapidGame) {
              boardHadSuccess = true;
            }
          } else {
            warnings.push(`Board ${board.boardNumber} (${uBlitzA} vs ${uBlitzB}): ${res.message}`);
          }
        } catch (e) {
          warnings.push(`Board ${board.boardNumber} (${uBlitzA} vs ${uBlitzB}): Request error`);
        }
      } else {
        // Case B: Substitution fielded! Fetch Blitz and Rapid separately
        // Fetch Blitz segment
        if (uBlitzA && uBlitzB) {
          try {
            const resBlitz = await firstValueFrom(this.chesscomService.findHeadToHeadGames(uBlitzA, uBlitzB, date));
            if (resBlitz.success && resBlitz.blitzGame) {
              board.blitzPgn = resBlitz.blitzGame.pgn;
              board.blitzScoreA = resBlitz.blitzScoreA ?? board.blitzScoreA;
              board.blitzScoreB = resBlitz.blitzScoreB ?? board.blitzScoreB;
              boardHadSuccess = true;
            } else if (!resBlitz.success) {
              warnings.push(`Board ${board.boardNumber} Blitz (${uBlitzA} vs ${uBlitzB}): ${resBlitz.message}`);
            }
          } catch (e) {
            warnings.push(`Board ${board.boardNumber} Blitz: Request error`);
          }
          await new Promise(resolve => setTimeout(resolve, 250));
        } else {
          warnings.push(`Board ${board.boardNumber} Blitz: Missing handle for ${board.playerA?.name || 'A'} or ${board.playerB?.name || 'B'}`);
        }

        // Fetch Rapid segment
        if (uRapidA && uRapidB) {
          try {
            const resRapid = await firstValueFrom(this.chesscomService.findHeadToHeadGames(uRapidA, uRapidB, date));
            if (resRapid.success && resRapid.rapidGame) {
              board.rapidPgn = resRapid.rapidGame.pgn;
              board.rapidScoreA = resRapid.rapidScoreA ?? board.rapidScoreA;
              board.rapidScoreB = resRapid.rapidScoreB ?? board.rapidScoreB;
              boardHadSuccess = true;
            } else if (!resRapid.success) {
              warnings.push(`Board ${board.boardNumber} Rapid (${uRapidA} vs ${uRapidB}): ${resRapid.message}`);
            }
          } catch (e) {
            warnings.push(`Board ${board.boardNumber} Rapid: Request error`);
          }
        } else {
          warnings.push(`Board ${board.boardNumber} Rapid: Missing handle for ${rapidA?.name || 'A'} or ${rapidB?.name || 'B'}`);
        }
      }

      if (boardHadSuccess) {
        successCount++;
      }

      // 300ms pause between boards to prevent Chess.com rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.autoSumBoardScores();
    this.isBatchFetching.set(false);

    if (successCount === match.boards.length && match.boards.length > 0) {
      this.toast.show(`Successfully fetched games for all ${successCount} boards!`, 'success');
    } else if (successCount > 0) {
      this.toast.show(`Fetched games for ${successCount} board(s). (${warnings.length} unplayed/missing)`, 'achievement');
    } else {
      const errorMsg = warnings[0] || 'No games found for the selected match date.';
      this.toast.show(errorMsg, 'error');
    }
  }
}

