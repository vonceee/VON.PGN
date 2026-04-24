import { Component, input, ElementRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type ButtonVariant = 'outline' | 'primary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'none';

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
  size = input<ButtonSize>('md');
  disabled = input(false);
  loading = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  get isButton(): boolean {
    return this.el.nativeElement.tagName.toLowerCase() === 'button';
  }

  sizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      case 'none':
        return '';
      default:
        return 'px-6 py-2.5 text-md';
    }
  });

  variantClasses = computed(() => {
    const base = `group flex items-center justify-center gap-2 border font-bold transition-all duration-300 cursor-pointer active:scale-[0.98]`;

    switch (this.variant()) {
      case 'primary':
        return `${base} bg-content text-main rounded-full border-transparent`;
      case 'danger':
        return `${base} bg-transparent border-transparent text-rose-500 hover:text-rose-600 underline underline-offset-4 decoration-rose-500/30 hover:decoration-rose-600`;
      case 'ghost':
        return `${base} bg-transparent hover:bg-accent/10 border-transparent text-muted hover:text-accent`;
      default:
        return `${base} border-border-base hover:text-accent hover:border-accent rounded-full text-content`;
    }
  });

  finalClasses = computed(() => {
    return `${this.variantClasses()} ${this.sizeClasses()}`;
  });
}
