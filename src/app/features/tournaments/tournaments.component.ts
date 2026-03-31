import { Component, inject, signal, computed, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TournamentService } from '../../core/services/tournament.service';
import { Tournament, TournamentStatus } from '../../core/models/tournament.model';

const ITEMS_PER_PAGE = 6;

@Component({
  selector: 'app-tournaments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tournaments.component.html'
})
export class TournamentsComponent implements OnInit {
  private tournamentService = inject(TournamentService);

  @ViewChild('tabDropdownContainer') tabDropdownContainer!: ElementRef;

  tournaments = this.tournamentService.tournaments;
  loading = this.tournamentService.loading;
  error = this.tournamentService.error;

  activeTab = signal<TournamentStatus>('upcoming');
  isTabDropdownOpen = signal(false);
  searchQuery = signal('');
  formatFilter = signal('');
  currentPage = signal(1);

  upcomingCount = computed(() => this.tournaments().filter(t => t.status === 'upcoming').length);
  ongoingCount = computed(() => this.tournaments().filter(t => t.status === 'ongoing').length);
  pastCount = computed(() => this.tournaments().filter(t => t.status === 'past').length);

  availableFormats = computed(() => {
    const formats = new Set<string>();
    this.tournaments().forEach(t => {
      if (t.format) formats.add(t.format);
    });
    return Array.from(formats).sort();
  });

  filteredTournaments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const format = this.formatFilter();
    const tab = this.activeTab();

    return this.tournaments().filter(t => {
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
  }

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onFormatChange(event: Event) {
    this.formatFilter.set((event.target as HTMLSelectElement).value);
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
}
