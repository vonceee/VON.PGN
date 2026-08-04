import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-docs-account-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="text-3xl font-semibold mb-6 border-b border-border-base pb-4">
      Account Management
    </h2>
    <div class="prose prose-slate max-w-none text-muted">
      <p class="text-lg leading-relaxed mb-6">
        Manage your personal settings, customize board styling, and understand how user profile metrics are
        tracked on vonchess.
      </p>

      <div class="p-6 rounded-2xl bg-white border border-border-base mb-8">
        <h3 class="text-xl font-semibold text-content mb-4">Board customization</h3>
        <p class="text-sm leading-relaxed text-muted mb-4">
          We believe a player should feel comfortable. In your profile settings, you can customize your interface
          with standard board patterns and high-contrast styling tokens.
        </p>

        <h3 class="text-xl font-semibold text-content mb-4">Rating variants</h3>
        <p class="text-sm leading-relaxed text-muted">
          Your rating updates dynamically based on the game speed:
        </p>
        <ul class="list-disc pl-6 text-sm text-muted mt-2 space-y-1">
          <li><strong>Bullet</strong>: Game duration under 3 minutes per player.</li>
          <li><strong>Blitz</strong>: Game duration between 3 and 10 minutes per player.</li>
          <li><strong>Rapid</strong>: Game duration over 10 minutes per player.</li>
        </ul>
      </div>
    </div>
  `
})
export class AccountManagementComponent {}
