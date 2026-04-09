import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BroadcastService, LichessBroadcast } from '../../core/services/broadcast.service';

@Component({
  selector: 'app-broadcasts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './broadcasts.component.html',
})
export class BroadcastsComponent implements OnInit {
  private broadcastService = inject(BroadcastService);
  private router = inject(Router);

  broadcasts = this.broadcastService.broadcasts;
  loading = this.broadcastService.loading;
  error = this.broadcastService.error;

  ngOnInit() {
    this.broadcastService.fetchBroadcasts();
  }

  selectBroadcast(broadcast: LichessBroadcast): void {
    this.router.navigate(['/broadcasts', broadcast.id]);
  }
}


