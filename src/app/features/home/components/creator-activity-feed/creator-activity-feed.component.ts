import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivityLogService, ActivityItem } from '../../../../core/services/activity-log.service';

@Component({
  selector: 'app-creator-activity-feed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './creator-activity-feed.component.html',
})
export class CreatorActivityFeedComponent implements OnInit {
  private activityService = inject(ActivityLogService);

  activities = signal<ActivityItem[]>([]);
  isLoading = signal(true);
  hasError = signal(false);

  ngOnInit() {
    this.loadActivities();
  }

  loadActivities() {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.activityService.getRecentActivities().subscribe({
      next: (data) => {
        this.activities.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load activity log feed:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }


  getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  parseTitle(title: string): { prefix: string; highlight: string } {
    const prefixes = ['Created study: ', 'Published blog: ', 'Scheduled tournament: '];
    for (const prefix of prefixes) {
      if (title.startsWith(prefix)) {
        return {
          prefix,
          highlight: title.substring(prefix.length)
        };
      }
    }
    return { prefix: '', highlight: title };
  }
}
