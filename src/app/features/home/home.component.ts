import { Component, inject, OnInit, signal, computed, OnDestroy, AfterViewInit, ViewChild, ElementRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LessonService } from '../../core/services/lesson.service';
import { PresenceService } from '../../core/services/presence.service';
import { StudyApiService } from '../../core/services/study-api.service';
import { TacticsService } from '../../core/services/tactics.service';
import { GuessTheGameService, GuessTheGameChallenge } from '../../core/services/guess-the-game.service';
import { Study, MoveNode } from '../../core/models/study.model';
import { buildTreeFromMoves } from '../../core/utils/chess-tree.utils';

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

function buildFramesFromMoveNodes(nodes: MoveNode[], initialFen: string, defaultLabel: string): { fen: string; lastMove: Key[] | null; label: string }[] {
  const frames: { fen: string; lastMove: Key[] | null; label: string }[] = [
    { fen: initialFen, lastMove: null, label: defaultLabel },
  ];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let lastMove: Key[] | null = null;
    if (node.uci && node.uci.length >= 4) {
      lastMove = [node.uci.substring(0, 2) as Key, node.uci.substring(2, 4) as Key];
    }
    const colorLabel = node.ply % 2 === 1 ? 'White' : 'Black';
    frames.push({
      fen: node.fen,
      lastMove,
      label: `${colorLabel}: ${node.san}`,
    });
  }
  return frames;
}

const OPENING_FRAMES = buildOpeningFens(HERO_OPENING_MOVES);

