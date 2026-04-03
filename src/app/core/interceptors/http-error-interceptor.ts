import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearAuthWithoutRedirect();
        // Only navigate in browser context to avoid SSR issues
        if (typeof window !== 'undefined') {
          const returnUrl = router.url;
          router.navigate(['/login'], {
            queryParams: { returnUrl },
          });
        }
        return throwError(() => error);
      }
      return throwError(() => error);
    })
  );
};
