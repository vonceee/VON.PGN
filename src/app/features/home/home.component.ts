import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LessonService } from '../../core/services/lesson.service';
import { FooterComponent } from '@shared/layout';
import { TypewriterTextComponent, ButtonComponent, SectionHeadingComponent, ArrowLinkComponent } from '@shared/ui';
import { FeedbackButtonComponent } from '@shared/feedback';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FooterComponent,
    TypewriterTextComponent,
    FeedbackButtonComponent,
    SectionHeadingComponent,
    ButtonComponent,
    ArrowLinkComponent,
  ],
  providers: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private lessonService = inject(LessonService);
  private router = inject(Router);
  authService = inject(AuthService);

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
