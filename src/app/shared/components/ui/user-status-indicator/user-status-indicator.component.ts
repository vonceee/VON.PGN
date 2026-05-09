import { Component, inject, input, computed, effect, untracked } from '@angular/core';
import { PresenceService } from '../../../../core/services/presence.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center shrink-0" [title]="isOnline() ? 'Online' : 'Offline'">
      <div
        class="px-1.5 py-0.5 rounded border text-xs  uppercase"
        [class.text-cyan-400]="isOnline()"
        [class.border-cyan-500]="isOnline()"
        [class.text-slate-500]="!isOnline()"
        [class.border-slate-500]="!isOnline()"
      >
        {{ isOnline() ? 'Online' : 'Offline' }}
      </div>
    </div>
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
