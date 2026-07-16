import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TacticsService } from '../../../core/services/tactics.service';
import { UserService } from '../../../core/services/user.service';
import { PUZZLE_THEMES_HIERARCHY, PuzzleThemeCategory, PuzzleThemeDef } from './puzzle-themes.config';
@Component({
  selector: 'app-puzzle-themes',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './themes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PuzzleThemesComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private userService = inject(UserService);

  userStreak = computed(() => this.userService.currentUser()?.progress?.puzzleStreak ?? 0);

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
}
