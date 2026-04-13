import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 [class]="sizeClasses()" class="leading-tight font-normal">
      {{ text() }} <span class="text-cyan-400">{{ highlight() }}</span>
    </h2>
  `,
})
export class SectionHeadingComponent {
  text = input.required<string>();
  highlight = input.required<string>();
  size = input<'sm' | 'md' | 'lg' | 'xl'>('xl');
  noMargin = input<boolean>(false);

  sizeClasses = computed(() => {
    const margin = this.noMargin() ? 'mb-0' : this.getMargin();
    return `${this.getTextSize()} ${margin}`;
  });

  private getMargin() {
    switch (this.size()) {
      case 'sm':
        return 'mb-2';
      case 'md':
        return 'mb-3';
      case 'lg':
        return 'mb-4';
      case 'xl':
      default:
        return 'mb-4 md:mb-6';
    }
  }

  private getTextSize() {
    switch (this.size()) {
      case 'sm':
        return 'text-xl';
      case 'md':
        return 'text-2xl';
      case 'lg':
        return 'text-3xl';
      case 'xl':
      default:
        return 'text-3xl md:text-5xl';
    }
  }
}
