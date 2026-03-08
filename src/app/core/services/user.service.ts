import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserProfile } from '../models/user.model';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  // signal that holds our user data. starts as null.
  currentUser = signal<UserProfile | null>(null);

  loadMyProfile() {
    this.http.get<{ data: UserProfile }>(`http://127.0.0.1:8000/api/profile`).subscribe({
      next: (response) => {
        this.currentUser.set(response.data);
      },
      error: (err) => {
        console.error('Failed to load user profile', err);
      },
    });
  }

  // Inside user.service.ts

  completeLecture(lessonId: string) {
    // We send a POST request with the lesson ID
    return this.http
      .post<{
        message: string;
        leveled_up: boolean;
        user: { data: UserProfile };
      }>(`http://127.0.0.1:8000/api/progress/complete-lecture`, { lesson_id: lessonId })
      .pipe(
        tap((response) => {
          // BOOM! The moment this succeeds, we overwrite the Signal.
          // Angular will instantly recalculate the math and animate the progress bar!
          this.currentUser.set(response.user.data);

          if (response.leveled_up) {
            console.log('🎉 LEVEL UP!'); // You can trigger a toast notification here later!
          }
        }),
      );
  }
}
