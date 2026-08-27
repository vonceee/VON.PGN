import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join-class-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './join-class-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class JoinClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
