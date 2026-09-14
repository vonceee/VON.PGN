import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyFacade } from '../../../facade/study.facade';

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
    const items: { label: string; value: string; isPlaceholder: boolean }[] = [];

    const mapping = [
      { label: 'Tournament', key: 'Event' },
      { label: 'Site', key: 'Site' },
      { label: 'Date', key: 'Date' },
      { label: 'Round', key: 'Round' },
      { label: 'ECO Code', key: 'ECO' },
    ];

    mapping.forEach(m => {
      const value = t[m.key];
      const hasVal = value && value !== '?';
      items.push({
        label: m.label,
        value: hasVal ? value : '_',
        isPlaceholder: !hasVal
      });
    });

    return items;
  });

  editMetadata() {
    this.editMetadataClicked.emit();
  }
}
