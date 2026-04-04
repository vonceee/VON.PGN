// src/app/features/coaches/coaches.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CoachService } from '../../core/services/coach.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './coaches.component.html'
})
export class CoachesComponent {
  coachService = inject(CoachService);
  coaches = this.coachService.coaches;
}