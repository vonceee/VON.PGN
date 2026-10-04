import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PcapService } from '../../core/services/pcap.service';
import { SeoService } from '../../core/services/seo.service';
import { PcapConference } from '../../core/models/pcap.model';
import { FloatingCursorContainerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';
import {
  PcapOverviewComponent,
  PcapTeamsComponent,
  PcapMatchesComponent,
  PcapStandingsComponent,
  PcapStatsComponent
} from './components';

export type PcapTab = 'overview' | 'teams' | 'matches' | 'standings' | 'stats';

@Component({
  selector: 'app-pcap',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FloatingCursorContainerDirective,
    FloatingCursorComponent,
    PcapOverviewComponent,
    PcapTeamsComponent,
    PcapMatchesComponent,
    PcapStandingsComponent,
    PcapStatsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pcap.component.html'
})
export class PcapComponent implements OnInit {
  public pcapService = inject(PcapService);
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active view tab
  activeTab = signal<PcapTab>('overview');

  // Selected team ID for expanded roster modal or card expansion
  expandedTeamId = signal<string | null>(null);

  // Service signals exposed for the template
  leagueStats = this.pcapService.leagueStats;

  ngOnInit(): void {
    // Ensure fresh PCAP data is fetched from the database whenever visiting the PCAP page
    this.pcapService.syncFromBackend();

    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab') as PcapTab;
      const currentTab = (tabParam && ['overview', 'teams', 'matches', 'standings', 'stats'].includes(tabParam))
        ? tabParam
        : 'overview';
      this.activeTab.set(currentTab);

      const confParam = params.get('conference');
      if (confParam === 'all' || confParam === 'alpha' || confParam === 'omega') {
        this.pcapService.conferenceFilter.set(confParam);
      } else if (confParam === 'north') {
        this.pcapService.conferenceFilter.set('alpha');
      } else if (confParam === 'south') {
        this.pcapService.conferenceFilter.set('omega');
      }

      const teamParam = params.get('team');
      if (teamParam) {
        this.expandedTeamId.set(teamParam);
      }

      this.updateTabSeo(currentTab, teamParam);
    });
  }

  setTab(tab: PcapTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  private updateTabSeo(tab: PcapTab, teamId?: string | null): void {
    const basePcapUrl = 'https://vonchess.net/pcap';

    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      name: 'Professional Chess Association of the Philippines',
      alternateName: 'PCAP',
      sport: 'Chess',
      url: basePcapUrl,
      logo: 'https://vonchess.net/assets/pcap/pcap-logo.webp',
      description:
        "Southeast Asia's premier professional chess league featuring elite grandmasters, international masters, and regional franchises across the Philippines."
    };

    const breadcrumbBase = [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://vonchess.net/' },
      { '@type': 'ListItem', 'position': 2, 'name': 'PCAP League', 'item': basePcapUrl }
    ];

    if (teamId && tab === 'teams') {
      const team = this.pcapService.getTeamById(teamId);
      const teamName = team?.name || teamId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      this.seo.update({
        title: `${teamName} — PCAP Roster & Profile | Vonchess`,
        description: `View the official roster, Grandmasters, and match results for ${teamName} in the Professional Chess Association of the Philippines (PCAP).`,
        url: `${basePcapUrl}?tab=teams&team=${teamId}`,
        keywords: [teamName, 'PCAP', 'PCAP chess', 'Philippine chess', 'roster', team?.conference || 'league'],
        jsonLd: [
          organizationSchema,
          {
            '@context': 'https://schema.org',
            '@type': 'SportsTeam',
            name: teamName,
            sport: 'Chess',
            parentOrganization: organizationSchema
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              ...breadcrumbBase,
              { '@type': 'ListItem', 'position': 3, 'name': 'Teams', 'item': `${basePcapUrl}?tab=teams` },
              { '@type': 'ListItem', 'position': 4, 'name': teamName, 'item': `${basePcapUrl}?tab=teams&team=${teamId}` }
            ]
          }
        ]
      });
      return;
    }

    switch (tab) {
      case 'teams':
        this.seo.update({
          title: 'PCAP Teams & Rosters 2026 | Professional Chess Association of the Philippines',
          description:
            'Explore all 24 PCAP franchises across the Alpha (North) and Omega (South) conferences. View active rosters, GM/IM master titles, and team ratings.',
          url: `${basePcapUrl}?tab=teams`,
          keywords: ['PCAP teams', 'PCAP rosters', 'Philippine chess teams', 'Alpha conference', 'Omega conference', 'chess grandmasters Philippines'],
          jsonLd: [
            organizationSchema,
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                ...breadcrumbBase,
                { '@type': 'ListItem', 'position': 3, 'name': 'Teams', 'item': `${basePcapUrl}?tab=teams` }
              ]
            }
          ]
        });
        break;

      case 'matches':
        this.seo.update({
          title: 'PCAP Schedule, Live Matchups & Results 2026 | Vonchess',
          description:
            'Official match schedule, upcoming pairings, completed scores, board matchups, and PGN replays for the 2026 PCAP All-Filipino Cup.',
          url: `${basePcapUrl}?tab=matches`,
          keywords: ['PCAP schedule', 'PCAP matches', 'PCAP chess results', 'live chess Philippines', 'PCAP PGN'],
          jsonLd: [
            organizationSchema,
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                ...breadcrumbBase,
                { '@type': 'ListItem', 'position': 3, 'name': 'Matches', 'item': `${basePcapUrl}?tab=matches` }
              ]
            }
          ]
        });
        break;

      case 'standings':
        this.seo.update({
          title: 'PCAP Standings & Leaderboard 2026 | Alpha & Omega Conference Rankings',
          description:
            'Live PCAP team standings, match points, board points differential, and recent team form for both Alpha and Omega conferences.',
          url: `${basePcapUrl}?tab=standings`,
          keywords: ['PCAP standings', 'PCAP leaderboard', 'PCAP conference rankings', 'Philippine chess league standings'],
          jsonLd: [
            organizationSchema,
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                ...breadcrumbBase,
                { '@type': 'ListItem', 'position': 3, 'name': 'Standings', 'item': `${basePcapUrl}?tab=standings` }
              ]
            }
          ]
        });
        break;

      case 'stats':
        this.seo.update({
          title: 'PCAP League Statistics & Records 2026 | Vonchess',
          description:
            'Complete PCAP league metrics, titleholder distribution (GMs, IMs, NMs), conference comparisons, and season records.',
          url: `${basePcapUrl}?tab=stats`,
          keywords: ['PCAP statistics', 'PCAP records', 'Philippine chess stats', 'PCAP Grandmasters count'],
          jsonLd: [
            organizationSchema,
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                ...breadcrumbBase,
                { '@type': 'ListItem', 'position': 3, 'name': 'Statistics', 'item': `${basePcapUrl}?tab=stats` }
              ]
            }
          ]
        });
        break;

      case 'overview':
      default:
        this.seo.update({
          title: 'PCAP League: Professional Chess Association of the Philippines | Vonchess',
          description:
            'Follow the Professional Chess Association of the Philippines (PCAP) 2026 Season. Real-time conference standings, team rosters, match schedule, live boards, and Grandmaster games.',
          url: basePcapUrl,
          keywords: [
            'PCAP',
            'PCAP League',
            'Professional Chess Association of the Philippines',
            'Philippine chess league',
            'Eugene Torre',
            'chess Philippines',
            'Pasig King Pirates',
            'San Juan Predators'
          ],
          jsonLd: [
            organizationSchema,
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: breadcrumbBase
            }
          ]
        });
        break;
    }
  }
}
