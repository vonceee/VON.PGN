import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 [class]="size()" class=" font-normal">
      {{ text() }} <span class="text-cyan-400">{{ highlight() }}</span>
    </h2>
  `,
})
export class SectionHeadingComponent {
  text = input.required<string>();
  highlight = input.required<string>();
  size = input<string>('text-3xl font-bold mb-4');
}
