import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ToastComponent, NetworkStatusComponent, DatabaseOfflineOverlayComponent } from '@shared/feedback';
import { AuthService } from './core/services/auth.service';
import { GameService } from './core/services/game.service';
import { LoadingService } from './core/services/loading.service';
import { NetworkStatusService } from './core/services/network-status.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, NetworkStatusComponent, DatabaseOfflineOverlayComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.css',
})
export class App {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  protected loadingService = inject(LoadingService);
  protected networkService = inject(NetworkStatusService);
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

    // Establish a global socket connection for presence and notifications
    // once the user is authenticated and the app is initialized.
    effect(() => {
      if (this.authService.isInitialized() && this.authService.isAuthenticated()) {
        this.gameService.connectSocket();
      }
    });
  }
}
