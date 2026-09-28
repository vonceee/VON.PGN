import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pcap-admin-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pcap-admin-delete-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminDeleteModalComponent {
  readonly item = input<{ type: 'team' | 'match'; id: string; name: string } | null>(null);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
