import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GachaService, CollectiblePlayer, UserCollectible } from '../../../core/services/gacha';
import { PlayerCardComponent } from '../components/player-card/player-card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles, heroUserGroup, heroCircleStack } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-gacha-hub',
  standalone: true,
  imports: [CommonModule, PlayerCardComponent, NgIcon],
  providers: [
    provideIcons({ heroSparkles, heroUserGroup, heroCircleStack })
  ],
  template: `
    <div class="gacha-container p-6 md:p-12 mx-auto">
      <!-- Header Section -->
      <header class="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 class="text-4xl md:text-5xl mb-2">Chess legends</h1>
          <p class="text-muted text-lg">Collect the greatest masters in the history of the game.</p>
        </div>
        
        <div class="flex items-center gap-4 bg-surface px-6 py-3 rounded-2xl border border-border-base shadow-sm">
          <ng-icon name="heroCircleStack" class="text-2xl text-accent"></ng-icon>
          <div class="flex flex-col">
            <span class="text-xs text-muted font-bold uppercase">Daily Packs</span>
            <span class="text-xl font-black text-content">{{ gachaService.dailyPacks() }}/10</span>
          </div>
        </div>
      </header>

      <!-- Summon Section -->
      <section class="max-w-md mx-auto mb-16">
        <div class="summon-card group">
          <div class="summon-bg bg-gradient-to-br from-accent/10 to-transparent"></div>
          <div class="summon-content p-8 text-center">
            <ng-icon name="heroSparkles" class="text-5xl text-accent mb-4 group-hover:scale-110 transition-transform"></ng-icon>
            <h3 class="text-2xl font-bold mb-2">Open Daily Pack</h3>
            <p class="text-muted mb-8 italic">Uncover a new legend for your collection.</p>
            <button 
              (click)="onPull(1)"
              [disabled]="gachaService.dailyPacks() < 1 || isPulling()"
              class="pull-button px-12 py-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Open Pack
            </button>
            <p class="mt-4 text-xs text-muted">Each pack contains 1 random player card.</p>
          </div>
        </div>
      </section>

      <!-- Collection Summary -->
      <section>
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <ng-icon name="heroUserGroup" class="text-2xl text-accent"></ng-icon>
            <h2 class="text-2xl font-bold">Your Collection</h2>
          </div>
          <span class="text-sm font-medium text-muted bg-subtle px-3 py-1 rounded-full">
            {{ gachaService.collection().length }} / {{ allPlayers().length }} Collected
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          @for (player of allPlayers(); track player.id) {
            <app-player-card 
              [player]="player"
              [isOwned]="isOwned(player.id)"
              [count]="getOwnedCount(player.id)"
            ></app-player-card>
          }
        </div>
      </section>

      <!-- Pull Reveal Overlay -->
      <div *ngIf="showReveal()" class="reveal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6">
        <div class="text-center w-full max-w-4xl">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            @for (result of pullResults(); track result.id) {
              <div class="reveal-card-anim">
                <app-player-card [player]="result" [isOwned]="true"></app-player-card>
              </div>
            }
          </div>
          <button (click)="closeReveal()" class="px-12 py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-100 transition-all">
            Continue
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .summon-card {
      position: relative;
      background: var(--color-surface);
      border: 1px solid var(--color-border-base);
      border-radius: 2rem;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .summon-card:hover {
      border-color: var(--color-accent);
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      transform: translateY(-4px);
    }

    .summon-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .summon-content {
      position: relative;
      z-index: 1;
    }

    .pull-button {
      box-shadow: 0 4px 15px rgba(var(--color-accent-rgb), 0.3);
    }

    .reveal-overlay {
      animation: fadeIn 0.5s ease forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .reveal-card-anim {
      animation: cardReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
    }

    .reveal-card-anim:nth-child(1) { animation-delay: 0.1s; }
    .reveal-card-anim:nth-child(2) { animation-delay: 0.2s; }
    .reveal-card-anim:nth-child(3) { animation-delay: 0.3s; }
    .reveal-card-anim:nth-child(4) { animation-delay: 0.4s; }
    .reveal-card-anim:nth-child(5) { animation-delay: 0.5s; }
    .reveal-card-anim:nth-child(6) { animation-delay: 0.6s; }
    .reveal-card-anim:nth-child(7) { animation-delay: 0.7s; }
    .reveal-card-anim:nth-child(8) { animation-delay: 0.8s; }
    .reveal-card-anim:nth-child(9) { animation-delay: 0.9s; }
    .reveal-card-anim:nth-child(10) { animation-delay: 1s; }

    @keyframes cardReveal {
      from { 
        transform: scale(0.5) translateY(100px) rotateY(180deg); 
        opacity: 0;
      }
      to { 
        transform: scale(1) translateY(0) rotateY(0); 
        opacity: 1;
      }
    }
  `]
})
export class GachaHubComponent implements OnInit {
  gachaService = inject(GachaService);

  allPlayers = signal<CollectiblePlayer[]>([]);
  pullResults = signal<CollectiblePlayer[]>([]);
  isPulling = signal(false);
  showReveal = signal(false);

  ngOnInit() {
    this.gachaService.getPlayers().subscribe(players => this.allPlayers.set(players));
    this.gachaService.getCollection().subscribe();
  }

  onPull(count: 1 | 10) {
    this.isPulling.set(true);
    this.gachaService.pull(count).subscribe({
      next: (res) => {
        this.pullResults.set(res.results);
        this.showReveal.set(true);
        this.isPulling.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isPulling.set(false);
        // Toast notification would be good here
      }
    });
  }

  isOwned(playerId: number): boolean {
    return this.gachaService.collection().some(c => c.collectible_player_id === playerId);
  }

  getOwnedCount(playerId: number): number {
    const item = this.gachaService.collection().find(c => c.collectible_player_id === playerId);
    return item ? item.count : 0;
  }

  closeReveal() {
    this.showReveal.set(false);
    this.pullResults.set([]);
  }
}
