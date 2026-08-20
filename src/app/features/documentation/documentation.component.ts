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
  activeSubtopic = '';

  sections = [
    {
      title: 'Getting Started',
      id: 'getting-started',
      subtopics: [
        { title: 'Create Account', id: 'create-account' },
        { title: 'Verify Email', id: 'verify-email' },
        { title: 'Set up Profile', id: 'setup-profile' },
        { title: 'Find a Game', id: 'find-game' }
      ]
    },
    {
      title: 'Core Concepts',
      id: 'core-concepts',
      subtopics: [
        { title: 'Collaborative Studies', id: 'collaborative-studies' },
        { title: 'Opening Drills', id: 'opening-drills' },
        { title: 'World Championships Database', id: 'world-championships-database' }
      ]
    },
    {
      title: 'Layout Architecture',
      id: 'layout-architecture',
      subtopics: [
        { title: 'Main Layout Shell', id: 'layout-shell' },
        { title: 'Dynamic Footer Visibility', id: 'footer-visibility' },
        { title: 'Fluid Layout System', id: 'fluid-layout' }
      ]
    },
    {
      title: 'UI Components',
      id: 'ui-components',
      subtopics: [
        { title: 'Tailwind Buttons', id: 'buttons' },
        { title: 'Badges', id: 'badges' },
        { title: 'Toggles', id: 'toggles' },
        { title: 'Input Fields', id: 'inputs' },
        { title: 'Floating Cursor', id: 'floating-cursor' }
      ]
    },
    {
      title: 'Account Management',
      id: 'account-management',
      subtopics: [
        { title: 'Account Registration Flow', id: 'registration-flow' },
        { title: 'Input Validation Rules', id: 'validation-rules' }
      ]
    },
    {
      title: 'Service Downtime',
      id: 'service-downtime',
      subtopics: [
        { title: 'Worker-level Fallback', id: 'worker-fallback' },
        { title: 'Graceful Client Overlay', id: 'client-overlay' }
      ]
    },
    {
      title: 'API Reference',
      id: 'api-reference',
      subtopics: [
        { title: 'Core Endpoints', id: 'core-endpoints' },
        { title: 'Sample JSON Response', id: 'sample-response' }
      ]
    }
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
    this.activeSubtopic = '';
    this.router.navigate(['/documentation', sectionId]).then(() => {
      if (typeof window !== 'undefined') {
        const scrollContainer = document.querySelector('main.flex-1');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  }

  scrollToSubtopic(sectionId: string, subtopicId: string) {
    this.activeSubtopic = subtopicId;
    if (this.activeSection !== sectionId) {
      this.activeSection = sectionId;
      this.router.navigate(['/documentation', sectionId]).then(() => {
        setTimeout(() => {
          this.scrollToElement(subtopicId);
        }, 100);
      });
    } else {
      this.scrollToElement(subtopicId);
    }
  }

  private scrollToElement(elementId: string) {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
