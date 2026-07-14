import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-main rounded-4xl max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden">
      <div class="p-6 pb-0 flex items-center justify-between shrink-0">
        <h2 class="text-2xl">Keyboard shortcuts</h2>
        <button (click)="dialogRef.close()" class="text-muted cursor-pointer transition-colors" title="Close">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Move Annotations -->
          <div class="space-y-4">
            <div class="space-y-2">
              @for (item of moveShortcuts; track item.key) {
                <div class="flex items-center justify-between py-1.5 border-b border-border-base last:border-0 group">
                  <span class="text-sm/6 opacity-80 group-hover:text-content">
                    {{ item.label }}
                  </span>
                  <div class="flex items-center gap-2">
                    @if (item.symbol) {
                      <span class="text-xs text-muted bg-subtle px-1.5 py-0.5 rounded">{{ item.symbol }}</span>
                    }
                    <kbd class="min-w-[24px] h-6 flex items-center justify-center px-1.5 bg-surface border border-border-base rounded text-xs font-semibold">{{ item.key }}</kbd>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Positional Annotations -->
          <div class="space-y-4">
            <div class="space-y-2">
              @for (item of posShortcuts; track item.key) {
                <div class="flex items-center justify-between py-1.5 border-b border-border-base last:border-0 group">
                  <span class="text-sm/6 opacity-80 group-hover:text-content">
                    {{ item.label }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted bg-subtle px-1.5 py-0.5 rounded">{{ item.symbol }}</span>
                    <div class="flex items-center gap-1">
                      <kbd class="h-6 flex items-center justify-center px-1.5 bg-surface border border-border-base rounded text-xs font-semibold text-muted">Shift</kbd>
                      <span class="text-xs">+</span>
                      <kbd class="w-6 h-6 flex items-center justify-center bg-surface border border-border-base rounded text-xs font-semibold">{{ item.key }}</kbd>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Navigation & Others -->
          <div class="space-y-4 md:col-span-2 pt-4 border-t border-border-base">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2">
              @for (item of otherShortcuts; track item.label) {
                <div class="flex items-center justify-between py-1.5 group">
                  <span class="text-sm/6 opacity-80 group-hover:text-content">
                    {{ item.label }}
                  </span>
                  <div class="flex items-center gap-1">
                    @for (key of item.keys; track $index) {
                       <kbd class="min-w-[24px] h-6 flex items-center justify-center px-1.5 bg-surface border border-border-base rounded text-xs font-semibold text-muted">{{ key }}</kbd>
                       @if (!$last) { <span class="text-xs mx-0.5">/</span> }
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ShortcutsDialogComponent {
  dialogRef = inject(DialogRef);

  moveShortcuts = [
    { key: '1', symbol: '!', label: 'Good move' },
    { key: '2', symbol: '?', label: 'Mistake' },
    { key: '3', symbol: '!!', label: 'Brilliant' },
    { key: '4', symbol: '??', label: 'Blunder' },
    { key: '5', symbol: '!?', label: 'Interesting' },
    { key: '6', symbol: '?!', label: 'Dubious' },
    { key: '7', symbol: '□', label: 'Only move' },
    { key: '8', symbol: '⊙', label: 'Zugzwang' },
    { key: '0', symbol: '', label: 'Clear all' },
  ];

  posShortcuts = [
    { key: '1', symbol: '=', label: 'Equal position' },
    { key: '2', symbol: '±', label: 'White is better' },
    { key: '3', symbol: '∓', label: 'Black is better' },
    { key: '4', symbol: '+-', label: 'White is winning' },
    { key: '5', symbol: '-+', label: 'Black is winning' },
    { key: '6', symbol: '∞', label: 'Unclear' },
  ];

  otherShortcuts = [
    { label: 'Flip Board', keys: ['F'] },
    { label: 'Open Annotation Dialog', keys: ['A', 'Enter'] },
    { label: 'Next Move', keys: ['→'] },
    { label: 'Previous Move', keys: ['←'] },
    { label: 'Next Chapter', keys: ['Shift + →'] },
    { label: 'Previous Chapter', keys: ['Shift + ←'] },
    { label: 'Start of Game', keys: ['Home'] },
    { label: 'End of Game', keys: ['End'] },
    { label: 'Toggle Engine', keys: ['L'] },
  ];
}
