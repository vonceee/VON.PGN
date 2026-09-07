import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorldChampionshipService } from '../../../core/services/world-championship.service';
import { WorldChampionshipMatch } from '../../../core/models/world-championship.model';
import { ToastService } from '../../../core/services/toast.service';

/**
 * World Championship Admin Simple List Component.
 * 
 * WHY: Provides a clean, lightweight list displaying each matchup title and direct action buttons
 *      (Edit, View, Delete) instead of heavy metadata cards.
 */
@Component({
  selector: 'app-world-championships-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 max-w-5xl mx-auto pb-12">
      <!-- Header Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
            World Championships
          </h1>
          <p class="text-sm text-slate-500 mt-0.5">
            Select a championship matchup to edit or create a new entry.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/admin/world-championships-editor/new"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Entry</span>
          </a>
        </div>
      </div>

      <!-- Search Input (if multiple entries) -->
      @if (matches().length > 1) {
        <div class="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or players..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            class="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
          />
          @if (searchQuery()) {
            <button
              type="button"
              (click)="searchQuery.set('')"
              class="text-xs text-slate-400 hover:text-slate-700 cursor-pointer p-1"
            >
              ✕
            </button>
          }
        </div>
      }

      <!-- Simple List of Items -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
        @for (match of filteredMatches(); track match.id) {
          <div class="p-4 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
            <!-- Title -->
            <div class="min-w-0 flex-1">
              <h2 class="text-sm sm:text-base font-semibold text-slate-900 truncate">
                {{ match.title }}
              </h2>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <a
                [routerLink]="['/admin/world-championships-editor', match.id]"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                Edit
              </a>

              <a
                [routerLink]="['/world-championships', match.id]"
                target="_blank"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                title="View public page"
              >
                <span>View</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>

              <button
                type="button"
                (click)="requestDelete(match)"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                title="Delete Matchup"
              >
                Delete
              </button>
            </div>
          </div>
        } @empty {
          <div class="p-12 text-center space-y-3">
            <p class="text-sm text-slate-500">No world championship matchups found.</p>
            <a
              routerLink="/admin/world-championships-editor/new"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              + Create First Entry
            </a>
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
                class="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
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
  private wccService = inject(WorldChampionshipService);
  private toastService = inject(ToastService);

  searchQuery = signal<string>('');
  deleteTarget = signal<WorldChampionshipMatch | null>(null);

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
