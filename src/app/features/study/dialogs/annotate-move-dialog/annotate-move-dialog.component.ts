import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { MoveNode, GLYPH_MAPPING, GlyphId } from '../../../../core/models/study.model';

export interface AnnotateMoveDialogResult {
  comment: string;
  glyphs: GlyphId[];
}

@Component({
  selector: 'app-annotate-move-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl w-full max-w-3xl p-8 space-y-8 relative mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">Annotate {{ node.san }}</h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-6">
        <!-- Glyphs Selection -->
        <div class="space-y-3">
          <div class="grid grid-cols-6 sm:grid-cols-8 gap-2">
            @for (glyph of glyphs; track glyph.id) {
              <button
                (click)="toggleGlyph(glyph.id)"
                [title]="glyph.name"
                class="flex items-center justify-center aspect-square rounded-4xl cursor-pointer group relative"
                [class.bg-accent]="isSelected(glyph.id)"
                [class.bg-subtle/50]="!isSelected(glyph.id)"
              >
                <span class="text-lg font-semibold">{{ glyph.symbol }}</span>
                
                <!-- Tooltip hint on hover -->
                <div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface border border-border-base rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {{ glyph.name }}
                </div>
              </button>
            }
          </div>
        </div>

        <!-- Comment Section -->
        <div class="space-y-3">
          <div class="relative group">
            <textarea
              [ngModel]="comment()"
              (ngModelChange)="comment.set($event)"
              placeholder="add your thoughts on this move.."
              rows="4"
              class="w-full px-4 py-3 bg-subtle/50 rounded-2xl text-sm outline-none resize-none custom-scrollbar"
              autofocus
            ></textarea>
            <div class="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 pointer-events-none"></div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 w-full">
        <button appButton variant="outline" (click)="dialogRef.close()" class="flex-1">
          Cancel
        </button>
        <button appButton variant="primary" (click)="onSubmit()" class="flex-1">
          Save annotation
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
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
