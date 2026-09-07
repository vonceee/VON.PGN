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
 * Revamped Editorial Storyline & Move Annotation Component.
 * 
 * WHY: Replaces disconnected section forms with an interactive inline chess blog workflow
 *      matching the study page. Playing moves on the board reflects in the inline notation,
 *      and typing move commentary updates the PGN in real time.
 */
@Component({
  selector: 'app-wcc-section-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- 1. Inline Move Notation Stream (Study Page Flow in Inline Blog Format) -->
      <div class="p-5 sm:p-6 space-y-3">
        @if (moveHistory().length > 0) {
          <!-- Inline reading flow -->
          <div class="p-3 text-sm sm:text-base select-none">
            @for (move of moveHistory(); track move.ply) {
              @if (move.color === 'w') {
                <span class="text-slate-400 font-semibold mr-1 ml-1.5 first:ml-0 text-xs sm:text-sm">
                  {{ move.moveNumber }}.
                </span>
              }

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
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 hover:border-slate-400 font-semibold text-xs sm:text-sm cursor-pointer transition-all mr-1"
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
            }
          </div>
        } @else {
          <!-- Empty moves prompt -->
          <div class="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <svg class="w-8 h-8 text-slate-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p class="text-xs sm:text-sm font-medium text-slate-600">
              No moves yet. Make a move on the chess board on the right!
            </p>
            <p class="text-xs text-gray-400">
              Moves played on the board immediately appear here in the inline storyline.
            </p>
          </div>
        }
      </div>

      <!-- 2. Active Move Annotation Editor (Study Page Flow) -->
      @if (currentPly() > 0 && activeMove(); as m) {
        <div class="bg-white p-5 sm:p-6 space-y-4">
          <!-- Header: Current Move, Navigation, Delete action -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-sm">
                {{ m.color === 'w' ? m.moveNumber + '.' : m.moveNumber + '...' }} {{ m.san }}
              </span>
              <span class="text-xs font-semibold text-slate-600">
                Move Annotation &amp; Storyline
              </span>
              @if (m.glyph; as g) {
                <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {{ g.symbol }} {{ g.name }}
                </span>
              }
            </div>

            <!-- Action Controls -->
            <div class="flex items-center gap-2 self-end sm:self-auto">
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

          <!-- Move Evaluation Glyphs Grid (Matching Study Page) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Move Evaluation Symbol
            </label>
            <div class="flex flex-wrap gap-1.5">
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
                  class="px-2.5 py-1 text-xs font-bold rounded-lg border hover:border-slate-400 transition-colors cursor-pointer"
                  [title]="g.name"
                >
                  <span>{{ g.symbol }}</span>
                </button>
              }
              @if (selectedGlyphId()) {
                <button
                  type="button"
                  (click)="selectedGlyphId.set(null); onSave()"
                  class="px-2 py-1 text-xs text-gray-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Clear evaluation symbol"
                >
                  Clear Symbol
                </button>
              }
            </div>
          </div>

          <!-- Commentary Textarea -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Annotation Commentary &amp; Story Analysis
              </label>
              <div class="flex items-center gap-1 text-xs text-slate-500">
                <button
                  type="button"
                  (click)="insertText('**', '**')"
                  class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  (click)="insertText('*', '*')"
                  class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 italic text-slate-800 cursor-pointer"
                  title="Italic"
                >
                  I
                </button>
              </div>
            </div>

            <textarea
              #commentTextarea
              [ngModel]="comment()"
              (ngModelChange)="comment.set($event); onSave()"
              rows="4"
              placeholder="e.g. White launches a central strike, challenging Black's defensive outpost and gaining a spatial initiative..."
              class="w-full px-3.5 py-2.5 text-sm text-slate-800 leading-relaxed rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-400 transition-colors resize-y"
            ></textarea>
          </div>

          <div class="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>Changes save automatically into the game's PGN notation.</span>
            <span class="font-medium text-emerald-700">✓ In Sync</span>
          </div>
        </div>
      }
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
  annotationChanged = output<{ ply: number; comment: string; glyphId?: GlyphId | null }>();
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

  onSave(): void {
    const ply = this.currentPly();
    if (ply <= 0) return;
    this.annotationChanged.emit({
      ply,
      comment: this.comment(),
      glyphId: this.selectedGlyphId(),
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
