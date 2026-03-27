import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tournament-list.html',
  styleUrls: ['./tournament-list.css']
})
export class TournamentListComponent implements OnInit {
  tournamentService = inject(TournamentService);
  private adminService = inject(AdminService);
  tournaments = this.tournamentService.tournaments;
  loading = this.tournamentService.loading;

  ngOnInit() {
    this.tournamentService.fetchTournaments();
  }

  deleteTournament(tournament: any) {
    const id = tournament.id;
    if (confirm('Are you sure you want to delete this tournament?')) {
      this.adminService.deleteTournament(id).subscribe({
        next: () => {
          this.tournamentService.fetchTournaments();
        },
        error: (err) => {
          alert('Failed to delete tournament: ' + (err.error?.message || err.message));
        }
      });
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
