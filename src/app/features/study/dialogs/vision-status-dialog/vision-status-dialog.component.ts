import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

export interface VisionStatusDialogData {
  title?: string;
  statusText: string;
}

@Component({
  selector: 'app-vision-status-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-4xl w-full max-w-sm p-6 sm:p-8 space-y-6 relative mx-auto shadow-xl border border-slate-100 select-none">
      <div class="flex flex-col items-center text-center space-y-4">
        <!-- Title & Subtitle -->
        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-slate-900 tracking-tight">
            {{ data.title || 'Recognizing Position' }}
          </h3>
          <p class="text-sm font-medium text-slate-500">
            {{ data.statusText }}
          </p>
        </div>

        <!-- Subtle Animated Bar -->
        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div class="bg-blue-600 h-full w-2/5 rounded-full animate-indeterminate"></div>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          type="button"
          (click)="dialogRef.close()"
          class="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-slate-100">
          Cancel
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes indeterminate {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(100%); }
      100% { transform: translateX(300%); }
    }
    .animate-indeterminate {
      animation: indeterminate 1.5s infinite ease-in-out;
    }
  `]
})
export class VisionStatusDialogComponent {
  dialogRef = inject(DialogRef);
  data = inject<VisionStatusDialogData>(DIALOG_DATA);
}
