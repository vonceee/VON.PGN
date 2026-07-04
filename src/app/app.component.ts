import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent, NetworkStatusComponent } from '@shared/feedback';
import { AuthService } from './core/services/auth.service';
import { GameService } from './core/services/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, NetworkStatusComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.css',
})
export class App {
  private authService = inject(AuthService);
  private gameService = inject(GameService);

  protected readonly title = signal('vonchess');

  constructor() {
    // Establish a global socket connection for presence and notifications
    // once the user is authenticated and the app is initialized.
    effect(() => {
      if (this.authService.isInitialized() && this.authService.isAuthenticated()) {
        this.gameService.connectSocket();
      }
    });
  }
}
