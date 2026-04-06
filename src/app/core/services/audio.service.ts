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

type SoundName = 'Move' | 'Capture' | 'Check' | 'Checkmate';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private platformId = inject(PLATFORM_ID);
  private cache: Map<string, HTMLAudioElement> = new Map();
  private voices: SpeechSynthesisVoice[] = [];
  private lastMatchFoundTime = 0;

  soundEnabled = signal<boolean>(true);
  soundTheme = signal<SoundTheme>('standard');
  ttsVolume = signal<number>(0.5);

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

    const savedTtsVolume = localStorage.getItem('tts_volume');
    if (savedTtsVolume !== null) {
      const parsed = parseFloat(savedTtsVolume);
      if (!isNaN(parsed)) {
        this.ttsVolume.set(Math.max(0, Math.min(1, parsed)));
      }
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

    effect(() => {
      if (!this.isBrowser) return;
      localStorage.setItem('tts_volume', String(this.ttsVolume()));
    });

    this.loadVoices();
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private loadVoices(): void {
    if (!this.isBrowser) return;

    const load = () => {
      this.voices = window.speechSynthesis.getVoices();
    };

    load();

    if (this.voices.length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', load, { once: true });
    }
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

  private speakWithTTS(text: string): void {
    if (!this.isBrowser || !this.soundEnabled()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = this.ttsVolume();

    const googleJapaneseVoice = this.voices.find(v => v.name === 'Google 日本語');
    const japaneseFemaleVoice = this.voices.find(
      v => v.lang.startsWith('ja') && v.name.toLowerCase().includes('female')
    );
    const japaneseVoice = this.voices.find(v => v.lang.startsWith('ja'));

    utterance.voice = googleJapaneseVoice || japaneseFemaleVoice || japaneseVoice || null;
    
    window.speechSynthesis.speak(utterance);
  }

  toggle(): void {
    this.soundEnabled.update((v) => !v);
  }

  setTheme(theme: SoundTheme): void {
    this.soundTheme.set(theme);
  }

  setTtsVolume(volume: number): void {
    this.ttsVolume.set(Math.max(0, Math.min(1, volume)));
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
    this.speakWithTTS('Victory');
  }

  playDefeat(): void {
    this.speakWithTTS('Defeat');
  }

  playDraw(): void {
    this.speakWithTTS('Draw');
  }

  playMatchFound(): void {
    const now = Date.now();
    if (now - this.lastMatchFoundTime < 3000) {
      return;
    }
    this.lastMatchFoundTime = now;
    this.speakWithTTS('Match Found');
  }
}
