import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPaperAirplane } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '@shared/ui';
import { ToastService } from '../../../core/services/toast.service';

interface ChatMessage {
  text: string;
  senderName: string;
  senderId: string | number;
  timestamp: string;
}

@Component({
  selector: 'app-study-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ButtonComponent],
  providers: [provideIcons({ heroPaperAirplane })],
  templateUrl: './study-chat.component.html',
  styleUrl: './study-chat.component.css',
})
export class StudyChatComponent implements OnInit, AfterViewChecked {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  protected readonly String = String;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  newMessage = signal('');
  isLoadingHistory = signal(false);
  
  currentUserId = computed(() => {
    const user = this.authService.currentUser();
    return user ? (user.uid || user.id) : null;
  });

  private shouldScrollToBottom = false;

  constructor() {
    // Real-time message listener
    this.studyService.onChatMessage$
      .pipe(takeUntilDestroyed())
      .subscribe((msg) => {
        this.messages.update((prev) => [...prev, msg]);
        this.shouldScrollToBottom = true;
      });

    // Real-time clear listener
    this.studyService.onChatCleared$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.messages.set([]);
      });
  }

  ngOnInit() {
    this.loadHistory();
  }

  private loadHistory() {
    const studyId = this.studyService.currentStudy()?.id;
    if (!studyId) return;

    this.isLoadingHistory.set(true);
    this.studyService.getStudyMessages(studyId).subscribe({
      next: (dbMessages) => {
        const formatted = dbMessages.map((m: any) => ({
          text: m.body,
          senderName: m.user?.name || 'Anonymous',
          senderId: m.user_id,
          timestamp: m.created_at,
        }));
        this.messages.set(formatted);
        this.shouldScrollToBottom = true;
        this.isLoadingHistory.set(false);
      },
      error: (err) => {
        console.error('[StudyChat] Failed to load history:', err);
        this.isLoadingHistory.set(false);
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage() {
    const text = this.newMessage().trim();
    const studyId = this.studyService.currentStudy()?.id;
    
    if (!text || !studyId) return;

    // Persist to DB first to ensure it's saved before broadcasting
    this.studyService.sendMessageToDb(studyId, text).subscribe({
      next: () => {
        // Broadcast via Socket so others see it in real-time
        this.studyService.sendChatMessage(text);
      },
      error: (err) => {
        console.error('[StudyChat] Failed to persist message:', err);
        this.toastService.show('Failed to send message', 'error');
      }
    });
    
    this.newMessage.set('');
  }

  private scrollToBottom(): void {
    if (!this.scrollContainer) return;
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
