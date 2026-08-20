import { Directive, ElementRef, inject, NgZone, ContentChild, AfterContentInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FloatingCursorComponent } from '../components/ui/floating-cursor/floating-cursor.component';

@Directive({
  selector: '[appFloatingCursorContainer]',
  standalone: true
})
export class FloatingCursorContainerDirective implements AfterContentInit, OnDestroy {
  private elementRef = inject(ElementRef<HTMLElement>);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    console.log('FloatingCursorContainerDirective constructor!');
  }

  @ContentChild(FloatingCursorComponent) contentCursor?: FloatingCursorComponent;

  private _registeredCursor?: FloatingCursorComponent;

  get cursorComponent(): FloatingCursorComponent | undefined {
    return this._registeredCursor || this.contentCursor;
  }

  registerCursor(cursor: FloatingCursorComponent) {
    this._registeredCursor = cursor;
  }

  private isHovering = false;
  private targetX = 0;
  private targetY = 0;
  private curX = 0;
  private curY = 0;
  private lastClientX = 0;
  private lastClientY = 0;
  private animationFrameId: number | null = null;
  private destroyListeners?: () => void;
  private hideTimeoutId: any = null;

  ngAfterContentInit() {
    if (!this.isBrowser) return;

    this.ngZone.runOutsideAngular(() => {
      const container = this.elementRef.nativeElement;

      const onMouseMove = (event: MouseEvent) => {
        this.lastClientX = event.clientX;
        this.lastClientY = event.clientY;
        const rect = container.getBoundingClientRect();
        this.targetX = event.clientX - rect.left;
        this.targetY = event.clientY - rect.top;
      };

      const onScroll = () => {
        const rect = container.getBoundingClientRect();
        this.targetX = this.lastClientX - rect.left;
        this.targetY = this.lastClientY - rect.top;
      };

      container.addEventListener('mousemove', onMouseMove);
      window.addEventListener('scroll', onScroll, { passive: true });

      this.destroyListeners = () => {
        container.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('scroll', onScroll);
      };
    });
  }

  show(text: string, icon: string | null) {
    if (!this.isBrowser) return;

    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }

    if (this.cursorComponent) {
      this.cursorComponent.show(text, icon);
    }

    this.isHovering = true;
    this.startAnimationLoop();
  }

  hide() {
    if (!this.isBrowser) return;

    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }

    this.hideTimeoutId = setTimeout(() => {
      this.hideTimeoutId = null;
      this.isHovering = false;
      if (this.cursorComponent) {
        this.cursorComponent.hide();
      }
      this.stopAnimationLoop();
    }, 50);
  }

  private startAnimationLoop() {
    if (this.animationFrameId) return;

    this.curX = this.targetX;
    this.curY = this.targetY;
    this.updateCursorDOM(this.curX, this.curY);

    const animate = () => {
      if (!this.isHovering) {
        this.animationFrameId = null;
        return;
      }

      this.curX += (this.targetX - this.curX) * 0.12;
      this.curY += (this.targetY - this.curY) * 0.12;

      this.updateCursorDOM(this.curX, this.curY);

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.ngZone.runOutsideAngular(() => {
      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  private stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateCursorDOM(x: number, y: number) {
    if (this.cursorComponent?.cursorElement) {
      const el = this.cursorComponent.cursorElement.nativeElement;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  }

  ngOnDestroy() {
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }
    this.destroyListeners?.();
    this.stopAnimationLoop();
  }
}
