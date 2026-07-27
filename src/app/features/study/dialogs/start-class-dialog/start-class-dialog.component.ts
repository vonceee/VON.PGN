import { Component, output } from '@angular/core';

@Component({
  selector: 'app-start-class-dialog',
  standalone: true,
  templateUrl: './start-class-dialog.component.html',
})
export class StartClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
