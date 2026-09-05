import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ToastComponent, NetworkStatusComponent, DatabaseOfflineOverlayComponent, BughouseInviteToastComponent } from '@shared/feedback';
import { AuthService } from './core/services/auth.service';
import { GameService } from './core/services/game.service';
import { LoadingService } from './core/services/loading.service';
import { DatabaseStatusService } from './core/services/database-status.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, BughouseInviteToastComponent, NetworkStatusComponent, DatabaseOfflineOverlayComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.css',
})
export class App {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  protected loadingService = inject(LoadingService);
  protected databaseStatusService = inject(DatabaseStatusService);
  private router = inject(Router);

  protected readonly title = signal('vonchess');

  constructor() {
    // Router events subscription to toggle the global loading state
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.start();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loadingService.stop();
      }
    });

  }
}
