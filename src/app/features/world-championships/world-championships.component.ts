import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorldChampionshipService } from '../../core/services/world-championship.service';
import { WorldChampionshipMatch, WorldChampionshipEra } from '../../core/models/world-championship.model';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';

@Component({
  selector: 'app-world-championships',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-championships.component.html',
})
export class WorldChampionshipsComponent {
  private wccService = inject(WorldChampionshipService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  selectedEra = signal<string>('All');
  selectedMatch = signal<WorldChampionshipMatch | null>(null);

  readonly eras = [
    'All',
    'Modern Era (2006-Present)',
    'Split Era (1993-2005)',
    'FIDE Soviet Era (1948-1990)',
    'Early Classical (1886-1946)',
  ];

  readonly eraOptions: SelectItem<string>[] = [
    { label: 'All eras', value: 'All' },
    { label: 'Modern Era (2006-Present)', value: 'Modern Era (2006-Present)' },
    { label: 'Split Era (1993-2005)', value: 'Split Era (1993-2005)' },
    { label: 'FIDE Soviet Era (1948-1990)', value: 'FIDE Soviet Era (1948-1990)' },
    { label: 'Early Classical (1886-1946)', value: 'Early Classical (1886-1946)' },
  ];

  matches = computed(() => this.wccService.allMatches());
  isFetchingStudies = computed(() => this.wccService.isFetchingStudies());

  filteredMatches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const era = this.selectedEra();

    return this.matches().filter((match) => {
      const matchesEra = !era || era === 'All' || match.era === era;

      const matchesQuery =
        !query ||
        match.title.toLowerCase().includes(query) ||
        match.year.toString().includes(query) ||
        match.champion.toLowerCase().includes(query) ||
        match.challenger.toLowerCase().includes(query) ||
        match.winner.toLowerCase().includes(query) ||
        match.location.toLowerCase().includes(query) ||
        match.description.toLowerCase().includes(query);

      return matchesEra && matchesQuery;
    });
  });

  stats = computed(() => {
    const list = this.matches();
    const linkedCount = list.filter((m) => !!m.studyId).length;
    return {
      totalMatches: list.length,
      linkedStudies: linkedCount,
      reigningChampion: 'Gukesh Dommaraju (2024)',
      mostTitles: 'Emanuel Lasker & Garry Kasparov (6 defenses)',
    };
  });

  clearSearch() {
    this.searchQuery.set('');
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedEra.set('All');
  }

  openStudy(match: WorldChampionshipMatch, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (match.studyId) {
      this.router.navigate(['/study', match.studyId]);
    } else {
      this.router.navigate(['/study'], {
        queryParams: { search: `${match.year} World Chess Championship` },
      });
    }
  }

  openDetailsModal(match: WorldChampionshipMatch) {
    this.selectedMatch.set(match);
  }

  closeDetailsModal() {
    this.selectedMatch.set(null);
  }
}
