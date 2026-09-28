import { Component, ChangeDetectionStrategy, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PcapStanding } from '../../../../../core/models/pcap.model';

@Component({
  selector: 'app-pcap-admin-standing-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pcap-admin-standing-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminStandingModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly standing = model<PcapStanding | null>(null);

  readonly save = output<void>();
  readonly close = output<void>();
}
