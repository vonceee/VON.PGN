import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { FeedbackButtonComponent } from './shared/components/feedback-button/feedback-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, FeedbackButtonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('vonchess');
}
