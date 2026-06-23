import { Component, inject, signal, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
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
  templateUrl: './annotate-move-dialog.component.html',
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
  isGlyphsExpanded = signal(false);

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
      this.isGlyphsExpanded.set(true); // Expand automatically if glyphs exist
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

  toggleGlyphsExpanded() {
    this.isGlyphsExpanded.update(v => !v);
  }

  getGlyphSymbol(id: GlyphId): string {
    return GLYPH_MAPPING[id]?.symbol || '';
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

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
