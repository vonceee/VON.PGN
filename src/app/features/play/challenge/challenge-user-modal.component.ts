import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent, LinkComponent } from '@shared/ui';
import { TIME_CONTROLS, TimeControlOption, ChallengeSettings } from '../../../core/models/game.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroArrowRight } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-challenge-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, LinkComponent, NgIcon],
  providers: [provideIcons({ heroXMark, heroArrowRight })],
  template: `
    <div
      class="ui-panel w-full max-w-3xl p-8 font-sans space-y-12 relative"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold flex items-center gap-2">
          Challenge <span class="text-accent">{{ data.username }}</span>
        </h2>
        <button
          (click)="dialogRef.close()"
          class="cursor-pointer p-2 hover:bg-black/5  rounded-full  flex items-center justify-center"
        >
          <ng-icon name="heroXMark" class="text-xl"></ng-icon>
        </button>
      </div>

      <div class="space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
          <!-- Color Selection -->
          <section class="space-y-6">
            <h3 class="text-sm font-semibold ">Play As</h3>
            <div class="grid grid-cols-3 gap-2">
              @for (color of colors; track color.id) {
                <button
                  appButton
                  [variant]="selectedColor() === color.id ? 'primary' : 'outline'"
                  (click)="selectedColor.set(color.id)"
                  class="py-4 text-sm "
                >
                  {{ color.label }}
                </button>
              }
            </div>
          </section>

          <!-- Time Control Selection (Compact) -->
          <section class="space-y-6">
            <h3 class="text-sm font-semibold ">Time Format</h3>
             <div class="grid grid-cols-3 gap-2">
              @for (tc of timeControls; track tc.value) {
                <button
                  appButton
                  [variant]="selectedTimeControl()?.value === tc.value ? 'primary' : 'outline'"
                  (click)="selectedTimeControl.set(tc)"
                  class="flex flex-col items-center justify-center h-10"
                >
                  <span class="text-xs ">{{ tc.label }}</span>
                </button>
              }
            </div>
          </section>
        </div>

        @if (showCustomForm()) {
            <section class="space-y-10 animate-in fade-in slide-in-from-top-2 ">
              <div class="flex justify-between items-center">
                <h3 class="text-sm  italic">Custom Setup</h3>
                <button
                  (click)="showCustomForm.set(false)"
                  class="text-sm font-semibold underline cursor-pointer bg-transparent border-none"
                >
                  Back to presets
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div class="space-y-6">
                  <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-semibold">Minutes</label>
                    <div class="flex items-center gap-3">
                      <button (click)="adjustMinutes(-1)" class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer">-</button>
                      <span class="text-xl  w-12 text-center">{{ customMinutes() }}</span>
                      <button (click)="adjustMinutes(1)" class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer">+</button>
                    </div>
                  </div>
                </div>

                <div class="space-y-6">
                  <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-semibold">Increment</label>
                    <div class="flex items-center gap-3">
                      <button (click)="adjustIncrement(-1)" class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer">-</button>
                      <span class="text-xl  w-12 text-center">{{ customIncrement() }}</span>
                      <button (click)="adjustIncrement(1)" class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer">+</button>
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
                    class="text-xs font-semibold italic"
                >
                    Custom Time Control
                </button>
            </div>
        }

        <div class="pt-6 border-t border-border-base">
          <a appLink class="text-xl font-semibold flex items-center justify-center gap-2" (click)="start()">
            Issue Challenge
            <ng-icon name="heroArrowRight" class="text-md"></ng-icon>
          </a>
        </div>
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
export class ChallengeUserModalComponent {
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
