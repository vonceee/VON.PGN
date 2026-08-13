import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent, ToggleComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowsRightLeft,
  heroChevronLeft,
  heroChevronRight,
  heroPencil,
  heroStop,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-ui-buttons',
  standalone: true,
  imports: [CommonModule, ButtonComponent, ToggleComponent, NgIconComponent],
  providers: [
    provideIcons({
      heroArrowsRightLeft,
      heroChevronLeft,
      heroChevronRight,
      heroPencil,
      heroStop,
    }),
  ],
  templateUrl: './ui-buttons.component.html',
})
export class UiButtonsComponent {
  isLoading = signal(false);
  isDisabled = signal(false);
}
