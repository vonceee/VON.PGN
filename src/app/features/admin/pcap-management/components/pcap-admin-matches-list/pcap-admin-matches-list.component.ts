import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapMatch, PcapMatchStatus } from '../../../../../core/models/pcap.model';
import { getPcapTeamLogo, getPcapTeamMonogram } from '../../../../pcap/utils/pcap.utils';

@Component({
  selector: 'app-pcap-admin-matches-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pcap-admin-matches-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminMatchesListComponent {
  readonly matches = input.required<PcapMatch[]>();

  readonly editMatch = output<PcapMatch>();
  readonly deleteMatch = output<PcapMatch>();
  readonly statusChange = output<{ match: PcapMatch; status: PcapMatchStatus }>();

  readonly getPcapTeamLogo = getPcapTeamLogo;
  readonly getPcapTeamMonogram = getPcapTeamMonogram;
}

