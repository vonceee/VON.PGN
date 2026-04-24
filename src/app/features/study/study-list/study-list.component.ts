import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { CreateStudyDialogComponent } from '../dialogs/create-study-dialog/create-study-dialog.component';
import { FormsModule } from '@angular/forms';
import { SectionHeadingComponent, BadgeComponent } from '@shared/ui';
import { ButtonComponent } from '@shared/ui';
import { effect } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroGlobeAlt, heroUser, heroLockClosed, heroEyeSlash } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-study-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SectionHeadingComponent, ButtonComponent, DialogModule, BadgeComponent, NgIconComponent],
  providers: [provideIcons({ heroGlobeAlt, heroUser, heroLockClosed, heroEyeSlash })],
  template: `
    <div class="mx-auto p-4 md:p-8">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <app-section-heading text="Chess" highlight="Study"></app-section-heading>

        <div class="flex items-center gap-2">
            <!-- Tabs -->
            <div class="flex bg-subtle p-1 rounded-xl mr-4">
              <button 
                (click)="activeTab.set('all')"
                [class]="activeTab() === 'all' ? 'bg-main shadow-sm text-accent' : 'text-muted hover:text-content'"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                <ng-icon name="heroGlobeAlt"></ng-icon>
                Public
              </button>
              @if (isLoggedIn()) {
                <button 
                  (click)="activeTab.set('my')"
                  [class]="activeTab() === 'my' ? 'bg-main shadow-sm text-accent' : 'text-muted hover:text-content'"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                  <ng-icon name="heroUser"></ng-icon>
                  My Studies
                </button>
              }
            </div>

           @if (isLoggedIn()) {
             <button appButton variant="primary" (click)="createNewStudy()">Create New Study</button>
           }
         </div>
       </div>
 
       <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
         @for (study of studies(); track study.id) {
           <div
             class="ui-panel border border-border-base rounded-2xl overflow-hidden flex flex-col h-full relative group cursor-default"
           >
            <!-- Card Body -->
            <div class="p-4 md:p-5 pt-4 flex flex-col flex-1">
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex flex-col gap-1">
                  <h2 class="text-base md:text-2xl font-bold">{{ study.name }}</h2>
                  <div class="flex gap-2">
                    @if (study.visibility === 'private') {
                      <app-badge customClass="!bg-red-500/10 !text-red-500 !border-red-500/20 border">
                        <ng-icon name="heroLockClosed" class="mr-1"></ng-icon> Private
                      </app-badge>
                    } @else if (study.visibility === 'unlisted') {
                      <app-badge customClass="!bg-amber-500/10 !text-amber-500 !border-amber-500/20 border">
                        <ng-icon name="heroEyeSlash" class="mr-1"></ng-icon> Unlisted
                      </app-badge>
                    }
                  </div>
                </div>
                @if (study.updated_at) {
                  <span
                    class="text-xs text-slate-400 whitespace-nowrap shrink-0 mt-1"
                    [title]="formatDate(study.updated_at)"
                  >
                    {{ formatRelativeTime(study.updated_at) }}
                  </span>
                }
              </div>

              <div class="space-y-2 text-sm mb-4">
                <div class="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4 shrink-0"
                  >
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path
                      fill-rule="evenodd"
                      d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="capitalize">{{ study.visibility }}</span>
                </div>

                <div class="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4 shrink-0"
                  >
                    <path
                      d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
                    />
                  </svg>
                  {{ study.chapters_count }} Chapters
                </div>

                <div class="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4 shrink-0"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span
                    >Created by <span class="font-semibold">{{ study.owner.name }}</span></span
                  >
                </div>
              </div>

              <!-- Bottom Row -->
              <div class="mt-auto flex items-center justify-end">
                <a appButton variant="outline" size="sm" [routerLink]="'/study/' + study.id">
                  View Study
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class StudyListComponent implements OnInit {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(Dialog);
  studies = signal<any[]>([]);
  activeTab = signal<'all' | 'my'>('all');
  isLoggedIn = signal(false);

  constructor() {
    effect(() => {
      this.isLoggedIn.set(!!this.authService.currentUser());
      if (!this.isLoggedIn() && this.activeTab() === 'my') {
        this.activeTab.set('all');
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this.loadStudies();
    });
  }

  ngOnInit() {
    // Initial load is handled by effect
  }

  loadStudies() {
    if (isPlatformBrowser(this.platformId)) {
      this.studyService.getStudies(this.activeTab() === 'my').subscribe((res) => {
        this.studies.set(res.data);
      });
    }
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
}
