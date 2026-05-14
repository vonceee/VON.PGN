import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';


interface ChangelogEntry {
  date: string;
  title: string;
  category: 'New Feature' | 'Improvement' | 'Bug Fix';
  description: string;
}

interface ChangelogRelease {
  version: string;
  date: string;
  entries: ChangelogEntry[];
}

@Component({
  selector: 'app-whats-new',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './whats-new.component.html',
})
export class WhatsNewComponent {
  releases: ChangelogRelease[] = [
    {
      version: '1.6.0',
      date: 'April 4, 2026',
      entries: [
        {
          date: 'April 4, 2026',
          title: 'Tournament Poster Generation',
          category: 'New Feature',
          description: 'When creating a tournament, you can now generate promotional posters to easily share and advertise your event.',
        },
        {
          date: 'April 3, 2026',
          title: 'Lobby View',
          category: 'New Feature',
          description: 'Added a lobby view to see active users in real-time. Optimized loading speed for a smoother experience.',
        },
        {
          date: 'April 2, 2026',
          title: 'Game Optimization',
          category: 'Improvement',
          description: 'Improved game performance and stability for a better playing experience.',
        },
        {
          date: 'April 1, 2026',
          title: 'Google Login Removed',
          category: 'Bug Fix',
          description: 'Removed Google login option temporarily while we fix some issues. Standard email login remains available.',
        },
      ],
    },
    {
      version: '1.5.0',
      date: 'April 1, 2026',
      entries: [
        {
          date: 'April 1, 2026',
          title: 'Google Login',
          category: 'New Feature',
          description: 'Sign in or create an account instantly with your Google account. No password required — just click "Continue with Google" on the login or register page.',
        },
      ],
    },
    {
      version: '1.4.0',
      date: 'March 28, 2026',
      entries: [
        {
          date: 'March 28, 2026',
          title: 'Tournament Bookmarks',
          category: 'New Feature',
          description: 'You can now bookmark tournaments for quick access. Bookmarked tournaments appear in a dedicated section on your dashboard.',
        },
        {
          date: 'March 28, 2026',
          title: 'Coach Detail Page Redesign',
          category: 'Improvement',
          description: 'The coach profile page has been redesigned with a cleaner layout, showing specialties, availability, and contact options more clearly.',
        },
        {
          date: 'March 26, 2026',
          title: 'Fixed Puzzle Rating Reset',
          category: 'Bug Fix',
          description: 'Resolved an issue where tactical puzzle ratings would incorrectly reset after logging out and back in.',
        },
      ],
    },
    {
      version: '1.3.0',
      date: 'March 15, 2026',
      entries: [
        {
          date: 'March 15, 2026',
          title: 'Opening Explorer',
          category: 'New Feature',
          description: 'Explore chess openings with an interactive database. Browse popular lines, study variations, and see win-rate statistics for each position.',
        },
        {
          date: 'March 14, 2026',
          title: 'Dark Mode Improvements',
          category: 'Improvement',
          description: 'Refined the dark mode color palette across all pages for better contrast and reduced eye strain during extended study sessions.',
        },
        {
          date: 'March 12, 2026',
          title: 'Fixed Course Navigation Bug',
          category: 'Bug Fix',
          description: 'Fixed a bug where navigating between lessons within a course would sometimes lose the current board position.',
        },
      ],
    },
    {
      version: '1.2.0',
      date: 'February 28, 2026',
      entries: [
        {
          date: 'February 28, 2026',
          title: 'User Search',
          category: 'New Feature',
          description: 'Added a search bar in the header that lets you find other players by name or username. Results link directly to their profiles.',
        },
        {
          date: 'February 27, 2026',
          title: 'Faster Page Loads',
          category: 'Improvement',
          description: 'Implemented lazy loading for feature modules, significantly reducing the initial bundle size and improving load times across the platform.',
        },
        {
          date: 'February 25, 2026',
          title: 'Fixed Mobile Menu Overlap',
          category: 'Bug Fix',
          description: 'Resolved an issue where the mobile hamburger menu would overlap with page content on smaller screens.',
        },
      ],
    },
    {
      version: '1.1.0',
      date: 'February 10, 2026',
      entries: [
        {
          date: 'February 10, 2026',
          title: 'Tactics Training',
          category: 'New Feature',
          description: 'Sharpen your chess skills with daily tactical puzzles. Each puzzle is rated, and your rating adjusts based on performance.',
        },
        {
          date: 'February 9, 2026',
          title: 'Improved Responsive Layout',
          category: 'Improvement',
          description: 'Updated the grid layouts on the Roadmap, Tournaments, and Coaches pages to better adapt to tablet and mobile screen sizes.',
        },
        {
          date: 'February 7, 2026',
          title: 'Fixed Email Verification Link',
          category: 'Bug Fix',
          description: 'Fixed an issue where the email verification link would expire prematurely, preventing new users from activating their accounts.',
        },
      ],
    },
    {
      version: '1.0.0',
      date: 'January 20, 2026',
      entries: [
        {
          date: 'January 20, 2026',
          title: 'vonchess Launch',
          category: 'New Feature',
          description: 'Initial release of vonchess — the Philippines\' chess platform. Includes interactive lessons, tournament listings, coach directory, and learning roadmap.',
        },
        {
          date: 'January 20, 2026',
          title: 'Interactive Lessons',
          category: 'New Feature',
          description: 'Structured chess courses with interactive board exercises covering openings, middlegame strategy, and endgame techniques.',
        },
        {
          date: 'January 20, 2026',
          title: 'Tournament Listings',
          category: 'New Feature',
          description: 'Browse upcoming, ongoing, and past chess tournaments across the Philippines with details on schedules, prizes, and registration.',
        },
        {
          date: 'January 20, 2026',
          title: 'Coach Directory',
          category: 'New Feature',
          description: 'Find and connect with verified chess coaches for personalized training at any skill level.',
        },
      ],
    },
  ];

  getCategoryColor(category: string): string {
    switch (category) {
      case 'New Feature':
        return 'bg-emerald-50  text-emerald-600  border-emerald-100 ';
      case 'Improvement':
        return 'bg-blue-50 /30 text-blue-600  border-blue-100 /50';
      case 'Bug Fix':
        return 'bg-amber-50  text-amber-600  border-amber-100 ';
      default:
        return '';
    }
  }
}

