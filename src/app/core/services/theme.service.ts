import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  public isDarkMode = signal<boolean>(false);
  public isTransparent = signal<boolean>(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.applyTheme();
  }

  private applyTheme(): void {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-transparent');
    this.isDarkMode.set(false);
    this.isTransparent.set(false);
    this.removeBackgroundImage();
  }

  private removeBackgroundImage(): void {
    const styleEl = document.getElementById('custom-background-css');
    if (styleEl) {
      styleEl.remove();
    }
  }

  public toggleTheme(): void {
    // Deprecated: Light Mode only
  }
}
