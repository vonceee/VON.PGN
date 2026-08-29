import { Component, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LessonService } from '../../core/services/lesson.service';
import { PresenceService } from '../../core/services/presence.service';
import { TacticsService } from '../../core/services/tactics.service';
import { CreatorActivityFeedComponent } from './components/creator-activity-feed/creator-activity-feed.component';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroMagnifyingGlass,
  heroCheckBadge,
  heroBookOpen,
  heroGlobeAlt,
  heroVideoCamera,
  heroUsers,
  heroClipboardDocument,
  heroTrophy,
  heroQuestionMarkCircle,
  heroPuzzlePiece,
  heroSparkles,
  heroCommandLine,
  heroPlay,
  heroGlobeAsiaAustralia,
} from '@ng-icons/heroicons/outline';
import { FloatingCursorContainerDirective, FloatingCursorTriggerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgIconComponent,
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent,
    CreatorActivityFeedComponent,
  ],
  providers: [
    provideIcons({
      heroMagnifyingGlass,
      heroCheckBadge,
      heroBookOpen,
      heroGlobeAlt,
      heroVideoCamera,
      heroGlobeAsiaAustralia,
      heroUsers,
      heroClipboardDocument,
      heroTrophy,
      heroQuestionMarkCircle,
      heroPuzzlePiece,
      heroSparkles,
      heroCommandLine,
      heroPlay,
    }),
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {


  private lessonService = inject(LessonService);
  private router = inject(Router);
  authService = inject(AuthService);
  presenceService = inject(PresenceService);
  private tacticsService = inject(TacticsService);

  tacticsPreviewFen = signal<string>('3r2k1/p4ppp/1p2pb2/1q6/8/PN2B1P1/1P2QP1P/3R2K1 b - - 0 24');

  /** Category tab filter: 'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments' */
  activeCategory = signal<'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments'>('all');

  /** Static coach preview cards — visual anchors on the landing page. */
  coaches: { name: string; title: string; rating: number; initials: string }[] = [];

  /** Static featured event preview card. */
  mockEvent: { name: string; date: string; location: string; format: string } | null = null;

  // ── Courses & search ──────────────────────────────────────────────────────
  searchQuery = signal<string>('');
  allCourses = this.lessonService.allCourses;
  isLoading = signal(true);

  featuredCoursesList = computed(() => this.allCourses().slice(0, 3));

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
    this.presenceService.subscribeToSiteStats();
    this.lessonService.loadAllCourses().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });

    // Fetch a daily puzzle position to display in the Tactics Preview section
    this.tacticsService.getDailyPuzzle().subscribe({
      next: (res) => {
        if (res.data && res.data.fen) {
          this.tacticsPreviewFen.set(res.data.fen);
        }
      }
    });
  }

  ngOnDestroy() {
    this.presenceService.unsubscribeFromSiteStats();
  }

  navigateToCourse(slug: string) {
    this.router.navigate(['/learn', slug]);
    this.searchQuery.set('');
  }

  onSearch() {
    const results = this.searchResults();
    if (results.length > 0) this.navigateToCourse(results[0].id);
  }
}
