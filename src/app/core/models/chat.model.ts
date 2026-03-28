export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender: {
    id: number;
    name: string;
  };
  body: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  updated_at: string;
  temp_id?: string;
}

export interface ChatConversation {
  id: number;
  other_user: {
    id: number;
    name: string;
    is_online: boolean;
    last_seen_at: string | null;
  } | null;
  latest_message: ChatMessage | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface TypingEvent {
  user_id: number;
  user_name: string;
  is_typing: boolean;
}

export interface MessageReadEvent {
  user_id: number;
  last_read_message_id: number;
  read_at: string;
}

export interface UserStatusEvent {
  user_id: number;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
