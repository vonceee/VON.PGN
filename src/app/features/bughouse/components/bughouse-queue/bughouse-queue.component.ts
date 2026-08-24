import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bughouse-queue',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md mx-auto py-16 flex flex-col items-center justify-center text-center">
      <h2 class="text-2xl font-semibold mb-2">Searching...</h2>
      <p class="text-sm text-blue-600 font-mono mb-4">{{ queueTime() }}s</p>

      <div
        class="px-6 py-2 rounded-full bg-slate-200 border border-border-base text-xs font-semibold text-slate-800 mb-8 animate-pulse">
        {{ queueStatus() }}
      </div>

      <button class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white border border-border-base font-medium text-[16px] leading-5 hover:bg-slate-200 transition-all cursor-pointer"
        (click)="cancelQueue.emit()">
        Cancel Search
      </button>
    </div>
  `
})
export class BughouseQueueComponent {
  queueTime = input.required<number>();
  queueStatus = input.required<string>();
  cancelQueue = output<void>();
}
