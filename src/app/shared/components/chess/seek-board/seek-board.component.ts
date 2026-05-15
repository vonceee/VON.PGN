import { Component, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../../core/services/game.service';
import { PresenceService } from '../../../../core/services/presence.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameSeek, TIME_CONTROLS } from '../../../../core/models/game.model';

@Component({
  selector: 'app-seek-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seek-board.component.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class SeekBoardComponent implements OnInit, OnDestroy {
  private gameService = inject(GameService);
  presenceService = inject(PresenceService);
  private authService = inject(AuthService);

  showAll = input(true);
  compact = input(false);

  seekClicked = output<GameSeek>();

  seeks = this.gameService.seeks;
  isConnected = this.gameService.isConnected;
  isSeeksConnected = this.gameService.isSeeksConnected;

  timeControls = TIME_CONTROLS;

  ngOnInit(): void {
    this.gameService.subscribeToSeeksChannel();
    this.presenceService.subscribeToSiteStats();
  }

  ngOnDestroy(): void {
    this.presenceService.unsubscribeFromSiteStats();
  }

  get visibleSeeks(): GameSeek[] {
    return this.seeks();
  }

  get seekCount(): number {
    return this.seeks().length;
  }

  getTimeControlLabel(value: string): string {
    const tc = this.timeControls.find((t) => t.value === value);
    return tc?.label || value;
  }

  getTimeControlCategory(value: string): string {
    const tc = this.timeControls.find((t) => t.value === value);
    return tc?.category || 'rapid';
  }

  isMySeek(seek: GameSeek): boolean {
    const currentUserId = this.authService.currentUser()?.uid;
    return Number(currentUserId) === seek.user_id;
  }

  onSeekClick(seek: GameSeek): void {
    if (!this.isMySeek(seek)) {
      this.seekClicked.emit(seek);
    }
  }

  formatElo(elo: number): string {
    return elo.toString();
  }
}

