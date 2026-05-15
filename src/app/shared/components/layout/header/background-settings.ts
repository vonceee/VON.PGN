import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroLink } from '@ng-icons/heroicons/outline';
import { debounceTime, Subject } from 'rxjs';

const PRESET_BACKGROUNDS = [
  { 
    id: 'marble', 
    title: 'Dark Marble', 
    url: 'https://images.unsplash.com/photo-1517148815978-75f6acaaf327?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'forest', 
    title: 'Deep Forest', 
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'space', 
    title: 'Starry Night', 
    url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'chess', 
    title: 'Grandmaster', 
    url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'abstract', 
    title: 'Ocean Waves', 
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop' 
  },
  { 
    id: 'minimal', 
    title: 'Clean Studio', 
    url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1000&auto=format&fit=crop' 
  }
];

@Component({
  selector: 'app-background-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [
    provideIcons({ heroXMark, heroLink })
  ],
  template: `
    <div class="space-y-8">
      <!-- Ready-to-use Gallery -->
      <div>
        <label class="block text-sm font-semibold text-content mb-4">Ready-to-use</label>
        <div class="grid grid-cols-2 gap-3">
          @for (bg of presets; track bg.id) {
            <button 
              (click)="selectPreset(bg.url)"
              class="group relative aspect-video rounded-xl overflow-hidden border-2 transition-all"
              [class.border-accent]="url() === bg.url"
              [class.border-transparent]="url() !== bg.url"
            >
              <img [src]="bg.url" [alt]="bg.title" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              <div class="absolute bottom-2 left-2 right-2">
                <span class="text-[10px] font-medium text-white drop-shadow-md truncate block">{{ bg.title }}</span>
              </div>
              @if (url() === bg.url) {
                <div class="absolute top-2 right-2 w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                  </svg>
                </div>
              }
            </button>
          }
        </div>
      </div>

      <!-- Image URL Section -->
      <div>
        <label class="block text-sm font-semibold text-content mb-2">Custom URL</label>
        <div class="relative group">
          <input
            type="text"
            [(ngModel)]="url"
            (ngModelChange)="onUrlChange($event)"
            placeholder="https://..."
            class="w-full pl-10 pr-4 py-3 text-sm bg-surface border border-border-base rounded-xl outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all"
          />
          <ng-icon name="heroLink" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors"></ng-icon>
        </div>
      </div>

      <!-- Theme Selection Section -->
      <div>
        <label class="block text-sm font-semibold text-content mb-3">Background Theme</label>
        <div class="grid grid-cols-2 gap-3">
           <button 
            (click)="setTheme('light')" 
            [class.ring-2]="currentTheme() === 'light'"
            class="flex items-center justify-center gap-2 px-4 py-3 text-sm bg-subtle hover:bg-border-base rounded-xl transition-all ring-accent font-medium"
          >
            <div class="w-3 h-3 rounded-full bg-[hsl(210,20%,98%)] border border-border-base"></div>
            Light
          </button>
          <button 
            (click)="setTheme('dark')" 
            [class.ring-2]="currentTheme() === 'dark'"
            class="flex items-center justify-center gap-2 px-4 py-3 text-sm bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all ring-accent font-medium"
          >
            <div class="w-3 h-3 rounded-full bg-slate-700"></div>
            Dark
          </button>
        </div>
        
        @if (url()) {
          <button 
            (click)="setTheme('transparent')" 
            [class.ring-2]="currentTheme() === 'transparent'"
            class="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded-xl transition-all ring-accent font-semibold"
          >
            <div class="w-3 h-3 rounded-full bg-accent animate-pulse"></div>
            Apply Custom Background
          </button>
        }
      </div>
    </div>
  `
})
export class BackgroundSettings {
  private userService = inject(UserService);
  private toastService = inject(ToastService);
  
  close = output<void>();
  presets = PRESET_BACKGROUNDS;
  
  url = signal(this.userService.currentUser()?.preferences?.backgroundImage || '');
  currentTheme = signal(this.userService.currentUser()?.preferences?.theme || 'light');
  
  private urlUpdateSubject = new Subject<string>();

  constructor() {
    this.urlUpdateSubject.pipe(debounceTime(500)).subscribe(url => {
      this.updateBackground(url);
    });
  }

  onUrlChange(url: string) {
    this.url.set(url);
    this.urlUpdateSubject.next(url);
  }

  selectPreset(url: string) {
    this.url.set(url);
    this.updateBackground(url);
  }

  setTheme(theme: 'light' | 'dark' | 'transparent' | 'system') {
    this.currentTheme.set(theme);
    this.userService.updatePreferences({ theme }).subscribe({
      error: () => this.toastService.show('Failed to save theme', 'error')
    });
  }

  private updateBackground(url: string) {
    const theme: 'light' | 'dark' | 'transparent' | 'system' = url ? 'transparent' : 'light';
    this.currentTheme.set(theme);
    
    this.userService.updatePreferences({ 
      background_image: url || null,
      theme: theme
    }).subscribe({
      error: () => this.toastService.show('Failed to save background', 'error')
    });
  }
}
