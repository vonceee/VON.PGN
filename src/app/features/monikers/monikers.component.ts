import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MonikerService } from '../../core/services/moniker.service';
import { PlayerMoniker } from '../../core/models/moniker.model';
import { FloatingCursorContainerDirective, FloatingCursorTriggerDirective } from '@shared/directives';
import {
  FloatingCursorComponent,
  TextInputComponent,
  SelectComponent,
  SelectItem,
} from '@shared/ui';

/**
 * MonikersComponent displays historical and modern chess player monikers in an asymmetrical bento grid.
 *
 * ARCHITECTURAL CHOICE:
 * Standardized search and filter controls to use reusable `TextInputComponent` and `SelectComponent`
 * with modern Angular Signals and two-way binding. This aligns with the unified design system and
 * avoids fragmented raw HTML inputs.
 *
 * ASSUMPTIONS & EDGE CASES:
 * - Category filter defaults to 'All', matching all players regardless of assigned category.
 * - Search query matches player names, monikers, short descriptions, and tags case-insensitively.
 */
@Component({
  selector: 'app-monikers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent,
    TextInputComponent,
    SelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './monikers.component.html',
  styles: [`
    .octagon-clip {
      clip-path: polygon(
        16px 0%, 
        calc(100% - 16px) 0%, 
        100% 16px, 
        100% calc(100% - 16px), 
        calc(100% - 16px) 100%, 
        16px 100%, 
        0% calc(100% - 16px), 
        0% 16px
      );
    }
  `],
})
export class MonikersComponent {
  private monikerService = inject(MonikerService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');
  failedImages = signal<Set<string>>(new Set());

  readonly categories = [
    'All',
    'World Champions',
    'Tactical Masters',
    'Positional Legends',
    'Modern Super GMs',
    'Historical Icons',
  ];

  readonly categoryOptions: SelectItem<string>[] = [
    { label: 'All categories', value: 'All' },
    { label: 'World Champions', value: 'World Champions' },
    { label: 'Tactical Masters', value: 'Tactical Masters' },
    { label: 'Positional Legends', value: 'Positional Legends' },
    { label: 'Modern Super GMs', value: 'Modern Super GMs' },
    { label: 'Historical Icons', value: 'Historical Icons' },
  ];

  monikers = computed(() => this.monikerService.allMonikers());

  filteredMonikers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    return this.monikers().filter((item) => {
      const matchesCategory = !category || category === 'All' || item.category === category;

      const matchesQuery =
        !query ||
        item.moniker.toLowerCase().includes(query) ||
        item.playerName.toLowerCase().includes(query) ||
        item.shortDescription.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  });

  clearSearch() {
    this.searchQuery.set('');
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
  }

  onImageError(id: string) {
    this.failedImages.update((set) => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  openBlog(blogSlug: string) {
    this.router.navigate(['/blog', blogSlug], { queryParams: { from: 'monikers' } });
  }

  getCategoryIcon(category?: string): string {
    switch (category) {
      case 'World Champions': return 'heroTrophy';
      case 'Tactical Masters': return 'heroSparkles';
      case 'Positional Legends': return 'heroAcademicCap';
      case 'Modern Super GMs': return 'heroGlobeAlt';
      case 'Historical Icons': return 'heroBookOpen';
      default: return 'heroAcademicCap';
    }
  }

  getCategoryLabel(category?: string): string {
    return category || '';
  }

  getChessPieceSymbol(index: number): string {
    const pieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
    return pieces[index % pieces.length];
  }
}
