import { Component, inject, signal, OnInit, ViewChild, effect, ElementRef, HostListener } from '@angular/core';
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
  template: `
    <div class="bg-main rounded-4xl shadow-xl w-full p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">{{ activeTab() === 'editor' ? 'Board editor' : 'New chapter' }}</h2>
      </div>

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
                  class="w-full px-4 py-2.5 bg-subtle rounded-xl text-sm outline-none placeholder:text-muted/50"
                  autofocus
                />
              </div>
            </div>

            <!-- Orientation (Hidden for PGN) -->
            @if (activeTab() !== 'pgn') {
              <div class="space-y-2">
                <label class="text-sm font-semibold ml-1">
                  Orientation
                </label>
                <div #orientationDropdownContainer class="relative">
                  <button
                    type="button"
                    (click)="isOrientationDropdownOpen.update(v => !v)"
                    class="w-full py-2.5 pl-1 pr-1 text-left text-content font-medium cursor-pointer text-sm border-b-2 border-border-base flex items-center justify-between focus:outline-none bg-transparent"
                  >
                    <span>{{ orientation() === 'white' ? 'White' : 'Black' }}</span>
                    <svg
                      class="fill-current h-4 w-4 text-muted transition-transform duration-200"
                      [class.rotate-180]="isOrientationDropdownOpen()"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </button>

                  @if (isOrientationDropdownOpen()) {
                    <div
                      class="absolute top-full left-0 w-full bg-main border border-border-base rounded-xl py-2 mt-2 z-50 flex flex-col shadow-lg max-h-64 overflow-y-auto"
                    >
                      <button
                        type="button"
                        (click)="setOrientation('white')"
                        class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                      >
                        <span
                          class="text-sm text-content group-hover/item:text-accent font-medium"
                          [class.text-accent]="orientation() === 'white'"
                        >
                          White
                        </span>
                      </button>
                      <button
                        type="button"
                        (click)="setOrientation('black')"
                        class="w-full px-4 py-2.5 hover:bg-subtle flex items-center text-left group/item cursor-pointer focus:outline-none"
                      >
                        <span
                          class="text-sm text-content group-hover/item:text-accent font-medium"
                          [class.text-accent]="orientation() === 'black'"
                        >
                          Black
                        </span>
                      </button>
                    </div>
                  }
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
          <div class="min-h-[200px] bg-subtle/30 backdrop-blur-md relative rounded-2xl p-4 border border-border-base">
            @if (activeTab() === 'empty') {
              <div class="h-full flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div class="space-y-1">
                  <h3 class="text-sm font-semibold text-content">Start fresh</h3>
                  <p class="text-xs text-muted max-w-[200px] mx-auto">
                    Create a new chapter starting from the standard initial position.
                  </p>
                </div>
              </div>
            }

            @if (activeTab() === 'fen') {
              <div class="space-y-4 py-4">
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-content ml-1">
                      Paste FEN
                    </h3>
                  </div>
                  <input
                    type="text"
                    [ngModel]="fen()"
                    (ngModelChange)="fen.set($event)"
                    placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    class="w-full px-4 py-3 bg-subtle rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
            }

            @if (activeTab() === 'pgn') {
              <div class="space-y-4 py-2">
                <div class="space-y-3">
                  <div class="flex justify-between items-center px-1">
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
                      rows="4"
                      placeholder="Paste PGN here..."
                      class="w-full px-4 py-3 bg-subtle rounded-xl text-sm outline-none resize-none custom-scrollbar"
                    ></textarea>
                  </div>
                </div>
              </div>
              <button
                class="hover:underline cursor-pointer ml-2" 
                (click)="fileInput.click()" 
                [disabled]="isReadingFiles()"
              >
                @if (isReadingFiles()) {
                  <span class="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin mr-2 inline-block"></span>
                  Reading...
                } @else {
                  + Upload file
                }
              </button>
              
              @if (fileSummary()) {
                <div class="absolute bottom-3 right-3 px-3 py-1 bg-surface border border-border-base rounded-lg text-xs text-accent font-semibold slide-in-from-bottom-2">
                  {{ fileSummary() }}
                </div>
              }
            }
          </div>
        </div>
      } @else {
        <!-- Full-screen Editor View -->
        <div>
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

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 w-full">
        @if (activeTab() !== 'editor') {
          <button appButton variant="outline" (click)="dialogRef.close()" class="flex-1">
            <span>Cancel</span>
          </button>
          <button 
            appButton 
            variant="primary" 
            (click)="onSubmit()" 
            [disabled]="!isFormValid()"
            class="flex-1"
          >
            <span>Create chapter</span>
          </button>
        } @else {
          <button appButton variant="outline" (click)="activeTab.set('empty')" class="flex items-center gap-2 group flex-1">
            <svg class="w-4 h-4 fill-current group-hover:-translate-x-1" viewBox="0 0 20 20"><path d="M11.707 5.293a1 1 0 010 1.414L8.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/></svg>
            <span>Back</span>
          </button>

          <button appButton variant="outline" (click)="boardEditor?.resetToInitial()" class="flex-1">
            <span>Reset Position</span>
          </button>
          <button appButton variant="outline" (click)="boardEditor?.clearBoard()" class="flex-1">
            <span>Clear Board</span>
          </button>
          
          <button 
            appButton 
            variant="primary" 
            (click)="onSubmit()" 
            [disabled]="!isFormValid()"
            class="flex-1"
          >
            <span>Create Chapter</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AddChapterDialogComponent implements OnInit {
  @ViewChild('editor') boardEditor?: BoardEditorComponent;
  @ViewChild('orientationDropdownContainer') dropdownContainer?: ElementRef;
  dialogRef = inject(DialogRef<AddChapterDialogResult>);
  data = inject<{
    defaultName?: string;
    tab?: ChapterTab;
  }>(DIALOG_DATA, { optional: true });

  name = signal('');
  activeTab = signal<ChapterTab>('empty');
  orientation = signal<'white' | 'black'>('white');
  isOrientationDropdownOpen = signal(false);

  setOrientation(value: 'white' | 'black') {
    this.orientation.set(value);
    this.isOrientationDropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isOrientationDropdownOpen() &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isOrientationDropdownOpen.set(false);
    }
  }
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

