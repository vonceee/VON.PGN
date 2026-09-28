import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown, heroChevronUp } from '@ng-icons/heroicons/outline';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference, PcapMatchStatus } from '../../../../core/models/pcap.model';
import { SelectComponent, SelectItem } from '../../../../shared/components/ui/select/select.component';
import {
  getPcapTitleBadgeClass,
  getPcapTeamLogo,
  getPcapTeamMonogram,
  getPcapTeamBackdropClass
} from '../../utils/pcap.utils';

@Component({
  selector: 'app-pcap-matches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    SelectComponent
  ],
  providers: [
    provideIcons({
      heroChevronDown,
      heroChevronUp
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-matches.component.html'
})
export class PcapMatchesComponent {
  public pcapService = inject(PcapService);

  // Expanded match ID for board-by-board match sheet
  expandedMatchId = signal<string | null>('match-rd13-1');

  // Service signals
  matches = this.pcapService.filteredMatches;
  leagueStats = this.pcapService.leagueStats;
  currentConference = this.pcapService.conferenceFilter;
  currentStatus = this.pcapService.statusFilter;

  // Dropdown options
  readonly conferenceOptions: SelectItem<PcapConference | 'all'>[] = [
    { label: 'All Divisions', value: 'all' },
    { label: 'Division Alpha', value: 'alpha' },
    { label: 'Division Omega', value: 'omega' }
  ];

  // Utility references for template
  getTitleBadgeClass = getPcapTitleBadgeClass;
  getPcapTeamLogo = getPcapTeamLogo;
  getPcapTeamMonogram = getPcapTeamMonogram;
  getPcapTeamBackdropClass = getPcapTeamBackdropClass;

  setStatus(status: PcapMatchStatus | 'all') {
    this.pcapService.statusFilter.set(status);
  }

  setConference(conf: PcapConference | 'all') {
    this.pcapService.conferenceFilter.set(conf);
  }

  toggleMatchBoards(matchId: string) {
    if (this.expandedMatchId() === matchId) {
      this.expandedMatchId.set(null);
    } else {
      this.expandedMatchId.set(matchId);
    }
  }

  hasBoardLineups(match: any): boolean {
    if (!match?.boards || match.boards.length === 0) return false;
    return match.boards.some(
      (b: any) =>
        (b.playerA?.name && b.playerA.name.trim() !== '') ||
        (b.playerB?.name && b.playerB.name.trim() !== '') ||
        !!b.blitzPgn ||
        !!b.rapidPgn
    );
  }

  hasSegmentBreakdown(match: any): boolean {
    return (
      (match.blitzScoreA > 0 || match.blitzScoreB > 0) ||
      (match.rapidScoreA > 0 || match.rapidScoreB > 0)
    );
  }
}
