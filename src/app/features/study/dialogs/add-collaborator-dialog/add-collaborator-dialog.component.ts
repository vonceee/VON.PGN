import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { UserService, UserSearchResult } from '../../../../core/services/user.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserHovercardDirective } from '@shared/directives';

export interface AddMemberResult {
  user: UserSearchResult;
  role: 'member' | 'collaborator';
}

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, UserHovercardDirective],
  template: `
    <div class="bg-main rounded-4xl shadow-xl w-full max-w-xl p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-content">Add study member</h2>
      </div>

      <div class="space-y-6">
        <div class="space-y-1">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="type username..."
            class="w-full px-4 py-2 bg-subtle rounded-xl text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/20 border border-transparent focus:border-accent transition-all"
            autofocus
          />
        </div>

        <!-- Search Results -->
        <div class="min-h-[160px] max-h-[220px] overflow-y-auto custom-scrollbar space-y-1 border border-border-base/30 rounded-2xl p-2 bg-subtle/20">
          @if (isSearching()) {
            <div class="flex items-center justify-center py-8">
              <div class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          } @else if (results().length > 0) {
            @for (user of results(); track user.uid) {
              <button
                (click)="selectUser(user)"
                class="w-full flex items-center justify-between p-2.5 px-4 rounded-xl text-left group transition-all"
                [class.bg-accent]="selectedUser()?.uid === user.uid"
                [class.hover:bg-surface]="selectedUser()?.uid !== user.uid"
              >
                <div class="flex flex-col">
                  <span 
                    class="text-sm font-semibold text-content group-hover:text-accent"
                    [class.!text-white]="selectedUser()?.uid === user.uid"
                    [appUserHovercard]="user.username"
                    [disableClick]="true"
                  >{{ user.username }}</span>
                  <span class="text-xs text-muted" [class.!text-white/80]="selectedUser()?.uid === user.uid">{{ user.displayName || user.username }}</span>
                </div>

                @if (selectedUser()?.uid === user.uid) {
                  <svg class="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                }
              </button>
            }
          } @else if (searchQuery().length >= 2) {
            <div class="flex flex-col items-center justify-center py-8 text-muted">
              <span class="text-sm italic">No users found matching "{{ searchQuery() }}"</span>
            </div>
          } @else {
            <div class="flex flex-col items-center justify-center py-8 text-muted">
              <span class="text-xs italic">Start typing to search users</span>
            </div>
          }
        </div>

        <!-- Role Dropdown Selection (Only visible when user is selected) -->
        @if (selectedUser()) {
          <div class="space-y-2.5 p-4.5 bg-subtle/50 rounded-2xl border border-border-base/50 transition-all">
            <label class="text-[11px] font-bold text-muted uppercase tracking-wider block">Assign Role</label>
            <div class="relative">
              <select
                [ngModel]="selectedRole()"
                (ngModelChange)="selectedRole.set($event)"
                class="w-full px-4 py-2.5 bg-main border border-border-base rounded-xl text-sm font-medium text-content outline-none cursor-pointer appearance-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                <option value="member">Member (View Only / Follow Tutor)</option>
                <option value="collaborator">Collaborator (Can Edit / Co-Tutor)</option>
              </select>
              <!-- custom arrow icon -->
              <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="pt-4 flex gap-4 w-full">
        <button
          appButton
          (click)="dialogRef.close()"
          class="flex-1"
        >
          <span>Cancel</span>
        </button>
        <button
          appButton
          variant="primary"
          class="flex-1"
          (click)="onSubmit()"
          [disabled]="!selectedUser()"
        >
          Add to Study
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--accent);
    }
  `]
})
export class AddMemberDialogComponent {
  dialogRef = inject(DialogRef<AddMemberResult>);
  private userService = inject(UserService);

  searchQuery = signal('');
  results = signal<UserSearchResult[]>([]);
  isSearching = signal(false);
  selectedUser = signal<UserSearchResult | null>(null);
  selectedRole = signal<'member' | 'collaborator'>('member');

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      takeUntilDestroyed(),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        if (this.searchQuery().length >= 2) {
          this.isSearching.set(true);
        } else {
          this.results.set([]);
        }
      }),
      switchMap(query => {
        if (query.length < 2) return [[]];
        return this.userService.searchUsers(query);
      })
    ).subscribe({
      next: (users) => {
        this.results.set(users);
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
        this.results.set([]);
      }
    });
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
    if (this.selectedUser()?.username !== query) {
      this.selectedUser.set(null);
    }
  }

  selectUser(user: UserSearchResult) {
    this.selectedUser.set(user);
    this.searchQuery.set(user.username);
  }

  onSubmit() {
    const user = this.selectedUser();
    if (user) {
      this.dialogRef.close({
        user,
        role: this.selectedRole()
      });
    }
  }
}
