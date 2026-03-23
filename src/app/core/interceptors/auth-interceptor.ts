import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Inject our auth service to grab the token
  const authService = inject(AuthService);
  const token = authService.getToken();

  // 2. Only attach the VIP pass if we have a token AND the request goes to our API
  if (token && req.url.startsWith(environment.apiUrl)) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Send the modified request to Laravel
    return next(clonedRequest);
  }

  // 3. If no token OR requesting external APIs (like Lichess PGNs), just send the normal request
  return next(req);
};
