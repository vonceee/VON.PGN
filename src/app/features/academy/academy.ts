import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroCalendar,
  heroVideoCamera,
  heroViewfinderCircle,
  heroCheck,
  heroUsers,
  heroClock,
  heroAcademicCap,
} from '@ng-icons/heroicons/outline';
import { ButtonComponent  } from '@shared/ui';
import { AcademyEnrollmentModalComponent } from './components/enrollment-modal/enrollment-modal';

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIcon, AcademyEnrollmentModalComponent, ButtonComponent],
  providers: [
    provideIcons({
      heroCalendar,
      heroVideoCamera,
      heroViewfinderCircle,
      heroCheck,
      heroUsers,
      heroClock,
      heroAcademicCap,
    }),
  ],
  templateUrl: './academy.html',
  styleUrl: './academy.css',
})
export class AcademyComponent {
  showEnrollmentModal = false;

  openEnrollment() {
    this.showEnrollmentModal = true;
  }

  closeEnrollment() {
    this.showEnrollmentModal = false;
  }

  scrollToOverview() {
    const overview = document.getElementById('academy-overview');
    if (overview) {
      overview.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

