import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, filter, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Skip auth check on server to prevent incorrect redirects on refresh
  // (since localStorage is browser-only).
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // If initAuth() hasn't finished yet, wait for it before deciding.
  if (!authService.isInitialized()) {
    // Poll until isInitialized flips to true (initAuth runs at most once
    // during app bootstrap, so this resolves almost immediately).
    return new Promise<boolean>((resolve) => {
      const check = setInterval(() => {
        if (authService.isInitialized()) {
          clearInterval(check);
          if (authService.isAuthenticated()) {
            resolve(true);
          } else {
            router.navigate(['/login']);
            resolve(false);
          }
        }
      }, 50);
    });
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
