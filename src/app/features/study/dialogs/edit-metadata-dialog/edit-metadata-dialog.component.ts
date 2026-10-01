import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { TextInputComponent, SelectComponent, SelectItem } from '@shared/ui';
import { sanitizePgnHeaders, formatTagLabel } from '../../../../core/constants/pgn-tags.constants';

const PRIMARY_TAG_KEYS = new Set<string>([
  'Event',
  'Date',
  'WhiteTitle',
  'White',
  'WhiteElo',
  'BlackTitle',
  'Black',
  'BlackElo',
  'Round',
  'Result',
  'ECO',
  'Site',
  'StudyLink',
  '_shapes',
]);

@Component({
  selector: 'app-edit-metadata-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, SelectComponent],
  template: `
    <div class="bg-white rounded-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
      <!-- Dialog Header -->
      <div class="p-6 pb-0 flex items-center shrink-0">
        <h2 class="text-2xl font-serif">edit metadata</h2>
      </div>

      <!-- Dialog Body (scrollable) -->
      <div class="flex-1 overflow-y-auto p-6 py-6 min-h-0">
        <!-- Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6 pt-2">
          <!-- Event (Tournament) -->
          <app-text-input
            id="metadata_event"
            label="Event"
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

          <!-- ECO -->
          <app-text-input
            id="metadata_eco"
            label="ECO"
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

          <!-- Additional / Custom Tags Section -->
          <div class="md:col-span-4 mt-2">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Additional Tags
              </span>
            </div>

            @if (extraTagKeys.length > 0) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                @for (key of extraTagKeys; track key) {
                  <div class="flex items-center gap-2">
                    <app-text-input
                      [id]="'extra_' + key"
                      [label]="formatTagLabel(key)"
                      [(ngModel)]="tags[key]"
                      class="flex-1"
                    />
                    <button
                      type="button"
                      (click)="removeTag(key)"
                      title="Remove Tag"
                      class="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0 mt-2"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Add Tag Control (Lichess Style) -->
            <div class="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div class="w-48 shrink-0">
                <app-select
                  label="Select Tag to Add"
                  [items]="availableNewTagOptions"
                  [(value)]="selectedNewTagType"
                  class="w-full"
                />
              </div>

              @if (selectedNewTagType === 'CUSTOM') {
                <div class="w-40 shrink-0">
                  <app-text-input
                    id="custom_tag_name"
                    label="Tag Name"
                    [(ngModel)]="customTagName"
                    placeholder="e.g. Source"
                    class="w-full"
                  />
                </div>
              }

              <div class="flex-1 min-w-[140px]">
                <app-text-input
                  id="new_tag_value"
                  label="Value"
                  [(ngModel)]="newTagValue"
                  placeholder="Tag Value"
                  class="w-full"
                />
              </div>

              <button
                type="button"
                (click)="addTag()"
                [disabled]="!canAddTag()"
                class="inline-flex items-center gap-1.5 px-4 py-2 mt-1 rounded-full bg-slate-900 text-white font-medium text-xs leading-4 cursor-pointer hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dialog Footer -->
      <div class="p-8 pt-4 flex gap-4 w-full shrink-0">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-slate-200 font-medium text-[16px] leading-5 cursor-pointer hover:bg-slate-200 transition-all"
          (click)="dialogRef.close()"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer hover:bg-slate-800 transition-all"
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

  selectedNewTagType = '';
  customTagName = '';
  newTagValue = '';

  formatTagLabel = formatTagLabel;

  readonly resultOptions: SelectItem<string>[] = [
    { label: '* (Ongoing/Unknown)', value: '*' },
    { label: '1-0 (White Wins)', value: '1-0' },
    { label: '0-1 (Black Wins)', value: '0-1' },
    { label: '1/2-1/2 (Draw)', value: '1/2-1/2' },
  ];

  readonly standardTagDefinitions: { label: string; value: string }[] = [
    { label: 'Time Control', value: 'TimeControl' },
    { label: 'Annotator', value: 'Annotator' },
    { label: 'Termination', value: 'Termination' },
    { label: 'Board', value: 'Board' },
    { label: 'White Team', value: 'WhiteTeam' },
    { label: 'Black Team', value: 'BlackTeam' },
    { label: 'White FIDE ID', value: 'WhiteFideId' },
    { label: 'Black FIDE ID', value: 'BlackFideId' },
    { label: 'Custom Tag...', value: 'CUSTOM' },
  ];

  get extraTagKeys(): string[] {
    return Object.keys(this.tags).filter(k => !PRIMARY_TAG_KEYS.has(k));
  }

  get availableNewTagOptions(): SelectItem<string>[] {
    const existing = new Set(Object.keys(this.tags));
    return this.standardTagDefinitions
      .filter(t => t.value === 'CUSTOM' || !existing.has(t.value))
      .map(t => ({ label: t.label, value: t.value }));
  }

  constructor() {
    this.dialogRef.updateSize('720px');
    if (!this.tags['Result']) {
      this.tags['Result'] = '*';
    }
  }

  canAddTag(): boolean {
    if (!this.selectedNewTagType) return false;
    if (this.selectedNewTagType === 'CUSTOM' && !this.customTagName.trim()) return false;
    return !!this.newTagValue.trim();
  }

  addTag() {
    const key = this.selectedNewTagType === 'CUSTOM' ? this.customTagName.trim() : this.selectedNewTagType;
    if (!key || !this.newTagValue.trim()) return;

    this.tags[key] = this.newTagValue.trim();
    this.newTagValue = '';
    this.customTagName = '';
    this.selectedNewTagType = '';
  }

  removeTag(key: string) {
    delete this.tags[key];
  }

  onSave() {
    const shapes = this.tags['_shapes'];
    const cleaned = sanitizePgnHeaders(this.tags);
    if (shapes) {
      cleaned['_shapes'] = shapes;
    }
    this.dialogRef.close(cleaned);
  }
}
