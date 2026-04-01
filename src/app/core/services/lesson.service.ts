import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, LessonDetail } from '../models/course.model';
import { tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private lessonCache = new Map<string, LessonDetail>();

  allCourses = signal<Course[]>([]);
  currentCourse = signal<Course | null>(null);
  activeLesson = signal<LessonDetail | null>(null);
  isLoadingCourse = signal<boolean>(false);
  isLoadingLesson = signal<boolean>(false);
  isTransitioningLesson = signal<boolean>(false);

  loadAllCourses() {
    return this.http.get<{ data: Course[] }>(`${this.apiUrl}/courses`).pipe(
      tap((response) => {
        this.allCourses.set(response.data);
      }),
    );
  }

  loadCourse(slug: string) {
    this.isLoadingCourse.set(true);
    return this.http.get<{ data: Course }>(`${this.apiUrl}/courses/${slug}`).pipe(
      tap((response) => {
        const course = response.data;
        if (!course.prerequisites) {
          course.prerequisites = ['no required prerequisites for this course'];
        }
        this.currentCourse.set(course);
        this.isLoadingCourse.set(false);
      }),
    );
  }

  loadLesson(slug: string) {
    const cached = this.lessonCache.get(slug);
    if (cached) {
      this.isTransitioningLesson.set(true);
      return of({ data: cached }).pipe(
        tap((response) => {
          this.activeLesson.set(response.data);
          this.isTransitioningLesson.set(false);
        }),
      );
    }

    this.isLoadingLesson.set(true);
    this.isTransitioningLesson.set(true);
    return this.http.get<{ data: LessonDetail }>(`${this.apiUrl}/lessons/${slug}`).pipe(
      tap((response) => {
        this.lessonCache.set(slug, response.data);
        this.activeLesson.set(response.data);
        this.isLoadingLesson.set(false);
        this.isTransitioningLesson.set(false);
      }),
    );
  }

  prefetchLesson(slug: string) {
    if (this.lessonCache.has(slug)) return;
    this.http.get<{ data: LessonDetail }>(`${this.apiUrl}/lessons/${slug}`).subscribe({
      next: (response) => {
        this.lessonCache.set(slug, response.data);
      },
    });
  }
}
