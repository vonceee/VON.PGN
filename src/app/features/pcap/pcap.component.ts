import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PcapService } from '../../core/services/pcap.service';
import { PcapConference } from '../../core/models/pcap.model';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';
import {
  PcapOverviewComponent,
  PcapTeamsComponent,
  PcapMatchesComponent,
  PcapStandingsComponent,
  PcapStatsComponent
} from './components';

export type PcapTab = 'overview' | 'teams' | 'matches' | 'standings' | 'stats';

@Component({
  selector: 'app-pcap',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
    PcapOverviewComponent,
    PcapTeamsComponent,
    PcapMatchesComponent,
    PcapStandingsComponent,
    PcapStatsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap.component.html'
})
export class PcapComponent implements OnInit {
  public pcapService = inject(PcapService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active view tab
  activeTab = signal<PcapTab>('overview');

  // Selected team ID for expanded roster modal or card expansion
  expandedTeamId = signal<string | null>(null);

  // Service signals exposed for the template
  leagueStats = this.pcapService.leagueStats;

  ngOnInit(): void {
    // Ensure fresh PCAP data is fetched from the database whenever visiting the PCAP page
    this.pcapService.syncFromBackend();

    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab') as PcapTab;
      if (tabParam && ['overview', 'teams', 'matches', 'standings', 'stats'].includes(tabParam)) {
        this.activeTab.set(tabParam);
      }

      const confParam = params.get('conference');
      if (confParam === 'all' || confParam === 'alpha' || confParam === 'omega') {
        this.pcapService.conferenceFilter.set(confParam);
      } else if (confParam === 'north') {
        this.pcapService.conferenceFilter.set('alpha');
      } else if (confParam === 'south') {
        this.pcapService.conferenceFilter.set('omega');
      }

      const teamParam = params.get('team');
      if (teamParam) {
        this.expandedTeamId.set(teamParam);
      }
    });
  }

  setTab(tab: PcapTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }
}
