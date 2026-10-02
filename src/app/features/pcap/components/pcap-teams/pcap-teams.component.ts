import { Component, ChangeDetectionStrategy, inject, signal, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroMagnifyingGlass,
  heroXMark,
  heroArrowRight
} from '@ng-icons/heroicons/outline';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference, getFederationFlag } from '../../../../core/models/pcap.model';
import { TextInputComponent } from '../../../../shared/components/ui/text-input/text-input.component';
import {
  getPcapTeamLogo,
  getPcapTeamBackdropClass,
  getPcapCategoryBadgeClass,
  getPcapCategoryTooltip,
  getPcapCategoryLabel,
  getPcapTeamMonogram
} from '../../utils/pcap.utils';

@Component({
  selector: 'app-pcap-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
    TextInputComponent
  ],
  providers: [
    provideIcons({
      heroMagnifyingGlass,
      heroXMark,
      heroArrowRight
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-teams.component.html'
})
export class PcapTeamsComponent {
  public pcapService = inject(PcapService);

  // Two-way bound model for parent component compatibility & card selection highlighting
  expandedTeamId = model<string | null>(null);

  // Local search query binding
  searchQueryInput = signal<string>('');

  // Service signals
  teams = this.pcapService.filteredTeams;
  leagueStats = this.pcapService.leagueStats;
  currentConference = this.pcapService.conferenceFilter;

  // Utility references for template
  getFederationFlag = getFederationFlag;
  getTeamLogo = getPcapTeamLogo;
  getTeamBackdropClass = getPcapTeamBackdropClass;
  getTeamMonogram = getPcapTeamMonogram;
  getCategoryBadgeClass = getPcapCategoryBadgeClass;
  getCategoryTooltip = getPcapCategoryTooltip;
  getCategoryLabel = getPcapCategoryLabel;

  setConference(conf: PcapConference | 'all') {
    this.pcapService.conferenceFilter.set(conf);
  }

  onSearchChange(value: string) {
    this.searchQueryInput.set(value);
    this.pcapService.searchQuery.set(value);
  }

  clearSearch() {
    this.searchQueryInput.set('');
    this.pcapService.searchQuery.set('');
  }
}

