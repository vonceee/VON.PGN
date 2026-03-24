import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LessonService } from '../../core/services/lesson.service';
import { Course } from '../../core/models/course.model';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private lessonService = inject(LessonService);
  private router = inject(Router);
  
  popularOpenings = [
    { title: 'Sicilian Defense', description: 'The most popular response to e4.', icon: '♟️', slug: 'sicilian' },
    { title: 'Ruy Lopez', description: 'A classic and versatile opening.', icon: '🛡️', slug: 'ruy-lopez' },
    { title: 'Queen\'s Gambit', description: 'Dynamic and strategically rich.', icon: '👑', slug: 'queens-gambit' }
  ];

  featuredTactic = {
    title: 'Find the Fork!',
    description: 'White to move and win material using a knight fork.',
    difficulty: 'Intermediate',
    xpAward: 25
  };

  featuredCoursesList = computed(() => {
    return this.allCourses().slice(0, 3);
  });

  searchQuery = signal<string>('');
  allCourses = this.lessonService.allCourses;

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
    this.lessonService.loadAllCourses().subscribe();
  }

  navigateToCourse(slug: string) {
    this.router.navigate(['/learn', slug]);
    this.searchQuery.set('');
  }

  onSearch() {
    const results = this.searchResults();
    if (results.length > 0) {
      this.navigateToCourse(results[0].id); // Assuming id is the slug or similar
    }
  }
}
