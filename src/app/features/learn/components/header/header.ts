import { Component, inject, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../../core/services/theme.service';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  themeService = inject(ThemeService);
  userService = inject(UserService);
  authService = inject(AuthService);

  @ViewChild('profileContainer') profileContainer!: ElementRef;

  isProfileDropdownOpen = signal(false);

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((v) => !v);
  }

  logout() {
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (
      this.isProfileDropdownOpen() &&
      this.profileContainer &&
      !this.profileContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isProfileDropdownOpen.set(false);
    }
  }
}
