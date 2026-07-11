import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrophy, heroGlobeAlt, heroCalendar, heroHashtag, heroBookOpen } from '@ng-icons/heroicons/outline';
import { StudyFacade } from '../../../services/study.facade';

@Component({
  selector: 'app-study-metadata',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroTrophy,
      heroGlobeAlt,
      heroCalendar,
      heroHashtag,
      heroBookOpen
    })
  ],
  template: `
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden bg-main select-none p-4 rounded-lg">
      @if (canEdit()) {
      <div class="flex mb-4 text-sm select-none">
        <button (click)="editMetadata()" class="text-xs cursor-pointer hover:underline">Edit</button>
      </div>
      }
      <div class="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4">
        <!-- Player Info & Clocks -->
        @if (hasPlayers()) {
        <div class="flex flex-col gap-2">
          <!-- White Player Row -->
          <div class="flex items-center justify-between p-2 rounded-xl bg-subtle">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full bg-white shrink-0 border border-border-base/50"></span>
              @if (facade.whitePlayer().title) {
              <span class="text-xs font-medium text-accent-foreground shrink-0">
                {{ facade.whitePlayer().title }}
              </span>
              }
              <span class="text-xs truncate font-medium text-content">{{ facade.whitePlayer().name }}</span>
              @if (facade.whitePlayer().elo) {
              <span class="text-xs text-muted font-medium">({{ facade.whitePlayer().elo }})</span>
              }
            </div>
            <!-- Clock -->
            @if (facade.whiteClock()) {
            <span class="px-1.5 py-0.5 rounded text-xs font-medium" [class.bg-sky-500/10]="facade.activeColor() === 'w'"
              [class.text-sky-600]="facade.activeColor() === 'w'" [class.border-sky-500/30]="facade.activeColor() === 'w'"
              [class.bg-main]="facade.activeColor() !== 'w'" [class.text-muted]="facade.activeColor() !== 'w'"
              [class.border-border-base/50]="facade.activeColor() !== 'w'">
              {{ facade.whiteClock() }}
            </span>
            }
          </div>

          <!-- Black Player Row -->
          <div class="flex items-center justify-between p-2 rounded-xl bg-subtle">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full bg-slate-950 shrink-0"></span>
              @if (facade.blackPlayer().title) {
              <span class="text-xs font-medium text-accent-foreground shrink-0">
                {{ facade.blackPlayer().title }}
              </span>
              }
              <span class="text-xs truncate font-medium text-content">{{ facade.blackPlayer().name }}</span>
              @if (facade.blackPlayer().elo) {
              <span class="text-xs text-muted font-medium">({{ facade.blackPlayer().elo }})</span>
              }
            </div>
            <!-- Clock -->
            @if (facade.blackClock()) {
            <span class="px-1.5 py-0.5 rounded text-xs font-medium" [class.bg-sky-500/10]="facade.activeColor() === 'b'"
              [class.text-sky-600]="facade.activeColor() === 'b'" [class.border-sky-500/30]="facade.activeColor() === 'b'"
              [class.bg-main]="facade.activeColor() !== 'b'" [class.text-muted]="facade.activeColor() !== 'b'"
              [class.border-border-base/50]="facade.activeColor() !== 'b'">
              {{ facade.blackClock() }}
            </span>
            }
          </div>
        </div>
        }

        <!-- Result, Date, Event, etc. Grid -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Dynamic Tags -->
          @for (item of metadataItems(); track item.label) {
          <div class="flex flex-col gap-1 p-3 bg-subtle rounded-xl select-none col-span-2">
            <span class="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
              <ng-icon [name]="item.icon" class="text-xs"></ng-icon>
              {{ item.label }}
            </span>
            <span class="text-sm font-medium truncate text-content">{{ item.value }}</span>
          </div>
          }
        </div>
      </div>
    </div>
  `
})
export class GameMetadataComponent {
  canEdit = input.required<boolean>();
  editMetadataClicked = output<void>();

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
}
