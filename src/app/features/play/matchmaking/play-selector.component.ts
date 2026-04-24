import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../../core/services/game.service';
import { TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';
import { ButtonComponent } from '@shared/ui';
import { Dialog } from '@angular/cdk/dialog';
import { ComputerSetupModalComponent } from '../computer/computer-setup-modal.component';

@Component({
  selector: 'app-play-selector',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent],
  templateUrl: './play-selector.component.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class PlaySelectorComponent {
  showCustomForm = signal(false);
  customMinutes = signal(10);
  customIncrement = signal(0);
  gameService = inject(GameService);
  private router = inject(Router);
  private dialog = inject(Dialog);

  playWithComputer(): void {
    const dialogRef = this.dialog.open(ComputerSetupModalComponent, {
      maxWidth: '95vw',
      backdropClass: ['bg-slate-950/80'],
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        const queryParams: any = {
          level: result.level,
          color: result.color,
        };

        if (result.useCustom) {
          queryParams.time = `${result.customMinutes * 60}+${result.customIncrement}`;
        } else if (result.timeControl) {
          queryParams.time = result.timeControl.value;
        }

        this.router.navigate(['/play-computer'], { queryParams });
      }
    });
  }

  categories = [
    { key: 'bullet', label: 'Bullet', controls: TIME_CONTROLS.filter((tc: TimeControlOption) => tc.category === 'bullet') },
    { key: 'blitz', label: 'Blitz', controls: TIME_CONTROLS.filter((tc: TimeControlOption) => tc.category === 'blitz') },
    { key: 'rapid', label: 'Rapid', controls: TIME_CONTROLS.filter((tc: TimeControlOption) => tc.category === 'rapid') },
  ];

  activeGameId = () => {
    const g = this.gameService.gameState();
    return g && g.status === 'active' ? g.id : null;
  };

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

  rejoinGame(): void {
    const gameId = this.gameService.gameState()?.id;
    if (gameId) {
      this.router.navigate(['/play', gameId]);
    }
  }
}
