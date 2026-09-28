import { Component, ChangeDetectionStrategy, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PgnEditingBoardData {
  boardNumber: number;
  roleLabel: string;
  playerA: string;
  playerB: string;
  blitzPgn: string;
  rapidPgn: string;
}

@Component({
  selector: 'app-pcap-admin-pgn-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pcap-admin-pgn-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminPgnModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly boardData = model<PgnEditingBoardData | null>(null);

  readonly save = output<void>();
  readonly close = output<void>();
  readonly fileSelected = output<{ event: Event; type: 'blitz' | 'rapid' }>();
}
