import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: {
    study_id?: number;
    study_name?: string;
    owner_name?: string;
    message: string;
    action_url: string;
    type: string;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  isLoading = signal(false);

  getNotifications(): Observable<any> {
    this.isLoading.set(true);
    return this.http.get<any>(this.apiUrl).pipe(
      tap(res => {
        this.notifications.set(res.data || res);
        this.isLoading.set(false);
      })
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(res => this.unreadCount.set(res.count))
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/mark-read`, {}).pipe(
      tap(() => {
        this.notifications.update(prev => 
          prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(`${this.apiUrl}/mark-all-read`, {}).pipe(
      tap(() => {
        this.notifications.update(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        this.unreadCount.set(0);
      })
    );
  }
}
