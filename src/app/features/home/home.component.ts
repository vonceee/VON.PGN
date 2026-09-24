import {
  Component,
  inject,
  OnInit,
  signal,
  OnDestroy,
  PLATFORM_ID,
  viewChild,
  ElementRef,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PresenceService } from '../../core/services/presence.service';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

// Modular Child Components
import { ScrollScrubberComponent } from './components/scroll-scrubber/scroll-scrubber.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { ToolkitGridComponent } from './components/toolkit-grid/toolkit-grid.component';
import { SplitTextBannerComponent } from './components/split-text-banner/split-text-banner.component';
import { InteractiveTimelineComponent } from './components/interactive-timeline/interactive-timeline.component';
import { EngineSparringShowcaseComponent } from './components/engine-sparring-showcase/engine-sparring-showcase.component';
import { MasteryRoadmapComponent } from './components/mastery-roadmap/mastery-roadmap.component';
import { BroadcastShowcaseComponent } from './components/broadcast-showcase/broadcast-showcase.component';
import { AsymmetricGalleryComponent } from './components/asymmetric-gallery/asymmetric-gallery.component';
import { StorytellingPillarsComponent } from './components/storytelling-pillars/storytelling-pillars.component';
import { CommunityPulseComponent } from './components/community-pulse/community-pulse.component';
import { CommunityCtaComponent } from './components/community-cta/community-cta.component';

import type Lenis from 'lenis';
import type { gsap as GsapType } from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

