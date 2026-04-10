import { Component, input } from '@angular/core';

export type IconName = 'chevron-down' | 'search' | 'user' | 'close' | 'hamburger' | 'sun' | 'moon';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      [attr.fill]="fill()"
      [attr.stroke]="stroke()"
      [attr.stroke-width]="strokeWidth()"
      [class]="class()"
      xmlns="http://www.w3.org/2000/svg"
    >
      @switch (name()) {
        @case ('chevron-down') {
          <path fill-rule="evenodd" d="M5.22 8.574a.75.75 0 0 1 1.06 0L10 11.819l3.72-3.245a.75.75 0 1 1 1.04 1.084l-4.25 3.5a.75.75 0 0 1-1.04 0l-4.25-3.5a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
        }
        @case ('search') {
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        }
        @case ('close') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        }
        @case ('hamburger') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        }
        @case ('sun') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        }
        @case ('moon') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  name = input.required<IconName>();
  class = input<string>('w-5 h-5');
  viewBox = input<string>('0 0 24 24');
  fill = input<string>('none');
  stroke = input<string>('currentColor');
  strokeWidth = input<string>('2');
}
