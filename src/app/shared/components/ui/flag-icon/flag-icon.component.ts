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
        class="inline-block h-3.5 w-auto max-w-[20px] rounded-[2px] shadow-sm align-baseline opacity-90 hover:opacity-100 "
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
