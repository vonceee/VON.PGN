import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../core/services/game.service';
import { GameSeek } from '../../../core/models/game.model';
import { SeekBoardComponent } from '@shared/chess';
import { ServerMaintenanceComponent } from '@shared/feedback';
import { PlaySelectorComponent } from './play-selector.component';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [
    CommonModule,
    SeekBoardComponent,
    ServerMaintenanceComponent,
    PlaySelectorComponent,
  ],
  templateUrl: './matchmaking.component.html',
})
export class MatchmakingComponent implements OnInit {
  activeTab = signal<'play' | 'lobby'>('play');
  gameService = inject(GameService);

  isServiceMaintenance = () => this.gameService.isServiceMaintenance();

  ngOnInit(): void {
    this.gameService.checkActiveGame();
  }

  onSeekClicked(seek: GameSeek): void {
    this.gameService.joinSeek(seek.id);
  }
}
