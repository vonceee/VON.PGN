import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';

@Component({
  selector: 'app-create-study-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, SelectComponent],
  templateUrl: './create-study-dialog.component.html',
})
export class CreateStudyDialogComponent {
  dialogRef = inject(DialogRef<any>);

  name = signal('');
  visibility = signal<'public' | 'private' | 'unlisted'>('public');
  category = signal<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>('general');
  orientation = signal<'white' | 'black'>('white');

  readonly visibilityOptions: SelectItem<'public' | 'private' | 'unlisted'>[] = [
    { label: 'Public (Everyone can see)', value: 'public' },
    { label: 'Unlisted (Hidden from search)', value: 'unlisted' },
    { label: 'Private (Only me)', value: 'private' },
  ];

  readonly categoryOptions: SelectItem<'general' | 'opening_repertoire' | 'middlegame' | 'endgame'>[] = [
    { label: 'General study', value: 'general' },
    { label: 'Opening repertoire', value: 'opening_repertoire' },
    { label: 'Middlegame', value: 'middlegame' },
    { label: 'Endgame', value: 'endgame' },
  ];

  readonly orientationOptions: SelectItem<'white' | 'black'>[] = [
    { label: 'White repertoire', value: 'white' },
    { label: 'Black repertoire', value: 'black' },
  ];

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
