import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header, FooterComponent } from '@shared/layout';
import { LayoutService } from '../../../../core/services/layout.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { BughouseQueueComponent } from '../../../../features/bughouse/components/bughouse-queue/bughouse-queue.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Header, FooterComponent, CommonModule, BughouseQueueComponent],
  templateUrl: './main-layout.html',
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
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects.split('?')[0].split('#')[0];
        const isHome = url === '/' || url === '/home';
        this.showFooter.set(isHome);
      });
  }
}