const SICILIAN_MOVES = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
const QUEENS_GAMBIT_MOVES = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'Be7'];
const KINGS_INDIAN_MOVES = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'];
const RUY_LOPEZ_MOVES = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'];

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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgIconComponent,
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
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('heroCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('heroSection') heroSectionRef!: ElementRef<HTMLElement>;
  @ViewChild('homeContainer') homeContainerRef!: ElementRef<HTMLElement>;

  isHoveringCard = signal(false);
  cursorX = signal(0);
  cursorY = signal(0);

  activeCarouselIndex = signal(0);
  carouselSlides = [
    {
      title: 'Coaching Tools',
      description: 'Manage collaborative student spaces, review real-time analysis chapters, build openings repertoire databases, and run chess reviews with students.',
      linkText: 'Explore coaching studies',
      linkUrl: '/study',
      image: 'assets/images/home_coaching.webp'
    },
    {
      title: 'Tournament Players Training',
      description: 'Build puzzle pattern memory with rated exercises, solve coordinates motifs, and study grandmaster repertoires via spaced repetition.',
      linkText: 'Start training tactics',
      linkUrl: '/tactics',
      image: 'assets/images/home_player.webp'
    },
    {
      title: 'Casual Chess Enjoyment',
      description: 'Engage with daily guess-the-move clashes, analyze historic matches on timeline graphs, and enjoy the beauty of chess.',
      linkText: 'Play daily challenge',
      linkUrl: '/tactics/guess',
      image: 'assets/images/home_casual.webp'
    }
  ];

  nextSlide() {
    const nextIdx = (this.activeCarouselIndex() + 1) % this.carouselSlides.length;
    this.activeCarouselIndex.set(nextIdx);
  }

  prevSlide() {
    const prevIdx = (this.activeCarouselIndex() - 1 + this.carouselSlides.length) % this.carouselSlides.length;
    this.activeCarouselIndex.set(prevIdx);
  }

  private cursorAnimationFrameId: number | null = null;
  private targetX = 0;
  private targetY = 0;

  onCardMouseEnter(event: MouseEvent) {
    if (!this.isBrowser || !this.homeContainerRef) return;
    const container = this.homeContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.targetX = event.clientX - rect.left;
    this.targetY = event.clientY - rect.top;

    this.isHoveringCard.set(true);
    this.startCursorAnimation();
  }

  onCardMouseLeave() {
    this.isHoveringCard.set(false);
    this.stopCursorAnimation();
  }

  onCardMouseMove(event: MouseEvent) {
    if (!this.isBrowser || !this.homeContainerRef) return;
    const container = this.homeContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.targetX = event.clientX - rect.left;
    this.targetY = event.clientY - rect.top;
  }

  private startCursorAnimation() {
    if (!this.isBrowser) return;
    if (this.cursorAnimationFrameId) return;

    this.cursorX.set(this.targetX);
    this.cursorY.set(this.targetY);

    const animateCursor = () => {
      if (!this.isHoveringCard()) {
        this.cursorAnimationFrameId = null;
        return;
      }

      const curX = this.cursorX();
      const curY = this.cursorY();

      // Lerp logic: 0.12 factor creates a clean delayed momentum effect
      const nextX = curX + (this.targetX - curX) * 0.12;
      const nextY = curY + (this.targetY - curY) * 0.12;

      this.cursorX.set(nextX);
      this.cursorY.set(nextY);

      this.cursorAnimationFrameId = requestAnimationFrame(animateCursor);
    };

    this.cursorAnimationFrameId = requestAnimationFrame(animateCursor);
  }

  private stopCursorAnimation() {
    if (this.cursorAnimationFrameId) {
      cancelAnimationFrame(this.cursorAnimationFrameId);
      this.cursorAnimationFrameId = null;
    }
  }

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // 3D Canvas properties
  private animationFrameId: number | null = null;
  private resizeListener: (() => void) | null = null;
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private mouseLeaveListener: (() => void) | null = null;

  // Mouse coordinate state
  private mouseX = 0;
  private mouseY = 0;
  private isMouseOver = false;

  private lessonService = inject(LessonService);
  private router = inject(Router);
  authService = inject(AuthService);
  presenceService = inject(PresenceService);
  private studyApiService = inject(StudyApiService);
  private tacticsService = inject(TacticsService);
  private guessTheGameService = inject(GuessTheGameService);

  tacticsPreviewFen = signal<string>('3r2k1/p4ppp/1p2pb2/1q6/8/PN2B1P1/1P2QP1P/3R2K1 b - - 0 24');
  heroChallenge = signal<GuessTheGameChallenge | null>(null);

  /** Category tab filter: 'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments' */
  activeCategory = signal<'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments'>('all');

  // ── Animation ────────────────────────────────────────────────────────────
  /** Global tick for animations */
  globalAnimationTick = signal(0);

  /** Dynamic study openings list from backend */
  studiesList = signal<any[]>([]);

  /** Dynamic hero frames derived from the daily guess the game challenge, falling back to Najdorf. */
  heroFrames = computed(() => {
    const challenge = this.heroChallenge();
    if (!challenge) {
      return OPENING_FRAMES;
    }
    const initialFen = challenge.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    try {
      const parsedTree = buildTreeFromMoves({ pgn: challenge.pgn || '' }, initialFen);
      if (parsedTree.length === 0) {
        return [{ fen: initialFen, lastMove: null, label: `${challenge.white_player} vs ${challenge.black_player}` }];
      }

      return buildFramesFromMoveNodes(parsedTree, initialFen, `${challenge.white_player} vs ${challenge.black_player}`);
    } catch (e) {
      console.error('Failed to parse guess the game PGN for hero animation:', e);
      return OPENING_FRAMES;
    }
  });

  /** FEN string fed into the hero chess board component. */
  heroFen = computed(() => {
    const frames = this.heroFrames();
    return frames[this.globalAnimationTick() % frames.length].fen;
  });

  /** Last-move keys for chessground highlighting. */
  heroLastMove = computed(() => {
    const frames = this.heroFrames();
    return frames[this.globalAnimationTick() % frames.length].lastMove ?? undefined;
  });

  /** Human-readable label shown in the floating badge. */
  heroOpeningLabel = computed(() => {
    const frames = this.heroFrames();
    return frames[this.globalAnimationTick() % frames.length].label;
  });

  private heroInterval: ReturnType<typeof setInterval> | null = null;

  private startHeroAnimation() {
    this.heroInterval = setInterval(() => {
      this.globalAnimationTick.update(tick => tick + 1);
    }, 1400);
  }

  // ── Dynamic Repertoire Openings List ──────────────────────────────────────
  getStudyFrame(study: any) {
    const chapters = study.chapters || [];
    if (chapters.length === 0) {
      return { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lastMove: null };
    }
    const firstChapter = chapters[0];
    const rawMoves = firstChapter.moves || [];
    const initialFen = firstChapter.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const parsedTree = buildTreeFromMoves(rawMoves, initialFen);
    if (parsedTree.length === 0) {
      return { fen: initialFen, lastMove: null };
    }

    const frames = buildFramesFromMoveNodes(parsedTree, initialFen, firstChapter.name || study.name);
    const tick = this.globalAnimationTick();
    const index = Math.min(tick, frames.length - 1);
    return frames[index];
  }

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

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = this.heroSectionRef.nativeElement;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    this.resizeListener = resizeCanvas;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.isMouseOver = true;
    };
    const onMouseLeave = () => {
      this.isMouseOver = false;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    this.mouseMoveListener = onMouseMove;
    this.mouseLeaveListener = onMouseLeave;

    const columns = 28;
    const rows = 28;
    const spacing = 28;

    const points: { x: number; y: number; z: number; ox: number; oz: number }[] = [];
    const halfWidth = ((columns - 1) * spacing) / 2;
    const halfDepth = ((rows - 1) * spacing) / 2;

    for (let c = 0; c < columns; c++) {
      for (let r = 0; r < rows; r++) {
        const x = c * spacing - halfWidth;
        const z = r * spacing - halfDepth;
        points.push({
          x,
          y: 0,
          z,
          ox: x,
          oz: z
        });
      }
    }

    let time = 0;
    const focalLength = 350;

    const animate = () => {
      time += 0.025;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pitch = 0.8;
      const yaw = Math.sin(time * 0.1) * 0.15;

      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      const sceneCenterX = canvas.width * 0.65;
      const sceneCenterY = canvas.height * 0.45;
      const sceneCenterZ = 200;

      points.forEach(p => {
        const waveX = p.ox * 0.012;
        const waveZ = p.oz * 0.012;
        p.y = Math.sin(waveX + time) * 15 + Math.cos(waveZ + time) * 15;

        const x1 = p.ox * cosY - p.oz * sinY;
        const z1 = p.oz * cosY + p.ox * sinY;

        const y2 = p.y * cosP - z1 * sinP;
        const z2 = z1 * cosP + p.y * sinP;

        const finalX = x1;
        const finalY = y2;
        const finalZ = z2 + sceneCenterZ;

        const scale = focalLength / (focalLength + finalZ);
        let screenX = sceneCenterX + finalX * scale;
        let screenY = sceneCenterY + finalY * scale;

        if (this.isMouseOver) {
          const dx = screenX - this.mouseX;
          const dy = screenY - this.mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const force = (120 - dist) / 120;
            screenX += (dx / dist) * force * 15;
            screenY += (dy / dist) * force * 15;
          }
        }

        if (screenX >= 0 && screenX <= canvas.width && screenY >= 0 && screenY <= canvas.height) {
          const depthAlpha = Math.max(0.1, Math.min(1.0, 1.0 - (finalZ - 100) / 400));
          const size = Math.max(0.6, scale * 3.5);

          ctx.beginPath();
          ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59, 130, 246, ${depthAlpha * 0.65})`;
          ctx.fill();
        }
      });

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  ngOnInit() {
    this.presenceService.subscribeToSiteStats();
    this.startHeroAnimation();
    this.lessonService.loadAllCourses().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });

    // Fetch a daily challenge from guess the game to play on the hero board
    this.guessTheGameService.getDailyChallenge().subscribe({
      next: (res) => {
        if (res.data) {
          this.heroChallenge.set(res.data);
        }
      },
      error: (err) => {
        console.error('Failed to fetch guess the game daily challenge for homepage:', err);
      }
    });

    // Fetch a daily puzzle position to display in the Tactics Preview section
    this.tacticsService.getDailyPuzzle().subscribe({
      next: (res) => {
        if (res.data && res.data.fen) {
          this.tacticsPreviewFen.set(res.data.fen);
        }
      }
    });

    // Load Opening Repertoire studies dynamically
    this.studyApiService.getStudies(false, 'opening_repertoire').subscribe({
      next: (res) => {
        const summaryList = (res.data || [])
          .filter((s: Study) => s.category === 'opening_repertoire' && s.owner?.name?.toLowerCase() === 'vonchess')
          .slice(0, 3);
        if (summaryList.length === 0) {
          this.studiesList.set([]);
          return;
        }

        // Fetch detailed study objects for chapter information
        const detailRequests = summaryList.map((s: Study) => this.studyApiService.getStudyRaw(s.id));
        forkJoin(detailRequests).subscribe({
          next: (detailsResList: any) => {
            const detailedStudies = detailsResList.map((r: any) => r.data);
            this.studiesList.set(detailedStudies);
          },
          error: (err) => {
            console.error('Failed to load detailed studies for preview:', err);
          }
        });
      },
      error: (err) => {
        console.error('Failed to fetch public opening repertoires:', err);
      }
    });
  }

  ngOnDestroy() {
    this.presenceService.unsubscribeFromSiteStats();
    if (this.heroInterval) clearInterval(this.heroInterval);
    this.stopCursorAnimation();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeListener && this.isBrowser) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.mouseMoveListener && this.isBrowser && this.heroSectionRef) {
      try {
        const container = this.heroSectionRef.nativeElement;
        if (container) {
          container.removeEventListener('mousemove', this.mouseMoveListener);
          container.removeEventListener('mouseleave', this.mouseLeaveListener!);
        }
      } catch (e) {
        // Ignore if container is already destroyed
      }
    }
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
