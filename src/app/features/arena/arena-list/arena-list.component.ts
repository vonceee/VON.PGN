import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ArenaService } from '../../../core/services/arena.service';
import { AuthService } from '../../../core/services/auth.service';
import { Arena } from '../../../core/models/arena.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { tap } from 'rxjs';

@Component({
  selector: 'app-arena-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './arena-list.component.html',
  styleUrls: ['./arena-list.component.css']
})
export class ArenaListComponent implements OnInit {
  public arenaService = inject(ArenaService);
  authService = inject(AuthService);

  loading = signal(true);

  ongoingArenas = computed(() => 
    this.arenaService.arenas().filter(t => t.status === 'ongoing')
  );

  upcomingArenas = computed(() => 
    this.arenaService.arenas().filter(t => t.status === 'upcoming')
  );

  pastArenas = computed(() => 
    this.arenaService.arenas().filter(t => t.status === 'past')
  );

  ngOnInit() {
    this.arenaService.fetchArenas().subscribe(() => {
      this.loading.set(false);
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
