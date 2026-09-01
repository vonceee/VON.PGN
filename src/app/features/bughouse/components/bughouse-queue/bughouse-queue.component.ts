import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BughouseQueueService } from '../../../../core/services/bughouse-queue.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowPath, heroXMark } from '@ng-icons/heroicons/outline';

/**
 * Floating persistent widget that displays the current matchmaking queue status.
 * Replaces the full-page blocking matchmaking screen.
 */
@Component({
  selector: 'app-bughouse-queue',
  standalone: true,
  imports: [CommonModule, NgIcon],
  providers: [
    provideIcons({
      heroArrowPath,
      heroXMark,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (queueService.isQueuing()) {
      <div
        class="fixed bottom-6 left-6 z-toast flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl transition-all duration-300 animate-slide-up hover:shadow-2xl max-w-sm"
      >
        <!-- Pulse radar/spinner -->
        <div
          class="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 shrink-0"
        >
          <ng-icon name="heroArrowPath" class="w-5 h-5 animate-spin"></ng-icon>
          <span
            class="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-25"
          ></span>
        </div>

        <!-- Text details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-slate-900 leading-tight">Searching for Match</h3>
            <span
              class="text-xs text-blue-600 font-mono font-medium px-2 py-0.5 rounded-md bg-blue-50/50"
            >
              {{ queueService.formattedTime() }}
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5 truncate leading-normal lowercase">
            {{ queueService.queueStatus() }}
          </p>
          @if (queueService.partner(); as p) {
            <p class="text-[10px] text-slate-400 mt-0.5 truncate">Team: You + {{ p.name }}</p>
          }
        </div>

        <!-- Cancel button -->
        <button
          (click)="queueService.cancelQueue()"
          class="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
          title="Cancel search"
        >
          <ng-icon name="heroXMark" class="w-4 h-4"></ng-icon>
        </button>
      </div>
    }
  `,
  styles: [
    `
      @keyframes slideUp {
        from {
          transform: translateY(1rem);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      .animate-slide-up {
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `,
  ],
})
export class BughouseQueueComponent {
  public queueService = inject(BughouseQueueService);
}
