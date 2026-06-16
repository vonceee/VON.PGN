import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { StudyChapter } from '../../../../core/models/study.model';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

export interface StudyMetadataDialogData {
  chapter: StudyChapter | null;
  canEdit: boolean;
}

@Component({
  selector: 'app-study-metadata-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './study-metadata-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class StudyMetadataDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<any>);
  data = inject<StudyMetadataDialogData>(DIALOG_DATA);

  canEdit = false;

  ngOnInit() {
    if (this.data) {
      this.canEdit = this.data.canEdit ?? false;
    }
  }

  displayItems = computed(() => {
    const t = this.data?.chapter?.pgn_tags || {};
    const items: { label: string; value: string; isPlaceholder: boolean }[] = [];

    const mapping = [
      { label: 'Tournament', key: 'Event' },
      { label: 'Site', key: 'Site' },
      { label: 'Date', key: 'Date' },
      { label: 'Round', key: 'Round' },
      { label: 'White', key: 'White', secondaryKey: 'WhiteElo', prefixKey: 'WhiteTitle' },
      { label: 'Black', key: 'Black', secondaryKey: 'BlackElo', prefixKey: 'BlackTitle' },
      { label: 'Result', key: 'Result' },
      { label: 'ECO Code', key: 'ECO' },
    ];

    mapping.forEach(m => {
      let value = t[m.key];
      if (value && value !== '?') {
        if (m.prefixKey && t[m.prefixKey] && t[m.prefixKey] !== '?') {
          value = `[${t[m.prefixKey]}] ${value}`;
        }
        if (m.secondaryKey && t[m.secondaryKey] && t[m.secondaryKey] !== '?') {
          value += ` (${t[m.secondaryKey]})`;
        }
        items.push({ label: m.label, value, isPlaceholder: false });
      } else {
        items.push({ label: m.label, value: '', isPlaceholder: true });
      }
    });

    return items;
  });

  onEdit() {
    this.dialogRef.close({ action: 'edit' });
  }
}
