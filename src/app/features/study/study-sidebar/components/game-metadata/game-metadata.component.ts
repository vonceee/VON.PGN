import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyFacade } from '../../../facade/study.facade';
import {
  comparePgnTags,
  cleanTagValue,
  EXCLUDED_SIDEBAR_TAGS,
  formatTagLabel,
} from '../../../../../core/constants/pgn-tags.constants';

@Component({
  selector: 'app-study-metadata',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0' },
  templateUrl: './game-metadata.component.html'
})
export class GameMetadataComponent {
  canEdit = input.required<boolean>();
  editMetadataClicked = output<void>();

  facade = inject(StudyFacade);

  whitePlayer = computed(() => {
    const p = this.facade.whitePlayer();
    const isPlaceholder = !p.name || p.name === '?' || p.name === 'White';
    return {
      name: isPlaceholder ? 'White Player' : p.name,
      elo: p.elo && p.elo !== '?' ? p.elo : '—',
      title: p.title && p.title !== '?' ? p.title : null,
      isPlaceholder
    };
  });

  blackPlayer = computed(() => {
    const p = this.facade.blackPlayer();
    const isPlaceholder = !p.name || p.name === '?' || p.name === 'Black';
    return {
      name: isPlaceholder ? 'Black Player' : p.name,
      elo: p.elo && p.elo !== '?' ? p.elo : '—',
      title: p.title && p.title !== '?' ? p.title : null,
      isPlaceholder
    };
  });

  metadataItems = computed(() => {
    const t = this.facade.tags() || {};
    const items: { key: string; label: string; value: string }[] = [];

    for (const [rawKey, rawVal] of Object.entries(t)) {
      if (EXCLUDED_SIDEBAR_TAGS.has(rawKey)) continue;
      const cleanVal = cleanTagValue(rawVal);
      if (cleanVal !== null) {
        items.push({
          key: rawKey,
          label: formatTagLabel(rawKey),
          value: cleanVal
        });
      }
    }

    items.sort((a, b) => comparePgnTags(a.key, b.key));
    return items;
  });

  editMetadata() {
    this.editMetadataClicked.emit();
  }
}
