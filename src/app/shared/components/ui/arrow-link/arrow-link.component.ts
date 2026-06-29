import { Component, input } from '@angular/core';
import { RouterLink, Params } from '@angular/router';
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
      [queryParams]="queryParams()"
      class="inline-flex items-center gap-2 font-medium"
    >
      {{ text() }}
      <ng-icon
        name="heroArrowRight"
        class="w-4 h-4"
      ></ng-icon>
    </a>
  `,
})
export class ArrowLinkComponent {
  link = input.required<string>();
  text = input.required<string>();
  queryParams = input<Params | null>(null);
}
