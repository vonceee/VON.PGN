import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrophy, heroGlobeAlt, heroCalendar, heroHashtag, heroBookOpen } from '@ng-icons/heroicons/outline';
import { StudyFacade } from '../../../services/study.facade';

@Component({
  selector: 'app-study-metadata',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0' },
  providers: [
    provideIcons({
      heroTrophy,
      heroGlobeAlt,
      heroCalendar,
      heroHashtag,
      heroBookOpen
    })
  ],
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
    const items: { label: string; value: string; icon: string; isPlaceholder: boolean }[] = [];

    const mapping = [
      { label: 'Tournament', key: 'Event', icon: 'heroTrophy', placeholder: 'Unknown Tournament' },
      { label: 'Site', key: 'Site', icon: 'heroGlobeAlt', placeholder: 'Unknown Site' },
      { label: 'Date', key: 'Date', icon: 'heroCalendar', placeholder: 'Unknown Date' },
      { label: 'Round', key: 'Round', icon: 'heroHashtag', placeholder: 'Unknown Round' },
      { label: 'ECO Code', key: 'ECO', icon: 'heroBookOpen', placeholder: 'Unknown ECO' },
    ];

    mapping.forEach(m => {
      const value = t[m.key];
      const hasVal = value && value !== '?';
      items.push({
        label: m.label,
        value: hasVal ? value : m.placeholder,
        icon: m.icon,
        isPlaceholder: !hasVal
      });
    });

    return items;
  });

  editMetadata() {
    this.editMetadataClicked.emit();
  }
}
