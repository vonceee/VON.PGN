import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDeleteModalComponent } from '../../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule, ConfirmDeleteModalComponent, ButtonComponent],
  templateUrl: './tournament-list.html',
  styleUrls: ['./tournament-list.css']
})
export class TournamentListComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  tournaments = signal<any[]>([]);
  loading = signal(true);

  deleteTarget = signal<any>(null);
  deleting = signal(false);

  ngOnInit() {
    this.loadTournaments();
  }

  private loadTournaments() {
    this.loading.set(true);
    this.adminService.getTournaments().subscribe({
      next: (res) => {
        this.tournaments.set(res.data || res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastService.show('Failed to load tournaments: ' + (err.error?.message || err.message), 'error');
        this.loading.set(false);
      }
    });
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
        this.loadTournaments();
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
