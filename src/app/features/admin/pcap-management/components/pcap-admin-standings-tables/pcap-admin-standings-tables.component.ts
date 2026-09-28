import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapStanding } from '../../../../../core/models/pcap.model';

@Component({
  selector: 'app-pcap-admin-standings-tables',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pcap-admin-standings-tables.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminStandingsTablesComponent {
  readonly alphaStandings = input.required<PcapStanding[]>();
  readonly omegaStandings = input.required<PcapStanding[]>();

  readonly editStanding = output<PcapStanding>();
}
