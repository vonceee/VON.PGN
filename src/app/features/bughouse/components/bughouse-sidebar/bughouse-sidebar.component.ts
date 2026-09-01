import { Component, ChangeDetectionStrategy, input, output, model, computed, effect, ElementRef, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../../core/services/toast.service';
import { MoveLogEntry, BughouseTeamsState, BughouseGameOverState, BughouseRecordState } from '../../../../core/models/bughouse.model';

@Component({
  selector: 'app-bughouse-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bughouse-sidebar.component.html',
})
export class BughouseSidebarComponent {
  private toastService = inject(ToastService);

  // Model Inputs
  activeSidebarTab = model<'players' | 'moves'>('players');

  // Standard Inputs
  movesLog = input.required<MoveLogEntry[]>();
  isHost = input.required<boolean>();
  teamsState = input.required<BughouseTeamsState>();
  gameOverState = input.required<BughouseGameOverState>();
  record = input.required<BughouseRecordState>();

  // Outputs
  offerRematch = output<void>();
  declineRematch = output<void>();
  startQueue = output<void>();
  resign = output<void>();
  offerDraw = output<void>();

  // View Child signals
  movesContainer = viewChild<ElementRef<HTMLDivElement>>('movesContainer');

  constructor() {
    effect(() => {
      this.movesLog();
      if (this.activeSidebarTab() === 'moves') {
        const container = this.movesContainer()?.nativeElement;
        if (container) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              container.scrollTop = container.scrollHeight;
            });
          });
        }
      }
    });
  }

  getWinnerText(): string {
    const winner = this.gameOverState().winner;
    if (winner === 'Draw') return 'Draw match';
    if (!winner) return '';
    const teams = this.teamsState();
    if (winner === 'Team A' && teams.teamA) {
      return `${teams.teamA.captain.name} & ${teams.teamA.partner.name} WIN!`;
    } else if (winner === 'Team B' && teams.teamB) {
      return `${teams.teamB.captain.name} & ${teams.teamB.partner.name} WIN!`;
    }
    return `${winner} wins!`;
  }

  getPlayerNameForEntry(entry: MoveLogEntry): string {
    const teams = this.teamsState();
    if (entry.board === 'A') {
      return entry.moveColor === 'w' ? (teams.boards.boardA.white || 'White') : (teams.boards.boardA.black || 'Black');
    } else {
      return entry.moveColor === 'w' ? (teams.boards.boardB.white || 'White') : (teams.boards.boardB.black || 'Black');
    }
  }

  formatRemainingTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const totalSecs = Math.round(seconds);
    const mm = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const ss = (totalSecs % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  copyPgn() {
    const pgnText = this.movesLog().map((m) => {
      const boardCode = m.board === 'A' 
        ? (m.moveColor === 'w' ? 'A' : 'a') 
        : (m.moveColor === 'w' ? 'B' : 'b');
      
      const sanFormatted = m.san.startsWith('@') ? 'P' + m.san : m.san;
      const clk = `{[%clk ${this.formatRemainingTime(m.remainingTime)}]}`;
      
      return `${m.moveNo}${boardCode}. ${sanFormatted} ${clk}`;
    }).join(' ');
    
    if (pgnText) {
      navigator.clipboard.writeText(pgnText).then(() => {
        this.toastService.show('PGN copied to clipboard', 'success');
      }).catch(err => {
        console.error('Failed to copy PGN: ', err);
        this.toastService.show('Failed to copy PGN', 'error');
      });
    }
  }
}
