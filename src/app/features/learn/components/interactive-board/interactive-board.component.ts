import { Component, ElementRef, Input, ViewChild, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { InteractiveTask } from '../../../../core/models/course.model';

import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Key } from 'chessground/types';

interface NotationRow {
  moveNumber: number;
  white: { san: string; index: number } | null;
  black: { san: string; index: number } | null;
}

interface DrawShape {
  orig: Key;
  dest?: Key;
  brush: string;
}

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
})
export class InteractiveBoardComponent {
  private http = inject(HttpClient);

  @ViewChild('boardContainer') boardContainer!: ElementRef;

  private cgApi!: Api;
  private chess = new Chess();
  private initialFen: string = '';
  private moveHistory: string[] = [];

  isLoading = signal<boolean>(true);  studyPositions: string[] = [];
  studyShapes: DrawShape[][] = [];
  studyInstructions: string[] = [];
  currentMoveIndex = 0;
  notationRows: NotationRow[] = [];

  @Input({ required: true }) set task(value: InteractiveTask) {
    this.isLoading.set(true);
    const pgnUrl = `${value.lichessUrl}.pgn`;

    this.http.get(pgnUrl, { responseType: 'text' }).subscribe({
      next: (pgnString) => {
        this.initializeStudy(pgnString);
        this.isLoading.set(false);
        setTimeout(() => this.initLichessBoard(), 0);
      },
      error: (err) => console.error('Failed to load PGN', err)
    });
  }

  /*
  * Initialize the study from a PGN string
  */
  private initializeStudy(pgn: string) {
    const safePgn = pgn.replace(/}\s*\{/g, ' ');
    const fenMatch = safePgn.match(/\[FEN\s+"([^"]+)"\]/);
    this.initialFen = fenMatch ? fenMatch[1] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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
    if (startShapes.length > 0) {
      this.studyShapes[0] = [...this.studyShapes[0], ...startShapes];
    }
    if (startInstruction) {
      this.studyInstructions[0] = startInstruction;
    }

    this.currentMoveIndex = 0;
    this.rebuildStateFromHistory();
    this.syncBoardToCurrentIndex();
  }

  // 2. Update this signature to accept our newly extracted comment
  private rebuildStateFromHistory() {
    const tempChess = new Chess(this.initialFen);
    this.notationRows = [];

    let currentMoveNum = tempChess.moveNumber();
    let isWhiteTurn = tempChess.turn() === 'w';
    let currentRow: NotationRow = { moveNumber: currentMoveNum, white: null, black: null };

    for (let i = 0; i < this.moveHistory.length; i++) {
      tempChess.move(this.moveHistory[i]);
      const positionIndex = i + 1;

      if (isWhiteTurn) {
        currentRow.white = { san: this.moveHistory[i], index: positionIndex };
        if (i === this.moveHistory.length - 1) this.notationRows.push({ ...currentRow });
      } else {
        currentRow.black = { san: this.moveHistory[i], index: positionIndex };
        this.notationRows.push({ ...currentRow });
        currentMoveNum++;
        currentRow = { moveNumber: currentMoveNum, white: null, black: null };
      }
      isWhiteTurn = !isWhiteTurn;
    }
  }

  /*
  * Parse shapes from a comment
  */
  private parseShapes(comment?: string): DrawShape[] {
    if (!comment) return [];
    const shapes: DrawShape[] = [];

    // Circles: [%csl Gf4, Ye5]
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

    // Arrows: [%cal Gf4f5, Re2e4]
    const calMatch = comment.match(/\[%cal\s+([^\]]+)\]/);
    if (calMatch) {
      const items = calMatch[1].split(',');
      for (let item of items) {
        item = item.trim(); // <-- THE FIX: Strip sneaky spaces
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
      case 'G': return 'green';
      case 'R': return 'red';
      case 'Y': return 'yellow';
      case 'B': return 'blue';
      default: return 'green';
    }
  }
  // --------------------------------

  private parseInstruction(comment?: string): string {
    if (!comment) return '';
    return comment
      .replace(/\[%(csl|cal)[^\]]*\]/g, '') // remove shape tags
      .replace(/[{}]/g, '')                 // remove literal { and } brackets
      .trim();
  }

  private syncBoardToCurrentIndex() {
    this.chess.load(this.initialFen);

    for (let i = 0; i < this.currentMoveIndex; i++) {
      this.chess.move(this.moveHistory[i]);
    }

    if (this.cgApi) {
      this.cgApi.set({
        fen: this.chess.fen(),
        turnColor: this.chess.turn() === 'w' ? 'white' : 'black',
        movable: {
          color: this.chess.turn() === 'w' ? 'white' : 'black',
          dests: this.getLegalMoves(),
        },
        drawable: {
          // Instruct chessground to paint our parsed shapes onto the board!
          autoShapes: this.studyShapes[this.currentMoveIndex] || []
        }
      });
    }
  }

  private getLegalMoves(): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>();
    this.chess.moves({ verbose: true }).forEach(m => {
      const from = m.from as Key;
      const to = m.to as Key;
      let destList = dests.get(from) || [];
      destList.push(to);
      dests.set(from, destList);
    });
    return dests;
  }

  private initLichessBoard() {
    this.cgApi = Chessground(this.boardContainer.nativeElement, {
      fen: this.studyPositions[this.currentMoveIndex],
      movable: {
        free: false,
        events: {
          after: (orig: Key, dest: Key) => this.onUserMove(orig, dest)
        }
      },
      drawable: {
        enabled: true, // Also allows the user to right-click and draw their own arrows!
        autoShapes: this.studyShapes[this.currentMoveIndex] || []
      }
    });
    this.syncBoardToCurrentIndex();
  }

  private onUserMove(orig: Key, dest: Key) {
    try {
      const move = this.chess.move({ from: orig, to: dest, promotion: 'q' });

      this.moveHistory = this.moveHistory.slice(0, this.currentMoveIndex);
      this.studyPositions = this.studyPositions.slice(0, this.currentMoveIndex + 1);
      this.studyShapes = this.studyShapes.slice(0, this.currentMoveIndex + 1);
      this.studyInstructions = this.studyInstructions.slice(0, this.currentMoveIndex + 1); // Slice the instructions

      this.moveHistory.push(move.san);
      this.currentMoveIndex++;

      this.studyPositions.push(this.chess.fen());
      this.studyShapes.push([]);
      this.studyInstructions.push('');

      this.rebuildStateFromHistory();
      this.syncBoardToCurrentIndex();
    } catch (e) {
      this.cgApi.set({ fen: this.chess.fen() });
    }
  }

  goToMove(index: number) {
    this.currentMoveIndex = index;
    this.syncBoardToCurrentIndex();
  }

  nextMove() {
    if (this.currentMoveIndex < this.studyPositions.length - 1) {
      this.currentMoveIndex++;
      this.syncBoardToCurrentIndex();
    }
  }

  prevMove() {
    if (this.currentMoveIndex > 0) {
      this.currentMoveIndex--;
      this.syncBoardToCurrentIndex();
    }
  }
}