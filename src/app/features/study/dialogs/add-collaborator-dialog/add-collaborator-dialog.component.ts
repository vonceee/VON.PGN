import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { DialogWrapperComponent } from '../../../../shared/components/ui/dialog-wrapper/dialog-wrapper.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { UserService, UserSearchResult } from '../../../../core/services/user.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserHovercardDirective } from '@shared/directives';

@Component({
  selector: 'app-add-collaborator-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogWrapperComponent, ButtonComponent, UserHovercardDirective],
  template: `
    <div class="block max-w-md w-[90vw] mx-auto">
      <app-dialog-wrapper title="Add Collaborator" (close)="dialogRef.close()">
        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-muted">Search User</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Type username..."
              class="w-full px-4 py-2 bg-subtle border border-base rounded-xl text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none placeholder:text-muted dark:text-content transition-all"
              autofocus
            />
          </div>

          <!-- Search Results -->
          <div class="min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
            @if (isSearching()) {
              <div class="flex items-center justify-center py-8">
                <div class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            } @else if (results().length > 0) {
              @for (user of results(); track user.uid) {
                <button
                  (click)="selectUser(user)"
                  class="w-full flex items-center p-3 px-4 rounded-xl hover:bg-surface transition-all text-left group"
                  [class.bg-accent/10]="selectedUser()?.uid === user.uid"
                >
                  <div class="flex flex-col">
                    <span 
                      class="text-sm font-bold text-content group-hover:text-accent transition-colors"
                      [appUserHovercard]="user.username"
                    >{{ user.username }}</span>
                    <span class="text-xs text-muted">{{ user.displayName || user.username }}</span>
                  </div>
                </button>
              }
            } @else if (searchQuery().length >= 2) {
              <div class="flex flex-col items-center justify-center py-8 text-muted">
                <span class="text-sm italic">No users found matching "{{ searchQuery() }}"</span>
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center py-8 text-muted">
                <span class="text-xs text-center px-8">Start typing to search for users to invite as collaborators.</span>
              </div>
            }
          </div>
        </div>

        <div actions class="flex justify-end gap-2">
          <button appButton variant="outline" (click)="dialogRef.close()">Cancel</button>
          <button 
            appButton 
            variant="primary" 
            (click)="onSubmit()" 
            [disabled]="!selectedUser()"
          >
            Add Collaborator
          </button>
        </div>
      </app-dialog-wrapper>
    </div>
  `,
})
export class AddCollaboratorDialogComponent {
  dialogRef = inject(DialogRef<UserSearchResult>);
  private userService = inject(UserService);
  
  searchQuery = signal('');
  results = signal<UserSearchResult[]>([]);
  isSearching = signal(false);
  selectedUser = signal<UserSearchResult | null>(null);

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
      this.dialogRef.close(user);
    }
  }
}
