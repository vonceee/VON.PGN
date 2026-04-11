import { Component, input } from '@angular/core';

export type IconName = 'chevron-down' | 'search' | 'user' | 'close' | 'hamburger' | 'sun' | 'moon' | 'trophy' | 'arrow-right' | 'calendar' | 'video' | 'target' | 'check' | 'users' | 'timer' | 'graduation-cap' | 'external-link';

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
        @case ('trophy') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.503-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 12a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.47.617-1.47 1.45V6.304c0 1.452.351 2.058 1.47 2.225m13.5-4.293c.982.143 1.47.617 1.47 1.45V6.304c0 1.452-.351 2.058-1.47 2.225m-13.5-4.293A14.516 14.516 0 0 1 12 3c1.28 0 2.513.172 3.686.494m-9.686 0.742a14.52 14.52 0 0 1 9.686 0" />
        }
        @case ('arrow-right') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        }
        @case ('calendar') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        }
        @case ('video') {
          <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        }
        @case ('target') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        }
        @case ('check') {
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        }
        @case ('users') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        }
        @case ('timer') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        }
        @case ('graduation-cap') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.174L12 14.5l7.74-4.326M12 3L2.25 8.25l9.75 5.25 9.75-5.25L12 3zm0 18.75v-6.375" />
        }
        @case ('external-link') {
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
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
