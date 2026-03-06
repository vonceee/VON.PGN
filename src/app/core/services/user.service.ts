import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserProfile } from '../models/user.model';

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
}
