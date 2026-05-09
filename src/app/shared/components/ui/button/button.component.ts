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
    const base = `group flex items-center justify-center gap-2 border px-5 py-2.5 text-sm    cursor-pointer`;

    switch (this.variant()) {
      case 'primary':
        return `${base} bg-content text-main rounded-full border-transparent`;
      case 'danger':
        return `${base} bg-transparent border-transparent text-rose-500 hover:text-rose-600 underline underline-offset-4 decoration-rose-500/30 hover:decoration-rose-600`;
      case 'ghost':
        return `${base} bg-transparent hover:bg-accent/10 border-transparent text-muted hover:text-accent`;
      default:
        return `${base} bg-subtle/50 border-border-base hover:text-accent hover:border-accent rounded-full text-content`;
    }
  });

  finalClasses = computed(() => {
    return this.variantClasses();
  });
}
