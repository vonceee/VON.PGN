import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UserProfile, FollowUser } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-profile.component.html',
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  user = signal<UserProfile | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  isFollowing = signal(false);
  followersCount = signal(0);
  followingCount = signal(0);
  isFollowLoading = signal(false);
  isMessaging = signal(false);

  activeTab = signal<'followers' | 'following'>('followers');
  tabUsers = signal<FollowUser[]>([]);
  tabLoading = signal(false);
  tabCurrentPage = signal(1);
  tabLastPage = signal(1);
  tabSearchQuery = signal('');
  isLoadingMore = signal(false);

  isAuthenticated = this.authService.isAuthenticated;

  isOwnProfile = computed(() => {
    const currentUser = this.authService.currentUser();
    const profileUser = this.user();
    if (!currentUser || !profileUser) return false;
    return String(currentUser.id) === profileUser.uid;
  });

  currentXp = computed(() => this.user()?.progress.experiencePoints || 0);
  level = computed(() => this.user()?.progress.currentLevel || 1);

  xpTotalForNextLevel = computed(() => (this.level() + 1) * 100);
  xpToNextLevel = computed(() => Math.max(this.xpTotalForNextLevel() - this.currentXp(), 0));
  xpProgressPercent = computed(() => {
    const current = this.currentXp();
    const target = this.xpTotalForNextLevel();
    if (target === 0) return 0;
    return Math.min(Math.floor((current / target) * 100), 100);
  });

  memberSince = computed(() => {
    const dateString = this.user()?.createdAt;
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  formattedFollowersCount = computed(() => this.formatCount(this.followersCount()));
  formattedFollowingCount = computed(() => this.formatCount(this.followingCount()));

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.error.set('User not found');
      this.isLoading.set(false);
      return;
    }

    this.userService.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.user.set(profile);
        this.isFollowing.set(profile.is_following);
        this.followersCount.set(profile.followers_count);
        this.followingCount.set(profile.following_count);
        this.isLoading.set(false);
        this.loadTabUsers();
      },
      error: () => {
        this.error.set('User not found');
        this.isLoading.set(false);
      },
    });
  }

  toggleFollow() {
    if (!this.isAuthenticated() || this.isOwnProfile() || this.isFollowLoading()) return;

    const userId = this.user()?.uid;
    if (!userId) return;

    this.isFollowLoading.set(true);
    const wasFollowing = this.isFollowing();

    // Optimistic update
    this.isFollowing.set(!wasFollowing);
    this.followersCount.update((c) => wasFollowing ? c - 1 : c + 1);

    const request = wasFollowing
      ? this.userService.unfollowUser(userId)
      : this.userService.followUser(userId);

    request.subscribe({
      next: (res) => {
        this.isFollowing.set(res.is_following);
        this.followersCount.set(res.followers_count);
        this.isFollowLoading.set(false);
      },
      error: () => {
        // Rollback
        this.isFollowing.set(wasFollowing);
        this.followersCount.update((c) => wasFollowing ? c + 1 : c - 1);
        this.isFollowLoading.set(false);
      },
    });
  }

  messageUser() {
    if (!this.isAuthenticated() || this.isOwnProfile() || this.isMessaging()) return;

    const userId = this.user()?.uid;
    if (!userId) return;

    this.isMessaging.set(true);

    this.chatService.openConversationWith(parseInt(userId)).subscribe({
      next: () => {
        this.isMessaging.set(false);
        this.router.navigate(['/chat']);
      },
      error: () => {
        this.isMessaging.set(false);
      },
    });
  }

  setTab(tab: 'followers' | 'following') {
    this.activeTab.set(tab);
    this.tabSearchQuery.set('');
    this.loadTabUsers();
  }

  loadTabUsers() {
    if (!this.user()) return;

    this.tabLoading.set(true);
    this.tabCurrentPage.set(1);
    this.tabUsers.set([]);

    const userId = this.user()!.uid;
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
      next: (res) => {
        this.tabUsers.update((users) =>
          users.map((u) =>
            u.uid === userId ? { ...u, is_following: res.is_following } : u
          )
        );
        // Update own following count if on someone else's profile
        if (!this.isOwnProfile()) {
          this.followingCount.update((c) => res.is_following ? c + 1 : c - 1);
        }
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
}
