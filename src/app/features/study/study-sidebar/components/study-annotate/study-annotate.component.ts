import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MoveNode, GLYPH_MAPPING, GlyphId } from '../../../models/study.model';
import { StudyFacade } from '../../../facade/study.facade';
import { TextAreaComponent } from '@shared/ui';

@Component({
  selector: 'app-study-annotate',
  standalone: true,
  imports: [CommonModule, FormsModule, TextAreaComponent],
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

  getGlyphButtonClasses(glyph: { id: number; symbol: string; name: string; class: string }): string {
    const selected = this.isSelected(glyph.id);
    if (!selected) {
      return 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300';
    }
    switch (glyph.class) {
      case 'brilliant':
        return 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/50 scale-105';
      case 'good':
        return 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-violet-400 shadow-md shadow-violet-500/30 ring-2 ring-violet-400/50 scale-105';
      case 'interesting':
        return 'bg-gradient-to-br from-pink-500 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-500/30 ring-2 ring-pink-400/50 scale-105';
      case 'dubious':
        return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50 scale-105';
      case 'mistake':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400 shadow-md shadow-orange-500/30 ring-2 ring-orange-400/50 scale-105';
      case 'blunder':
        return 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50 scale-105';
      default:
        return 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105';
    }
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
