import { Component, inject, input, output, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { FollowUser } from '../../../../core/models/user.model';
import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-follow-modal',
  standalone: true,
  imports: [CommonModule, RouterLink, UserHovercardDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './follow-modal.component.html',
})
export class FollowModalComponent implements OnInit {
  private userService = inject(UserService);

  userId = input.required<string>();
  initialTab = input<'followers' | 'following'>('following');

  close = output<void>();

  activeTab = signal<'followers' | 'following'>('following');
  tabUsers = signal<FollowUser[]>([]);
  tabLoading = signal(false);
  tabCurrentPage = signal(1);
  tabLastPage = signal(1);
  tabSearchQuery = signal('');
  isLoadingMore = signal(false);

  ngOnInit() {
    this.activeTab.set(this.initialTab());
    this.loadTabUsers();
  }

  setTab(tab: 'followers' | 'following') {
    this.activeTab.set(tab);
    this.tabSearchQuery.set('');
    this.loadTabUsers();
  }

  closeFollowModal() {
    this.close.emit();
  }

  loadTabUsers() {
    const userId = this.userId();
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
    const userId = this.userId();

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
        // Reload current user profile to get updated counts
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
}
