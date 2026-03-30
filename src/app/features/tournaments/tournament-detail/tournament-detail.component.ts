import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TournamentService } from '../../../core/services/tournament.service';
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

  tournament: Tournament | undefined;
  mapUrl = signal<SafeResourceUrl | null>(null);
  showRegisterModal = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // First try local
      this.tournament = this.tournamentService.getTournamentById(id);

      if (this.tournament) {
        this.setupMap();
      }

      // Always fetch from API for latest data
      this.tournamentService.fetchTournament(id);

      // Subscribe to signal changes
      const checkInterval = setInterval(() => {
        const t = this.tournamentService.getTournamentById(id);
        if (t) {
          this.tournament = t;
          this.setupMap();
          clearInterval(checkInterval);
        }
      }, 100);

      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);
    }
  }

  private setupMap() {
    if (this.tournament && !this.mapUrl()) {
      const { lat, lng } = this.tournament.coordinates;
      const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
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
}
