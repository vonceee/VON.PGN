import { Component, ChangeDetectionStrategy, input, model, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PcapTeam,
  PcapRosterPlayer,
  CHESS_FEDERATIONS,
  CHESS_MASTER_TITLE_GROUPS,
  PCAP_CATEGORIES
} from '../../../../../core/models/pcap.model';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-pcap-admin-team-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pcap-admin-team-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminTeamEditorComponent {
  private readonly toast = inject(ToastService);

  readonly team = model.required<PcapTeam>();
  readonly isEditing = input<boolean>(false);

  readonly save = output<void>();
  readonly cancel = output<void>();

  readonly chessFederations = CHESS_FEDERATIONS;
  readonly chessMasterTitleGroups = CHESS_MASTER_TITLE_GROUPS;
  readonly pcapCategories = PCAP_CATEGORIES;

  addPlayer(): void {
    const current = this.team();
    const newIndex = current.roster.length + 1;
    const newPlayer: PcapRosterPlayer = {
      id: `${current.id || 'team'}-p${Date.now().toString(36)}-${newIndex}`,
      name: '',
      title: '',
      rating: null,
      category: 'HG',
      federation: 'PHI',
      hometown: '',
      chesscomUsername: ''
    };

    this.team.set({
      ...current,
      roster: [...current.roster, newPlayer]
    });
  }

  removePlayer(index: number): void {
    const current = this.team();
    if (current.roster.length <= 1) {
      this.toast.show('A team must have at least 1 player slot', 'error');
      return;
    }
    const updated = current.roster.filter((_p: PcapRosterPlayer, i: number) => i !== index);
    this.team.set({
      ...current,
      roster: updated
    });
  }
}
