import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../../core/services/game.service';
import { TIME_CONTROLS, TimeControlOption, GameSeek } from '../../../core/models/game.model';
import { SeekBoardComponent } from '../../../shared/components/seek-board/seek-board.component';
import { ServerMaintenanceComponent } from '../../../shared/components/server-maintenance/server-maintenance.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [CommonModule, RouterModule, SeekBoardComponent, ServerMaintenanceComponent, FormsModule, ButtonComponent],
  templateUrl: './matchmaking.component.html',
})
export class MatchmakingComponent implements OnInit, OnDestroy {
  showCustomForm = signal(false);
  customMinutes = signal(10);
  customIncrement = signal(0);
  gameService = inject(GameService);
  private router = inject(Router);



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

  seekCustomGame(): void {
    const g = this.gameService.gameState();
    if (g && g.status === 'active') {
      this.rejoinGame();
      return;
    }
    if (this.gameService.isSearching()) {
      return;
    }
    const value = `${this.customMinutes() * 60}+${this.customIncrement()}`;
    this.gameService.seekGame(value);
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


}
