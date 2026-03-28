import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.html',
  styleUrl: './message-input.css',
})
export class MessageInputComponent {
  chatService = inject(ChatService);

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  messageText = signal('');
  isSending = signal(false);

  onInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.messageText.set(target.value);

    if (target.value.trim()) {
      this.chatService.onTypingStart();
    } else {
      this.chatService.onTypingStop();
    }
    this.autoResize();
  }

  sendMessage(): void {
    const text = this.messageText().trim();
    if (!text || this.isSending()) return;

    this.chatService.sendMessage(text);
    this.messageText.set('');
    this.chatService.onTypingStop();

    if (this.messageInput) {
      this.messageInput.nativeElement.style.height = 'auto';
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private autoResize(): void {
    if (this.messageInput) {
      const el = this.messageInput.nativeElement;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }
}
