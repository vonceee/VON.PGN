import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error-interceptor';
import { AuthService } from './core/services/auth.service';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, httpErrorInterceptor])),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      // initAuth() returns an Observable; Angular subscribes and waits for it
      // to complete before the first route is activated.
      return authService.initAuth();
    }),
    provideClientHydration(withEventReplay()),
  ],
};
