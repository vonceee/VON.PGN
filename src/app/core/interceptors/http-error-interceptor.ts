import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DatabaseStatusService } from '../services/database-status.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const databaseStatusService = inject(DatabaseStatusService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearAuthWithoutRedirect();
        
        // Only navigate if we're in the browser AND the app has finished 
        // its initial auth check. This prevents aggressive redirects to 
        // /login during the bootstrap phase when a 401 might be temporary
        // or handled gracefully by initAuth().
        if (typeof window !== 'undefined' && authService.isInitialized()) {
          const returnUrl = router.url;
          router.navigate(['/login'], {
            queryParams: { returnUrl },
          });
        }
        return throwError(() => error);
      }

      // Check for connection refused (0) or gateway/routing/service unavailable errors (502, 503, 504)
      // Exclude generic 500 errors to prevent application bugs from locking the UI with the offline overlay
      const isServerOrConnectionError = 
        error.status === 0 || 
        error.status === 502 || 
        error.status === 503 || 
        error.status === 504;

      if (isServerOrConnectionError && req.url.includes('/api/')) {
        // Exclude the db-check endpoint itself from triggering the status to avoid loops
        if (!req.url.includes('/db-check')) {
          databaseStatusService.setOffline(true);
        }
      }

      return throwError(() => error);
    })
  );
};
