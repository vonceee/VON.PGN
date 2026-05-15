import { inject, Injectable, signal, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private userService = inject(UserService);

  public isDarkMode = signal<boolean>(false);
  public isTransparent = signal<boolean>(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    effect(() => {
      const user = this.userService.currentUser();
      const prefs = user?.preferences;
      const theme = prefs?.theme || 'light';
      const bgImg = prefs?.backgroundImage;

      this.applyTheme(theme, bgImg);
    });
  }

  private applyTheme(theme: string, bgImg?: string): void {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-transparent');

    if (theme === 'dark') {
      root.classList.add('dark');
      this.isDarkMode.set(true);
      this.isTransparent.set(false);
    } else if (theme === 'transparent' && bgImg) {
      root.classList.add('theme-transparent');
      this.isDarkMode.set(false);
      this.isTransparent.set(true);
      this.applyBackgroundImage(bgImg);
    } else {
      this.isDarkMode.set(false);
      this.isTransparent.set(false);
      this.removeBackgroundImage();
    }
  }

  private applyBackgroundImage(url: string): void {
    let styleEl = document.getElementById('custom-background-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-background-css';
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      body::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        background-image: url("${url}");
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
      }
    `;
  }

  private removeBackgroundImage(): void {
    const styleEl = document.getElementById('custom-background-css');
    if (styleEl) {
      styleEl.remove();
    }
  }

  public toggleTheme(): void {
    // Basic toggle for now if needed, but usually handled via user preferences update
  }
}
