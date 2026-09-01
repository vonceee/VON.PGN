import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideIcons } from '@ng-icons/core';

@Component({
  selector: 'app-dialog-wrapper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-4xl overflow-hidden flex flex-col w-full max-h-[90vh]">
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
        <h2 class="text-xl font-semibold">{{ title() }}</h2>
      </div>

      <!-- Body -->
      <div [class]="'p-8 overflow-y-auto flex-1 ' + bodyClass()">
        <ng-content></ng-content>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-slate-200 flex items-center justify-center gap-3 shrink-0 bg-surface/30">
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
  bodyClass = input<string>('');
  close = output<void>();
}
