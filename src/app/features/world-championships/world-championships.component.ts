import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorldChampionshipService } from '../../core/services/world-championship.service';
import {
  WorldChampionshipMatch,
  WorldChampionshipEra,
  MatchGameSummary,
} from '../../core/models/world-championship.model';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';
import { WccGamesMatrixComponent } from './components';

@Component({
  selector: 'app-world-championships',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextInputComponent,
    SelectComponent,
    WccGamesMatrixComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-championships.component.html',
})
export class WorldChampionshipsComponent {
  private wccService = inject(WorldChampionshipService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  selectedEra = signal<string>('All');
  coverageFilter = signal<string>('all');

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

  readonly coverageOptions: SelectItem<string>[] = [
    { label: 'All coverage', value: 'all' },
    { label: 'Has Editorial Stories', value: 'covered' },
    { label: 'Needs Coverage', value: 'uncovered' },
  ];

  matches = computed(() => this.wccService.allMatches());
  isFetchingStudies = computed(() => this.wccService.isFetchingStudies());

  filteredMatches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const era = this.selectedEra();
    const coverage = this.coverageFilter();

    return this.matches().filter((match) => {
      const matchesEra = !era || era === 'All' || match.era === era;

      const coveredCount = match.coveredGamesCount || 0;
      const matchesCoverage =
        coverage === 'all' ||
        (coverage === 'covered' && coveredCount > 0) ||
        (coverage === 'uncovered' && coveredCount === 0);

      const matchesQuery =
        !query ||
        match.title.toLowerCase().includes(query) ||
        match.year.toString().includes(query) ||
        match.champion.toLowerCase().includes(query) ||
        match.challenger.toLowerCase().includes(query) ||
        match.winner.toLowerCase().includes(query) ||
        match.location.toLowerCase().includes(query) ||
        match.description.toLowerCase().includes(query) ||
        (match.gamesSummary || []).some(
          (g) =>
            (g.opening && g.opening.toLowerCase().includes(query)) ||
            (g.eco && g.eco.toLowerCase().includes(query)) ||
            (g.title && g.title.toLowerCase().includes(query))
        );

      return matchesEra && matchesCoverage && matchesQuery;
    });
  });

  stats = computed(() => {
    const list = this.matches();
    const linkedCount = list.filter((m) => !!m.studyId).length;
    const totalStories = list.reduce(
      (acc, m) => acc + (m.coveredGamesCount || 0),
      0
    );
    const totalGames = list.reduce((acc, m) => acc + (m.gamesCount || 0), 0);

    return {
      totalMatches: list.length,
      totalGames,
      totalStories,
      linkedStudies: linkedCount,
      reigningChampion: 'Gukesh Dommaraju (2024)',
    };
  });

  clearSearch() {
    this.searchQuery.set('');
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedEra.set('All');
    this.coverageFilter.set('all');
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

  openMatchupDetail(match: WorldChampionshipMatch) {
    this.router.navigate(['/world-championships', match.id]);
  }

  openGameFromMatrix(event: { match: WorldChampionshipMatch; game: MatchGameSummary }) {
    if (event.game.hasStory && event.game.gameId) {
      this.router.navigate(['/world-championships', event.match.id], {
        queryParams: { game: event.game.gameId },
      });
    } else {
      this.router.navigate(['/world-championships', event.match.id]);
    }
  }
}
