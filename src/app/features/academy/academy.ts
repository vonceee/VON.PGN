import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { TypewriterTextComponent } from '../../shared/components/typewriter-text/typewriter-text';
import { AcademyEnrollmentModalComponent } from './components/enrollment-modal/enrollment-modal';

@Component({
  selector: 'app-academy',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent, IconComponent, AcademyEnrollmentModalComponent, ButtonComponent, SectionHeadingComponent, TypewriterTextComponent],
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
