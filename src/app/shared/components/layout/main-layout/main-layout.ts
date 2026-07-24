import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header, FooterComponent } from '@shared/layout';
import { LayoutService } from '../../../../core/services/layout.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Header, FooterComponent, CommonModule],
  template: `
    <div class="h-screen w-full flex flex-col">
      <app-header class="w-full shrink-0 z-50"></app-header>
      <main class="flex-1 overflow-y-auto w-full relative">
        <div class="flex flex-col min-h-full">
          <div 
            class="w-full flex-1 mx-auto relative"
            [ngClass]="layoutService.isFluid() ? 'max-w-[1800px]' : 'max-w-7xl'"
          >
            <router-outlet></router-outlet>
          </div>
          <app-footer *ngIf="showFooter()" class="w-full shrink-0"></app-footer>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        width: 100%;
      }
    `,
  ],
})
export class MainLayoutComponent {
  public layoutService = inject(LayoutService);
  private router = inject(Router);
  public showFooter = signal(true);

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = event.urlAfterRedirects.split('?')[0];

      const isTactics = url.startsWith('/tactics/');
      const isStudy = url.includes('/study/');

      const hideFooter = isTactics || isStudy;
      this.showFooter.set(!hideFooter);
    });
  }
}
