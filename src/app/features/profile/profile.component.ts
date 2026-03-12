import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { Header } from '../learn/components/header/header';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, Header],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);

  // 1. Grab the reactive signal from your service
  user = this.userService.currentUser;

  // 2. Computed Signals for the Progress Bar Math
  currentXp = computed(() => this.user()?.progress.experiencePoints || 0);
  level = computed(() => this.user()?.progress.currentLevel || 1);

  xpTotalForNextLevel = computed(() => (this.level() + 1) * 100);

  // how much XP is still needed to hit the next level
  xpToNextLevel = computed(() => Math.max(this.xpTotalForNextLevel() - this.currentXp(), 0));

  // Calculate the exact percentage for the cyan progress bar
  xpProgressPercent = computed(() => {
    const current = this.currentXp();
    const target = this.xpTotalForNextLevel();
    if (target === 0) return 0;

    // Math.min ensures the bar never visually exceeds 100%
    return Math.min(Math.floor((current / target) * 100), 100);
  });

  // 3. Computed Signal to format the MySQL timestamp perfectly
  memberSince = computed(() => {
    const dateString = this.user()?.createdAt;
    if (!dateString) return 'Loading...';

    // Turns "2026-03-06T02:46:51Z" into "Mar 2026"
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  toastService = inject(ToastService);

  ngOnInit() {
    this.userService.loadMyProfile().subscribe();
  }
}
