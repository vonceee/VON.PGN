import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type BoardTheme = 'brown' | 'blue' | 'blue2' | 'blue3' | 'green' | 'purple' | 'wood' | 'wood2' | 'olive' | 'newspaper';
export type PieceSet = 'cburnett' | 'merida' | 'riohacha' | 'companion' | 'leipzig' | 'tatiana';

export const BOARD_THEMES: { value: BoardTheme; label: string }[] = [
  { value: 'brown', label: 'Brown' },
  { value: 'blue', label: 'Blue' },
  { value: 'blue2', label: 'Blue 2' },
  { value: 'blue3', label: 'Blue 3' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'wood', label: 'Wood' },
  { value: 'wood2', label: 'Wood 2' },
  { value: 'olive', label: 'Olive' },
  { value: 'newspaper', label: 'Newspaper' },
];

export const PIECE_SETS: { value: PieceSet; label: string }[] = [
  { value: 'cburnett', label: 'Cburnett' },
  { value: 'merida', label: 'Merida' },
  { value: 'riohacha', label: 'Riohacha' },
  { value: 'companion', label: 'Companion' },
  { value: 'leipzig', label: 'Leipzig' },
  { value: 'tatiana', label: 'Tatiana' },
];

@Injectable({
  providedIn: 'root',
})
export class BoardThemeService {
  private platformId = inject(PLATFORM_ID);
  private boardLinkEl: HTMLLinkElement | null = null;
  private pieceLinkEl: HTMLLinkElement | null = null;

  boardTheme = signal<BoardTheme>('newspaper');
  pieceSet = signal<PieceSet>('cburnett');

  constructor() {
    if (!this.isBrowser) return;

    const savedBoard = localStorage.getItem('board_theme') as BoardTheme | null;
    if (savedBoard && BOARD_THEMES.some((t) => t.value === savedBoard)) {
      this.boardTheme.set(savedBoard);
    }

    const savedPiece = localStorage.getItem('piece_set') as PieceSet | null;
    if (savedPiece && PIECE_SETS.some((t) => t.value === savedPiece)) {
      this.pieceSet.set(savedPiece);
    }

    this.loadBoardCSS(this.boardTheme());
    this.loadPieceCSS(this.pieceSet());

    effect(() => {
      const theme = this.boardTheme();
      localStorage.setItem('board_theme', theme);
      this.loadBoardCSS(theme);
    });

    effect(() => {
      const set = this.pieceSet();
      localStorage.setItem('piece_set', set);
      this.loadPieceCSS(set);
    });
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private loadBoardCSS(theme: BoardTheme): void {
    if (!this.isBrowser) return;

    if (!this.boardLinkEl) {
      this.boardLinkEl = document.createElement('link');
      this.boardLinkEl.rel = 'stylesheet';
      this.boardLinkEl.id = 'board-theme-css';
      document.head.appendChild(this.boardLinkEl);
    }
    this.boardLinkEl.href = `/styles/board-themes/board-${theme}.css`;
  }

  private loadPieceCSS(set: PieceSet): void {
    if (!this.isBrowser) return;

    if (!this.pieceLinkEl) {
      this.pieceLinkEl = document.createElement('link');
      this.pieceLinkEl.rel = 'stylesheet';
      this.pieceLinkEl.id = 'piece-set-css';
      document.head.appendChild(this.pieceLinkEl);
    }
    this.pieceLinkEl.href = `/styles/piece-sets/piece-${set}.css`;
  }
}
