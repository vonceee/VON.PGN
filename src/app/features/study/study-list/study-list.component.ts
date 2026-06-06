import { Component, OnInit, inject, signal, computed, PLATFORM_ID, HostListener, ElementRef, ViewChild } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { CreateStudyDialogComponent } from '../dialogs/create-study-dialog/create-study-dialog.component';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/ui';
import { LoadingComponent } from '@shared/feedback';
import { effect } from '@angular/core';
import { debounceTime, switchMap, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';


@Component({
  selector: 'app-study-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, DialogModule, LoadingComponent],
  templateUrl: './study-list.component.html',
})
export class StudyListComponent implements OnInit {
  private studyService = inject(StudyService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(Dialog);
  
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  
  activeTab = signal<'all' | 'my'>('all');
  isLoggedIn = signal(false);
  isDropdownOpen = signal(false);
  isLoading = signal(false);
  searchQuery = signal('');
  sortBy = signal<'last_updated' | 'alphabetical'>('last_updated');

  queryParams = computed(() => ({
    isMyStudies: this.activeTab() === 'my',
    search: this.searchQuery(),
    sort: this.sortBy()
  }));

  private studiesResult = toSignal(
    toObservable(this.queryParams).pipe(
      debounceTime(300),
      tap(() => this.isLoading.set(true)),
      switchMap(params => {
        if (!isPlatformBrowser(this.platformId)) {
          return of({ data: [] });
        }
        const forceRefresh = !!(params.search || params.sort !== 'last_updated');
        return this.studyService.getStudies(
          params.isMyStudies,
          undefined,
          forceRefresh,
          params.search,
          params.sort
        ).pipe(
          catchError(() => of({ data: [] }))
        );
      }),
      tap(() => this.isLoading.set(false))
    )
  );

  studies = computed(() => this.studiesResult()?.data || []);

  constructor() {
    effect(() => {
      this.isLoggedIn.set(!!this.authService.currentUser());
      if (!this.isLoggedIn() && this.activeTab() === 'my') {
        this.activeTab.set('all');
      }
    });
  }

  ngOnInit() {
    // Initial load is handled reactively by queryParams computed signal
  }

  setTab(tab: 'all' | 'my') {
    this.activeTab.set(tab);
    this.isDropdownOpen.set(false);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onSortChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as 'last_updated' | 'alphabetical';
    this.sortBy.set(value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  createNewStudy() {
    const dialogRef = this.dialog.open<{ name: string; visibility: string; category: string; orientation?: string }>(CreateStudyDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      backdropClass: ['bg-black/5'],
    });

    dialogRef.closed.subscribe((result) => {
      if (result && result.name) {
        this.studyService.createStudy(result.name, '', result.visibility, result.category, result.orientation || 'white').subscribe((res) => {
          this.router.navigate(['/study', res.data.id]);
        });
      }
    });
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
      this.isDropdownOpen() &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isDropdownOpen.set(false);
    }
  }
}

