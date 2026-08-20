import { Directive, Input, HostListener, inject } from '@angular/core';
import { FloatingCursorContainerDirective } from './floating-cursor-container.directive';

@Directive({
  selector: '[appFloatingCursorTrigger]',
  standalone: true
})
export class FloatingCursorTriggerDirective {
  private container = inject(FloatingCursorContainerDirective, { optional: true });

  @Input('appFloatingCursorTrigger') cursorText: string | null | undefined = '';
  @Input() cursorIcon: string | null = null;

  @HostListener('mouseenter')
  onMouseEnter() {
    if (this.container) {
      this.container.show(this.cursorText || '', this.cursorIcon);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.container) {
      this.container.hide();
    }
  }
}
