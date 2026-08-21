import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDocumentArrowDown } from '@ng-icons/heroicons/outline';
import { Study, StudyChapter } from '../../../../../core/models/study.model';
import { ButtonComponent } from '../../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-study-export',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, ButtonComponent],
  providers: [
    provideIcons({
      heroDocumentArrowDown
    })
  ],
  template: `
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-white p-4 select-none rounded-lg">
      <div class="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
        <!-- Radio Options -->
        <div class="flex flex-col mb-4">
          <label
            class="flex items-center gap-4 p-4 rounded-4xl border border-border-base hover:bg-slate-200 cursor-pointer transition-colors"
            [class.bg-slate-200]="exportOption() === 'current'" [class.border-blue-600]="exportOption() === 'current'">
            <input type="radio" name="exportOption" value="current" [ngModel]="exportOption()"
              (ngModelChange)="exportOption.set($event)"
              class="w-4 h-4 text-blue-600 border-border-base focus:ring-blue-600 bg-transparent">
            <div class="flex flex-col">
              <span class="text-sm/6 font-medium">Current chapter</span>
              <span class="text-xs text-gray-500 mt-0.5">Export only current chapter</span>
            </div>
          </label>

          <label
            class="flex items-center gap-4 p-4 rounded-4xl border border-border-base hover:bg-slate-200 cursor-pointer transition-colors"
            [class.bg-slate-200]="exportOption() === 'all'" [class.border-blue-600]="exportOption() === 'all'">
            <input type="radio" name="exportOption" value="all" [ngModel]="exportOption()"
              (ngModelChange)="exportOption.set($event)"
              class="w-4 h-4 text-blue-600 border-border-base focus:ring-blue-600 bg-transparent">
            <div class="flex flex-col">
              <span class="text-sm/6 font-medium">All chapters</span>
              <span class="text-xs text-gray-500 mt-0.5">Export all {{ study()?.chapters?.length }} chapters</span>
            </div>
          </label>

          <label
            class="flex items-center gap-4 p-4 rounded-4xl border border-border-base hover:bg-slate-200 cursor-pointer transition-colors"
            [class.bg-slate-200]="exportOption() === 'selected'" [class.border-blue-600]="exportOption() === 'selected'">
            <input type="radio" name="exportOption" value="selected" [ngModel]="exportOption()"
              (ngModelChange)="exportOption.set($event)"
              class="w-4 h-4 text-blue-600 border-border-base focus:ring-blue-600 bg-transparent">
            <div class="flex flex-col">
              <span class="text-sm/6 font-medium">Selected chapters</span>
              <span class="text-xs text-gray-500 mt-0.5">Select custom chapters to export</span>
            </div>
          </label>
        </div>

        <!-- Chapter Checklist (only shown when exportOption === 'selected') -->
        @if (exportOption() === 'selected') {
        <div class="flex-1 flex flex-col rounded-xl p-4 mb-4">
          <div
            class="flex items-center justify-between border-b border-border-base pb-2 mb-2 text-sm/6 font-medium text-gray-500 select-none">
            <span>Select chapters</span>
            <div class="flex gap-2">
              <button (click)="selectAllChapters(true)"
                class="hover:text-blue-600 transition-colors cursor-pointer font-semibold">All</button>
              <span>|</span>
              <button (click)="selectAllChapters(false)"
                class="hover:text-blue-600 transition-colors cursor-pointer font-semibold">None</button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto space-y-1 pr-1">
            @for (chap of study()?.chapters; track chap.id; let idx = $index) {
            <label
              class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-200 cursor-pointer select-none transition-colors"
              [class.bg-surface]="selectedChapterIds().has(chap.id)">
              <input type="checkbox" [checked]="selectedChapterIds().has(chap.id)"
                (change)="toggleChapterSelection(chap.id)"
                class="w-4 h-4 rounded text-blue-600 border-border-base focus:ring-blue-600 bg-transparent">
              <span class="text-sm/6 font-medium text-gray-500">{{ idx + 1 }}.</span>
              <span class="text-sm/6 font-medium truncate flex-1">{{ chap.name }}</span>
            </label>
            }
          </div>
        </div>
        }
      </div>

      <!-- Action Button -->
      <button appButton variant="primary" (click)="performExport()"
        [disabled]="exportOption() === 'selected' && selectedChapterIds().size === 0" class="w-full shrink-0 animate-none">
        <ng-icon name="heroDocumentArrowDown" class="text-md"></ng-icon>
        <span>Export PGN</span>
      </button>
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
