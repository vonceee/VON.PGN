import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
  PLATFORM_ID,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Arena } from '../../../core/models/arena.model';
import { RouterModule } from '@angular/router';

interface Lane {
  arenas: Arena[];
}

@Component({
  selector: 'app-arena-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './arena-timeline.component.html',
  styles: [`
    :host {
      display: block;
    }

    .timeline-scroll-area {
      scrollbar-width: thin;
      scrollbar-color: var(--color-accent) transparent;
    }

    .timeline-scroll-area::-webkit-scrollbar {
      height: 6px;
    }

    .timeline-scroll-area::-webkit-scrollbar-track {
      background: transparent;
    }

    .timeline-scroll-area::-webkit-scrollbar-thumb {
      background-color: var(--color-accent);
      opacity: 0.2;
      border-radius: 20px;
    }

    /* Ensure lanes don't collapse */
    .relative.h-14 {
      min-height: 56px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArenaTimelineComponent implements OnInit, OnDestroy {
  arenas = input.required<Arena[]>();
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;

  private platformId = inject(PLATFORM_ID);
  private nowInterval: any;

  readonly SCALE = 10; // Pixels per minute
  readonly MINUTES_BEFORE = 60; // Start view 1 hour ago
  readonly MINUTES_AFTER = 600; // End view 10 hours from now

  now = signal(Date.now());
  
  startTime = computed(() => {
    const t = new Date(this.now());
    t.setSeconds(0);
    t.setMilliseconds(0);
    return t.getTime() - this.MINUTES_BEFORE * 60 * 1000;
  });

  stopTime = computed(() => {
    return this.startTime() + (this.MINUTES_BEFORE + this.MINUTES_AFTER) * 60 * 1000;
  });

  lanes = computed(() => {
    const sorted = [...this.arenas()].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const activeArenas = sorted.filter(a => {
      const start = new Date(a.start_date).getTime();
      const end = new Date(a.end_date).getTime();
      return end > this.startTime() && start < this.stopTime();
    });

    return this.calculateLanes(activeArenas);
  });

  timeMarkers = computed(() => {
    const markers = [];
    const start = new Date(this.startTime());
    start.setMinutes(Math.floor(start.getMinutes() / 30) * 30);
    
    let current = start.getTime();
    while (current < this.stopTime()) {
      markers.push({
        time: current,
        label: this.formatTime(current),
        isHour: new Date(current).getMinutes() === 0,
        left: this.leftPos(current)
      });
      current += 30 * 60 * 1000; // Every 30 minutes
    }
    return markers;
  });

  nowPosition = computed(() => this.leftPos(this.now()));

  constructor() {
    effect(() => {
      // Auto-scroll to "now" on first load
      const container = this.scrollContainer?.nativeElement;
      if (container && this.nowPosition()) {
         setTimeout(() => {
            const scrollPos = this.nowPosition() - (container.clientWidth / 3);
            container.scrollLeft = scrollPos;
         }, 100);
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.nowInterval = setInterval(() => {
        this.now.set(Date.now());
      }, 30000); // Update every 30 seconds
    }
  }

  ngOnDestroy() {
    if (this.nowInterval) {
      clearInterval(this.nowInterval);
    }
  }

  leftPos(time: number): number {
    const diffMins = (time - this.startTime()) / (60 * 1000);
    return diffMins * this.SCALE;
  }

  width(arena: Arena): number {
    const start = new Date(arena.start_date).getTime();
    const end = new Date(arena.end_date).getTime();
    const durationMins = (end - start) / (60 * 1000);
    return Math.max(durationMins * this.SCALE, 40); // Min width for visibility
  }

  getArenaColor(arena: Arena): string {
    const tc = arena.timeControl.toLowerCase();
    if (tc.includes('1+0') || tc.includes('1/2+0')) return 'var(--color-annotation-good)'; // Bullet (Green)
    if (tc.includes('3+0') || tc.includes('3+2')) return 'var(--color-annotation-interesting)'; // Blitz (Orange)
    if (tc.includes('5+0') || tc.includes('5+3')) return 'var(--color-annotation-bad)'; // Blitz/Rapid (Red)
    if (tc.includes('10+0')) return '#2196f3'; // Rapid (Blue - keeping as fallback if no semantic token for Blue)
    return '#607d8b'; // Other
  }

  getArenaIcon(arena: Arena): string {
    const tc = arena.timeControl.toLowerCase();
    if (tc.includes('1+0') || tc.includes('1/2+0')) return 'bullet';
    if (tc.includes('3+0') || tc.includes('3+2') || tc.includes('5+0')) return 'blitz';
    return 'rapid';
  }

  getArenaLeft(arena: Arena): number {
    return this.leftPos(new Date(arena.start_date).getTime());
  }

  getDynamicPadding(arena: Arena): number {
    const startPos = this.getArenaLeft(arena);
    const nowPos = this.nowPosition();
    const arenaWidth = this.width(arena);
    
    const diff = nowPos - startPos;
    if (diff > 0 && diff < arenaWidth - 120) {
      return diff;
    }
    return 12;
  }

  private calculateLanes(arenas: Arena[]): Lane[] {
    const result: Lane[] = [];
    
    arenas.forEach(arena => {
      let added = false;
      const arenaStart = new Date(arena.start_date).getTime();
      const arenaEnd = new Date(arena.end_date).getTime();

      for (const lane of result) {
        const hasOverlap = lane.arenas.some(a => {
          const aStart = new Date(a.start_date).getTime();
          const aEnd = new Date(a.end_date).getTime();
          // Add 5 min buffer to prevent blocks touching
          return !(arenaEnd + 5 * 60 * 1000 <= aStart || arenaStart >= aEnd + 5 * 60 * 1000);
        });

        if (!hasOverlap) {
          lane.arenas.push(arena);
          added = true;
          break;
        }
      }

      if (!added) {
        result.push({ arenas: [arena] });
      }
    });

    return result;
  }

  private formatTime(time: number): string {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
