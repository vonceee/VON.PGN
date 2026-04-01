import { Injectable, signal } from '@angular/core';

export type FeedbackType = 'bug' | 'suggestion' | 'general';

export interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
  createdAt: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly storageKey = 'vonpgn_feedback';
  feedbackItems = signal<FeedbackItem[]>(this.loadFromStorage());

  private loadFromStorage(): FeedbackItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const items = JSON.parse(raw);
      return items.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));
    } catch {
      return [];
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.feedbackItems()));
  }

  addFeedback(data: { name: string; email: string; type: FeedbackType; message: string }): FeedbackItem {
    const item: FeedbackItem = {
      id: Math.random().toString(36).substring(2, 11),
      ...data,
      createdAt: new Date(),
      read: false,
    };
    this.feedbackItems.update((items) => [item, ...items]);
    this.saveToStorage();
    return item;
  }

  markAsRead(id: string) {
    this.feedbackItems.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    this.saveToStorage();
  }

  deleteFeedback(id: string) {
    this.feedbackItems.update((items) => items.filter((item) => item.id !== id));
    this.saveToStorage();
  }

  get unreadCount(): number {
    return this.feedbackItems().filter((item) => !item.read).length;
  }
}
