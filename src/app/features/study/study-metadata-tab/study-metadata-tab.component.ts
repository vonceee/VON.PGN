import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyChapter } from '../../../core/models/study.model';

@Component({
  selector: 'app-study-metadata-tab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-surface/5">
      <!-- Header -->
      <div class="px-6 py-4 flex items-center justify-between shrink-0">
        @if (canEdit()) {
          <button class="text-xs cursor-pointer hover:underline" (click)="edit.emit()">
            Edit
          </button>
        }
      </div>

      <!-- Compact Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
        @if (hasTags()) {
          <div class="grid grid-cols-[100px_1fr] gap-y-4 gap-x-4">
            @for (item of displayItems(); track item.key) {
              <div class="text-xs  uppercase  text-muted/60 flex items-center">
                {{ item.label }}
              </div>
              <div class="text-sm font-semibold text-content">
                {{ item.value }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class StudyMetadataTabComponent {
  chapter = input.required<StudyChapter | null>();
  canEdit = input(false);
  edit = output<void>();

  hasTags = computed(() => {
    const t = this.chapter()?.pgn_tags;
    return t && Object.keys(t).length > 0;
  });

  displayItems = computed(() => {
    const t = this.chapter()?.pgn_tags || {};
    const items: { label: string; key: string; value: string }[] = [];

    const mapping = [
      { label: 'Tournament', key: 'Event' },
      { label: 'Site', key: 'Site' },
      { label: 'Date', key: 'Date' },
      { label: 'Round', key: 'Round' },
      { label: 'White', key: 'White', secondaryKey: 'WhiteElo', prefixKey: 'WhiteTitle' },
      { label: 'Black', key: 'Black', secondaryKey: 'BlackElo', prefixKey: 'BlackTitle' },
      { label: 'Result', key: 'Result' },
      { label: 'ECO', key: 'ECO' },
    ];

    mapping.forEach(m => {
      let value = t[m.key];
      if (value) {
        if (m.prefixKey && t[m.prefixKey]) {
          value = `[${t[m.prefixKey]}] ${value}`;
        }
        if (m.secondaryKey && t[m.secondaryKey]) {
          value += ` (${t[m.secondaryKey]})`;
        }
        items.push({ label: m.label, key: m.key, value });
      }
    });

    return items;
  });
}

