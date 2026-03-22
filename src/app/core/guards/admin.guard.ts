import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Allow if user is known to be admin. If not, redirect to home.
  // Note: If currentUser is null on refresh but token exists, 
  // you might need to wait for profile fetch. For simplicity, we check currentUser.
  const user = authService.currentUser();
  if (user && user.is_admin) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
