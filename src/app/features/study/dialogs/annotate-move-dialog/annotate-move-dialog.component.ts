import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { MoveNode, GLYPH_MAPPING, GlyphId } from '../../../../core/models/study.model';

export interface AnnotateMoveDialogResult {
  comment: string;
  glyphs: GlyphId[];
}

@Component({
  selector: 'app-annotate-move-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <div class="block max-w-md w-[90vw] mx-auto">
      <app-dialog-wrapper [title]="'Annotate ' + node.san" (close)="dialogRef.close()">
        <div class="space-y-6">
          <!-- Glyphs Selection -->
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">
              Move Evaluation (Glyphs)
            </label>
            <div class="grid grid-cols-3 gap-2">
              @for (glyph of glyphs; track glyph.id) {
                <button
                  (click)="toggleGlyph(glyph.id)"
                  class="flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 group"
                  [class.bg-accent]="isSelected(glyph.id)"
                  [class.text-main]="isSelected(glyph.id)"
                  [class.border-accent]="isSelected(glyph.id)"
                  [class.bg-subtle/50]="!isSelected(glyph.id)"
                  [class.border-base]="!isSelected(glyph.id)"
                  [class.hover:border-accent/50]="!isSelected(glyph.id)"
                >
                  <span [class]="glyph.class" class="text-xl font-bold mb-1">{{ glyph.symbol }}</span>
                  <span class="text-[9px] uppercase tracking-tighter opacity-70 font-black">{{ glyph.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Comment Section -->
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted ml-1">
              Comment
            </label>
            <div class="relative group">
              <textarea
                [(ngModel)]="comment"
                placeholder="add your thoughts on this move.."
                rows="4"
                class="w-full px-4 py-3 bg-subtle/50 backdrop-blur-sm border border-base rounded-2xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none dark:text-content transition-all duration-300 resize-none custom-scrollbar"
                autofocus
              ></textarea>
              <div class="absolute inset-0 rounded-2xl bg-accent/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300"></div>
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
}
