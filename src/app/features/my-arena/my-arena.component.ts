import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { ToastService } from '../../core/services/toast.service';
import { Tournament } from '../../core/models/tournament.model';
import { ConfirmDeleteModalComponent } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-my-arena',
  standalone: true,
  imports: [CommonModule, ConfirmDeleteModalComponent, ButtonComponent],
  templateUrl: './my-arena.component.html',
})
export class MyArenaComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  private toastService = inject(ToastService);

  allTournaments = signal<Tournament[]>([]);
  arenas = computed(() => this.allTournaments().filter(t => t.format === 'Arena'));
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
        this.allTournaments.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastService.show('Failed to load arenas', 'error');
        this.loading.set(false);
      }
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
        this.toastService.show('Arena deleted', 'success');
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.loadTournaments();
      },
      error: () => {
        this.toastService.show('Failed to delete arena', 'error');
        this.deleting.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
