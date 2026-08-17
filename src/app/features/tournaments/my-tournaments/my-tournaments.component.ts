import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentService } from '../../../core/services/tournament.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tournament } from '../../../core/models/tournament.model';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/ui';
import { ConfirmDeleteModalComponent } from '@shared/feedback';
import { FormsModule } from '@angular/forms';

import { provideIcons } from '@ng-icons/core';
import { heroTrophy } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-my-tournaments',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDeleteModalComponent, ButtonComponent, RouterLink],
  providers: [
    provideIcons({
      heroTrophy,
    }),
  ],
  templateUrl: './my-tournaments.component.html',
})
export class MyTournamentsComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  private toastService = inject(ToastService);

  tournaments = signal<Tournament[]>([]);
  loading = signal(true);

  deleteTarget = signal<Tournament | null>(null);
  deleting = signal(false);

  ngOnInit() {
    this.loadTournaments();
  }

  private loadTournaments() {
    this.loading.set(true);
    this.tournamentService.getMyTournaments().subscribe({
      next: (data) => {
        this.tournaments.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastService.show('Failed to load tournaments', 'error');
        this.loading.set(false);
      },
    });
  }

  requestDelete(tournament: Tournament) {
    this.deleteTarget.set(tournament);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.tournamentService.deleteMyTournament(target.id).subscribe({
      next: () => {
        this.toastService.show('Tournament deleted', 'success');
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.loadTournaments();
      },
      error: () => {
        this.toastService.show('Failed to delete tournament', 'error');
        this.deleting.set(false);
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

