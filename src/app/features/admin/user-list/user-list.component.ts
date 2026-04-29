import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<any[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedRole = signal('all');

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    const params = {
      search: this.searchQuery(),
      role: this.selectedRole() !== 'all' ? this.selectedRole() : undefined,
    };

    this.adminService.getUsers(params).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loading.set(false);
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

  deleteUser(user: any) {
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.users.update(users => users.filter(u => u.id !== user.id));
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
