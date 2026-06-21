import { Component, inject, signal, OnInit, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { BoardEditorComponent } from '../../../../shared/components/chess/board-editor/board-editor.component';

export type ChapterTab = 'empty' | 'editor' | 'fen' | 'pgn';

export interface AddChapterDialogResult {
  name: string;
  type: ChapterTab;
  orientation?: 'white' | 'black';
  fen?: string;
  pgn?: string;
}

@Component({
  selector: 'app-add-chapter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    BoardEditorComponent,
  ],
  templateUrl: './add-chapter-dialog.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AddChapterDialogComponent implements OnInit {
  @ViewChild('editor') boardEditor?: BoardEditorComponent;
  dialogRef = inject(DialogRef<AddChapterDialogResult>);
  data = inject<{
    defaultName?: string;
    tab?: ChapterTab;
  }>(DIALOG_DATA, { optional: true });

  name = signal('');
  activeTab = signal<ChapterTab>('empty');
  orientation = signal<'white' | 'black'>('white');
  fen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  pgn = signal('');
  isReadingFiles = signal(false);
  fileSummary = signal('');

  readonly tabs: { id: ChapterTab; label: string }[] = [
    { id: 'empty', label: 'Empty' },
    { id: 'editor', label: 'Editor' },
    { id: 'fen', label: 'FEN' },
    { id: 'pgn', label: 'PGN' },
  ];

  constructor() {
    effect(() => {
      const isEditor = this.activeTab() === 'editor';
      this.dialogRef.updateSize(isEditor ? '768px' : '450px');
    });
  }

  ngOnInit() {
    if (this.data?.defaultName) {
      this.name.set(this.data.defaultName);
    }
    if (this.data?.tab) {
      this.activeTab.set(this.data.tab);
    }
  }

  isFormValid(): boolean {
    if (!this.name().trim()) return false;
    if (this.activeTab() === 'pgn' && !this.pgn().trim()) return false;
    if (this.activeTab() === 'fen' && !this.fen().trim()) return false;
    return true;
  }

  onFilesSelected(event: any) {
    const files = event.target.files as FileList;
    if (!files || files.length === 0) return;

    this.isReadingFiles.set(true);
    const readers: Promise<string>[] = [];

    Array.from(files).forEach(file => {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      }));
    });

    Promise.all(readers).then(contents => {
      const combinedPgn = contents.join('\n\n');
      this.pgn.update(current => current ? current + '\n\n' + combinedPgn : combinedPgn);
      this.fileSummary.set(`Successfully loaded ${files.length} file(s)`);
      this.isReadingFiles.set(false);

      // Reset file input so same files can be selected again if needed
      event.target.value = '';
    }).catch(err => {
      console.error('Error reading files:', err);
      this.isReadingFiles.set(false);
    });
  }

  onSubmit() {
    if (this.isFormValid()) {
      const result: AddChapterDialogResult = {
        name: this.name().trim(),
        type: this.activeTab(),
        orientation: this.orientation(),
      };

      if (this.activeTab() === 'editor' && this.boardEditor) {
        result.fen = this.boardEditor.getFen();
      } else if (this.activeTab() === 'fen') {
        result.fen = this.fen();
      } else if (this.activeTab() === 'pgn') {
        result.pgn = this.pgn();
      }

      this.dialogRef.close(result);
    }
  }
}

