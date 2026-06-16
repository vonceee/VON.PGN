import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="bg-accent  text-xs  uppercase px-2 py-0.5 rounded-full  group-hover:bg-content group-hover:text-white inline-flex items-center justify-center  {{ customClass() }}"
    >
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  customClass = input<string>('');
}
