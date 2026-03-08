import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../core/services/user.service';
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

  // Simple RPG Math: Each level requires (Level * 100) total EXP.
  xpForNextLevel = computed(() => this.level() * 100);

  // Calculate the exact percentage for the cyan progress bar
  xpProgressPercent = computed(() => {
    const current = this.currentXp();
    const target = this.xpForNextLevel();
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

  ngOnInit() {
    this.userService.loadMyProfile();
  }

  // Add this method to the class
  simulateLectureComplete() {
    // We will just pass a random dummy ID for now
    const dummyId = 'lecture-' + Math.floor(Math.random() * 1000);
    this.userService.completeLecture(dummyId).subscribe();
  }
}
