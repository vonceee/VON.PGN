import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface StudyShortcutsHandlers {
  flipBoard: () => void;
  toggleEngine?: () => void;
  nextChapter: () => void;
  prevChapter: () => void;
  isEngineVisible?: () => boolean;
  canEdit: () => boolean;
  getCurrentNode: () => any;
  annotateMove: (node: any) => void;
  quickAnnotate: (node: any, glyphId: number) => void;
}

@Injectable()
export class StudyShortcutsService {
  private platformId = inject(PLATFORM_ID);
  private handlers: StudyShortcutsHandlers | null = null;
  private keydownListener = (event: KeyboardEvent) => this.handleKeyboardEvent(event);

  register(handlers: StudyShortcutsHandlers): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.handlers = handlers;
    window.addEventListener('keydown', this.keydownListener);
  }

  unregister(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('keydown', this.keydownListener);
    this.handlers = null;
  }

  private handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.handlers) return;

    // Ignore if typing in any input/textarea/editable
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const key = event.key;
    const keyLower = key.toLowerCase();

    // --- 1. Global Study Shortcuts (Available to everyone) ---

    // Flip Board
    if (keyLower === 'f') {
      event.preventDefault();
      this.handlers.flipBoard();
      return;
    }

    // Toggle Engine
    if (keyLower === 'l' && this.handlers.isEngineVisible && this.handlers.isEngineVisible()) {
      event.preventDefault();
      this.handlers.toggleEngine?.();
      return;
    }

    // Next / Previous Chapter
    if (event.shiftKey && key === 'ArrowRight') {
      event.preventDefault();
      this.handlers.nextChapter();
      return;
    }
    if (event.shiftKey && key === 'ArrowLeft') {
      event.preventDefault();
      this.handlers.prevChapter();
      return;
    }

    // --- 2. Editor Shortcuts (Require canEdit permissions) ---
    if (!this.handlers.canEdit()) return;

    const node = this.handlers.getCurrentNode();
    if (!node) return;
    
    // Handle Dialog opening (A or Enter)
    if (keyLower === 'a' || (key === 'Enter' && !event.shiftKey && !event.ctrlKey)) {
      event.preventDefault();
      this.handlers.annotateMove(node);
      return;
    }

    // Handle Quick Evaluations
    let glyphId: number | null = null;
    
    // Plain keys 1-8 for Move Evaluations
    if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
      const moveEvals: Record<string, number> = { 
        '1': 1,  // !
        '2': 2,  // ?
        '3': 3,  // !!
        '4': 4,  // ??
        '5': 5,  // !?
        '6': 6,  // ?!
        '7': 7,  // □
        '8': 22  // ⊙
      };
      if (moveEvals[key]) glyphId = moveEvals[key];
      else if (key === '0') glyphId = 0; // Clear all
    } 
    // Shift + 1-6 for Positional Evaluations
    else if (event.shiftKey && !event.ctrlKey && !event.altKey) {
       const posEvals: Record<string, number> = { 
         '1': 10, // =
         '2': 16, // ±
         '3': 17, // ∓
         '4': 18, // +-
         '5': 19, // -+
         '6': 13  // ∞
       };
       if (posEvals[key]) {
         glyphId = posEvals[key];
       }
     }

    if (glyphId !== null) {
      event.preventDefault();
      this.handlers.quickAnnotate(node, glyphId);
    }
  }
}
