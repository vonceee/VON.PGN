import { Component, output } from '@angular/core';
@Component({
  selector: 'app-end-class-dialog',
  standalone: true,
  templateUrl: './end-class-dialog.component.html',
})
export class EndClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
