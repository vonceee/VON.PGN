import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BroadcastService } from '../../../core/services/broadcast.service';

interface BroadcastRound {
  id: string;
  name: string;
  slug: string;
  finished?: boolean;
  startsAt?: number;
  finishedAt?: number;
  url: string;
}

interface BroadcastDetail {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  baseName?: string;
  description?: string;
  url: string;
  website?: string;
  tier?: number;
  status?: string;
  image?: string;
  createdAt?: number;
  info?: {
    format?: string;
    tc?: string;
    fideTC?: string;
    location?: string;
    timeZone?: string;
    website?: string;
    standings?: string;
    players?: string;
    [key: string]: any;
  };
  rounds?: BroadcastRound[];
  defaultRoundId?: string;
  dates?: number[];
}

type TabType = 'details' | 'games';

@Component({
  selector: 'app-broadcast-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen">
      @if (loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-4">
            <div class="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm font-medium">Loading broadcast details...</p>
          </div>
        </div>
      } @else if (error()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p class="text-sm text-red-400">{{ error() }}</p>
          </div>
        </div>
      } @else if (detail()) {
        <!-- Hero Section -->
        <div class="relative overflow-hidden">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <a routerLink="/broadcasts"
              class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500  hover:text-cyan-400 mb-4 ">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
                class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to Broadcasts
            </a>
            <div class="flex flex-col lg:flex-row gap-6 items-start">
              <!-- Left: Title & Info -->
              <div class="flex-1">
                <!-- Title -->
                <h1 class="text-3xl sm:text-4xl font-bold  mb-4 line-clamp-2">{{ detail()?.name }}</h1>

                <!-- Quick Info -->
                <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500 ">
                  @if (detail()?.info?.location) {
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {{ detail()?.info?.location }}
                    </div>
                  }
                  @if (detail()?.info?.format) {
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      {{ detail()?.info?.format }}
                    </div>
                  }
                  @if (detail()?.info?.tc) {
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ detail()?.info?.tc }}
                    </div>
                  }
                  @if (detail()?.info?.fideTC) {
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ detail()?.info?.fideTC }}
                    </div>
                  }
                  @if (detail()?.info?.timeZone) {
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ detail()?.info?.timeZone }}
                    </div>
                  }
                  @if (detail()?.info?.website) {
                    <a [href]="detail()?.info?.website" target="_blank" class="flex items-center gap-1 text-cyan-500 hover:text-cyan-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                      </svg>
                      Website
                    </a>
                  }
                </div>
              </div>

              <!-- Right: Image -->
              @if (detail()?.image) {
                <div class="w-full lg:w-64 h-40 lg:h-32 rounded-xl overflow-hidden shrink-0">
                  <img [src]="detail()?.image" [alt]="detail()?.name" class="w-full h-full object-cover">
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Controls Row -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            <!-- Round Dropdown -->
            <div class="shrink-0">
              <label class="block text-sm font-medium text-slate-700  mb-2">Round</label>
              <select 
                class="w-full border border-border-theme rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 "
                disabled
              >
                <option>disabled</option>
              </select>
            </div>

            <!-- Category Dropdown -->
            @if (categories().length > 1) {
              <div class="shrink-0">
                <label class="block text-sm font-medium text-slate-700  mb-2">Category</label>
                <select 
                  (change)="onCategoryChange($event)"
                  class="border border-border-theme rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent  whitespace-nowrap"
                >
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id" [selected]="cat.id === detail()?.id">
                      {{ cat.name }}
                    </option>
                  }
                </select>
              </div>
            }
          </div>
        </div>

        <!-- Tabs -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="border-b border-border-theme">
            <nav class="-mb-px flex gap-8">
              <button
                (click)="activeTab.set('details')"
                [class]="activeTab() === 'details' 
                  ? 'border-cyan-500 text-cyan-500' 
                  : 'border-transparent hover:border-slate-600'"
                class="py-4 px-1 border-b-2 font-medium text-sm  text-slate-600 "
              >
                Details
              </button>
              <button
                (click)="activeTab.set('games')"
                [class]="activeTab() === 'games' 
                  ? 'border-cyan-500 text-cyan-500' 
                  : 'border-transparent hover:border-slate-600'"
                class="py-4 px-1 border-b-2 font-medium text-sm  text-slate-600 "
              >
                Games
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div class="py-6">
            @if (activeTab() === 'details') {
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Left Column -->
                <div class="space-y-6">
                  @if (detail()?.description) {
                    <div class=" rounded-xl p-6 border border-border-theme">
                      <h3 class="text-lg font-semibold  mb-4">About</h3>
                      <div class="prose prose-invert prose-sm max-w-none " [innerHTML]="formattedDescription()"></div>
                    </div>
                  }

                  @if (detail()?.url || detail()?.createdAt || detail()?.tier) {
                    <div class=" rounded-xl p-6 border border-border-theme">
                      <h3 class="text-lg font-semibold  mb-4">Broadcast Info</h3>
                      <dl class="space-y-3">
                        @if (detail()?.tier) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">Tier</dt>
                            <dd class="text-sm ">Tier {{ detail()?.tier }}</dd>
                          </div>
                        }
                        @if (detail()?.status) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">Status</dt>
                            <dd class="text-sm  capitalize">{{ detail()?.status }}</dd>
                          </div>
                        }
                        @if (detail()?.createdAt) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">Created</dt>
                            <dd class="text-sm ">{{ detail()?.createdAt | date:'medium' }}</dd>
                          </div>
                        }
                        @if (detail()?.url) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">Lichess URL</dt>
                            <dd class="text-sm">
                              <a [href]="detail()?.url" target="_blank" class="text-cyan-500 hover:text-cyan-400">View on Lichess →</a>
                            </dd>
                          </div>
                        }
                        @if (detail()?.website) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">Website</dt>
                            <dd class="text-sm">
                              <a [href]="detail()?.website" target="_blank" class="text-cyan-500 hover:text-cyan-400">Visit →</a>
                            </dd>
                          </div>
                        }
                      </dl>
                    </div>
                  }
                </div>

                <!-- Right Column -->
                <div class="space-y-6">
                  @if (detail()?.dates?.[0] || detail()?.dates?.[1]) {
                    <div class=" rounded-xl p-6 border border-border-theme">
                      <h3 class="text-lg font-semibold  mb-4">Schedule</h3>
                      <dl class="space-y-3">
                        @if (detail()?.dates?.[0]) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">Start Date</dt>
                            <dd class="text-sm ">{{ detail()?.dates?.[0] | date:'mediumDate' }}</dd>
                          </div>
                        }
                        @if (detail()?.dates?.[1]) {
                          <div class="flex justify-between">
                            <dt class="text-xs uppercase tracking-wide text-slate-500 ">End Date</dt>
                            <dd class="text-sm ">{{ detail()?.dates?.[1] | date:'mediumDate' }}</dd>
                          </div>
                        }
                      </dl>
                    </div>
                  }

                  @if (detail()?.info?.standings) {
                    <div class=" rounded-xl p-6 border border-border-theme">
                      <a [href]="detail()?.info?.standings" target="_blank" class="flex items-center justify-between text-cyan-500 hover:text-cyan-400">
                        <span class="font-semibold ">View Standings</span>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      </a>
                    </div>
                  }
                </div>
              </div>
            } @else if (activeTab() === 'games') {
              <div class="text-center py-12">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100  mb-4">
                  <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-medium  mb-2">Games Coming Soon</h3>
                <p class="text-sm text-slate-500 ">Round selection and game viewing will be available once the rounds data is fetched successfully.</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class BroadcastDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private broadcastService = inject(BroadcastService);

  loading = signal(false);
  error = signal<string | null>(null);
  detail = signal<BroadcastDetail | null>(null);
  activeTab = signal<TabType>('details');
  categories = signal<BroadcastDetail[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDetail(id);
      this.loadCategories();
    }
  }

  private loadDetail(id: string) {
    this.loading.set(true);
    this.error.set(null);

    this.broadcastService.getBroadcastDetail(id).subscribe({
      next: (response: any) => {
        const broadcast = response.broadcast || response;
        let rounds: BroadcastRound[] = [];

        if (response.rounds && Array.isArray(response.rounds)) {
          rounds = response.rounds;
        } else if (broadcast.rounds && Array.isArray(broadcast.rounds)) {
          rounds = broadcast.rounds;
        }

        this.detail.set({
          ...broadcast,
          rounds: rounds
        });
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set('Failed to load broadcast details');
        this.loading.set(false);
      }
    });
  }

  private loadCategories() {
    this.broadcastService.fetchAllBroadcastsRaw().subscribe({
      next: (res) => {
        const currentId = this.detail()?.id;
        const currentBaseName = this.detail()?.baseName || this.detail()?.name || '';

        const allBroadcasts = [...(res.data || []), ...(res.lichess || [])];
        const related = allBroadcasts.filter(b =>
          b.id !== currentId && b.baseName === currentBaseName
        );

        if (related.length > 0) {
          this.categories.set(related);
        }
      }
    });
  }

  onCategoryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const id = select.value;
    if (id) {
      this.loadDetail(id);
    }
  }

  formattedDescription(): string {
    const desc = this.detail()?.description || '';
    return desc
      .replace(/## (.*)/g, '<h4 class="text-md font-semibold mt-4 mb-2">$1</h4>')
      .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-cyan-500 hover:text-cyan-400">$1</a>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br>');
  }
}