// src/app/features/coaches/coach-detail/coach-detail.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
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

  coach = signal<Coach | undefined>(undefined);
  loading = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loading.set(true);
      this.coachService.getCoachById(id).subscribe({
        next: (coach) => {
          this.coach.set(coach);
          this.loading.set(false);
          if (coach) {
            this.seo.update({
              title: `${coach.name} - Chess Coach`,
              description: `Learn chess from ${coach.name}. View their profile, specialties, and contact information on vonchess.`,
              url: `https://vonchess.com/coaches/${id}`,
            });
          }
        },
        error: (err: any) => {
          console.error('Error fetching coach details', err);
          this.loading.set(false);
          this.coach.set(undefined);
        }
      });
    } else {
      this.loading.set(false);
    }
  }
}
