import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() course: Course | null = null;
  @Input() activeLessonId: string = '';

  @Output() lessonSelected = new EventEmitter<string>();

  onSelect(lessonId: string) {
    this.lessonSelected.emit(lessonId);
  }
}
