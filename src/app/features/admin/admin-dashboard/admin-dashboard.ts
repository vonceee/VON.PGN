import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);

  courses = signal<any[]>([]);
  loading = signal(true);
  deleteCourseTarget = signal<number | null>(null);

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.loading.set(true);
    this.adminService.getCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load courses', err);
        this.loading.set(false);
      }
    });
  }

  requestDeleteCourse(id: number) {
    this.deleteCourseTarget.set(id);
  }

  cancelDeleteCourse() {
    this.deleteCourseTarget.set(null);
  }

  confirmDeleteCourse() {
    const id = this.deleteCourseTarget();
    if (!id) return;
    this.adminService.deleteCourse(id).subscribe({
      next: () => {
        this.toastService.show('Course deleted successfully', 'success');
        this.deleteCourseTarget.set(null);
        this.loadCourses();
      },
      error: (err) => {
        this.toastService.show('Failed to delete: ' + (err.error?.message || err.message), 'error');
        this.deleteCourseTarget.set(null);
      }
    });
  }
}
