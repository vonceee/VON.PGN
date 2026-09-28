import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapTeam } from '../../../../../core/models/pcap.model';

@Component({
  selector: 'app-pcap-admin-teams-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pcap-admin-teams-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminTeamsTableComponent {
  readonly teams = input.required<PcapTeam[]>();

  readonly editTeam = output<PcapTeam>();
  readonly deleteTeam = output<PcapTeam>();
}
