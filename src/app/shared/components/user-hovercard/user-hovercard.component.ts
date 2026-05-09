import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfile } from '../../../core/models/user.model';
import { ChessBoardComponent } from '../chess/chess-board/chess-board.component';
import { FlagIconComponent } from '../ui/flag-icon/flag-icon.component';

@Component({
  selector: 'app-user-hovercard',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FlagIconComponent],
  template: `
    <div class="ui-panel p-4 w-80 overflow-hidden animate-in fade-in zoom-in ">
      @if (user()) {
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <a 
                [href]="'/user/' + user()!.username" 
                target="_blank"
                class="text-lg font-extrabold text-content truncate hover:text-accent  flex items-center gap-2"
              >
                <app-flag-icon [countryCode]="user()!.country_code"></app-flag-icon>
                {{ user()!.username }}
              </a>
              <div 
                class="w-2.5 h-2.5 rounded-full"
                [class.bg-green-500]="user()!.is_online"
                [class.bg-muted/30]="!user()!.is_online"
                [title]="user()!.is_online ? 'Online' : 'Offline'"
              ></div>
            </div>
            <span class="text-xs text-muted font-medium uppercase tracking-wider">
              {{ user()!.displayName || 'Chess Enthusiast' }}
            </span>
          </div>
          @if (user()!.verified_organizer) {
            <div class="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-widest">
              Verified
            </div>
          }
        </div>

        <!-- Ratings Grid -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          @for (type of ratingTypes; track type.id) {
            <div class="flex flex-col items-center p-2 rounded-xl bg-subtle/50 border border-border-base/50">
              <span class="text-xs text-muted font-bold uppercase tracking-widest mb-1">
                {{ type.label }}
              </span>
              <span class="text-sm font-black text-content">
                {{ user()!.ratings?.[type.id]?.rating || 1500 }}
              </span>
            </div>
          }
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-4 mb-4 px-1 text-xs font-bold uppercase tracking-widest text-muted">
          <div class="flex items-center gap-1.5">
            <span>{{ user()!.followers_count }} Followers</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span>Joined {{ joinedDate() }}</span>
          </div>
        </div>

        <!-- Active Game Preview -->
        @if (user()!.active_game; as game) {
          <div class="mt-4 pt-4 border-t border-border-base/50">
            <div class="flex items-center justify-between mb-2 px-1">
              <span class="text-xs font-bold uppercase tracking-widest text-accent">Playing Now</span>
              <span class="text-xs text-muted">{{ game.time_control }}</span>
            </div>
            
            <div class="relative rounded-xl overflow-hidden border border-border-base/50 aspect-square w-full board-container-parent">
              <app-chess-board
                [fen]="game.fen"
                [interactive]="false"
                [orientation]="game.white_player.id === user()!.uid ? 'white' : 'black'"
                class="scale-105"
              ></app-chess-board>
              
              <!-- Opponent Overlay -->
              <div class="absolute bottom-0 left-0 right-0 p-2 bg-main/80 backdrop-blur-md border-t border-border-base/50 flex items-center justify-between">
                <span class="text-xs font-bold text-content truncate max-w-[120px]">
                  vs {{ game.white_player.id === user()!.uid ? game.black_player.name : game.white_player.name }}
                </span>
                <div class="flex items-center gap-1">
                  <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                  <span class="text-xs font-black uppercase text-accent">Live</span>
                </div>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="flex flex-col gap-3 animate-pulse">
          <div class="h-6 w-32 bg-subtle rounded-md"></div>
          <div class="grid grid-cols-3 gap-2">
            <div class="h-12 bg-subtle rounded-xl"></div>
            <div class="h-12 bg-subtle rounded-xl"></div>
            <div class="h-12 bg-subtle rounded-xl"></div>
          </div>
          <div class="h-4 w-48 bg-subtle rounded-md"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      pointer-events: auto;
      position: relative;
      z-index: 100;
    }
  `]
})
export class UserHovercardComponent {
  user = signal<UserProfile | null>(null);

  @Input() set userData(value: UserProfile | null) {
    this.user.set(value);
  }

  ratingTypes: { id: 'bullet' | 'blitz' | 'rapid', label: string }[] = [
    { id: 'bullet', label: 'Bullet' },
    { id: 'blitz', label: 'Blitz' },
    { id: 'rapid', label: 'Rapid' },
  ];

  joinedDate = computed(() => {
    const userData = this.user();
    if (!userData?.createdAt) return '';
    const date = new Date(userData.createdAt);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });
}
