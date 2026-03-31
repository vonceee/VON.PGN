import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LessonService } from '../../core/services/lesson.service';
import { SeoService } from '../../core/services/seo.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LessonView } from './components/lesson-view/lesson-view';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [SidebarComponent, LessonView],
  templateUrl: './learn.component.html',
})
export class LearnComponent implements OnInit {
  lessonService = inject(LessonService);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  course = this.lessonService.currentCourse;
  activeLesson = this.lessonService.activeLesson;
  isLoadingCourse = this.lessonService.isLoadingCourse;
  isLoadingLesson = this.lessonService.isLoadingLesson;

  ngOnInit() {
    const courseSlug = this.route.snapshot.paramMap.get('courseSlug');
    const targetLessonId = this.route.snapshot.queryParamMap.get('lesson');

    if (courseSlug) {
      this.lessonService.loadCourse(courseSlug).subscribe({
        next: () => {
          const c = this.course();
          if (c) {
            this.seo.update({
              title: c.title,
              description: c.description?.substring(0, 160) || `Study ${c.title} on VON.PGN.`,
              url: `https://vonchess.com/learn/${courseSlug}`,
              type: 'article',
            });
          }
          if (targetLessonId) {
            this.onLessonSelected(targetLessonId);
          }
        },
      });
    }
  }

  onLessonSelected(lessonSlug: string) {
    if (!lessonSlug) {
      this.lessonService.activeLesson.set(null);
      return;
    }
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
