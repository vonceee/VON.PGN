import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService, UserSearchResult } from '../../../core/services/user.service';
import { ChatConversation } from '../../../core/models/chat.model';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

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
  userService = inject(UserService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  isSearchOpen = signal(false);
  isSearching = signal(false);

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) {
            return of([]);
          }
          this.isSearching.set(true);
          return this.userService.searchUsers(query);
        }),
      )
      .subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.isSearching.set(false);
          this.isSearchOpen.set(results.length > 0);
        },
        error: () => {
          this.isSearching.set(false);
          this.searchResults.set([]);
        },
      });
  }

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
    this.searchSubject.next(value);
  }

  startConversation(user: UserSearchResult): void {
    this.isSearchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.chatService.startConversation(parseInt(user.uid));
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
