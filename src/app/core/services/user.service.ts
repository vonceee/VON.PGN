import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserProfile, Badge } from '../models/user.model';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  currentUser = signal<UserProfile | null>(null);

  loadMyProfile() {
    return this.http.get<{ data: UserProfile }>(`${environment.apiUrl}/profile`).pipe(
      tap({
        next: (response) => {
          this.currentUser.set(response.data);
        },
        error: (err) => {
          console.error('Failed to load user profile', err);
        },
      }),
    );
  }

  completeLecture(lessonId: string) {
    return this.http
      .post<{
        message: string;
        leveled_up: boolean;
        new_badges: Badge[];
        user: { data: UserProfile };
      }>(`${environment.apiUrl}/progress/complete-lecture`, { lesson_id: lessonId })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user.data);
        }),
      );
  }
}
