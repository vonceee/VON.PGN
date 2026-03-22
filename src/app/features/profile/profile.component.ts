import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);

  user = this.userService.currentUser;

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
    if (!dateString) return 'Loading...';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  toastService = inject(ToastService);

  ngOnInit() {
    this.userService.loadMyProfile().subscribe();
  }
}
