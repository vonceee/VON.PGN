import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../core/models/chat.model';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.css',
})
export class MessageBubbleComponent {
  message = input.required<ChatMessage>();

  private authService = inject(AuthService);
  private chatService = inject(ChatService);

  get isOwnMessage(): boolean {
    const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
    return this.message().sender_id === currentUserId;
  }

  get isPending(): boolean {
    return !!this.message().temp_id;
  }

  get formattedTime(): string {
    return this.chatService.formatMessageTime(this.message().created_at);
  }

  get statusIcon(): string {
    switch (this.message().status) {
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      default:
        return 'sent';
    }
  }
}
