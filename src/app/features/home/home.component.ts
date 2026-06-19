import { Component, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LessonService } from '../../core/services/lesson.service';
import { PresenceService } from '../../core/services/presence.service';

import { ButtonComponent, ArrowLinkComponent } from '@shared/ui';
import { ChessBoardComponent } from '@shared/chess';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';

/** Hero board animation: Sicilian Defense — Najdorf Variation opening moves. */
const HERO_OPENING_MOVES = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];

/** Pre-compute all FEN positions at module load time — zero runtime cost. */
function buildOpeningFens(moves: string[]): { fen: string; lastMove: Key[] | null; label: string }[] {
  const chess = new Chess();
  const frames: { fen: string; lastMove: Key[] | null; label: string }[] = [
    { fen: chess.fen(), lastMove: null, label: 'Starting position' },
  ];
  for (const san of moves) {
    const result = chess.move(san);
    if (result) {
      frames.push({
        fen: chess.fen(),
        lastMove: [result.from, result.to] as Key[],
        label: `${result.color === 'w' ? 'White' : 'Black'}: ${result.san}`,
      });
    }
  }
  return frames;
}

const OPENING_FRAMES = buildOpeningFens(HERO_OPENING_MOVES);

const SICILIAN_MOVES = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
const QUEENS_GAMBIT_MOVES = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'Be7'];
const KINGS_INDIAN_MOVES = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'];
const RUY_LOPEZ_MOVES = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    ArrowLinkComponent,
    ChessBoardComponent,
  ],
  providers: [],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private lessonService = inject(LessonService);
  private router = inject(Router);
  authService = inject(AuthService);
  presenceService = inject(PresenceService);

  // ── Animation ────────────────────────────────────────────────────────────
  /** Global tick for animations */
  globalAnimationTick = signal(0);

  /** FEN string fed into the hero chess board component. */
  heroFen = computed(() => OPENING_FRAMES[this.globalAnimationTick() % OPENING_FRAMES.length].fen);

  /** Last-move keys for chessground highlighting (typed as Key[] for compatibility). */
  heroLastMove = computed(() => OPENING_FRAMES[this.globalAnimationTick() % OPENING_FRAMES.length].lastMove ?? undefined);

  /** Human-readable label shown in the floating badge. */
  heroOpeningLabel = computed(() => OPENING_FRAMES[this.globalAnimationTick() % OPENING_FRAMES.length].label);

  private heroInterval: ReturnType<typeof setInterval> | null = null;

  private startHeroAnimation() {
    this.heroInterval = setInterval(() => {
      this.globalAnimationTick.update(tick => tick + 1);
    }, 1400);
  }

  // ── Openings list ─────────────────────────────────────────────────────────
  popularOpenings = [
    { title: 'Sicilian Defense',      description: 'The most popular response to e4.',        slug: 'sicilian',      frames: buildOpeningFens(SICILIAN_MOVES) },
    { title: "Queen's Gambit",        description: 'Dynamic and strategically rich.',          slug: 'queens-gambit', frames: buildOpeningFens(QUEENS_GAMBIT_MOVES) },
    { title: "King's Indian Defense", description: 'A hypermodern fighting defense.',          slug: 'kings-indian',  frames: buildOpeningFens(KINGS_INDIAN_MOVES) },
    { title: 'Ruy Lopez',             description: 'The Spanish opening, a timeless classic.', slug: 'ruy-lopez',     frames: buildOpeningFens(RUY_LOPEZ_MOVES) },
  ];

  getOpeningFrame(opening: typeof this.popularOpenings[0]) {
    const tick = this.globalAnimationTick();
    const index = Math.min(tick, opening.frames.length - 1);
    return opening.frames[index];
  }

  /** Static coach preview cards — visual anchors on the landing page. */
  coaches: { name: string; title: string; rating: number; initials: string }[] = [];

  /** Static featured event preview card. */
  mockEvent: { name: string; date: string; location: string; format: string } | null = null;

  // ── Courses & search ──────────────────────────────────────────────────────
  searchQuery = signal<string>('');
  allCourses  = this.lessonService.allCourses;
  isLoading   = signal(true);

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
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tactics']);
      return;
    }
    this.presenceService.subscribeToSiteStats();
    this.startHeroAnimation();
    this.lessonService.loadAllCourses().subscribe({
      next:  () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }

  ngOnDestroy() {
    this.presenceService.unsubscribeFromSiteStats();
    if (this.heroInterval) clearInterval(this.heroInterval);
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
