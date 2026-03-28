import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../core/services/chat.service';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { ChatMessage } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, MessageBubbleComponent, MessageInputComponent],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.css',
})
export class ChatWindowComponent {
  chatService = inject(ChatService);
  private zone = inject(NgZone);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  private isLoadingOlder = false;
  private previousScrollHeight = 0;
  private userScrolledUp = false;
  private prevMessageCount = 0;

  /**
   * Called from the template via the messages signal.
   * When the count changes, schedule a scroll after the DOM has updated.
   */
  onMessagesChanged(): void {
    const count = this.chatService.messages().length;
    if (count === this.prevMessageCount) return;

    const grew = count > this.prevMessageCount;
    this.prevMessageCount = count;

    if (!grew) return;
    // Don't auto-scroll when loading older messages at the top
    if (this.isLoadingOlder) return;
    // Don't auto-scroll when the user has scrolled up to read history
    if (this.userScrolledUp) return;

    // requestAnimationFrame runs AFTER the browser has painted the new
    // DOM element, so scrollHeight already includes the new message.
    requestAnimationFrame(() => {
      this.scrollToBottom();
    });
  }

  onScroll(): void {
    const container = this.messagesContainer?.nativeElement;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    this.userScrolledUp = distanceFromBottom > 80;

    if (
      container.scrollTop < 50 &&
      this.chatService.hasMoreMessages() &&
      !this.isLoadingOlder
    ) {
      this.isLoadingOlder = true;
      this.previousScrollHeight = container.scrollHeight;
      this.chatService.loadMoreMessages();

      requestAnimationFrame(() => {
        setTimeout(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - this.previousScrollHeight;
          this.isLoadingOlder = false;
        }, 0);
      });
    }
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
      this.userScrolledUp = false;
    }
  }

  trackByMessageId(_index: number, message: ChatMessage): string {
    return message.temp_id ?? `msg-${message.id}`;
  }

  getConversationName(): string {
    return this.chatService.activeConversation()?.other_user?.name ?? 'Chat';
  }

  isUserOnline(): boolean {
    return this.chatService.activeConversation()?.other_user?.is_online ?? false;
  }

  getLastSeenText(): string {
    const user = this.chatService.activeConversation()?.other_user;
    if (!user) return '';
    if (user.is_online) return 'online';
    return this.chatService.formatLastSeen(user.last_seen_at);
  }
}
