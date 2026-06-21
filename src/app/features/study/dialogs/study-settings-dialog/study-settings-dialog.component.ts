import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-study-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './study-settings-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StudySettingsDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<any>);
  data = inject<any>(DIALOG_DATA);

  name = signal('');
  visibility = signal<'public' | 'private' | 'unlisted'>('public');
  engineVisibility = signal<'everyone' | 'owner'>('everyone');
  category = signal<'general' | 'opening_repertoire'>('general');
  orientation = signal<'white' | 'black'>('white');

  ngOnInit() {
    if (this.data) {
      this.name.set(this.data.name || '');
      this.visibility.set(this.data.visibility || 'public');
      this.engineVisibility.set(this.data.engine_visibility || 'everyone');
      this.category.set(this.data.category || 'general');
      this.orientation.set(this.data.orientation || 'white');
    }
  }

  onSubmit() {
    if (this.name().trim()) {
      this.dialogRef.close({
        action: 'save',
        name: this.name().trim(),
        visibility: this.visibility(),
        engine_visibility: this.engineVisibility(),
        category: this.category(),
        orientation: this.category() === 'opening_repertoire' ? this.orientation() : 'white'
      });
    }
  }

  onDelete() {
    this.dialogRef.close({ action: 'delete' });
  }

  onClearChat() {
    this.dialogRef.close({ action: 'clear_chat' });
  }
}
