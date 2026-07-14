import { Component, Input, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-win-rate-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-full w-full rounded-sm overflow-hidden text-xs font-semibold text-white">
      <div 
        class="bg-subtle flex items-center justify-center  " 
        [style.width.%]="stats().white"
        [title]="stats().white + '% White wins'"
      >
        <span class="truncate px-1" *ngIf="stats().white > 15">{{ stats().white }}%</span>
      </div>
      <div 
        class="bg-subtle0 flex items-center justify-center   border-x border-black/5" 
        [style.width.%]="stats().draws"
        [title]="stats().draws + '% Draws'"
      >
        <span class="truncate px-1" *ngIf="stats().draws > 15">{{ stats().draws }}%</span>
      </div>
      <div 
        class="bg-content flex items-center justify-center  " 
        [style.width.%]="stats().black"
        [title]="stats().black + '% Black wins'"
      >
        <span class="truncate px-1" *ngIf="stats().black > 15">{{ stats().black }}%</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class WinRateBarComponent {
  white = input<number>(0);
  draws = input<number>(0);
  black = input<number>(0);

  stats = computed(() => {
    const w = this.white();
    const d = this.draws();
    const b = this.black();
    const total = w + d + b;

    if (total === 0) return { white: 33.3, draws: 33.4, black: 33.3 };

    return {
      white: Math.round((w / total) * 100),
      draws: Math.round((d / total) * 100),
      black: Math.round((b / total) * 100)
    };
  });
}
