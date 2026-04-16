import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

@Component({
  selector: 'app-chess-clock',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-between p-2 rounded-2xl min-w-[70px] border transition-colors duration-200"
      [class.border-cyan-400]="isActive && displayTime >= 0"
      [class.bg-cyan-400/10]="isActive && displayTime >= 0"
      [class.border-border-theme]="displayTime < 0 || (!isActive && displayTime >= 10000)"
      [class.border-red-500]="displayTime >= 0 && displayTime < 3000"
      [class.border-amber-500]="displayTime >= 3000 && displayTime < 10000 && !isActive"
    >
      <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <div 
        class="text-2xl font-semibold tabular-nums font-mono"
        [class.text-amber-400]="displayTime < 10000 && displayTime >= 3000"
        [class.text-red-500]="displayTime >= 0 && displayTime < 3000"
        [class.animate-pulse]="displayTime >= 0 && displayTime < 3000"
      >{{ formatTime(displayTime) }}</div>
    </div>
  `,
})
export class ChessClockComponent implements OnChanges, OnDestroy {
  /**
   * Lichess-style clock implementation:
   * - Server stores: time_remaining_ms (after last move), last_move_timestamp
   * - Client calculates: displayTime = storedTime - (now - lastMoveTimestamp)
   * - Only the active player's clock ticks down
   */

  @Input() serverTimeMs: number = 0;      // Time remaining from server (after last move)
  @Input() serverTimestamp: string = '';   // Server timestamp of last move
  @Input() isActive: boolean = false;      // Is this clock the active player's turn?
  @Output() expired = new EventEmitter<void>();

  displayTime: number = 0;

  private rafId: number | null = null;
  private running = false;
  private hasExpired = false;

  // Stored values for calculation
  private storedTimeMs: number = 0;
  private lastMoveTimestamp: number = 0;
  private offsetMs: number = 0; // Calibration offset: serverTime - clientTime

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serverTimeMs'] || changes['serverTimestamp']) {
      this.updateStoredValues();
    }

    if (changes['isActive']) {
      if (this.isActive) {
        this.startTicking();
      } else {
        this.stopTicking();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopTicking();
  }

  /**
   * Update stored values from server data.
   * Called when server sends new time/timestamp.
   */
  private updateStoredValues(): void {
    const timeMs = this.serverTimeMs;
    const timestamp = this.serverTimestamp;

    if (typeof timeMs === 'number') {
      this.storedTimeMs = timeMs;
      
      if (timestamp) {
        const parsed = Date.parse(timestamp);
        if (!isNaN(parsed)) {
          this.lastMoveTimestamp = parsed;
          
          /**
           * Drift Correction (Lichess style):
           * The first time we receive a timestamp, or periodically, 
           * we calculate the delta between our machine time and the server time.
           * We use the MOST RECENT update to recalibrate.
           */
          const nowMs = Date.now();
          // serverTime = clientTime + offset -> offset = serverTime - clientTime
          // We assume the server sent the timestamp 'now' (ignoring latency for now)
          this.offsetMs = parsed - nowMs;
        } else {
          this.lastMoveTimestamp = Date.now();
          this.offsetMs = 0;
        }
      } else {
        this.lastMoveTimestamp = Date.now();
        this.offsetMs = 0;
      }
      
      this.displayTime = this.storedTimeMs;
      this.hasExpired = false;
      this.cdr.markForCheck();
    }
  }

  private startTicking(): void {
    if (this.running) return;
    this.running = true;

    const tick = () => {
      if (!this.running) return;

      const nowMs = Date.now();
      
      if (this.lastMoveTimestamp && this.storedTimeMs >= 0) {
        /**
         * The elapsed time since the server's lastMoveTimestamp.
         * We adjust our local 'now' with the calibration offset.
         */
        const calibratedNow = nowMs + this.offsetMs;
        const elapsedMs = Math.max(0, calibratedNow - this.lastMoveTimestamp);
        
        if (this.isActive) {
          this.displayTime = Math.max(0, this.storedTimeMs - elapsedMs);
        } else {
          this.displayTime = this.storedTimeMs;
        }
      }

      if (this.displayTime <= 0 && !this.hasExpired) {
        this.hasExpired = true;
        this.expired.emit();
      }

      this.cdr.markForCheck();
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopTicking(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  formatTime(ms: number): string {
    if (ms < 0) return '-:--';
    if (ms === 0) return '0:00.0';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (ms < 10000) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}