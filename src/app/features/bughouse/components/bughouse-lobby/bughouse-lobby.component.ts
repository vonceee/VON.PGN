import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseBroadcastComponent } from '../bughouse-broadcast/bughouse-broadcast.component';
import { BughouseLobbyCardComponent } from '../bughouse-lobby-card/bughouse-lobby-card.component';
import { BughouseGameStateService } from '../../services/bughouse-game-state.service';

/**
 * Bughouse Lobby View Orchestrator.
 *
 * WHY: Modular layout manager switching between the live TV broadcast dual-board view
 *      and the matchmaking lobby card using modern pill tabs.
 */
@Component({
  selector: 'app-bughouse-lobby',
  standalone: true,
  imports: [CommonModule, BughouseBroadcastComponent, BughouseLobbyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-lobby.component.html',
})
export class BughouseLobbyComponent {
  gameStateService = inject(BughouseGameStateService);

  /**
   * Active view tab in the bughouse lobby interface ('broadcast' | 'lobby').
   *
   * WHY: Bound to gameStateService.activeLobbyTab so that returning to lobby from a match
   *      automatically opens the matchmaking lobby squad card view.
   */
  activeTab = this.gameStateService.activeLobbyTab;
}
