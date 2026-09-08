import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameNarrativeSection } from '../../../../core/models/world-championship.model';
import { ParsedMove } from '../../utils/wcc-timeline.utils';

/**
 * Modular Inline Editorial Story Viewer Component.
 * 
 * WHY: Renders the chess game storyline in an inline blog format (contrasting with the
 *      study page's tabular scoresheet). Moves flow continuously, with commentary paragraphs
 *      and glyph evaluations integrated seamlessly inline.
 */
@Component({
  selector: 'app-wcc-story-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Pre-Game Story / Pre-Comment Intro -->
      @if (overview(); as intro) {
        <div class="p-4 sm:p-5 bg-slate-50 border-l-4 border-slate-900 rounded-r-2xl space-y-1.5">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Match Introduction
          </span>
          <div
            class="text-base sm:text-lg text-slate-800 leading-relaxed font-sans"
            [innerHTML]="formatContent(intro)"
          ></div>
        </div>
      }

      @if (moveHistory().length > 0) {
        <!-- Continuous Inline Chess Blog Notation & Commentary -->
        <article class="space-y-5">
          <div class="inline-moves-flow text-base sm:text-lg leading-loose text-slate-800">
            @for (move of moveHistory(); track move.ply) {
              <!-- Move Number (Only on White turns or when previous move had a commentary block) -->
              @if (move.color === 'w') {
                <span class="text-slate-400 font-semibold select-none mr-1 ml-1.5 first:ml-0 font-mono text-sm">
                  {{ move.moveNumber }}.
                </span>
              }

              <!-- Move Token Button (Click jumps the sticky board) -->
              <button
                type="button"
                (click)="plySelected.emit(move.ply)"
                [class.bg-slate-900]="currentPly() === move.ply"
                [class.text-white]="currentPly() === move.ply"
                [class.font-bold]="currentPly() === move.ply"
                [class.shadow-xs]="currentPly() === move.ply"
                [class.bg-slate-100]="currentPly() !== move.ply && !move.comment"
                [class.bg-amber-100]="currentPly() !== move.ply && !!move.comment"
                [class.text-slate-900]="currentPly() !== move.ply && !move.comment"
                [class.text-amber-950]="currentPly() !== move.ply && !!move.comment"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-transparent hover:border-slate-300 font-mono text-sm sm:text-base cursor-pointer transition-colors mr-1 align-baseline"
                [title]="'Jump board to ' + (move.color === 'w' ? move.moveNumber + '.' : move.moveNumber + '...') + ' ' + move.san"
              >
                <span>{{ move.san }}</span>
                @if (move.glyph; as g) {
                  <span
                    class="text-xs font-bold font-sans px-1 rounded"
                    [class.text-amber-300]="currentPly() === move.ply"
                    [class.text-indigo-700]="currentPly() !== move.ply"
                    [title]="g.name"
                  >
                    {{ g.symbol }}
                  </span>
                }
                @if (move.comment) {
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    [class.bg-white]="currentPly() === move.ply"
                    [class.bg-amber-600]="currentPly() !== move.ply"
                    title="Has commentary"
                  ></span>
                }
              </button>

              <!-- Inline Commentary Block (Displays right after annotated moves) -->
              @if (move.comment) {
                <div class="my-4 p-4 sm:p-5 bg-slate-50/90 border-l-4 border-slate-900 rounded-r-2xl space-y-2">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="plySelected.emit(move.ply)"
                      class="inline-flex items-center gap-1.5 font-bold font-mono text-sm text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
                    >
                      <span>{{ move.color === 'w' ? move.moveNumber + '.' : move.moveNumber + '...' }} {{ move.san }}</span>
                    </button>
                    @if (move.glyph; as g) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {{ g.symbol }} {{ g.name }}
                      </span>
                    }
                  </div>
                  <div
                    class="text-sm sm:text-base text-slate-700 leading-relaxed font-sans"
                    [innerHTML]="formatContent(move.comment)"
                  ></div>
                </div>
              }

              <!-- Paragraph / Line Break -->
              @if (move.hasBreak) {
                <div class="w-full my-3"></div>
              }
            }
          </div>
        </article>
      }

      <!-- Editorial Sections (if present in custom narrative models) -->
      @if (displaySections().length > 0) {
        <div class="space-y-6">
          @for (sec of displaySections(); track sec.order) {
            <section class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2.5">
              <h2 class="text-lg sm:text-xl font-bold text-slate-900 tracking-normal flex items-baseline gap-2">
                @if (sec.keyMoveSan) {
                  <span class="text-indigo-900 font-mono">{{ sec.keyMoveSan }}</span>
                }
                <span>{{ sec.title }}</span>
              </h2>

              <div
                class="text-base text-slate-800 leading-relaxed space-y-3 font-sans"
                [innerHTML]="formatContent(sec.content)"
              ></div>
            </section>
          }
        </div>
      } @else if (fallbackDescription() && moveHistory().length === 0) {
        <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
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

  readonly displaySections = computed(() => {
    return this.sections().filter((s) => s.title?.trim().toLowerCase() !== 'round summary');
  });

  formatContent(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }
}
