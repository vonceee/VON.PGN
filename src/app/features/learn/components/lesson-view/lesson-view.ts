import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LessonDetail } from '../../../../core/models/course.model';
import { InteractiveBoardComponent } from '../interactive-board/interactive-board.component';

@Component({
  selector: 'app-lesson-view',
  imports: [InteractiveBoardComponent],
  templateUrl: './lesson-view.html',
  styleUrl: './lesson-view.css',
})
export class LessonView {
  @Input() lessonData: LessonDetail | null = null;

  @Output() nextLesson = new EventEmitter<string>();
  @Output() prevLesson = new EventEmitter<string>();

  onNext() {
    this.nextLesson.emit();
  }

  onPrev() {
    this.prevLesson.emit();
  }
}
