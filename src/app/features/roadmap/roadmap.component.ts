import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Header } from '../../shared/components/header/header';
import { LessonService } from '../../core/services/lesson.service';
import { Course } from '../../core/models/course.model';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule, RouterModule, Header],
  templateUrl: './roadmap.component.html',
  styleUrl: './roadmap.component.css',
})
export class RoadmapComponent implements OnInit {
  private lessonService = inject(LessonService);
  private router = inject(Router);

  get allCourses(): Course[] {
    return this.lessonService.allCourses();
  }

  ngOnInit() {
    this.lessonService.loadAllCourses().subscribe();
  }

  selectCourse(courseId: string) {
    this.router.navigate(['/learn', courseId]);
  }
}
