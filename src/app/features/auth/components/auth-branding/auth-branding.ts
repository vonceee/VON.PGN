import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChessBoardComponent } from '@shared/chess';
import { TypewriterTextComponent } from '@shared/ui';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';

// The "Game of the Century" (Byrne vs Fischer 1956)
const FISCHER_GAME_MOVES = [
  'Nf3', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'd4', 'O-O', 'Bf4', 'd5',
  'Qb3', 'dxc4', 'Qxc4', 'c6', 'e4', 'Nbd7', 'Rd1', 'Nb6', 'Qc5', 'Bg4',
  'Bg5', 'Na4', 'Qa3', 'Nxc3', 'bxc3', 'Nxe4', 'Bxe7', 'Qb6', 'Bc4', 'Nxc3',
  'Bc5', 'Rfe8+', 'Kf1', 'Be6', 'Bxb6', 'Bxc4+', 'Kg1', 'Ne2+', 'Kf1', 'Nxd4+',
  'Kg1', 'Ne2+', 'Kf1', 'Nc3+', 'Kg1', 'axb6', 'Qb4', 'Ra4', 'Qxb6', 'Nxd1',
  'h3', 'Rxa2', 'Kh2', 'Nxf2'
];

function buildGameFens(moves: string[]): { fen: string; lastMove: Key[] | null }[] {
  const chess = new Chess();
  const frames: { fen: string; lastMove: Key[] | null }[] = [
    { fen: chess.fen(), lastMove: null },
  ];
  for (const san of moves) {
    const result = chess.move(san);
    if (result) {
      frames.push({
        fen: chess.fen(),
        lastMove: [result.from, result.to] as Key[],
      });
    }
  }
  return frames;
}

const GAME_FRAMES = buildGameFens(FISCHER_GAME_MOVES);

@Component({
  selector: 'app-auth-branding',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, TypewriterTextComponent],
  templateUrl: './auth-branding.html',
})
export class AuthBrandingComponent implements OnInit, OnDestroy {
  private frameIndex = signal(0);
  private intervalId: any;

  currentFen = computed(() => GAME_FRAMES[this.frameIndex()].fen);
  currentLastMove = computed(() => GAME_FRAMES[this.frameIndex()].lastMove ?? undefined);

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.frameIndex.update(idx => (idx + 1) % GAME_FRAMES.length);
    }, 1200);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
