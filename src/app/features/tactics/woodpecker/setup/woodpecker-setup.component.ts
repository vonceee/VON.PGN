import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TacticsService } from '../../../../core/services/tactics.service';
import { PUZZLE_THEMES_HIERARCHY } from '../../themes/puzzle-themes.config';

@Component({
  selector: 'app-woodpecker-setup',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
  ],
  templateUrl: './woodpecker-setup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoodpeckerSetupComponent implements OnInit {
  private tacticsService = inject(TacticsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  themeCounts = signal<Record<string, number>>({});

  setupForm = this.fb.group({
    name: ['My Woodpecker Training', [Validators.required, Validators.maxLength(50)]],
    total_puzzles: [100, [Validators.required]],
    theme: ['mix'],
    rating_min: [1200, [Validators.min(0), Validators.max(4000)]],
    rating_max: [1600, [Validators.min(0), Validators.max(4000)]],
  });

  puzzleThemesHierarchy = PUZZLE_THEMES_HIERARCHY.filter(
    category => !['Origin', 'Lengths', 'Goals', 'Special Moves'].includes(category.name)
  );

  puzzleSizes = [
    { value: 5, label: '5 Puzzles (Quick Demo)', desc: 'Perfect to test the system in minutes' },
    { value: 10, label: '10 Puzzles (Short Sprint)', desc: 'Quick diagnostic workout' },
    { value: 25, label: '25 Puzzles (Warm-Up)', desc: 'Build quick daily habit' },
    { value: 50, label: '50 Puzzles (Sprint)', desc: 'Standard practice set' },
    { value: 100, label: '100 Puzzles (Classic)', desc: 'Solid repetition foundation' },
    { value: 250, label: '250 Puzzles (Grand)', desc: 'Serious tournament preparation' },
    { value: 500, label: '500 Puzzles (Elite)', desc: 'Advanced intuition builder' },
    { value: 1000, label: '1,000 Puzzles (Gold Standard)', desc: ' Axel Smith\'s ultimate routine' },
  ];

  ratingRangeMode = signal<'preset' | 'custom'>('preset');

  ratingPresets = [
    { label: 'Beginner (1200 - 1600)', min: 1200, max: 1600 },
    { label: 'Intermediate (1600 - 2000)', min: 1600, max: 2000 },
    { label: 'Advanced (2000 - 2400)', min: 2000, max: 2400 },
    { label: 'Master (2400+)', min: 2400, max: 4000 }
  ];

  selectPreset(min: number, max: number) {
    this.ratingRangeMode.set('preset');
    this.setupForm.patchValue({ rating_min: min, rating_max: max });
  }

  selectCustom() {
    this.ratingRangeMode.set('custom');
  }

  isPresetSelected(min: number, max: number): boolean {
    return this.ratingRangeMode() === 'preset' &&
           this.setupForm.get('rating_min')?.value === min &&
           this.setupForm.get('rating_max')?.value === max;
  }

  getSelectedPresetValue(): string {
    if (this.ratingRangeMode() === 'custom') return 'custom';
    const min = this.setupForm.get('rating_min')?.value;
    const max = this.setupForm.get('rating_max')?.value;
    const index = this.ratingPresets.findIndex(p => p.min === min && p.max === max);
    return index !== -1 ? String(index) : 'custom';
  }

  onRatingPresetChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    if (val === 'custom') {
      this.selectCustom();
    } else {
      const preset = this.ratingPresets[Number(val)];
      this.selectPreset(preset.min, preset.max);
    }
  }



  ngOnInit() {
    this.tacticsService.getThemeCounts().subscribe({
      next: (counts) => {
        this.themeCounts.set(counts);
      },
      error: () => {}
    });
  }

  getThemeCount(key: string): number {
    if (key === 'mix') {
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

  onSubmit() {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }

    const formValues = this.setupForm.value;
    
    // Ensure rating_min and rating_max are numeric or null
    const config = {
      name: formValues.name || 'Woodpecker Session',
      total_puzzles: Number(formValues.total_puzzles),
      theme: formValues.theme || 'mix',
      rating_min: formValues.rating_min !== null ? Number(formValues.rating_min) : undefined,
      rating_max: formValues.rating_max !== null ? Number(formValues.rating_max) : undefined,
    };

    if (config.rating_min && config.rating_max && config.rating_min > config.rating_max) {
      this.errorMessage.set('Minimum rating cannot be higher than maximum rating.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.tacticsService.createWoodpeckerSession(config).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/tactics/woodpecker/solve', res.session.id]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to create training session. Please try again.');
      },
    });
  }
}
