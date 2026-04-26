import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SoundTheme = 'standard';

export const SOUND_THEMES: { value: SoundTheme; label: string }[] = [
  { value: 'standard', label: 'Standard' },
];

type SoundName =
  | 'Move'
  | 'Capture'
  | 'Check'
  | 'GenericNotify'
  | 'LowTime';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private platformId = inject(PLATFORM_ID);
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private voices: SpeechSynthesisVoice[] = [];
  private lastMatchFoundTime = 0;

  soundEnabled = signal<boolean>(true);
  soundTheme = signal<SoundTheme>('standard');
  sfxVolume = signal<number>(0.5);
  ttsVolume = signal<number>(0.5);
  private failedAssets = new Set<string>();

  constructor() {
    if (!this.isBrowser) return;

    this.initAudioContext();
    this.loadSettings();

    effect(() => {
      if (!this.isBrowser) return;
      this.safeSave('sound_enabled', String(this.soundEnabled()));
    });

    effect(() => {
      if (!this.isBrowser) return;
      this.safeSave('sound_theme', 'standard');
      this.buffers.clear();
      this.failedAssets.clear();
    });

    effect(() => {
      if (!this.isBrowser) return;
      this.safeSave('sfx_volume', String(this.sfxVolume()));
    });

    effect(() => {
      if (!this.isBrowser) return;
      this.safeSave('tts_volume', String(this.ttsVolume()));
    });

    this.loadVoices();
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private initAudioContext(): void {
    if (this.context || !this.isBrowser) return;
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  private loadSettings(): void {
    const savedEnabled = localStorage.getItem('sound_enabled');
    if (savedEnabled !== null) {
      this.soundEnabled.set(savedEnabled === 'true');
    }

    this.soundTheme.set('standard');

    const savedSfxVolume = localStorage.getItem('sfx_volume');
    if (savedSfxVolume !== null) {
      const parsed = parseFloat(savedSfxVolume);
      if (!isNaN(parsed)) this.sfxVolume.set(Math.max(0, Math.min(1, parsed)));
    }

    const savedTtsVolume = localStorage.getItem('tts_volume');
    if (savedTtsVolume !== null) {
      const parsed = parseFloat(savedTtsVolume);
      if (!isNaN(parsed)) this.ttsVolume.set(Math.max(0, Math.min(1, parsed)));
    }
  }

  private safeSave(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Could not save setting ${key} to localStorage`, e);
    }
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

  private async getBuffer(name: SoundName): Promise<AudioBuffer | null> {
    if (!this.context || !this.isBrowser) return null;

    const theme = this.soundTheme();
    const key = `${theme}/${name}`;

    if (this.buffers.has(key)) {
      return this.buffers.get(key)!;
    }

    if (this.failedAssets.has(key)) {
      return null;
    }

    try {
      const response = await fetch(`/sounds/${theme}/${name}.mp3`);
      if (!response.ok) {
        this.failedAssets.add(key);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
      return audioBuffer;
    } catch (e) {
      this.failedAssets.add(key);
      return null;
    }
  }

  private async play(name: SoundName): Promise<void> {
    if (!this.context || !this.isBrowser || !this.soundEnabled()) return;

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const buffer = await this.getBuffer(name);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.context.createGain();
    gainNode.gain.value = this.sfxVolume();

    source.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start(0);
  }

  private speakWithTTS(text: string): void {
    if (!this.isBrowser || !this.soundEnabled()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.ttsVolume();
    utterance.lang = 'en-US';

    const preferredVoice = this.voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) 
                        || this.voices.find(v => v.lang.startsWith('en'));
    
    utterance.voice = preferredVoice || null;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Intelligently plays the correct sound for a chess move.
   */
  async playChessMove(move: { san: string; flags: string }): Promise<void> {
    if (move.san.includes('#')) {
      await this.playBoardEnd();
    } else if (move.san.includes('+')) {
      await this.play('Check');
    } else if (move.flags.includes('c') || move.flags.includes('e')) {
      await this.play('Capture');
    } else {
      await this.play('Move');
    }
  }

  playBoardStart(): void {
    this.play('GenericNotify');
  }

  playBoardEnd(): void {
    this.play('GenericNotify');
  }

  playLowTime(): void {
    this.play('LowTime');
  }

  playMatchFound(): void {
    const now = Date.now();
    if (now - this.lastMatchFoundTime < 3000) return;
    this.lastMatchFoundTime = now;
    this.playBoardStart();
    this.speakWithTTS('Match Found');
  }

  playNotification(): void {
    this.play('GenericNotify');
  }

  toggle(): void {
    this.soundEnabled.update((v) => !v);
  }

  setTheme(theme: SoundTheme): void {
    this.soundTheme.set('standard');
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume.set(Math.max(0, Math.min(1, volume)));
  }

  setTtsVolume(volume: number): void {
    this.ttsVolume.set(Math.max(0, Math.min(1, volume)));
  }

  /**
   * Simple move sound playback based on SAN string.
   */
  playMoveSound(san: string): void {
    if (san.includes('#')) this.playBoardEnd();
    else if (san.includes('+')) this.play('Check');
    else if (san.includes('x')) this.play('Capture');
    else this.play('Move');
  }
}
