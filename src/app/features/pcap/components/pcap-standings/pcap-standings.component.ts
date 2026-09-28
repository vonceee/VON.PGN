import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference } from '../../../../core/models/pcap.model';

import { getPcapTeamLogo, getPcapTeamMonogram } from '../../utils/pcap.utils';

@Component({
  selector: 'app-pcap-standings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-standings.component.html'
})
export class PcapStandingsComponent {
  public pcapService = inject(PcapService);

  // Quick standings division switch
  standingsConference = signal<PcapConference>('alpha');

  alphaStandings = this.pcapService.alphaStandings;
  omegaStandings = this.pcapService.omegaStandings;
  northStandings = this.pcapService.northStandings;
  southStandings = this.pcapService.southStandings;

  getPcapTeamLogo = getPcapTeamLogo;
  getPcapTeamMonogram = getPcapTeamMonogram;
}
