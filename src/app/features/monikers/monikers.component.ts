import { Component, ChangeDetectionStrategy, inject, signal, computed, ViewChild, ElementRef, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MonikerService } from '../../core/services/moniker.service';
import { PlayerMoniker } from '../../core/models/moniker.model';
import { ButtonComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroTrophy,
  heroSparkles,
  heroAcademicCap,
  heroGlobeAlt,
  heroBookOpen,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-monikers',
  standalone: true,
  imports: [CommonModule, ButtonComponent, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './monikers.component.html',
  providers: [
    provideIcons({
      heroTrophy,
      heroSparkles,
      heroAcademicCap,
      heroGlobeAlt,
      heroBookOpen,
    })
  ]
})
export class MonikersComponent implements OnDestroy {
  @ViewChild('monikersContainer') monikersContainerRef!: ElementRef<HTMLElement>;

  private monikerService = inject(MonikerService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  isBrowser = isPlatformBrowser(this.platformId);
  isHoveringCard = signal(false);
  cursorX = signal(0);
  cursorY = signal(0);
  hoveredMonikerCategory = signal<string | undefined>(undefined);

  private cursorAnimationFrameId: number | null = null;
  private targetX = 0;
  private targetY = 0;

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');
  failedImages = signal<Set<string>>(new Set());

  readonly categories = [
    'All',
    'World Champions',
    'Tactical Masters',
    'Positional Legends',
    'Modern Super GMs',
    'Historical Icons',
  ];

  monikers = computed(() => this.monikerService.allMonikers());

  filteredMonikers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    return this.monikers().filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;

      const matchesQuery =
        !query ||
        item.moniker.toLowerCase().includes(query) ||
        item.playerName.toLowerCase().includes(query) ||
        item.shortDescription.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesQuery;
    });
  });

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onCategoryChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
  }

  onImageError(id: string) {
    this.failedImages.update((set) => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  openBlog(blogSlug: string) {
    this.router.navigate(['/blog', blogSlug], { queryParams: { from: 'monikers' } });
  }

  ngOnDestroy() {
    this.stopCursorAnimation();
  }

  onCardMouseEnter(event: MouseEvent, category: string) {
    if (!this.isBrowser || !this.monikersContainerRef) return;
    const container = this.monikersContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.targetX = event.clientX - rect.left;
    this.targetY = event.clientY - rect.top;

    this.hoveredMonikerCategory.set(category);
    this.isHoveringCard.set(true);
    this.startCursorAnimation();
  }

  onCardMouseLeave() {
    this.isHoveringCard.set(false);
    this.hoveredMonikerCategory.set(undefined);
    this.stopCursorAnimation();
  }

  onCardMouseMove(event: MouseEvent) {
    if (!this.isBrowser || !this.monikersContainerRef) return;
    const container = this.monikersContainerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    this.targetX = event.clientX - rect.left;
    this.targetY = event.clientY - rect.top;
  }

  private startCursorAnimation() {
    if (!this.isBrowser) return;
    if (this.cursorAnimationFrameId) return;

    this.cursorX.set(this.targetX);
    this.cursorY.set(this.targetY);

    const animateCursor = () => {
      if (!this.isHoveringCard()) {
        this.cursorAnimationFrameId = null;
        return;
      }

      const curX = this.cursorX();
      const curY = this.cursorY();

      // Lerp logic: 0.12 factor creates a clean delayed momentum effect
      const nextX = curX + (this.targetX - curX) * 0.12;
      const nextY = curY + (this.targetY - curY) * 0.12;

      this.cursorX.set(nextX);
      this.cursorY.set(nextY);

      this.cursorAnimationFrameId = requestAnimationFrame(animateCursor);
    };

    this.cursorAnimationFrameId = requestAnimationFrame(animateCursor);
  }

  private stopCursorAnimation() {
    if (this.cursorAnimationFrameId) {
      cancelAnimationFrame(this.cursorAnimationFrameId);
      this.cursorAnimationFrameId = null;
    }
  }

  getCategoryIcon(category?: string): string {
    switch (category) {
      case 'World Champions': return 'heroTrophy';
      case 'Tactical Masters': return 'heroSparkles';
      case 'Positional Legends': return 'heroAcademicCap';
      case 'Modern Super GMs': return 'heroGlobeAlt';
      case 'Historical Icons': return 'heroBookOpen';
      default: return 'heroAcademicCap';
    }
  }

  getCategoryLabel(category?: string): string {
    return category || '';
  }
}
