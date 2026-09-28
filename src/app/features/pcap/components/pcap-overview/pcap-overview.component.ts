import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapService } from '../../../../core/services/pcap.service';
import {
  getPcapTeamLogo,
  getPcapTeamBackdropClass,
  getPcapTeamMonogram
} from '../../utils/pcap.utils';

@Component({
  selector: 'app-pcap-overview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-overview.component.html'
})
export class PcapOverviewComponent {
  readonly pcapService = inject(PcapService);

  readonly alphaTeams = this.pcapService.alphaTeams;
  readonly omegaTeams = this.pcapService.omegaTeams;
  readonly northTeams = this.pcapService.northTeams;
  readonly southTeams = this.pcapService.southTeams;

  // Logo & theme utilities
  readonly getTeamLogo = getPcapTeamLogo;
  readonly getTeamBackdropClass = getPcapTeamBackdropClass;
  readonly getTeamMonogram = getPcapTeamMonogram;
}

