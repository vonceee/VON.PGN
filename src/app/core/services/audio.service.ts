import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SoundTheme = 'standard' | 'futuristic' | 'lisp' | 'nes' | 'piano' | 'sfx' | 'woodland';

export const SOUND_THEMES: { value: SoundTheme; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'futuristic', label: 'Futuristic' },
  { value: 'lisp', label: 'Lisp' },
  { value: 'nes', label: 'NES' },
  { value: 'piano', label: 'Piano' },
  { value: 'sfx', label: 'SFX' },
  { value: 'woodland', label: 'Woodland' },
];

type SoundName = 'Move' | 'Capture' | 'Check' | 'Checkmate' | 'Victory' | 'Defeat' | 'Draw' | 'MatchFound';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private platformId = inject(PLATFORM_ID);
  private cache: Map<string, HTMLAudioElement> = new Map();

  soundEnabled = signal<boolean>(true);
  soundTheme = signal<SoundTheme>('standard');

  constructor() {
    if (!this.isBrowser) return;

    const savedEnabled = localStorage.getItem('sound_enabled');
    if (savedEnabled !== null) {
      this.soundEnabled.set(savedEnabled === 'true');
    }

    const savedTheme = localStorage.getItem('sound_theme') as SoundTheme | null;
    if (savedTheme && SOUND_THEMES.some((t) => t.value === savedTheme)) {
      this.soundTheme.set(savedTheme);
    }

    effect(() => {
      if (!this.isBrowser) return;
      localStorage.setItem('sound_enabled', String(this.soundEnabled()));
    });

    effect(() => {
      if (!this.isBrowser) return;
      localStorage.setItem('sound_theme', this.soundTheme());
      this.cache.clear();
    });
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getAudio(name: SoundName): HTMLAudioElement | null {
    if (!this.isBrowser) return null;

    const theme = this.soundTheme();
    const key = `${theme}/${name}`;

    if (!this.cache.has(key)) {
      const audio = new Audio(`/sounds/${theme}/${name}.mp3`);
      audio.preload = 'auto';
      audio.volume = 0.5;
      this.cache.set(key, audio);
    }

    return this.cache.get(key)!;
  }

  private play(name: SoundName): void {
    if (!this.isBrowser || !this.soundEnabled()) return;

    try {
      const audio = this.getAudio(name);
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Autoplay may be blocked by browser policy
      });
    } catch {
      // Audio may not be available
    }
  }

  toggle(): void {
    this.soundEnabled.update((v) => !v);
  }

  setTheme(theme: SoundTheme): void {
    this.soundTheme.set(theme);
  }

  playMove(): void {
    this.play('Move');
  }

  playCapture(): void {
    this.play('Capture');
  }

  playMoveSound(san: string): void {
    if (san.includes('x')) {
      this.playCapture();
    } else {
      this.playMove();
    }
  }

  playCheck(): void {
    this.play('Check');
  }

  playCheckmate(): void {
    this.play('Checkmate');
  }

  playVictory(): void {
    this.play('Victory');
  }

  playDefeat(): void {
    this.play('Defeat');
  }

  playDraw(): void {
    this.play('Draw');
  }

  playMatchFound(): void {
    this.play('MatchFound');
  }
}
