import {
  Component,
  ChangeDetectionStrategy,
  model,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameNarrativeSection } from '../../../../core/models/world-championship.model';
import { ParsedMove } from '../../utils/wcc-timeline.utils';
import { GlyphId } from '../../../../core/models/study.model';

/**
 * Revamped Inline Editorial Storyline & Move Annotation Component.
 * 
 * WHY:
 * 1. Provides a seamless inline editing experience matching the Event, Contenders, and Venue fields.
 * 2. Supports PGN pre-comments (introductory storyline at ply 0 before move 1).
 * 3. Supports explicit move breaklines to separate moves into paragraphs instead of one continuous wall of text.
 * 4. Renders commentary and glyphs inline in the narrative flow.
 */
@Component({
  selector: 'app-wcc-section-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">

      <!-- 1. Pre-Game Storyline / PGN Pre-Comment (Inline like Title & Venue) -->
      <div class="space-y-1.5 pt-1">
        <div class="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Pre-Game Storyline &amp; Opening Narrative (PGN Pre-Comment)
          </span>
          @if (overview()) {
            <button
              type="button"
              (click)="clearPreComment()"
              class="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear
            </button>
          }
        </div>

        <textarea
          [ngModel]="overview()"
          (ngModelChange)="onPreCommentChange($event)"
          rows="2"
          placeholder="Add introductory narrative, historical context, or pre-game thoughts (saved as PGN pre-comment)..."
          class="w-full text-sm sm:text-base text-slate-800 placeholder-slate-400 hover:bg-slate-50 focus:bg-white px-2 py-1.5 -ml-2 rounded-lg border border-transparent hover:border-slate-200 focus:border-slate-300 transition-colors resize-y leading-relaxed outline-none"
        ></textarea>
      </div>

      <!-- 2. Inline Move Notation & In-Place Editorial Stream -->
      <div class="space-y-3">
        @if (moveHistory().length > 0) {
          <!-- Inline reading and editing flow -->
          <div class="inline-moves-container text-sm sm:text-base leading-loose select-none">
            @for (move of moveHistory(); track move.ply) {
              <!-- Move Number prefix (White moves) -->
              @if (move.color === 'w') {
                <span class="text-slate-400 font-semibold mr-1 ml-1.5 first:ml-0 text-xs sm:text-sm font-mono align-baseline">
                  {{ move.moveNumber }}.
                </span>
              }

              <!-- Move Button Token -->
              <button
                type="button"
                (click)="selectMove(move.ply)"
                [class.bg-slate-900]="currentPly() === move.ply"
                [class.text-white]="currentPly() === move.ply"
                [class.ring-2]="currentPly() === move.ply"
                [class.ring-slate-900]="currentPly() === move.ply"
                [class.bg-white]="currentPly() !== move.ply && !move.comment"
                [class.bg-amber-100]="currentPly() !== move.ply && !!move.comment"
                [class.border-amber-300]="currentPly() !== move.ply && !!move.comment"
                [class.text-slate-900]="currentPly() !== move.ply && !move.comment"
                [class.text-amber-950]="currentPly() !== move.ply && !!move.comment"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 hover:border-slate-400 font-semibold text-xs sm:text-sm cursor-pointer transition-all mr-1 align-baseline"
                [title]="'Select ' + (move.color === 'w' ? move.moveNumber + '.' : move.moveNumber + '...') + ' ' + move.san + ' to annotate'"
              >
                <span>{{ move.san }}</span>
                @if (move.glyph; as g) {
                  <span
                    class="text-[11px] font-bold font-sans"
                    [class.text-amber-300]="currentPly() === move.ply"
                    [class.text-indigo-700]="currentPly() !== move.ply"
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

              <!-- INLINE ACTIVE MOVE ANNOTATION EDITOR (Appears directly when this move is selected) -->
              @if (currentPly() === move.ply) {
                <div class="my-3 p-3 sm:p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3 transition-all">
                  <!-- Header & Action Toolbar -->
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-xs">
                        {{ move.color === 'w' ? move.moveNumber + '.' : move.moveNumber + '...' }} {{ move.san }}
                      </span>
                      <span class="text-xs font-semibold text-slate-600">
                        Inline Move Annotation
                      </span>
                    </div>

                    <div class="flex items-center gap-1.5">
                      <!-- Toggle Breakline Button -->
                      <button
                        type="button"
                        (click)="toggleBreakline(move.ply)"
                        [class.bg-indigo-50]="move.hasBreak"
                        [class.text-indigo-700]="move.hasBreak"
                        [class.border-indigo-300]="move.hasBreak"
                        [class.bg-white]="!move.hasBreak"
                        [class.text-slate-700]="!move.hasBreak"
                        class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Toggle a line break after this move"
                      >
                        <span>↵ Breakline</span>
                        @if (move.hasBreak) {
                          <span class="text-indigo-600 font-bold">✓</span>
                        }
                      </button>

                      <!-- Delete From Here Button -->
                      <button
                        type="button"
                        (click)="deleteFromCurrent()"
                        class="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                        title="Delete this move and all subsequent moves from the game"
                      >
                        Delete from Here
                      </button>
                    </div>
                  </div>

                  <!-- Move Evaluation Glyphs Selector -->
                  <div class="space-y-1">
                    <span class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Evaluation Symbol
                    </span>
                    <div class="flex flex-wrap gap-1">
                      @for (g of availableGlyphs; track g.id) {
                        <button
                          type="button"
                          (click)="toggleGlyph(g.id)"
                          [class.bg-slate-900]="selectedGlyphId() === g.id"
                          [class.text-white]="selectedGlyphId() === g.id"
                          [class.border-slate-900]="selectedGlyphId() === g.id"
                          [class.bg-white]="selectedGlyphId() !== g.id"
                          [class.text-slate-700]="selectedGlyphId() !== g.id"
                          [class.border-slate-200]="selectedGlyphId() !== g.id"
                          class="px-2 py-0.5 text-xs font-bold rounded-md border hover:border-slate-400 transition-colors cursor-pointer"
                          [title]="g.name"
                        >
                          {{ g.symbol }}
                        </button>
                      }
                      @if (selectedGlyphId()) {
                        <button
                          type="button"
                          (click)="selectedGlyphId.set(null); onSave()"
                          class="px-2 py-0.5 text-xs text-gray-500 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Clear Symbol
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Inline Commentary Field -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs text-slate-500">
                      <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Storyline Analysis &amp; Commentary
                      </span>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          (click)="insertText('**', '**')"
                          class="px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-slate-300 font-bold text-slate-800 cursor-pointer"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          (click)="insertText('*', '*')"
                          class="px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-slate-300 italic text-slate-800 cursor-pointer"
                          title="Italic"
                        >
                          I
                        </button>
                      </div>
                    </div>

                    <textarea
                      [ngModel]="comment()"
                      (ngModelChange)="comment.set($event); onSave()"
                      rows="3"
                      placeholder="e.g. White opens the kingside files, exploiting Black's uncastled king with dynamic precision..."
                      class="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-white hover:bg-white focus:bg-white px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors resize-y leading-relaxed"
                    ></textarea>
                  </div>
                </div>
              } @else if (move.comment) {
                <!-- INLINE COMMENTARY DISPLAY (When not actively editing this move) -->
                <div
                  (click)="selectMove(move.ply)"
                  class="my-2 p-3 bg-slate-50/70 hover:bg-slate-100/80 border-l-2 border-slate-900 rounded-r-xl cursor-pointer transition-colors space-y-1"
                  title="Click to edit annotation"
                >
                  @if (move.glyph; as g) {
                    <span class="inline-block px-1.5 py-0.5 text-[11px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-0.5">
                      {{ g.symbol }} {{ g.name }}
                    </span>
                  }
                  <div class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {{ move.comment }}
                  </div>
                </div>
              }

              <!-- BREAKLINE INDICATOR & SEPARATOR -->
              @if (move.hasBreak) {
                <div class="w-full my-2 flex items-center gap-2">
                  <div class="h-px bg-slate-200/70 flex-1"></div>
                  <button
                    type="button"
                    (click)="toggleBreakline(move.ply)"
                    class="text-[10px] font-mono text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-2 py-0.5 rounded border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                    title="Click to remove line break"
                  >
                    <span>↵ line break</span>
                    <span class="text-xs font-bold">&times;</span>
                  </button>
                  <div class="h-px bg-slate-200/70 flex-1"></div>
                </div>
              }
            }
          </div>
        } @else {
          <!-- Empty moves prompt -->
          <div class="py-6 text-center bg-slate-50/40 rounded-xl border border-dashed border-slate-200 space-y-1.5">
            <p class="text-xs sm:text-sm font-medium text-slate-600">
              No moves played yet.
            </p>
            <p class="text-xs text-gray-400">
              Make a move on the chess board on the right to start building the game notation and inline story.
            </p>
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
  currentPly = input<number>(0);
  moveHistory = input<ParsedMove[]>([]);

  plySelected = output<number>();
  annotationChanged = output<{ ply: number; comment: string; glyphId?: GlyphId | null; hasBreak?: boolean }>();
  deleteFromHere = output<number>();

  comment = signal<string>('');
  selectedGlyphId = signal<GlyphId | null>(null);

  readonly availableGlyphs = [
    { id: 1, symbol: '!', name: 'Good move' },
    { id: 2, symbol: '?', name: 'Mistake' },
    { id: 3, symbol: '!!', name: 'Brilliant move' },
    { id: 4, symbol: '??', name: 'Blunder' },
    { id: 5, symbol: '!?', name: 'Interesting' },
    { id: 6, symbol: '?!', name: 'Dubious' },
    { id: 10, symbol: '=', name: 'Equal' },
    { id: 14, symbol: '⩲', name: 'White slight advantage' },
    { id: 15, symbol: '⩱', name: 'Black slight advantage' },
    { id: 16, symbol: '±', name: 'White advantage' },
    { id: 17, symbol: '∓', name: 'Black advantage' },
    { id: 18, symbol: '+-', name: 'White winning' },
    { id: 19, symbol: '-+', name: 'Black winning' },
  ];

  readonly activeMove = computed<ParsedMove | null>(() => {
    const ply = this.currentPly();
    if (ply <= 0) return null;
    return this.moveHistory().find((m) => m.ply === ply) || null;
  });

  constructor() {
    effect(() => {
      const m = this.activeMove();
      if (m) {
        this.comment.set(m.comment || '');
        this.selectedGlyphId.set(m.glyph?.id || null);
      } else {
        this.comment.set('');
        this.selectedGlyphId.set(null);
      }
    });
  }

  selectMove(ply: number): void {
    this.plySelected.emit(ply);
  }

  toggleGlyph(id: GlyphId): void {
    this.selectedGlyphId.update((curr) => (curr === id ? null : id));
    this.onSave();
  }

  toggleBreakline(ply: number): void {
    const targetMove = this.moveHistory().find((m) => m.ply === ply);
    if (!targetMove) return;

    const newHasBreak = !targetMove.hasBreak;
    this.annotationChanged.emit({
      ply,
      comment: targetMove.comment || (this.currentPly() === ply ? this.comment() : ''),
      glyphId: targetMove.glyph?.id || (this.currentPly() === ply ? this.selectedGlyphId() : null),
      hasBreak: newHasBreak,
    });
  }

  onPreCommentChange(newVal: string): void {
    this.overview.set(newVal);
    this.annotationChanged.emit({
      ply: 0,
      comment: newVal,
    });
  }

  clearPreComment(): void {
    this.onPreCommentChange('');
  }

  onSave(): void {
    const ply = this.currentPly();
    if (ply <= 0) return;
    const active = this.activeMove();
    this.annotationChanged.emit({
      ply,
      comment: this.comment(),
      glyphId: this.selectedGlyphId(),
      hasBreak: active?.hasBreak,
    });
  }

  deleteFromCurrent(): void {
    const ply = this.currentPly();
    if (ply <= 0) return;
    this.deleteFromHere.emit(ply);
  }

  insertText(prefix: string, suffix: string): void {
    const cur = this.comment();
    this.comment.set(`${cur} ${prefix}text${suffix}`);
    this.onSave();
  }
}
