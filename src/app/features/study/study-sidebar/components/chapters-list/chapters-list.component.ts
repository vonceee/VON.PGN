import { Component, input, output } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Study, StudyChapter } from '../../../../../core/models/study.model';

@Component({
  selector: 'app-study-chapters-list',
  standalone: true,
  imports: [DragDropModule],
  template: `
    <nav class="flex flex-col flex-1 overflow-y-auto min-h-[160px] p-1">
      <div class="flex-1 flex flex-col gap-0.5" cdkDropList (cdkDropListDropped)="onDrop($event)"
        [cdkDropListDisabled]="!canEdit()">
        @for (chap of study()?.chapters; track chap.id; let idx = $index) {
        <button (click)="selectChapter(chap)" cdkDrag [cdkDragDisabled]="!canEdit()" class="relative flex items-center justify-between py-2 px-4 cursor-pointer group text-left
                {{
                  currentChapter()?.id === chap.id
                    ? 'bg-subtle rounded-md'
                    : 'hover:bg-surface'
                }}">
          <!-- Drag Placeholder -->
          <div *cdkDragPlaceholder class="h-10 bg-subtle/50 border-2 border-border-accent/30 rounded-lg mx-2 my-0.5">
          </div>

          @if (currentChapter()?.id === chap.id) {
          <div class="absolute left-0 top-1 bottom-1 w-0.5 bg-border-accent"></div>
          }
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs font-medium text-muted tabular-nums shrink-0 group-active:cursor-grabbing cursor-grab">
              {{ idx + 1 }}.
            </span>
            <span [class]="'text-sm truncate ' + (currentChapter()?.id === chap.id ? 'text-accent' : 'text-content')">
              {{ chap.name }}
            </span>
          </div>

          <div class="flex items-center gap-4 shrink-0 ml-2">
            @if (chap.pgn_tags?.['Result'] && chap.pgn_tags?.['Result'] !== '*') {
            <span class="text-xs font-medium opacity-70 tabular-nums select-none">
              {{ chap.pgn_tags?.['Result'] }}
            </span>
            }
            @if (canEdit()) {
            <button (click)="onEditChapter($event, chap)" class="text-xs cursor-pointer hover:underline">Edit</button>
            }
          </div>
        </button>
        }
      </div>
    </nav>
  `
})
export class ChaptersListComponent {
  study = input.required<Study | null>();
  currentChapter = input.required<StudyChapter | null>();
  canEdit = input.required<boolean>();

  chapterSelected = output<StudyChapter>();
  chapterEditClicked = output<{ event: MouseEvent; chapter: StudyChapter }>();
  orderChanged = output<CdkDragDrop<StudyChapter[]>>();

  selectChapter(chap: StudyChapter) {
    this.chapterSelected.emit(chap);
  }

  onEditChapter(event: MouseEvent, chap: StudyChapter) {
    this.chapterEditClicked.emit({ event, chapter: chap });
  }

  onDrop(event: CdkDragDrop<StudyChapter[]>) {
    this.orderChanged.emit(event);
  }
}
