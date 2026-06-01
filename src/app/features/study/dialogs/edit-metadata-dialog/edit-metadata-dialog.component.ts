import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-edit-metadata-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="bg-main rounded-4xl shadow-xl w-full p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">Edit game metadata</h2>
      </div>

      <!-- Form Grid -->
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Tournament / Event -->
          <div class="md:col-span-3 space-y-2">
            <label class="text-sm font-semibold ml-1">Tournament / Event</label>
            <input
              type="text"
              [(ngModel)]="tags['Event']"
              placeholder="e.g. World Chess Championship"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <!-- Date -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">Date</label>
            <input
              type="text"
              [(ngModel)]="tags['Date']"
              placeholder="YYYY.MM.DD"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          
          <!-- White Player -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">White Title</label>
            <input
              type="text"
              [(ngModel)]="tags['WhiteTitle']"
              placeholder="GM"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <div class="md:col-span-2 space-y-2">
            <label class="text-sm font-semibold ml-1">White Player</label>
            <input
              type="text"
              [(ngModel)]="tags['White']"
              placeholder="Full Name"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">White Elo</label>
            <input
              type="text"
              [(ngModel)]="tags['WhiteElo']"
              placeholder="Rating"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>

          <!-- Black Player -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">Black Title</label>
            <input
              type="text"
              [(ngModel)]="tags['BlackTitle']"
              placeholder="GM"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <div class="md:col-span-2 space-y-2">
            <label class="text-sm font-semibold ml-1">Black Player</label>
            <input
              type="text"
              [(ngModel)]="tags['Black']"
              placeholder="Full Name"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">Black Elo</label>
            <input
              type="text"
              [(ngModel)]="tags['BlackElo']"
              placeholder="Rating"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>

          <!-- Round -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">Round</label>
            <input
              type="text"
              [(ngModel)]="tags['Round']"
              placeholder="e.g. 1.1"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <!-- Result -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">Result</label>
            <div class="relative">
              <select
                [(ngModel)]="tags['Result']"
                class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none appearance-none cursor-pointer text-content pr-10"
              >
                <option value="*">* (Ongoing/Unknown)</option>
                <option value="1-0">1-0 (White Wins)</option>
                <option value="0-1">0-1 (Black Wins)</option>
                <option value="1/2-1/2">1/2-1/2 (Draw)</option>
              </select>
              <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- ECO Code -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">ECO Code</label>
            <input
              type="text"
              [(ngModel)]="tags['ECO']"
              placeholder="e.g. E15"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
          <!-- Site -->
          <div class="md:col-span-1 space-y-2">
            <label class="text-sm font-semibold ml-1">Site</label>
            <input
              type="text"
              [(ngModel)]="tags['Site']"
              placeholder="e.g. London, ENG"
              class="w-full px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm outline-none placeholder:text-muted/50 text-content"
            />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4 flex gap-4 w-full">
        <button appButton variant="outline" (click)="dialogRef.close()" class="flex-1">
          Cancel
        </button>
        <button appButton variant="primary" (click)="onSave()" class="flex-1">
          Save Changes
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

