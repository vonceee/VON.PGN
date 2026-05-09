import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (count() > 0) {
      <span
        class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-accent text-white text-xs font-semibold border-2 border-main shadow-sm animate-in zoom-in duration-200"
      >
        {{ count() > 99 ? '99+' : count() }}
      </span>
    }
  `,
  host: {
    class: 'relative inline-flex'
  }
})
export class NotificationBadgeComponent {
  count = input<number>(0);
}
