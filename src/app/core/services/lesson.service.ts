import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, LessonDetail } from '../models/course.model';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LessonService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  // Signals to hold our global state
  allCourses = signal<Course[]>([]);
  currentCourse = signal<Course | null>(null);
  activeLesson = signal<LessonDetail | null>(null);
  isLoadingCourse = signal<boolean>(false);
  isLoadingLesson = signal<boolean>(false);

  // 4. Fetch all available courses
  loadAllCourses() {
    return this.http.get<{ data: Course[] }>(`${this.apiUrl}/courses`).pipe(
      tap((response) => {
        this.allCourses.set(response.data);
      }),
    );
  }

  // 1. Fetch the Course (for the sidebar)
  loadCourse(slug: string) {
    this.isLoadingCourse.set(true);
    return this.http.get<{ data: Course }>(`${this.apiUrl}/courses/${slug}`).pipe(
      tap((response) => {
        // ensure prerequisites array exists so UI can rely on it
        const course = response.data;
        if (!course.prerequisites) {
          course.prerequisites = ['no required prerequisites for this course'];
        }
        this.currentCourse.set(course);
        this.isLoadingCourse.set(false);
      }),
    );
  }

  // 2. Fetch the specific Lesson (for the reading view)
  loadLesson(slug: string) {
    this.isLoadingLesson.set(true);
    return this.http.get<{ data: LessonDetail }>(`${this.apiUrl}/lessons/${slug}`).pipe(
      tap((response) => {
        this.activeLesson.set(response.data);
        this.isLoadingLesson.set(false);
      }),
    );
  }
}
