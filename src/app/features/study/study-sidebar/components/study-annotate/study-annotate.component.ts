import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MoveNode, GLYPH_MAPPING, GlyphId } from '../../../../../core/models/study.model';
import { StudyFacade } from '../../../services/study.facade';

@Component({
  selector: 'app-study-annotate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './study-annotate.component.html',
  host: {
    'class': 'flex flex-col min-h-0 overflow-hidden'
  }
})
export class StudyAnnotateComponent {
  public facade = inject(StudyFacade);

  node = this.facade.currentNode;
  canEdit = this.facade.canEdit;

  comment = signal('');
  selectedGlyphs = signal<GlyphId[]>([]);

  glyphs = Object.entries(GLYPH_MAPPING).map(([id, data]) => ({
    id: Number(id) as GlyphId,
    ...data,
  }));

  constructor() {
    effect(() => {
      const activeNode = this.node();
      if (activeNode) {
        this.comment.set(activeNode.comments && activeNode.comments.length > 0 ? activeNode.comments[0] : '');
        this.selectedGlyphs.set(activeNode.glyphs ? [...activeNode.glyphs] : []);
      } else {
        const firstMove = this.facade.moveTree()[0];
        this.comment.set(firstMove && firstMove.preComments && firstMove.preComments.length > 0 ? firstMove.preComments[0] : '');
        this.selectedGlyphs.set([]);
      }
    });
  }

  toggleGlyph(id: GlyphId) {
    if (!this.canEdit()) return;
    this.selectedGlyphs.update(current =>
      current.includes(id) ? [] : [id]
    );
    this.onSave();
  }

  isSelected(id: GlyphId): boolean {
    return this.selectedGlyphs().includes(id);
  }

  onSave() {
    if (!this.canEdit()) return;
    const activeNode = this.node();
    if (activeNode) {
      this.facade.saveAnnotation(activeNode, this.comment(), this.selectedGlyphs());
    } else if (this.facade.moveTree().length > 0) {
      this.facade.saveStartComment(this.comment());
    }
  }

  onCancel() {
    const activeNode = this.node();
    if (activeNode) {
      this.comment.set(activeNode.comments && activeNode.comments.length > 0 ? activeNode.comments[0] : '');
      this.selectedGlyphs.set(activeNode.glyphs ? [...activeNode.glyphs] : []);
    } else {
      const firstMove = this.facade.moveTree()[0];
      this.comment.set(firstMove && firstMove.preComments && firstMove.preComments.length > 0 ? firstMove.preComments[0] : '');
      this.selectedGlyphs.set([]);
    }
    this.facade.activeSection.set('chapters');
  }
}
