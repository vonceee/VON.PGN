import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Inject our auth service to grab the token
  const authService = inject(AuthService);
  const token = authService.getToken();

  // 2. If we have a token, clone the request and attach the VIP pass
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Send the modified request to Laravel
    return next(clonedRequest);
  }

  // 3. If no token (like when logging in), just send the normal request
  return next(req);
};
