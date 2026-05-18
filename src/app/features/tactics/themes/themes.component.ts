import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TacticsService } from '../../../core/services/tactics.service';
import { PUZZLE_THEMES_HIERARCHY, PuzzleThemeCategory, PuzzleThemeDef } from './puzzle-themes.config';
import { LoadingComponent } from '@shared/feedback';

@Component({
  selector: 'app-puzzle-themes',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    LoadingComponent
  ],
  templateUrl: './themes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PuzzleThemesComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private platformId = inject(PLATFORM_ID);

  isLoading = signal<boolean>(true);
  themeCounts = signal<Record<string, number>>({});
  searchQuery = signal<string>('');
  
  searchControl = new FormControl('');

  filteredHierarchy = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return PUZZLE_THEMES_HIERARCHY;

    return PUZZLE_THEMES_HIERARCHY.map(category => {
      const filteredThemes = category.themes.filter(theme => 
        theme.name.toLowerCase().includes(query) || 
        theme.description.toLowerCase().includes(query)
      );
      return {
        ...category,
        themes: filteredThemes
      } as PuzzleThemeCategory;
    }).filter(category => category.themes.length > 0);
  });

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Sync search input with signal
    this.searchControl.valueChanges.subscribe(val => {
      this.searchQuery.set(val ?? '');
    });

    this.tacticsService.getThemeCounts().subscribe({
      next: (counts) => {
        this.themeCounts.set(counts);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getThemeCount(key: string): number {
    if (key === 'mix') {
      // Sum all counts for dynamic recommended mix
      return Object.values(this.themeCounts()).reduce((a, b) => a + b, 0);
    }
    return this.themeCounts()[key] ?? 0;
  }

  getIconName(key: string): string {
    if (key.startsWith('mateIn')) {
      return 'mate';
    }
    return key;
  }
}
