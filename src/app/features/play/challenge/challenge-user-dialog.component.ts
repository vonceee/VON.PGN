import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '@shared/ui';
import { TIME_CONTROLS, TimeControlOption, ChallengeSettings } from '../../../core/models/game.model';

@Component({
  selector: 'app-challenge-user-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl shadow-xl w-full p-8 font-sans space-y-8 relative">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl">
          Send challenge
        </h2>
        <button
          (click)="dialogRef.close()"
          class="cursor-pointer p-2 hover:bg-subtle/50 rounded-full flex items-center justify-center text-muted hover:text-content transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body Content -->
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-6">
          <!-- Color Selection -->
          <section class="space-y-3">
            <h3 class="text-sm font-semibold text-content ml-1">Play As</h3>
            <div class="grid grid-cols-3 gap-2">
              @for (color of colors; track color.id) {
                <button
                  appButton
                  [variant]="selectedColor() === color.id ? 'primary' : 'outline'"
                  (click)="selectedColor.set(color.id)"
                  class="py-3 text-sm"
                >
                  {{ color.label }}
                </button>
              }
            </div>
          </section>

          <!-- Time Control Selection (Compact) -->
          <section class="space-y-3">
            <h3 class="text-sm font-semibold text-content ml-1">Time Format</h3>
            <div class="grid grid-cols-3 gap-2">
              @for (tc of timeControls; track tc.value) {
                <button
                  appButton
                  [variant]="selectedTimeControl()?.value === tc.value ? 'primary' : 'outline'"
                  (click)="selectedTimeControl.set(tc)"
                  class="flex flex-col items-center justify-center h-12"
                >
                  <span class="text-sm font-semibold">{{ tc.label }}</span>
                </button>
              }
            </div>
          </section>
        </div>

        @if (showCustomForm()) {
          <section class="space-y-6 pt-4 border-t border-border-base/50">
            <div class="flex justify-between items-center">
              <h3 class="text-sm font-semibold text-accent ml-1">Custom Setup</h3>
              <button
                (click)="showCustomForm.set(false)"
                class="text-xs font-semibold underline cursor-pointer bg-transparent border-none text-muted hover:text-content"
              >
                Back to presets
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-semibold text-muted ml-1">Minutes</label>
                  <div class="flex items-center gap-3">
                    <button (click)="adjustMinutes(-1)" class="w-8 h-8 flex items-center justify-center border border-border-base rounded-lg hover:bg-subtle cursor-pointer text-content font-bold">-</button>
                    <span class="text-lg font-semibold w-12 text-center text-content">{{ customMinutes() }}</span>
                    <button (click)="adjustMinutes(1)" class="w-8 h-8 flex items-center justify-center border border-border-base rounded-lg hover:bg-subtle cursor-pointer text-content font-bold">+</button>
                  </div>
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-semibold text-muted ml-1">Increment</label>
                  <div class="flex items-center gap-3">
                    <button (click)="adjustIncrement(-1)" class="w-8 h-8 flex items-center justify-center border border-border-base rounded-lg hover:bg-subtle cursor-pointer text-content font-bold">-</button>
                    <span class="text-lg font-semibold w-12 text-center text-content">{{ customIncrement() }}</span>
                    <button (click)="adjustIncrement(1)" class="w-8 h-8 flex items-center justify-center border border-border-base rounded-lg hover:bg-subtle cursor-pointer text-content font-bold">+</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        } @else {
          <div class="flex justify-center">
            <button
              appButton
              variant="outline"
              (click)="showCustomForm.set(true)"
            >
              Custom Time Control
            </button>
          </div>
        }
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 w-full">
        <button appButton variant="outline" (click)="dialogRef.close()" class="flex-1 py-3">
          Cancel
        </button>
        <button appButton variant="primary" (click)="start()" class="flex-1 py-3 flex items-center justify-center gap-2">
          <span>Issue challenge</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ChallengeUserDialogComponent {
  dialogRef = inject(DialogRef<ChallengeSettings>);
  data = inject(DIALOG_DATA) as { username: string };

  timeControls = TIME_CONTROLS;
  colors = [
    { id: 'white', label: 'White' },
    { id: 'random', label: 'Random' },
    { id: 'black', label: 'Black' },
  ] as const;

  selectedTimeControl = signal<TimeControlOption | null>(TIME_CONTROLS[3]); // 3+0 default
  selectedColor = signal<'white' | 'black' | 'random'>('random');
  showCustomForm = signal(false);
  customMinutes = signal(10);
  customIncrement = signal(0);

  constructor() {
    this.dialogRef.updateSize('480px');
  }

  adjustMinutes(delta: number) {
    this.customMinutes.set(Math.max(1, Math.min(180, this.customMinutes() + delta)));
  }

  adjustIncrement(delta: number) {
    this.customIncrement.set(Math.max(0, Math.min(60, this.customIncrement() + delta)));
  }

  start() {
    const timeControl = this.showCustomForm()
      ? `${this.customMinutes() * 60}+${this.customIncrement()}`
      : this.selectedTimeControl()?.value || '180+0';

    this.dialogRef.close({
      timeControl,
      color: this.selectedColor(),
    });
  }
}
