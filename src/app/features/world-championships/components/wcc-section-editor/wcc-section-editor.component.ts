import { Component, ChangeDetectionStrategy, model, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameNarrativeSection } from '../../../../core/models/world-championship.model';

/**
 * Modular Story Narrative & Sections Editor Component.
 * 
 * WHY: Modularizes narrative sections management (creation, ordering, deletion,
 *      and inline markdown move annotations) into a standalone reusable component.
 */
@Component({
  selector: 'app-wcc-section-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 class="text-base font-bold text-slate-900">
          3. Editorial Story &amp; Sections
        </h2>
        <button
          type="button"
          (click)="addSection()"
          class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 transition-colors cursor-pointer"
        >
          + Add Section
        </button>
      </div>

      <!-- Atmospheric Overview -->
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
          Atmospheric Introductory Narrative
        </label>
        <textarea
          [ngModel]="overview()"
          (ngModelChange)="overview.set($event)"
          rows="3"
          placeholder="Paris, 1858. Paul Morphy is at the opera..."
          class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 resize-y"
        ></textarea>
      </div>

      <!-- Narrative Sections List -->
      <div class="space-y-4">
        @for (section of sections(); track $index) {
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 flex-1">
                <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center">
                  {{ $index + 1 }}
                </span>
                <input
                  type="text"
                  [(ngModel)]="section.title"
                  (ngModelChange)="notifySectionsChanged()"
                  placeholder="Section Heading (e.g. Grabbing the center)"
                  class="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  (click)="moveSectionUp($index)"
                  [disabled]="$index === 0"
                  class="p-1 text-gray-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  (click)="moveSectionDown($index)"
                  [disabled]="$index === sections().length - 1"
                  class="p-1 text-gray-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Move down"
                >
                  ▼
                </button>
                <button
                  type="button"
                  (click)="removeSection($index)"
                  class="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                  title="Delete section"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Markdown Content Area & Quick Insert Toolbar -->
            <div>
              <div class="flex items-center justify-between mb-1 text-xs text-gray-500">
                <span>Markdown Prose Commentary:</span>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="insertMarkdown($index, 'bold')"
                    class="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    (click)="insertMarkdown($index, 'italic')"
                    class="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    (click)="insertMarkdown($index, 'move')"
                    class="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-mono text-[11px]"
                    title="Insert current board move into text"
                  >
                    + Move
                  </button>
                </div>
              </div>
              <textarea
                [(ngModel)]="section.content"
                (ngModelChange)="notifySectionsChanged()"
                rows="4"
                placeholder="The game opens plainly: **1. e4 e5 2. Nf3 d6 3. d4 Bg4?!**..."
                class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 resize-y"
              ></textarea>
            </div>

            <!-- Move Range & Key Move Plies -->
            <div class="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div>
                <label class="block font-semibold text-gray-500 mb-1">Start Ply</label>
                <input
                  type="number"
                  [(ngModel)]="section.startPly"
                  (ngModelChange)="notifySectionsChanged()"
                  min="0"
                  [max]="maxPly()"
                  class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label class="block font-semibold text-gray-500 mb-1">End Ply</label>
                <input
                  type="number"
                  [(ngModel)]="section.endPly"
                  (ngModelChange)="notifySectionsChanged()"
                  min="0"
                  [max]="maxPly()"
                  class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label class="block font-semibold text-gray-500 mb-1">Key Move Tag</label>
                <input
                  type="text"
                  [(ngModel)]="section.keyMoveSan"
                  (ngModelChange)="notifySectionsChanged()"
                  placeholder="e.g. 10. Nxb5!"
                  class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class WccSectionEditorComponent {
  overview = model<string>('');
  sections = model<GameNarrativeSection[]>([]);
  maxPly = input<number>(0);
  currentMoveLabel = input<string>('Start');

  notifySectionsChanged(): void {
    this.sections.update((list) => [...list]);
  }

  addSection(): void {
    const nextOrder = this.sections().length + 1;
    const currentMax = this.maxPly();
    this.sections.update((list) => [
      ...list,
      {
        title: `Section ${nextOrder}`,
        order: nextOrder,
        startPly: 1,
        endPly: currentMax || 10,
        content: 'Add your analytical narrative here. Highlight key moves with **bold** notation.',
      },
    ]);
  }

  removeSection(index: number): void {
    this.sections.update((list) => {
      const copy = [...list];
      copy.splice(index, 1);
      return copy.map((sec, i) => ({ ...sec, order: i + 1 }));
    });
  }

  moveSectionUp(index: number): void {
    if (index === 0) return;
    this.sections.update((list) => {
      const copy = [...list];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy.map((sec, i) => ({ ...sec, order: i + 1 }));
    });
  }

  moveSectionDown(index: number): void {
    if (index >= this.sections().length - 1) return;
    this.sections.update((list) => {
      const copy = [...list];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy.map((sec, i) => ({ ...sec, order: i + 1 }));
    });
  }

  insertMarkdown(sectionIndex: number, type: 'bold' | 'italic' | 'move'): void {
    const currentSections = this.sections();
    const section = currentSections[sectionIndex];
    if (!section) return;

    let insertion = '';
    if (type === 'bold') insertion = ' **1. e4** ';
    if (type === 'italic') insertion = ' *initiative* ';
    if (type === 'move') {
      const label = this.currentMoveLabel();
      insertion = ` **${label}** `;
    }

    const updatedContent = (section.content || '') + insertion;
    this.sections.update((list) => {
      const copy = [...list];
      copy[sectionIndex] = { ...copy[sectionIndex], content: updatedContent };
      return copy;
    });
  }
}
