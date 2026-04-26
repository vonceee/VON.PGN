import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { PaymentService } from '../../core/services/payment.service';
import { FollowUser } from '../../core/models/user.model';
import { FormsModule } from '@angular/forms';
import { GameHistoryComponent } from './game-history/game-history.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LoadingComponent } from '@shared/feedback';

import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, GameHistoryComponent, ButtonComponent, LoadingComponent, UserHovercardDirective],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private paymentService = inject(PaymentService);
  private route = inject(ActivatedRoute);

  user = this.userService.currentUser;

  isEditingBio = signal(false);
  bioDraft = signal('');
  isSavingBio = signal(false);
  isUpgrading = signal(false);

  showFollowModal = signal(false);
  activeTab = signal<'followers' | 'following'>('following');
  tabUsers = signal<FollowUser[]>([]);
  tabLoading = signal(false);
  tabCurrentPage = signal(1);
  tabLastPage = signal(1);
  tabSearchQuery = signal('');
  isLoadingMore = signal(false);
  showVerifiedFeature = signal(false);

  memberSince = computed(() => {
    const dateString = this.user()?.createdAt;
    if (!dateString) return 'Loading...';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  formattedFollowersCount = computed(() => this.formatCount(this.user()?.followers_count || 0));
  formattedFollowingCount = computed(() => this.formatCount(this.user()?.following_count || 0));

  ngOnInit() {
    // Handle payment callback
    const paymentStatus = this.route.snapshot.queryParamMap.get('payment');
    if (paymentStatus === 'success') {
      this.toastService.show('Payment successful! You are now a verified organizer.', 'success');
      // Reload profile to get updated verified_organizer status
      this.userService.loadMyProfile().subscribe();
    } else if (paymentStatus === 'cancelled') {
      this.toastService.show('Payment was cancelled.', 'error');
    } else {
      this.userService.loadMyProfile().subscribe();
    }
  }

  upgradeToVerified() {
    if (this.isUpgrading()) return;

    this.isUpgrading.set(true);
    this.paymentService.createCheckout().subscribe({
      next: (res) => {
        window.location.href = res.checkout_url;
      },
      error: () => {
        this.isUpgrading.set(false);
        this.toastService.show('Failed to start payment. Please try again.', 'error');
      }
    });
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

  startEditBio() {
    this.bioDraft.set(this.user()?.bio || '');
    this.isEditingBio.set(true);
  }

  cancelEditBio() {
    this.isEditingBio.set(false);
    this.bioDraft.set('');
  }

  saveBio() {
    if (this.isSavingBio()) return;

    this.isSavingBio.set(true);
    this.userService.updateBio(this.bioDraft()).subscribe({
      next: (updatedUser) => {
        this.userService.currentUser.set(updatedUser);
        this.userService.cacheProfile(updatedUser);
        this.isEditingBio.set(false);
        this.isSavingBio.set(false);
        this.toastService.show('Bio updated', 'success');
      },
      error: () => {
        this.isSavingBio.set(false);
        this.toastService.show('Failed to update bio', 'error');
      },
    });
  }

  private formatCount(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return count.toString();
  }
}
