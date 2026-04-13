import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type ButtonVariant = 'outline' | 'primary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './button.component.html',
})
export class ButtonComponent {
  variant = input<ButtonVariant>('outline');
  size = input<ButtonSize>('md');
  showArrow = input(false);
  disabled = input(false);
  loading = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  link = input<string | null>(null);
  label = input<string>('');
  customRounded = input<string>('rounded-full');
  fullWidth = input(false);

  get sizeClasses(): string {
    switch (this.size()) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-6 py-2.5 text-md';
    }
  }

  get variantClasses(): string {
    const base = `group flex items-center justify-center gap-2 border ${this.customRounded()} font-bold transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${this.fullWidth() ? 'w-full' : ''}`;

    switch (this.variant()) {
      case 'primary':
        return `${base} bg-white text-black hover:bg-cyan-400`;
      case 'danger':
        return `${base} bg-transparent border-transparent text-red-600 hover:text-red-700 underline underline-offset-4 decoration-red-600/30 hover:decoration-red-700`;
      case 'ghost':
        return `${base} bg-transparent hover:text-cyan-400 hover:underline border-transparent`;
      default:
        return `${base} border-border-theme text-slate-900 dark:text-white hover:text-cyan-400 hover:border-cyan-400`;
    }
  }
}
