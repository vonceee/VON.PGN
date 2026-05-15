import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../core/services/game.service';
import { GameSeek } from '../../../core/models/game.model';
import { SeekBoardComponent } from '@shared/chess';
import { PlaySelectorComponent } from './play-selector.component';
import { TopMatchesComponent } from './components/top-matches.component';
import { PresenceService } from '../../../core/services/presence.service';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [
    CommonModule,
    SeekBoardComponent,
    PlaySelectorComponent,
    TopMatchesComponent,
  ],
  templateUrl: './matchmaking.component.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class MatchmakingComponent implements OnInit, OnDestroy {
  gameService = inject(GameService);
  presenceService = inject(PresenceService);
  layoutService = inject(LayoutService);

  isServiceMaintenance = () => this.gameService.isServiceMaintenance();

  ngOnInit(): void {
    this.gameService.checkActiveGame();
    this.presenceService.subscribeToSiteStats();
    this.layoutService.setFluid(true);
  }

  ngOnDestroy(): void {
    this.presenceService.unsubscribeFromSiteStats();
    this.layoutService.setFluid(false);
  }

  onSeekClicked(seek: GameSeek): void {
    this.gameService.joinSeek(seek.id);
  }
}
