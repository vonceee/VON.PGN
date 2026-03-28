import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  ChatMessage,
  ChatConversation,
  TypingEvent,
  MessageReadEvent,
  UserStatusEvent,
} from '../models/chat.model';
import { Subject, timer, Subscription, of, interval } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';

declare global {
  interface Window {
    Echo?: any;
    Pusher?: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private apiUrl = environment.apiUrl;
  private echo: any = null;
  private activeChannels: Map<string, any> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectScheduled = false;
  private reconnectSub: Subscription | null = null;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: Map<string, { body: string; conversationId: number; retries: number }> = new Map();
  private pollingSub: Subscription | null = null;
  private wsConnectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPolledMessageId = 0;
  private echoLoadAttempted = false;

  conversations = signal<ChatConversation[]>([]);
  activeConversationId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  typingUsers = signal<Map<number, string[]>>(new Map());
  onlineUserIds = signal<Set<number>>(new Set());
  totalUnreadCount = signal(0);
  isConnected = signal(false);
  isLoadingConversations = signal(false);
  isLoadingMessages = signal(false);
  hasMoreMessages = signal(true);
  currentMessagesPage = signal(1);

  activeConversation = computed(() => {
    const id = this.activeConversationId();
    if (!id) return null;
    return this.conversations().find((c) => c.id === id) ?? null;
  });

  conversationTypingUsers = computed(() => {
    const id = this.activeConversationId();
    if (!id) return [];
    return this.typingUsers().get(id) ?? [];
  });

  private messageReceived$ = new Subject<ChatMessage>();

  constructor() {
    // no-op
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.stopPolling();
    this.clearWsTimeout();
    if (this.reconnectSub) {
      this.reconnectSub.unsubscribe();
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

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
        // Sort ascending by created_at on the frontend to guarantee correct
        // order regardless of what the backend returns.
        const sorted = [...res.data].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        if (page === 1) {
          this.messages.set(sorted);
        } else {
          // Prepend older messages when loading earlier history
          this.messages.update((prev) => [...sorted, ...prev]);
        }
        this.currentMessagesPage.set(page);
        this.hasMoreMessages.set(res.meta.current_page < res.meta.last_page);
        this.isLoadingMessages.set(false);
        this.activeConversationId.set(conversationId);

        // Track the latest message ID for polling dedup
        const allMsgs = this.messages();
        if (allMsgs.length > 0) {
          this.lastPolledMessageId = Math.max(...allMsgs.map((m) => m.id || 0));
        }

        // Subscribe to real-time channel for this conversation
        this.subscribeToConversation(conversationId);

        // Mark messages as read now that they're loaded
        if (page === 1) {
          this.markAsRead(conversationId);
        }
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
        tap((res) => {
          this.conversations.update((prev) => {
            const existing = prev.find((c) => c.id === res.data.id);
            if (existing) return prev;
            return [res.data, ...prev];
          });
          this.setActiveConversation(res.data.id);
        }),
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

    this.pendingMessages.set(tempId, { body: sanitized, conversationId, retries: 0 });
    this.sendWithRetry(tempId);
  }

  private sendWithRetry(tempId: string): void {
    const pending = this.pendingMessages.get(tempId);
    if (!pending) return;

    this.http
      .post<{ data: ChatMessage; temp_id: string }>(
        `${this.apiUrl}/chat/conversations/${pending.conversationId}/messages`,
        { body: pending.body, temp_id: tempId },
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 429 && pending.retries < 3) {
            pending.retries++;
            const retryAfter = error.error?.retry_after ?? 5;
            timer(retryAfter * 1000).subscribe(() => this.sendWithRetry(tempId));
          } else if (pending.retries < 3) {
            pending.retries++;
            timer(2000).subscribe(() => this.sendWithRetry(tempId));
          } else {
            this.messages.update((msgs) =>
              msgs.map((m) => (m.temp_id === tempId ? { ...m, status: 'sent' as const } : m)),
            );
            this.pendingMessages.delete(tempId);
          }
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res?.data) {
          this.messages.update((msgs) =>
            msgs.map((m) => (m.temp_id === tempId ? { ...res.data, temp_id: undefined } : m)),
          );
          this.pendingMessages.delete(tempId);
          this.lastPolledMessageId = Math.max(this.lastPolledMessageId, res.data.id);
          this.updateConversationLatestMessage(pending.conversationId, res.data);
        }
      });
  }

  // ── Read / Typing / Status ──────────────────────────────────────

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
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.sendTypingIndicator(false), 3000);
  }

  onTypingStop(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    this.sendTypingIndicator(false);
  }

  setUserOnlineStatus(isOnline: boolean): void {
    this.http
      .post(`${this.apiUrl}/chat/status`, { is_online: isOnline })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  loadUnreadCount(): void {
    this.http
      .get<{ unread_count: number }>(`${this.apiUrl}/chat/unread`)
      .pipe(catchError(() => of({ unread_count: 0 })))
      .subscribe((res) => this.totalUnreadCount.set(res.unread_count));
  }

  // ── WebSocket Connection ────────────────────────────────────────

  /**
   * Entry point: start polling RIGHT AWAY as a guaranteed delivery
   * mechanism, then try to upgrade to WebSocket in the background.
   */
  connect(): void {
    if (!this.authService.isAuthenticated()) return;

    // Always start with polling so messages appear immediately
    this.startPolling();

    if (this.echoLoadAttempted) return;
    this.echoLoadAttempted = true;

    this.loadEchoAndConnect();
  }

  disconnect(): void {
    this.stopPolling();
    this.clearWsTimeout();
    if (this.echo) {
      try {
        this.echo.disconnect();
      } catch {
        // ignore
      }
      this.echo = null;
    }
    this.activeChannels.clear();
    this.isConnected.set(false);
    // Don't reset reconnectAttempts here — it needs to persist for backoff
    this.echoLoadAttempted = false;
  }

  private clearWsTimeout(): void {
    if (this.wsConnectionTimeout) {
      clearTimeout(this.wsConnectionTimeout);
      this.wsConnectionTimeout = null;
    }
  }

  private loadEchoAndConnect(): void {
    // Load Pusher first if not present
    if (!window.Pusher) {
      const pusherScript = document.createElement('script');
      pusherScript.src = 'https://cdn.jsdelivr.net/npm/pusher-js@8.4.0-rc2/dist/web/pusher.min.js';
      pusherScript.onload = () => this.loadEchoLibrary();
      pusherScript.onerror = () => console.warn('[Chat] Failed to load Pusher.js – using polling');
      document.head.appendChild(pusherScript);
    } else {
      this.loadEchoLibrary();
    }
  }

  private loadEchoLibrary(): void {
    if (window.Echo) {
      this.initEcho();
      return;
    }

    const echoScript = document.createElement('script');
    echoScript.src = 'https://cdn.jsdelivr.net/npm/laravel-echo@2.0.2/dist/echo.iife.js';
    echoScript.onload = () => setTimeout(() => this.initEcho(), 50);
    echoScript.onerror = () => console.warn('[Chat] Failed to load Laravel Echo – using polling');
    document.head.appendChild(echoScript);
  }

  private initEcho(): void {
    try {
      const token = this.authService.getToken();
      if (!token) {
        console.warn('[Chat] No auth token for WebSocket');
        return;
      }

      const EchoConstructor = window.Echo;
      if (!EchoConstructor || typeof EchoConstructor !== 'function') {
        console.warn('[Chat] Echo constructor not available');
        return;
      }

      console.log('[Chat] Initializing WebSocket...');

      const useTLS = environment.reverbScheme === 'wss';

      this.echo = new EchoConstructor({
        broadcaster: 'reverb',
        key: environment.reverbKey,
        wsHost: environment.reverbHost,
        wsPort: environment.reverbPort,
        wssPort: environment.reverbPort,
        forceTLS: useTLS,
        enabledTransports: useTLS ? ['wss'] : ['ws'],
        authEndpoint: `${this.apiUrl.replace('/api', '')}/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        // Keepalive: must exceed server ping_interval (60s) to avoid premature disconnects
        activityTimeout: 120000,
        pongTimeout: 30000,
        disableStats: true,
      });

      // Listen for connection state changes on the underlying Pusher instance
      const pusher = this.echo?.connector?.pusher;
      if (pusher) {
        pusher.connection.bind('connected', () => {
          console.log('[Chat] WebSocket transport connected');
          this.clearWsTimeout();
          this.isConnected.set(true);
          this.reconnectAttempts = 0;
          this.reconnectScheduled = false;

          // Subscribe to channels — auth may fail if CORS isn't configured,
          // but polling remains active as a guaranteed delivery fallback.
          this.subscribeToPresenceChannel();
          const activeId = this.activeConversationId();
          if (activeId) {
            this.subscribeToConversation(activeId);
          }
        });

        pusher.connection.bind('unavailable', () => {
          console.warn('[Chat] WebSocket unavailable');
          this.isConnected.set(false);
          this.scheduleReconnect();
        });

        pusher.connection.bind('failed', () => {
          console.warn('[Chat] WebSocket failed');
          this.isConnected.set(false);
          this.scheduleReconnect();
        });

        pusher.connection.bind('error', (err: any) => {
          console.error('[Chat] WebSocket error:', err);
          this.isConnected.set(false);
          this.scheduleReconnect();
        });

        pusher.connection.bind('disconnected', () => {
          console.warn('[Chat] WebSocket disconnected');
          this.isConnected.set(false);
          this.scheduleReconnect();
        });
      }

      // Safety timeout: if WS doesn't connect within 15s, ensure polling is active
      this.wsConnectionTimeout = setTimeout(() => {
        if (!this.isConnected()) {
          console.warn('[Chat] WebSocket connection timeout – polling remains active');
          this.startPolling();
          this.scheduleReconnect();
        }
      }, 15000);

    } catch (err) {
      console.error('[Chat] Failed to initialize Echo:', err);
      this.isConnected.set(false);
      this.startPolling();
    }
  }

  private subscribeToPresenceChannel(): void {
    if (!this.echo) return;

    try {
      const ch = this.echo.join('updates');
      ch.listen('.App\\Events\\UserStatusChanged', (data: UserStatusEvent) => {
        this.onlineUserIds.update((ids) => {
          const n = new Set(ids);
          data.is_online ? n.add(data.user_id) : n.delete(data.user_id);
          return n;
        });
        this.conversations.update((convs) =>
          convs.map((c) =>
            c.other_user?.id === data.user_id
              ? {
                  ...c,
                  other_user: c.other_user
                    ? { ...c.other_user, is_online: data.is_online, last_seen_at: data.last_seen_at }
                    : null,
                }
              : c,
          ),
        );
      });
    } catch (err) {
      console.error('[Chat] Failed to subscribe to presence channel', err);
    }
  }

  subscribeToConversation(conversationId: number): void {
    if (!this.echo || !this.isConnected()) return;
    if (this.activeChannels.has(`conversation.${conversationId}`)) return;

    try {
      const channelName = `conversation.${conversationId}`;
      const channel = this.echo.join(channelName);

      // Only mark as active once subscription is confirmed
      channel.on('pusher:subscription_succeeded', () => {
        console.log(`[Chat] Subscribed to ${channelName}`);
        this.activeChannels.set(channelName, channel);
      });

      channel.on('pusher:subscription_error', (err: any) => {
        console.error(`[Chat] Auth failed for ${channelName}:`, err);
        // Don't add to activeChannels so a future call can retry
      });

      channel.listen('.App\\Events\\MessageSent', (data: any) => {
        const message: ChatMessage = {
          id: data.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender.id,
          sender: data.sender,
          body: data.body,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.created_at,
        };

        const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
        if (message.sender_id === currentUserId) return;

        this.appendIncomingMessage(message, conversationId);
      });

      channel.listen('.App\\Events\\TypingIndicator', (data: TypingEvent) => {
        const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
        if (data.user_id === currentUserId) return;

        this.typingUsers.update((map) => {
          const newMap = new Map(map);
          const users = newMap.get(conversationId) ?? [];
          if (data.is_typing) {
            if (!users.includes(data.user_name)) {
              newMap.set(conversationId, [...users, data.user_name]);
            }
          } else {
            newMap.set(conversationId, users.filter((u) => u !== data.user_name));
          }
          return newMap;
        });
      });

      channel.listen('.App\\Events\\MessageRead', (data: MessageReadEvent) => {
        const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
        if (data.user_id === currentUserId) return;

        this.messages.update((msgs) =>
          msgs.map((m) =>
            m.sender_id === currentUserId && m.id <= data.last_read_message_id
              ? { ...m, status: 'read' as const }
              : m,
          ),
        );
      });

      // Channel added to activeChannels only on subscription_succeeded above
    } catch (err) {
      console.error(`[Chat] Failed to subscribe to conversation ${conversationId}`, err);
    }
  }

  // ── Shared message-append logic (used by WebSocket + polling) ───

  private appendIncomingMessage(message: ChatMessage, conversationId: number): void {
    // Deduplicate by message ID
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

  // ── Polling (runs alongside WebSocket as a safety net) ──────────

  private startPolling(): void {
    if (this.pollingSub) return; // already polling
    console.log('[Chat] Polling started (interval: 3s)');

    this.pollingSub = interval(3000)
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

        // Sort ascending so we append oldest of the batch first
        incoming.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const currentUserId = parseInt(this.authService.currentUser()?.uid ?? '0');
        for (const msg of incoming) {
          if (msg.sender_id !== currentUserId) {
            const chatMsg: ChatMessage = {
              id: msg.id,
              conversation_id: msg.conversation_id,
              sender_id: msg.sender.id,
              sender: msg.sender,
              body: msg.body,
              status: msg.status,
              created_at: msg.created_at,
              updated_at: msg.created_at,
            };
            this.appendIncomingMessage(chatMsg, msg.conversation_id);
          } else {
            // Own message from another tab – still track the ID
            this.lastPolledMessageId = Math.max(this.lastPolledMessageId, msg.id);
          }
        }
      });
  }

  private stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
      console.log('[Chat] Polling stopped');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectScheduled) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Chat] Max reconnect attempts reached – polling remains active');
      return;
    }

    this.reconnectScheduled = true;
    const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[Chat] Reconnecting in ${delayMs}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    if (this.reconnectSub) this.reconnectSub.unsubscribe();

    this.reconnectSub = timer(delayMs).subscribe(() => {
      this.reconnectScheduled = false;
      if (this.authService.isAuthenticated()) {
        // Tear down old Echo instance without resetting reconnect state
        this.clearWsTimeout();
        if (this.echo) {
          try { this.echo.disconnect(); } catch { /* ignore */ }
          this.echo = null;
        }
        this.activeChannels.clear();
        this.isConnected.set(false);
        this.echoLoadAttempted = false;

        // Re-initialize
        this.startPolling();
        this.loadEchoAndConnect();
      }
    });
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

  formatLastSeen(isoString: string | null): string {
    if (!isoString) return 'online';
    return `last seen ${this.formatTimestamp(isoString)}`;
  }
}
