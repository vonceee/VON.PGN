import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() activeLessonId: string = '';
  @Input({ required: true }) courseData!: Course;
  @Output() lessonSelected = new EventEmitter<string>();

  onSelectLesson(lessonId: string) {
    this.lessonSelected.emit(lessonId);
  }
}
