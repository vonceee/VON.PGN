import {
  Component,
  Input,
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
      class="clock-container"
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
      background: rgb(30 41 59);
      border: 2px solid transparent;
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
      color: rgb(148 163 184);
    }
    .clock-time {
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: rgb(226 232 240);
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    @keyframes pulse-critical {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
})
export class ChessClockComponent implements OnChanges, OnDestroy {
  @Input() serverTimeMs: number = 0;
  @Input() serverTimestamp: string = '';
  @Input() isActive: boolean = false;
  @Input() label: string = '';

  displayTime: number = 0;

  private rafId: number | null = null;
  private running = false;
  private lastTickTime: number = 0;

  // Track the last server value we actually used so we can detect real changes
  private lastAppliedServerTime: number = -1;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // When server sends a new time value, snap displayTime to it
    if (changes['serverTimeMs']) {
      const newVal = changes['serverTimeMs'].currentValue;
      const oldVal = changes['serverTimeMs'].previousValue;

      // Only snap if the value actually changed (not just Angular re-checking)
      if (newVal !== this.lastAppliedServerTime && newVal > 0) {
        this.displayTime = newVal;
        this.lastAppliedServerTime = newVal;
        this.lastTickTime = performance.now();
      }
    }

    // Start/stop the tick loop when isActive changes
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

  private startTicking(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickTime = performance.now();

    const tick = (now: number) => {
      if (!this.running) return;

      const delta = now - this.lastTickTime;
      this.lastTickTime = now;

      // Only decrement by the real frame delta, clamped to avoid huge jumps
      if (delta > 0 && delta < 1000) {
        this.displayTime = Math.max(0, this.displayTime - delta);
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
