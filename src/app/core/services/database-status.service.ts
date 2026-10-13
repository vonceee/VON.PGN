import { Injectable, signal } from '@angular/core';

/**
 * Monitors and maintains the database connectivity status (e.g. Supabase connection).
 * 
 * WHY: Provides a dedicated reactive signal for database-level outage overlays.
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
