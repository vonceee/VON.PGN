import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-bughouse-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-lobby.component.html',
})
export class BughouseLobbyComponent {
  currentUserProfile = input.required<{ name: string }>();
  partner = input<any | null>(null);
  sentInvites = input<any[]>([]);
  searchResults = input<any[]>([]);
  searchQuery = input<string>('');
  isSearchingPlayers = input<boolean>(false);

  kickPartner = output<void>();
  cancelSentInvite = output<string>();
  invitePlayer = output<any>();
  searchInput = output<Event>();
  startQueue = output<void>();
  forceStartDebugGame = output<void>();
}
