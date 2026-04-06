import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

interface PosterPrize {
  place: string;
  value: string;
}

interface PosterSpecialAward {
  name: string;
  value: string;
}

interface PosterCategory {
  category: string;
  prizes: PosterPrize[];
  specialAwards?: PosterSpecialAward[];
}

@Component({
  selector: 'app-poster-preview',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  styleUrls: ['./poster-preview.component.css'],
  template: `
    <div class="poster-section">
      <div class="poster-section-header">
        <h3 class="poster-section-title">Tournament Poster</h3>
        <div class="poster-theme-toggle">
          <button 
            type="button" 
            class="poster-theme-btn" 
            [class.active]="theme === 'dark'" 
            (click)="themeChange.emit('dark')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647.122a.75.75 0 0 1 .808.868Z" clip-rule="evenodd" />
            </svg>
            Dark
          </button>
          <button 
            type="button" 
            class="poster-theme-btn" 
            [class.active]="theme === 'light'" 
            (click)="themeChange.emit('light')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
            </svg>
            Light
          </button>
        </div>
      </div>

      <div class="poster-preview-wrapper">
        @if (theme === 'dark') {
        <div class="poster-preview-scale">
          <div #posterDark class="poster-canvas poster-dark">
            <ng-container *ngTemplateOutlet="posterContent"></ng-container>
          </div>
        </div>
        } @else {
        <div class="poster-preview-scale">
          <div #posterLight class="poster-canvas poster-light">
            <ng-container *ngTemplateOutlet="posterContent"></ng-container>
          </div>
        </div>
        }
      </div>

      <div class="poster-actions">
        <app-button
          variant="primary"
          size="sm"
          [label]="downloading ? 'Generating...' : 'Download ' + (theme === 'dark' ? 'Dark' : 'Light') + ' Poster'"
          (click)="download.emit()"
          [disabled]="downloading"
        ></app-button>
      </div>
    </div>

    <ng-template #posterContent>
      <div class="poster-top-accent"></div>
      <div class="poster-header">
        <h1 class="poster-title">{{ tournamentData['name'] || 'Tournament Name' }}</h1>
        @if (posterDate) { <p class="poster-subtitle">{{ posterDate }}</p> }
        @if (tournamentData['location']) { <p class="poster-subtitle">{{ tournamentData['location'] }}</p> }
        <div class="poster-meta-row">
          @if (tournamentData['timeControl'] && tournamentData['rounds']) {
          <span class="poster-meta-chunk">{{ tournamentData['timeControl'] }} &middot; {{ tournamentData['rounds'] }} Rounds</span>
          } @else if (tournamentData['timeControl']) {
          <span class="poster-meta-chunk">{{ tournamentData['timeControl'] }}</span>
          } @else if (tournamentData['rounds']) {
          <span class="poster-meta-chunk">{{ tournamentData['rounds'] }} Rounds</span>
          }
        </div>
        <div class="poster-meta-row">
          @if (tournamentData['entryFee'] && tournamentData['participants']?.max) {
          <span class="poster-meta-chunk">{{ tournamentData['entryFee'] }} &middot; {{ tournamentData['participants']['max'] }} Slots</span>
          } @else if (tournamentData['entryFee']) {
          <span class="poster-meta-chunk">{{ tournamentData['entryFee'] }}</span>
          } @else if (tournamentData['participants']?.max) {
          <span class="poster-meta-chunk">{{ tournamentData['participants']['max'] }} Slots</span>
          }
        </div>
      </div>
      @if (tournamentData['categories'] && prizeCategories.length) {
      <div class="poster-divider"></div>
      <div class="poster-prizes-section">
        <div class="poster-prizes-header">PRIZES</div>
        @for (cat of prizeCategories; track cat.category) {
        <div class="poster-prize-category">{{ cat.category }}</div>
        @for (prize of cat.prizes; track prize.place) {
        <div class="poster-prize-row">
          <span class="poster-prize-place">{{ prize.place }}</span>
          <span class="poster-prize-value">{{ prize.value }}</span>
        </div>
        }
        @if (cat.specialAwards?.length) {
        <div class="poster-special-awards-header">SPECIAL AWARDS</div>
        @for (award of cat.specialAwards; track $index) {
        <div class="poster-prize-row">
          <span class="poster-prize-place">{{ award.name }}</span>
          <span class="poster-prize-value">{{ award.value }}</span>
        </div>
        }
        }
        }
      </div>
      }
      <div class="poster-divider"></div>
      <div class="poster-footer">
        @if (tournamentData['organizer']) { <span class="poster-organizer">{{ tournamentData['organizer'] }}</span> }
        @if (tournamentData['contact']) { <span class="poster-contact">{{ tournamentData['contact'] }}</span> }
      </div>
      <div class="poster-branding">VON.CHESS</div>
    </ng-template>
  `
})
export class PosterPreviewComponent {
  @Input() theme: 'dark' | 'light' = 'dark';
  @Input() tournamentData!: Record<string, any>;
  @Input() posterDate = '';
  @Input() prizeCategories: PosterCategory[] = [];
  @Input() downloading = false;
  
  @Output() themeChange = new EventEmitter<'dark' | 'light'>();
  @Output() download = new EventEmitter<void>();

  @ViewChild('posterDark') posterDarkRef!: ElementRef<HTMLElement>;
  @ViewChild('posterLight') posterLightRef!: ElementRef<HTMLElement>;
}
