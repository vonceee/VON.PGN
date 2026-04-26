import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type BoardTheme = 'blue3';
export type PieceSet = 'cburnett';

export const BOARD_THEMES: { value: BoardTheme; label: string }[] = [
  { value: 'blue3', label: 'Blue 3' },
];

export const PIECE_SETS: { value: PieceSet; label: string }[] = [
  { value: 'cburnett', label: 'Cburnett' },
];

@Injectable({
  providedIn: 'root',
})
export class BoardThemeService {
  private platformId = inject(PLATFORM_ID);
  private boardLinkEl: HTMLLinkElement | null = null;
  private pieceLinkEl: HTMLLinkElement | null = null;

  boardTheme = signal<BoardTheme>('blue3');
  pieceSet = signal<PieceSet>('cburnett');

  constructor() {
    if (!this.isBrowser) return;

    this.loadBoardCSS(this.boardTheme());
    this.loadPieceCSS(this.pieceSet());
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
