import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfile } from '../../../core/models/user.model';
import { FlagIconComponent } from '../ui/flag-icon/flag-icon.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPuzzlePiece } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-user-hovercard',
  standalone: true,
  imports: [CommonModule, FlagIconComponent, NgIcon],
  providers: [
    provideIcons({
      heroPuzzlePiece,
    })
  ],
  template: `
    <div class="p-4 w-80 overflow-hidden zoom-in">
      @if (user()) {
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <a 
                [href]="'/user/' + user()!.username" 
                target="_blank"
                class="text-lg truncate hover:underline flex items-center gap-2"
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
        <div class="flex items-center justify-start gap-2 mb-4 px-1">
          @for (type of ratingTypes; track type.id) {
            <div class="flex items-center gap-1.5" [title]="type.label">
              <ng-icon [name]="type.icon" class="text-base text-muted"></ng-icon>
              <span class="text-xs text-muted">Tactics:</span>
              <span class="text-sm/6 font-semibold">
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
      } @else {
        <div class="flex flex-col gap-3 ">
          <div class="h-6 w-32 bg-subtle rounded-lg"></div>
          <div class="flex items-center justify-between mb-1">
            <div class="h-6 w-14 bg-subtle rounded-lg"></div>
          </div>
          <div class="h-4 w-48 bg-subtle rounded-lg"></div>
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

  ratingTypes: { id: 'tactics', icon: string, label: string }[] = [
    { id: 'tactics', icon: 'heroPuzzlePiece', label: 'Tactics' },
  ];

  joinedDate = computed(() => {
    const userData = this.user();
    if (!userData?.createdAt) return '';
    const date = new Date(userData.createdAt);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  getRating(typeId: 'tactics'): number {
    const userData = this.user();
    if (!userData) return 1500;
    return userData.progress?.puzzleRating || 1500;
  }
}


