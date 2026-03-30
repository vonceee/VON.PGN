import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './documentation.component.html',
})
export class DocumentationComponent {
  activeSection = 'getting-started';

  sections = [
    {
      title: 'Getting Started',
      id: 'getting-started',
      content: 'Welcome to the vonchess documentation. Here you can find all the information you need to get started with our platform.'
    },
    {
      title: 'Core Concepts',
      id: 'core-concepts',
      content: 'Learn about the core concepts of vonchess, including our ranking system, matchmaking, and gameplay mechanics.'
    },
    {
      title: 'Account Management',
      id: 'account-management',
      content: 'Manage your profile, handle account settings, and customize your playing experience.'
    },
    {
      title: 'API Reference',
      id: 'api-reference',
      content: 'Detailed documentation for developers who want to integrate with the vonchess API.'
    }
  ];

  scrollTo(sectionId: string) {
    this.activeSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      // Offset by roughly header height (if exists) or purely smooth scroll. Let scroll-mt handle the offset css.
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Simple scroll spy setup
  @HostListener('window:scroll')
  onScroll() {
    let current = this.sections[0].id;
    for (const section of this.sections) {
      const element = document.getElementById(section.id);
      if (element) {
        const top = element.getBoundingClientRect().top;
        // If the top of the section is near the middle/top of the viewport
        if (top <= 100) {
          current = section.id;
        }
      }
    }
    this.activeSection = current;
  }
}
