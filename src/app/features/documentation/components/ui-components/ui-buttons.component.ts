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
  heroClipboard,
  heroCheck,
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
      heroClipboard,
      heroCheck,
    }),
  ],
  templateUrl: './ui-buttons.component.html',
})
export class UiButtonsComponent {
  isLoading = signal(false);
  isDisabled = signal(false);

  copiedPrimary = signal(false);
  copiedOutline = signal(false);

  copyToClipboard(text: string, type: 'primary' | 'outline') {
    navigator.clipboard.writeText(text);
    if (type === 'primary') {
      this.copiedPrimary.set(true);
      setTimeout(() => this.copiedPrimary.set(false), 2000);
    } else {
      this.copiedOutline.set(true);
      setTimeout(() => this.copiedOutline.set(false), 2000);
    }
  }
}
