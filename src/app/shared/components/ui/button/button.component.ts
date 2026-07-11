import { Component, input, ElementRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'outline' | 'primary' | 'danger' | 'ghost';

@Component({
  selector: 'button[appButton], a[appButton]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  host: {
    '[class]': 'finalClasses()',
    '[class.pointer-events-none]': 'disabled() || loading()',
    '[class.opacity-50]': 'disabled() || loading()',
    '[attr.disabled]': 'isButton ? (disabled() || loading() ? true : null) : null',
    '[attr.type]': 'isButton ? type() : null',
  },
})
export class ButtonComponent {
  private el = inject(ElementRef);

  variant = input<ButtonVariant>('outline');
  disabled = input(false);
  loading = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  get isButton(): boolean {
    return this.el.nativeElement.tagName.toLowerCase() === 'button';
  }

  variantClasses = computed(() => {
    const base = `group flex items-center justify-center gap-2 px-5 py-2.5 text-md font-medium cursor-pointer`;

    switch (this.variant()) {
      case 'primary':
        return `${base} bg-content text-main rounded-full`;
      case 'danger':
        return `${base} bg-red-50 border-transparent rounded-full text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors`;
      case 'ghost':
        return `${base} bg-transparent hover:bg-accent/10 border-transparent text-muted`;
      default:
        return `${base} bg-surface rounded-full hover:bg-accent/10`;
    }
  });

  finalClasses = computed(() => {
    return this.variantClasses();
  });
}
