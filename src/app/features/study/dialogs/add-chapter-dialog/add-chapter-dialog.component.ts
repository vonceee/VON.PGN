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
    <app-dialog-wrapper title="New chapter" (close)="dialogRef.close()">
      <div class="space-y-6">
        <!-- Chapter Name & Orientation -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-content">Chapter Name</label>
            <input
              type="text"
              [(ngModel)]="name"
              placeholder="e.g. Chapter 1"
              class="w-full px-4 py-2.5 bg-subtle border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all"
              autofocus
            />
          </div>

          @if (activeTab() !== 'pgn') {
            <div class="space-y-2">
              <label class="text-sm font-semibold text-content">Orientation</label>
              <select
                [(ngModel)]="orientation"
                class="w-full px-4 py-2.5 bg-subtle border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all"
              >
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>
          }
        </div>

        <!-- Tab Switcher -->
        <div class="flex border-b border-base bg-surface -mx-6 px-6">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              class="flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 relative after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-0.5 after:bg-accent after:-translate-x-1/2 after:transition-all after:duration-300"
              [class.text-accent]="activeTab() === tab.id"
              [class.opacity-100]="activeTab() === tab.id"
              [class.opacity-50]="activeTab() !== tab.id"
              [class.after:w-full]="activeTab() === tab.id"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Tab Content -->
        <div class="min-h-[120px] animate-in fade-in slide-in-from-bottom-2 duration-300">
          @if (activeTab() === 'empty') {
            <p class="text-md py-4 text-center">
              create a new chapter starting from the standard initial position.
            </p>
          }

          @if (activeTab() === 'editor') {
            <div class="space-y-4">
              <div class="flex justify-center bg-subtle p-4 rounded-xl border border-dashed border-base">
                <app-chess-board 
                  [size]="280" 
                  [fen]="fen()" 
                  (fenChange)="fen.set($event)"
                  [orientation]="orientation()"
                  [resizable]="false"
                ></app-chess-board>
              </div>
              <p class="text-xs text-center text-muted">Drag pieces to set up the starting position.</p>
            </div>
          }

          @if (activeTab() === 'fen') {
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-muted">Paste FEN</label>
                <input
                  type="text"
                  [(ngModel)]="fen"
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  class="w-full px-4 py-2.5 bg-subtle border border-base rounded-xl text-xs font-mono focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all"
                />
              </div>
              <div class="flex justify-center opacity-60 pointer-events-none scale-75">
                 <app-chess-board [size]="200" [fen]="fen()" [interactive]="false" [resizable]="false"></app-chess-board>
              </div>
            </div>
          }

          @if (activeTab() === 'pgn') {
            <div class="space-y-2">
              <label class="text-xs font-semibold text-muted">Paste PGN</label>
              <textarea
                [(ngModel)]="pgn"
                rows="6"
                placeholder="[Event '...']\n1. e4 e5 ..."
                class="w-full px-4 py-2.5 bg-subtle border border-base rounded-xl text-xs font-mono focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all resize-none custom-scrollbar"
              ></textarea>
            </div>
          }
        </div>
      </div>

      <button actions appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
      <button actions appButton variant="primary" (click)="onSubmit()" [disabled]="!isFormValid()">
        Create Chapter
      </button>
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
