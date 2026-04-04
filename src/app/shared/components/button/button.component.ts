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
  type = input<'button' | 'submit' | 'reset'>('button');
  link = input<string | null>(null);
  label = input<string>('');

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
    const base = 'group flex items-center gap-2 border rounded-full font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

    switch (this.variant()) {
      case 'primary':
        return `${base} bg-cyan-500 hover:bg-cyan-600 text-slate-900 border-cyan-500`;
      case 'danger':
        return `${base} bg-red-500 hover:bg-red-600 text-white border-red-500`;
      case 'ghost':
        return `${base} bg-transparent hover:text-cyan-400 border-transparent`;
      default:
        return `${base} border-border-theme hover:text-cyan-400 hover:border-cyan-400`;
    }
  }
}
