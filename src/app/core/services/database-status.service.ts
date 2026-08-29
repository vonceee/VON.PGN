import { Injectable, signal } from '@angular/core';

/**
 * Monitors and maintains the database connectivity status (e.g. Supabase connection).
 * 
 * WHY: Decoupled from NetworkStatusService to avoid circular dependency path:
 *      NetworkStatusService -> GameService -> AuthService -> HttpClient -> Interceptor -> NetworkStatusService.
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseStatusService {
  isOffline = signal<boolean>(false);

  /**
   * Sets the database offline status.
   */
  setOffline(isOffline: boolean): void {
    if (isOffline !== this.isOffline()) {
      this.isOffline.set(isOffline);
    }
  }
}
