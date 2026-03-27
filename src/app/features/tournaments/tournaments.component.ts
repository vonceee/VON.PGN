import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { TournamentStatus } from '../../core/models/tournament.model';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tournaments.component.html'
})
export class TournamentsComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  tournaments = this.tournamentService.tournaments;
  loading = this.tournamentService.loading;
  error = this.tournamentService.error;

  activeTab = signal<TournamentStatus>('upcoming');

  filteredTournaments = computed(() =>
    this.tournaments().filter(t => t.status === this.activeTab())
  );

  upcomingCount = computed(() => this.tournaments().filter(t => t.status === 'upcoming').length);
  ongoingCount = computed(() => this.tournaments().filter(t => t.status === 'ongoing').length);
  pastCount = computed(() => this.tournaments().filter(t => t.status === 'past').length);

  ngOnInit() {
    this.tournamentService.fetchTournaments();
  }

  setTab(tab: TournamentStatus) {
    this.activeTab.set(tab);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
