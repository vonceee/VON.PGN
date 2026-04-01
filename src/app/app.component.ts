import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { FeedbackButtonComponent } from './shared/components/feedback-button/feedback-button.component';
import { SpeedInsights } from '@vercel/speed-insights/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, FeedbackButtonComponent, SpeedInsights],
  templateUrl: './app.component.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('VON.PGN');
}
