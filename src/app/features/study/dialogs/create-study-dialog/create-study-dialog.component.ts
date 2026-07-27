import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-create-study-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-study-dialog.component.html',
})
export class CreateStudyDialogComponent {
  dialogRef = inject(DialogRef<any>);

  name = signal('');
  visibility = signal<'public' | 'private' | 'unlisted'>('public');
  category = signal<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>('general');
  orientation = signal<'white' | 'black'>('white');

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({
        name: this.name().trim(),
        visibility: this.visibility(),
        category: this.category(),
        orientation: this.category() === 'opening_repertoire' ? this.orientation() : 'white'
      });
    }
  }
}
