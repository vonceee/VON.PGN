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

  allCourses = signal<Course[]>([]);
  currentCourse = signal<Course | null>(null);
  activeLesson = signal<LessonDetail | null>(null);
  isLoadingCourse = signal<boolean>(false);
  isLoadingLesson = signal<boolean>(false);

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
    this.isLoadingLesson.set(true);
    return this.http.get<{ data: LessonDetail }>(`${this.apiUrl}/lessons/${slug}`).pipe(
      tap((response) => {
        this.activeLesson.set(response.data);
        this.isLoadingLesson.set(false);
      }),
    );
  }
}
