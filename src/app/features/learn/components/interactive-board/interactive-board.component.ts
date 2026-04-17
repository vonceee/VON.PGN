import {
  Component,
  Input,
  inject,
  signal,
  PLATFORM_ID,
  Output,
  EventEmitter,
  computed,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InteractiveTask } from '../../../../core/models/course.model';
import { environment } from '../../../../../environments/environment';
import { AudioService } from '../../../../core/services/audio.service';
import { MoveNotationComponent  } from '@shared/chess';
import { ChessBoardComponent  } from '@shared/chess';

import { Chess } from 'chess.js';
import { Config } from 'chessground/config';
import { Key } from 'chessground/types';

interface DrawShape {
  orig: Key;
  dest?: Key;
  brush: string;
}

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  imports: [MoveNotationComponent, ChessBoardComponent],
  templateUrl: './interactive-board.component.html',
})
export class InteractiveBoardComponent {
  private http = inject(HttpClient);
  private audioService = inject(AudioService);

  @ViewChild('board') boardComponent!: ChessBoardComponent;

  @Output() moveClicked = new EventEmitter<number>();

  chess = new Chess();
  private initialFen: string = '';
  private moveHistory: string[] = [];

  isLoading = signal<boolean>(true);
  studyPositions: string[] = [];
  studyShapes: DrawShape[][] = [];
  studyInstructions: string[] = [];
  displayFen = signal<string>('');
  currentPly = signal<number>(0);

  pgnMoves = computed(() => this.moveHistory);

  @Input({ required: true }) set task(value: InteractiveTask) {
    this.isLoading.set(true);
    const proxyUrl = `${environment.apiUrl}/lichess/pgn?url=${encodeURIComponent(value.lichessUrl)}`;

    this.http.get(proxyUrl, { responseType: 'text' }).subscribe({
      next: (pgnString) => {
        this.initializeStudy(pgnString);
        this.isLoading.set(false);
      },
      error: (err) => console.error('Failed to load PGN', err),
    });
  }

  cgConfig = computed(() => {
    const shapes = this.studyShapes[this.currentPly()] || [];
    return {
      drawable: {
        autoShapes: shapes,
      },
    } as Config;
  });

  private initializeStudy(pgn: string) {
    const safePgn = pgn.replace(/}\s*\{/g, ' ');
    const fenMatch = safePgn.match(/\[FEN\s+"([^"]+)"\]/);
    this.initialFen = fenMatch
      ? fenMatch[1]
      : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    let sanitizedPgn = safePgn;
    let initialComment = '';

    const parts = safePgn.split(/\n\s*\n/);
    if (parts.length > 1) {
      const headers = parts[0];
      let movesText = parts.slice(1).join('\n\n').trim();
      const firstMoveIndex = movesText.search(/\b[1-9][0-9]*\./);

      if (firstMoveIndex > 0) {
        initialComment = movesText.substring(0, firstMoveIndex);
        movesText = movesText.substring(firstMoveIndex).trim();
        sanitizedPgn = `${headers}\n\n${movesText}`;
      }
    }

    this.chess.loadPgn(sanitizedPgn);
    this.moveHistory = this.chess.history();

    this.studyPositions = [];
    this.studyShapes = [];
    this.studyInstructions = [];

    while (true) {
      this.studyPositions.unshift(this.chess.fen());
      this.studyShapes.unshift(this.parseShapes(this.chess.getComment()));
      this.studyInstructions.unshift(this.parseInstruction(this.chess.getComment()));
      const move = this.chess.undo();
      if (!move) break;
    }

    const startShapes = this.parseShapes(initialComment);
    const startInstruction = this.parseInstruction(initialComment);
    if (startShapes.length > 0) this.studyShapes[0] = [...this.studyShapes[0], ...startShapes];
    if (startInstruction) this.studyInstructions[0] = startInstruction;

    this.currentPly.set(0);
    this.syncChessToCurrentIndex();
  }

  private parseShapes(comment?: string): DrawShape[] {
    if (!comment) return [];
    const shapes: DrawShape[] = [];
    const cslMatch = comment.match(/\[%csl\s+([^\]]+)\]/);
    if (cslMatch) {
      const items = cslMatch[1].split(',');
      for (let item of items) {
        item = item.trim();
        if (item.length >= 3) {
          const colorCode = item.charAt(0);
          const square = item.substring(1, 3) as Key;
          shapes.push({ orig: square, brush: this.getBrushColor(colorCode) });
        }
      }
    }
    const calMatch = comment.match(/\[%cal\s+([^\]]+)\]/);
    if (calMatch) {
      const items = calMatch[1].split(',');
      for (let item of items) {
        item = item.trim();
        if (item.length >= 5) {
          const colorCode = item.charAt(0);
          const orig = item.substring(1, 3) as Key;
          const dest = item.substring(3, 5) as Key;
          shapes.push({ orig, dest, brush: this.getBrushColor(colorCode) });
        }
      }
    }
    return shapes;
  }

  private getBrushColor(code: string): string {
    switch (code.toUpperCase()) {
      case 'G':
        return 'green';
      case 'R':
        return 'red';
      case 'Y':
        return 'yellow';
      case 'B':
        return 'blue';
      default:
        return 'green';
    }
  }

  private parseInstruction(comment?: string): string {
    if (!comment) return '';
    return comment
      .replace(/\[%(csl|cal)[^\]]*\]/g, '')
      .replace(/[{}]/g, '')
      .trim();
  }

  private syncChessToCurrentIndex() {
    this.chess.load(this.initialFen);
    // Apply moves up to currentPly (1-indexed move list)
    // If currentPly is 0, no moves are applied.
    for (let i = 0; i < this.currentPly(); i++) {
      if (this.moveHistory[i]) {
        this.chess.move(this.moveHistory[i]);
      }
    }
    this.displayFen.set(this.chess.fen());
  }

  onUserMove(event: { from: string; to: string; san: string; fen: string }) {
    try {
      // Truncate history if moving from a previous position
      this.moveHistory = this.moveHistory.slice(0, this.currentPly());
      this.studyPositions = this.studyPositions.slice(0, this.currentPly() + 1);
      this.studyShapes = this.studyShapes.slice(0, this.currentPly() + 1);
      this.studyInstructions = this.studyInstructions.slice(0, this.currentPly() + 1);

      this.moveHistory.push(event.san);
      this.currentPly.update(p => p + 1);
      this.studyPositions.push(event.fen);
      this.studyShapes.push([]);
      this.studyInstructions.push('');

      this.syncChessToCurrentIndex();
    } catch (e) {
      this.syncChessToCurrentIndex();
    }
  }

  goToMove(ply: number) {
    this.currentPly.set(ply);
    this.syncChessToCurrentIndex();
    this.moveClicked.emit(ply);
  }

  nextMove() {
    if (this.currentPly() < this.moveHistory.length) {
      this.currentPly.update(p => p + 1);
      this.syncChessToCurrentIndex();
      this.audioService.playMoveSound(this.moveHistory[this.currentPly() - 1]);
    }
  }

  prevMove() {
    if (this.currentPly() > 0) {
      this.currentPly.update(p => p - 1);
      this.syncChessToCurrentIndex();
    }
  }

  goToStart() {
    this.goToMove(0);
  }

  goToEnd() {
    this.goToMove(this.moveHistory.length);
  }
}

