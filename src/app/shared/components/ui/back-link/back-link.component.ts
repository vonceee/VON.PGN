import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LinkComponent } from '../link/link.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowLeft } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-back-link',
  standalone: true,
  imports: [RouterLink, LinkComponent, NgIconComponent],
  providers: [provideIcons({ heroArrowLeft })],
  template: `
    <div class="shrink-0">
      <a
        appLink
        [routerLink]="link()"
        class="group flex items-center gap-2 text-sm font-medium"
      >
        <ng-icon
          name="heroArrowLeft"
          class="w-4 h-4 transition-transform group-hover:-translate-x-1"
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
