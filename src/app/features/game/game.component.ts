import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  NgZone,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroFlag,
  heroArrowPath,
  heroHandRaised,
  heroNoSymbol,
} from '@ng-icons/heroicons/outline';

import { ChessBoardComponent } from '../../shared/components/chess/chess-board/chess-board.component';
import { RoundService, ApiMove, ApiEnd } from './services/round.service';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, ChessBoardComponent],
  providers: [
    RoundService,
    provideIcons({ heroFlag, heroArrowPath, heroHandRaised, heroNoSymbol }),
  ],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">

      @if (!round.data()) {
        <!-- Loading state -->
        <div class="flex flex-col items-center gap-4 text-gray-500">
          <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm">Connecting to game...</p>
        </div>
      } @else {
        <div class="flex flex-col lg:flex-row gap-8 w-full max-w-5xl">

          <!-- Board column -->
          <div class="flex-1 flex flex-col gap-3">

            <!-- Opponent info + clock -->
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full"
                  [class.bg-green-500]="isOpponentTurn()"
                  [class.bg-slate-300]="!isOpponentTurn()">
                </div>
                <span class="font-semibold text-sm">{{ opponentName() }}</span>
              </div>
              <div class="font-mono text-lg font-bold px-3 py-1 rounded-lg bg-slate-200"
                [class.text-rose-500]="opponentClock() < 20">
                {{ formatTime(opponentClock()) }}
              </div>
            </div>

            <!-- Chess board -->
            <div class="relative rounded-xl overflow-hidden border border-border-base shadow-sm">
              <app-chess-board
                [fen]="round.boardFen()"
                [orientation]="round.myColor() ?? 'white'"
                [possibleMoves]="round.possibleMoves()"
                [interactive]="round.isActive()"
                [hideCoordinates]="false"
                [fluid]="true"
                (moveMade)="onMoveMade($event)">
              </app-chess-board>

              <!-- End game overlay -->
              @if (round.winner() !== undefined && round.endStatus()) {
                <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-50">
                  <div class="bg-white rounded-2xl p-8 text-center shadow-xl flex flex-col gap-3 max-w-sm w-full mx-4">
                    <p class="text-4xl">{{ endEmoji() }}</p>
                    <h2 class="text-2xl font-semibold">{{ endHeadline() }}</h2>
                    <p class="text-gray-500 text-sm">{{ endReasonLabel() }}</p>
                    <div class="flex gap-2 mt-4 justify-center">
                      <a routerLink="/" class="px-5 py-2.5 rounded-xl border border-border-base text-sm font-medium hover:bg-slate-50">
                        Home
                      </a>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- My info + clock -->
            <div class="flex items-center justify-between px-2">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full"
                  [class.bg-green-500]="isMyTurn()"
                  [class.bg-slate-300]="!isMyTurn()">
                </div>
                <span class="font-semibold text-sm">{{ myName() }}</span>
              </div>
              <div class="font-mono text-lg font-bold px-3 py-1 rounded-lg bg-slate-200"
                [class.text-rose-500]="myClock() < 20">
                {{ formatTime(myClock()) }}
              </div>
            </div>
          </div>

          <!-- Controls sidebar -->
          <div class="lg:w-64 flex flex-col gap-4">

            <!-- Draw offer banner -->
            @if (round.drawOffer() && round.drawOffer() !== round.myColor()) {
              <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-2">
                <p class="text-sm font-semibold text-amber-800">Opponent offers a draw</p>
                <div class="flex gap-2">
                  <button (click)="acceptDraw()"
                    class="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                    Accept
                  </button>
                  <button (click)="round.drawOffer.set(null)"
                    class="flex-1 px-3 py-2 rounded-lg border border-border-base text-xs font-medium hover:bg-slate-50">
                    Decline
                  </button>
                </div>
              </div>
            }

            <!-- Action buttons -->
            @if (round.isActive()) {
              <div class="flex flex-col gap-2">
                <button (click)="offerDraw()"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-base text-sm font-medium hover:bg-slate-50 transition-colors">
                  <ng-icon name="heroHandRaised" class="text-base text-gray-500"></ng-icon>
                  Offer Draw
                </button>
                @if (canAbort()) {
                  <button (click)="abort()"
                    class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-base text-sm font-medium hover:bg-slate-50 transition-colors">
                    <ng-icon name="heroNoSymbol" class="text-base text-gray-500"></ng-icon>
                    Abort Game
                  </button>
                }
                <button (click)="resign()"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 transition-colors">
                  <ng-icon name="heroFlag" class="text-base"></ng-icon>
                  Resign
                </button>
              </div>
            }

            <!-- Move list -->
            <div class="bg-white border border-border-base rounded-xl p-4 flex-1 overflow-y-auto max-h-80">
              <h3 class="text-xs font-semibold text-gray-500 uppercase mb-3">Moves</h3>
              <div class="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                @for (pair of movePairs(); track $index) {
                  <span class="text-gray-400 text-xs">{{ $index + 1 }}.</span>
                  <span class="font-medium">{{ pair[0] }}</span>
                  <span class="font-medium text-gray-600">{{ pair[1] ?? '' }}</span>
                }
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  `,
})
export class GameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private audio = inject(AudioService);
  private platformId = inject(PLATFORM_ID);
  readonly round = inject(RoundService);

  private subs: Subscription[] = [];

  // Move history as SAN strings
  private moveHistory = signal<string[]>([]);

  movePairs = computed(() => {
    const h = this.moveHistory();
    const pairs: [string, string | undefined][] = [];
    for (let i = 0; i < h.length; i += 2) {
      pairs.push([h[i], h[i + 1]]);
    }
    return pairs;
  });

  // ── Player helpers ──────────────────────────────────────────────────────

  myName = computed(() => {
    const user = this.auth.currentUser();
    return user?.name ?? 'You';
  });

  opponentName = computed(() => {
    const d = this.round.data();
    if (!d) return 'Opponent';
    const myUid = String(this.auth.currentUser()?.uid);
    return String(d.white) === myUid ? String(d.black) : String(d.white);
  });

  myClock = computed(() => {
    const color = this.round.myColor();
    return color === 'white' ? this.round.clock().white : this.round.clock().black;
  });

  opponentClock = computed(() => {
    const color = this.round.myColor();
    return color === 'white' ? this.round.clock().black : this.round.clock().white;
  });

  isMyTurn = computed(() => {
    const pm = this.round.possibleMoves();
    return pm !== null && Object.keys(pm).length > 0;
  });

  isOpponentTurn = computed(() => !this.isMyTurn() && this.round.isActive());

  canAbort = computed(() => (this.moveHistory().length < 2) && this.round.isActive());

  // ── End game display ────────────────────────────────────────────────────

  endEmoji = computed(() => {
    const w = this.round.winner();
    const me = this.round.myColor();
    if (w === null) return '🤝';
    return w === me ? '🏆' : '💀';
  });

  endHeadline = computed(() => {
    const w = this.round.winner();
    const me = this.round.myColor();
    if (w === null) return 'Draw';
    return w === me ? 'You win!' : 'You lose';
  });

  endReasonLabel = computed(() => {
    const status = this.round.endStatus();
    const labels: Record<string, string> = {
      mate: 'Checkmate',
      resign: 'Resignation',
      timeout: 'Time out',
      draw: 'Mutual agreement',
      stalemate: 'Stalemate',
      threefold: 'Threefold repetition',
      insufficient: 'Insufficient material',
      aborted: 'Game aborted',
    };
    return labels[status ?? ''] ?? status ?? '';
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (!gameId) { this.router.navigate(['/']); return; }

    this.round.joinGame(gameId);

    this.subs.push(
      this.round.onMove$.subscribe(o => this.onServerMove(o)),
      this.round.onEnd$.subscribe(o => this.onGameEnd(o)),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.round.disconnect();
  }

  // ── Move handling ───────────────────────────────────────────────────────

  onMoveMade(event: { uci: string }): void {
    this.round.sendMove(event.uci);
    // Board already shows the move optimistically (Chessground applied it)
  }

  private onServerMove(o: ApiMove): void {
    this.moveHistory.update(h => [...h, o.san]);
    this.audio.playChessMove({ san: o.san, flags: 'n' });
  }

  private onGameEnd(_o: ApiEnd): void {
    this.audio.playBoardStart(); // use a distinct end sound when available
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  resign(): void {
    if (!confirm('Are you sure you want to resign?')) return;
    this.round.sendResign();
  }

  abort(): void { this.round.sendAbort(); }

  offerDraw(): void { this.round.sendDrawOffer(); }

  acceptDraw(): void { this.round.sendDrawAccept(); }

  // ── Formatting ──────────────────────────────────────────────────────────

  formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