/**
 * Modernized Landing Page Component for VON.CHESS.
 *
 * ARCHITECTURE & MODULARITY:
 * - Decomposed into clean standalone child components: HeroSection, ToolkitGrid, SplitTextBanner,
 *   InteractiveTimeline, EngineSparringShowcase, MasteryRoadmap, BroadcastShowcase, AsymmetricGallery,
 *   StorytellingPillars, CommunityPulse, CommunityCta, and ScrollScrubber.
 * - Master orchestrator for Lenis smooth scrolling, GSAP ScrollTrigger timelines, and velocity inertia.
 *
 * PERFORMANCE & SSR SAFETY:
 * - Lenis, GSAP, and Three.js are dynamically imported strictly in browser context.
 * - Outside-zone execution (`NgZone.runOutsideAngular`) eliminates change detection churn.
 * - Full teardown with `gsapContext.revert()` and `lenis.destroy()` on destruction.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
    ScrollScrubberComponent,
    HeroSectionComponent,
    ToolkitGridComponent,
    SplitTextBannerComponent,
    InteractiveTimelineComponent,
    EngineSparringShowcaseComponent,
    MasteryRoadmapComponent,
    BroadcastShowcaseComponent,
    AsymmetricGalleryComponent,
    StorytellingPillarsComponent,
    CommunityPulseComponent,
    CommunityCtaComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  public readonly presenceService = inject(PresenceService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef);

  // Modular Component Child References
  public readonly interactiveTimeline = viewChild(InteractiveTimelineComponent);

  /** Real-time scroll percentage (0 to 100) for progress indicators */
  public readonly scrollPercent = signal<number>(0);


  // Animation instances
  private lenis?: Lenis;
  private gsapInstance?: typeof GsapType;
  private scrollTriggerClass?: typeof ScrollTriggerType;
  private tickerCallback?: (time: number) => void;
  private gsapContext?: any;

  ngOnInit(): void {
    this.presenceService.subscribeToSiteStats();

    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(async () => {
        const [{ default: LenisModule }, { gsap: gsapModule }, { ScrollTrigger: scrollTriggerModule }] =
          await Promise.all([
            import('lenis'),
            import('gsap'),
            import('gsap/ScrollTrigger'),
          ]);

        this.gsapInstance = gsapModule;
        this.scrollTriggerClass = scrollTriggerModule;

        this.initAnimations(LenisModule, gsapModule, scrollTriggerModule);
      });
    }
  }

  ngOnDestroy(): void {
    this.presenceService.unsubscribeFromSiteStats();

    if (isPlatformBrowser(this.platformId)) {
      // 1. Revert GSAP Context and kill triggers
      if (this.gsapContext) {
        this.gsapContext.revert();
        this.gsapContext = undefined;
      }

      // 2. Remove ticker
      if (this.tickerCallback && this.gsapInstance) {
        this.gsapInstance.ticker.remove(this.tickerCallback);
      }

      if (this.scrollTriggerClass) {
        this.scrollTriggerClass.clearMatchMedia();
      }

      // 3. Destroy Lenis
      if (this.lenis) {
        this.lenis.destroy();
        this.lenis = undefined;
      }
    }
  }

  /**
   * Programmatic smooth scrolling with curated Lenis easing curves.
   */
  public scrollToSection(targetSelector: string): void {
    if (this.lenis) {
      this.lenis.scrollTo(targetSelector, {
        offset: -40,
        duration: 1.6,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      const el = document.querySelector(targetSelector);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Refreshes ScrollTrigger layout when category tabs are toggled.
   */
  public onCategoryChanged(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.scrollTriggerClass?.refresh();
      }, 60);
    }
  }

  /**
   * Sets up Lenis smooth scrolling, velocity skewing, and GSAP ScrollTrigger timelines.
   */
  private initAnimations(
    LenisConstructor: typeof Lenis,
    gsap: typeof GsapType,
    ScrollTrigger: typeof ScrollTriggerType,
  ): void {
    gsap.registerPlugin(ScrollTrigger);

    const mainEl = document.querySelector('main');
    const scrollContainer = mainEl && mainEl.scrollHeight > mainEl.clientHeight ? mainEl : window;

    // 1. Initialize Lenis Smooth Scrolling
    if (scrollContainer instanceof HTMLElement) {
      this.lenis = new LenisConstructor({
        wrapper: scrollContainer,
        content: (scrollContainer.firstElementChild as HTMLElement) || scrollContainer,
        smoothWheel: true,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      this.lenis = new LenisConstructor({
        smoothWheel: true,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    }

    // 2. Map real-time scroll velocity to card skew and progress updates
    this.lenis.on('scroll', (e: any) => {
      ScrollTrigger.update();

      const velocity = e.velocity || 0;
      this.handleVelocitySkew(velocity, gsap);

      const progress = e.progress !== undefined ? e.progress : 0;
      this.scrollPercent.set(Math.round(progress * 100));
    });

    // 3. RAF Ticker
    this.tickerCallback = (time: number) => {
      this.lenis?.raf(time * 1000);
    };
    gsap.ticker.add(this.tickerCallback);
    gsap.ticker.lagSmoothing(0);

    if (scrollContainer instanceof HTMLElement) {
      ScrollTrigger.defaults({ scroller: scrollContainer });
    }

    // 4. Scoped GSAP Context for memory management
    this.gsapContext = gsap.context(() => {
      const scrollerOption = scrollContainer === window ? undefined : scrollContainer;

      // ANIMATION 1: Text Split Scrub Reveal (Subheading words shift from 15% to 100% opacity)
      const splitEl = document.querySelector('.split-text-container');
      if (splitEl) {
        const words = splitEl.querySelectorAll('.split-word');
        if (words.length > 0) {
          gsap.fromTo(
            words,
            { opacity: 0.15, y: 4 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.05,
              ease: 'none',
              scrollTrigger: {
                trigger: splitEl,
                scroller: scrollerOption,
                start: 'top 80%',
                end: 'bottom 45%',
                scrub: 0.6,
              },
            },
          );
        }
      }

      // ANIMATION 2: Dual-Direction Asymmetric Columns Gallery
      const gallery = document.querySelector('.asymmetric-gallery-section');
      if (gallery) {
        const colLeft = gallery.querySelector('.gallery-col-left');
        const colRight = gallery.querySelector('.gallery-col-right');

        if (colLeft && colRight) {
          // Left column drifts upward smoothly
          gsap.fromTo(
            colLeft,
            { y: 60 },
            {
              y: -80,
              ease: 'none',
              scrollTrigger: {
                trigger: gallery,
                scroller: scrollerOption,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            },
          );

          // Right column drifts in reverse / asymmetric speed
          gsap.fromTo(
            colRight,
            { y: -60 },
            {
              y: 80,
              ease: 'none',
              scrollTrigger: {
                trigger: gallery,
                scroller: scrollerOption,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            },
          );
        }
      }

      // ANIMATION 3: Interactive Combination Timeline Scrub
      const timelineSection = document.querySelector('.interactive-timeline-section');
      if (timelineSection) {
        ScrollTrigger.create({
          trigger: timelineSection,
          scroller: scrollerOption,
          start: 'top 70%',
          end: 'bottom 30%',
          onUpdate: (self) => {
            this.interactiveTimeline()?.setTimelineProgress(self.progress);
          },
        });
      }

      // ANIMATION 4: Multi-Layer Parallax Elements (data-speed)
      const parallaxElements = document.querySelectorAll<HTMLElement>('[data-speed]');
      parallaxElements.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-speed') || '1');
        const yDist = (1 - speed) * 120;

        gsap.to(el, {
          y: yDist,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            scroller: scrollerOption,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
    }, this.elementRef.nativeElement);
  }

  /**
   * Applies physical inertia skew to cards based on real-time Lenis scroll velocity.
   */
  private handleVelocitySkew(velocity: number, gsap: typeof GsapType): void {
    if (Math.abs(velocity) < 0.25) return;
    const clampedSkew = Math.max(-3.5, Math.min(3.5, velocity * 0.035));

    // Skew elements smoothly
    gsap.to('.skew-on-scroll', {
      skewY: clampedSkew,
      duration: 0.2,
      ease: 'power1.out',
      overwrite: 'auto',
    });

    // Inertial snap back to 0
    gsap.to('.skew-on-scroll', {
      skewY: 0,
      duration: 0.6,
      delay: 0.1,
      ease: 'power2.out',
      overwrite: false,
    });
  }
}
