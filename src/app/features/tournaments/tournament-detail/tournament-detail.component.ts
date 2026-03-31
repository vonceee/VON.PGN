import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TournamentService } from '../../../core/services/tournament.service';
import { SeoService } from '../../../core/services/seo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Tournament } from '../../../core/models/tournament.model';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tournament-detail.component.html'
})
export class TournamentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tournamentService = inject(TournamentService);
  private sanitizer = inject(DomSanitizer);
  private seo = inject(SeoService);
  authService = inject(AuthService);

  tournament: Tournament | undefined;
  mapUrl = signal<SafeResourceUrl | null>(null);
  showRegisterModal = signal(false);
  isBookmarked = signal(false);
  bookmarkLoading = signal(false);
  shareMenuOpen = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // First try local
      this.tournament = this.tournamentService.getTournamentById(id);

      if (this.tournament) {
        this.isBookmarked.set(this.tournament.isBookmarked ?? false);
        this.setupMap();
        this.updateSeo(this.tournament);
      }

      // Always fetch from API for latest data
      this.tournamentService.fetchTournament(id);

      // Subscribe to signal changes
      const checkInterval = setInterval(() => {
        const t = this.tournamentService.getTournamentById(id);
        if (t) {
          this.tournament = t;
          this.isBookmarked.set(t.isBookmarked ?? false);
          this.setupMap();
          this.updateSeo(t);
          clearInterval(checkInterval);
        }
      }, 100);

      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);
    }
  }

  private updateSeo(t: Tournament) {
    const desc = t.description
      ? t.description.substring(0, 160)
      : `${t.name} — a ${t.format} chess tournament in ${t.location}.`;

    this.seo.update({
      title: t.name,
      description: desc,
      url: `https://vonchess.com/tournaments/${t.id}`,
      type: 'article',
    });
  }

  private setupMap() {
    if (this.tournament && !this.mapUrl()) {
      const { lat, lng } = this.tournament.coordinates;
      const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
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

  toggleRegisterModal() {
    this.showRegisterModal.set(!this.showRegisterModal());
  }

  toggleBookmark() {
    if (!this.authService.isAuthenticated() || this.bookmarkLoading() || !this.tournament) return;

    this.bookmarkLoading.set(true);
    this.tournamentService.toggleBookmark(this.tournament.id).subscribe({
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
    const text = encodeURIComponent(this.tournament?.name ?? 'Check out this tournament!');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    this.shareMenuOpen.set(false);
  }

  formatViewCount(count: number | undefined): string {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }
}
