import { Component, inject, OnInit, AfterViewInit, ElementRef, ViewChild, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LessonService } from '../../core/services/lesson.service';
import { TacticsService, Puzzle } from '../../core/services/tactics.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { TacticsBoardComponent } from '../../shared/components/tactics-board/tactics-board.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FooterComponent, TacticsBoardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HomeComponent implements OnInit, AfterViewInit {
  private lessonService = inject(LessonService);
  private tacticsService = inject(TacticsService);
  private router = inject(Router);

  @ViewChild('splineContainer') splineContainer!: ElementRef<HTMLDivElement>;

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

  // Tactics Puzzle State
  currentPuzzle = signal<Puzzle | null>(null);
  userColor = signal<'white' | 'black'>('white');
  puzzleStatus = signal<'playing' | 'success' | 'failed'>('playing');

  ngOnInit() {
    this.lessonService.loadAllCourses().subscribe();
    this.loadPuzzle();
  }

  ngAfterViewInit() {
    this.splineContainer.nativeElement.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault();
        window.scrollBy({ top: event.deltaY, left: event.deltaX, behavior: 'auto' });
      },
      { passive: false },
    );
  }

  loadPuzzle() {
    this.tacticsService.getDailyPuzzle().subscribe((res) => {
      this.currentPuzzle.set(res.data);
    });
  }

  onPuzzleSolved() {
    this.puzzleStatus.set('success');
  }

  onPuzzleFailed() {
    this.puzzleStatus.set('failed');
  }

  onUserColorChange(color: 'white' | 'black') {
    this.userColor.set(color);
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
