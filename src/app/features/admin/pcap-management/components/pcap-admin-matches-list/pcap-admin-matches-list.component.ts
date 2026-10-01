import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapMatch, PcapMatchStatus } from '../../../../../core/models/pcap.model';

export interface PcapRoundGroup {
  round: number;
  season?: string;
  date?: string;
  time?: string;
  matches: PcapMatch[];
}

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

  /** User manual collapse/expand overrides by round number */
  private readonly collapsedMap = signal<Record<number, boolean>>({});

  /** Group matches by round */
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
    // Default: latest/active round is expanded, others collapsed
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

  isCompleted(match: PcapMatch): boolean {
    return match.status === 'completed' || (match.scoreA > 0 || match.scoreB > 0);
  }

  isWinner(match: PcapMatch, side: 'teamA' | 'teamB'): boolean {
    if (!this.isCompleted(match)) return false;
    return side === 'teamA' ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
  }

  getTeamNameClass(match: PcapMatch, side: 'teamA' | 'teamB'): string {
    if (this.isWinner(match, side)) {
      return 'font-bold text-slate-900';
    }
    const otherSide = side === 'teamA' ? 'teamB' : 'teamA';
    if (this.isWinner(match, otherSide)) {
      return 'font-normal text-slate-500';
    }
    return 'font-medium text-slate-700';
  }

  getScoreClass(match: PcapMatch, side: 'teamA' | 'teamB'): string {
    if (this.isWinner(match, side)) {
      return 'font-bold text-slate-900';
    }
    const otherSide = side === 'teamA' ? 'teamB' : 'teamA';
    if (this.isWinner(match, otherSide)) {
      return 'font-normal text-slate-500';
    }
    return 'font-medium text-slate-700';
  }
}
