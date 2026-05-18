import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TacticsService } from '../../../../core/services/tactics.service';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-woodpecker-setup',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ButtonComponent,
  ],
  templateUrl: './woodpecker-setup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoodpeckerSetupComponent {
  private tacticsService = inject(TacticsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  setupForm = this.fb.group({
    name: ['My Woodpecker Training', [Validators.required, Validators.maxLength(50)]],
    total_puzzles: [100, [Validators.required]],
    theme: ['mix'],
    rating_min: [1200, [Validators.min(0), Validators.max(4000)]],
    rating_max: [1600, [Validators.min(0), Validators.max(4000)]],
  });

  popularThemes = [
    { key: 'mix', name: 'Recommended Mix', desc: 'All tactical motifs' },
    { key: 'opening', name: 'Opening Tactics', desc: 'Flaws in the early game' },
    { key: 'middlegame', name: 'Middlegame Tactics', desc: 'Complex battles & motifs' },
    { key: 'endgame', name: 'Endgame Tactics', desc: 'Precision final conversions' },
    { key: 'fork', name: 'Forks & Double Attacks', desc: 'Attacking multiple pieces' },
    { key: 'pin', name: 'Pins & Skewers', desc: 'Restricting piece movement' },
    { key: 'sacrifice', name: 'Sacrifices', desc: 'Giving up material for mate/win' },
    { key: 'mate', name: 'Checkmates', desc: 'Mating nets & patterns' },
  ];

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
