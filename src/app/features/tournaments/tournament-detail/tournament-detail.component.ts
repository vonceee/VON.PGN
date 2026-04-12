import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { BackLinkComponent } from '../../../shared/components/back-link/back-link.component';
import { PosterPreviewComponent } from '../tournament-editor/components/poster-preview.component';
import { TournamentService } from '../../../core/services/tournament.service';
import { SeoService } from '../../../core/services/seo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Tournament } from '../../../core/models/tournament.model';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BackLinkComponent, PosterPreviewComponent, ReactiveFormsModule],
  templateUrl: './tournament-detail.component.html'
})
export class TournamentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tournamentService = inject(TournamentService);
  private sanitizer = inject(DomSanitizer);
  private seo = inject(SeoService);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  tournament = signal<Tournament | undefined>(undefined);
  posterForm = signal<FormGroup | undefined>(undefined);
  posterPrizeCategories = signal<any[]>([]);
  mapUrl = signal<SafeResourceUrl | null>(null);
  isBookmarked = signal(false);
  bookmarkLoading = signal(false);
  shareMenuOpen = signal(false);

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        const t = this.tournamentService.getTournamentById(id);
        if (t) {
          this.tournament.set(t);
          this.isBookmarked.set(t.isBookmarked ?? false);
          this.setupMap();
          this.updateSeo(t);
          this.initPoster(t);
        }
      }
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // Always fetch from API for latest data
      this.tournamentService.fetchTournament(id);
    }
  }

  private updateSeo(t: Tournament) {
    const desc = t.description
      ? t.description.substring(0, 160)
      : `${t.name} — a ${t.format} chess tournament in ${t.location}.`;

    this.seo.update({
      title: t.name,
      description: desc,
      url: `https://vonchess.com/events/${t.id}`,
      type: 'article',
    });
  }

  private setupMap() {
    const t = this.tournament();
    if (t && !this.mapUrl()) {
      const { lat, lng } = t.coordinates;
      // Only set mapUrl if coordinates are valid (not both 0)
      if (lat !== 0 || lng !== 0) {
        const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
        this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      }
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatCategoryName(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatPrizeKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDayLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  objectKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj);
  }

  isSpecialAwardNested(value: unknown): value is { '1st': string; '2nd': string; '3rd': string } {
    return typeof value === 'object' && value !== null && '1st' in value;
  }

  getNestedAward(value: unknown): { '1st': string; '2nd': string; '3rd': string } | null {
    if (this.isSpecialAwardNested(value)) return value;
    return null;
  }

  getSimpleAward(value: unknown): string | null {
    if (typeof value === 'string') return value;
    return null;
  }

  toggleBookmark() {
    const t = this.tournament();
    if (!this.authService.isAuthenticated() || this.bookmarkLoading() || !t) return;

    this.bookmarkLoading.set(true);
    this.tournamentService.toggleBookmark(t.id).subscribe({
      next: (res) => {
        this.isBookmarked.set(res.is_bookmarked);
        this.bookmarkLoading.set(false);
      },
      error: () => {
        this.bookmarkLoading.set(false);
      }
    });
  }

  toggleShareMenu() {
    this.shareMenuOpen.set(!this.shareMenuOpen());
  }

  copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.shareMenuOpen.set(false);
    });
  }

  shareToFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    this.shareMenuOpen.set(false);
  }

  shareToTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(this.tournament()?.name ?? 'Check out this tournament!');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    this.shareMenuOpen.set(false);
  }

  formatViewCount(count: number | undefined): string {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }

  private parsePosterSettings(ps: any): any {
    if (!ps) return null;
    let decoded = ps;
    if (typeof ps === 'string') {
      try {
        decoded = JSON.parse(ps);
        if (typeof decoded === 'string') decoded = JSON.parse(decoded);
      } catch (e) { return null; }
    }
    
    if (decoded && typeof decoded === 'object') {
      // Normalize snake_case to camelCase for the form
      if (decoded.background_image && !decoded.backgroundImage) {
        decoded.backgroundImage = decoded.background_image;
      }
      if (decoded.layout_id && !decoded.layoutId) {
        decoded.layoutId = decoded.layout_id;
      }
    }
    return decoded;
  }

  private initPoster(t: Tournament) {
    // 1. Initialize hidden form for the engine
    let ps = this.parsePosterSettings(t.poster_settings);
    const settings = ps || {
        layoutId: 'portrait-classic',
        theme: 'light',
        backgroundImage: null,
        logos: [],
        visibility: {
            showPrizePool: true,
            showSchedule: true,
            showEntryFee: true,
            showOrganizerInfo: true
        }
    };

    const form = this.fb.group({
        posterSettings: this.fb.group({
            layoutId: [settings.layoutId],
            theme: [settings.theme],
            backgroundImage: [settings.backgroundImage],
            logos: this.fb.array(settings.logos || []),
            visibility: this.fb.group({
                showPrizePool: [settings.visibility?.showPrizePool ?? true],
                showSchedule: [settings.visibility?.showSchedule ?? true],
                showEntryFee: [settings.visibility?.showEntryFee ?? true],
                showOrganizerInfo: [settings.visibility?.showOrganizerInfo ?? true]
            }),
            useCustomPoster: [settings.useCustomPoster ?? false],
            customPosterUrl: [settings.customPosterUrl ?? null]
        })
    });
    this.posterForm.set(form);

    // 2. Map prizes
    const categories: any[] = [];
    if (t.categories) {
        Object.entries(t.categories).forEach(([name, data]) => {
            const prizes: any[] = [];
            if (data.prizes) {
                Object.entries(data.prizes).forEach(([place, value]) => {
                    if (value) prizes.push({ place: place.replace('_', ' '), value });
                });
            }

            const specialAwards: any[] = [];
            if (data.specialAwards) {
                Object.entries(data.specialAwards).forEach(([awardName, value]) => {
                    if (typeof value === 'string') {
                        specialAwards.push({ name: awardName, value });
                    } else if (value && typeof value === 'object') {
                        Object.entries(value).forEach(([subPlace, subVal]) => {
                            if (subVal) specialAwards.push({ name: `${awardName} (${subPlace})`, value: subVal });
                        });
                    }
                });
            }

            categories.push({
                category: name.replace('_', ' '),
                prizes,
                specialAwards
            });
        });
    }
    this.posterPrizeCategories.set(categories);
  }
}
