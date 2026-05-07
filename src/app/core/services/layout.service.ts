import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  isFluid = signal(false);

  setFluid(fluid: boolean) {
    this.isFluid.set(fluid);
  }
}
