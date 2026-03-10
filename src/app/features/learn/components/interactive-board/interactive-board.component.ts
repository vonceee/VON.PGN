import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InteractiveTask } from '../../../../core/models/course.model';

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
})
export class InteractiveBoardComponent {
  private sanitizer = inject(DomSanitizer);
  safeUrl!: SafeResourceUrl;

  // use a setter so that every time a new task is passed in, we sanitize the new URL
  @Input({ required: true }) set task(value: InteractiveTask) {
    // tell Angular this Lichess URL is completely safe to embed
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(value.lichessUrl);
  }
}
