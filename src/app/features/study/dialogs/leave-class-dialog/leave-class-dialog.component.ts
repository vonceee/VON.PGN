import { Component, output } from '@angular/core';

@Component({
  selector: 'app-leave-class-dialog',
  standalone: true,
  templateUrl: './leave-class-dialog.component.html',
})
export class LeaveClassDialogComponent {
  confirm = output<void>();
  cancel = output<void>();
}
