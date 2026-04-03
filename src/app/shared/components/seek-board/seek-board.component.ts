import { Component, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../core/services/game.service';
import { GameSeek, TIME_CONTROLS, TimeControlOption } from '../../../core/models/game.model';

@Component({
  selector: 'app-seek-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seek-board.component.html',
})
export class SeekBoardComponent implements OnInit {
  private gameService = inject(GameService);

  showAll = input(true);
  compact = input(false);

  seeks = this.gameService.seeks;
  isSearching = this.gameService.isSearching;
  searchTimeControl = this.gameService.searchTimeControl;

  timeControls = TIME_CONTROLS;

  ngOnInit(): void {
    this.gameService.subscribeToSeeksChannel();
  }

  get visibleSeeks(): GameSeek[] {
    return this.seeks();
  }

  get seekCount(): number {
    return this.seeks().length;
  }

  get groupedSeeks(): Map<string, GameSeek[]> {
    const groups = new Map<string, GameSeek[]>();
    for (const seek of this.seeks()) {
      const existing = groups.get(seek.time_control) || [];
      groups.set(seek.time_control, [...existing, seek]);
    }
    return groups;
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
    return seek.user_id === this.gameService.gameState()?.white_player?.id ||
           seek.user_id === this.gameService.gameState()?.black_player?.id;
  }

  canSeek(timeControl: string): boolean {
    return !this.isSearching();
  }

  onSeek(timeControl: string): void {
    if (this.canSeek(timeControl)) {
      this.gameService.seekGame(timeControl);
    }
  }

  onCancel(): void {
    this.gameService.cancelSeek();
  }

  formatElo(elo: number): string {
    return elo.toString();
  }

  formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }
}