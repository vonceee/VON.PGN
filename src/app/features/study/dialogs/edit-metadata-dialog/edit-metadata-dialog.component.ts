import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';

@Component({
  selector: 'app-edit-metadata-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, SelectComponent],
  template: `
    <div class="bg-white rounded-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
      <!-- Dialog Header -->
      <div class="p-6 pb-0 flex items-center justify-between shrink-0">
        <h2 class="text-2xl">edit metadata</h2>
      </div>

      <!-- Dialog Body (scrollable) -->
      <div class="flex-1 overflow-y-auto p-6 py-6 min-h-0">
        <!-- Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6 pt-2">
          <!-- Tournament / Event -->
          <app-text-input
            id="metadata_event"
            label="Tournament / Event"
            [(ngModel)]="tags['Event']"
            placeholder="e.g. World Chess Championship"
            class="md:col-span-3 w-full"
          />

          <!-- Date -->
          <app-text-input
            id="metadata_date"
            label="Date"
            [(ngModel)]="tags['Date']"
            placeholder="YYYY.MM.DD"
            class="md:col-span-1 w-full"
          />

          <!-- White Player -->
          <app-text-input
            id="metadata_white_title"
            label="White Title"
            [(ngModel)]="tags['WhiteTitle']"
            placeholder="GM"
            class="md:col-span-1 w-full"
          />
          <app-text-input
            id="metadata_white"
            label="White Player"
            [(ngModel)]="tags['White']"
            placeholder="Full Name"
            class="md:col-span-2 w-full"
          />
          <app-text-input
            id="metadata_white_elo"
            label="White Elo"
            [(ngModel)]="tags['WhiteElo']"
            placeholder="Rating"
            class="md:col-span-1 w-full"
          />

          <!-- Black Player -->
          <app-text-input
            id="metadata_black_title"
            label="Black Title"
            [(ngModel)]="tags['BlackTitle']"
            placeholder="GM"
            class="md:col-span-1 w-full"
          />
          <app-text-input
            id="metadata_black"
            label="Black Player"
            [(ngModel)]="tags['Black']"
            placeholder="Full Name"
            class="md:col-span-2 w-full"
          />
          <app-text-input
            id="metadata_black_elo"
            label="Black Elo"
            [(ngModel)]="tags['BlackElo']"
            placeholder="Rating"
            class="md:col-span-1 w-full"
          />

          <!-- Round -->
          <app-text-input
            id="metadata_round"
            label="Round"
            [(ngModel)]="tags['Round']"
            placeholder="e.g. 1.1"
            class="md:col-span-1 w-full"
          />

          <!-- Result -->
          <app-select
            label="Result"
            [items]="resultOptions"
            [(value)]="tags['Result']"
            class="md:col-span-1 w-full"
          />

          <!-- ECO Code -->
          <app-text-input
            id="metadata_eco"
            label="ECO Code"
            [(ngModel)]="tags['ECO']"
            placeholder="e.g. E15"
            class="md:col-span-1 w-full"
          />

          <!-- Site -->
          <app-text-input
            id="metadata_site"
            label="Site"
            [(ngModel)]="tags['Site']"
            placeholder="e.g. London, ENG"
            class="md:col-span-1 w-full"
          />

          <!-- Analysis Study Link Override -->
          <app-text-input
            id="metadata_studylink"
            label="Analysis Study Link Override"
            [(ngModel)]="tags['StudyLink']"
            placeholder="e.g. 12 or https://vonchess.com/study/12"
            class="md:col-span-4 w-full"
          />
        </div>
      </div>

      <!-- Dialog Footer -->
      <div class="p-8 pt-4 flex gap-4 w-full shrink-0">
        <button
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-slate-200 font-medium text-[16px] leading-5 cursor-pointer hover:bg-slate-200 transition-all"
          (click)="dialogRef.close()"
        >
          Cancel
        </button>
        <button
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer"
          (click)="onSave()"
        >
          Save
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EditMetadataDialogComponent {
  dialogRef = inject(DialogRef<Record<string, string>>);
  data = inject<Record<string, string>>(DIALOG_DATA);

  tags: Record<string, string> = { ...this.data };

  readonly resultOptions: SelectItem<string>[] = [
    { label: '* (Ongoing/Unknown)', value: '*' },
    { label: '1-0 (White Wins)', value: '1-0' },
    { label: '0-1 (Black Wins)', value: '0-1' },
    { label: '1/2-1/2 (Draw)', value: '1/2-1/2' },
  ];

  constructor() {
    this.dialogRef.updateSize('680px');
    if (!this.tags['Result']) {
      this.tags['Result'] = '*';
    }
  }

  onSave() {
    this.dialogRef.close(this.tags);
  }
}
