import {
  Component,
  input,
  output,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AudioService } from '../../../../core/services/audio.service';

@Component({
  selector: 'app-chess-clock',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="font-semibold tabular-nums text-center"
      [class.text-red-500]="displayTime() < 20000"
      [class.text-cyan-400]="isActive() && displayTime() >= 20000"
      [ngClass]="sizeClasses()"
    >
      {{ displayString() }}
    </div>
  `,
  imports: [CommonModule]
})
export class ChessClockComponent implements OnDestroy {
  size = input<'sm' | 'md' | 'lg' | 'xl'>('xl');
  serverTimeMs = input<number>(0);
  serverTimestamp = input<string | null>(null);
  isActive = input<boolean>(false);
  expired = output<void>();
  displayTime = signal<number>(0);
  displayString = computed(() => this.formatTime(this.displayTime()));
  sizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-lg md:text-xl';
      case 'lg': return 'text-3xl';
      case 'xl':
      default: return 'text-5xl';
    }
  });

  private rafId: number | null = null;
  private running = false;
  private hasExpired = false;
  private hasWarnedLowTime = false;
  private audioService = inject(AudioService);
  private platformId = inject(PLATFORM_ID);

  private storedTimeMs = 0;
  private lastMoveTimestamp = 0;
  private offsetMs = 0;

  private static readonly LATENCY_BUFFER_MS = 100;

  constructor() {
    effect(() => {
      this.updateStoredValues(this.serverTimeMs(), this.serverTimestamp());
    });

    effect(() => {
      if (this.isActive()) {
        this.startTicking();
      } else {
        this.stopTicking();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTicking();
  }

  private updateStoredValues(timeMs: number, timestamp: string | null): void {
    this.storedTimeMs = timeMs;

    if (timestamp) {
      const parsed = Date.parse(timestamp);
      if (!isNaN(parsed)) {
        this.lastMoveTimestamp = parsed;

        const nowMs = Date.now();
        this.offsetMs = parsed - nowMs + ChessClockComponent.LATENCY_BUFFER_MS;
      } else {
        this.lastMoveTimestamp = 0;
        this.offsetMs = 0;
      }
    } else {
      this.lastMoveTimestamp = 0;
      this.offsetMs = 0;
    }

    this.displayTime.set(this.storedTimeMs);
    if (this.storedTimeMs > 20000) {
      this.hasWarnedLowTime = false;
    }
    this.hasExpired = false;
  }

  private startTicking(): void {
    if (this.running || !isPlatformBrowser(this.platformId)) return;
    this.running = true;

    const tick = () => {
      if (!this.running) return;

      const nowMs = Date.now();

      if (this.lastMoveTimestamp > 0 && this.storedTimeMs >= 0) {
        const calibratedNow = nowMs + this.offsetMs;
        const elapsedMs = Math.max(0, calibratedNow - this.lastMoveTimestamp);

        if (this.isActive()) {
          this.displayTime.set(Math.max(0, this.storedTimeMs - elapsedMs));
        } else {
          this.displayTime.set(this.storedTimeMs);
        }
      } else {
        this.displayTime.set(this.storedTimeMs);
      }

      if (this.displayTime() <= 20000 && this.displayTime() > 0 && !this.hasWarnedLowTime && this.isActive()) {
        this.hasWarnedLowTime = true;
        this.audioService.playLowTime();
      }

      if (this.displayTime() <= 0 && !this.hasExpired) {
        this.hasExpired = true;
        this.expired.emit();
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopTicking(): void {
    this.running = false;
    if (this.rafId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private formatTime(ms: number): string {
    if (ms < 0) return '-:--';
    if (ms === 0) return '0:00.0';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (ms < 20000) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
