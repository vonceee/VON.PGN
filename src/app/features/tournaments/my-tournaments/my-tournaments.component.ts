import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of } from 'rxjs';
import { debounceTime, catchError, switchMap, tap } from 'rxjs/operators';
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
export class MyTournamentsComponent {
  private tournamentService = inject(TournamentService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  private refresh$ = new BehaviorSubject<void>(undefined);

  loading = signal(true);
  deleteTarget = signal<Tournament | null>(null);
  deleting = signal(false);

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
}
