import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ArenaService } from '../../../../core/services/arena.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TIME_CONTROLS } from '../../../../core/models/game.model';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';

@Component({
  selector: 'app-create-arena-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, DialogWrapperComponent],
  template: `
    <app-dialog-wrapper title="Create arena lobby" (close)="dialogRef.close()">
      <form [formGroup]="arenaForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <!-- Time Format -->
        <div class="space-y-3">
          <label class="text-xs font-semibold text-muted uppercase">Time Format</label>
          <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
            @for (tc of timeControls; track tc.value) {
              <button
                type="button"
                (click)="selectTimeControl(tc.value)"
                [class.bg-accent]="arenaForm.get('timeControl')?.value === tc.value"
                [class.border-accent]="arenaForm.get('timeControl')?.value === tc.value"
                [class.text-white]="arenaForm.get('timeControl')?.value === tc.value"
                [class.bg-subtle]="arenaForm.get('timeControl')?.value !== tc.value"
                [class.border-border-base]="arenaForm.get('timeControl')?.value !== tc.value"
                class="flex flex-col items-center justify-center py-2.5 border rounded-xl cursor-pointer hover:bg-accent/10 transition-colors"
              >
                <span class="text-lg font-semibold">{{ tc.label }}</span>
                <span class="text-[8px] font-bold uppercase opacity-70">{{ tc.category }}</span>
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Arena Name -->
          <div class="space-y-1.5">
            <div class="flex justify-between items-center">
              <label class="text-xs font-semibold text-muted uppercase">Arena Name</label>
              <span class="text-[10px] text-muted font-medium italic">Optional</span>
            </div>
            <input
              type="text"
              formControlName="name"
              placeholder="e.g. Weekend Rapid Arena"
              class="metadata-input"
            />
          </div>

          <!-- Start Time -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-muted uppercase">Start Time</label>
            <select formControlName="startDateOffset" class="metadata-input cursor-pointer">
              <option [value]="0.5">30 seconds (Testing)</option>
              <option [value]="5">5 minutes</option>
              <option [value]="10">10 minutes</option>
              <option [value]="30">30 minutes</option>
              <option [value]="60">1 hour</option>
              <option [value]="120">2 hours</option>
            </select>
          </div>
        </div>

        <!-- Duration slider -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <label class="text-xs font-semibold text-muted uppercase">Duration (Minutes)</label>
            <span class="text-lg font-bold text-accent">{{ arenaForm.get('durationMinutes')?.value }}m</span>
          </div>
          <input
            type="range"
            formControlName="durationMinutes"
            min="3"
            max="360"
            step="1"
            class="w-full accent-accent cursor-pointer h-1.5 bg-subtle rounded-lg appearance-none"
          />
        </div>

      </form>

      <button actions appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
      <button actions appButton variant="primary" [loading]="saving()" (click)="onSubmit()">
        Create Arena Lobby
      </button>
    </app-dialog-wrapper>
  `,
  styles: [`
    @reference "../../../../../styles.css";
    .metadata-input {
      @apply w-full px-4 py-2.5 bg-subtle border border-border-base rounded-lg text-sm focus:ring-2 focus:ring-accent/20 outline-none placeholder:text-muted/50 transition-all;
    }
  `]
})
export class CreateArenaDialogComponent {
  private fb = inject(FormBuilder);
  private arenaService = inject(ArenaService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  dialogRef = inject(DialogRef<boolean>);

  saving = signal(false);
  timeControls = TIME_CONTROLS;

  arenaForm = this.fb.group({
    name: ['', Validators.maxLength(255)],
    timeControl: ['180+2', Validators.required],
    durationMinutes: [60, [Validators.required, Validators.min(3), Validators.max(360)]],
    startDateOffset: [10, Validators.required],
  });

  selectTimeControl(value: string) {
    this.arenaForm.patchValue({ timeControl: value });
  }

  onSubmit() {
    if (this.arenaForm.invalid) {
      this.toastService.show('Please complete all fields correctly', 'error');
      return;
    }

    this.saving.set(true);
    const v = this.arenaForm.value;

    const startDate = new Date(Date.now() + (v.startDateOffset || 0) * 60000);
    const endDate = new Date(startDate.getTime() + (v.durationMinutes || 60) * 60000);

    const tcOption = TIME_CONTROLS.find((t) => t.value === v.timeControl);
    const generatedName = v.name || `${tcOption?.label || 'Custom'} Arena`;

    const apiPayload = {
      name: generatedName,
      status: 'upcoming',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      time_control: v.timeControl,
      duration_minutes: v.durationMinutes
    };

    this.arenaService.createMyArena(apiPayload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toastService.show('Arena Lobby created!', 'success');
        this.dialogRef.close(true);
        this.router.navigate(['/events', res.id, 'arena']);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.toastService.show(
          'Failed to create arena: ' + (err.error?.message || err.message),
          'error',
        );
      },
    });
  }
}
