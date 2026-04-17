import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './confirm-delete-modal.component.html',
})
export class ConfirmDeleteModalComponent {
  itemName = input.required<string>();
  itemType = input('item');
  loading = input(false);
  confirm = output<void>();
  cancel = output<void>();

  typedName = signal('');

  get canDelete(): boolean {
    return this.typedName().trim() === this.itemName();
  }

  onCancel() {
    this.typedName.set('');
    this.cancel.emit();
  }

  onConfirm() {
    if (this.canDelete) {
      this.confirm.emit();
    }
  }
}
