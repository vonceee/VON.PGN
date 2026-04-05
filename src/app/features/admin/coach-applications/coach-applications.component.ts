import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CoachApplication } from '../../../core/models/coach-application.model';

@Component({
  selector: 'app-coach-applications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-applications.component.html',
})
export class CoachApplicationsComponent {
  private http = inject(HttpClient);

  applications = signal<CoachApplication[]>([]);
  loading = signal(true);
  selectedFilter = signal<CoachApplication['status'] | 'all'>('all');
  selectedApplication = signal<CoachApplication | null>(null);
  deleteTarget = signal<string | null>(null);

  constructor() {
    this.loadApplications();
  }

  filteredApplications = computed(() => {
    const filter = this.selectedFilter();
    const apps = this.applications();
    if (filter === 'all') return apps;
    return apps.filter((app) => app.status === filter);
  });

  pendingCount = computed(() => {
    return this.applications().filter(app => app.status === 'pending').length;
  });

  loadApplications() {
    this.http.get<CoachApplication[]>(`${environment.apiUrl}/admin/coach-applications`).subscribe({
      next: (applications) => {
        this.applications.set(applications);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load applications:', error);
        this.loading.set(false);
      }
    });
  }

  statusLabels: Record<CoachApplication['status'], string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  statusColors: Record<CoachApplication['status'], string> = {
    pending: 'bg-amber-500/10 text-amber-500',
    approved: 'bg-green-500/10 text-green-500',
    rejected: 'bg-red-500/10 text-red-500',
  };

  setFilter(filter: CoachApplication['status'] | 'all') {
    this.selectedFilter.set(filter);
  }

  openApplication(app: CoachApplication) {
    this.selectedApplication.set(app);
  }

  closeApplication() {
    this.selectedApplication.set(null);
  }

  approveApplication(id: string) {
    this.http.post(`${environment.apiUrl}/admin/coach-applications/${id}/approve`, {}).subscribe({
      next: (application: any) => {
        this.updateApplicationInList(application as CoachApplication);
        this.closeApplication();
      },
      error: (error) => console.error('Failed to approve application:', error)
    });
  }

  rejectApplication(id: string) {
    this.http.post(`${environment.apiUrl}/admin/coach-applications/${id}/reject`, {}).subscribe({
      next: (application: any) => {
        this.updateApplicationInList(application as CoachApplication);
        this.closeApplication();
      },
      error: (error) => console.error('Failed to reject application:', error)
    });
  }

  requestDelete(id: string) {
    this.deleteTarget.set(id);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const id = this.deleteTarget();
    if (id) {
      this.http.delete(`${environment.apiUrl}/admin/coach-applications/${id}`).subscribe({
        next: () => {
          this.applications.update(apps => apps.filter(app => app.id !== id));
          this.deleteTarget.set(null);
          if (this.selectedApplication()?.id === id) {
            this.selectedApplication.set(null);
          }
        },
        error: (error) => console.error('Failed to delete application:', error)
      });
    }
  }

  private updateApplicationInList(updatedApplication: CoachApplication) {
    this.applications.update(apps =>
      apps.map(app => app.id === updatedApplication.id ? updatedApplication : app)
    );
  }

  hasSocialMedia(app: CoachApplication): boolean {
    return Object.values(app.socialMedia).some(link => link && link.trim());
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}