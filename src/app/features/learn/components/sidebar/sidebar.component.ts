import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course } from '../../../../core/models/course.model';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronRight } from '@ng-icons/heroicons/outline';
import { BackLinkComponent } from '@shared/ui';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, NgIconComponent, BackLinkComponent],
  providers: [provideIcons({ heroChevronRight })],
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
