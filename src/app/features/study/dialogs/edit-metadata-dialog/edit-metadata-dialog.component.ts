import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

@Component({
  selector: 'app-edit-metadata-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent],
  template: `
    <app-dialog-wrapper title="Edit Game Metadata" (close)="dialogRef.close()">
      <div class="space-y-6">
        <!-- Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="md:col-span-3 space-y-1">
            <label class="text-xs  text-muted uppercase ">Tournament / Event</label>
            <input type="text" [(ngModel)]="tags['Event']" class="metadata-input" placeholder="e.g. World Chess Championship" />
          </div>
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">Date</label>
            <input type="text" [(ngModel)]="tags['Date']" class="metadata-input" placeholder="YYYY.MM.DD" />
          </div>
          
          <!-- White Player -->
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">White Title</label>
            <input type="text" [(ngModel)]="tags['WhiteTitle']" class="metadata-input" placeholder="GM" />
          </div>
          <div class="md:col-span-2 space-y-1">
            <label class="text-xs  text-muted uppercase ">White Player</label>
            <input type="text" [(ngModel)]="tags['White']" class="metadata-input" placeholder="Full Name" />
          </div>
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">White Elo</label>
            <input type="text" [(ngModel)]="tags['WhiteElo']" class="metadata-input" placeholder="Rating" />
          </div>

          <!-- Black Player -->
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">Black Title</label>
            <input type="text" [(ngModel)]="tags['BlackTitle']" class="metadata-input" placeholder="GM" />
          </div>
          <div class="md:col-span-2 space-y-1">
            <label class="text-xs  text-muted uppercase ">Black Player</label>
            <input type="text" [(ngModel)]="tags['Black']" class="metadata-input" placeholder="Full Name" />
          </div>
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">Black Elo</label>
            <input type="text" [(ngModel)]="tags['BlackElo']" class="metadata-input" placeholder="Rating" />
          </div>

          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">Round</label>
            <input type="text" [(ngModel)]="tags['Round']" class="metadata-input" placeholder="e.g. 1.1" />
          </div>
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">Result</label>
            <select [(ngModel)]="tags['Result']" class="metadata-input cursor-pointer">
              <option value="*">* (Ongoing/Unknown)</option>
              <option value="1-0">1-0 (White Wins)</option>
              <option value="0-1">0-1 (Black Wins)</option>
              <option value="1/2-1/2">1/2-1/2 (Draw)</option>
            </select>
          </div>
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">ECO Code</label>
            <input type="text" [(ngModel)]="tags['ECO']" class="metadata-input" placeholder="e.g. E15" />
          </div>
          <div class="md:col-span-1 space-y-1">
            <label class="text-xs  text-muted uppercase ">Site</label>
            <input type="text" [(ngModel)]="tags['Site']" class="metadata-input" placeholder="e.g. London, ENG" />
          </div>
        </div>

        <div class="p-3 bg-accent/5 border border-accent/10 rounded-xl">
          <p class="text-xs text-content/70 leading-relaxed italic">
            PGN metadata follows standard chess headers.
          </p>
        </div>
      </div>

      <div actions class="flex-1"></div>
      <button actions appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
      <button actions appButton variant="primary" (click)="onSave()">
        Save Changes
      </button>
    </app-dialog-wrapper>
  `,
  styles: [`
    @reference "../../../../../styles.css";
    .metadata-input {
      @apply w-full px-3 py-2 bg-subtle border border-border-base rounded-lg text-sm  focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted/50  ;
    }
  `]
})
export class EditMetadataDialogComponent {
  dialogRef = inject(DialogRef<Record<string, string>>);
  data = inject<Record<string, string>>(DIALOG_DATA);
  
  tags = { ...this.data };

  onSave() {
    this.dialogRef.close(this.tags);
  }
}
