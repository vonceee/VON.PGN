import { Component, ChangeDetectionStrategy, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PcapMatch, PcapTeam, PcapBoardMatchup } from '../../../../../core/models/pcap.model';

export interface ScoreOption {
  label: string;
  value: string;
  scoreA: number;
  scoreB: number;
}

@Component({
  selector: 'app-pcap-admin-match-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pcap-admin-match-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminMatchEditorComponent {
  readonly match = model.required<PcapMatch>();
  readonly isEditing = input<boolean>(false);
  readonly allTeams = input.required<PcapTeam[]>();

  readonly save = output<void>();
  readonly cancel = output<void>();
  readonly openPgn = output<PcapBoardMatchup>();
  readonly teamChange = output<{ side: 'teamA' | 'teamB'; teamId: string }>();
  readonly recalculate = output<void>();

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

  onTeamSelect(side: 'teamA' | 'teamB', teamId: string): void {
    this.teamChange.emit({ side, teamId });
  }

  onScoreInput(): void {
    this.recalculate.emit();
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
    this.recalculate.emit();
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
    this.recalculate.emit();
  }
}
