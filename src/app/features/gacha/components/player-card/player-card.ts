import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectiblePlayer } from '../../../../core/services/gacha';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="player-card" 
      [class]="player.rarity.toLowerCase()"
      [class.is-owned]="isOwned"
    >
      <div class="holographic-overlay" *ngIf="player.rarity === 'Legendary' || player.rarity === 'Epic'"></div>
      <div class="card-glow"></div>
      
      <div class="player-image-container">
        <img 
          [src]="player.image_url || 'assets/images/default-avatar.png'" 
          [alt]="player.name"
          class="player-image"
        >
      </div>

      <div class="card-content">
        <div class="rarity-badge">{{ player.rarity }}</div>
        
        <div class="player-info">
          <div class="title-name">
            <span *ngIf="player.title" class="player-title">{{ player.title }}</span>
            <span class="player-name">{{ player.name }}</span>
          </div>
          
          <div class="tcg-stats">
            <div class="stat-item atk" title="Blitz Power">
              <span class="stat-value">{{ getAtk() }}</span>
              <span class="stat-label">ATK</span>
            </div>
            <div class="stat-item def" title="Standard Resilience">
              <span class="stat-value">{{ getDef() }}</span>
              <span class="stat-label">DEF</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="bio-snippet" *ngIf="player.bio">
            {{ player.bio }}
          </div>
        </div>
      </div>
      
      <div *ngIf="count > 1" class="card-count">x{{ count }}</div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      perspective: 1000px;
    }

    .player-card {
      position: relative;
      width: 100%;
      aspect-ratio: 2.5/3.5;
      border-radius: 1rem;
      overflow: hidden;
      background: var(--color-surface);
      border: 1px solid var(--color-border-base);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      cursor: pointer;
    }

    .player-card:hover {
      transform: translateY(-10px) rotateY(5deg);
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }

    .card-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .player-card:hover .card-glow {
      opacity: 1;
    }

    .card-content {
      position: relative;
      z-index: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 1.25rem;
      background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%);
    }

    .rarity-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.25rem 0.5rem;
      border-radius: 0.5rem;
      letter-spacing: 0.05em;
      z-index: 10;
    }

    .player-image-container {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
    }

    .player-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .player-info {
      text-align: left;
      margin-bottom: 0.5rem;
      z-index: 2;
    }

    .holographic-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(135deg, 
        rgba(255,255,255,0) 0%, 
        rgba(255,255,255,0.1) 45%, 
        rgba(255,255,255,0.3) 50%, 
        rgba(255,255,255,0.1) 55%, 
        rgba(255,255,255,0) 100%);
      background-size: 200% 200%;
      animation: holo-shine 4s linear infinite;
      pointer-events: none;
      mix-blend-mode: overlay;
    }

    @keyframes holo-shine {
      0% { background-position: -200% -200%; }
      100% { background-position: 200% 200%; }
    }

    .tcg-stats {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1;
    }

    .stat-value {
      font-size: 1.1rem;
      font-weight: 900;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    .stat-label {
      font-size: 0.5rem;
      font-weight: 800;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.05em;
    }

    .atk .stat-value { color: #f87171; } /* Red for Attack */
    .def .stat-value { color: #60a5fa; } /* Blue for Defense */

    .card-footer {
      z-index: 2;
    }

    .bio-snippet {
      font-size: 0.6rem;
      color: rgba(255,255,255,0.4);
      line-height: 1.2;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-align: right;
      font-style: italic;
    }

    .title-name {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
    }

    .player-title {
      font-size: 0.7rem;
      font-weight: 800;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .player-name {
      font-size: 1.25rem;
      font-weight: 900;
      color: white;
      line-height: 1.1;
      margin-top: 0.125rem;
    }

    .card-count {
      position: absolute;
      bottom: -0.5rem;
      right: -0.5rem;
      background: var(--color-accent);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 1rem;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }

    /* Rarity Styles */
    .common { border-color: rgba(148, 163, 184, 0.5); }
    .common .rarity-badge { background: #94a3b8; color: white; }

    .rare { border-color: rgba(59, 130, 246, 0.6); }
    .rare .rarity-badge { background: #3b82f6; color: white; }
    .rare .player-name { color: #93c5fd; }

    .epic { border-color: rgba(168, 85, 247, 0.8); box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
    .epic .rarity-badge { background: #a855f7; color: white; }
    .epic .player-name { color: #d8b4fe; }

    .legendary { 
      border-color: #f59e0b; 
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.4);
    }
    .legendary .rarity-badge { 
      background: linear-gradient(90deg, #f59e0b, #fbbf24); 
      color: #1e293b; 
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }
    .legendary .player-name { 
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    /* Locked state */
    .player-card:not(.is-owned) {
      filter: grayscale(1) contrast(0.8);
      opacity: 0.5;
    }
    .player-card:not(.is-owned):hover {
      filter: grayscale(0.5) contrast(0.9);
      opacity: 0.8;
    }
  `]
})
export class PlayerCardComponent {
  @Input({ required: true }) player!: CollectiblePlayer;
  @Input() isOwned: boolean = false;
  @Input() count: number = 0;

  getAtk(): number {
    // Attack derived from Blitz rating
    if (this.player.stats) {
      try {
        const stats = typeof this.player.stats === 'string' ? JSON.parse(this.player.stats) : this.player.stats;
        return stats.blitz || 1500;
      } catch (e) { }
    }
    return 1500;
  }

  getDef(): number {
    // Defense derived from Standard rating
    if (this.player.stats) {
      try {
        const stats = typeof this.player.stats === 'string' ? JSON.parse(this.player.stats) : this.player.stats;
        return stats.standard || stats.rapid || 1500;
      } catch (e) { }
    }
    return 1500;
  }
}
