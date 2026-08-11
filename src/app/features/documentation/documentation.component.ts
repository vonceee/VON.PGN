import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
  ],
  templateUrl: './documentation.component.html',
})
export class DocumentationComponent {
  private router = inject(Router);
  activeSection = 'getting-started';

  sections = [
    { title: 'Getting Started', id: 'getting-started' },
    { title: 'Core Concepts', id: 'core-concepts' },
    { title: 'Layout Architecture', id: 'layout-architecture' },
    { title: 'Account Management', id: 'account-management' },
    { title: 'Service Downtime', id: 'service-downtime' },
    { title: 'API Reference', id: 'api-reference' }
  ];

  constructor() {
    // Initialize active section from current URL
    this.updateActiveSection(this.router.url);

    // Listen for route changes to update active section
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.updateActiveSection(event.urlAfterRedirects);
    });
  }

  private updateActiveSection(url: string) {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1].split('#')[0].split('?')[0];
    if (this.sections.some(s => s.id === lastPart)) {
      this.activeSection = lastPart;
    }
  }

  scrollTo(sectionId: string) {
    this.activeSection = sectionId;
    this.router.navigate(['/documentation', sectionId]);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
