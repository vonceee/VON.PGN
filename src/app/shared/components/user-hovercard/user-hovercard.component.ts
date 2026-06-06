import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfile } from '../../../core/models/user.model';
import { ChessBoardComponent } from '../chess/chess-board/chess-board.component';
import { FlagIconComponent } from '../ui/flag-icon/flag-icon.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroRocketLaunch, heroBolt, heroClock, heroPuzzlePiece } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-user-hovercard',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, FlagIconComponent, NgIcon],
  providers: [
    provideIcons({
      heroRocketLaunch,
      heroBolt,
      heroClock,
      heroPuzzlePiece,
    })
  ],
  template: `
    <div class="ui-panel p-4 w-80 overflow-hidden zoom-in">
      @if (user()) {
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <a 
                [href]="'/user/' + user()!.username" 
                target="_blank"
                class="text-lg text-content truncate hover:underline flex items-center gap-2"
              >
                {{ user()!.username }}
                <app-flag-icon [countryCode]="user()!.country_code" shape="circle"></app-flag-icon>
              </a>
              <div 
                class="w-2.5 h-2.5 rounded-full"
                [class.bg-green-500]="user()!.is_online"
                [class.bg-muted/30]="!user()!.is_online"
                [title]="user()!.is_online ? 'Online' : 'Offline'"
              ></div>
            </div>
          </div>
        </div>

        <!-- Ratings Grid -->
        <div class="flex items-center justify-between gap-2 mb-4 px-1">
          @for (type of ratingTypes; track type.id) {
            <div class="flex items-center gap-1.5" [title]="type.label">
              <ng-icon [name]="type.icon" class="text-base text-muted"></ng-icon>
              <span class="text-sm font-semibold text-content">
                {{ getRating(type.id) }}
              </span>
            </div>
          }
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-4 px-1 text-xs font-semibold capitalize">
          <div class="flex items-center gap-1.5">
            <span>Joined {{ joinedDate() }}</span>
          </div>
        </div>

        <!-- Active Game Preview -->
        @if (user()!.active_game; as game) {
          <div class="mt-4 pt-4 border-t border-border-base/50">
            <div class="flex items-center justify-between mb-2 px-1">
              <span class="text-xs font-semibold capitalize">Playing Now</span>
              <span class="text-xs ">{{ game.time_control }}</span>
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
                <span class="text-xs font-semibold text-content truncate max-w-[120px]">
                  vs {{ game.white_player.id === user()!.uid ? game.black_player.name : game.white_player.name }}
                </span>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="flex flex-col gap-3 ">
          <div class="h-6 w-32 bg-subtle rounded-md"></div>
          <div class="flex items-center justify-between mb-1">
            <div class="h-6 w-14 bg-subtle rounded-md"></div>
            <div class="h-6 w-14 bg-subtle rounded-md"></div>
            <div class="h-6 w-14 bg-subtle rounded-md"></div>
            <div class="h-6 w-14 bg-subtle rounded-md"></div>
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

  ratingTypes: { id: 'bullet' | 'blitz' | 'rapid' | 'tactics', icon: string, label: string }[] = [
    { id: 'bullet', icon: 'heroRocketLaunch', label: 'Bullet' },
    { id: 'blitz', icon: 'heroBolt', label: 'Blitz' },
    { id: 'rapid', icon: 'heroClock', label: 'Rapid' },
    { id: 'tactics', icon: 'heroPuzzlePiece', label: 'Tactics' },
  ];

  joinedDate = computed(() => {
    const userData = this.user();
    if (!userData?.createdAt) return '';
    const date = new Date(userData.createdAt);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  getRating(typeId: 'bullet' | 'blitz' | 'rapid' | 'tactics'): number {
    const userData = this.user();
    if (!userData) return 1500;

    if (typeId === 'tactics') {
      return userData.progress?.puzzleRating || 1500;
    }

    return userData.ratings?.[typeId]?.rating || 1500;
  }
}


