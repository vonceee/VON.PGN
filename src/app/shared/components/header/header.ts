import { Component, inject, signal, HostListener, ViewChild, ElementRef, AfterViewInit, OnDestroy, Renderer2 } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    '[class.header-hidden]': 'isHidden()',
    '[style.--header-height]': 'headerHeight',
    class: 'relative',
  },
})
export class Header implements AfterViewInit, OnDestroy {
  themeService = inject(ThemeService);
  userService = inject(UserService);
  authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private hostEl = inject(ElementRef);

  @ViewChild('profileContainer') profileContainer!: ElementRef;

  isProfileDropdownOpen = signal(false);
  isHidden = signal(false);
  headerHeight = '0px';

  private lastScrollTop = 0;
  private scrollThreshold = 10;
  private scrollContainer: HTMLElement | null = null;
  private scrollListener: (() => void) | null = null;

  ngAfterViewInit() {
    const headerEl = this.hostEl.nativeElement as HTMLElement;
    this.headerHeight = headerEl.offsetHeight + 'px';

    const parent = headerEl.parentElement;
    if (parent) {
      this.scrollContainer = parent.querySelector('main');
    }

    if (this.scrollContainer) {
      this.scrollListener = this.renderer.listen(this.scrollContainer, 'scroll', () => {
        this.onScroll();
      });
    }
  }

  ngOnDestroy() {
    if (this.scrollListener) {
      this.scrollListener();
    }
  }

  private onScroll() {
    if (!this.scrollContainer) return;

    const scrollTop = this.scrollContainer.scrollTop;

    if (scrollTop > this.lastScrollTop && scrollTop > 60) {
      this.isHidden.set(true);
    } else {
      this.isHidden.set(false);
    }

    this.lastScrollTop = scrollTop;
  }

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
