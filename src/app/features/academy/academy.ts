import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CoachService } from '../coaches/services/coach.service';

import { ButtonComponent  } from '@shared/ui';
import { AcademyEnrollmentFormComponent } from './components/enrollment-form/enrollment-form';

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, RouterModule, AcademyEnrollmentFormComponent, ButtonComponent],
  templateUrl: './academy.html',
  styleUrl: './academy.css',
})
export class AcademyComponent {
  private coachService = inject(CoachService);

  academyInstructors = computed(() => {
    return this.coachService.coaches().filter(coach => coach.isAcademyInstructor);
  });
  activeWeek = signal(1);
  activeFaq = signal<number | null>(null);

  toggleFaq(index: number) {
    if (this.activeFaq() === index) {
      this.activeFaq.set(null);
    } else {
      this.activeFaq.set(index);
    }
  }

  scrollToEnrollment() {
    const element = document.getElementById('enrollment-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToOverview() {
    const overview = document.getElementById('academy-overview');
    if (overview) {
      overview.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToPrograms() {
    const element = document.getElementById('programs-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

