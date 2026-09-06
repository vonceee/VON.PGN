import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameNarrativeSection } from '../../../../core/models/world-championship.model';
import { ParsedMove } from '../../utils/wcc-timeline.utils';

/**
 * Modular Editorial Story Viewer Component.
 * 
 * WHY: Renders the left-column narrative story with section headings and clickable moves,
 *      ensuring identical high-quality typography across reading and editing experiences.
 */
@Component({
  selector: 'app-wcc-story-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Atmospheric Overview Paragraph -->
      @if (overview()) {
        <p class="text-base sm:text-lg text-slate-800 leading-relaxed font-normal">
          {{ overview() }}
        </p>
      }

      <!-- Editorial Narrative Sections -->
      @if (sections().length > 0) {
        <div class="space-y-8 pt-2">
          @for (sec of sections(); track sec.order) {
            <section class="space-y-3">
              <h2 class="text-xl font-bold text-slate-900 tracking-normal">
                {{ sec.title }}
              </h2>

              <div
                class="text-base text-slate-800 leading-relaxed space-y-3"
                [innerHTML]="formatContent(sec.content)"
              ></div>

              <!-- Interactive Move Quick-Jump Chips -->
              @if (sec.startPly !== undefined && sec.endPly !== undefined) {
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-xs text-gray-500 font-medium mr-1">Jump to position:</span>
                  @for (move of moveHistory(); track move.ply) {
                    @if (move.ply >= sec.startPly! && move.ply <= sec.endPly!) {
                      <button
                        type="button"
                        (click)="plySelected.emit(move.ply)"
                        [class.bg-emerald-600]="currentPly() === move.ply"
                        [class.text-white]="currentPly() === move.ply"
                        [class.bg-slate-100]="currentPly() !== move.ply"
                        [class.text-slate-800]="currentPly() !== move.ply"
                        class="px-2 py-0.5 text-xs font-semibold rounded-md border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
                      >
                        {{ move.color === 'w' ? move.moveNumber + '.' : '' }} {{ move.san }}
                      </button>
                    }
                  }
                </div>
              }
            </section>
          }
        </div>
      } @else if (fallbackDescription()) {
        <div class="space-y-4 pt-2">
          <h2 class="text-xl font-bold text-slate-900">Historical Encounter</h2>
          <p class="text-base text-slate-800 leading-relaxed">
            {{ fallbackDescription() }}
          </p>
        </div>
      }
    </div>
  `,
})
export class WccStoryViewerComponent {
  overview = input<string | null | undefined>(null);
  sections = input<GameNarrativeSection[]>([]);
  fallbackDescription = input<string | null | undefined>(null);
  moveHistory = input<ParsedMove[]>([]);
  currentPly = input<number>(0);

  plySelected = output<number>();

  formatContent(text: string): string {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  }
}
