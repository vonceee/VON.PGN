import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../../core/services/game.service';
import { TIME_CONTROLS, TimeControlOption, GameSeek } from '../../../core/models/game.model';
import { SeekBoardComponent } from '../../../shared/components/seek-board/seek-board.component';
import { ServerMaintenanceComponent } from '../../../shared/components/server-maintenance/server-maintenance.component';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [SeekBoardComponent, ServerMaintenanceComponent],
  templateUrl: './matchmaking.component.html',
})
export class MatchmakingComponent implements OnInit, OnDestroy {
  gameService = inject(GameService);
  private router = inject(Router);

  selectedTimeControl = this.gameService.searchTimeControl
    ? () => TIME_CONTROLS.find((tc) => tc.value === this.gameService.searchTimeControl())
    : () => undefined;

  activeGameId = () => {
    const g = this.gameService.gameState();
    return g && g.status === 'active' ? g.id : null;
  };

  isServiceMaintenance = () => this.gameService.isServiceMaintenance();

  categories = [
    { key: 'bullet', label: 'Bullet', controls: TIME_CONTROLS.filter((tc) => tc.category === 'bullet') },
    { key: 'blitz', label: 'Blitz', controls: TIME_CONTROLS.filter((tc) => tc.category === 'blitz') },
    { key: 'rapid', label: 'Rapid', controls: TIME_CONTROLS.filter((tc) => tc.category === 'rapid') },
  ];

  ngOnInit(): void {
    this.gameService.checkActiveGame();
  }

  ngOnDestroy(): void {
    // Don't cancel search on destroy - user might navigate away briefly
  }

  seekGame(tc: TimeControlOption): void {
    const g = this.gameService.gameState();
    if (g && g.status === 'active') {
      this.rejoinGame();
      return;
    }
    if (this.gameService.isSearching()) {
      return;
    }
    this.gameService.seekGame(tc.value);
  }

  cancelSearch(): void {
    this.gameService.cancelSeek();
  }

  onSeekClicked(seek: GameSeek): void {
    this.gameService.joinSeek(seek.id);
  }

  rejoinGame(): void {
    const gameId = this.gameService.gameState()?.id;
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }

  formatTime(seconds: number): string {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return s > 0 ? `${m}m ${s}s` : `${m} min`;
    }
    return `${seconds} sec`;
  }
}
