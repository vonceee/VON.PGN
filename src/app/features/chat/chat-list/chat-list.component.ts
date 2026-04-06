import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatConversation } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.css',
})
export class ChatListComponent implements OnInit, OnDestroy {
  chatService = inject(ChatService);
  authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  searchQuery = signal('');
  isSearchOpen = signal(false);

  filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const conversations = this.chatService.conversations();
    if (!query) return conversations;
    return conversations.filter((c) => 
      c.other_user?.name.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.chatService.loadConversations();
    this.chatService.loadUnreadCount();
    this.chatService.connect();
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.isSearchOpen.set(value.length > 0);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.isSearchOpen.set(false);
  }

  selectConversation(conversation: ChatConversation): void {
    this.chatService.setActiveConversation(conversation.id);
  }

  isActive(conversation: ChatConversation): boolean {
    return this.chatService.activeConversationId() === conversation.id;
  }

  getLastMessagePreview(conversation: ChatConversation): string {
    if (!conversation.latest_message) return 'No messages yet';
    const prefix =
      conversation.latest_message.sender_id === parseInt(this.authService.currentUser()?.uid ?? '0')
        ? 'You: '
        : '';
    const body = conversation.latest_message.body;
    return prefix + (body.length > 40 ? body.substring(0, 40) + '...' : body);
  }

  getTimestamp(conversation: ChatConversation): string {
    if (!conversation.latest_message) return '';
    return this.chatService.formatTimestamp(conversation.latest_message.created_at);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (
      this.isSearchOpen() &&
      this.searchContainer &&
      !this.searchContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isSearchOpen.set(false);
    }
  }
}
