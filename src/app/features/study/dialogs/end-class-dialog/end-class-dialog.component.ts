import { Component, output } from '@angular/core';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-end-class-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './end-class-dialog.component.html',
})
export class EndClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
