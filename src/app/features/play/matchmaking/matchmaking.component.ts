import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../core/services/game.service';
import { GameSeek } from '../../../core/models/game.model';
import { SeekBoardComponent } from '@shared/chess';
import { PlaySelectorComponent } from './play-selector.component';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [
    CommonModule,
    SeekBoardComponent,
    PlaySelectorComponent,
  ],
  templateUrl: './matchmaking.component.html',
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class MatchmakingComponent implements OnInit {
  gameService = inject(GameService);

  isServiceMaintenance = () => this.gameService.isServiceMaintenance();

  ngOnInit(): void {
    this.gameService.checkActiveGame();
  }

  onSeekClicked(seek: GameSeek): void {
    this.gameService.joinSeek(seek.id);
  }
}
