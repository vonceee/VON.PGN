import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent, LinkComponent } from '@shared/ui';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroArrowRight } from '@ng-icons/heroicons/outline';

export interface CustomTimeControlResult {
  minutes: number;
  increment: number;
}

@Component({
  selector: 'app-custom-time-control-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, NgIcon],
  providers: [provideIcons({ heroXMark, heroArrowRight })],
  template: `
    <div class="ui-panel w-full max-w-2xl p-8 font-sans space-y-10 relative">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h2 class="text-2xl font-black uppercase italic tracking-tighter">Custom Time Control</h2>
          <p class="text-xs font-bold text-muted-foreground uppercase tracking-widest">Setup your preferred format</p>
        </div>
        <button
          (click)="dialogRef.close()"
          class="cursor-pointer p-2 hover:bg-black/5  rounded-full transition-colors flex items-center justify-center"
        >
          <ng-icon name="heroXMark" class="text-xl"></ng-icon>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <!-- Minutes Selection -->
        <section class="space-y-6">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-black uppercase tracking-widest text-muted-foreground">Minutes</h3>
            <div class="flex items-center gap-4">
              <button
                (click)="adjustMinutes(-1)"
                class="w-10 h-10 flex items-center justify-center border border-border-base rounded-xl hover:bg-accent/10 transition-colors cursor-pointer text-xl font-bold"
              >
                -
              </button>
              <span class="text-3xl font-black min-w-[3rem] text-center italic">{{ customMinutes() }}</span>
              <button
                (click)="adjustMinutes(1)"
                class="w-10 h-10 flex items-center justify-center border border-border-base rounded-xl hover:bg-accent/10 transition-colors cursor-pointer text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-4 gap-2">
            @for (min of minutePresets; track min) {
              <button
                appButton
                [variant]="customMinutes() === min ? 'primary' : 'outline'"
                (click)="customMinutes.set(min)"
                class="h-10 text-xs font-black"
              >
                {{ min }}
              </button>
            }
          </div>
        </section>

        <!-- Increment Selection -->
        <section class="space-y-6">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-black uppercase tracking-widest text-muted-foreground">Increment</h3>
            <div class="flex items-center gap-4">
              <button
                (click)="adjustIncrement(-1)"
                class="w-10 h-10 flex items-center justify-center border border-border-base rounded-xl hover:bg-accent/10 transition-colors cursor-pointer text-xl font-bold"
              >
                -
              </button>
              <span class="text-3xl font-black min-w-[3rem] text-center italic">{{ customIncrement() }}</span>
              <button
                (click)="adjustIncrement(1)"
                class="w-10 h-10 flex items-center justify-center border border-border-base rounded-xl hover:bg-accent/10 transition-colors cursor-pointer text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2">
            @for (inc of incrementPresets; track inc) {
              <button
                appButton
                [variant]="customIncrement() === inc ? 'primary' : 'outline'"
                (click)="customIncrement.set(inc)"
                class="h-10 text-xs font-black"
              >
                {{ inc }}
              </button>
            }
          </div>
        </section>
      </div>

      <div class="pt-4">
        <button
          appButton
          variant="primary"
          class="w-full py-6 text-lg font-black uppercase tracking-widest italic group"
          (click)="confirm()"
        >
          Find Opponent
          <ng-icon name="heroArrowRight" class="ml-2 transition-transform group-hover:translate-x-1"></ng-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CustomTimeControlModalComponent {
  dialogRef = inject(DialogRef<CustomTimeControlResult>);

  minutePresets = [1, 3, 5, 10, 15, 30, 60, 90];
  incrementPresets = [0, 1, 2, 3, 5, 10, 15, 30];

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

  confirm() {
    this.dialogRef.close({
      minutes: this.customMinutes(),
      increment: this.customIncrement()
    });
  }
}
