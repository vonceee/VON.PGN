import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { CoachService } from '../../coaches/services/coach.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private coachService = inject(CoachService);

  coursesCount = signal(0);
  coachesCount = computed(() => this.coachService.coaches().length);
  recentEnrollments = signal<any[]>([]);

  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.adminService.getCourses().subscribe({
        next: (data) => this.coursesCount.set(data.length),
        error: () => {}
      });

      this.loadRecentEnrollments();
    }
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
      default: return 'bg-subtle text-muted';
    }
  }
}