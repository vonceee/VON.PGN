import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-side-drawer',
  standalone: true,
  imports: [CommonModule, NgIcon],
  providers: [provideIcons({ heroXMark })],
  animations: [
    trigger('drawerAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ],
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-[100] bg-black/40"
        [@backdropAnimation]
        (click)="close.emit()"
      ></div>
      <div
        class="fixed top-0 right-0 z-[101] w-full max-w-sm h-full bg-main border-l border-border-base shadow-2xl flex flex-col overflow-hidden"
        [@drawerAnimation]
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-border-base">
          <h2 class="text-xl font-bold text-content leading-none">{{ title() }}</h2>
          <button
            (click)="close.emit()"
            class="p-2 rounded-full hover:bg-subtle text-muted hover:text-content transition-all"
            aria-label="Close drawer"
          >
            <ng-icon name="heroXMark" class="w-6 h-6"></ng-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <ng-content></ng-content>
        </div>
        
        <!-- Footer (Optional) -->
        <div class="p-6 border-t border-border-base bg-surface/30">
          <ng-content select="[footer]"></ng-content>
        </div>
      </div>
    }
  `
})
export class SideDrawerComponent {
  isOpen = input.required<boolean>();
  title = input.required<string>();
  close = output<void>();
}
