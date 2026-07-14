import { Component, input, output } from '@angular/core';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Study, StudyChapter } from '../../../../../core/models/study.model';

@Component({
  selector: 'app-study-chapters-list',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './chapters-list.component.html'
})
export class ChaptersListComponent {
  study = input.required<Study | null>();
  currentChapter = input.required<StudyChapter | null>();
  canEdit = input.required<boolean>();

  chapterSelected = output<StudyChapter>();
  chapterEditClicked = output<{ event: MouseEvent; chapter: StudyChapter }>();
  orderChanged = output<CdkDragDrop<StudyChapter[]>>();

  selectChapter(chap: StudyChapter) {
    this.chapterSelected.emit(chap);
  }

  onEditChapter(event: MouseEvent, chap: StudyChapter) {
    this.chapterEditClicked.emit({ event, chapter: chap });
  }

  onDrop(event: CdkDragDrop<StudyChapter[]>) {
    this.orderChanged.emit(event);
  }
}
