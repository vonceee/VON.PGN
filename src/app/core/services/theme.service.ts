import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Use a signal to hold the dark mode state
  public isDarkMode = signal<boolean>(false);

  constructor() {
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

  private initTheme() {
    // Check local storage or system preference
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

  public toggleTheme() {
    this.isDarkMode.update((v) => !v);
  }
}
