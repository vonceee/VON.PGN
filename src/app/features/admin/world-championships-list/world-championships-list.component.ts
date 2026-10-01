import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorldChampionshipService } from '../../../core/services/world-championship.service';
import { WorldChampionshipMatch } from '../../../core/models/world-championship.model';
import { ToastService } from '../../../core/services/toast.service';
import { TextInputComponent } from '@shared/ui';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroTrophy, heroPlus } from '@ng-icons/heroicons/outline';

/**
 * World Championship Admin List Component.
 * 
 * WHY: Provides an administrative management view matching the public matchups card layout,
 *      complete with search filtering, mirrored empty state with a "Create First Matchup" CTA,
 *      and direct action controls (Edit, View Public Page, Delete).
 */
@Component({
  selector: 'app-world-championships-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TextInputComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroTrophy,
      heroPlus,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-4 md:px-12 py-8 relative max-w-7xl mx-auto">
      <h1 class="sr-only">World Chess Championships Management</h1>

      <!-- Search Bar & Create Button -->
      <div class="flex items-center gap-3 mb-6">
        <app-text-input
          label="Search"
          placeholder="Search Chess World Champion Match"
          [(ngModel)]="searchQuery"
          [hasPrefix]="true"
          [hasSuffix]="searchQuery().length > 0"
          class="flex-1"
        >
          <svg prefix xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            class="size-4 text-gray-500">
            <path fill-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clip-rule="evenodd" />
          </svg>
          @if (searchQuery()) {
          <button suffix type="button" (click)="clearSearch()" class="text-gray-500 hover:text-slate-900 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
              <path
                d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
          }
        </app-text-input>

        <!-- Create Matchup Button (Inline with Search) -->
        <a
          routerLink="/admin/world-championships-editor/new"
          class="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-xl cursor-pointer border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
          title="Create New Matchup">
          <ng-icon name="heroPlus" size="1.25rem" class="shrink-0"></ng-icon>
        </a>
      </div>

      <div class="relative min-h-[400px]">
        <!-- Loading State -->
        @if (isLoading()) {
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
        } @else if (filteredMatches().length === 0) {
        <!-- Empty State (Mirrored from Match Page with Admin Create Button) -->
        <div
          class="flex-1 flex flex-col items-center justify-center border-2 border-slate-200 rounded-4xl p-16 text-center bg-white">
          <div class="w-16 h-16 bg-blue-600/5 rounded-full flex items-center justify-center mb-6 text-blue-600">
            <ng-icon name="heroTrophy" class="text-3xl"></ng-icon>
          </div>
          <h3 class="text-2xl mb-2">
            {{ searchQuery() ? 'No matchups found' : 'No championships review available' }}
          </h3>
          <p class="text-gray-500 max-w-md" [class.mb-8]="true">
            @if (searchQuery()) {
            Try adjusting your search terms.
            } @else {
            No World Chess Championship matches in-depth review have been created yet.
            }
          </p>
          @if (searchQuery()) {
          <button
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer"
            (click)="clearSearch()">
            Clear search filter
          </button>
          } @else {
          <a
            routerLink="/admin/world-championships-editor/new"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-medium text-[16px] leading-5 cursor-pointer shadow-xs hover:bg-slate-800 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Create First Matchup</span>
          </a>
          }
        </div>
        } @else {
        <!-- Matchup Cards Grid (Matching Public Match Page) -->
        <div class="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-6">
          @for (match of filteredMatches(); track match.id) {
          <div (click)="openEditor(match)"
            class="bg-slate-900 text-white border border-white/10 rounded-xl p-3.5 md:p-5 flex flex-col justify-between overflow-hidden hover:border-white/30 transition-all duration-200 cursor-pointer group">
            <!-- Title & Admin Actions Row -->
            <div class="flex items-start justify-between gap-3 mb-3.5">
              <h2 class="text-base md:text-xl font-semibold text-white group-hover:text-slate-200 transition-colors truncate"
                [title]="match.title">
                {{ match.title }}
              </h2>

              <!-- Action Buttons -->
              <div class="flex items-center gap-1.5 shrink-0" (click)="$event.stopPropagation()">
                <a
                  [routerLink]="['/admin/world-championships-editor', match.id]"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Edit Matchup">
                  Edit
                </a>
                <a
                  [routerLink]="['/world-championships', match.id]"
                  target="_blank"
                  class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="View Public Page">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
                <button
                  type="button"
                  (click)="requestDelete(match)"
                  class="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  title="Delete Matchup">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Opponents Duel Card -->
            <div
              class="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-2 group-hover:bg-white/[0.08] transition-colors">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-white">
                    {{ match.champion }}
                  </span>
                  <!-- Crown Icon for Defending Champion -->
                  <svg class="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 group-hover:scale-110 transition-transform"
                    viewBox="0 0 24 24" title="Defending Champion">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                  </svg>
                </div>
                <span class="text-xs text-slate-400 uppercase font-medium">Defender</span>
              </div>

              <div class="border-t border-white/10 my-1"></div>

              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-white">
                    {{ match.challenger }}
                  </span>
                </div>
                <span class="text-xs text-slate-400 uppercase font-medium">Challenger</span>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>

      <!-- Delete Confirmation Dialog -->
      @if (deleteTarget(); as target) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 class="text-lg font-bold text-slate-900">Delete Matchup?</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete <strong>{{ target.title }}</strong>? This action cannot be undone.
            </p>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                (click)="cancelDelete()"
                class="px-4 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="confirmDelete()"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class WorldChampionshipsListComponent {
  private router = inject(Router);
  private wccService = inject(WorldChampionshipService);
  private toastService = inject(ToastService);

  searchQuery = signal<string>('');
  deleteTarget = signal<WorldChampionshipMatch | null>(null);

  isLoading = computed(() => this.wccService.isLoading());
  matches = computed(() => this.wccService.allMatches());

  filteredMatches = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.matches();

    return this.matches().filter((m) => {
      return (
        m.title.toLowerCase().includes(q) ||
        m.champion.toLowerCase().includes(q) ||
        m.challenger.toLowerCase().includes(q) ||
        m.year.toString().includes(q)
      );
    });
  });

  clearSearch(): void {
    this.searchQuery.set('');
  }

  openEditor(match: WorldChampionshipMatch): void {
    this.router.navigate(['/admin/world-championships-editor', match.id]);
  }

  requestDelete(match: WorldChampionshipMatch): void {
    this.deleteTarget.set(match);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.wccService.deleteMatch(target.id);
    this.toastService.show(`Deleted "${target.title}"`, 'success');
    this.deleteTarget.set(null);
  }
}
