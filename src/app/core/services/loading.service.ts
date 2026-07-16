import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private activeCount = signal(0);
  public isLoading = signal(false);

  start() {
    this.activeCount.update(c => c + 1);
    this.isLoading.set(this.activeCount() > 0);
  }

  stop() {
    this.activeCount.update(c => Math.max(0, c - 1));
    this.isLoading.set(this.activeCount() > 0);
  }
}
