import { Component, input, output, signal, effect, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Study } from '../../../../../core/models/study.model';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';

export type ChapterTab = 'empty' | 'editor' | 'fen' | 'pgn';

@Component({
  selector: 'app-study-add-chapter',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
      <!-- Chapter Name -->
      <div class="flex flex-col gap-2">
        <label for="chapter_name" class="text-sm">Chapter name</label>
        <input type="text" id="chapter_name" [ngModel]="newChapterName()" (ngModelChange)="newChapterName.set($event)"
          placeholder="e.g. Opening Analysis"
          class="w-full px-3 py-2 rounded-xl text-sm border border-border-base bg-main outline-none placeholder:text-muted/50" />
      </div>

      <!-- Orientation (Hidden for PGN) -->
      @if (newChapterActiveTab() !== 'pgn') {
      <div class="flex flex-col gap-2">
        <label for="orientation" class="text-sm">Orientation</label>
        <div class="relative w-full">
          <select id="orientation" [value]="newChapterOrientation()"
            (change)="onOrientationChange($any($event.target).value)"
            class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
            style="
                background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
                background-position: right 0.5rem center;
                background-size: 1.25rem;
              ">
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
      </div>
      }

      <!-- Chapter Source (Type) Dropdown -->
      <div class="flex flex-col gap-2">
        <label for="chapter_source" class="text-sm">Type</label>
        <div class="relative w-full">
          <select id="chapter_source" [value]="newChapterActiveTab()"
            (change)="onTabChange($any($event.target).value)"
            class="w-full px-3 py-2 bg-main border border-border-base rounded-xl text-sm appearance-none bg-no-repeat bg-right pr-8 focus:outline-none cursor-pointer"
            style="
              background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2394a3b8%22><path fill-rule=%22evenodd%22 d=%22M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z%22 clip-rule=%22evenodd%22 /></svg>');
              background-position: right 0.5rem center;
              background-size: 1.25rem;
            ">
            @for (tab of addChapterTabs; track tab.id) {
            <option [value]="tab.id">{{ tab.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Tab Content Area -->
      @if (newChapterActiveTab() === 'fen') {
      <div class="space-y-3">
        <label class="text-sm">Paste FEN</label>
        <input type="text" [ngModel]="newChapterFen()" (ngModelChange)="newChapterFen.set($event)"
          placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          class="w-full px-3 py-2 rounded-xl text-xs border border-border-base bg-main outline-none placeholder:text-muted/50" />
      </div>
      }

      @if (newChapterActiveTab() === 'pgn') {
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <input #fileInput type="file" multiple (change)="onNewChapterFilesSelected($event)" class="hidden"
            accept=".pgn">
          <button class="text-sm text-purple-500 underline cursor-pointer font-medium" (click)="fileInput.click()"
            [disabled]="isReadingFiles()">
            @if (isReadingFiles()) {
            Loading...
            } @else {
            Upload .pgn files
            }
          </button>
        </div>

        <textarea [ngModel]="newChapterPgn()" (ngModelChange)="newChapterPgn.set($event)" rows="4"
          placeholder="Paste PGN here..."
          class="w-full px-3 py-2 rounded-xl text-sm border border-border-base bg-main outline-none resize-none placeholder:text-muted/50"></textarea>
      </div>
      }

      <!-- Actions Footer -->
      <div class="flex gap-3 pt-2">
        <button appButton variant="outline" (click)="submitNewChapter()" [disabled]="!isNewChapterFormValid()" class="flex-1">
          <span>Create chapter</span>
        </button>
      </div>
    </div>
  `
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
