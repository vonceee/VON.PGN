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

@Component({
  selector: 'app-add-collaborator-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, UserHovercardDirective],
  template: `
    <div class="bg-main rounded-4xl shadow-xl w-full max-w-xl p-8 font-sans space-y-8 relative">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl text-content">Add collaborator</h2>
      </div>

      <div class="space-y-4">
        <div class="space-y-1">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="type username..."
            class="w-full px-4 py-2 bg-subtle rounded-xl text-sm outline-none placeholder:text-muted"
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
                class="w-full flex items-center p-3 px-4 rounded-xl hover:bg-surface text-left group"
                [class.bg-accent]="selectedUser()?.uid === user.uid"
              >
                <div class="flex flex-col">
                  <span 
                    class="text-sm font-semibold text-content group-hover:text-accent"
                    [appUserHovercard]="user.username"
                    [disableClick]="true"
                  >{{ user.username }}</span>
                  <span class="text-xs text-muted">{{ user.displayName || user.username }}</span>
                </div>
              </button>
            }
          } @else if (searchQuery().length >= 2) {
            <div class="flex flex-col items-center justify-center py-8 text-muted">
              <span class="text-sm italic">No users found matching "{{ searchQuery() }}"</span>
            </div>
          }
        </div>
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
          Add
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
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
