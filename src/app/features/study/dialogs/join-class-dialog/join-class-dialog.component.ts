import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-join-class-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
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
