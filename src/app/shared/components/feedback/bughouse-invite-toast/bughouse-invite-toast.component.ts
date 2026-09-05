import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseInviteService } from '../../../../core/services/bughouse-invite.service';

/**
 * BughouseInviteToastComponent
 * 
 * Floating toast notification displayed when an incoming Bughouse invitation is received.
 * Replaces the legacy header inbox dropdown with an interactive, dismissible toast.
 */
@Component({
  selector: 'app-bughouse-invite-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bughouse-invite-toast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BughouseInviteToastComponent {
  protected inviteService = inject(BughouseInviteService);

  onAccept(lobbyId: string): void {
    this.inviteService.acceptInvite(lobbyId);
  }

  onDecline(lobbyId: string): void {
    this.inviteService.rejectInvite(lobbyId);
  }

  onDismiss(lobbyId: string): void {
    this.inviteService.dismissInvite(lobbyId);
  }
}
