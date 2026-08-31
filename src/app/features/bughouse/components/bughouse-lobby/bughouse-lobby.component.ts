import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChessBoardComponent } from '../../../../shared/components/chess/chess-board/chess-board.component';
import { BughouseBoardComponent } from '../bughouse-board/bughouse-board.component';
import { BughouseRecordState } from '../../../../core/models/bughouse.model';

export interface BughouseTvState {
  gameId: string | null;
  isActive: boolean;
  winner?: string | null;
  boardA: {
    fen: string;
    pocketW: Record<string, number>;
    pocketB: Record<string, number>;
    timeW: number;
    timeB: number;
    turn: 'w' | 'b';
    whiteName: string;
    blackName: string;
  };
  boardB: {
    fen: string;
    pocketW: Record<string, number>;
    pocketB: Record<string, number>;
    timeW: number;
    timeB: number;
    turn: 'w' | 'b';
    whiteName: string;
    blackName: string;
  };
}

@Component({
  selector: 'app-bughouse-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, ChessBoardComponent, BughouseBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-lobby.component.html',
})
export class BughouseLobbyComponent {
  currentUserProfile = input.required<{ name: string }>();
  partner = input<any | null>(null);
  isHost = input<boolean>(true);
  searchResults = input<any[]>([]);
  searchQuery = input<string>('');
  isSearchingPlayers = input<boolean>(false);
  ongoingMatches = input<any[]>([]);
  isQueuing = input<boolean>(false);
  tvState = input<BughouseTvState | null>(null);
  record = input.required<BughouseRecordState>();

  kickPartner = output<void>();
  leaveLobby = output<void>();
  invitePlayer = output<any>();
  searchInput = output<Event>();
  startQueue = output<void>();
  cancelQueue = output<void>();
  clearSearch = output<void>();
  spectateGame = output<string>();
  resetRecord = output<void>();

  onInvitePlayer(player: any, event: Event) {
    event.stopPropagation();
    this.invitePlayer.emit(player);
    this.clearSearch.emit();
  }
}
