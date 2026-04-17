// src/app/features/coaches/coach-detail/coach-detail.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CoachService } from '../services/coach.service';
import { SeoService } from '../../../core/services/seo.service';
import { Coach } from '../models/coach.model';

import { BackLinkComponent  } from '@shared/ui';

@Component({
  selector: 'app-coach-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BackLinkComponent],
  templateUrl: './coach-detail.component.html'
})
export class CoachDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private coachService = inject(CoachService);
  private seo = inject(SeoService);
  
  coach: Coach | undefined;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.coach = this.coachService.getCoachById(id);
      if (this.coach) {
        this.seo.update({
          title: `${this.coach.name} - Chess Coach`,
          description: `Learn chess from ${this.coach.name}. View their profile, specialties, and contact information on vonchess.`,
          url: `https://vonchess.com/coaches/${id}`,
        });
      }
    }
  }
}
