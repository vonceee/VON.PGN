import { Component, ChangeDetectionStrategy, inject, signal, model, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroMagnifyingGlass,
  heroXMark,
  heroChevronDown,
  heroChevronUp,
  heroArrowRight
} from '@ng-icons/heroicons/outline';
import { PcapService } from '../../../../core/services/pcap.service';
import { PcapConference, PcapTeam, getFederationFlag } from '../../../../core/models/pcap.model';
import { TextInputComponent } from '../../../../shared/components/ui/text-input/text-input.component';
import {
  getPcapTitleBadgeClass,
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
      heroChevronDown,
      heroChevronUp,
      heroArrowRight
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap-teams.component.html'
})
export class PcapTeamsComponent implements OnInit {
  public pcapService = inject(PcapService);

  // Two-way bound model for parent component compatibility
  expandedTeamId = model<string | null>(null);

  // Responsive column count matching the grid (1, 2, or 3)
  columns = signal<number>(3);

  // Set of expanded row indices for row-synchronized expansion
  expandedRowIndices = signal<Set<number>>(new Set<number>());

  // Local search query binding
  searchQueryInput = signal<string>('');

  // Service signals
  teams = this.pcapService.filteredTeams;
  leagueStats = this.pcapService.leagueStats;
  currentConference = this.pcapService.conferenceFilter;

  // Utility references for template
  getTitleBadgeClass = getPcapTitleBadgeClass;
  getFederationFlag = getFederationFlag;
  getTeamLogo = getPcapTeamLogo;
  getTeamBackdropClass = getPcapTeamBackdropClass;
  getTeamMonogram = getPcapTeamMonogram;
  getCategoryBadgeClass = getPcapCategoryBadgeClass;
  getCategoryTooltip = getPcapCategoryTooltip;
  getCategoryLabel = getPcapCategoryLabel;

  ngOnInit() {
    this.updateColumnCount();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateColumnCount();
  }

  private updateColumnCount() {
    if (typeof window === 'undefined') return;
    const width = window.innerWidth;
    if (width >= 1024) {
      this.columns.set(3);
    } else if (width >= 768) {
      this.columns.set(2);
    } else {
      this.columns.set(1);
    }
  }

  setConference(conf: PcapConference | 'all') {
    this.expandedRowIndices.set(new Set());
    this.pcapService.conferenceFilter.set(conf);
  }

  onSearchChange(value: string) {
    this.expandedRowIndices.set(new Set());
    this.searchQueryInput.set(value);
    this.pcapService.searchQuery.set(value);
  }

  clearSearch() {
    this.expandedRowIndices.set(new Set());
    this.searchQueryInput.set('');
    this.pcapService.searchQuery.set('');
  }

  getRowIndexForTeam(teamId: string): number {
    const list = this.teams();
    const index = list.findIndex(t => t.id === teamId);
    if (index === -1) return -1;
    return Math.floor(index / Math.max(1, this.columns()));
  }

  isTeamExpanded(teamId: string): boolean {
    const rowIdx = this.getRowIndexForTeam(teamId);
    if (rowIdx === -1) return false;
    if (this.expandedRowIndices().has(rowIdx)) return true;
    const boundTeam = this.expandedTeamId();
    if (boundTeam) {
      const boundRow = this.getRowIndexForTeam(boundTeam);
      if (boundRow === rowIdx) return true;
    }
    return false;
  }

  toggleTeamRoster(teamId: string) {
    const rowIdx = this.getRowIndexForTeam(teamId);
    if (rowIdx === -1) return;

    const isCurrentlyExpanded = this.isTeamExpanded(teamId);

    this.expandedRowIndices.update(set => {
      const next = new Set(set);
      if (isCurrentlyExpanded) {
        next.delete(rowIdx);
        if (this.expandedTeamId() && this.getRowIndexForTeam(this.expandedTeamId()!) === rowIdx) {
          this.expandedTeamId.set(null);
        }
      } else {
        next.add(rowIdx);
        this.expandedTeamId.set(teamId);
      }
      return next;
    });
  }
}
