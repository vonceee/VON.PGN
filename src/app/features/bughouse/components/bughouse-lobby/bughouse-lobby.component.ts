import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ChessBoardComponent } from '../../../../shared/components/chess/chess-board/chess-board.component';
import {
  heroUsers,
  heroUserPlus,
  heroPlay,
  heroCheckCircle,
  heroXCircle,
  heroInformationCircle,
  heroTrash,
  heroXMark,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-bughouse-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, ChessBoardComponent],
  providers: [
    provideIcons({
      heroUsers,
      heroUserPlus,
      heroPlay,
      heroCheckCircle,
      heroXCircle,
      heroInformationCircle,
      heroTrash,
      heroXMark,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-lobby.component.html',
})
export class BughouseLobbyComponent {
  currentUserProfile = input.required<{ name: string }>();
  partner = input<any | null>(null);
  isHost = input<boolean>(true);
  sentInvites = input<any[]>([]);
  searchResults = input<any[]>([]);
  searchQuery = input<string>('');
  isSearchingPlayers = input<boolean>(false);
  ongoingMatches = input<any[]>([]);

  kickPartner = output<void>();
  leaveLobby = output<void>();
  cancelSentInvite = output<string>();
  invitePlayer = output<any>();
  searchInput = output<Event>();
  startQueue = output<void>();
  clearSearch = output<void>();
  spectateGame = output<string>();

  showInviteModal = signal<boolean>(false);

  openInviteModal() {
    this.showInviteModal.set(true);
  }

  closeInviteModal() {
    this.showInviteModal.set(false);
    this.clearSearch.emit();
  }

  onInvitePlayer(player: any) {
    this.invitePlayer.emit(player);
    this.closeInviteModal();
  }
}
