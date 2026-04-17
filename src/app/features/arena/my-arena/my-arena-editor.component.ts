import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ArenaService } from '../../../core/services/arena.service';
import { ToastService } from '../../../core/services/toast.service';
import { TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BackLinkComponent } from '../../../shared/components/back-link/back-link.component';

@Component({
  selector: 'app-my-arena-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, BackLinkComponent],
  templateUrl: './my-arena-editor.component.html',
})
export class MyArenaEditorComponent {
  private fb = inject(FormBuilder);
  private arenaService = inject(ArenaService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  
  saving = signal(false);
  timeControls = TIME_CONTROLS;

  arenaForm = this.fb.group({
    name: ['', Validators.maxLength(255)],
    timeControl: ['180+2', Validators.required],
    durationMinutes: [60, [Validators.required, Validators.min(3), Validators.max(360)]],
    startDateOffset: [10, Validators.required], // minutes from now
  });

  selectTimeControl(value: string) {
    this.arenaForm.patchValue({ timeControl: value });
  }

  confirmSave() {
    if (this.arenaForm.invalid) {
      this.toastService.show('Please complete all required fields correctly', 'error');
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
        this.toastService.show('Arena Lobby created successfully!', 'success');
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
