import { Component, Input, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BroadcastService, LiveGame } from '../../../core/services/broadcast.service';
import { PgnParser } from '../../../core/utils/pgn-parser';

@Component({
  selector: 'app-broadcast-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="broadcast-board-container">
      @if (loading()) {
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading broadcast...</p>
        </div>
      } @else if (error()) {
        <div class="error-message">
          {{ error() }}
        </div>
      } @else if (gameData()) {
        <div class="board-layout">
          <!-- Board -->
          <div class="board-wrapper">
            <div class="chess-board">
              @for (row of boardRows; let rowIdx = $index; track rowIdx) {
                <div class="board-row">
                  @for (piece of row; let colIdx = $index; track colIdx) {
                    <div
                      [class.square]="true"
                      [class.light]="(rowIdx + colIdx) % 2 === 0"
                      [class.dark]="(rowIdx + colIdx) % 2 === 1"
                    >
                      {{ piece }}
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Game Info -->
          <div class="game-info">
            <div class="players">
              <div class="player white">
                <div class="player-name">{{ whitePlayer() }}</div>
                <div class="player-rating">{{ whiteRating() }}</div>
              </div>
              <div class="vs">vs</div>
              <div class="player black">
                <div class="player-name">{{ blackPlayer() }}</div>
                <div class="player-rating">{{ blackRating() }}</div>
              </div>
            </div>

            <!-- Moves -->
            <div class="moves-section">
              <div class="moves-title">Move History</div>
              <div class="moves-grid">
                @for (move of moves(); let idx = $index; track idx) {
                  <div class="move-pair">
                    @if (idx % 2 === 0) {
                      <span class="move-number">{{ (idx / 2 + 1) | number }}</span>
                    }
                    <span class="move">{{ move }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Stream Status -->
            <div class="stream-status">
              @if (isStreaming()) {
                <span class="badge-live">🔴 LIVE STREAMING</span>
              } @else {
                <span class="badge-poll">📊 Last updated 15 min ago</span>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .broadcast-board-container {
      width: 100%;
      padding: 1.5rem;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
      border-radius: 16px;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--cyan-500);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: rgb(239, 68, 68);
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }

    .board-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      align-items: start;
    }

    @media (max-width: 1200px) {
      .board-layout {
        grid-template-columns: 1fr;
      }
    }

    .board-wrapper {
      display: flex;
      justify-content: center;
    }

    .chess-board {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 0;
      border: 3px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background: var(--bg-primary);
      max-width: 100%;
      aspect-ratio: 1;
    }

    .board-row {
      display: contents;
    }

    .square {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: bold;
      aspect-ratio: 1;
      user-select: none;
      cursor: default;
    }

    .square.light {
      background: #f0d9b5;
      color: #222;
    }

    .square.dark {
      background: #baca44;
      color: #222;
    }

    .game-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .players {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .player {
      flex: 1;
      text-align: center;
    }

    .player-name {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .player-rating {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .vs {
      color: var(--text-secondary);
      font-size: 0.875rem;
      opacity: 0.6;
    }

    .moves-section {
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .moves-title {
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
    }

    .moves-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
      gap: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .move-pair {
      display: flex;
      gap: 0.25rem;
      font-size: 0.75rem;
    }

    .move-number {
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 1.5rem;
    }

    .move {
      padding: 0.25rem 0.5rem;
      background: var(--bg-primary);
      border-radius: 4px;
      color: var(--text-primary);
      font-family: monospace;
      flex: 1;
      text-align: center;
    }

    .stream-status {
      display: flex;
      justify-content: center;
      padding: 0.75rem;
      background: var(--bg-primary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 4px;
      color: rgb(239, 68, 68);
      font-size: 0.875rem;
      font-weight: 600;
      animation: pulse 2s infinite;
    }

    .badge-poll {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 4px;
      color: rgb(59, 130, 246);
      font-size: 0.875rem;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    :host {
      --bg-primary: #1f2937;
      --bg-secondary: #374151;
      --border-color: #4b5563;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --cyan-500: #06b6d4;
    }
  `]
})
export class BroadcastBoardComponent implements OnInit {
  @Input() broadcastId!: string;

  private broadcastService = inject(BroadcastService);

  loading = signal(false);
  error = signal<string | null>(null);
  gameData = signal<LiveGame | null>(null);
  moves = signal<string[]>([]);
  boardRows = [
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];

  isStreaming = signal(false);

  whitePlayer = signal('White');
  whiteRating = signal(0);
  blackPlayer = signal('Black');
  blackRating = signal(0);

  ngOnInit() {
    this.loadBroadcast();
  }

  private loadBroadcast() {
    this.loading.set(true);

    // First, get broadcast detail to find the current round
    this.broadcastService.getBroadcastDetail(this.broadcastId).subscribe({
      next: (response: any) => {
        const broadcast = response.broadcast || response;
        const rounds = response.rounds || [];
        
        // Find the current/default round (not finished or most recent)
        let currentRound = rounds.find((r: any) => !r.finished && r.startsAt);
        
        // If no ongoing round, use the first upcoming round
        if (!currentRound && rounds.length > 0) {
          currentRound = rounds[0];
        }
        
        // If we have a current round, fetch its PGN
        if (currentRound && currentRound.id) {
          this.fetchRoundPgn(currentRound.id);
        } else {
          // Fallback: try to fetch the broadcast PGN directly
          this.fetchBroadcastPgn();
        }
      },
      error: () => {
        // Fallback to direct PGN fetch
        this.fetchBroadcastPgn();
      }
    });
  }

  private fetchRoundPgn(roundId: string) {
    // Fetch PGN for this specific round
    this.broadcastService.getRoundPgn(roundId).subscribe({
      next: (pgn: any) => {
        if (pgn) {
          this.processPgn(pgn);
        } else {
          this.error.set('No game data available');
        }
        this.loading.set(false);
      },
      error: () => {
        this.fetchBroadcastPgn();
      }
    });
  }

  private fetchBroadcastPgn() {
    // Fallback: fetch broadcast PGN directly
    this.broadcastService.getLivePgn(this.broadcastId).subscribe({
      next: (response: any) => {
        if (response.pgn) {
          this.processPgn(response.pgn);
        } else {
          this.error.set('No game data available');
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load broadcast');
        this.loading.set(false);
        console.error('Error loading broadcast:', err);
      }
    });
  }

  private processPgn(pgn: string) {
    const metadata = PgnParser.extractMetadata(pgn);
    this.whitePlayer.set(metadata['White'] || 'White');
    this.whiteRating.set(parseInt(metadata['WhiteElo'] || '0') || 0);
    this.blackPlayer.set(metadata['Black'] || 'Black');
    this.blackRating.set(parseInt(metadata['BlackElo'] || '0') || 0);

    const moveList = PgnParser.getMoveList(pgn);
    this.moves.set(moveList);
  }
}
