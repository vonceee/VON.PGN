import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ChessBoardComponent } from '@shared/chess';

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
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent, ChessBoardComponent],
  template: `
    <app-dialog-wrapper title="New Chapter" (close)="dialogRef.close()">
      <div class="space-y-6">
        <!-- Chapter Name & Orientation -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Chapter Name</label>
            <input
              type="text"
              [(ngModel)]="name"
              placeholder="e.g. Chapter 1"
              class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all"
              autofocus
            />
          </div>

          @if (activeTab() !== 'pgn') {
            <div class="space-y-2">
              <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Orientation</label>
              <select
                [(ngModel)]="orientation"
                class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none dark:text-white transition-all"
              >
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>
          }
        </div>

        <!-- Tab Switcher -->
        <div class="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
              [class.bg-white]="activeTab() === tab.id"
              [class.dark:bg-zinc-800]="activeTab() === tab.id"
              [class.shadow-sm]="activeTab() === tab.id"
              [class.text-cyan-600]="activeTab() === tab.id"
              [class.dark:text-cyan-400]="activeTab() === tab.id"
              [class.text-slate-500]="activeTab() !== tab.id"
              [class.hover:text-slate-700]="activeTab() !== tab.id"
              [class.dark:hover:text-slate-300]="activeTab() !== tab.id"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Tab Content -->
        <div class="min-h-[120px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          @if (activeTab() === 'empty') {
            <p class="text-sm text-slate-500 dark:text-slate-400 py-4">
              Create a new chapter starting from the standard initial position.
            </p>
          }

          @if (activeTab() === 'editor') {
            <div class="space-y-4">
              <div class="flex justify-center bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <app-chess-board 
                  [size]="280" 
                  [fen]="fen()" 
                  (fenChange)="fen.set($event)"
                  [orientation]="orientation()"
                  [resizable]="false"
                ></app-chess-board>
              </div>
              <p class="text-xs text-center text-slate-500">Drag pieces to set up the starting position.</p>
            </div>
          }

          @if (activeTab() === 'fen') {
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-slate-500">Paste FEN</label>
                <input
                  type="text"
                  [(ngModel)]="fen"
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none dark:text-white transition-all"
                />
              </div>
              <div class="flex justify-center opacity-60 pointer-events-none scale-75">
                 <app-chess-board [size]="200" [fen]="fen()" [interactive]="false" [resizable]="false"></app-chess-board>
              </div>
            </div>
          }

          @if (activeTab() === 'pgn') {
            <div class="space-y-2">
              <label class="text-xs font-semibold text-slate-500">Paste PGN</label>
              <textarea
                [(ngModel)]="pgn"
                rows="6"
                placeholder="[Event '...']\n1. e4 e5 ..."
                class="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white transition-all resize-none custom-scrollbar"
              ></textarea>
            </div>
          }
        </div>
      </div>

      <div actions>
        <button appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
        <button appButton variant="primary" (click)="onSubmit()" [disabled]="!isFormValid()">
          Create Chapter
        </button>
      </div>
    </app-dialog-wrapper>
  `,
})
export class AddChapterDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<AddChapterDialogResult>);
  data = inject<{ defaultName?: string; tab?: ChapterTab }>(DIALOG_DATA, { optional: true });
  
  name = signal('');
  activeTab = signal<ChapterTab>('empty');
  orientation = signal<'white' | 'black'>('white');
  fen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  pgn = signal('');

  readonly tabs: { id: ChapterTab; label: string }[] = [
    { id: 'empty', label: 'Empty' },
    { id: 'editor', label: 'Editor' },
    { id: 'fen', label: 'FEN' },
    { id: 'pgn', label: 'PGN' },
  ];

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

  onSubmit() {
    if (this.isFormValid()) {
      const result: AddChapterDialogResult = {
        name: this.name().trim(),
        type: this.activeTab(),
        orientation: this.orientation(),
      };

      if (this.activeTab() === 'fen' || this.activeTab() === 'editor') {
        result.fen = this.fen();
      } else if (this.activeTab() === 'pgn') {
        result.pgn = this.pgn();
      }

      this.dialogRef.close(result);
    }
  }
}
