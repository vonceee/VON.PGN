import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-list.html',
  styleUrls: ['./tournament-list.css']
})
export class TournamentListComponent {
  tournamentService = inject(TournamentService);
  tournaments = this.tournamentService.tournaments;

  deleteTournament(id: string) {
    if (confirm('Are you sure you want to delete this tournament?')) {
      this.tournamentService.tournaments.update(list => list.filter(t => t.id !== id));
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
