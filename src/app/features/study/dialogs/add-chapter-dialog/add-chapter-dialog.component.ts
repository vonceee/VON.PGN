import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
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
    DialogWrapperComponent, 
    ButtonComponent, 
    BoardEditorComponent,
  ],
  template: `
    <div class="block max-w-xl w-[90vw] mx-auto">
      <app-dialog-wrapper title="New Chapter" (close)="dialogRef.close()">
        <div class="space-y-6">
          <!-- Chapter Name & Orientation Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Chapter Name -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">
                Chapter Name
              </label>
              <div class="relative group">
                <input
                  type="text"
                  [(ngModel)]="name"
                  placeholder="e.g. Opening Analysis"
                  class="w-full px-4 py-2.5 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted/50 dark:text-content transition-all duration-300"
                  autofocus
                />
                <div class="absolute inset-0 rounded-xl bg-accent/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300"></div>
              </div>
            </div>

            <!-- Orientation (Hidden for PGN) -->
            @if (activeTab() !== 'pgn') {
              <div class="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <label class="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">
                  Orientation
                </label>
                <div class="relative">
                  <select
                    [(ngModel)]="orientation"
                    class="w-full px-4 py-2.5 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="white">White</option>
                    <option value="black">Black</option>
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Tab Switcher (Pill Style) -->
          <div class="flex flex-wrap gap-2 px-1">
            @for (tab of tabs; track tab.id) {
              <button
                (click)="activeTab.set(tab.id)"
                class="px-5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 border whitespace-nowrap"
                [class.bg-content]="activeTab() === tab.id"
                [class.text-surface]="activeTab() === tab.id"
                [class.border-content]="activeTab() === tab.id"
                [class.bg-surface]="activeTab() !== tab.id"
                [class.text-content]="activeTab() !== tab.id"
                [class.border-base]="activeTab() !== tab.id"
                [class.hover:bg-subtle]="activeTab() !== tab.id"
              >
                {{ tab.label }}
              </button>
            }
          </div>

          <!-- Tab Content Area -->
          <div class="min-h-[200px] bg-subtle/30 backdrop-blur-md border border-base rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            @if (activeTab() === 'empty') {
              <div class="h-full flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in zoom-in-95 duration-500">
                <div class="space-y-1">
                  <h3 class="text-sm font-bold text-content uppercase tracking-wider">Start Fresh</h3>
                  <p class="text-xs text-muted max-w-[200px] mx-auto leading-relaxed">
                    create a new chapter starting from the standard initial position.
                  </p>
                </div>
              </div>
            }

            @if (activeTab() === 'editor') {
              <div class="animate-in fade-in duration-500">
                <app-board-editor 
                  [fen]="fen()" 
                  (fenChange)="fen.set($event)"
                  [orientation]="orientation()"
                ></app-board-editor>
              </div>
            }

            @if (activeTab() === 'fen') {
              <div class="space-y-4 py-4 animate-in slide-in-from-right-4 duration-500">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-content uppercase tracking-wider ml-1">
                      Paste FEN
                    </h3>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="fen"
                    placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    class="w-full px-4 py-3 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all duration-300"
                  />
                </div>
              </div>
            }

            @if (activeTab() === 'pgn') {
              <div class="space-y-4 py-2 animate-in slide-in-from-left-4 duration-500">
                <div class="space-y-3">
                  <div class="flex justify-between items-center px-1">
                    <h3 class="text-sm font-bold text-content uppercase tracking-wider">
                      PGN Import
                    </h3>
                    <button 
                      type="button" 
                      (click)="fileInput.click()" 
                      class="px-5 py-1.5 bg-surface hover:bg-subtle text-content text-[11px] font-semibold rounded-full border border-base transition-all duration-300 flex items-center gap-2"
                      [disabled]="isReadingFiles()"
                    >
                      @if (isReadingFiles()) {
                        <div class="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
                        Reading...
                      } @else {
                        Choose Files
                      }
                    </button>
                    <input 
                      #fileInput 
                      type="file" 
                      multiple 
                      (change)="onFilesSelected($event)" 
                      class="hidden" 
                      accept=".pgn"
                    >
                  </div>
                  
                  <div class="relative group">
                    <textarea
                      [(ngModel)]="pgn"
                      rows="8"
                      placeholder="paste pgn here.."
                      class="w-full px-4 py-3 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm outline-none dark:text-content transition-all duration-300 resize-none custom-scrollbar"
                    ></textarea>
                    
                    @if (fileSummary()) {
                      <div class="absolute bottom-3 right-3 px-3 py-1 bg-surface border border-base rounded-lg text-[10px] text-accent font-bold animate-in fade-in slide-in-from-bottom-2">
                        {{ fileSummary() }}
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Action Buttons -->
        <button actions appButton variant="outline" (click)="dialogRef.close()">
          Cancel
        </button>
        <button 
          actions 
          appButton 
          variant="primary" 
          (click)="onSubmit()" 
          [disabled]="!isFormValid()"
        >
          Create Chapter
        </button>
      </app-dialog-wrapper>
    </div>
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
  isReadingFiles = signal(false);
  fileSummary = signal('');

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

      if (this.activeTab() === 'fen' || this.activeTab() === 'editor') {
        result.fen = this.fen();
      } else if (this.activeTab() === 'pgn') {
        result.pgn = this.pgn();
      }

      this.dialogRef.close(result);
    }
  }
}
