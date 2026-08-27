import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

@Component({
  selector: 'app-receive-request-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-4xl max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden p-8 space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between shrink-0">
        <h2 class="text-2xl">Board control request</h2>
      </div>

      <!-- Body Content -->
      <div class="flex-1 overflow-y-auto space-y-6">
        <p class="text-sm/6 font-medium">
          <span class="text-blue-600 font-medium">{{ data.userName }}</span> is requesting board control to demonstrate moves and draw shapes.
        </p>

        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
            <span class="text-sm/6">Granting control allows them to sync moves and drawings to the classroom.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
            <span class="text-sm/6">You can revoke control at any time by clicking "Revoke" on the viewers tab.</span>
          </li>
        </ul>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 justify-end">
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-50 border border-transparent text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors font-medium text-[16px] leading-5 cursor-pointer"
         (click)="dialogRef.close('decline')">
          Decline
        </button>
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer"
         (click)="dialogRef.close('grant')">
          Grant control
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ReceiveRequestDialogComponent {
  dialogRef = inject(DialogRef<'grant' | 'decline'>);
  data = inject<{ userName: string }>(DIALOG_DATA);
}
