import { Component, inject, signal, computed, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ArenaService } from '../../../core/services/arena.service';
import { AuthService } from '../../../core/services/auth.service';
import { Arena, ArenaStatus } from '../../../core/models/arena.model';
import { ButtonComponent  } from '@shared/ui';
import { LoadingComponent  } from '@shared/feedback';
import { SectionHeadingComponent  } from '@shared/ui';

const ITEMS_PER_PAGE = 6;

@Component({
  selector: 'app-arena-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    LoadingComponent,
    SectionHeadingComponent,
    TitleCasePipe,
  ],
  templateUrl: './arena-list.component.html',
  styleUrls: ['./arena-list.component.css'],
})
export class ArenaListComponent implements OnInit {
  public arenaService = inject(ArenaService);
  private route = inject(ActivatedRoute);
  authService = inject(AuthService);

  @ViewChild('tabDropdownContainer') tabDropdownContainer!: ElementRef;

  arenas = this.arenaService.arenas;
  loading = signal(true);

  activeTab = signal<ArenaStatus>('upcoming');
  isTabDropdownOpen = signal(false);
  searchQuery = signal('');
  viewMode = signal<'grid' | 'list'>('list');
  currentPage = signal(1);

  arenaWithCalculatedStatus = computed(() => {
    // Current statuses are managed by fetchArenas but we ensure we filter correctly if needed
    return this.arenas();
  });

  upcomingCount = computed(
    () => this.arenaWithCalculatedStatus().filter((t) => t.status === 'upcoming').length,
  );
  ongoingCount = computed(
    () => this.arenaWithCalculatedStatus().filter((t) => t.status === 'ongoing').length,
  );
  pastCount = computed(
    () => this.arenaWithCalculatedStatus().filter((t) => t.status === 'past').length,
  );

  filteredArenas = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();

    return this.arenaWithCalculatedStatus().filter((t) => {
      if (t.status !== tab) return false;
      if (query) {
        const searchable = [t.name, t.timeControl, t.creator?.name ?? ''].join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredArenas().length / ITEMS_PER_PAGE)),
  );

  paginatedArenas = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * ITEMS_PER_PAGE;
    return this.filteredArenas().slice(start, start + ITEMS_PER_PAGE);
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
    this.arenaService.fetchArenas().subscribe(() => {
      this.loading.set(false);
    });

    this.route.queryParams.subscribe((params) => {
      if (params['tab']) {
        this.activeTab.set(params['tab'] as ArenaStatus);
      }
    });
  }

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  setTab(tab: ArenaStatus) {
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
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  toggleTabDropdown() {
    this.isTabDropdownOpen.update((v) => !v);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

