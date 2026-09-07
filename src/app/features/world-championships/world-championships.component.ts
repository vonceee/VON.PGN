import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorldChampionshipService } from '../../core/services/world-championship.service';
import { WorldChampionshipMatch } from '../../core/models/world-championship.model';
import { TextInputComponent, FloatingCursorComponent } from '@shared/ui';
import {
  FloatingCursorContainerDirective,
  FloatingCursorTriggerDirective,
} from '@shared/directives';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrophy } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-world-championships',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextInputComponent,
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroTrophy,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-championships.component.html',
})
export class WorldChampionshipsComponent {
  private wccService = inject(WorldChampionshipService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  isLoading = computed(() => this.wccService.isLoading());

  matches = computed(() => this.wccService.allMatches());

  filteredMatches = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      return this.matches();
    }

    return this.matches().filter((match) => {
      return (
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
            (g.title && g.title.toLowerCase().includes(query))
        )
      );
    });
  });

  clearSearch() {
    this.searchQuery.set('');
  }

  openMatchupDetail(match: WorldChampionshipMatch) {
    this.router.navigate(['/world-championships', match.id]);
  }
}
