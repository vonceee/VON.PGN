import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<any[]>([]);
  isLoading = signal(true);
  
  searchControl = new FormControl('');
  roleFilter = new FormControl('');

  private router = inject(Router);

  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUsers();
    }
  }

  loadUsers() {
    this.isLoading.set(true);
    
    // Clean params: only include defined values
    const rawParams: any = {
      search: this.searchControl.value,
      role: this.roleFilter.value || undefined,
    };
    
    const params: any = {};
    Object.keys(rawParams).forEach(key => {
      if (rawParams[key] !== undefined && rawParams[key] !== null && rawParams[key] !== '') {
        params[key] = rawParams[key];
      }
    });

    this.adminService.getUsers(params).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearch() {
    this.loadUsers();
  }

  toggleAdmin(user: any) {
    this.adminService.toggleAdmin(user.id).subscribe({
      next: (updatedUser) => {
        this.updateUserInList(updatedUser.data);
      }
    });
  }

  toggleOrganizer(user: any) {
    this.adminService.toggleOrganizer(user.id).subscribe({
      next: (updatedUser) => {
        this.updateUserInList(updatedUser.data);
      }
    });
  }

  viewProfile(uid: string) {
    this.router.navigate(['/profile', uid]);
  }

  editUser(uid: string) {
    this.router.navigate(['/admin/users/edit', uid]);
  }

  deleteUser(user: any) {
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
      this.adminService.deleteUser(user.uid).subscribe({
        next: () => {
          this.users.update(users => users.filter(u => u.uid !== user.uid));
        }
      });
    }
  }

  private updateUserInList(updatedUser: any) {
    this.users.update(users =>
      users.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
