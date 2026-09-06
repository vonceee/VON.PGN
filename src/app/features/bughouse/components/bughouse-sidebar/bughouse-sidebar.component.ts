import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseGameOverState } from '../../../../core/models/bughouse.model';

@Component({
  selector: 'app-bughouse-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-sidebar.component.html',
})
export class BughouseSidebarComponent {
  // Inputs
  isHost = input.required<boolean>();
  gameOverState = input.required<BughouseGameOverState>();

  // Outputs
  offerRematch = output<void>();
  declineRematch = output<void>();
  startQueue = output<void>();
  resign = output<void>();
  offerDraw = output<void>();
  backToLobby = output<void>();
}
