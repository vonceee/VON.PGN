import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent, LinkComponent } from '@shared/ui';
import { TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroArrowRight } from '@ng-icons/heroicons/outline';

export interface ComputerSetupResult {
  level: number;
  timeControl: TimeControlOption | null;
  color: 'white' | 'black' | 'random';
  customMinutes?: number;
  customIncrement?: number;
  useCustom: boolean;
}

@Component({
  selector: 'app-computer-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, LinkComponent, NgIcon],
  providers: [provideIcons({ heroXMark, heroArrowRight })],
  template: `
    <div
      class="ui-panel w-full max-w-3xl p-8 font-sans space-y-12 relative"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">Play with computer</h2>
        <button
          (click)="dialogRef.close()"
          class="cursor-pointer p-2 hover:bg-black/5  rounded-full  flex items-center justify-center"
        >
          <ng-icon name="heroXMark" class="text-xl"></ng-icon>
        </button>
      </div>

      <div class="space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
          <!-- Level Selection -->
          <section class="space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold  truncate">Difficulty Level</h3>
            </div>
            <div class="grid grid-cols-4 gap-2">
              @for (lvl of levels; track lvl) {
                <button
                  appButton
                  [variant]="selectedLevel() === lvl ? 'primary' : 'outline'"
                  (click)="selectedLevel.set(lvl)"
                  class="h-10 text-sm font-bold"
                >
                  {{ lvl }}
                </button>
              }
            </div>
          </section>

          <!-- Color Selection -->
          <section class="space-y-6">
            <h3 class="text-sm font-bold ">Play As</h3>
            <div class="grid grid-cols-3 gap-2">
              @for (color of colors; track color.id) {
                <button
                  appButton
                  [variant]="selectedColor() === color.id ? 'primary' : 'outline'"
                  (click)="selectedColor.set(color.id)"
                  class="py-4 text-sm font-black"
                >
                  {{ color.label }}
                </button>
              }
            </div>
          </section>
        </div>

        <!-- Time Control Selection -->
        <section class="space-y-6">
          <h3 class="text-sm font-bold ">Time Format</h3>
          @if (!showCustomForm()) {
            <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
              @for (tc of timeControls; track tc.value) {
                <button
                  appButton
                  [variant]="selectedTimeControl()?.value === tc.value ? 'primary' : 'outline'"
                  (click)="selectedTimeControl.set(tc)"
                  class="flex flex-col items-center justify-center"
                >
                  <span class="text-sm font-black">{{ tc.label }}</span>
                </button>
              }
              <button
                appButton
                variant="outline"
                (click)="showCustomForm.set(true)"
                class="flex flex-col items-center justify-center"
              >
                <span class="text-sm font-bold italic">Custom</span>
              </button>
            </div>
          } @else {
            <div class="space-y-10">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-black italic">Custom Setup</h3>
                <button
                  (click)="showCustomForm.set(false)"
                  class="text-sm font-bold underline cursor-pointer bg-transparent border-none"
                >
                  Back to presets
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <!-- Minutes Selection -->
                <div class="space-y-6">
                  <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-bold">Minutes</label>
                    <div class="flex items-center gap-3">
                      <button
                        (click)="adjustMinutes(-1)"
                        class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer"
                      >
                        -
                      </button>
                      <span class="text-xl font-black  w-12 text-center">{{
                        customMinutes()
                      }}</span>
                      <button
                        (click)="adjustMinutes(1)"
                        class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-4 gap-2">
                    @for (min of minutePresets; track min) {
                      <button
                        (click)="customMinutes.set(min)"
                        [class.bg-cyan-500]="customMinutes() === min"
                        [class.text-slate-900]="customMinutes() === min"
                        [class.border-cyan-500]="customMinutes() === min"
                        [class.bg-transparent]="customMinutes() !== min"
                        [class.border-border-theme]="customMinutes() !== min"
                        class="h-8 text-xs font-bold border rounded-lg cursor-pointer  hover:bg-cyan-500/10"
                      >
                        {{ min }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Increment Selection -->
                <div class="space-y-6">
                  <div class="flex justify-between items-center mb-2">
                    <label class="text-sm font-bold">Increment</label>
                    <div class="flex items-center gap-3">
                      <button
                        (click)="adjustIncrement(-1)"
                        class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer"
                      >
                        -
                      </button>
                      <span class="text-xl font-black  w-12 text-center">{{
                        customIncrement()
                      }}</span>
                      <button
                        (click)="adjustIncrement(1)"
                        class="w-8 h-8 flex items-center justify-center border border-border-theme rounded-lg hover:bg-black/5  cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-4 gap-2">
                    @for (inc of incrementPresets; track inc) {
                      <button
                        (click)="customIncrement.set(inc)"
                        [class.bg-cyan-500]="customIncrement() === inc"
                        [class.text-slate-900]="customIncrement() === inc"
                        [class.border-cyan-500]="customIncrement() === inc"
                        [class.bg-transparent]="customIncrement() !== inc"
                        [class.border-border-theme]="customIncrement() !== inc"
                        class="h-8 text-xs font-bold border rounded-lg cursor-pointer  hover:bg-cyan-500/10"
                      >
                        {{ inc }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </section>

        <div>
          <a appLink class="text-xl font-semibold flex items-center gap-2" (click)="start()">
            Start challenge
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
export class ComputerSetupModalComponent {
  dialogRef = inject(DialogRef<ComputerSetupResult>);

  levels = [1, 2, 3, 4, 5, 6, 7, 8];
  timeControls = TIME_CONTROLS;
  minutePresets = [1, 3, 5, 10, 15, 30, 60, 90];
  incrementPresets = [0, 1, 2, 3, 5, 10, 15, 30];
  colors = [
    { id: 'white', label: 'White', bg: 'white' },
    { id: 'random', label: 'Random', bg: 'linear-gradient(135deg, white 50%, black 50%)' },
    { id: 'black', label: 'Black', bg: 'black' },
  ] as const;

  selectedLevel = signal(1);
  selectedTimeControl = signal<TimeControlOption | null>(TIME_CONTROLS[5]);
  selectedColor = signal<'white' | 'black' | 'random'>('random');
  showCustomForm = signal(false);
  customMinutes = signal(10);
  customIncrement = signal(0);

  adjustMinutes(delta: number) {
    const newVal = Math.max(1, Math.min(180, this.customMinutes() + delta));
    this.customMinutes.set(newVal);
  }

  adjustIncrement(delta: number) {
    const newVal = Math.max(0, Math.min(60, this.customIncrement() + delta));
    this.customIncrement.set(newVal);
  }

  start() {
    this.dialogRef.close({
      level: this.selectedLevel(),
      timeControl: this.selectedTimeControl(),
      color: this.selectedColor(),
      customMinutes: this.customMinutes(),
      customIncrement: this.customIncrement(),
      useCustom: this.showCustomForm(),
    });
  }
}
