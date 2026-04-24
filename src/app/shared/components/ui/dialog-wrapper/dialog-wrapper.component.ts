import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideIcons } from '@ng-icons/core';

@Component({
  selector: 'app-dialog-wrapper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-panel border border-border-base rounded-2xl overflow-hidden flex flex-col w-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 bg-surface">
        <h2 class="text-xl font-medium tracking-wide text-content">{{ title() }}</h2>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
        <ng-content></ng-content>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-border-base flex items-center justify-end gap-3 shrink-0 bg-surface/50">
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
