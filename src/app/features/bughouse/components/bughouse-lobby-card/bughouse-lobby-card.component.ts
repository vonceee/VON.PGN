import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { BughouseGameStateService } from '../../services/bughouse-game-state.service';
import { BughouseQueueService } from '../../../../core/services/bughouse-queue.service';
import { LobbyPlayer } from '../../../../core/models/bughouse.model';

/**
 * Bughouse Lobby Card Component.
 *
 * WHY: Encapsulates the squad matchmaking controls (host & teammate slots, online
 *      player search/invitation flow, and queue find/cancel actions) into a dedicated
 *      subcomponent. This eliminates prop-drilling across parent view controllers.
 */
@Component({
  selector: 'app-bughouse-lobby-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-lobby-card.component.html',
})
export class BughouseLobbyCardComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  public gameStateService = inject(BughouseGameStateService);
  public queueService = inject(BughouseQueueService);

  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]);
  isSearchingPlayers = signal<boolean>(false);
  private searchSubject = new Subject<string>();

  currentUserProfile = computed(() => {
    const user = this.authService.currentUser();
    return {
      name: user?.username || user?.displayName || user?.name || 'You',
    };
  });

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) return of(null);
          this.isSearchingPlayers.set(true);
          return this.userService.searchUsers(query);
        }),
      )
      .subscribe({
        next: (results) => {
          this.isSearchingPlayers.set(false);
          if (results !== null) {
            const myUid = this.authService.currentUser()?.uid;
            const myUsername = this.currentUserProfile().name;
            this.searchResults.set(
              results
                .filter((r: any) => r.uid !== myUid && r.username !== myUsername)
                .map((r: any) => ({
                  uid: r.uid,
                  name: r.username,
                  isOnline: true,
                  stats: r.bughouse_stats,
                })),
            );
          }
        },
        error: () => {
          this.isSearchingPlayers.set(false);
          this.searchResults.set([]);
        },
      });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
    if (value.length === 0) {
      this.searchResults.set([]);
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  onInvitePlayer(player: LobbyPlayer, event: Event) {
    event.stopPropagation();
    this.clearSearch();
    this.gameStateService.invitePlayer(player);
  }

  kickPartner() {
    this.gameStateService.kickPartner();
  }

  leaveLobby() {
    this.gameStateService.exitToLobby();
  }

  startQueue() {
    this.gameStateService.startQueue();
  }

  cancelQueue() {
    this.queueService.cancelQueue();
  }
}
