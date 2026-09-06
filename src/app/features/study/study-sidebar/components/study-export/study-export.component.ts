import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDocumentArrowDown } from '@ng-icons/heroicons/outline';
import { Study, StudyChapter } from '../../../../../core/models/study.model';

@Component({
  selector: 'app-study-export',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      heroDocumentArrowDown
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white p-4 select-none">
      <!-- Radio Options -->
      <div class="flex flex-col">
        <label
          class="flex items-center gap-3.5 py-3 px-2 border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="radio" name="exportOption" value="current" [ngModel]="exportOption()"
            (ngModelChange)="exportOption.set($event)"
            class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600 bg-transparent cursor-pointer">
          <span class="text-sm font-medium text-slate-800">Current chapter</span>
        </label>

        <label
          class="flex items-center gap-3.5 py-3 px-2 border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="radio" name="exportOption" value="all" [ngModel]="exportOption()"
            (ngModelChange)="exportOption.set($event)"
            class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600 bg-transparent cursor-pointer">
          <span class="text-sm font-medium text-slate-800">All chapters</span>
        </label>

        <label
          class="flex items-center gap-3.5 py-3 px-2 border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
          <input type="radio" name="exportOption" value="selected" [ngModel]="exportOption()"
            (ngModelChange)="exportOption.set($event)"
            class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600 bg-transparent cursor-pointer">
          <span class="text-sm font-medium text-slate-800">Selected chapters</span>
        </label>
      </div>

      <!-- Chapter Checklist (only shown when exportOption === 'selected') -->
      @if (exportOption() === 'selected') {
      <div class="flex flex-col mt-4">
        <div
          class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
          <span>Select chapters</span>
          <div class="flex items-center gap-2 normal-case font-medium">
            <button type="button" (click)="selectAllChapters(true)"
              class="hover:text-blue-600 transition-colors cursor-pointer text-xs font-semibold text-slate-600">All</button>
            <span class="text-slate-300">|</span>
            <button type="button" (click)="selectAllChapters(false)"
              class="hover:text-blue-600 transition-colors cursor-pointer text-xs font-semibold text-slate-600">None</button>
          </div>
        </div>
        <div class="max-h-60 overflow-y-auto space-y-0.5 pr-1">
          @for (chap of study()?.chapters; track chap.id; let idx = $index) {
          <label
            class="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 cursor-pointer select-none transition-colors"
            [class.bg-slate-50]="selectedChapterIds().has(chap.id)">
            <input type="checkbox" [checked]="selectedChapterIds().has(chap.id)"
              (change)="toggleChapterSelection(chap.id)"
              class="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600 bg-transparent cursor-pointer">
            <span class="text-xs font-medium text-slate-400 w-5 text-right">{{ idx + 1 }}.</span>
            <span class="text-sm font-medium text-slate-700 truncate flex-1">{{ chap.name }}</span>
          </label>
          }
        </div>
      </div>
      }

      <!-- Action Button -->
      <div class="flex justify-end pt-5">
        <button type="button"
          class="w-fit inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-[16px] leading-5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          (click)="performExport()"
          [disabled]="exportOption() === 'selected' && selectedChapterIds().size === 0">
          <ng-icon name="heroDocumentArrowDown" class="text-base"></ng-icon>
          <span>Export PGN</span>
        </button>
      </div>
    </div>
  `
})
export class StudyExportComponent {
  study = input.required<Study | null>();
  isOwner = input.required<boolean>();
  currentChapter = input.required<StudyChapter | null>();

  exportPerformed = output<{ option: 'current' | 'all' | 'selected'; selectedIds: Set<number> }>();

  exportOption = signal<'current' | 'all' | 'selected'>('current');
  selectedChapterIds = signal<Set<number>>(new Set());

  toggleChapterSelection(chapterId: number) {
    this.selectedChapterIds.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  }

  selectAllChapters(select: boolean) {
    const s = this.study();
    if (!s || !s.chapters) return;

    if (select) {
      this.selectedChapterIds.set(new Set(s.chapters.map((c: StudyChapter) => c.id)));
    } else {
      this.selectedChapterIds.set(new Set());
    }
  }

  performExport() {
    this.exportPerformed.emit({
      option: this.exportOption(),
      selectedIds: this.selectedChapterIds()
    });
  }
}
