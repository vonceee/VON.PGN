import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-woodpecker-explanation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './woodpecker-explanation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoodpeckerExplanationModalComponent {
  close = output<void>();

  onClose() {
    this.close.emit();
  }
}
