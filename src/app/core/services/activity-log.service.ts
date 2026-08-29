import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ActivityItem {
  id: string | number;
  type: 'study' | 'blog' | 'tournament';
  title: string;
  route: string[];
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Fetch recent creator activities. Handles errors gracefully by returning an empty array.
   */
  getRecentActivities(): Observable<ActivityItem[]> {
    return this.http.get<{ data: ActivityItem[] }>(`${this.apiUrl}/activity-logs`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Failed to load creator activity feed:', error);
        return of([]);
      })
    );
  }
}
