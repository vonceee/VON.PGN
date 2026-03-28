import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for initAuth() to finish before checking admin status.
  if (!authService.isInitialized()) {
    return new Promise<boolean>((resolve) => {
      const check = setInterval(() => {
        if (authService.isInitialized()) {
          clearInterval(check);
          const user = authService.currentUser();
          if (user && user.is_admin) {
            resolve(true);
          } else {
            router.navigate(['/']);
            resolve(false);
          }
        }
      }, 50);
    });
  }

  const user = authService.currentUser();
  if (user && user.is_admin) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
