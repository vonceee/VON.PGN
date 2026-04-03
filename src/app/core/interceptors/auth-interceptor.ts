import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // First check for pending Google token from callback (available immediately)
  // This works during SSR/hydration before localStorage is ready
  let token = authService.pendingGoogleToken();
  
  // Fall back to localStorage if no pending token
  if (!token) {
    try {
      token = localStorage.getItem('chess_auth_token');
    } catch (e) {
      // localStorage not available
    }
  }

  if (token && req.url.startsWith(environment.apiUrl)) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(clonedRequest);
  }

  return next(req);
};
