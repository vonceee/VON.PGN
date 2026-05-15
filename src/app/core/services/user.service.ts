import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UserProfile, Badge, FollowUser, PaginatedResponse } from '../models/user.model';
import { tap, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserSearchResult {
  uid: string;
  username: string;
  displayName: string;
}

export interface FollowStatusResponse {
  is_following: boolean;
  followers_count: number;
  following_count: number;
}

export interface FollowActionResponse {
  message: string;
  is_following: boolean;
  followers_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private readonly profileKey = 'chess_user_profile';

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  currentUser = signal<UserProfile | null>(null);
  private profileCache = new Map<string, { profile: UserProfile; expiry: number }>();

  getUserProfileByUsername(username: string) {
    // Check cache
    const cached = this.profileCache.get(username);
    if (cached && cached.expiry > Date.now()) {
      return of(cached.profile);
    }

    return this.http
      .get<{ data: UserProfile }>(`${environment.apiUrl}/users/${username}`)
      .pipe(
        map((res) => res.data),
        tap((profile) => {
          // Cache management: Keep cache size reasonable
          if (this.profileCache.size > 100) {
            this.profileCache.clear();
          }
          
          // Cache for 30 seconds
          this.profileCache.set(username, {
            profile,
            expiry: Date.now() + 30000,
          });
        })
      );
  }

  getCachedProfile(): UserProfile | null {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem(this.profileKey);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      localStorage.removeItem(this.profileKey);
      return null;
    }
  }

  cacheProfile(profile: UserProfile): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.profileKey, JSON.stringify(profile));
  }

  clearCachedProfile(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.profileKey);
  }

  loadMyProfile() {
    if (!this.isBrowser) return of(null as any);

    return this.http.get<{ data: UserProfile }>(`${environment.apiUrl}/profile`).pipe(
      tap({
        next: (response) => {
          this.currentUser.set(response.data);
          this.cacheProfile(response.data);
        },
        error: (err) => {
          console.error('Failed to load user profile', err.status, err.message);
        },
      }),
      catchError(() => of(null as any))
    );
  }

  searchUsers(query: string) {
    return this.http
      .get<{ data: UserSearchResult[] }>(`${environment.apiUrl}/users/search`, {
        params: { q: query },
      })
      .pipe(map((res) => res.data));
  }

  getUserProfile(id: string) {
    return this.http
      .get<{ data: UserProfile }>(`${environment.apiUrl}/users/${id}`)
      .pipe(map((res) => res.data));
  }

  followUser(userId: string) {
    return this.http
      .post<FollowActionResponse>(`${environment.apiUrl}/users/${userId}/follow`, {});
  }

  unfollowUser(userId: string) {
    return this.http
      .delete<FollowActionResponse>(`${environment.apiUrl}/users/${userId}/follow`);
  }

  getFollowStatus(userId: string) {
    return this.http
      .get<FollowStatusResponse>(`${environment.apiUrl}/users/${userId}/follow-status`);
  }

  getFollowers(userId: string, page = 1, search = '') {
    const params: Record<string, string> = { page: page.toString(), per_page: '15' };
    if (search) params['search'] = search;
    return this.http
      .get<PaginatedResponse<FollowUser>>(`${environment.apiUrl}/users/${userId}/followers`, { params });
  }

  getFollowing(userId: string, page = 1, search = '') {
    const params: Record<string, string> = { page: page.toString(), per_page: '15' };
    if (search) params['search'] = search;
    return this.http
      .get<PaginatedResponse<FollowUser>>(`${environment.apiUrl}/users/${userId}/following`, { params });
  }

  completeLecture(lessonId: string) {
    return this.http
      .post<{
        message: string;
        new_badges: Badge[];
        user: { data: UserProfile };
      }>(`${environment.apiUrl}/progress/complete-lecture`, { lesson_id: lessonId })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user.data);
          this.cacheProfile(response.user.data);
        }),
      );
  }

  updateBio(bio: string) {
    return this.http
      .put<{ data: UserProfile }>(`${environment.apiUrl}/profile/bio`, { bio })
      .pipe(map((res) => res.data));
  }

  updatePreferences(preferences: any) {
    return this.http
      .put<{ data: UserProfile }>(`${environment.apiUrl}/profile/preferences`, preferences)
      .pipe(
        tap((response) => {
          this.currentUser.set(response.data);
          this.cacheProfile(response.data);
        }),
        map((res) => res.data)
      );
  }
}
