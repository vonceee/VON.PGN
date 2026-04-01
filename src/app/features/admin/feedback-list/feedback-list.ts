import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeedbackService, FeedbackItem, FeedbackType } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-feedback-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './feedback-list.html',
})
export class FeedbackListComponent {
  private feedbackService = inject(FeedbackService);

  feedbackItems = this.feedbackService.feedbackItems;
  selectedFilter = signal<FeedbackType | 'all'>('all');
  selectedFeedback = signal<FeedbackItem | null>(null);
  deleteTarget = signal<string | null>(null);

  filteredItems = computed(() => {
    const filter = this.selectedFilter();
    const items = this.feedbackItems();
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  });

  unreadCount = computed(() => this.feedbackService.unreadCount);

  typeLabels: Record<FeedbackType, string> = {
    bug: 'Bug Report',
    suggestion: 'Suggestion',
    general: 'General Feedback',
  };

  typeColors: Record<FeedbackType, string> = {
    bug: 'bg-red-500/10 text-red-500',
    suggestion: 'bg-amber-500/10 text-amber-500',
    general: 'bg-cyan-500/10 text-cyan-500',
  };

  setFilter(filter: FeedbackType | 'all') {
    this.selectedFilter.set(filter);
  }

  openFeedback(item: FeedbackItem) {
    this.selectedFeedback.set(item);
    if (!item.read) {
      this.feedbackService.markAsRead(item.id);
    }
  }

  closeFeedback() {
    this.selectedFeedback.set(null);
  }

  requestDelete(id: string) {
    this.deleteTarget.set(id);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const id = this.deleteTarget();
    if (id) {
      this.feedbackService.deleteFeedback(id);
      this.deleteTarget.set(null);
      if (this.selectedFeedback()?.id === id) {
        this.selectedFeedback.set(null);
      }
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
