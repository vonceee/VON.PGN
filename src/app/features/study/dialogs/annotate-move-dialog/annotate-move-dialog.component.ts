import { Component, inject, signal, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA, Dialog } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { MoveNode, GLYPH_MAPPING, GlyphId } from '../../../../core/models/study.model';
import { ShortcutsDialogComponent } from '../shortcuts-dialog/shortcuts-dialog.component';

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
      <div class="flex items-center justify-between pb-2 border-b border-border-base/35">
        <h2 class="text-2xl text-content">Annotate {{ node.san }}</h2>
        <button (click)="openShortcuts()" title="Keyboard Shortcuts" class="text-muted hover:text-content cursor-pointer transition-colors p-1 rounded-lg hover:bg-subtle shrink-0" type="button">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>
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
              #commentArea
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
export class AnnotateMoveDialogComponent implements OnInit, AfterViewInit {
  dialogRef = inject(DialogRef<AnnotateMoveDialogResult>);
  node = inject<MoveNode>(DIALOG_DATA);
  private dialog = inject(Dialog);

  @ViewChild('commentArea') commentArea!: ElementRef<HTMLTextAreaElement>;

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

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.commentArea) {
        this.commentArea.nativeElement.select();
      }
    }, 50);
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

  openShortcuts() {
    this.dialog.open(ShortcutsDialogComponent);
  }
}
