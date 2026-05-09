import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
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
    <div class="block w-[90vw] mx-auto   ease-in-out" [class.max-w-xl]="activeTab() !== 'editor'" [class.max-w-3xl]="activeTab() === 'editor'">
      <app-dialog-wrapper [title]="activeTab() === 'editor' ? 'Board Editor' : 'New Chapter'" (close)="dialogRef.close()">
        <!-- Body Content -->
        @if (activeTab() !== 'editor') {
          <div class="space-y-6">
            <!-- Chapter Name & Orientation Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Chapter Name -->
              <div class="space-y-2">
                <label class="text-sm font-semibold ml-1">
                  Chapter Name
                </label>
                <div class="relative group">
                  <input
                    type="text"
                    [ngModel]="name()"
                    (ngModelChange)="name.set($event)"
                    placeholder="e.g. Opening Analysis"
                    class="w-full px-4 py-2.5 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted/50   "
                    autofocus
                  />
                  <div class="absolute inset-0 rounded-xl bg-accent/5 opacity-0 group-focus-within:opacity-100 pointer-events-none  "></div>
                </div>
              </div>

              <!-- Orientation (Hidden for PGN) -->
              @if (activeTab() !== 'pgn') {
                <div class="space-y-2 animate-in fade-in slide-in-from-right-4 ">
                  <label class="text-sm font-semibold ml-1">
                    Orientation
                  </label>
                  <div class="relative">
                    <select
                      [ngModel]="orientation()"
                      (ngModelChange)="orientation.set($event)"
                      class="w-full px-4 py-2.5 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none    appearance-none cursor-pointer"
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

            <!-- Tab Switcher (appButton Style) -->
            <div class="flex flex-wrap gap-2 px-1">
              @for (tab of tabs; track tab.id) {
                <button
                  appButton
                  [variant]="activeTab() === tab.id ? 'primary' : 'outline'"
                  (click)="activeTab.set(tab.id)"
                  class="whitespace-nowrap"
                >
                  {{ tab.label }}
                </button>
              }
            </div>

            <!-- Tab Content Area -->
            <div class="min-h-[200px] bg-subtle/30 backdrop-blur-md relative">
              @if (activeTab() === 'empty') {
                <div class="h-full flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in zoom-in-95 ">
                  <div class="space-y-1">
                    <h3 class="text-sm font-semibold text-content uppercase tracking-wider">Start Fresh</h3>
                    <p class="text-xs text-muted max-w-[200px] mx-auto leading-relaxed">
                      create a new chapter starting from the standard initial position.
                    </p>
                  </div>
                </div>
              }

              @if (activeTab() === 'fen') {
                <div class="space-y-4 py-4 animate-in slide-in-from-right-4 ">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <h3 class="text-sm font-semibold text-content uppercase tracking-wider ml-1">
                        Paste FEN
                      </h3>
                    </div>
                    <input
                      type="text"
                      [ngModel]="fen()"
                      (ngModelChange)="fen.set($event)"
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      class="w-full px-4 py-3 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none   "
                    />
                  </div>
                </div>
              }

              @if (activeTab() === 'pgn') {
                <div class="space-y-4 py-2 animate-in slide-in-from-left-4 ">
                  <div class="space-y-3">
                    <div class="flex justify-between items-center px-1">
                      <button 
                        appButton
                        variant="primary"
                        (click)="fileInput.click()" 
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
                        [ngModel]="pgn()"
                        (ngModelChange)="pgn.set($event)"
                        rows="8"
                        placeholder="paste pgn here.."
                        class="w-full px-4 py-3 bg-subtle/50 backdrop-blur-sm border border-base rounded-xl text-sm outline-none    resize-none custom-scrollbar"
                      ></textarea>
                      
                      @if (fileSummary()) {
                        <div class="absolute bottom-3 right-3 px-3 py-1 bg-surface border border-base rounded-lg text-[10px] text-accent font-semibold animate-in fade-in slide-in-from-bottom-2">
                          {{ fileSummary() }}
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Full-screen Editor View -->
          <div class="animate-in fade-in zoom-in-95 ">
            <app-board-editor 
              #editor
              [fen]="fen()" 
              (fenChange)="fen.set($event)"
              [orientation]="orientation()"
              [compact]="true"
              [hideCoordinates]="true"
            ></app-board-editor>
          </div>
        }

        <!-- Footer Actions (projected to [actions]) -->
        <ng-container actions>
          @if (activeTab() !== 'editor') {
            <button appButton variant="outline" (click)="dialogRef.close()">
              Cancel
            </button>
            <button 
              appButton 
              variant="primary" 
              (click)="onSubmit()" 
              [disabled]="!isFormValid()"
            >
              Create Chapter
            </button>
          } @else {
            <button appButton variant="outline" (click)="activeTab.set('empty')" class="flex items-center gap-2 group">
              <svg class="w-4 h-4 fill-current  group-hover:-translate-x-1" viewBox="0 0 20 20"><path d="M11.707 5.293a1 1 0 010 1.414L8.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/></svg>
              Back
            </button>

            <button appButton variant="ghost" (click)="boardEditor?.resetToInitial()">
              Reset Position
            </button>
            <button appButton variant="ghost" (click)="boardEditor?.clearBoard()">
              Clear Board
            </button>

            <div class="flex-1"></div>
            
            <button 
              appButton 
              variant="primary" 
              (click)="onSubmit()" 
              [disabled]="!isFormValid()"
              class="px-8"
            >
              Create Chapter
            </button>
          }
        </ng-container>
      </app-dialog-wrapper>
    </div>
  `,
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

