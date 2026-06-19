import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { FollowUser } from '../../core/models/user.model';
import { LoadingComponent } from '@shared/feedback';
import { FlagIconComponent, ButtonComponent } from '@shared/ui';
import { StudyService } from '../../core/services/study.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Study } from '../../core/models/study.model';
import { Tournament } from '../../core/models/tournament.model';

import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, UserHovercardDirective, FlagIconComponent, ButtonComponent],
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
  tabUsers = signal<FollowUser[]>([]);
  tabLoading = signal(false);
  tabCurrentPage = signal(1);
  tabLastPage = signal(1);
  tabSearchQuery = signal('');
  isLoadingMore = signal(false);

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

  setTab(tab: 'followers' | 'following') {
    this.activeTab.set(tab);
    this.tabSearchQuery.set('');
    this.loadTabUsers();
  }

  openFollowModal(tab: 'followers' | 'following') {
    this.activeTab.set(tab);
    this.tabSearchQuery.set('');
    this.showFollowModal.set(true);
    this.loadTabUsers();
  }

  closeFollowModal() {
    this.showFollowModal.set(false);
  }

  loadTabUsers() {
    const userId = this.user()?.uid;
    if (!userId) return;

    this.tabLoading.set(true);
    this.tabCurrentPage.set(1);
    this.tabUsers.set([]);

    const request = this.activeTab() === 'followers'
      ? this.userService.getFollowers(userId, 1, this.tabSearchQuery())
      : this.userService.getFollowing(userId, 1, this.tabSearchQuery());

    request.subscribe({
      next: (res) => {
        this.tabUsers.set(res.data);
        this.tabCurrentPage.set(res.meta.current_page);
        this.tabLastPage.set(res.meta.last_page);
        this.tabLoading.set(false);
      },
      error: () => {
        this.tabLoading.set(false);
      },
    });
  }

  loadMoreTabUsers() {
    if (this.isLoadingMore() || this.tabCurrentPage() >= this.tabLastPage()) return;

    this.isLoadingMore.set(true);
    const nextPage = this.tabCurrentPage() + 1;
    const userId = this.user()!.uid;

    const request = this.activeTab() === 'followers'
      ? this.userService.getFollowers(userId, nextPage, this.tabSearchQuery())
      : this.userService.getFollowing(userId, nextPage, this.tabSearchQuery());

    request.subscribe({
      next: (res) => {
        this.tabUsers.update((users) => [...users, ...res.data]);
        this.tabCurrentPage.set(res.meta.current_page);
        this.tabLastPage.set(res.meta.last_page);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoadingMore.set(false);
      },
    });
  }

  onTabSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.tabSearchQuery.set(value);
    this.loadTabUsers();
  }

  toggleTabUserFollow(userItem: FollowUser) {
    const userId = userItem.uid;
    const wasFollowing = userItem.is_following;

    // Optimistic update in the list
    this.tabUsers.update((users) =>
      users.map((u) =>
        u.uid === userId ? { ...u, is_following: !wasFollowing } : u
      )
    );

    const request = wasFollowing
      ? this.userService.unfollowUser(userId)
      : this.userService.followUser(userId);

    request.subscribe({
      next: () => {
        // Reload profile to get updated counts
        this.userService.loadMyProfile().subscribe();
      },
      error: () => {
        // Rollback
        this.tabUsers.update((users) =>
          users.map((u) =>
            u.uid === userId ? { ...u, is_following: wasFollowing } : u
          )
        );
      },
    });
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
