import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowUp } from '@ng-icons/heroicons/outline';

/**
 * Scroll progress indicator and quick scroll-to-top scrubber.
 */
@Component({
  selector: 'app-scroll-scrubber',
  standalone: true,
  imports: [NgIconComponent],
  providers: [provideIcons({ heroArrowUp })],
  template: `
    <!-- Slim Scroll-Bound Top Progress Line -->
    <div
      class="fixed top-0 left-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 z-50 pointer-events-none transition-all duration-75 ease-out"
      [style.width.%]="scrollPercent()">
    </div>

    <!-- Floating Circular Scroll Progress Scrubber & Scroll to Top -->
    <div class="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <button
        type="button"
        (click)="scrollToTop.emit()"
        aria-label="Scroll to top"
        class="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 hover:text-blue-600 hover:border-blue-300 active:scale-95 transition-all cursor-pointer">
        <ng-icon name="heroArrowUp" size="1.1rem"></ng-icon>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollScrubberComponent {
  public readonly scrollPercent = input<number>(0);
  public readonly scrollToTop = output<void>();
}
