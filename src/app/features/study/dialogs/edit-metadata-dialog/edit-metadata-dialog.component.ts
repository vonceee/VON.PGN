import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';

@Component({
  selector: 'app-edit-metadata-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
      <!-- Dialog Header -->
      <div class="p-6 pb-0 flex items-center justify-between shrink-0">
        <h2 class="text-2xl">edit metadata</h2>
      </div>

      <!-- Dialog Body (scrollable) -->
      <div class="flex-1 overflow-y-auto p-6 py-6 space-y-6 min-h-0">
        <!-- Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Tournament / Event -->
          <div class="md:col-span-3 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Tournament / Event</label>
            <input
              type="text"
              [(ngModel)]="tags['Event']"
              placeholder="e.g. World Chess Championship"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <!-- Date -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Date</label>
            <input
              type="text"
              [(ngModel)]="tags['Date']"
              placeholder="YYYY.MM.DD"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          
          <!-- White Player -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">White Title</label>
            <input
              type="text"
              [(ngModel)]="tags['WhiteTitle']"
              placeholder="GM"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <div class="md:col-span-2 space-y-2">
            <label class="text-sm/6 font-medium ml-1">White Player</label>
            <input
              type="text"
              [(ngModel)]="tags['White']"
              placeholder="Full Name"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">White Elo</label>
            <input
              type="text"
              [(ngModel)]="tags['WhiteElo']"
              placeholder="Rating"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>

          <!-- Black Player -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Black Title</label>
            <input
              type="text"
              [(ngModel)]="tags['BlackTitle']"
              placeholder="GM"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <div class="md:col-span-2 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Black Player</label>
            <input
              type="text"
              [(ngModel)]="tags['Black']"
              placeholder="Full Name"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Black Elo</label>
            <input
              type="text"
              [(ngModel)]="tags['BlackElo']"
              placeholder="Rating"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>

          <!-- Round -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Round</label>
            <input
              type="text"
              [(ngModel)]="tags['Round']"
              placeholder="e.g. 1.1"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <!-- Result -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Result</label>
            <div class="relative">
              <select
                [(ngModel)]="tags['Result']"
                class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none appearance-none cursor-pointer pr-10"
              >
                <option value="*">* (Ongoing/Unknown)</option>
                <option value="1-0">1-0 (White Wins)</option>
                <option value="0-1">0-1 (Black Wins)</option>
                <option value="1/2-1/2">1/2-1/2 (Draw)</option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- ECO Code -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">ECO Code</label>
            <input
              type="text"
              [(ngModel)]="tags['ECO']"
              placeholder="e.g. E15"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
          <!-- Site -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Site</label>
            <input
              type="text"
              [(ngModel)]="tags['Site']"
              placeholder="e.g. London, ENG"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>

          <!-- Analysis Study Link Override -->
          <div class="md:col-span-4 space-y-2">
            <label class="text-sm/6 font-medium ml-1">Analysis Study Link Override</label>
            <input
              type="text"
              [(ngModel)]="tags['StudyLink']"
              placeholder="e.g. 12 or https://vonchess.com/study/12"
              class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm/6 outline-none placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      <!-- Dialog Footer -->
      <div class="p-8 pt-4 flex gap-4 w-full shrink-0">
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-slate-200 font-medium text-[16px] leading-5 cursor-pointer hover:bg-slate-200 transition-all"
         (click)="dialogRef.close()">
          Cancel
        </button>
        <button class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer"
         (click)="onSave()">
          Save
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
export class EditMetadataDialogComponent {
  dialogRef = inject(DialogRef<Record<string, string>>);
  data = inject<Record<string, string>>(DIALOG_DATA);

  tags = { ...this.data };

  constructor() {
    this.dialogRef.updateSize('680px');
  }

  onSave() {
    this.dialogRef.close(this.tags);
  }
}

