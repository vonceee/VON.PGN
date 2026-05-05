import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="bg-cyan-500 text-slate-900 text-xs font-black uppercase px-2 py-0.5 rounded-full tracking-wider group-hover:bg-slate-900 group-hover:text-cyan-400 inline-flex items-center justify-center transition-colors {{ customClass() }}"
    >
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  customClass = input<string>('');
}
