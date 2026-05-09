import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { MoveNode, GLYPH_MAPPING, GlyphId } from '../../../../core/models/study.model';
import { Dialog } from '@angular/cdk/dialog';
import { ShortcutsDialogComponent } from '../shortcuts-dialog/shortcuts-dialog.component';

export interface AnnotateMoveDialogResult {
  comment: string;
  glyphs: GlyphId[];
}

@Component({
  selector: 'app-annotate-move-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <div class="block max-w-lg w-[95vw] sm:w-[500px] mx-auto">
      <app-dialog-wrapper [title]="'Annotate ' + node.san" (close)="dialogRef.close()">
        <div class="space-y-6">
          <!-- Glyphs Selection -->
          <div class="space-y-3">
            <div class="flex items-center justify-between ml-1">
              <label class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Move Evaluation (Glyphs)
              </label>
              <button 
                (click)="openShortcuts()" 
                class="text-[10px]  text-accent hover:underline px-2 py-1"
                title="View Keyboard Shortcuts"
              >
                SHORTCUTS?
              </button>
            </div>
            <div class="grid grid-cols-6 sm:grid-cols-8 gap-2">
              @for (glyph of glyphs; track glyph.id) {
                <button
                  (click)="toggleGlyph(glyph.id)"
                  [title]="glyph.name"
                  class="flex items-center justify-center aspect-square rounded-lg border   group relative"
                  [class.bg-accent]="isSelected(glyph.id)"
                  [class.text-main]="isSelected(glyph.id)"
                  [class.border-accent]="isSelected(glyph.id)"
                  [class.bg-subtle/50]="!isSelected(glyph.id)"
                  [class.border-base]="!isSelected(glyph.id)"
                  [class.hover:border-accent/50]="!isSelected(glyph.id)"
                >
                  <span class="text-lg font-semibold">{{ glyph.symbol }}</span>
                  
                  <!-- Tooltip hint on hover -->
                  <div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface border border-border-base rounded text-[9px] font-semibold uppercase er whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none  z-10 shadow-xl">
                    {{ glyph.name }}
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- Comment Section -->
          <div class="space-y-3">
            <label class="text-[10px] font-semibold uppercase tracking-wider text-muted ml-1">
              Comment
            </label>
            <div class="relative group">
              <textarea
                [ngModel]="comment()"
                (ngModelChange)="comment.set($event)"
                placeholder="add your thoughts on this move.."
                rows="4"
                class="w-full px-4 py-3 bg-subtle/50 backdrop-blur-sm border border-base rounded-2xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none    resize-none custom-scrollbar"
                autofocus
              ></textarea>
              <div class="absolute inset-0 rounded-2xl bg-accent/5 opacity-0 group-focus-within:opacity-100 pointer-events-none  "></div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <button actions appButton variant="outline" (click)="dialogRef.close()">
          Cancel
        </button>
        <button actions appButton variant="primary" (click)="onSubmit()">
          Save Annotation
        </button>
      </app-dialog-wrapper>
    </div>
  `,
})
export class AnnotateMoveDialogComponent implements OnInit {
  dialogRef = inject(DialogRef<AnnotateMoveDialogResult>);
  node = inject<MoveNode>(DIALOG_DATA);
  private dialog = inject(Dialog);

  comment = signal('');
  selectedGlyphs = signal<GlyphId[]>([]);

  glyphs = Object.entries(GLYPH_MAPPING).map(([id, data]) => ({
    id: Number(id) as GlyphId,
    ...data,
  }));

  ngOnInit() {
    if (this.node.comments && this.node.comments.length > 0) {
      this.comment.set(this.node.comments[0]);
    }
    if (this.node.glyphs && this.node.glyphs.length > 0) {
      this.selectedGlyphs.set([...this.node.glyphs]);
    }
  }

  toggleGlyph(id: GlyphId) {
    // Standard chess usually only has one NAG for evaluation. 
    // We'll support multiple just in case, but toggle logic should be intuitive.
    // Actually, Lichess usually only allows one primary evaluation glyph.
    // For simplicity, let's allow only one glyph from this set at a time.
    this.selectedGlyphs.update(current => 
      current.includes(id) ? [] : [id]
    );
  }

  isSelected(id: GlyphId): boolean {
    return this.selectedGlyphs().includes(id);
  }

  onSubmit() {
    this.dialogRef.close({
      comment: this.comment().trim(),
      glyphs: this.selectedGlyphs(),
    });
  }

  openShortcuts() {
    this.dialog.open(ShortcutsDialogComponent);
  }
}
