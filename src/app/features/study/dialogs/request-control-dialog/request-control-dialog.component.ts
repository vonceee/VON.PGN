import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-request-control-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-4xl w-full p-8 space-y-8 relative">
      <!-- Header -->
      <div class="flex justify-between">
        <h2 class="text-2xl">Request board control</h2>
      </div>

      <!-- Body Content -->
      <div class="space-y-6">
        <div class="flex items-center gap-4 bg-blue-600/5 p-4 rounded-2xl border border-blue-600/20">
          <!-- Icon -->
          <div class="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <p class="text-sm/6 font-semibold">Board is Locked</p>
          </div>
        </div>

        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
            <span class="text-sm/6">This action will send a request to the host to grant you control of the board.</span>
          </li>
        </ul>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 flex gap-4 justify-end">
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-slate-200 font-medium text-[16px] leading-5 cursor-pointer hover:bg-slate-200 transition-all"
         (click)="dialogRef.close(false)">
          Cancel
        </button>
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer"
         (click)="dialogRef.close(true)">
          Request control
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
export class RequestControlDialogComponent {
  dialogRef = inject(DialogRef<boolean>);
}
