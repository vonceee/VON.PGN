import { inject, Injectable } from '@angular/core';
import { TournamentFormHandler } from './tournament-form.handler';
import { ToastService } from '../../../../core/services/toast.service';

@Injectable({
  providedIn: 'root',
})
export class TournamentPosterHandler {
  private formHandler = inject(TournamentFormHandler);
  private toastService = inject(ToastService);


  getPosterDate(data: any): string {
    if (!data['dates']?.start) return '';
    const start = this.formatDate(data['dates']['start']);
    const end = data['dates']['end'] ? this.formatDate(data['dates']['end']) : '';
    return end && end !== start ? `${start} — ${end}` : start;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getPosterPrizeCategories(data: any): any[] {
    try {
      const cats = data?.['categories'];
      if (!cats) return [];
      const categories: any[] = [];
      for (const [catName, cat] of Object.entries(cats as Record<string, any>)) {
        const prizes = (cat as any)?.prizes || {};
        const label = catName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const prizeRows: any[] = [];
        for (const [key, val] of Object.entries(prizes)) {
          if (!val) continue;
          const place = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          prizeRows.push({ place, value: val as string });
        }

        const specialAwards: any[] = [];
        const catSpecialAwards = (cat as any)?.specialAwards;
        if (catSpecialAwards) {
          for (const [awardName, awardVal] of Object.entries(catSpecialAwards)) {
            if (typeof awardVal === 'string') {
              const value = awardVal?.trim();
              if (value) {
                specialAwards.push({
                  name: awardName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                  value,
                });
              }
            } else if (typeof awardVal === 'object' && awardVal !== null) {
              for (const [place, val] of Object.entries(awardVal as Record<string, string>)) {
                if (val?.trim()) {
                  specialAwards.push({
                    name: `${awardName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} ${place.toUpperCase()}`,
                    value: val.trim(),
                  });
                }
              }
            }
          }
        }

        if (prizeRows.length > 0 || specialAwards.length > 0) {
          const catData: any = {
            category: label,
            prizes: prizeRows,
          };
          if (specialAwards.length > 0) {
            catData.specialAwards = specialAwards;
          }
          categories.push(catData);
        }
      }
      return categories;
    } catch (e) {
      console.error('Error in posterPrizeCategories:', e);
      return [];
    }
  }
}
