import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  ViewChild,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';

export interface ChatMessage {
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
}

@Component({
  selector: 'app-study-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './study-chat.component.html',
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
export class StudyChatComponent implements OnInit {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  isLoadingHistory = signal(false);
  newMessage = signal('');
  currentUserId = signal<string | null>(null);

  constructor() {
    // Auto-update current user ID
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.currentUserId.set(String(user.uid || user.id));
      }
    });

    // Handle incoming messages
    this.studyService.onChatMessage$
      .pipe(takeUntilDestroyed())
      .subscribe(payload => {
        this.messages.update(msgs => [...msgs, payload]);
        this.scrollToBottom();
      });

    // Handle chat clear
    this.studyService.onChatCleared$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.messages.set([]);
      });
  }

  ngOnInit() {
    const studyId = this.studyService.currentStudy()?.id;
    if (studyId) {
      this.isLoadingHistory.set(true);
      this.studyService.getStudyMessages(studyId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (history: any[]) => {
            const mapped = history.map(m => ({
              text: m.body,
              senderId: String(m.user_id),
              senderName: m.user?.name || 'Anonymous',
              timestamp: m.created_at
            }));
            this.messages.set(mapped);
            this.isLoadingHistory.set(false);
            this.scrollToBottom();
          },
          error: () => this.isLoadingHistory.set(false),
        });
    }
  }

  sendMessage() {
    const text = this.newMessage().trim();
    if (!text) return;

    this.studyService.sendChatMessage(text);
    
    const studyId = this.studyService.currentStudy()?.id;
    if (studyId) {
      this.studyService.sendMessageToDb(studyId, text)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }

    this.newMessage.set('');
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  String(val: any): string {
    return String(val);
  }
}
