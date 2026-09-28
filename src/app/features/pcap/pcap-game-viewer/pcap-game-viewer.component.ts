import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChessBoardComponent, MoveNotationComponent } from '@shared/chess';
import { Chess } from '@von/chess';
import { buildTreeFromMoves } from '../../../core/utils/chess-tree.utils';
import { MoveNode } from '../../../core/models/study.model';
import { PcapService } from '../../../core/services/pcap.service';
import { ToastService } from '../../../core/services/toast.service';
import { PcapMatch, PcapBoardMatchup } from '../../../core/models/pcap.model';

@Component({
  selector: 'app-pcap-game-viewer',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ChessBoardComponent,
    MoveNotationComponent
  ],
  templateUrl: './pcap-game-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapGameViewerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pcapService = inject(PcapService);
  private readonly toast = inject(ToastService);

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

  ngOnDestroy(): void {
    this.stopAutoplay();
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
