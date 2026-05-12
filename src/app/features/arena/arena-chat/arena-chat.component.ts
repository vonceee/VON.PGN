import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  ViewChild,
  ElementRef,
  DestroyRef,
  input,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArenaService } from '../../../core/services/arena.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserHovercardDirective } from '@shared/directives';

export interface ChatMessage {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
}

@Component({
  selector: 'app-arena-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, UserHovercardDirective],
  templateUrl: './arena-chat.component.html',
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class ArenaChatComponent implements OnInit {
  private arenaService = inject(ArenaService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  arenaId = input<string | undefined>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  isLoadingHistory = signal(false);
  newMessage = signal('');

  constructor() {
    // Handle incoming messages from socket
    this.arenaService.onChatMessage$
      .pipe(takeUntilDestroyed())
      .subscribe(payload => {
        this.messages.update(msgs => [...msgs, payload]);
        this.scrollToBottom();
      });

    // Auto-load history when arenaId input changes
    effect(() => {
      const id = this.arenaId();
      if (id && id.length > 0) {
        // Use untracked to prevent any potential circular dependencies
        untracked(() => this.loadHistory(id));
      } else {
        this.messages.set([]);
      }
    });

    // Auto-scroll when messages change
    effect(() => {
      if (this.messages().length > 0) {
        this.scrollToBottom();
      }
    });
  }

  ngOnInit() {}

  private loadHistory(id: string) {
    this.isLoadingHistory.set(true);
    this.arenaService.getArenaMessages(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history: any[]) => {
          if (Array.isArray(history)) {
            const mapped = history.map(m => ({
              text: m.body,
              senderId: String(m.user_id),
              senderName: m.user?.name || 'Anonymous',
              timestamp: m.created_at
            }));
            this.messages.set(mapped);
          }
          this.isLoadingHistory.set(false);
          this.scrollToBottom();
        },
        error: () => {
          this.isLoadingHistory.set(false);
        },
      });
  }

  sendMessage() {
    const text = this.newMessage().trim();
    const id = this.arenaId();
    if (!text || !id) return;

    this.arenaService.sendArenaChatMessage(id, text);
    this.newMessage.set('');
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
