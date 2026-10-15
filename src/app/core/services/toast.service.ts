import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'achievement';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'achievement' = 'success', durationMs = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    
    this.toasts.update(currentToasts => [...currentToasts, { id, message, type }]);

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  success(message: string, durationMs = 4000) {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 4000) {
    this.show(message, 'error', durationMs);
  }

  remove(id: string) {
    this.toasts.update(currentToasts => currentToasts.filter(t => t.id !== id));
  }
}