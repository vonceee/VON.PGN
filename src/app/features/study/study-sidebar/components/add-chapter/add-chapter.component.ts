import { Component, input, output, signal, effect, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../../../core/models/study.model';
import { SelectComponent, SelectItem, TextInputComponent } from '@shared/ui';

export type ChapterTab = 'empty' | 'editor' | 'fen' | 'pgn';

@Component({
  selector: 'app-study-add-chapter',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, TextInputComponent],
  templateUrl: './add-chapter.component.html'
})
export class AddChapterComponent {
  study = input.required<Study | null>();
  canEdit = input.required<boolean>();

  newChapterActiveTab = model<ChapterTab>('empty');
  newChapterOrientation = model<'white' | 'black'>('white');
  newChapterFen = model<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  chapterCreated = output<{ name: string; type: ChapterTab; fen: string; pgn: string; orientation: 'white' | 'black' }>();

  newChapterName = signal('');
  newChapterPgn = signal('');
  isReadingFiles = signal(false);
  fileSummary = signal('');

  readonly orientationOptions: SelectItem<'white' | 'black'>[] = [
    { label: 'White', value: 'white' },
    { label: 'Black', value: 'black' },
  ];

  readonly chapterTabOptions: SelectItem<ChapterTab>[] = [
    { label: 'Empty board (Standard game)', value: 'empty' },
    { label: 'Board editor (Set pieces manually)', value: 'editor' },
    { label: 'FEN input (Load custom position)', value: 'fen' },
    { label: 'PGN file/text (Import games)', value: 'pgn' },
  ];

  addChapterTabs: { id: ChapterTab; label: string }[] = [
    { id: 'empty', label: 'Empty board (Standard game)' },
    { id: 'editor', label: 'Board editor (Set pieces manually)' },
    { id: 'fen', label: 'FEN input (Load custom position)' },
    { id: 'pgn', label: 'PGN file/text (Import games)' },
  ];

  constructor() {
    effect(() => {
      const s = this.study();
      if (s) {
        this.newChapterName.set(`Chapter ${(s.chapters?.length ?? 0) + 1}`);
      }
    });
  }

  onTabChange(tab: ChapterTab) {
    this.newChapterActiveTab.set(tab);
  }

  onOrientationChange(orientation: 'white' | 'black') {
    this.newChapterOrientation.set(orientation);
  }

  isNewChapterFormValid(): boolean {
    if (!this.newChapterName().trim()) return false;
    if (this.newChapterActiveTab() === 'pgn' && !this.newChapterPgn().trim()) return false;
    if (this.newChapterActiveTab() === 'fen' && !this.newChapterFen().trim()) return false;
    return true;
  }

  onNewChapterFilesSelected(event: any) {
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
      this.newChapterPgn.update(current => current ? current + '\n\n' + combinedPgn : combinedPgn);
      this.fileSummary.set(`Successfully loaded ${files.length} file(s)`);
      this.isReadingFiles.set(false);
      event.target.value = '';
    }).catch(err => {
      console.error('Error reading files:', err);
      this.isReadingFiles.set(false);
    });
  }

  submitNewChapter() {
    if (!this.isNewChapterFormValid()) return;

    this.chapterCreated.emit({
      name: this.newChapterName().trim(),
      type: this.newChapterActiveTab(),
      orientation: this.newChapterOrientation(),
      fen: this.newChapterFen(),
      pgn: this.newChapterPgn()
    });
  }
}
