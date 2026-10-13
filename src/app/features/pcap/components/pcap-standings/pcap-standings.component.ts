import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference, PcapStanding } from '../../../../core/models/pcap.model';

import { getPcapTeamLogo, getPcapTeamMonogram } from '../../utils/pcap.utils';

export interface PcapCrosstableCell {
  colRank: number;
  opponentId: string;
  opponentName: string;
  isDiagonal: boolean;
  hasPlayed: boolean;
  result: string | null;
  scoreDisplay?: string;
  tooltip: string;
}

export interface PcapCrosstableRow {
  standing: PcapStanding;
  rank: number;
  cells: PcapCrosstableCell[];
}

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
  readonly standingsConference = signal<PcapConference>('alpha');

  // View mode switcher: 'crosstable' (default, Chess.com matrix) vs 'table' (detailed ledger)
  readonly viewMode = signal<'crosstable' | 'table'>('crosstable');

  readonly alphaStandings = this.pcapService.alphaStandings;
  readonly omegaStandings = this.pcapService.omegaStandings;
  readonly northStandings = this.pcapService.northStandings;
  readonly southStandings = this.pcapService.southStandings;

  readonly getPcapTeamLogo = getPcapTeamLogo;
  readonly getPcapTeamMonogram = getPcapTeamMonogram;

  readonly activeStandings = computed<PcapStanding[]>(() =>
    this.standingsConference() === 'alpha' ? this.alphaStandings() : this.omegaStandings()
  );

  readonly crosstableRows = computed<PcapCrosstableRow[]>(() => {
    const standings = this.activeStandings();
    const matches = this.pcapService.allMatches();

    return standings.map((rowTeam, rowIndex) => {
      const cells: PcapCrosstableCell[] = standings.map((colTeam, colIndex) => {
        const colRank = colIndex + 1;
        if (rowTeam.teamId === colTeam.teamId) {
          return {
            colRank,
            opponentId: colTeam.teamId,
            opponentName: colTeam.teamName,
            isDiagonal: true,
            hasPlayed: false,
            result: null,
            tooltip: `${rowTeam.teamName}`
          };
        }

        const norm1 = rowTeam.teamId.trim().toLowerCase();
        const norm2 = colTeam.teamId.trim().toLowerCase();

        const h2hMatches = matches.filter(m => {
          if (m.status !== 'completed') return false;
          const aId = (m.teamA?.id ?? (m as any).team_a_id ?? '').trim().toLowerCase();
          const bId = (m.teamB?.id ?? (m as any).team_b_id ?? '').trim().toLowerCase();
          return (aId === norm1 && bId === norm2) || (aId === norm2 && bId === norm1);
        });

        if (h2hMatches.length === 0) {
          return {
            colRank,
            opponentId: colTeam.teamId,
            opponentName: colTeam.teamName,
            isDiagonal: false,
            hasPlayed: false,
            result: null,
            tooltip: `Unplayed: ${rowTeam.teamName} vs ${colTeam.teamName}`
          };
        }

        const results: string[] = [];
        const scoreParts: string[] = [];
        const tooltipLines: string[] = [];

        for (const m of h2hMatches) {
          const aId = (m.teamA?.id ?? (m as any).team_a_id ?? '').trim().toLowerCase();
          const isTeamA = aId === norm1;
          const myScore = isTeamA ? m.scoreA : m.scoreB;
          const oppScore = isTeamA ? m.scoreB : m.scoreA;

          let resChar = '½';
          let resLabel = 'Draw';
          if (myScore > oppScore) {
            resChar = '1';
            resLabel = 'Won';
          } else if (myScore < oppScore) {
            resChar = '0';
            resLabel = 'Lost';
          }
          results.push(resChar);
          scoreParts.push(`${myScore}-${oppScore}`);
          tooltipLines.push(`Rd ${m.round}: ${myScore} - ${oppScore} (${resLabel})`);
        }

        return {
          colRank,
          opponentId: colTeam.teamId,
          opponentName: colTeam.teamName,
          isDiagonal: false,
          hasPlayed: true,
          result: results.join(' '),
          scoreDisplay: scoreParts.join(', '),
          tooltip: `${rowTeam.teamName} vs ${colTeam.teamName} • ${tooltipLines.join(' | ')}`
        };
      });

      return {
        standing: rowTeam,
        rank: rowIndex + 1,
        cells
      };
    });
  });
}

