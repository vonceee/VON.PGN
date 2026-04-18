import { Component, inject, input, computed, effect, untracked } from '@angular/core';
import { PresenceService } from '../../../../core/services/presence.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="relative flex items-center justify-center" 
      [title]="isOnline() ? 'Online' : 'Offline'"
    >
      <svg
        viewBox="0 0 100 100"
        [class]="size() + ' transition-colors duration-300'"
        [class.text-cyan-400]="isOnline()"
        [class.text-slate-400]="!isOnline()"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Generic Pawn SVG -->
        <path
          fill="currentColor"
          d="M50 15c-8.3 0-15 6.7-15 15 0 5.4 2.8 10.1 7.1 12.8-5.3 2.9-8.9 8.5-8.9 14.9 0 3.3.9 6.4 2.6 9-4.7 2.1-7.8 6.9-7.8 12.3v6h44v-6c0-5.4-3.1-10.2-7.8-12.3 1.7-2.6 2.6-5.7 2.6-9 0-6.4-3.6-12-8.9-14.9 4.3-2.7 7.1-7.4 7.1-12.8.1-8.3-6.6-15-14.9-15z"
        />
        <!-- Outline for offline status visibility -->
        @if (!isOnline()) {
           <path
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            d="M50 15c-8.3 0-15 6.7-15 15 0 5.4 2.8 10.1 7.1 12.8-5.3 2.9-8.9 8.5-8.9 14.9 0 3.3.9 6.4 2.6 9-4.7 2.1-7.8 6.9-7.8 12.3v6h44v-6c0-5.4-3.1-10.2-7.8-12.3 1.7-2.6 2.6-5.7 2.6-9 0-6.4-3.6-12-8.9-14.9 4.3-2.7 7.1-7.4 7.1-12.8.1-8.3-6.6-15-14.9-15z"
            class="opacity-50"
          />
        }
      </svg>
      <!-- Subtle glow when online -->
      @if (isOnline()) {
        <div class="absolute inset-0 bg-cyan-400/20 blur-sm rounded-full -z-10 animate-pulse"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }
  `]
})
export class UserStatusIndicatorComponent {
  private presenceService = inject(PresenceService);
  userId = input.required<string | number>();
  size = input<string>('w-6 h-6');

  constructor() {
    effect(() => {
      const id = this.userId();
      if (id !== undefined && id !== null) {
        untracked(() => {
          this.presenceService.fetchPresence(String(id));
        });
      }
    });
  }

  isOnline = computed(() => {
    const id = this.userId();
    if (id === undefined || id === null) return false;
    return this.presenceService.getPresence(String(id));
  });
}
