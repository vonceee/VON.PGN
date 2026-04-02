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
      class="clock-container border border-border-theme"
      [class.clock-active]="isActive"
      [class.clock-low]="displayTime < 10000"
      [class.clock-critical]="displayTime < 3000"
    >
      <div class="clock-label">{{ label }}</div>
      <div class="clock-time">{{ formatTime(displayTime) }}</div>
    </div>
  `,
  styles: [`
    .clock-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      min-width: 160px;
      transition: border-color 0.2s, background-color 0.2s;
    }
    .clock-active {
      border-color: rgb(34 211 238);
      background: rgb(30 59 70);
    }
    .clock-low .clock-time {
      color: rgb(251 191 36);
    }
    .clock-critical .clock-time {
      color: rgb(239 68 68);
      animation: pulse-critical 0.5s ease-in-out infinite;
    }
    .clock-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .clock-time {
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    @keyframes pulse-critical {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
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
  @Input() label: string = '';
  @Output() expired = new EventEmitter<void>();

  displayTime: number = 0;

  private rafId: number | null = null;
  private running = false;
  private hasExpired = false;

  // Stored values for calculation
  private storedTimeMs: number = 0;
  private lastMoveTimestamp: number = 0;

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
   * Also validates for corrupted data.
   */
  private updateStoredValues(): void {
    const timeMs = this.serverTimeMs;
    const timestamp = this.serverTimestamp;

    // Validate: must be a positive number less than 1 hour
    const maxValidMs = 3600000; // 1 hour max for any time control
    
    if (typeof timeMs === 'number' && timeMs > 0 && timeMs <= maxValidMs) {
      this.storedTimeMs = timeMs;
      
      if (timestamp) {
        // Use Date.parse to match Date.now() time base
        const parsed = Date.parse(timestamp);
        if (!isNaN(parsed)) {
          this.lastMoveTimestamp = parsed;
        } else {
          this.lastMoveTimestamp = Date.now();
        }
      } else {
        this.lastMoveTimestamp = Date.now();
      }
      
      // Display time is just the stored time
      this.displayTime = this.storedTimeMs;
      this.hasExpired = false;
    }
  }

  private startTicking(): void {
    if (this.running) return;
    this.running = true;

    const tick = (now: number) => {
      if (!this.running) return;

      // Use Date.now() to be consistent with Date.parse(timestamp) from server
      const nowMs = Date.now();
      
      // Recalculate from stored values each tick
      // This ensures we don't have drift and handles updates correctly
      if (this.lastMoveTimestamp && this.storedTimeMs > 0) {
        const elapsedMs = nowMs - this.lastMoveTimestamp;
        
        // Only tick down if this is the active clock
        if (this.isActive) {
          this.displayTime = Math.max(0, this.storedTimeMs - elapsedMs);
        } else {
          // Inactive clock shows the stored time
          this.displayTime = this.storedTimeMs;
        }
      }

      // Check for expiration - only emit once
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
    if (ms <= 0) return '0:00.0';

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