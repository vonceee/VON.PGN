import { Component, inject, input, computed, effect, untracked } from '@angular/core';
import { PresenceService } from '../../../../core/services/presence.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="w-2.5 h-2.5 rounded-full shrink-0"
      [class.bg-green-500]="isOnline()"
      [class.bg-muted/30]="!isOnline()"
      [title]="isOnline() ? 'Online' : 'Offline'"
    ></div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        vertical-align: middle;
      }
    `,
  ],
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
