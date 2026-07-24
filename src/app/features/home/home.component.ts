import { Component, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { ArrowLinkComponent } from '@shared/ui';
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
  heroCheckCircle,
  heroUsers,
  heroClipboardDocument,
  heroTrophy,
  heroAcademicCap,
  heroPuzzlePiece,
  heroSparkles,
  heroCommandLine,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ArrowLinkComponent,
    ChessBoardComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroMagnifyingGlass,
      heroCheckBadge,
      heroBookOpen,
      heroGlobeAlt,
      heroVideoCamera,
      heroCheckCircle,
      heroUsers,
      heroClipboardDocument,
      heroTrophy,
      heroAcademicCap,
      heroPuzzlePiece,
      heroSparkles,
      heroCommandLine,
    }),
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
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
    this.presenceService.subscribeToSiteStats();
    this.startHeroAnimation();
    this.lessonService.loadAllCourses().subscribe({
      next:  () => this.isLoading.set(false),
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
