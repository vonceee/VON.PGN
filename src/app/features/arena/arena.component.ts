import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArenaService, ArenaParticipant } from '../../core/services/arena.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './arena.component.html',
  styleUrl: './arena.component.css',
})
export class ArenaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public arenaService = inject(ArenaService);
  public authService = inject(AuthService);
  private gameService = inject(GameService);

  arenaId = signal<string | null>(null);

  // Computed properties for UI
  leaderboard = this.arenaService.leaderboard;
  isWaiting = this.arenaService.isWaiting;
  countdown = this.arenaService.countdown;

  myRank = computed(() => {
    const userId = this.authService.currentUser()?.uid;
    return this.leaderboard().findIndex((p) => p.userId === userId) + 1;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.arenaId.set(id);
      this.connectAndJoin();
    }
  }

  ngOnDestroy(): void {
    // We don't necessarily leave the arena on destroy if we are just playing a game
    // butt we should stop pairing if we navigate away from tournaments entirely
  }

  private connectAndJoin() {
    const user = this.authService.currentUser();
    if (user && this.arenaId()) {
      // Ensure socket is connected
      this.gameService.connectSocket();

      // Delay slightly to ensure socket is ready
      setTimeout(() => {
        this.arenaService.joinArena(
          this.arenaId()!,
          user.username || 'Player',
          1500, // TODO: Get actual rating
        );
      }, 500);
    }
  }

  toggleJoin() {
    if (this.isWaiting()) {
      this.arenaService.stopPairing();
    } else {
      this.arenaService.startPairing();
    }
  }

  getFireLevel(streak: number): number {
    if (streak >= 4) return 2;
    if (streak >= 2) return 1;
    return 0;
  }
}
