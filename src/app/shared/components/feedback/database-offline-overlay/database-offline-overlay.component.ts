import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-database-offline-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './database-offline-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseOfflineOverlayComponent {
  retryConnection(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
