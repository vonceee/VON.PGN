import { Component, ElementRef, ViewChild, signal, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlay } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-ui-cursor',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroPlay
    })
  ],
  templateUrl: './ui-cursor.component.html',
})
export class UiCursorComponent implements OnDestroy {
  @ViewChild('demoContainer') demoContainerRef!: ElementRef<HTMLElement>;

  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  // Floating Cursor Signals
  isHoveringCard = signal(false);
  cursorX = signal(0);
  cursorY = signal(0);

  // Internal animation state
  private cursorAnimationFrameId: number | null = null;
  private targetX = 0;
  private targetY = 0;

  /**
   * Handles the mouse entering the demo container to start cursor loop.
   * 
   * // CRITICAL: Wrap in browser platform check to avoid SSR exceptions.
   */
  onCardMouseEnter(event: MouseEvent) {
    if (!this.isBrowser || !this.demoContainerRef) return;
    const container = this.demoContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.targetX = event.clientX - rect.left;
    this.targetY = event.clientY - rect.top;

    this.isHoveringCard.set(true);
    this.startCursorAnimation();
  }

  /**
   * Handles the mouse leaving the hover area to stop recursive loops.
   */
  onCardMouseLeave() {
    this.isHoveringCard.set(false);
    this.stopCursorAnimation();
  }

  /**
   * Updates target positions relative to container bounds.
   */
  onCardMouseMove(event: MouseEvent) {
    if (!this.isBrowser || !this.demoContainerRef) return;
    const container = this.demoContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.targetX = event.clientX - rect.left;
    this.targetY = event.clientY - rect.top;
  }

  /**
   * Recurse position updates frame-by-frame with linear interpolation (Lerp).
   * 
   * // TRADEOFF: Lerping interpolation factor of 0.12 provides smooth delay vs responsive tracking.
   * // CRITICAL: Protects against multiple active frame schedules.
   */
  private startCursorAnimation() {
    if (!this.isBrowser) return;
    if (this.cursorAnimationFrameId) return;

    this.cursorX.set(this.targetX);
    this.cursorY.set(this.targetY);

    const animateCursor = () => {
      if (!this.isHoveringCard()) {
        this.cursorAnimationFrameId = null;
        return;
      }

      const curX = this.cursorX();
      const curY = this.cursorY();

      const nextX = curX + (this.targetX - curX) * 0.12;
      const nextY = curY + (this.targetY - curY) * 0.12;

      this.cursorX.set(nextX);
      this.cursorY.set(nextY);

      this.cursorAnimationFrameId = requestAnimationFrame(animateCursor);
    };

    this.cursorAnimationFrameId = requestAnimationFrame(animateCursor);
  }

  /**
   * Safe animation loop halt utility.
   */
  private stopCursorAnimation() {
    if (this.cursorAnimationFrameId) {
      cancelAnimationFrame(this.cursorAnimationFrameId);
      this.cursorAnimationFrameId = null;
    }
  }

  ngOnDestroy() {
    this.stopCursorAnimation();
  }
}
