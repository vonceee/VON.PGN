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

  @Input({ required: true }) set task(value: InteractiveTask) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(value.lichessUrl);
  }
}
