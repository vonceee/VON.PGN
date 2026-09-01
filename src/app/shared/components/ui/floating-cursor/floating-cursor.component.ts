import { Component, ElementRef, ViewChild, signal, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { FloatingCursorContainerDirective } from '../../../directives/floating-cursor-container.directive';
import {
  heroBookOpen,
  heroPlay,
  heroPuzzlePiece,
  heroTrophy,
  heroAcademicCap,
  heroPlus,
  heroGlobeAlt,
  heroSparkles
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-floating-cursor',
  standalone: true,
  imports: [NgIconComponent],
  providers: [
    provideIcons({
      heroBookOpen,
      heroPlay,
      heroPuzzlePiece,
      heroTrophy,
      heroAcademicCap,
      heroPlus,
      heroGlobeAlt,
      heroSparkles
    })
  ],
  template: `
    <div #cursorElement 
         class="pointer-events-none absolute z-50" 
         style="will-change: transform; left: 0; top: 0; transform: translate3d(0px, 0px, 0px) translate(-50%, -50%);">
      <div [style.opacity]="isVisible() ? 1 : 0"
           [style.transform]="isVisible() ? 'scale(1)' : 'scale(0.9)'"
           class="bg-white border border-slate-200 rounded-full px-7 py-3.5 flex items-center gap-3 shadow-lg select-none transition-[opacity,transform] duration-200 ease-out">
        @if (icon()) {
          <ng-icon [name]="icon()!" size="1.25rem" color="black" class="text-black shrink-0"></ng-icon>
        }
        <span class="text-[16px] font-semibold text-slate-900 leading-none">{{ text() }}</span>
      </div>
    </div>
  `
})
export class FloatingCursorComponent implements OnInit {
  private container = inject(FloatingCursorContainerDirective, { optional: true });
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('cursorElement', { static: true }) cursorElement!: ElementRef<HTMLElement>;

  isVisible = signal(false);
  text = signal('');
  icon = signal<string | null>(null);

  ngOnInit() {
    if (this.container) {
      this.container.registerCursor(this);
    }
  }

  show(text: string, icon: string | null) {
    this.text.set(text);
    this.icon.set(icon);
    this.isVisible.set(true);
    this.cdr.detectChanges();
    // console.log('FloatingCursorComponent.show: isVisible:', this.isVisible(), 'text:', this.text(), 'icon:', this.icon());
  }

  hide() {
    this.isVisible.set(false);
    this.cdr.detectChanges();
    // console.log('FloatingCursorComponent.hide: isVisible:', this.isVisible());
  }
}
