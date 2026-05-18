import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Skip auth check on server to prevent incorrect redirects on refresh
  // (since localStorage is browser-only).
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Wait for initAuth() to finish before checking admin status.
  if (!authService.isInitialized()) {
    return toObservable(authService.isInitialized).pipe(
      filter((init) => init),
      take(1),
      map(() => {
        const user = authService.currentUser();
        if (user && user.is_admin) {
          return true;
        } else {
          router.navigate(['/']);
          return false;
        }
      })
    );
  }

  const user = authService.currentUser();
  if (user && user.is_admin) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
