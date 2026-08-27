import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of } from 'rxjs';
import { debounceTime, catchError, switchMap, tap } from 'rxjs/operators';
import { TournamentService } from '../../../core/services/tournament.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tournament } from '../../../core/models/tournament.model';
import { RouterLink } from '@angular/router';
import { ConfirmDeleteModalComponent } from '@shared/feedback';
import { FormsModule } from '@angular/forms';

import { provideIcons, NgIconComponent } from '@ng-icons/core';
import { heroTrophy, heroEye, heroPencilSquare, heroTrash, heroPlus } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-my-tournaments',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDeleteModalComponent, RouterLink, NgIconComponent],
  providers: [
    provideIcons({
      heroTrophy,
      heroEye,
      heroPencilSquare,
      heroTrash,
      heroPlus,
    }),
  ],
  templateUrl: './my-tournaments.component.html',
})
export class MyTournamentsComponent {
  private tournamentService = inject(TournamentService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  private refresh$ = new BehaviorSubject<void>(undefined);

  loading = signal(true);
  deleteTarget = signal<Tournament | null>(null);
  deleting = signal(false);
  searchQuery = signal('');

  filteredTournaments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.tournaments() || [];
    if (!query) return list;
    return list.filter(tournament =>
      tournament.name.toLowerCase().includes(query) ||
      (tournament.location && tournament.location.toLowerCase().includes(query)) ||
      tournament.status.toLowerCase().includes(query)
    );
  });

  tournaments = toSignal(
    this.refresh$.pipe(
      debounceTime(100),
      tap(() => this.loading.set(true)),
      switchMap(() => {
        if (!isPlatformBrowser(this.platformId)) {
          return of([] as Tournament[]);
        }
        return this.tournamentService.getMyTournaments().pipe(
          catchError(() => {
            this.toastService.show('Failed to load tournaments', 'error');
            return of([] as Tournament[]);
          })
        );
      }),
      tap(() => this.loading.set(false))
    ),
    { initialValue: [] as Tournament[] }
  );

  loadTournaments() {
    this.refresh$.next();
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

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }
}
