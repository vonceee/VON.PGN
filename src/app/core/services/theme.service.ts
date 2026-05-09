import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  // Forced light mode state
  public isDarkMode = signal<boolean>(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initTheme();
  }

  private initTheme(): void {
    // Always ensure light mode on initialization
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }

  public toggleTheme(): void {
    // No-op to prevent theme switching
  }
}
