import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { OpeningExplorerService } from '../../core/services/opening-explorer.service';
import { LichessExplorerResponse, LichessExplorerMove } from '../../core/models/opening.model';
import { ChessBoardComponent } from '../../shared/components/chess-board/chess-board.component';

@Component({
  selector: 'app-opening-explorer',
  standalone: true,
  imports: [DecimalPipe, ChessBoardComponent],
  templateUrl: './opening-explorer.component.html',
  styleUrls: ['./opening-explorer.component.css']
})
export class OpeningExplorerComponent implements OnInit {
  currentFen = signal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  explorerData = signal<LichessExplorerResponse | null>(null);
  isLoading = signal(false);

  constructor(private explorerService: OpeningExplorerService) {}

  ngOnInit() {
    this.fetchOpeningData(this.currentFen());
  }

  onFenChanged(newFen: string) {
    this.currentFen.set(newFen);
    this.fetchOpeningData(newFen);
  }

  onMoveSelected(move: LichessExplorerMove) {
    this.fetchOpeningData(this.currentFen());
  }

  private fetchOpeningData(fen: string) {
    this.isLoading.set(true);
    this.explorerService.getExploration(fen).subscribe({
      next: (data) => {
        this.explorerData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch opening data', err);
        this.isLoading.set(false);
      }
    });
  }

  getWinRates(move: LichessExplorerMove) {
    const total = move.white + move.draws + move.black;
    if (total === 0) return { white: 0, draws: 0, black: 0 };
    return {
      white: (move.white / total) * 100,
      draws: (move.draws / total) * 100,
      black: (move.black / total) * 100
    };
  }
}