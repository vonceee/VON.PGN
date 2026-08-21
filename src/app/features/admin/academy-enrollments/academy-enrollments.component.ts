import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-academy-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [],
  templateUrl: './academy-enrollments.html',
})
export class AcademyEnrollmentsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);

  enrollments = signal<any[]>([]);
  isLoading = signal(true);
  searchTerm = signal('');
  statusFilter = signal('');

  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadEnrollments();
    }
  }

  loadEnrollments() {
    this.isLoading.set(true);
    const params: any = {};
    if (this.searchTerm()) params.search = this.searchTerm();
    if (this.statusFilter()) params.status = this.statusFilter();

    this.adminService.getAcademyEnrollments(params).subscribe({
      next: (data) => {
        this.enrollments.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load enrollments', 'error');
        this.isLoading.set(false);
      }
    });
  }

  updateStatus(id: number, status: string) {
    this.adminService.updateAcademyEnrollmentStatus(id, status).subscribe({
      next: () => {
        this.toastService.show('Status updated');
        this.loadEnrollments();
      },
      error: () => this.toastService.show('Failed to update status', 'error')
    });
  }

  deleteEnrollment(id: number) {
    if (confirm('Are you sure you want to delete this enrollment?')) {
      this.adminService.deleteAcademyEnrollment(id).subscribe({
        next: () => {
          this.toastService.show('Enrollment deleted');
          this.loadEnrollments();
        },
        error: () => this.toastService.show('Failed to delete enrollment', 'error')
      });
    }
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-500';
      case 'contacted': return 'bg-blue-600/10 text-blue-600';
      case 'confirmed': return 'bg-blue-500/10 text-blue-500';
      case 'paid': return 'bg-emerald-500/10 text-emerald-500';
      case 'cancelled': return 'bg-rose-500/10 text-rose-500';
      default: return 'bg-slate-500/10 ';
    }
  }
}

