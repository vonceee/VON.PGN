import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  template: `
    <h2 class="text-3xl md:text-5xl mb-4 md:mb-6 leading-tight font-normal">
      {{ text() }} <span class="text-cyan-400">{{ highlight() }}</span>
    </h2>
  `,
})
export class SectionHeadingComponent {
  text = input.required<string>();
  highlight = input.required<string>();
}
