import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs/operators';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  if (req.headers.has('X-Silent') || req.headers.has('x-silent')) {
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Silent').delete('x-silent'),
    });
    return next(cleanReq);
  }

  const bypassUrls = ['/tv', '/game/active', '/ping'];
  const shouldBypass =
    bypassUrls.some(url => req.url.endsWith(url)) ||
    (req.method === 'PUT' && req.url.includes('/chapters/'));
  if (shouldBypass) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.start();

  return next(req).pipe(
    finalize(() => {
      loadingService.stop();
    })
  );
};
