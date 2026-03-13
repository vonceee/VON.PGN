import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { LessonService } from '../../core/services/lesson.service';
import { Header } from '../../shared/components/header/header'; // Adjust path as needed

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
    // Ensure the course catalog is loaded so we can calculate against it
    if (this.lessonService.allCourses().length === 0) {
      this.lessonService.loadAllCourses().subscribe();
    }
  }

  // Dynamically calculate progress and find the "Resume" point for every course
  startedCourses = computed(() => {
    const user = this.userService.currentUser();
    const courses = this.lessonService.allCourses();

    if (!user || !courses.length) return [];

    // Note: check if your frontend maps this to camelCase (completedLessonIds)
    const completedIds = user.progress.completedLessonIds || [];

    return courses.map(course => {
      // 1. Flatten all lessons into a single ordered array
      const allLessons = course.chapters.flatMap(c => c.lessons);
      const total = allLessons.length;

      if (total === 0) return null;

      // 2. Calculate the progress percentage
      const completed = allLessons.filter(l => completedIds.includes(l.id)).length;
      const progressPercent = Math.round((completed / total) * 100);

      // 3. Find the exact lesson to resume! 
      // (The first lesson in the sequence that is NOT in their completed array)
      const nextLesson = allLessons.find(l => !completedIds.includes(l.id));

      return {
        course,
        progressPercent,
        completedCount: completed,
        totalCount: total,
        resumeLesson: nextLesson || allLessons[allLessons.length - 1], // Fallback if 100% done
        isFinished: progressPercent === 100
      };
    })
    // 4. ONLY show courses where they have completed at least 1 lesson
    .filter(data => data !== null && data.completedCount > 0); 
  });
}