import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowLeft } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-back-link',
  standalone: true,
  imports: [RouterLink, NgIconComponent],
  providers: [provideIcons({ heroArrowLeft })],
  template: `
    <div class="shrink-0">
      <a
        [routerLink]="link()"
        class="group flex items-center gap-2 text-sm/6 "
      >
        <ng-icon
          name="heroArrowLeft"
          class="w-4 h-4  group-hover:-translate-x-1"
        ></ng-icon>
        {{ text() }}
      </a>
    </div>
  `,
})
export class BackLinkComponent {
  link = input<string>('/');
  text = input<string>('Back to Home');
}
