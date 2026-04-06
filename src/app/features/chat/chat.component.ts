import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatWindowComponent } from './chat-window/chat-window.component';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatListComponent, ChatWindowComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  chatService = inject(ChatService);

  ngOnInit(): void {
    // Lightweight: no persistent connection tracking
  }

  ngOnDestroy(): void {
    this.chatService.stopPolling();
  }
}