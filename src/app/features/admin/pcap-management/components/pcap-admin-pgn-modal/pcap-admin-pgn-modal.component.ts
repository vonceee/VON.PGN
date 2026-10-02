import { Component, ChangeDetectionStrategy, input, model, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextAreaComponent } from '../../../../../shared/components/ui/text-area/text-area.component';
import { ChesscomService, ChesscomGame } from '../../../../../core/services/chesscom.service';
import { ToastService } from '../../../../../core/services/toast.service';

export interface PgnEditingBoardData {
  boardNumber: number;
  roleLabel: string;
  playerA: string;
  playerB: string;
  chesscomUsernameA?: string;
  chesscomUsernameB?: string;
  matchDate?: string;
  blitzPgn: string;
  rapidPgn: string;
  blitzScoreA?: number;
  blitzScoreB?: number;
  rapidScoreA?: number;
  rapidScoreB?: number;
}

@Component({
  selector: 'app-pcap-admin-pgn-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TextAreaComponent],
  templateUrl: './pcap-admin-pgn-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PcapAdminPgnModalComponent {
  private readonly chesscomService = inject(ChesscomService);
  private readonly toast = inject(ToastService);

  readonly isOpen = input<boolean>(false);
  readonly boardData = model<PgnEditingBoardData | null>(null);

  readonly save = output<void>();
  readonly close = output<void>();
  readonly fileSelected = output<{ event: Event; type: 'blitz' | 'rapid' }>();

  readonly isFetching = signal<boolean>(false);
  readonly fetchStatus = signal<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null);
  readonly candidates = signal<ChesscomGame[]>([]);

  fetchFromChesscom(): void {
    const item = this.boardData();
    if (!item) return;

    const uA = item.chesscomUsernameA?.trim();
    const uB = item.chesscomUsernameB?.trim();

    if (!uA || !uB) {
      this.fetchStatus.set({
        type: 'warning',
        text: 'Please configure Chess.com usernames for both players in the Team Roster first.'
      });
      return;
    }

    if (!item.matchDate) {
      this.fetchStatus.set({
        type: 'warning',
        text: 'Please set the match date in Fixture Details before fetching games.'
      });
      return;
    }

    this.isFetching.set(true);
    this.fetchStatus.set(null);
    this.candidates.set([]);

    this.chesscomService.findHeadToHeadGames(uA, uB, item.matchDate).subscribe({
      next: (res) => {
        this.isFetching.set(false);
        this.candidates.set(res.allCandidates || []);

        if (res.success) {
          if (res.blitzGame) {
            item.blitzPgn = res.blitzGame.pgn;
            item.blitzScoreA = res.blitzScoreA;
            item.blitzScoreB = res.blitzScoreB;
          }
          if (res.rapidGame) {
            item.rapidPgn = res.rapidGame.pgn;
            item.rapidScoreA = res.rapidScoreA;
            item.rapidScoreB = res.rapidScoreB;
          }
          this.fetchStatus.set({ type: 'success', text: res.message });
          this.toast.show(res.message, 'success');
        } else {
          this.fetchStatus.set({ type: 'warning', text: res.message });
        }
      },
      error: (err) => {
        this.isFetching.set(false);
        const msg = err?.message || 'Failed to query Chess.com API.';
        this.fetchStatus.set({ type: 'error', text: msg });
        this.toast.show(msg, 'error');
      }
    });
  }

  selectCandidate(game: ChesscomGame): void {
    const item = this.boardData();
    if (!item) return;

    const isRapid = game.time_class === 'rapid' || game.time_control.startsWith('900');
    if (isRapid) {
      item.rapidPgn = game.pgn;
    } else {
      item.blitzPgn = game.pgn;
    }

    const scores = this.chesscomService.calculateMatchScores(item.chesscomUsernameA || '', isRapid ? undefined : game, isRapid ? game : undefined);
    if (isRapid) {
      item.rapidScoreA = scores.rapidScoreA;
      item.rapidScoreB = scores.rapidScoreB;
    } else {
      item.blitzScoreA = scores.blitzScoreA;
      item.blitzScoreB = scores.blitzScoreB;
    }

    this.toast.show(`Applied ${isRapid ? 'Rapid' : 'Blitz'} game candidate to Board ${item.boardNumber}`, 'success');
  }

  markDefaultWin(winner: 'A' | 'B'): void {
    const item = this.boardData();
    if (!item) return;

    if (winner === 'A') {
      item.blitzScoreA = 1;
      item.blitzScoreB = 0;
      item.rapidScoreA = 2;
      item.rapidScoreB = 0;
    } else {
      item.blitzScoreA = 0;
      item.blitzScoreB = 1;
      item.rapidScoreA = 0;
      item.rapidScoreB = 2;
    }

    this.fetchStatus.set({
      type: 'info',
      text: `Marked Default Win for ${winner === 'A' ? item.playerA || 'Player A' : item.playerB || 'Player B'} (Blitz: ${winner === 'A' ? '1-0' : '0-1'}, Rapid: ${winner === 'A' ? '2-0' : '0-2'}).`
    });
    this.toast.show(`Default recorded for Player ${winner}`, 'success');
  }

  formatDate(epochSeconds: number): string {
    return new Date(epochSeconds * 1000).toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
