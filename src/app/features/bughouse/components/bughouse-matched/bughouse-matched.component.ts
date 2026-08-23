import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bughouse-matched',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center text-center">
      <h2 class="text-3xl font-extrabold mb-8 uppercase tracking-wider">Match Found</h2>

      <div class="grid grid-cols-5 items-center justify-center w-full gap-4 mb-12">
        <!-- Team A (Left) -->
        <div class="col-span-2 flex flex-col items-end gap-3">
          <div class="text-right">
            <span class="text-lg font-bold block">{{ currentUserProfile().name }}</span>
          </div>
          <div class="text-right">
            <span class="text-lg font-bold block">{{ partner()?.name }}</span>
          </div>
          <span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] uppercase font-bold rounded">Team A</span>
        </div>

        <!-- VS (Center) -->
        <div class="col-span-1 flex flex-col items-center justify-center">
          <div
            class="w-14 h-14 rounded-full bg-slate-900 border-4 border-white text-white font-extrabold flex items-center justify-center text-lg tracking-normal">
            VS
          </div>
        </div>

        <!-- Team B (Right) -->
        <div class="col-span-2 flex flex-col items-start gap-3">
          <div class="text-left">
            <span class="text-lg font-bold block">{{ opponent1()?.name }}</span>
          </div>
          <div class="text-left">
            <span class="text-lg font-bold block">{{ opponent2()?.name }}</span>
          </div>
          <span class="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] uppercase font-bold rounded">Team B</span>
        </div>
      </div>

      <!-- Countdown ring -->
      <div class="relative flex items-center justify-center w-28 h-28 mb-4">
        <svg class="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r="48" stroke="#e2e8f0" stroke-width="8" fill="transparent" />
          <circle cx="56" cy="56" r="48" stroke-width="8" fill="transparent" [attr.stroke-dasharray]="301.6"
            [attr.stroke-dashoffset]="(5 - matchCountdown()) / 5 * 301.6" class="transition-all duration-1000" />
        </svg>
        <span class="absolute text-3xl font-extrabold">{{ matchCountdown() }}</span>
      </div>
      <p class="text-sm font-semibold text-gray-500">Ready up! Match is starting...</p>
    </div>
  `
})
export class BughouseMatchedComponent {
  currentUserProfile = input.required<{ name: string }>();
  partner = input<any | null>(null);
  opponent1 = input<any | null>(null);
  opponent2 = input<any | null>(null);
  matchCountdown = input.required<number>();
}
