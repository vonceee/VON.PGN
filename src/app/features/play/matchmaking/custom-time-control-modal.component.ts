import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '@shared/ui';

export interface CustomTimeControlResult {
  minutes: number;
  increment: number;
}

@Component({
  selector: 'app-custom-time-control-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="ui-panel w-full max-w-xl p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-4xl text-content">Custom time control</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Minutes Selection -->
        <section class="space-y-3">
          <label class="text-sm font-medium text-muted">Minutes</label>
          <input
            type="number"
            min="1"
            max="180"
            [ngModel]="customMinutes()"
            (ngModelChange)="customMinutes.set($event)"
            class="w-full py-2 bg-transparent border-b-2 border-border-base outline-none focus:border-accent text-center text-2xl font-medium text-content transition-colors"
          />
        </section>

        <!-- Increment Selection -->
        <section class="space-y-3">
          <label class="text-sm font-medium text-muted">Increment</label>
          <input
            type="number"
            min="0"
            max="60"
            [ngModel]="customIncrement()"
            (ngModelChange)="customIncrement.set($event)"
            class="w-full py-2 bg-transparent border-b-2 border-border-base outline-none focus:border-accent text-center text-2xl font-medium text-content transition-colors"
          />
        </section>
      </div>

      <div class="pt-4 flex gap-4 w-full">
        <button
          appButton
          (click)="dialogRef.close()"
          class="flex-1"
        >
          <span>Cancel</span>
        </button>
        <button
          appButton
          variant="primary"
          class="flex-1"
          (click)="confirm()"
        >
          <span>Find opponent</span>
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

  customMinutes = signal(10);
  customIncrement = signal(0);

  confirm() {
    this.dialogRef.close({
      minutes: Number(this.customMinutes()),
      increment: Number(this.customIncrement())
    });
  }
}
