// src/app/features/coaches/coach-detail/coach-detail.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CoachService } from '../../../core/services/coach.service';
import { Coach } from '../../../core/models/coach.model';

@Component({
  selector: 'app-coach-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './coach-detail.component.html'
})
export class CoachDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private coachService = inject(CoachService);
  
  coach: Coach | undefined;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.coach = this.coachService.getCoachById(id);
    }
  }
}