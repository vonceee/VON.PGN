import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PresenceService } from '../../core/services/presence.service';
import { CreatorActivityFeedComponent } from './components/creator-activity-feed/creator-activity-feed.component';

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroMagnifyingGlass,
  heroCheckBadge,
  heroBookOpen,
  heroGlobeAlt,
  heroVideoCamera,
  heroUsers,
  heroClipboardDocument,
  heroTrophy,
  heroQuestionMarkCircle,
  heroPuzzlePiece,
  heroSparkles,
  heroCommandLine,
  heroPlay,
  heroGlobeAsiaAustralia,
} from '@ng-icons/heroicons/outline';
import { FloatingCursorContainerDirective, FloatingCursorTriggerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgIconComponent,
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent,
    CreatorActivityFeedComponent,
  ],
  providers: [
    provideIcons({
      heroMagnifyingGlass,
      heroCheckBadge,
      heroBookOpen,
      heroGlobeAlt,
      heroVideoCamera,
      heroGlobeAsiaAustralia,
      heroUsers,
      heroClipboardDocument,
      heroTrophy,
      heroQuestionMarkCircle,
      heroPuzzlePiece,
      heroSparkles,
      heroCommandLine,
      heroPlay,
    }),
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  presenceService = inject(PresenceService);

  /** Category tab filter: 'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments' */
  activeCategory = signal<'all' | 'openings' | 'tactics' | 'analysis' | 'tournaments'>('all');

  ngOnInit() {
    this.presenceService.subscribeToSiteStats();
  }

  ngOnDestroy() {
    this.presenceService.unsubscribeFromSiteStats();
  }
}
