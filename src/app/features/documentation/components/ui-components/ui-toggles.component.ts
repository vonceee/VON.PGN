import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToggleComponent } from '@shared/ui';

@Component({
  selector: 'app-ui-toggles',
  standalone: true,
  imports: [CommonModule, ToggleComponent],
  templateUrl: './ui-toggles.component.html',
})
export class UiTogglesComponent {
  isToggleActive = signal(false);
}
