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
  templateUrl: './add-collaborator-dialog.component.html',
  styles: [`
    :host {
      display: block;
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
        role: 'member'
      });
    }
  }
}
