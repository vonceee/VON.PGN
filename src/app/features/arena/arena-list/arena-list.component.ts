import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';
import { AuthService } from '../../../core/services/auth.service';
import { Tournament } from '../../../core/models/tournament.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-arena-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './arena-list.component.html',
  styleUrls: ['./arena-list.component.css']
})
export class ArenaListComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  authService = inject(AuthService);

  loading = this.tournamentService.loading;
  
  ongoingArenas = computed(() => 
    this.tournamentService.tournaments().filter(t => t.format === 'Arena' && t.status === 'ongoing')
  );

  upcomingArenas = computed(() => 
    this.tournamentService.tournaments().filter(t => t.format === 'Arena' && t.status === 'upcoming')
  );

  pastArenas = computed(() => 
    this.tournamentService.tournaments().filter(t => t.format === 'Arena' && t.status === 'past')
  );

  ngOnInit() {
    this.tournamentService.fetchTournaments();
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
