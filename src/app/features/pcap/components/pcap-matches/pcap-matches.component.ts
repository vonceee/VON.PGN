import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference, PcapMatch, PcapMatchStatus } from '../../../../core/models/pcap.model';
import { SelectComponent, SelectItem } from '../../../../shared/components/ui/select/select.component';
import {
  getPcapTeamLogo,
  getPcapTeamMonogram,
  getPcapTeamBackdropClass
} from '../../utils/pcap.utils';

export interface PcapRoundGroup {
  round: number;
  season?: string;
  date?: string;
  time?: string;
  matches: PcapMatch[];
}

@Component({
  selector: 'app-pcap-matches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SelectComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-matches.component.html'
})
export class PcapMatchesComponent {
  public pcapService = inject(PcapService);

  // User manual collapse/expand overrides by round number
  private readonly collapsedMap = signal<Record<number, boolean>>({});

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

  // Group matches by round
  readonly roundGroups = computed<PcapRoundGroup[]>(() => {
    const map = new Map<number, PcapRoundGroup>();
    for (const m of this.matches()) {
      const r = m.round || 1;
      if (!map.has(r)) {
        map.set(r, {
          round: r,
          season: m.season,
          date: m.date,
          time: m.time,
          matches: []
        });
      }
      map.get(r)!.matches.push(m);
    }
    return Array.from(map.values()).sort((a, b) => a.round - b.round);
  });

  isRoundExpanded(round: number): boolean {
    const custom = this.collapsedMap()[round];
    if (custom !== undefined) {
      return custom;
    }
    // Default: latest/active round is expanded, earlier rounds collapsed
    const groups = this.roundGroups();
    if (groups.length === 0) return true;
    const maxRound = Math.max(...groups.map(g => g.round));
    return round === maxRound;
  }

  toggleRound(round: number): void {
    const current = this.isRoundExpanded(round);
    this.collapsedMap.update(map => ({
      ...map,
      [round]: !current
    }));
  }

  readonly areAllExpanded = computed(() => {
    const groups = this.roundGroups();
    if (groups.length === 0) return false;
    return groups.every(g => this.isRoundExpanded(g.round));
  });

  toggleExpandAll(): void {
    const allExp = this.areAllExpanded();
    const nextVal = !allExp;
    const newMap: Record<number, boolean> = {};
    for (const g of this.roundGroups()) {
      newMap[g.round] = nextVal;
    }
    this.collapsedMap.set(newMap);
  }

  // Utility references for template
  getPcapTeamLogo = getPcapTeamLogo;
  getPcapTeamMonogram = getPcapTeamMonogram;
  getPcapTeamBackdropClass = getPcapTeamBackdropClass;

  setStatus(status: PcapMatchStatus | 'all') {
    this.pcapService.statusFilter.set(status);
  }

  setConference(conf: PcapConference | 'all') {
    this.pcapService.conferenceFilter.set(conf);
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


