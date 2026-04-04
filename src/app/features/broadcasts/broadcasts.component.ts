import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BroadcastService, LichessBroadcast } from '../../core/services/broadcast.service';

@Component({
  selector: 'app-broadcasts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './broadcasts.component.html',
})
export class BroadcastsComponent implements OnInit {
  private broadcastService = inject(BroadcastService);

  lichessBroadcasts = this.broadcastService.lichessBroadcasts;
  loading = this.broadcastService.loading;

  ngOnInit() {
    this.broadcastService.fetchBroadcasts();
  }
}
