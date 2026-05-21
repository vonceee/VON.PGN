import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '@shared/ui';
import { TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';

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
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './computer-setup-modal.component.html',
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
  colors = [
    { id: 'white', label: 'White', bg: 'white' },
    { id: 'random', label: 'Random', bg: 'linear-gradient(135deg, white 50%, black 50%)' },
    { id: 'black', label: 'Black', bg: 'black' },
  ] as const;

  selectedLevel = signal(1);
  selectedTimeControl = signal<TimeControlOption | null>(TIME_CONTROLS[5]);
  selectedColor = signal<'white' | 'black' | 'random'>('random');
  isDropdownOpen = signal(false);

  start() {
    this.dialogRef.close({
      level: this.selectedLevel(),
      timeControl: this.selectedTimeControl(),
      color: this.selectedColor(),
      useCustom: false,
    });
  }
}
