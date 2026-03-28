import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, filter, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

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
