import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseBroadcastComponent } from '../bughouse-broadcast/bughouse-broadcast.component';
import { BughouseLobbyCardComponent } from '../bughouse-lobby-card/bughouse-lobby-card.component';

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
  /**
   * Active view tab in the bughouse lobby interface ('broadcast' | 'lobby').
   *
   * WHY: Decouples the live TV/spectator broadcast boards from the matchmaking
   *      squad setup card into distinct pill-tab views to provide a clean, focused UI.
   */
  activeTab = signal<'broadcast' | 'lobby'>('broadcast');
}
