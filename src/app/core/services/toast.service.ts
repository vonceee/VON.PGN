import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'level-up' | 'achievement';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'level-up' | 'achievement' = 'success', durationMs = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    
    this.toasts.update(currentToasts => [...currentToasts, { id, message, type }]);

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  remove(id: string) {
    this.toasts.update(currentToasts => currentToasts.filter(t => t.id !== id));
  }
}