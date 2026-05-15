import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LessonService } from '../../core/services/lesson.service';
import { ServerMaintenanceComponent  } from '@shared/feedback';
import { LoadingComponent  } from '@shared/feedback';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule, RouterModule, ServerMaintenanceComponent, LoadingComponent],
  templateUrl: './roadmap.component.html',
  styleUrl: './roadmap.component.css',
})
export class RoadmapComponent implements OnInit {
  private lessonService = inject(LessonService);
  private router = inject(Router);

  hasError = signal(false);
  isLoading = signal(true);

  allCourses = this.lessonService.allCourses;

  ngOnInit() {
    this.lessonService.loadAllCourses().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }

  selectCourse(courseId: string) {
    this.router.navigate(['/learn', courseId]);
  }
}

