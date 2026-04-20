import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/ui';
import { Dialog } from '@angular/cdk/dialog';
import { FeedbackModalComponent } from '../feedback-modal/feedback-modal.component';

@Component({
  selector: 'app-feedback-button',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './feedback-button.component.html',
})
export class FeedbackButtonComponent {
  private router = inject(Router);
  private dialog = inject(Dialog);

  showButton = computed(() => {
    const url = this.router.url;
    return url === '/' || url === '' || url === '/home';
  });

  openModal() {
    this.dialog.open(FeedbackModalComponent, {
      maxWidth: '95vw',
      backdropClass: 'bg-slate-950/80',
    });
  }
}


