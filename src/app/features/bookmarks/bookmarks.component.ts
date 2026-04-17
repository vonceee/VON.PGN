import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Tournament } from '../../core/models/tournament.model';
import { ButtonComponent  } from '@shared/ui';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './bookmarks.component.html',
})
export class BookmarksComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  tournaments = signal<Tournament[]>([]);
  loading = signal(true);
  removingId = signal<string | null>(null);

  ngOnInit() {
    this.loadBookmarks();
  }

  private loadBookmarks() {
    this.loading.set(true);
    this.tournamentService.getBookmarkedTournaments().subscribe({
      next: (data) => {
        this.tournaments.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load bookmarks', 'error');
        this.loading.set(false);
      }
    });
  }

  removeBookmark(tournament: Tournament) {
    if (this.removingId()) return;

    this.removingId.set(tournament.id);
    this.tournamentService.toggleBookmark(tournament.id).subscribe({
      next: () => {
        this.tournaments.update(list => list.filter(t => t.id !== tournament.id));
        this.removingId.set(null);
        this.toastService.show('Bookmark removed', 'success');
      },
      error: () => {
        this.removingId.set(null);
        this.toastService.show('Failed to remove bookmark', 'error');
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

