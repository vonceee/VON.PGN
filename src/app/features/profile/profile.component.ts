import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { FlagIconComponent } from '@shared/ui';
import { StudyService } from '../../core/services/study.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Study } from '../../core/models/study.model';
import { Tournament } from '../../core/models/tournament.model';
import { FollowModalComponent } from './components/follow-modal/follow-modal.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FlagIconComponent, FollowModalComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private studyService = inject(StudyService);
  private tournamentService = inject(TournamentService);

  studies = signal<Study[]>([]);
  tournaments = signal<Tournament[]>([]);
  loadingStudies = signal(true);
  loadingBookmarks = signal(true);
  removingId = signal<string | null>(null);

  user = this.userService.currentUser;

  showFollowModal = signal(false);
  activeTab = signal<'followers' | 'following'>('following');

  memberSince = computed(() => {
    const dateString = this.user()?.createdAt;
    if (!dateString) return 'Loading...';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  formattedFollowersCount = computed(() => this.formatCount(this.user()?.followers_count || 0));
  formattedFollowingCount = computed(() => this.formatCount(this.user()?.following_count || 0));

  ngOnInit() {
    this.userService.loadMyProfile().subscribe();
    this.loadStudies();
    this.loadBookmarks();
  }

  openFollowModal(tab: 'followers' | 'following') {
    this.activeTab.set(tab);
    this.showFollowModal.set(true);
  }

  closeFollowModal() {
    this.showFollowModal.set(false);
  }


  private formatCount(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return count.toString();
  }

  private loadStudies() {
    this.loadingStudies.set(true);
    this.studyService.getStudies(true).subscribe({
      next: (res) => {
        const list = res.data || res;
        this.studies.set(Array.isArray(list) ? list.slice(0, 3) : []);
        this.loadingStudies.set(false);
      },
      error: () => {
        this.loadingStudies.set(false);
      }
    });
  }

  private loadBookmarks() {
    this.loadingBookmarks.set(true);
    this.tournamentService.getBookmarkedTournaments().subscribe({
      next: (data) => {
        this.tournaments.set(Array.isArray(data) ? data.slice(0, 3) : []);
        this.loadingBookmarks.set(false);
      },
      error: () => {
        this.loadingBookmarks.set(false);
      }
    });
  }

  removeBookmark(tournament: Tournament) {
    if (this.removingId()) return;

    this.removingId.set(tournament.id);
    this.tournamentService.toggleBookmark(tournament.id).subscribe({
      next: () => {
        this.tournaments.update(list => list.filter(t => t.id !== tournament.id));
        this.removingId.set(null);
        this.toastService.show('Bookmark removed', 'success');
      },
      error: () => {
        this.removingId.set(null);
        this.toastService.show('Failed to remove bookmark', 'error');
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return this.formatDate(dateStr);
  }
}
