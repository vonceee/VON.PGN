import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Text split reveal section driven by GSAP ScrollTrigger scrub.
 * Subheading words shift from 15% to 100% opacity as the user scrolls.
 */
@Component({
  selector: 'app-split-text-banner',
  standalone: true,
  template: `
    <section class="split-text-section py-10 md:py-16">
      <div class="split-text-container max-w-4xl relative">
        <p class="font-mono text-[11px] sm:text-xs text-slate-400 select-none mb-3">text-4xl text-slate-950 tracking-tight font-medium text-balance</p>

        <p class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-slate-950 leading-snug">
          <span class="split-word inline-block mr-2.5">Engineered</span>
          <span class="split-word inline-block mr-2.5">for</span>
          <span class="split-word inline-block mr-2.5 text-blue-600 font-normal">deliberate</span>
          <span class="split-word inline-block mr-2.5 text-blue-600 font-normal">practice.</span>
          <span class="split-word inline-block mr-2.5">We</span>
          <span class="split-word inline-block mr-2.5">build</span>
          <span class="split-word inline-block mr-2.5">functional</span>
          <span class="split-word inline-block mr-2.5">chess</span>
          <span class="split-word inline-block mr-2.5">tools—all</span>
          <span class="split-word inline-block mr-2.5">unified</span>
          <span class="split-word inline-block mr-2.5">into</span>
          <span class="split-word inline-block mr-2.5">one</span>
          <span class="split-word inline-block mr-2.5">canvas.</span>
          <span class="split-word inline-block mr-2.5">No</span>
          <span class="split-word inline-block mr-2.5">gimmicks.</span>
          <span class="split-word inline-block mr-2.5">just</span>
          <span class="split-word inline-block mr-2.5">training</span>
          <span class="split-word inline-block mr-2.5">that</span>
          <span class="split-word inline-block mr-2.5">translates</span>
          <span class="split-word inline-block mr-2.5">to</span>
          <span class="split-word inline-block mr-2.5">the</span>
          <span class="split-word inline-block mr-2.5">board.</span>
        </p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitTextBannerComponent {}
