import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseQueueService } from '../../../../core/services/bughouse-queue.service';

@Component({
  selector: 'app-bughouse-queue',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (queueService.isQueuing()) {
      <div
        class="fixed bottom-6 left-6 z-toast flex items-center p-2 rounded-3xl border border-slate-200 bg-white transition-all max-w-sm"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="text-md text-blue-600 font-medium px-2 py-0.5"
            >
              {{ queueService.formattedTime() }}
            </span>
          </div>
        </div>

        <button
          (click)="queueService.cancelQueue()"
          class="inline-flex items-center gap-2 p-2 rounded-full bg-transparent border border-transparent text-gray-500 hover:bg-blue-600/10 hover:text-slate-900 transition-colors font-medium text-[16px] leading-5 cursor-pointer"
          title="Cancel search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    }
  `,
})
export class BughouseQueueComponent {
  public queueService = inject(BughouseQueueService);
}
