// src/app/features/learn/learn.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { LessonView } from './components/lesson-view/lesson-view';
import { LessonService } from '../../core/services/lesson.service';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [Header, Sidebar, LessonView],
  templateUrl: './learn.component.html',
})
export class LearnComponent implements OnInit {
  public lessonService = inject(LessonService);

  public activeLessonId: string = '';

  ngOnInit() {
    const course = this.lessonService.activeCourse();
    
    if (course.chapters.length > 0 && course.chapters[0].lessons.length > 0) {
      this.onSelectLesson(course.chapters[0].lessons[0].id);
    }
  }

  onSelectLesson(lessonId: string) {
    this.activeLessonId = lessonId;
    this.lessonService.loadLesson(lessonId); 
  }

  private getAllLessonIds(): string[] {
    const course = this.lessonService.activeCourse();
    if (!course) return [];
    
    return course.chapters.flatMap(chapter => 
      chapter.lessons.map(lesson => lesson.id)
    );
  }

  goToNextLesson() {
    const allIds = this.getAllLessonIds();
    const currentIndex = allIds.indexOf(this.activeLessonId);

    if (currentIndex !== -1 && currentIndex < allIds.length - 1) {
      const nextId = allIds[currentIndex + 1];
      this.onSelectLesson(nextId); 
    }
  }

  goToPrevLesson() {
    const allIds = this.getAllLessonIds();
    const currentIndex = allIds.indexOf(this.activeLessonId);

    if (currentIndex > 0) {
      const prevId = allIds[currentIndex - 1];
      this.onSelectLesson(prevId);
    }
  }
}