import { Component, inject, OnInit } from '@angular/core';
import { LessonService } from '../../core/services/lesson.service';
import { Header } from './components/header/header';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LessonView } from './components/lesson-view/lesson-view';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [Header, SidebarComponent, LessonView],
  templateUrl: './learn.component.html',
})
export class LearnComponent implements OnInit {
  lessonService = inject(LessonService);

  // Expose the signals to the HTML
  course = this.lessonService.currentCourse;
  activeLesson = this.lessonService.activeLesson;
  isLoadingLesson = this.lessonService.isLoadingLesson;

  ngOnInit() {
    // 1. Load our seeded course from Laravel!
    this.lessonService.loadCourse('chess-basics').subscribe({
      next: (res) => {
        // 2. Automatically load the very first lesson so the screen isn't blank
        const firstLessonSlug = res.data.chapters[0]?.lessons[0]?.id;
        if (firstLessonSlug) {
          this.onLessonSelected(firstLessonSlug);
        }
      },
    });
  }

  // 3. This fires when the user clicks a lesson in the Sidebar
  onLessonSelected(lessonSlug: string) {
    this.lessonService.loadLesson(lessonSlug).subscribe();
  }

  private get allLessons() {
    return this.course()?.chapters.flatMap((c) => c.lessons) || [];
  }

  onNextLesson() {
    const lessons = this.allLessons;
    const currentId = this.activeLesson()?.id;
    if (!currentId) return;

    const currentIndex = lessons.findIndex((l) => l.id === currentId);
    if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
      this.onLessonSelected(lessons[currentIndex + 1].id);
    }
  }

  onPrevLesson() {
    const lessons = this.allLessons;
    const currentId = this.activeLesson()?.id;
    if (!currentId) return;

    const currentIndex = lessons.findIndex((l) => l.id === currentId);
    if (currentIndex > 0) {
      this.onLessonSelected(lessons[currentIndex - 1].id);
    }
  }
}
