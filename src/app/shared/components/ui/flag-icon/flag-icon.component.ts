import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-flag-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (code()) {
      <img
        [src]="flagUrl()"
        [alt]="code()"
        [title]="countryName()"
        class="inline-block shadow-sm align-baseline opacity-90 hover:opacity-100"
        [class.h-3.5]="shape() === 'rectangle'"
        [class.w-auto]="shape() === 'rectangle'"
        [class.max-w-[20px]]="shape() === 'rectangle'"
        [class.rounded-[2px]]="shape() === 'rectangle'"
        [class.w-[22px]]="shape() === 'circle'"
        [class.h-[16px]]="shape() === 'circle'"
        [class.rounded-full]="shape() === 'circle'"
        [class.object-cover]="shape() === 'circle'"
        [class.border]="shape() === 'circle'"
        [class.border-border-base]="shape() === 'circle'"
        loading="lazy"
      />
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }
  `]
})
export class FlagIconComponent {
  countryCode = input<string | undefined | null>();
  shape = input<'rectangle' | 'circle'>('rectangle');

  code = computed(() => this.countryCode()?.toLowerCase() || null);

  flagUrl = computed(() => {
    const c = this.code();
    return c ? `https://flagcdn.com/w40/${c}.png` : '';
  });

  countryName = computed(() => {
    const c = this.code();
    if (!c) return '';
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      return regionNames.of(c.toUpperCase()) || c.toUpperCase();
    } catch (e) {
      return c.toUpperCase();
    }
  });
}
