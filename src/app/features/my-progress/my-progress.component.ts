import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { LessonService } from '../../core/services/lesson.service';
import { Header } from '../../shared/components/header/header';

@Component({
  selector: 'app-my-progress',
  standalone: true,
  imports: [CommonModule, RouterModule, Header],
  templateUrl: './my-progress.component.html',
})
export class MyProgressComponent implements OnInit {
  userService = inject(UserService);
  lessonService = inject(LessonService);

  ngOnInit() {
    this.userService.loadMyProfile().subscribe();
    this.lessonService.loadAllCourses().subscribe();
  }

  startedCourses = computed(() => {
    const user = this.userService.currentUser();
    const courses = this.lessonService.allCourses();

    if (!user || !courses || courses.length === 0) return [];

    const completedIds = user.progress?.completedLessonIds || [];

    return courses.map(course => {
      console.log('Course Object Structure:', course);
      const allLessons = course?.chapters?.flatMap(c => c.lessons || []) || [];
      const total = allLessons.length;

      if (total === 0) return null;

      const completed = allLessons.filter(l => l && completedIds.includes(l.id)).length;
      const progressPercent = Math.round((completed / total) * 100);
      const nextLesson = allLessons.find(l => l && !completedIds.includes(l.id));

      return {
        course,
        progressPercent,
        completedCount: completed,
        totalCount: total,
        resumeLesson: nextLesson || allLessons[allLessons.length - 1],
        isFinished: progressPercent === 100
      };
    })
      .filter((data): data is NonNullable<typeof data> => data !== null);
  });
}