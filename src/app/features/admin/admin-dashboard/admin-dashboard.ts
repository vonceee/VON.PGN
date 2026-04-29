import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [],
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

  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.adminService.getCourses().subscribe({
        next: (data) => this.coursesCount.set(data.length),
        error: () => {}
      });

      this.loadCoachApplications();
      this.loadRecentEnrollments();
    }
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
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'contacted': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'paid': return 'bg-indigo-100 text-indigo-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }
}