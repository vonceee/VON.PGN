import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private feedbackService = inject(FeedbackService);

  coursesCount = signal(0);
  feedbackCount = signal(0);
  coachesCount = signal(0);

  ngOnInit() {
    this.adminService.getCourses().subscribe({
      next: (data) => this.coursesCount.set(data.length),
      error: () => {}
    });

    this.feedbackCount.set(this.feedbackService.feedbackItems().length);

    this.loadCoachApplications();
  }

  loadCoachApplications() {
    this.adminService.getCoachApplications().subscribe({
      next: (data) => this.coachesCount.set(data.length),
      error: () => {}
    });
  }
}