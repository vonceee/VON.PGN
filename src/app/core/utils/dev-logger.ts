import { isDevMode } from '@angular/core';
import { environment } from '../../../environments/environment';

export class DevLogger {
  static log(message?: any, ...optionalParams: any[]) {
    if (!environment.production || isDevMode()) {
      console.log(message, ...optionalParams);
    }
  }

  static warn(message?: any, ...optionalParams: any[]) {
    if (!environment.production || isDevMode()) {
      console.warn(message, ...optionalParams);
    }
  }

  static error(message?: any, ...optionalParams: any[]) {
    console.error(message, ...optionalParams);
  }

  static debug(message?: any, ...optionalParams: any[]) {
    if (!environment.production || isDevMode()) {
      console.debug(message, ...optionalParams);
    }
  }
}
