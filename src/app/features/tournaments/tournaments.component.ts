import { Component, inject, signal, computed, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { AuthService } from '../../core/services/auth.service';
import { Tournament, TournamentStatus } from '../../core/models/tournament.model';
import { ButtonComponent  } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroChevronDown,
  heroMagnifyingGlass,
  heroXMark,
  heroCalendar,
  heroStar,
  heroChevronLeft,
  heroChevronRight,
  heroEye,
  heroBookOpen,
  heroPhoto,
} from '@ng-icons/heroicons/outline';
import { FloatingCursorContainerDirective, FloatingCursorTriggerDirective } from '@shared/directives';
import { FloatingCursorComponent } from '@shared/ui';

const ITEMS_PER_PAGE = 9;

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    NgIconComponent,
    FloatingCursorContainerDirective,
    FloatingCursorTriggerDirective,
    FloatingCursorComponent,
  ],
  providers: [
    provideIcons({
      heroChevronDown,
      heroMagnifyingGlass,
      heroXMark,
      heroCalendar,
      heroStar,
      heroChevronLeft,
      heroChevronRight,
      heroEye,
      heroBookOpen,
      heroPhoto,
    }),
  ],
  templateUrl: './tournaments.component.html',
  styleUrl: './tournaments.component.css'
})
export class TournamentsComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  private route = inject(ActivatedRoute);
  authService = inject(AuthService);

  @ViewChild('tabDropdownContainer') tabDropdownContainer!: ElementRef;

  tournaments = this.tournamentService.tournaments;
  loading = this.tournamentService.loading;
  error = this.tournamentService.error;

  activeTab = signal<TournamentStatus>('upcoming');
  isTabDropdownOpen = signal(false);
  searchQuery = signal('');
  formatFilter = signal('');
  sortBy = signal('');
  currentPage = signal(1);
  flippedCards = signal<Set<string>>(new Set());
  selectedPoster = signal<string | null>(null);

  tournamentsWithStatus = computed(() => {
    const now = new Date();
    return this.tournaments().map(t => {
      const start = new Date(t.dates.start);
      const end = new Date(t.dates.end);
      let status: TournamentStatus = t.status;

      if (now > end) {
        status = 'past';
      } else if (now >= start) {
        status = 'ongoing';
      } else {
        status = 'upcoming';
      }

      return { ...t, status };
    });
  });

  upcomingCount = computed(() => this.tournamentsWithStatus().filter(t => t.status === 'upcoming').length);
  ongoingCount = computed(() => this.tournamentsWithStatus().filter(t => t.status === 'ongoing').length);
  pastCount = computed(() => this.tournamentsWithStatus().filter(t => t.status === 'past').length);

  availableFormats = computed(() => {
    const formats = new Set<string>();
    this.tournamentsWithStatus().forEach(t => {
      if (t.format) formats.add(t.format);
    });
    return Array.from(formats).sort();
  });

  filteredTournaments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const format = this.formatFilter();
    const tab = this.activeTab();
    const sort = this.sortBy();

    let result = this.tournamentsWithStatus().filter(t => {
      if (t.format === 'Arena') return false;
      if (t.status !== tab) return false;
      if (format && t.format !== format) return false;
      if (query) {
        const searchable = [
          t.name,
          t.location,
          t.organizer,
          t.format,
          t.creator?.name ?? ''
        ].join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });

    if (sort === 'recently_posted') {
      result = [...result].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sort === 'starting_soon') {
      const now = Date.now();
      result = [...result].filter(t => new Date(t.dates.start).getTime() >= now);
      result.sort((a, b) => {
        const dateA = new Date(a.dates.start).getTime();
        const dateB = new Date(b.dates.start).getTime();
        return dateA - dateB;
      });
    }

    return result;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTournaments().length / ITEMS_PER_PAGE)));

  paginatedTournaments = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * ITEMS_PER_PAGE;
    return this.filteredTournaments().slice(start, start + ITEMS_PER_PAGE);
  });

  pages = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);
    const result: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) result.push(i);
      return result;
    }

    result.push(1);
    if (current > 3) result.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);

    if (current < total - 2) result.push('...');
    result.push(total);

    return result;
  });

  ngOnInit() {
    this.tournamentService.fetchTournaments();

    // Handle query parameters for pre-filtering
    this.route.queryParams.subscribe(params => {
      if (params['format']) {
        this.formatFilter.set(params['format']);
      }
      if (params['tab']) {
        this.activeTab.set(params['tab'] as TournamentStatus);
      }
    });
  }

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onFormatChange(event: Event) {
    this.formatFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onSortChange(event: Event) {
    this.sortBy.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }


  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  setTab(tab: TournamentStatus) {
    this.activeTab.set(tab);
    this.isTabDropdownOpen.set(false);
    this.currentPage.set(1);
  }

  goToPage(page: number | '...') {
    if (page === '...') return;
    this.currentPage.set(page);
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  toggleTabDropdown() {
    this.isTabDropdownOpen.update(v => !v);
  }

  toggleFlip(id: string) {
    this.flippedCards.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  isFlipped(id: string): boolean {
    return this.flippedCards().has(id);
  }

  openPoster(url: string) {
    this.selectedPoster.set(url);
    document.body.style.overflow = 'hidden';
  }

  closePoster() {
    this.selectedPoster.set(null);
    document.body.style.overflow = '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return this.formatDate(dateStr);
  }

  formatPrizePool(prizePool: string): string {
    if (!prizePool) return '0.00';
    
    // Extract currency symbol if present
    const symbolMatch = prizePool.match(/^[^\d\s,.]+/);
    const symbol = symbolMatch ? symbolMatch[0] : '';
    
    // Extract numeric part
    const numericPart = prizePool.replace(/[^\d.]/g, '');
    const amount = parseFloat(numericPart);
    
    if (isNaN(amount)) return prizePool;

    // Format with commas and 2 decimals
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${symbol}${formattedAmount}`;
  }

  getTournamentThumbnail(tournament: Tournament): string | null {
    const ps = tournament.poster_settings;
    if (!ps) return null;

    // 1. Prioritize Custom Manual Poster
    if (ps.useCustomPoster && ps.customPosterUrl) {
      return ps.customPosterUrl;
    }

    // 2. Fallback to Background Image from Designer
    if (ps.backgroundImage) {
      return ps.backgroundImage;
    }

    return null;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isTabDropdownOpen() &&
      this.tabDropdownContainer &&
      !this.tabDropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isTabDropdownOpen.set(false);
    }
  }

  getChessPieceSymbol(index: number): string {
    const symbols = ['♔', '♕', '♖', '♗', '♘', '♙'];
    return symbols[index % symbols.length];
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}

