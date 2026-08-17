import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, NgIconComponent],
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
export class UiButtonsComponent {}
