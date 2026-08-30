import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  const token = authService.getToken();

  const publicPaths = [
    '/courses',
    '/tactics/next',
    '/activity-logs',
  ];

  const relativeUrl = req.url.replace(environment.apiUrl, '');
  const isPublicPath = publicPaths.some(path => relativeUrl.startsWith(path));

  if (token && req.url.startsWith(environment.apiUrl) && !isPublicPath) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(clonedRequest);
  }

  return next(req);
};
