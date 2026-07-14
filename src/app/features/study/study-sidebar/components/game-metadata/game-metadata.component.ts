import { Component, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrophy, heroGlobeAlt, heroCalendar, heroHashtag, heroBookOpen, heroChevronDown, heroChevronUp } from '@ng-icons/heroicons/outline';
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
      heroBookOpen,
      heroChevronDown,
      heroChevronUp
    })
  ],
  templateUrl: './game-metadata.component.html'
})
export class GameMetadataComponent {
  canEdit = input.required<boolean>();
  editMetadataClicked = output<void>();
  showDetails = signal(false);

  facade = inject(StudyFacade);

  hasPlayers = computed(() => {
    const t = this.facade.tags() || {};
    const white = t['White'];
    const black = t['Black'];
    const hasWhite = white && white !== '?';
    const hasBlack = black && black !== '?';
    return !!(hasWhite || hasBlack);
  });

  metadataItems = computed(() => {
    const t = this.facade.tags() || {};
    const items: { label: string; value: string; icon: string }[] = [];

    const mapping = [
      { label: 'Tournament', key: 'Event', icon: 'heroTrophy' },
      { label: 'Site', key: 'Site', icon: 'heroGlobeAlt' },
      { label: 'Date', key: 'Date', icon: 'heroCalendar' },
      { label: 'Round', key: 'Round', icon: 'heroHashtag' },
      { label: 'ECO Code', key: 'ECO', icon: 'heroBookOpen' },
    ];

    mapping.forEach(m => {
      const value = t[m.key];
      if (value && value !== '?') {
        items.push({ label: m.label, value, icon: m.icon });
      }
    });

    return items;
  });

  editMetadata() {
    this.editMetadataClicked.emit();
  }

  toggleDetails() {
    this.showDetails.update(v => !v);
  }
}
