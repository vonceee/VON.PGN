import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-receive-request-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="bg-white rounded-4xl max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden">
      <!-- Header -->
      <div class="p-6 pb-0 flex items-center justify-between shrink-0">
        <h2 class="text-2xl">Board control request</h2>
      </div>

      <!-- Body Content -->
      <div class="flex-1 overflow-y-auto p-8 space-y-6">
        <div class="flex items-center gap-4 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20">
          <div>
            <p class="text-sm/6 font-medium">Incoming Request</p>
            <p class="text-xs text-gray-500">A student wants to interact with the board.</p>
          </div>
        </div>

        <p class="text-sm/6 font-medium">
          <span class="text-blue-600 font-medium">{{ data.userName }}</span> is requesting temporary board control to demonstrate moves and draw shapes.
        </p>

        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
            <span class="text-sm/6 opacity-80">Granting control allows them to sync moves and drawings to the classroom.</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
            <span class="text-sm/6 opacity-80">You can revoke control at any time by clicking "Revoke" on the viewers tab.</span>
          </li>
        </ul>
      </div>

      <!-- Footer Actions -->
      <div class="p-8 pt-4 flex gap-4 w-full shrink-0">
        <button appButton variant="danger" class="flex-1" (click)="dialogRef.close('decline')">
          Decline
        </button>
        <button appButton variant="primary" class="flex-1" (click)="dialogRef.close('grant')">
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
