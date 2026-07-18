import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { buildTreeFromMoves } from '../../../core/utils/chess-tree.utils';
import {
  heroPlay,
  heroPause,
  heroArrowsRightLeft,
  heroChevronLeft,
  heroChevronRight,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroTrophy,
  heroEye,
  heroLightBulb,
  heroQuestionMarkCircle,
  heroBookOpen,
} from '@ng-icons/heroicons/outline';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GuessTheGameService, GuessTheGameChallenge } from '../../../core/services/guess-the-game.service';
import { AudioService } from '../../../core/services/audio.service';
import { ToastService } from '../../../core/services/toast.service';
import { LayoutService } from '../../../core/services/layout.service';
import { ChessBoardComponent, MoveNotationComponent } from '@shared/chess';
import { ButtonComponent } from '@shared/ui';

@Component({
  selector: 'app-guess-the-game',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ChessBoardComponent,
    MoveNotationComponent,
    NgIconComponent,
    ButtonComponent
  ],
  providers: [
    provideIcons({
      heroPlay,
      heroPause,
      heroArrowsRightLeft,
      heroChevronLeft,
      heroChevronRight,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
      heroTrophy,
      heroEye,
      heroLightBulb,
      heroQuestionMarkCircle,
      heroBookOpen,
    }),
  ],
  templateUrl: './guess-the-game.component.html',
  host: { class: 'absolute inset-0 flex flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuessTheGameComponent implements OnInit, OnDestroy {
  private guessGameService = inject(GuessTheGameService);
  private audioService = inject(AudioService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);

  @ViewChild('board') boardComponent!: ChessBoardComponent;

  // Challenge State
  challenge = signal<GuessTheGameChallenge | null>(null);
  isLoading = signal(true);
  isInitialized = signal(false);
  errorMsg = signal<string | null>(null);

  // Chess Navigation State
  initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  moveHistory = signal<string[]>([]);
  studyPositions: string[] = [];
  currentPly = signal<number>(0);
  displayFen = signal<string>('');
  boardOrientation = signal<'white' | 'black'>('white');

  // Autoplay State
  isAutoplay = signal(false);
  autoplaySpeed = signal(1200); // ms per move
  private autoplayIntervalId: any = null;

  // Guessing State
  guessQuery = '';

  correctWhite = signal(false);
  correctBlack = signal(false);
  isIncorrect = signal(false);

  // Answer reveal state
  revealAnswer = signal(false);

  // Layout States
  boardSize = signal(600);
  isLargeScreen = signal(false);
  isThreeColumn = signal(false);
  isTwoColumn = signal(false);
  windowWidth = signal(1200);
  windowHeight = signal(800);

  otherColumnsWidth = computed(() => {
    if (this.isThreeColumn()) {
      return 330 + 400 + 80; // Left sidebar (330px) + Right notation (400px) + Gaps/Paddings (80px)
    } else if (this.isTwoColumn()) {
      return 400 + 60; // Right notation (400px) + Gaps/Paddings (60px)
    } else {
      return 32; // Mobile padding
    }
  });

  maxBoardSize = computed(() => {
    const width = this.windowWidth();
    const height = this.windowHeight();
    const maxHeight = height - 120;
    const otherWidth = this.otherColumnsWidth();
    const maxWidth = width - otherWidth;
    const maxPossible = Math.min(maxWidth, maxHeight);
    return Math.max(400, Math.min(1000, maxPossible));
  });

  // Derived Completed State
  isGameOver = computed(() => {
    return (this.correctWhite() && this.correctBlack()) || this.revealAnswer();
  });

  // Derived Guessed Players
  revealedWhiteName = computed(() => {
    const game = this.challenge();
    if (!game) return '';
    return (this.correctWhite() || this.isGameOver()) ? game.white_player : '_';
  });

  revealedBlackName = computed(() => {
    const game = this.challenge();
    if (!game) return '';
    return (this.correctBlack() || this.isGameOver()) ? game.black_player : '_';
  });

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty('--board-size', `${this.boardSize()}px`);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.windowWidth.set(window.innerWidth);
      this.windowHeight.set(window.innerHeight);
      this.updateLayoutStates();
      fromEvent(window, 'resize')
        .pipe(takeUntilDestroyed(), debounceTime(100))
        .subscribe(() => {
          this.updateLayoutStates();
        });
    }
  }

  ngOnInit() {
    this.layoutService.setFluid(true);
    const idParam = this.route.snapshot.queryParams['challenge_id'] || this.route.snapshot.queryParams['id'];
    const challengeId = idParam ? parseInt(idParam, 10) : undefined;
    this.loadDailyChallenge(challengeId);
    if (isPlatformBrowser(this.platformId)) {
      this.isInitialized.set(true);
    }
  }

  ngOnDestroy() {
    this.stopAutoplay();
    this.layoutService.setFluid(false);
  }

  private updateLayoutStates() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.windowWidth.set(width);
    this.windowHeight.set(height);
    this.isLargeScreen.set(width >= 1024);
    this.isThreeColumn.set(width >= 1280);
    this.isTwoColumn.set(width >= 768 && width < 1280);
  }

  private loadDailyChallenge(challengeId?: number) {
    this.isLoading.set(true);
    this.challenge.set(null);
    this.moveHistory.set([]);
    this.studyPositions = [];
    this.currentPly.set(0);
    this.initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.displayFen.set(this.initialFen);

    this.guessGameService.getDailyChallenge().subscribe({
      next: (res) => {
        const game = res.data;
        this.challenge.set(game);
        this.initializeGame(game);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set(err.error?.error || err.error?.message || 'Could not fetch daily challenge. Please make sure the study exists.');
        this.isLoading.set(false);
      }
    });
  }

  loadNextChallenge() {
    this.stopAutoplay();
    this.isLoading.set(true);
    this.errorMsg.set(null);

    const currentId = this.challenge()?.id;

    // Reset guessing & hint states
    this.guessQuery = '';

    this.correctWhite.set(false);
    this.correctBlack.set(false);
    this.revealAnswer.set(false);

    // Clear active challenge & state to prevent UI ghosting/stale notation list
    this.challenge.set(null);
    this.moveHistory.set([]);
    this.studyPositions = [];
    this.currentPly.set(0);
    this.initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.displayFen.set(this.initialFen);

    this.guessGameService.getNextChallenge(currentId).subscribe({
      next: (res) => {
        const game = res.data;
        this.challenge.set(game);
        this.initializeGame(game);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg.set(err.error?.error || err.error?.message || 'Could not fetch the next challenge.');
        this.isLoading.set(false);
      }
    });
  }

  private initializeGame(game: GuessTheGameChallenge) {
    try {
      this.initialFen = game.initial_fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      const nodes = buildTreeFromMoves({ pgn: game.pgn || '' }, this.initialFen);
      const history = nodes.map(n => n.san);
      this.moveHistory.set(history);

      this.studyPositions = [this.initialFen, ...nodes.map(n => n.fen)];

      let startPly = 0;
      if (game.start_ply !== undefined && game.start_ply !== null) {
        startPly = Math.min(game.start_ply, history.length);
      }

      this.currentPly.set(startPly);
      this.syncChessToCurrentPly();
    } catch (e) {
      console.error('Failed to parse PGN:', e);
      this.errorMsg.set('Invalid PGN structure loaded for this challenge.');
    }
  }


  private syncChessToCurrentPly() {
    const fen = this.studyPositions[this.currentPly()] || this.initialFen;
    this.displayFen.set(fen);
  }

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isLoading() || this.errorMsg()) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key === 'ArrowRight') {
      this.nextMove();
    } else if (event.key === 'ArrowLeft') {
      this.prevMove();
    }
  }

  flipBoard() {
    this.boardOrientation.update(o => o === 'white' ? 'black' : 'white');
  }

  // Move navigation controls
  goToMove(ply: number) {
    this.currentPly.set(ply);
    this.syncChessToCurrentPly();
    this.stopAutoplay();
  }

  nextMove() {
    const history = this.moveHistory();
    if (this.currentPly() < history.length) {
      this.currentPly.update(p => p + 1);
      this.syncChessToCurrentPly();
      this.audioService.playMoveSound(history[this.currentPly() - 1]);
    } else {
      this.stopAutoplay();
    }
  }

  prevMove() {
    if (this.currentPly() > 0) {
      this.currentPly.update(p => p - 1);
      this.syncChessToCurrentPly();
    }
  }

  goToStart() {
    this.goToMove(0);
  }

  goToEnd() {
    this.goToMove(this.moveHistory().length);
  }

  // Autoplay functionality
  toggleAutoplay() {
    if (this.isAutoplay()) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  private startAutoplay() {
    this.stopAutoplay();
    this.isAutoplay.set(true);

    if (this.currentPly() >= this.moveHistory().length) {
      this.currentPly.set(0);
      this.syncChessToCurrentPly();
    }

    this.autoplayIntervalId = setInterval(() => {
      this.nextMove();
    }, this.autoplaySpeed());
  }

  private stopAutoplay() {
    if (this.autoplayIntervalId) {
      clearInterval(this.autoplayIntervalId);
      this.autoplayIntervalId = null;
    }
    this.isAutoplay.set(false);
  }

  updateSpeed(speedMs: number) {
    this.autoplaySpeed.set(speedMs);
    if (this.isAutoplay()) {
      this.startAutoplay();
    }
  }

  // Guess checking
  submitGuess() {
    const query = this.guessQuery.trim().toLowerCase();
    if (!query) return;

    const game = this.challenge();
    if (!game) return;

    const whiteName = game.white_player.toLowerCase();
    const blackName = game.black_player.toLowerCase();

    const separators = /\s+(?:vs\.?|v\.?|and)\s+|\s*-\s*/i;
    let matchedWhite = false;
    let matchedBlack = false;

    if (separators.test(query)) {
      const parts = query.split(separators);
      if (parts.length >= 2) {
        const part1 = parts[0].trim();
        const part2 = parts[1].trim();

        if (part1 && part2) {
          if (whiteName.includes(part1) && blackName.includes(part2)) {
            matchedWhite = true;
            matchedBlack = true;
          } else if (blackName.includes(part1) && whiteName.includes(part2)) {
            matchedWhite = true;
            matchedBlack = true;
          }
        }
      }
    }

    if (!matchedWhite && !matchedBlack) {
      if (!this.correctWhite() && whiteName.includes(query)) {
        matchedWhite = true;
      }
      if (!this.correctBlack() && blackName.includes(query)) {
        matchedBlack = true;
      }
    }

    if (matchedWhite || matchedBlack) {
      if (matchedWhite) {
        this.correctWhite.set(true);
        this.toastService.show(`Correct! White player is ${game.white_player}`, 'success');
      }
      if (matchedBlack) {
        this.correctBlack.set(true);
        this.toastService.show(`Correct! Black player is ${game.black_player}`, 'success');
      }

      if (this.correctWhite() && this.correctBlack()) {
        this.toastService.show('Amazing! You guessed both players correctly!', 'achievement', 5000);
      }
    } else {
      this.toastService.show('Incorrect guess. Try again!', 'error');
      this.isIncorrect.set(true);
      setTimeout(() => {
        this.isIncorrect.set(false);
      }, 500);
    }

    this.guessQuery = '';
  }

  revealFullMatchup() {
    this.revealAnswer.set(true);
  }

  getPlayerResult(result: string, color: 'white' | 'black'): string {
    if (result === '1-0') return color === 'white' ? '1' : '0';
    if (result === '0-1') return color === 'white' ? '0' : '1';
    if (result === '1/2-1/2') return '½';
    return '';
  }

  getAnalysisLinkInfo(game: GuessTheGameChallenge): { url?: string; route?: any[]; queryParams?: any } | null {
    if (game.study_link) {
      const link = game.study_link.trim();
      if (link.startsWith('http://') || link.startsWith('https://')) {
        return { url: link };
      }
      if (/^\d+$/.test(link)) {
        return { route: ['/study', link] };
      }
      if (link.includes('/study/')) {
        const parts = link.split('?');
        const pathParts = parts[0].split('/study/');
        const studyId = pathParts[pathParts.length - 1];
        const queryParams: any = {};
        if (parts[1]) {
          const params = new URLSearchParams(parts[1]);
          params.forEach((val, key) => {
            queryParams[key] = val;
          });
        }
        return { route: ['/study', studyId], queryParams };
      }
      return { route: ['/study', link] };
    }
    if (game.study_id) {
      return { route: ['/study', game.study_id], queryParams: { chapter: game.id } };
    }
    return null;
  }
}
