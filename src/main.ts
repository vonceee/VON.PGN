import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';

if (environment.production) {
  enableProdMode();
  // Suppress all console logs in production
  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.debug = () => {};
  window.console.info = () => {};
  // Keep console.error for critical runtime errors, 
  // or silence it if you want absolute silence.
  // window.console.error = () => {};
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
