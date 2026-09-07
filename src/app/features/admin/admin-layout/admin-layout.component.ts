import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  PLATFORM_ID,
  HostListener,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
} from '@angular/router';
import { filter, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

/**
 * AdminLayoutComponent provides the primary shell for administrative dashboards and tools.
 * 
 * WHY: Adopts a clean, modern collapsible sidebar layout for VON.CHESS administration,
 *      providing access to core administrative routes (Dashboard, Users, Courses,
 *      World Championships, Coach Profiles, and Academy Enrollments).
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  public user = this.authService.currentUser;
  public pageTitle = signal<string>('Dashboard Overview');
  public isCollapsed = signal<boolean>(false);
  public isMobileOpen = signal<boolean>(false);
  public userMenuOpen = signal<boolean>(false);

  /**
   * Computes the single letter initial for user avatars when no photo image is provided.
   */
  public userAvatarInitial = computed<string>(() => {
    const name = this.user()?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : 'A';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null)
      )
      .subscribe(() => {
        this.updatePageTitle();
        this.closeMobileSidebar();
      });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Restore sidebar state from LocalStorage
      const savedCollapsed = localStorage.getItem('gemini_admin_sidebar_collapsed');
      if (savedCollapsed !== null) {
        this.isCollapsed.set(savedCollapsed === 'true');
      }
    }
  }

  /**
   * Toggles the collapsed state of the desktop sidebar and persists the user preference.
   */
  public toggleSidebar(): void {
    const nextState = !this.isCollapsed();
    this.isCollapsed.set(nextState);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('gemini_admin_sidebar_collapsed', String(nextState));
    }
  }

  /**
   * Toggles the responsive mobile slide-over drawer.
   */
  public toggleSidebarMobile(): void {
    this.isMobileOpen.update((v) => !v);
  }

  /**
   * Closes the mobile slide-over drawer.
   */
  public closeMobileSidebar(): void {
    this.isMobileOpen.set(false);
  }

  /**
   * Toggles the user profile & settings dropdown popover.
   */
  public toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  /**
   * Closes the user profile menu when clicking outside.
   */
  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative') && this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  /**
   * Synchronizes the top header display title with the active route.
   */
  private updatePageTitle(): void {
    const url = this.router.url;
    if (url.includes('/admin/users')) {
      this.pageTitle.set('User Management');
    } else if (url.includes('/admin/courses')) {
      this.pageTitle.set('Course Management');
    } else if (url.includes('/admin/course/new')) {
      this.pageTitle.set('New Course Editor');
    } else if (url.includes('/admin/coaches')) {
      this.pageTitle.set('Coach Management');
    } else if (url.includes('/admin/coach/')) {
      this.pageTitle.set('Coach Editor');
    } else if (url.includes('/admin/academy-enrollments')) {
      this.pageTitle.set('Academy Enrollments');
    } else if (url.includes('/admin/world-championships-editor/new')) {
      this.pageTitle.set('New Championship Matchup');
    } else if (url.includes('/admin/world-championships-editor/')) {
      this.pageTitle.set('Edit Championship Matchup');
    } else if (url.includes('/admin/world-championships-editor')) {
      this.pageTitle.set('World Championships');
    } else {
      this.pageTitle.set('Dashboard Overview');
    }
  }

  /**
   * Signs the current administrative user out of the platform.
   */
  public logout(): void {
    this.authService.logout();
  }
}
