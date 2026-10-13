import {
  Component,
  ChangeDetectionStrategy,
  output,
} from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowUp } from '@ng-icons/heroicons/outline';

/**
 * Floating quick scroll-to-top button.
 */
@Component({
  selector: 'app-scroll-scrubber',
  standalone: true,
  imports: [NgIconComponent],
  providers: [provideIcons({ heroArrowUp })],
  template: `
    <!-- Floating Circular Scroll to Top -->
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
  public readonly scrollToTop = output<void>();
}
