import { Component, inject, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LessonService } from '../../core/services/lesson.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TypewriteDirective } from '../../shared/directives/typewrite.directive';
import { FeedbackButtonComponent } from '../../shared/components/feedback-button/feedback-button.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FooterComponent, TypewriteDirective, FeedbackButtonComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomeComponent implements OnInit {
  private lessonService = inject(LessonService);
  private router = inject(Router);



  popularOpenings = [
    {
      title: 'Sicilian Defense',
      description: 'The most popular response to e4.',
      slug: 'sicilian',
    },
    {
      title: "Queen's Gambit",
      description: 'Dynamic and strategically rich.',
      slug: 'queens-gambit',
    },
  ];

  searchQuery = signal<string>('');
  allCourses = this.lessonService.allCourses;
  isLoading = signal(true);

  featuredCoursesList = computed(() => {
    return this.allCourses().slice(0, 3);
  });

  searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return this.allCourses().filter(
      (course) =>
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query),
    );
  });

  ngOnInit() {
    this.lessonService.loadAllCourses().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });

    this.loadSplineScript();
  }

  private loadSplineScript(): void {
    if (document.querySelector('script[src*="spline-viewer"]')) {
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.12.78/build/spline-viewer.js';
    document.head.appendChild(script);
  }





  navigateToCourse(slug: string) {
    this.router.navigate(['/learn', slug]);
    this.searchQuery.set('');
  }

  onSearch() {
    const results = this.searchResults();
    if (results.length > 0) {
      this.navigateToCourse(results[0].id);
    }
  }
}
