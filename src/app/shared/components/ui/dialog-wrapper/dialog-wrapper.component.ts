import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-dialog-wrapper',
  standalone: true,
  imports: [CommonModule, NgIconComponent, ButtonComponent],
  providers: [provideIcons({ heroXMark })],
  template: `
    <div class="premium-card rounded-2xl overflow-hidden flex flex-col max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-white/5 backdrop-blur-md">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white capitalize">{{ title() }}</h2>
        <button
          appButton
          variant="ghost"
          size="none"
          class="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
          (click)="close.emit()"
        >
          <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#09090b]">
        <ng-content></ng-content>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-white/5 backdrop-blur-sm">
        <ng-content select="[actions]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class DialogWrapperComponent {
  title = input.required<string>();
  close = output<void>();
}
