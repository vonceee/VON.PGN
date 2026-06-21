import { Component, output } from '@angular/core';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-start-class-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './start-class-dialog.component.html',
})
export class StartClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
