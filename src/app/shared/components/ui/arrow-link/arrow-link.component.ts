import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowRight } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-arrow-link',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ heroArrowRight })],
  template: `
    <a
      [routerLink]="link()"
      class="inline-flex items-center gap-2 font-semibold hover:text-accent  group"
    >
      {{ text() }}
      <ng-icon
        name="heroArrowRight"
        class="w-4 h-4  group-hover:translate-x-1"
      ></ng-icon>
    </a>
  `,
})
export class ArrowLinkComponent {
  link = input.required<string>();
  text = input.required<string>();
}
