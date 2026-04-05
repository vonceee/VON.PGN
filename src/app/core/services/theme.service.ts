import { inject, Injectable, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  // Use a signal to hold the dark mode state
  public isDarkMode = signal<boolean>(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initTheme();

    // Effect to persist to local storage and update the DOM class when the signal changes
    effect(() => {
      const dark = this.isDarkMode();
      localStorage.setItem('theme', dark ? 'dark' : 'light');

      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      this.isDarkMode.set(true);
    } else {
      this.isDarkMode.set(false);
    }
  }

  public toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
  }
}
