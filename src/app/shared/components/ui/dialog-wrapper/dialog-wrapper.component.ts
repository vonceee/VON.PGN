import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-dialog-wrapper',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [provideIcons({ heroXMark })],
  template: `
    <div class="premium-card rounded-2xl overflow-hidden flex flex-col w-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 bg-white dark:bg-black">
        <h2 class="text-xl font-semibold">{{ title() }}</h2>
        <button class="cursor-pointer" (click)="close.emit()">
          <ng-icon name="heroXMark" class="text-lg"></ng-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-black">
        <ng-content></ng-content>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-border-theme flex items-center justify-end gap-3 shrink-0">
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
