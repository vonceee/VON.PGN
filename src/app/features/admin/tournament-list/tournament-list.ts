import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../../core/services/tournament.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDeleteModalComponent } from '../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDeleteModalComponent],
  templateUrl: './tournament-list.html',
  styleUrls: ['./tournament-list.css']
})
export class TournamentListComponent implements OnInit {
  tournamentService = inject(TournamentService);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  tournaments = this.tournamentService.tournaments;
  loading = this.tournamentService.loading;

  deleteTarget = signal<any>(null);
  deleting = signal(false);

  ngOnInit() {
    this.tournamentService.fetchTournaments();
  }

  requestDelete(tournament: any) {
    this.deleteTarget.set(tournament);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.adminService.deleteTournament(target.id).subscribe({
      next: () => {
        this.toastService.show('Tournament deleted successfully', 'success');
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.tournamentService.fetchTournaments();
      },
      error: (err) => {
        this.toastService.show('Failed to delete: ' + (err.error?.message || err.message), 'error');
        this.deleting.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
