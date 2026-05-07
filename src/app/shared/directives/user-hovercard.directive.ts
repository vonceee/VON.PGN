import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  PLATFORM_ID,
  input,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { UserHovercardComponent } from '../components/user-hovercard/user-hovercard.component';
import { UserService } from '../../core/services/user.service';
import { Subject, timer, of } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfile } from '../../core/models/user.model';

@Directive({
  selector: '[appUserHovercard]',
  standalone: true,
})
export class UserHovercardDirective implements OnDestroy {
  username = input.required<string>({ alias: 'appUserHovercard' });
  disableClick = input(false);

  private overlay = inject(Overlay);
  private elementRef = inject(ElementRef);
  private userService = inject(UserService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(this.platformId);
  private overlayRef: OverlayRef | null = null;
  private visibility$ = new Subject<boolean>();

  constructor() {
    this.visibility$
      .pipe(
        takeUntilDestroyed(),
        switchMap((visible) => 
          visible 
            ? timer(400).pipe(map(() => true)) 
            : timer(200).pipe(map(() => false))
        )
      )
      .subscribe((visible) => {
        if (visible) {
          this.show();
        } else {
          this.performHide();
        }
      });
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.visibility$.next(true);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.visibility$.next(false);
  }

  @HostListener('click')
  onClick() {
    if (this.disableClick()) return;
    if (this.username()) {
      window.open(`/user/${this.username()}`, '_blank');
    }
  }

  private show() {
    if (!this.isBrowser || this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
          offsetY: -8,
        },
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: 8,
        },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: false,
    });

    // Listen for mouse events on the overlay element itself
    this.overlayRef.overlayElement.addEventListener('mouseenter', () => {
      this.visibility$.next(true);
    });
    this.overlayRef.overlayElement.addEventListener('mouseleave', () => {
      this.visibility$.next(false);
    });

    const portal = new ComponentPortal(UserHovercardComponent);
    const componentRef = this.overlayRef.attach(portal);

    // Fetch user data
    this.userService.getUserProfileByUsername(this.username())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user: UserProfile) => {
          componentRef.instance.userData = user;
          componentRef.changeDetectorRef.detectChanges();
        },
        error: () => {
          this.performHide();
        }
      });
  }

  private performHide() {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  private hide() {
    this.visibility$.next(false);
  }

  ngOnDestroy() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }
  }
}
