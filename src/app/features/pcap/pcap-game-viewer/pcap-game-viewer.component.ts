import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
  effect,
  viewChild,
  ElementRef,
  PLATFORM_ID,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChessBoardComponent, MoveNotationComponent } from '@shared/chess';
import { Chess } from '@von/chess';
import { buildTreeFromMoves, findPathToFen } from '../../../core/utils/chess-tree.utils';
import { MoveNode } from '../../../core/models/study.model';
import { PcapService } from '../../../core/services/pcap.service';
import { ToastService } from '../../../core/services/toast.service';
import { EngineService } from '../../../core/services/engine.service';
import { StudyAnalysisComponent } from '../../study/study-analysis/study-analysis.component';
import { PcapMatch, PcapBoardMatchup, getFederationFlag } from '../../../core/models/pcap.model';

@Component({
  selector: 'app-pcap-game-viewer',
  standalone: true,
  imports: [
    CommonModule,
    ChessBoardComponent,
    MoveNotationComponent,
    StudyAnalysisComponent
  ],
  templateUrl: './pcap-game-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapGameViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pcapService = inject(PcapService);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly engineService = inject(EngineService);

  // Responsive Board Sizing
  readonly centerColumnRef = viewChild<ElementRef<HTMLElement>>('centerColumn');
  readonly boardSize = signal<number>(460);
  private resizeObserver: ResizeObserver | null = null;

  // Local Engine Analysis States
  readonly isEngineActive = signal<boolean>(false);
  readonly isEngineError = this.engineService.isError;
  readonly pvLines = this.engineService.pvLines;

  readonly formattedPvLines = computed(() => {
    const lines = this.pvLines();
    const fen = this.currentFen();
    if (lines.length === 0 || !fen) return [];

    return lines.map((line) => {
      const chess = new Chess(fen);
      const moves: {
        san: string;
        uci: string;
        moveNumber: number;
        showMoveNumber: boolean;
        isBlack: boolean;
      }[] = [];

      for (let i = 0; i < line.pv.length; i++) {
        const uci = line.pv[i];
        const currentTurn = chess.turn();
        const currentMoveNumber = chess.moveNumber();
        const showMoveNumber = i === 0 || currentTurn === 'w';
        const isBlack = i === 0 && currentTurn === 'b';

        try {
          const from = uci.substring(0, 2);
          const to = uci.substring(2, 4);
          const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;
          const result = chess.move({ from, to, promotion });
          moves.push({
            san: result.san,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        } catch {
          moves.push({
            san: uci,
            uci,
            moveNumber: currentMoveNumber,
            showMoveNumber,
            isBlack,
          });
        }
      }

      return {
        ...line,
        moves,
      };
    });
  });

  readonly engineEval = computed(() => {
    const lines = this.pvLines();
    return lines.length > 0 ? lines[0].eval : null;
  });

  // Active Route Params
  readonly matchId = signal<string>('');
  readonly activeBoardNumber = signal<number>(1);
  readonly activeGameType = signal<'blitz' | 'rapid'>('rapid');

  // Match & Board Data
  readonly currentMatch = computed<PcapMatch | undefined>(() => {
    const id = this.matchId();
    if (!id) return undefined;
    return this.pcapService.getMatchById(id);
  });

  readonly activeBoard = computed<PcapBoardMatchup | undefined>(() => {
    const match = this.currentMatch();
    const boardNum = this.activeBoardNumber();
    if (!match) return undefined;
    return match.boards.find(b => b.boardNumber === boardNum);
  });

  // Current PGN String
  readonly activePgn = computed<string>(() => {
    const board = this.activeBoard();
    if (!board) return '';
    const pgn = this.activeGameType() === 'blitz' ? board.blitzPgn : board.rapidPgn;
    return pgn || '';
  });

  // Chess Timeline & Navigation States
  readonly timeline = signal<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
  readonly currentPly = signal<number>(0);
  readonly boardOrientation = signal<'white' | 'black'>('white');
  readonly moveTree = signal<MoveNode[]>([]);
  readonly headers = signal<Record<string, string | null>>({});
  readonly moveHistory = signal<{ from: string; to: string; san: string }[]>([]);

  // Autoplay State
  readonly isPlaying = signal<boolean>(false);
  private autoplayIntervalId: any = null;

  // Computed Board & Navigation Values
  readonly currentFen = computed(() => this.timeline()[this.currentPly()] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  readonly maxPly = computed(() => Math.max(0, this.timeline().length - 1));

  readonly lastMoveSquares = computed<any[] | undefined>(() => {
    const ply = this.currentPly();
    if (ply <= 0) return undefined;
    const history = this.moveHistory();
    const move = history[ply - 1];
    if (move && move.from && move.to) {
      return [move.from, move.to];
    }
    return undefined;
  });

  // Player Names & Titles
  readonly whitePlayer = computed(() => {
    const h = this.headers();
    const board = this.activeBoard();
    if (h['White']) return { name: h['White'], rating: h['WhiteElo'] || '', title: '' };
    if (board) {
      // In PCAP, odd boards White is Team A, even boards White is Team B
      const isOdd = board.boardNumber % 2 !== 0;
      const p = isOdd ? board.playerA : board.playerB;
      return { name: p.name, rating: p.rating ? String(p.rating) : '', title: p.title || '' };
    }
    return { name: 'White', rating: '', title: '' };
  });

  readonly blackPlayer = computed(() => {
    const h = this.headers();
    const board = this.activeBoard();
    if (h['Black']) return { name: h['Black'], rating: h['BlackElo'] || '', title: '' };
    if (board) {
      const isOdd = board.boardNumber % 2 !== 0;
      const p = isOdd ? board.playerB : board.playerA;
      return { name: p.name, rating: p.rating ? String(p.rating) : '', title: p.title || '' };
    }
    return { name: 'Black', rating: '', title: '' };
  });

  readonly gameResult = computed(() => {
    const h = this.headers();
    return h['Result'] && h['Result'] !== '*' ? h['Result'] : 'In Progress';
  });

  // Active Path in MoveTree for clock and node tracking
  readonly activePath = computed<MoveNode[]>(() => {
    const tree = this.moveTree();
    const fen = this.currentFen();
    if (!tree || !tree.length || !fen) return [];
    const path = findPathToFen(tree, fen);
    if (path && path.length > 0) return path;

    // Fallback if FEN comparison had slight halfmove/en-passant differences
    const ply = this.currentPly();
    if (ply > 0) {
      return tree.slice(0, ply);
    }
    return [];
  });

  // Initial Time Control parsed from PGN Header (e.g. "300+0" -> "5:00", "900" -> "15:00")
  readonly initialClock = computed<string | undefined>(() => {
    const tc = this.headers()['TimeControl'];
    if (!tc) return undefined;
    const parts = tc.split('+');
    const seconds = parseInt(parts[0], 10);
    if (isNaN(seconds) || seconds <= 0) return undefined;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${remMins}:${String(secs).padStart(2, '0')}`;
  });

  // White and Black Clocks at the Current Ply / Position
  readonly whiteClock = computed<string | undefined>(() => {
    const path = this.activePath();
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node.ply % 2 !== 0 && node.clk) {
        return node.clk;
      }
    }
    const firstWhite = this.moveTree().find(n => n.ply % 2 !== 0 && (n.clk || n.preClk));
    if (firstWhite) {
      return firstWhite.preClk || this.initialClock() || firstWhite.clk;
    }
    return this.initialClock();
  });

  readonly blackClock = computed<string | undefined>(() => {
    const path = this.activePath();
    for (let i = path.length - 1; i >= 0; i--) {
      const node = path[i];
      if (node.ply % 2 === 0 && node.clk) {
        return node.clk;
      }
    }
    const firstBlack = this.moveTree().find(n => n.ply % 2 === 0 && n.clk);
    if (firstBlack?.clk) {
      return this.initialClock() || firstBlack.clk;
    }
    return this.initialClock();
  });

  // Active Turn & Color
  readonly activeColor = computed<'w' | 'b'>(() => {
    const fen = this.currentFen();
    if (!fen) return 'w';
    const parts = fen.split(' ');
    return (parts[1] as 'w' | 'b') || 'w';
  });

  readonly topPlayerColor = computed<'white' | 'black'>(() => (this.boardOrientation() === 'white' ? 'black' : 'white'));
  readonly bottomPlayerColor = computed<'white' | 'black'>(() => (this.boardOrientation() === 'white' ? 'white' : 'black'));

  readonly topPlayer = computed(() => (this.topPlayerColor() === 'white' ? this.whitePlayer() : this.blackPlayer()));
  readonly bottomPlayer = computed(() => (this.bottomPlayerColor() === 'white' ? this.whitePlayer() : this.blackPlayer()));

  readonly topClock = computed(() => (this.topPlayerColor() === 'white' ? this.whiteClock() : this.blackClock()));
  readonly bottomClock = computed(() => (this.bottomPlayerColor() === 'white' ? this.whiteClock() : this.blackClock()));

  readonly isTopPlayerTurn = computed(() => {
    const active = this.activeColor();
    const color = this.topPlayerColor();
    return (active === 'w' && color === 'white') || (active === 'b' && color === 'black');
  });

  readonly isBottomPlayerTurn = computed(() => {
    const active = this.activeColor();
    const color = this.bottomPlayerColor();
    return (active === 'w' && color === 'white') || (active === 'b' && color === 'black');
  });

  constructor() {
    effect(() => {
      const active = this.isEngineActive();
      const fen = this.currentFen();
      const isBrowser = isPlatformBrowser(this.platformId);

      if (isBrowser) {
        if (active && fen) {
          this.engineService.startAnalysis(fen);
        } else {
          this.engineService.stop();
        }
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const mId = params.get('matchId') || '';
      const bNum = Number(params.get('boardNumber')) || 1;
      const type = (params.get('type') as 'blitz' | 'rapid') || 'rapid';

      this.matchId.set(mId);
      this.activeBoardNumber.set(bNum);
      this.activeGameType.set(type);

      this.loadGame();
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (isPlatformBrowser(this.platformId)) {
      this.engineService.stop();
    }
  }

  toggleEngine(): void {
    this.isEngineActive.update(v => !v);
  }

  retryEngine(): void {
    this.engineService.restart();
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.centerColumnRef()?.nativeElement;
    if (!el) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.updateBoardDimensions(width, height);
      }
    });

    this.resizeObserver.observe(el);
  }

  private updateBoardDimensions(containerWidth: number, containerHeight: number): void {
    if (containerWidth <= 0 || containerHeight <= 0) return;
    // Vertical overhead: top player banner (~36px) + bottom player banner (~36px) + 2 gaps (12px) + breathing buffer (12px) = 96px
    const verticalOverhead = 96;
    const availableWidth = Math.max(180, containerWidth - 16);
    const availableHeight = Math.max(180, containerHeight - verticalOverhead);

    // Chessboard is 1:1 square. Clamp between 180px and 560px
    const calculatedSize = Math.floor(Math.min(availableWidth, availableHeight, 560));
    this.boardSize.set(calculatedSize);
  }

  private loadGame(): void {
    this.stopAutoplay();
    const pgn = this.activePgn();

    if (!pgn || !pgn.trim()) {
      // Empty state
      const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      this.timeline.set([initial]);
      this.currentPly.set(0);
      this.moveTree.set([]);
      this.headers.set({});
      this.moveHistory.set([]);
      return;
    }

    try {
      const chess = new Chess();
      chess.loadPgn(pgn);

      const parsedHeaders = chess.header();
      this.headers.set(parsedHeaders);

      let initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      if (parsedHeaders['FEN']) {
        initialFen = parsedHeaders['FEN'];
      }

      const history = chess.history({ verbose: true });
      const reconstructor = new Chess(initialFen);
      const newTimeline = [initialFen];
      const moves: { from: string; to: string; san: string }[] = [];

      for (const m of history) {
        reconstructor.move(m.san);
        newTimeline.push(reconstructor.fen());
        moves.push({ from: m.from, to: m.to, san: m.san });
      }

      this.timeline.set(newTimeline);
      this.moveHistory.set(moves);
      this.currentPly.set(newTimeline.length - 1); // Start at final position or ply 0? Users usually prefer starting position or ending. Starting at ply 0 is standard for playback.
      this.currentPly.set(0);

      // Build tree for MoveNotationComponent
      const tree = buildTreeFromMoves({ pgn }, initialFen);
      this.moveTree.set(tree);
    } catch (err) {
      console.error('[PcapGameViewer] Failed to parse PGN:', err);
      this.toast.show('Failed to parse PGN', 'error');
    }
  }

  // --- Move Navigation Controls ---

  goToFirst(): void {
    this.stopAutoplay();
    this.currentPly.set(0);
  }

  goToLast(): void {
    this.stopAutoplay();
    this.currentPly.set(this.maxPly());
  }

  prevMove(): void {
    this.stopAutoplay();
    if (this.currentPly() > 0) {
      this.currentPly.update(p => p - 1);
    }
  }

  nextMove(): void {
    this.stopAutoplay();
    if (this.currentPly() < this.maxPly()) {
      this.currentPly.update(p => p + 1);
    }
  }

  onNodeClicked(node: MoveNode): void {
    this.stopAutoplay();
    if (typeof node.ply === 'number') {
      const clamped = Math.max(0, Math.min(this.maxPly(), node.ply));
      this.currentPly.set(clamped);
    }
  }

  flipBoard(): void {
    this.boardOrientation.update(o => (o === 'white' ? 'black' : 'white'));
  }

  // --- Autoplay ---

  toggleAutoplay(): void {
    if (this.isPlaying()) {
      this.stopAutoplay();
    } else {
      this.startAutoplay();
    }
  }

  private startAutoplay(): void {
    if (this.currentPly() >= this.maxPly()) {
      this.currentPly.set(0);
    }
    this.isPlaying.set(true);
    this.autoplayIntervalId = setInterval(() => {
      if (this.currentPly() < this.maxPly()) {
        this.currentPly.update(p => p + 1);
      } else {
        this.stopAutoplay();
      }
    }, 1500);
  }

  private stopAutoplay(): void {
    if (this.autoplayIntervalId) {
      clearInterval(this.autoplayIntervalId);
      this.autoplayIntervalId = null;
    }
    this.isPlaying.set(false);
  }

  // --- Game & Board Switching ---

  selectGame(boardNum: number, type: 'blitz' | 'rapid'): void {
    const match = this.currentMatch();
    if (!match) return;
    this.router.navigate(['/pcap/game', match.id, boardNum, type]);
  }

  setFormat(type: 'blitz' | 'rapid'): void {
    if (this.activeGameType() === type) return;
    const match = this.currentMatch();
    if (!match) return;
    this.router.navigate(['/pcap/game', match.id, this.activeBoardNumber(), type]);
  }

  getPlayerFederation(name?: string): string {
    const match = this.currentMatch();
    if (!match || !name) return '🇵🇭';
    const teamA = this.pcapService.getTeamById(match.teamA.id);
    const pA = teamA?.roster?.find(r => r.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (pA?.federation) return getFederationFlag(pA.federation);

    const teamB = this.pcapService.getTeamById(match.teamB.id);
    const pB = teamB?.roster?.find(r => r.name?.trim().toLowerCase() === name.trim().toLowerCase());
    if (pB?.federation) return getFederationFlag(pB.federation);

    return '🇵🇭';
  }

  formatScore(myScore: number, oppScore: number, hasPgn: boolean): { text: string; colorClass: string } {
    if (myScore > oppScore) {
      return { text: '1', colorClass: 'text-emerald-700 font-bold' };
    }
    if (myScore < oppScore) {
      return { text: '0', colorClass: 'text-rose-700 font-bold' };
    }
    if (myScore > 0 && myScore === oppScore) {
      return { text: '½', colorClass: 'text-slate-600 font-semibold' };
    }
    return { text: '—', colorClass: 'text-slate-300 font-normal' };
  }

  getBoardRowData(board: PcapBoardMatchup) {
    const isOdd = board.boardNumber % 2 !== 0;
    const playerA = board.playerA || { name: 'Player A', title: undefined, rating: 0 };
    const playerB = board.playerB || { name: 'Player B', title: undefined, rating: 0 };
    const white = isOdd ? playerA : playerB;
    const black = isOdd ? playerB : playerA;
    const type = this.activeGameType();

    const scoreWhiteRaw = isOdd
      ? (type === 'blitz' ? (board.blitzScoreA ?? 0) : (board.rapidScoreA ?? 0))
      : (type === 'blitz' ? (board.blitzScoreB ?? 0) : (board.rapidScoreB ?? 0));
    const scoreBlackRaw = isOdd
      ? (type === 'blitz' ? (board.blitzScoreB ?? 0) : (board.rapidScoreB ?? 0))
      : (type === 'blitz' ? (board.blitzScoreA ?? 0) : (board.rapidScoreA ?? 0));

    const hasPgn = type === 'blitz' ? !!board.blitzPgn : !!board.rapidPgn;

    return {
      white,
      black,
      whiteFlag: this.getPlayerFederation(white.name),
      blackFlag: this.getPlayerFederation(black.name),
      whiteScore: this.formatScore(scoreWhiteRaw, scoreBlackRaw, hasPgn),
      blackScore: this.formatScore(scoreBlackRaw, scoreWhiteRaw, hasPgn),
      hasPgn
    };
  }

  // --- Keyboard Shortcuts ---

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ignore if typing in an input/textarea
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.prevMove();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextMove();
        break;
      case 'ArrowUp':
      case 'Home':
        event.preventDefault();
        this.goToFirst();
        break;
      case 'ArrowDown':
      case 'End':
        event.preventDefault();
        this.goToLast();
        break;
      case 'f':
      case 'F':
        this.flipBoard();
        break;
      case ' ':
        event.preventDefault();
        this.toggleAutoplay();
        break;
    }
  }

  // --- Utilities ---

  copyPgn(): void {
    const pgn = this.activePgn();
    if (!pgn) {
      this.toast.show('No PGN available to copy', 'error');
      return;
    }

    navigator.clipboard.writeText(pgn).then(
      () => this.toast.show('PGN copied to clipboard!', 'success'),
      () => this.toast.show('Failed to copy PGN', 'error')
    );
  }

  downloadPgn(): void {
    const pgn = this.activePgn();
    if (!pgn) return;

    const match = this.currentMatch();
    const board = this.activeBoard();
    const safeNameA = (match?.teamA.name || 'TeamA').replace(/\s+/g, '_');
    const safeNameB = (match?.teamB.name || 'TeamB').replace(/\s+/g, '_');
    const fileName = `pcap_${safeNameA}_vs_${safeNameB}_b${board?.boardNumber || 1}_${this.activeGameType()}.pgn`;

    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    this.toast.show('PGN file downloaded', 'success');
  }
}
