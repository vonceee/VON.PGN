import { Component, OnInit, inject, signal, PLATFORM_ID, HostListener, ElementRef, ViewChild } from '@angular/core';
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
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-study-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, DialogModule, NgIconComponent, LoadingComponent],
  providers: [provideIcons({ heroChevronDown })],
  template: `
    <div class="px-4 md:px-16 py-8">
      <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex-1">
          <h1 class="text-4xl md:text-5xl mb-2">Study</h1>
          <p class="text-muted text-lg">Collaborate and analyze chess games with others.</p>
        </div>

        <div class="flex items-center gap-2">
            <!-- Dropdown -->
            <div class="relative" #dropdownContainer>
              <button 
                (click)="isDropdownOpen.set(!isDropdownOpen())"
                class="flex items-center justify-between gap-2 px-4 py-2.5 bg-subtle border border-border-base rounded-xl text-sm font-semibold text-content hover:bg-surface  min-w-[140px]"
              >
                <div class="flex items-center gap-2">
                  {{ activeTab() === 'all' ? 'Public' : 'My Studies' }}
                </div>
                <ng-icon name="heroChevronDown" [class.rotate-180]="isDropdownOpen()"></ng-icon>
              </button>

              @if (isDropdownOpen()) {
                <div class="absolute top-full right-0 mt-2 w-48 bg-main border border-border-base rounded-xl z-50 overflow-hidden py-1">
                  <button 
                    (click)="setTab('all')"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold  hover:bg-subtle"
                    [class.text-accent]="activeTab() === 'all'"
                  >
                    Public
                  </button>
                  @if (isLoggedIn()) {
                    <button 
                      (click)="setTab('my')"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold  hover:bg-subtle"
                      [class.text-accent]="activeTab() === 'my'"
                    >
                      My Studies
                    </button>
                  }
                </div>
              }
            </div>

           @if (isLoggedIn()) {
             <button appButton variant="primary" (click)="createNewStudy()">Create New Study</button>
           }
         </div>
      </header>
 
       <div class="relative min-h-[400px]">
         @if (isLoading()) {
           <div class="absolute inset-0 flex items-center justify-center">
             <app-loading></app-loading>
           </div>
         } @else {
           <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             @for (study of studies(); track study.id) {
               <div
                 class="ui-panel border border-border-base rounded-2xl overflow-hidden flex flex-col h-full relative group cursor-default"
               >
                <!-- Card Body -->
                <div class="p-4 md:p-5 pt-4 flex flex-col flex-1">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <div class="flex flex-col gap-1">
                      <h2 class="text-base md:text-2xl font-semibold">{{ study.name }}</h2>
                    </div>
                    @if (study.updated_at) {
                      <span
                        class="text-xs whitespace-nowrap shrink-0 mt-1"
                        [title]="formatDate(study.updated_at)"
                      >
                        {{ formatRelativeTime(study.updated_at) }}
                      </span>
                    }
                  </div>

                  <div class="space-y-2 text-sm mb-4">
                    <div class="flex items-center gap-2">
                      <span class="capitalize">{{ study.visibility }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                      {{ study.chapters_count }} Chapters
                    </div>

                    <div class="flex items-center gap-2">
                      <span
                        >Created by <span class="font-semibold">{{ study.owner.name }}</span></span
                      >
                    </div>
                  </div>

                  <!-- Bottom Row -->
                  <div class="mt-auto flex items-center justify-end">
                    <a appButton variant="primary" [routerLink]="'/study/' + study.id">
                      View Study
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        }
    </div>
  </div>
  `,
})
export class StudyListComponent implements OnInit {
  private studyService = inject(StudyService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(Dialog);
  
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  
  studies = signal<any[]>([]);
  activeTab = signal<'all' | 'my'>('all');
  isLoggedIn = signal(false);
  isDropdownOpen = signal(false);
  isLoading = signal(false);

  constructor() {
    effect(() => {
      this.isLoggedIn.set(!!this.authService.currentUser());
      if (!this.isLoggedIn() && this.activeTab() === 'my') {
        this.activeTab.set('all');
      }
    });

    effect(() => {
      this.loadStudies();
    });
  }

  ngOnInit() {
    // Initial load is handled by effect
  }

  loadStudies() {
    if (isPlatformBrowser(this.platformId)) {
      this.isLoading.set(true);
      this.studyService.getStudies(this.activeTab() === 'my').subscribe({
        next: (res) => {
          this.studies.set(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    }
  }

  setTab(tab: 'all' | 'my') {
    this.activeTab.set(tab);
    this.isDropdownOpen.set(false);
  }

  createNewStudy() {
    const dialogRef = this.dialog.open<{ name: string; visibility: string }>(CreateStudyDialogComponent);

    dialogRef.closed.subscribe((result) => {
      if (result && result.name) {
        this.studyService.createStudy(result.name, result.visibility).subscribe((res) => {
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

