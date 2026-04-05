// src/app/features/coaches/coaches.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CoachService } from '../../core/services/coach.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './coaches.component.html'
})
export class CoachesComponent {
  coachService = inject(CoachService);
  authService = inject(AuthService);
  http = inject(HttpClient);

  coaches = this.coachService.coaches;
  userApplication = signal<any>(null);
  checkingApplication = signal(true);

  hasApplication = computed(() => this.userApplication() !== null);
  shouldShowBanner = computed(() => {
    const app = this.userApplication();
    const status = app?.status || 'pending';
    return this.hasApplication() && (status === 'pending' || !status);
  });
  applicationStatus = computed(() => {
    const app = this.userApplication();
    return app?.status || 'pending'; // Default to pending if status is missing
  });

  constructor() {
    this.checkUserApplication();
  }

  private checkUserApplication() {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.checkingApplication.set(false);
      return;
    }

    // Check if user has already submitted an application
    this.http.get<any>(`${environment.apiUrl}/coach-applications/my-status`)
      .subscribe({
        next: (response) => {
          if (response.has_application === false) {
            this.userApplication.set(null);
          } else {
            this.userApplication.set(response);
          }
          this.checkingApplication.set(false);
        },
        error: () => {
          this.userApplication.set(null);
          this.checkingApplication.set(false);
        }
      });
  }
}