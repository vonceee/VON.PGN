import { Injectable, inject, signal, computed, OnDestroy, PLATFORM_ID, inject as injectCore } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { ChatMessage, ChatConversation } from '../models/chat.model';
import { Subject, Subscription, of, interval } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private platformId = injectCore(PLATFORM_ID);

  private apiUrl = environment.apiUrl;
  private pollingSub: Subscription | null = null;
  private lastPolledMessageId = 0;
  private pollingActive = false;
  private messageReceived$ = new Subject<ChatMessage>();

  conversations = signal<ChatConversation[]>([]);
  activeConversationId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  totalUnreadCount = signal(0);
  isLoadingConversations = signal(false);
  isLoadingMessages = signal(false);
  hasMoreMessages = signal(true);
  currentMessagesPage = signal(1);

  activeConversation = computed(() => {
    const id = this.activeConversationId();
    if (!id) return null;
    return this.conversations().find((c) => c.id === id) ?? null;
  });

  constructor() {
    this.setupVisibilityHandler();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.cleanupVisibilityHandler();
  }

  private setupVisibilityHandler(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
  }

  private cleanupVisibilityHandler(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
  }

  private handleVisibilityChange = (): void => {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (document.hidden) {
      this.stopPolling();
    } else if (this.activeConversationId()) {
      this.fetchMessagesNow();
      this.startPolling();
    }
  };

  private handleFocus = (): void => {
    if (this.activeConversationId()) {
      this.fetchMessagesNow();
    }
  };

  // ── Conversations ───────────────────────────────────────────────

  loadConversations(): void {
    this.isLoadingConversations.set(true);
    this.http
      .get<{ data: ChatConversation[]; meta: any }>(`${this.apiUrl}/chat/conversations`)
      .pipe(
        catchError((err) => {
          console.error('[Chat] Failed to load conversations', err);
          return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
        }),
      )
      .subscribe((res) => {
        this.conversations.set(res.data);
        this.isLoadingConversations.set(false);
        this.recalculateUnreadCount();
      });
  }

  // ── Messages ────────────────────────────────────────────────────

  loadMessages(conversationId: number, page = 1): void {
    if (page === 1) {
      this.isLoadingMessages.set(true);
      this.messages.set([]);
    }

    this.http
      .get<{ data: ChatMessage[]; meta: any }>(
        `${this.apiUrl}/chat/conversations/${conversationId}/messages`,
        { params: { page: page.toString() } },
      )
      .pipe(
        catchError((err) => {
          console.error('[Chat] Failed to load messages', err);
          return of({ data: [], meta: { current_page: 1, last_page: 1, per_page: 30, total: 0 } });
        }),
      )
      .subscribe((res) => {
        const sorted = [...res.data].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        if (page === 1) {
          this.messages.set(sorted);
        } else {
          this.messages.update((prev) => [...sorted, ...prev]);
        }
        this.currentMessagesPage.set(page);
        this.hasMoreMessages.set(res.meta.current_page < res.meta.last_page);
        this.isLoadingMessages.set(false);
        this.activeConversationId.set(conversationId);

        const allMsgs = this.messages();
        if (allMsgs.length > 0) {
          this.lastPolledMessageId = Math.max(...allMsgs.map((m) => m.id || 0));
        }

        if (page === 1) {
          this.markAsRead(conversationId);
        }

        this.startPolling();
      });
  }

  loadMoreMessages(): void {
    const convId = this.activeConversationId();
    if (!convId || !this.hasMoreMessages() || this.isLoadingMessages()) return;
    this.loadMessages(convId, this.currentMessagesPage() + 1);
  }

  // ── Conversations (create / open) ───────────────────────────────

  startConversation(userId: number): void {
    this.http
      .post<{ data: ChatConversation }>(`${this.apiUrl}/chat/conversations`, { user_id: userId })
      .pipe(
        catchError((err) => {
          console.error('[Chat] Failed to start conversation', err);
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res?.data) {
          this.conversations.update((prev) => {
            const existing = prev.find((c) => c.id === res.data.id);
            if (existing) return prev;
            return [res.data, ...prev];
          });
          this.setActiveConversation(res.data.id);
        }
      });
  }

  openConversationWith(userId: number) {
    return this.http
      .post<{ data: ChatConversation }>(`${this.apiUrl}/chat/conversations`, { user_id: userId })
      .pipe(
        catchError((err) => {
          console.error('[Chat] Failed to open conversation', err);
          return of(null);
        }),
      );
  }

  setActiveConversation(conversationId: number): void {
    this.activeConversationId.set(conversationId);
    this.loadMessages(conversationId);
  }

  // ── Sending ─────────────────────────────────────────────────────

  sendMessage(body: string): void {
    const conversationId = this.activeConversationId();
    if (!conversationId) return;

    const sanitized = this.sanitizeInput(body);
    if (!sanitized.trim()) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMessage: ChatMessage = {
      id: 0,
      conversation_id: conversationId,
      sender_id: parseInt(this.authService.currentUser()?.uid ?? '0'),
      sender: {
        id: parseInt(this.authService.currentUser()?.uid ?? '0'),
        name: this.authService.currentUser()?.username ?? 'You',
      },
      body: sanitized,
      status: 'sent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      temp_id: tempId,
    };

    this.messages.update((prev) => [...prev, optimisticMessage]);

    this.http
      .post<{ data: ChatMessage; temp_id: string }>(
        `${this.apiUrl}/chat/conversations/${conversationId}/messages`,
        { body: sanitized, temp_id: tempId },
      )
      .pipe(
        catchError(() => {
          this.messages.update((msgs) =>
            msgs.map((m) => (m.temp_id === tempId ? { ...m, status: 'sent' as const } : m)),
          );
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res?.data) {
          this.messages.update((msgs) =>
            msgs.map((m) => (m.temp_id === tempId ? { ...res.data, temp_id: undefined } : m)),
          );
          this.lastPolledMessageId = Math.max(this.lastPolledMessageId, res.data.id);
          this.updateConversationLatestMessage(conversationId, res.data);
        }
      });
  }

  // ── Read / Typing ───────────────────────────────────────────────

  markAsRead(conversationId: number): void {
    const msgs = this.messages();
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg || !lastMsg.id) return;

    this.http
      .post(`${this.apiUrl}/chat/conversations/${conversationId}/read`, {
        last_read_message_id: lastMsg.id,
      })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.conversations.update((convs) =>
          convs.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
        );
        this.recalculateUnreadCount();
      });
  }

  sendTypingIndicator(isTyping: boolean): void {
    const conversationId = this.activeConversationId();
    if (!conversationId) return;

    this.http
      .post(`${this.apiUrl}/chat/conversations/${conversationId}/typing`, { is_typing: isTyping })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  onTypingStart(): void {
    this.sendTypingIndicator(true);
  }

  loadUnreadCount(): void {
    this.http
      .get<{ unread_count: number }>(`${this.apiUrl}/chat/unread`)
      .pipe(catchError(() => of({ unread_count: 0 })))
      .subscribe((res) => this.totalUnreadCount.set(res.unread_count));
  }

  // ── Lightweight Polling ─────────────────────────────────────────

  private startPolling(): void {
    if (this.pollingSub || this.pollingActive) return;
    if (!this.activeConversationId()) return;
    if (!isPlatformBrowser(this.platformId) || document.hidden) return;

    this.pollingActive = true;
    console.log('[Chat] Polling started (interval: 15s)');

    this.pollingSub = interval(15000)
      .pipe(
        switchMap(() => {
          const convId = this.activeConversationId();
          if (!convId) return of(null);

          return this.http
            .get<{ data: ChatMessage[] }>(
              `${this.apiUrl}/chat/conversations/${convId}/messages`,
              { params: { page: '1' } },
            )
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((res) => {
        if (!res?.data) return;

        const incoming = res.data.filter((m) => m.id > this.lastPolledMessageId);
        if (incoming.length === 0) return;

        incoming.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
        for (const msg of incoming) {
          if (msg.sender_id !== currentUserId) {
            this.appendIncomingMessage({
              id: msg.id,
              conversation_id: msg.conversation_id,
              sender_id: msg.sender.id,
              sender: msg.sender,
              body: msg.body,
              status: msg.status,
              created_at: msg.created_at,
              updated_at: msg.created_at,
            }, msg.conversation_id);
          } else {
            this.lastPolledMessageId = Math.max(this.lastPolledMessageId, msg.id);
          }
        }
      });
  }

  private fetchMessagesNow(): void {
    const convId = this.activeConversationId();
    if (!convId) return;

    this.http
      .get<{ data: ChatMessage[] }>(
        `${this.apiUrl}/chat/conversations/${convId}/messages`,
        { params: { page: '1' } },
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res?.data) return;

        const incoming = res.data.filter((m) => m.id > this.lastPolledMessageId);
        if (incoming.length === 0) return;

        const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
        for (const msg of incoming) {
          if (msg.sender_id !== currentUserId) {
            this.appendIncomingMessage({
              id: msg.id,
              conversation_id: msg.conversation_id,
              sender_id: msg.sender.id,
              sender: msg.sender,
              body: msg.body,
              status: msg.status,
              created_at: msg.created_at,
              updated_at: msg.created_at,
            }, msg.conversation_id);
          } else {
            this.lastPolledMessageId = Math.max(this.lastPolledMessageId, msg.id);
          }
        }
      });
  }

  private appendIncomingMessage(message: ChatMessage, conversationId: number): void {
    this.messages.update((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });

    this.lastPolledMessageId = Math.max(this.lastPolledMessageId, message.id);

    if (this.activeConversationId() === conversationId) {
      this.markAsRead(conversationId);
    } else {
      this.conversations.update((convs) =>
        convs.map((c) =>
          c.id === conversationId ? { ...c, unread_count: c.unread_count + 1 } : c,
        ),
      );
      this.recalculateUnreadCount();
    }

    this.updateConversationLatestMessage(conversationId, message);
    this.messageReceived$.next(message);
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private updateConversationLatestMessage(conversationId: number, message: ChatMessage): void {
    this.conversations.update((convs) =>
      convs.map((c) =>
        c.id === conversationId
          ? { ...c, latest_message: message, updated_at: message.created_at }
          : c,
      ),
    );
    this.sortConversations();
  }

  private sortConversations(): void {
    this.conversations.update((convs) =>
      [...convs].sort((a, b) => {
        const dateA = a.latest_message?.created_at ?? a.created_at;
        const dateB = b.latest_message?.created_at ?? b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }),
    );
  }

  private recalculateUnreadCount(): void {
    const total = this.conversations().reduce((sum, c) => sum + c.unread_count, 0);
    this.totalUnreadCount.set(total);
  }

  private sanitizeInput(input: string): string {
    if (!isPlatformBrowser(this.platformId)) return input;
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatMessageTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  // ── Lifecycle (connect/disconnect for compatibility) ───────────

  connect(): void {
    if (!this.authService.isAuthenticated()) return;
    this.loadConversations();
    this.loadUnreadCount();
  }

  disconnect(): void {
    this.privateStopPolling();
  }

  stopPolling(): void {
    this.privateStopPolling();
  }

  private privateStopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
      console.log('[Chat] Polling stopped');
    }
    this.pollingActive = false;
  }
}