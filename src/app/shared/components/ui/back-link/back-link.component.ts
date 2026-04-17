import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-back-link',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div>
      <a
        [routerLink]="link()"
        class="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 transition-transform group-hover:-translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {{ text() }}
      </a>
    </div>
  `,
})
export class BackLinkComponent {
  link = input<string>('/');
  text = input<string>('Back to Home');
}
