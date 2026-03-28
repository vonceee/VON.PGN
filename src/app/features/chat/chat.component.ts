import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatWindowComponent } from './chat-window/chat-window.component';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatListComponent, ChatWindowComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  chatService = inject(ChatService);
  private authService = inject(AuthService);

  private onlineInterval: ReturnType<typeof setInterval> | null = null;
  private beforeUnloadHandler = () => {
    this.chatService.setUserOnlineStatus(false);
  };

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.chatService.setUserOnlineStatus(true);

      this.onlineInterval = setInterval(() => {
        if (this.authService.isAuthenticated()) {
          this.chatService.setUserOnlineStatus(true);
        }
      }, 30000);

      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  ngOnDestroy(): void {
    if (this.onlineInterval) {
      clearInterval(this.onlineInterval);
    }
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.chatService.setUserOnlineStatus(false);
  }
}
