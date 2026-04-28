import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroAcademicCap,
  heroChatBubbleLeftEllipsis,
  heroIdentification,
  heroUserGroup,
  heroArrowUpRight,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  providers: [
    provideIcons({
      heroAcademicCap,
      heroChatBubbleLeftEllipsis,
      heroIdentification,
      heroUserGroup,
      heroArrowUpRight,
    }),
  ],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private feedbackService = inject(FeedbackService);

  coursesCount = signal(0);
  coachesCount = signal(0);
  recentEnrollments = signal<any[]>([]);

  // Reactive feedback count using computed signal
  feedbackCount = computed(() => this.feedbackService.feedbackItems().length);

  ngOnInit() {
    this.adminService.getCourses().subscribe({
      next: (data) => this.coursesCount.set(data.length),
      error: () => {}
    });

    this.loadCoachApplications();
    this.loadRecentEnrollments();
  }

  loadCoachApplications() {
    this.adminService.getCoachApplications().subscribe({
      next: (data) => this.coachesCount.set(data.length),
      error: () => {}
    });
  }

  loadRecentEnrollments() {
    this.adminService.getAcademyEnrollments().subscribe({
      next: (data) => {
        // Just take the last 5
        this.recentEnrollments.set(data.slice(0, 5));
      },
      error: () => {}
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'contacted': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'paid': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'cancelled': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  }
}